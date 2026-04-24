// DDUCompany Monitor (Live)

const $ = (id) => document.getElementById(id);

const API = {
  health: '/api/health',
  state: '/api/state',
  workers: '/api/workers',
  chatRead: (limit = 30) => `/api/chat/read?limit=${encodeURIComponent(limit)}`,
  chatSend: '/api/chat/send',
  chatSendMedia: '/api/chat/send-media'
};

const state = {
  paused: false,
  selectedWorkerId: null,
  workers: [],
  workerStats: [],
  events: [],
  progress: { progress_pct: 0, completeness_pct: 0 },
  summary: null,
  queue: null,
  chat: [],
  lastChatSig: ''
};

function fmtTs(ts) {
  try {
    const d = new Date(ts);
    const hh = String(d.getHours()).padStart(2, '0');
    const mm = String(d.getMinutes()).padStart(2, '0');
    return `${hh}:${mm}`;
  } catch {
    return String(ts || '');
  }
}

function setBadge() {
  const b = $('sysBadge');
  if (state.paused) {
    b.textContent = 'PAUSED';
    b.classList.add('paused');
  } else {
    b.textContent = 'RUNNING';
    b.classList.remove('paused');
  }
}

function renderProgress() {
  const p = state.progress || {};
  $('progressPct').textContent = `${p.progress_pct || 0}%`;
  $('completePct').textContent = `${p.completeness_pct || 0}%`;
  $('progressBar').style.width = `${p.progress_pct || 0}%`;
  $('completeBar').style.width = `${p.completeness_pct || 0}%`;
}

function renderWorkers() {
  const list = state.workers || [];
  $('workerCount').textContent = `${list.length}명`;
  const ul = $('workerList');
  ul.innerHTML = '';

  for (const w of list) {
    const li = document.createElement('li');
    li.dataset.id = w.id;

    const left = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'w-name';
    name.textContent = w.nickname || w.name || w.id;

    const sub = document.createElement('div');
    sub.className = 'w-sub';
    const hb = w.last_heartbeat ? `HB ${fmtTs(w.last_heartbeat)}` : 'HB -';
    const cpu = (w.latest && w.latest.cpu_usage != null) ? `CPU ${w.latest.cpu_usage}%` : '';
    const mem = (w.latest && w.latest.memory_usage != null) ? `Mem ${w.latest.memory_usage}%` : '';
    const model = (w.latest && w.latest.api_model) ? `${w.latest.api_model}` : '';
    const job = w.current_job ? `작업: ${w.current_job}` : '';
    sub.textContent = [job, hb, cpu, mem, model].filter(Boolean).join(' · ');

    left.appendChild(name);
    left.appendChild(sub);

    const pill = document.createElement('div');
    pill.className = `pill ${w.status}`;
    pill.textContent = (w.status === 'working' || w.status === 'online') ? '작업중/온라인' : (w.status || '대기');

    li.appendChild(left);
    li.appendChild(pill);

    li.addEventListener('click', () => {
      state.selectedWorkerId = w.id;
      try { world.flash(w.id); } catch {}
    });

    ul.appendChild(li);
  }
}

function renderTimeline() {
  const ul = $('timeline');
  ul.innerHTML = '';
  const items = (state.events || []).slice(0, 10);
  for (const e of items) {
    const li = document.createElement('li');
    const dot = document.createElement('div');
    dot.className = 't-dot';

    const box = document.createElement('div');
    const msg = document.createElement('div');
    msg.className = 't-msg';
    msg.textContent = e.msg || e.type || JSON.stringify(e);

    const ts = document.createElement('div');
    ts.className = 't-ts';
    ts.textContent = fmtTs(e.ts || e.time || e.created_at || e.updated_at || e?.ts);

    box.appendChild(msg);
    box.appendChild(ts);
    li.appendChild(dot);
    li.appendChild(box);
    ul.appendChild(li);
  }
}

function renderChat() {
  const box = $('chat');
  box.innerHTML = '';
  for (const m of state.chat) {
    const b = document.createElement('div');
    b.className = `bubble ${m.me ? 'me' : ''}`;

    const meta = document.createElement('div');
    meta.className = 'meta';
    meta.textContent = `${m.from} · ${m.ts}`;

    if (m.photo) {
      const img = document.createElement('img');
      img.src = m.photo;
      img.style.maxWidth = '100%';
      img.style.borderRadius = '10px';
      img.style.marginTop = '6px';
      b.appendChild(meta);
      if (m.text) {
        const txt = document.createElement('div');
        txt.className = 'txt';
        txt.textContent = m.text;
        b.appendChild(txt);
      }
      b.appendChild(img);
    } else {
      const txt = document.createElement('div');
      txt.className = 'txt';
      txt.textContent = m.text;
      b.appendChild(meta);
      b.appendChild(txt);
    }

    box.appendChild(b);
  }
  box.scrollTop = box.scrollHeight;
}

