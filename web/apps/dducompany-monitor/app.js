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

    // isometric-ish floor (simple diamond tiles)
    ctx.save();
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(0, 0, W, H);
    const tileW = 80;
    const tileH = 40;
    ctx.globalAlpha = 0.9;
    for (let y = -tileH; y < H + tileH; y += tileH) {
      for (let x = -tileW; x < W + tileW; x += tileW) {
        const cx = x + (y / tileH) * (tileW / 2);
        ctx.beginPath();
        ctx.moveTo(cx, y + tileH / 2);
        ctx.lineTo(cx + tileW / 2, y);
        ctx.lineTo(cx + tileW, y + tileH / 2);
        ctx.lineTo(cx + tileW / 2, y + tileH);
        ctx.closePath();
        ctx.fillStyle = (Math.floor((x + y) / tileW) % 2 === 0) ? '#eef2ff' : '#f8fafc';
        ctx.fill();
        ctx.strokeStyle = 'rgba(0,0,0,0.03)';
        ctx.stroke();
      }
    }
    ctx.restore();

    // simple office props (desks/printer) - anchored to bottom-left area
    function drawDesk(x, y, w = 120, h = 60) {
      ctx.save();
      ctx.fillStyle = '#e0d7c6';
      ctx.fillRect(x, y - h, w, h);
      ctx.fillStyle = '#b89f7b';
      ctx.fillRect(x + 6, y - h + 6, w - 12, 12);
      ctx.restore();
    }
    drawDesk(120, H - 60, 140, 60);
    drawDesk(320, H - 60, 140, 60);
    // printer
    ctx.save();
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(W - 140, H - 90, 80, 60);
    ctx.fillStyle = '#d1d5db';
    ctx.fillRect(W - 132, H - 78, 64, 12);
    ctx.restore();

    // actors (isometric chibi characters with speech bubbles)
    for (const a of actors.values()) {
      const bob = Math.sin(a.bob) * 3;
      const baseX = a.x;
      const baseY = a.y + bob;

      // shadow
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(baseX, baseY + 18, 26, 10, 0, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fill();
      ctx.restore();

      // body
      const isWorking = a.status === 'working';
      const bodyColor = isWorking ? '#60a5fa' : '#a78bfa';
      ctx.save();
      // legs
      ctx.fillStyle = '#3f3f46';
      ctx.fillRect(baseX - 10, baseY + 8, 8, 12);
      ctx.fillRect(baseX + 2, baseY + 8, 8, 12);
      // torso
      ctx.fillStyle = bodyColor;
      ctx.fillRect(baseX - 14, baseY - 6, 28, 22);
      // head
      ctx.fillStyle = '#ffe8c2';
      ctx.beginPath();
      ctx.arc(baseX, baseY - 14, 12, 0, Math.PI * 2);
      ctx.fill();
      // face (eyes)
      ctx.fillStyle = '#1f2937';
      ctx.beginPath(); ctx.arc(baseX - 5, baseY - 16, 2.2, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(baseX + 5, baseY - 16, 2.2, 0, Math.PI * 2); ctx.fill();
      // smile
      ctx.strokeStyle = 'rgba(31,41,55,0.7)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(baseX, baseY - 10, 4, 0, Math.PI); ctx.stroke();
      ctx.restore();

      // subtle working glow
      if (isWorking && !state.paused) {
        ctx.save();
        ctx.globalAlpha = 0.16 + 0.08 * Math.sin(a.bob * 3);
        ctx.fillStyle = '#34d399';
        ctx.beginPath(); ctx.ellipse(baseX, baseY + 2, 38, 14, 0, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      }

      // nameplate
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(17,24,39,.78)';
      ctx.fillText(a.name, baseX, baseY + 44);

      // speech bubble logic: show current job or a short status
      let bubble = null;
      if (a.status === 'working') bubble = (state.workers.find(w => w.id === a.id)?.current_job) || '작업 중...';
      else if (a.status === 'idle' && Math.random() < 0.02) bubble = pick(['휴식 중...', '간식 먹는 중...', '문서 정리 중...']);

      if (bubble) {
        // draw bubble above head
        const bx = baseX;
        const by = baseY - 40 - (Math.sin(a.bob * 2) * 4);
        // bubble rect
        ctx.save();
        ctx.fillStyle = 'white';
        ctx.strokeStyle = 'rgba(0,0,0,0.08)';
        ctx.lineWidth = 1;
        const bw = Math.min(220, 10 + ctx.measureText(bubble).width + 12);
        const bh = 26;
        ctx.beginPath();
        roundRect(ctx, bx - bw/2, by - bh, bw, bh, 8);
        ctx.fill(); ctx.stroke();
        // tail
        ctx.beginPath();
        ctx.moveTo(bx - 6, by);
        ctx.lineTo(bx - 2, by + 8);
        ctx.lineTo(bx + 6, by + 2);
        ctx.fill(); ctx.stroke();
        // text
        ctx.fillStyle = '#111827';
        ctx.font = '13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(bubble, bx, by - 6);
        ctx.restore();
      }
    }

    // helper: rounded rect
    function roundRect(ctx, x, y, w, h, r) {
      const radius = r || 4;
      ctx.beginPath();
      ctx.moveTo(x + radius, y);
      ctx.arcTo(x + w, y, x + w, y + h, radius);
      ctx.arcTo(x + w, y + h, x, y + h, radius);
      ctx.arcTo(x, y + h, x, y, radius);
      ctx.arcTo(x, y, x + w, y, radius);
      ctx.closePath();
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
