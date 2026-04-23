// DDUCompany Monitor (Mock-first)

const $ = (id) => document.getElementById(id);

const state = {
  mode: 'mock',
  paused: false,
  selectedWorkerId: null,
  workers: [],
  events: [],
  progress: { progress_pct: 0, completeness_pct: 0 },
  chat: []
};

function nowHHMM() {
  const d = new Date();
  const hh = String(d.getHours()).padStart(2, '0');
  const mm = String(d.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
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
  $('progressPct').textContent = `${state.progress.progress_pct || 0}%`;
  $('completePct').textContent = `${state.progress.completeness_pct || 0}%`;
  $('progressBar').style.width = `${state.progress.progress_pct || 0}%`;
  $('completeBar').style.width = `${state.progress.completeness_pct || 0}%`;
}

function renderWorkers() {
  $('workerCount').textContent = `${state.workers.length}명`;
  const ul = $('workerList');
  ul.innerHTML = '';
  for (const w of state.workers) {
    const li = document.createElement('li');
    li.dataset.id = w.id;
    const left = document.createElement('div');
    const name = document.createElement('div');
    name.className = 'w-name';
    name.textContent = w.nickname;
    const sub = document.createElement('div');
    sub.className = 'w-sub';
    sub.textContent = w.current_job ? `작업: ${w.current_job}` : (w.status === 'working' ? '작업중' : '대기중');
    left.appendChild(name);
    left.appendChild(sub);

    const pill = document.createElement('div');
    pill.className = `pill ${w.status}`;
    pill.textContent = (w.status === 'working') ? '작업중' : '대기';

    li.appendChild(left);
    li.appendChild(pill);
    li.addEventListener('click', () => {
      state.selectedWorkerId = w.id;
      world.flash(w.id);
    });
    ul.appendChild(li);
  }
}

function renderTimeline() {
  const ul = $('timeline');
  ul.innerHTML = '';
  for (const e of state.events.slice(0, 10)) {
    const li = document.createElement('li');
    const dot = document.createElement('div');
    dot.className = 't-dot';
    const box = document.createElement('div');
    const msg = document.createElement('div');
    msg.className = 't-msg';
    msg.textContent = e.msg;
    const ts = document.createElement('div');
    ts.className = 't-ts';
    ts.textContent = e.ts;
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
    const txt = document.createElement('div');
    txt.className = 'txt';
    txt.textContent = m.text;
    b.appendChild(meta);
    b.appendChild(txt);
    box.appendChild(b);
  }
  box.scrollTop = box.scrollHeight;
}

function setSubtitle(text) {
  $('subtitle').textContent = text;
}

// --- Mock data + tick ---
function seedMock() {
  state.workers = [
    { id: 'worker_design_01', nickname: '디자인담당', status: 'idle', x: 0, y: 0 },
    { id: 'worker_dev_01', nickname: '개발담당', status: 'working', current_job: 'web UI 패널 구조', x: 0, y: 0 },
    { id: 'worker_sec_01', nickname: '보안담당', status: 'idle', x: 0, y: 0 },
    { id: 'worker_test_01', nickname: '테스터', status: 'working', current_job: '체크리스트 작성', x: 0, y: 0 }
  ];
  state.events = [
    { ts: nowHHMM(), msg: '중간관리자: 작업 분해 완료(디자인/개발/보안/테스트)' },
    { ts: nowHHMM(), msg: '개발담당: 캔버스 아바타 애니메이션 1차 완료' },
    { ts: nowHHMM(), msg: '테스터: UI 흐름 테스트 항목 생성' }
  ];
  state.chat = [
    { from: '뚜봇', ts: nowHHMM(), text: '지금은 목업 채팅이에요. 다음 단계에서 텔레그램 브릿지 붙일게요.', me: false },
    { from: '나', ts: nowHHMM(), text: '좋아. 진행 상황 계속 보여줘.', me: true }
  ];
  state.progress = { progress_pct: 38, completeness_pct: 22 };
}

function mockStep() {
  if (state.paused) return;
  // light progress drift
  state.progress.progress_pct = Math.min(99, (state.progress.progress_pct || 0) + (Math.random() < 0.35 ? 1 : 0));
  state.progress.completeness_pct = Math.min(99, (state.progress.completeness_pct || 0) + (Math.random() < 0.2 ? 1 : 0));

  // random worker status toggles
  for (const w of state.workers) {
    if (Math.random() < 0.06) {
      w.status = (w.status === 'working') ? 'idle' : 'working';
      w.current_job = (w.status === 'working') ? pick([
        '패널 UI 다듬기',
        'DB 스냅샷 반영',
        '채팅창 UI 정렬',
        '버그 재현/수정'
      ]) : null;
      state.events.unshift({ ts: nowHHMM(), msg: `${w.nickname}: ${w.status === 'working' ? '작업 시작' : '작업 종료'}` });
    }
  }
  state.events = state.events.slice(0, 50);
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// --- Canvas world ---
const world = (() => {
  const canvas = $('world');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const pad = 26;

  const actors = new Map();
  let last = performance.now();

  function initFromWorkers() {
    actors.clear();
    for (const w of state.workers) {
      actors.set(w.id, {
        id: w.id,
        name: w.nickname,
        status: w.status,
        x: pad + Math.random() * (W - pad * 2),
        y: pad + Math.random() * (H - pad * 2),
        vx: (Math.random() * 2 - 1) * 40,
        vy: (Math.random() * 2 - 1) * 40,
        bob: Math.random() * Math.PI * 2,
        flash: 0
      });
    }
  }

  function flash(id) {
    const a = actors.get(id);
    if (a) a.flash = 1;
  }

  function step(dt) {
    for (const w of state.workers) {
      const a = actors.get(w.id);
      if (!a) continue;
      a.status = w.status;
    }
    for (const a of actors.values()) {
      const speed = (a.status === 'working') ? 1.2 : 0.8;
      if (state.paused) {
        a.vx *= 0.92;
        a.vy *= 0.92;
      } else {
        // gentle wandering
        a.vx += (Math.random() * 2 - 1) * 12 * dt;
        a.vy += (Math.random() * 2 - 1) * 12 * dt;
      }
      a.x += a.vx * dt * speed;
      a.y += a.vy * dt * speed;
      a.bob += dt * 3;

      // bounds
      if (a.x < pad) { a.x = pad; a.vx *= -0.7; }
      if (a.x > W - pad) { a.x = W - pad; a.vx *= -0.7; }
      if (a.y < pad) { a.y = pad; a.vy *= -0.7; }
      if (a.y > H - pad) { a.y = H - pad; a.vy *= -0.7; }

      // damping
      a.vx *= 0.985;
      a.vy *= 0.985;
      a.flash *= 0.92;
    }
  }

  function draw() {
    ctx.clearRect(0, 0, W, H);

    // floor tiles
    ctx.save();
    ctx.globalAlpha = 0.55;
    ctx.strokeStyle = '#e9ecf6';
    for (let x = 20; x < W; x += 40) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }
    for (let y = 20; y < H; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    ctx.restore();

    // actors
    for (const a of actors.values()) {
      const bob = Math.sin(a.bob) * 2;
      const r = 18;
      const isWorking = a.status === 'working';
      const color = state.paused ? '#f59e0b' : (isWorking ? '#14b8a6' : '#c7cbd8');

      // glow
      if (isWorking && !state.paused) {
        ctx.save();
        ctx.globalAlpha = 0.25 + 0.2 * Math.sin(a.bob * 2);
        ctx.fillStyle = '#14b8a6';
        ctx.beginPath();
        ctx.arc(a.x, a.y + bob, r + 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      if (a.flash > 0.05) {
        ctx.save();
        ctx.globalAlpha = 0.25 * a.flash;
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(a.x, a.y + bob, r + 14, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      // body
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(a.x, a.y + bob, r, 0, Math.PI * 2);
      ctx.fill();

      // face
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(a.x - 6, a.y - 2 + bob, 3.2, 0, Math.PI * 2);
      ctx.arc(a.x + 6, a.y - 2 + bob, 3.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,.9)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(a.x, a.y + 6 + bob, 6, 0, Math.PI);
      ctx.stroke();

      // nameplate
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(17,24,39,.78)';
      ctx.fillText(a.name, a.x, a.y + 36 + bob);
    }
  }

  function loop(t) {
    const dt = Math.min(0.033, (t - last) / 1000);
    last = t;
    step(dt);
    draw();
    requestAnimationFrame(loop);
  }

  return {
    initFromWorkers,
    loop,
    flash
  };
})();

function refreshUI() {
  setBadge();
  renderProgress();
  renderWorkers();
  renderTimeline();
  renderChat();
  setSubtitle(`로컬 상태(목업) · ${state.paused ? '일시중지' : '실행중'} · ${nowHHMM()} 업데이트`);
}

function bind() {
  $('btnPause').addEventListener('click', () => {
    state.paused = true;
    state.events.unshift({ ts: nowHHMM(), msg: '시스템: 일시중지(목업)' });
    refreshUI();
  });
  $('btnResume').addEventListener('click', () => {
    state.paused = false;
    state.events.unshift({ ts: nowHHMM(), msg: '시스템: 재개(목업)' });
    refreshUI();
  });
  $('btnMock').addEventListener('click', () => {
    state.mode = 'mock';
    $('chatStatus').textContent = '연결: 목업';
    state.events.unshift({ ts: nowHHMM(), msg: '모드: Mock' });
    refreshUI();
  });
  $('chatSend').addEventListener('click', sendChat);
  $('chatText').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendChat();
  });
}

function sendChat() {
  const input = $('chatText');
  const text = (input.value || '').trim();
  if (!text) return;
  state.chat.push({ from: '나', ts: nowHHMM(), text, me: true });
  input.value = '';
  // mock bot reply
  setTimeout(() => {
    state.chat.push({ from: '뚜봇', ts: nowHHMM(), text: pick([
      '확인했어요. 지금 처리중이에요.',
      '좋아요. 다음 단계로 넘어갈게요.',
      '현재 상태를 업데이트했어요.'
    ]), me: false });
    refreshUI();
  }, 450);
  refreshUI();
}

// TODO (Live mode):
// - Read ddu_worker_runtime, ddu_jobs, ddu_events, ddu_project_snapshots from Supabase (read-only)
// - Chat panel: bridge Telegram via server-side (never expose bot token in browser)

function main() {
  seedMock();
  bind();
  refreshUI();
  world.initFromWorkers();
  requestAnimationFrame(world.loop);
  setInterval(() => {
    mockStep();
    refreshUI();
  }, 1600);
}

main();