function setSubtitle(text) {
  $('subtitle').textContent = text;
}

async function jfetch(url, opts) {
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.json();
}

function normalizeWorkersFromSupabase(workersJson, dduState) {
  const workers = (workersJson?.workers || []).map(w => ({
    id: w.id,
    name: w.name,
    nickname: w.name,
    status: w.status || 'idle',
    last_heartbeat: w.last_heartbeat,
    latest: w.latest
  }));

  // Try to decorate with current running job from local queue
  const q = dduState?.queue;
  const jobs = Array.isArray(q?.jobs) ? q.jobs : Array.isArray(q?.items) ? q.items : [];
  const running = jobs.filter(j => (j.status === 'running' || j.status === 'in_progress'));

  for (const w of workers) {
    const mine = running.find(j => j.worker_id === w.id || j.worker === w.id || j.assigned_worker === w.id);
    if (mine) w.current_job = mine.title || mine.name || mine.type || mine.id;
  }

  // Basic status mapping
  for (const w of workers) {
    if (w.current_job) w.status = 'working';
  }

  return workers;
}

function normalizeEvents(dduState) {
  const ev = dduState?.events || [];
  // keep newest first
  const out = [];
  for (let i = ev.length - 1; i >= 0; i--) {
    const e = ev[i] || {};
    out.push({
      ts: e.ts || e.time || e.created_at || e.updated_at || e?.ts || '',
      msg: e.type ? `${e.type}${e.run_id ? ` (${String(e.run_id).slice(0, 6)})` : ''}` : (e.msg || e.message || e.raw || JSON.stringify(e).slice(0, 200))
    });
  }
  return out.slice(0, 50);
}

function computeProgress(dduState) {
  const s = dduState?.summary || {};
  const total = Number(s.jobs_total || 0);
  const done = Number(s.jobs_done || 0);
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;

  const pTotal = Number(s.parents_total || 0);
  const pDone = Number(s.parents_done || 0);
  const pPct = pTotal > 0 ? Math.round((pDone / pTotal) * 100) : 0;

  return { progress_pct: pct, completeness_pct: pPct };
}

function normalizeChatItems(items) {
  // OpenClaw message read JSON varies; normalize best-effort.
  const arr = Array.isArray(items) ? items : [];
  const out = [];

  for (const it of arr) {
    const from = it.author?.name || it.author?.username || it.from || it.sender || (it.isFromMe ? '나' : '상대');
    const ts = fmtTs(it.ts || it.date || it.createdAt || it.created_at || it.time);
    const text = it.text || it.message || it.content || it.caption || '';
    const me = Boolean(it.fromMe || it.isFromMe || it.me);
    out.push({ from, ts, text, me, photo: it.photo || null });
  }

  return out.reverse();
}

async function refreshState() {
  try {
    const ddu = await jfetch(API.state);
    const workersJson = await jfetch(API.workers);

    state.summary = ddu.summary;
    state.queue = ddu.queue;
    state.events = normalizeEvents(ddu);
    state.progress = computeProgress(ddu);
    state.workers = normalizeWorkersFromSupabase(workersJson, ddu);

    const sum = ddu.summary || {};
    const subtitle = `DB+로컬 상태 · jobs ${sum.jobs_done || 0}/${sum.jobs_total || 0} · queued ${sum.jobs_queued || 0} · running ${sum.jobs_running || 0} · failed ${sum.jobs_failed || 0}`;
    setSubtitle(subtitle);

    $('chatStatus').textContent = '연결: Telegram(@ddu_chat_bot)';

    setBadge();
    renderProgress();
    renderWorkers();
    renderTimeline();

    try { world.setWorkers(state.workers); } catch {}
  } catch (e) {
    setSubtitle(`연결 오류: ${e.message}`);
  }
}

async function refreshChat() {
  try {
    const json = await jfetch(API.chatRead(30));
    const items = json.items || [];
    const sig = JSON.stringify(items.map(x => x.id || x.message_id || x.ts || x.date).slice(-10));
    if (sig === state.lastChatSig) return;
    state.lastChatSig = sig;
    state.chat = normalizeChatItems(items);
    renderChat();
  } catch {
    // ignore
  }
}

async function sendChatText(text) {
  await jfetch(API.chatSend, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text })
  });
}

async function sendChatMedia(file, caption) {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('caption', caption || '');
  const res = await fetch(API.chatSendMedia, { method: 'POST', body: fd });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
}

// --- Canvas world: keep existing animation, but accept external workers ---
const world = (() => {
  const canvas = $('world');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;

  const actors = new Map();
  let raf = null;

  function seed(workers) {
    actors.clear();
    let i = 0;
    for (const w of workers) {
      actors.set(w.id, {
        id: w.id,
        name: w.nickname || w.name || w.id,
        status: w.status,
        x: 140 + (i % 4) * 160,
        y: 160 + Math.floor(i / 4) * 120,
        t: Math.random() * 10,
        flashUntil: 0
      });
      i++;
    }
  }

  function setWorkers(workers) {
    if (!workers) return;
    // keep positions if already exists
    const ids = new Set(workers.map(w => w.id));
    for (const id of Array.from(actors.keys())) {
      if (!ids.has(id)) actors.delete(id);
    }
    let i = 0;
    for (const w of workers) {
      if (!actors.has(w.id)) {
        actors.set(w.id, {
          id: w.id,
          name: w.nickname || w.name || w.id,
          status: w.status,
          x: 140 + (i % 4) * 160,
          y: 160 + Math.floor(i / 4) * 120,
          t: Math.random() * 10,
          flashUntil: 0
        });
      } else {
        const a = actors.get(w.id);
        a.status = w.status;
        a.name = w.nickname || w.name || w.id;
      }
      i++;
    }
  }

  function draw(ts) {
    ctx.clearRect(0, 0, W, H);

    // background
    ctx.fillStyle = '#f6f7ff';
    ctx.fillRect(0, 0, W, H);

    // title
    ctx.fillStyle = '#c7cbea';
    ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
    ctx.fillText('DDUCompany Office (Live)', 16, 22);

    for (const a of actors.values()) {
      a.t += 0.02;
      const bob = Math.sin(a.t) * 2;

      const working = a.status === 'working';
      const paused = state.paused;
      const now = Date.now();
      const flashing = now < a.flashUntil;

      // shadow
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = '#2a2f55';
      ctx.beginPath();
      ctx.ellipse(a.x, a.y + 22, 18, 6, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;

      // body
      ctx.beginPath();
      ctx.fillStyle = paused ? '#cdd2e8' : (working ? '#6d7dff' : '#8ad3b4');
      if (flashing) ctx.fillStyle = '#ffb74d';
      ctx.arc(a.x, a.y + bob, 16, 0, Math.PI * 2);
      ctx.fill();

      // eye
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(a.x - 5, a.y - 3 + bob, 2, 0, Math.PI * 2);
      ctx.arc(a.x + 5, a.y - 3 + bob, 2, 0, Math.PI * 2);
      ctx.fill();

      // label
      ctx.fillStyle = '#2a2f55';
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto';
      ctx.textAlign = 'center';
      ctx.fillText(a.name, a.x, a.y + 46);
    }

    raf = requestAnimationFrame(draw);
  }

  function flash(id) {
    const a = actors.get(id);
    if (a) a.flashUntil = Date.now() + 1200;
  }

  function start() {
    if (raf) cancelAnimationFrame(raf);
    raf = requestAnimationFrame(draw);
  }

  // init
  seed([]);
  start();

  return { setWorkers, flash };
})();

function bindUI() {
  $('btnPause').addEventListener('click', () => { state.paused = true; setBadge(); });
  $('btnResume').addEventListener('click', () => { state.paused = false; setBadge(); });
  $('btnMock').style.display = 'none';

  const fileEl = $('chatFile');
  $('chatAttach').addEventListener('click', () => fileEl.click());

  $('chatSend').addEventListener('click', async () => {
    const text = $('chatText').value.trim();
    const file = fileEl.files && fileEl.files[0];

    try {
      if (file) {
        await sendChatMedia(file, text);
        fileEl.value = '';
        $('chatText').value = '';
      } else {
        if (!text) return;
        await sendChatText(text);
        $('chatText').value = '';
      }
      await refreshChat();
    } catch (e) {
      alert(`전송 실패: ${e.message}`);
    }
  });

  $('chatText').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') $('chatSend').click();
  });
}

async function boot() {
  setSubtitle('연결 중…');
  bindUI();

  // initial
  await refreshState();
  await refreshChat();

  // polling
  setInterval(refreshState, 2500);
  setInterval(refreshChat, 3000);
}

boot();
