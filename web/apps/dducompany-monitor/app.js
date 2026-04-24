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

// --- Canvas world (improved: pre-rendered background, richer actor animations) ---
const world = (() => {
  const canvas = $('world');
  const ctx = canvas.getContext('2d');
  const W = canvas.width;
  const H = canvas.height;
  const pad = 26;

  // offscreen background for performance
  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = W; bgCanvas.height = H;
  const bgCtx = bgCanvas.getContext('2d');

  // seat anchors (approx positions in the mock layout)
  const seats = [
    { x: 160, y: H - 80 },
    { x: 340, y: H - 80 },
    { x: 520, y: H - 80 },
    { x: 420, y: H - 160 }
  ];

  const actors = new Map();
  let last = performance.now();

  function preRenderBackground() {
    const c = bgCtx;
    // soft gradient floor
    const g = c.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, '#fbfbff');
    g.addColorStop(1, '#f3f5ff');
    c.fillStyle = g; c.fillRect(0, 0, W, H);

    // isometric tile pattern (subtle)
    c.globalAlpha = 0.9;
    const tileW = 80, tileH = 40;
    for (let y = -tileH; y < H + tileH; y += tileH) {
      for (let x = -tileW; x < W + tileW; x += tileW) {
        const cx = x + (y / tileH) * (tileW / 2);
        c.beginPath();
        c.moveTo(cx, y + tileH / 2);
        c.lineTo(cx + tileW / 2, y);
        c.lineTo(cx + tileW, y + tileH / 2);
        c.lineTo(cx + tileW / 2, y + tileH);
        c.closePath();
        c.fillStyle = (Math.floor((x + y) / tileW) % 2 === 0) ? '#f7f8fb' : '#f3f5ff';
        c.fill();
      }
    }
    c.globalAlpha = 1;

    // desks
    function drawDesk(x, y, w = 140, h = 60) {
      c.save();
      c.fillStyle = '#e8d9c5';
      c.fillRect(x, y - h, w, h);
      c.fillStyle = '#c9b193';
      c.fillRect(x + 6, y - h + 6, w - 12, 12);
      c.restore();
    }
  }

  // helper: rounded rect
  function roundRect(ctx2, x, y, w, h, r) {
    const radius = r || 4;
    ctx2.beginPath();
    ctx2.moveTo(x + radius, y);
    ctx2.arcTo(x + w, y, x + w, y + h, radius);
    ctx2.arcTo(x + w, y + h, x, y + h, radius);
    ctx2.arcTo(x, y + h, x, y, radius);
    ctx2.arcTo(x, y, x + w, y, radius);
    ctx2.closePath();
  }

  function initFromWorkers() {
    actors.clear();
    // pre-render background once
    preRenderBackground();

    let i = 0;
    for (const w of state.workers) {
      const seat = seats[i % seats.length];
      const px = seat.x + (Math.random() * 16 - 8);
      const py = seat.y + (Math.random() * 8 - 4);
      actors.set(w.id, {
        id: w.id,
        name: w.nickname,
        status: w.status,
        x: px,
        y: py,
        vx: 0,
        vy: 0,
        bob: Math.random() * Math.PI * 2,
        flash: 0,
        anim: { type: w.status === 'working' ? 'typing' : 'idle', t: 0 },
        bubble: { text: null, since: 0, expiry: 0, width: 0, opacity: 0 }
      });
      i++;
    }
  }

  function flash(id) {
    const a = actors.get(id);
    if (a) a.flash = 1;
  }

  function addBubble(a, text, duration = 2200) {
    a.bubble.text = text;
    a.bubble.since = Date.now();
    a.bubble.expiry = Date.now() + duration;
    ctx.font = '13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif';
    a.bubble.width = Math.min(280, 10 + ctx.measureText(text).width + 12);
    a.bubble.opacity = 1;
  }

  function step(dt) {
    // update actor states
    for (const w of state.workers) {
      const a = actors.get(w.id);
      if (!a) continue;
      // status transition: set animation type
      if (w.status !== a.status) {
        a.status = w.status;
        a.anim.type = (a.status === 'working') ? 'typing' : 'idle';
        a.anim.t = 0;
        // show job bubble when moving to working
        if (w.current_job) addBubble(a, w.current_job, 2800);
      }
      // periodic random idle actions
      if (a.anim.type === 'idle' && Math.random() < 0.005) {
        // occasionally sip coffee or snack
        const action = Math.random() < 0.5 ? 'coffee' : 'snack';
        a.anim.type = action; a.anim.t = 0;
        addBubble(a, action === 'coffee' ? '커피 마시는 중...' : '간식 먹는 중...', 2600);
      }

      // update animation timers
      a.anim.t += dt;
      a.bob += dt * 3;

      // walking animation (simple wandering) if set
      if (a.anim.type === 'walk') {
        a.vx += (Math.random() * 2 - 1) * 40 * dt;
        a.vy += (Math.random() * 2 - 1) * 40 * dt;
        a.x += a.vx * dt; a.y += a.vy * dt;
      }

      // damping + bounds
      a.vx *= 0.93; a.vy *= 0.93;
      if (a.x < pad) a.x = pad;
      if (a.x > W - pad) a.x = W - pad;
      if (a.y < pad) a.y = pad;
      if (a.y > H - pad) a.y = H - pad;

      // bubble expiry handling
      if (a.bubble.text) {
        const now = Date.now();
        if (now > a.bubble.expiry) {
          // fade out
          a.bubble.opacity = Math.max(0, a.bubble.opacity - dt * 2);
          if (a.bubble.opacity <= 0.01) a.bubble.text = null;
        }
      }
    }

    // occasional random bubble for idle workers
    if (Math.random() < 0.01) {
      const idle = Array.from(actors.values()).filter(a => a.anim.type === 'idle');
      if (idle.length) {
        const a = idle[Math.floor(Math.random() * idle.length)];
        if (!a.bubble.text) addBubble(a, pick(['휴식 중...', '코드 리뷰 중...', '회의 준비 중...']), 2400);
      }
    }
  }

  function draw() {
    // draw background from buffer
    ctx.clearRect(0, 0, W, H);
    // ensure background exists
    if (bgCanvas) ctx.drawImage(bgCanvas, 0, 0);

    // decorative props (drawn on top of bg for clarity)
    // simple desks
    function drawDesk(x, y, w = 140, h = 60) {
      ctx.save();
      ctx.fillStyle = '#e8d9c5';
      ctx.fillRect(x, y - h, w, h);
      ctx.fillStyle = '#c9b193';
      ctx.fillRect(x + 6, y - h + 6, w - 12, 12);
      ctx.restore();
    }
    drawDesk(120, H - 70, 140, 60);
    drawDesk(320, H - 70, 140, 60);

    // printer
    ctx.save(); ctx.fillStyle = '#eef2f6'; ctx.fillRect(W - 140, H - 90, 80, 60); ctx.fillStyle = '#d1d5db'; ctx.fillRect(W - 132, H - 78, 64, 12); ctx.restore();

    // draw actors
    for (const a of actors.values()) {
      const bob = Math.sin(a.bob) * 3;
      const bx = a.x; const by = a.y + bob;

      // shadow
      ctx.save(); ctx.globalAlpha = 0.12; ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(bx, by + 20, 28, 11, 0, 0, Math.PI * 2); ctx.fill(); ctx.restore();

      // body/limbs base
      const isWorking = a.anim.type === 'typing' || a.anim.type === 'work';
      const skin = '#ffe8c2';
      const cloth = isWorking ? '#60a5fa' : '#a78bfa';

      // legs
      ctx.save(); ctx.fillStyle = '#3f3f46'; ctx.fillRect(bx - 10, by + 8, 8, 12); ctx.fillRect(bx + 2, by + 8, 8, 12); ctx.restore();
      // torso
      ctx.save(); ctx.fillStyle = cloth; ctx.fillRect(bx - 15, by - 6, 30, 24); ctx.restore();

      // head
      ctx.save(); ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(bx, by - 18, 12, 0, Math.PI * 2); ctx.fill(); ctx.restore();
      // face
      ctx.save(); ctx.fillStyle = '#1f2937'; ctx.beginPath(); ctx.arc(bx - 5, by - 20, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(bx + 5, by - 20, 2.2, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(31,41,55,0.7)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(bx, by - 12, 4, 0, Math.PI); ctx.stroke(); ctx.restore();

      // simple arm/hand animations (typing vs coffee)
      ctx.save();
      if (a.anim.type === 'coffee') {
        // coffee sip: rotate arm up and draw cup
        const t = (a.anim.t % 1) * Math.PI * 2;
        const ang = Math.sin(t) * 0.9 - 0.6;
        // arm
        ctx.translate(bx + 10, by - 6);
        ctx.rotate(ang);
        ctx.fillStyle = '#c69c6d';
        ctx.fillRect(0, -4, 18, 8);
        // cup
        ctx.fillStyle = '#ffffff'; ctx.fillRect(18, -6, 10, 10); ctx.fillStyle = '#6b4f3b'; ctx.fillRect(20, -4, 6, 6);
        ctx.restore();
      } else if (a.anim.type === 'typing') {
        const t2 = (a.anim.t * 6) % 2;
        const ang = Math.sin(a.anim.t * 10) * 0.2;
        ctx.translate(bx - 8, by - 2);
        ctx.rotate(ang);
        ctx.fillStyle = '#c69c6d'; ctx.fillRect(0, -4, 16, 8);
        ctx.restore();
        // second arm
        ctx.save(); ctx.translate(bx + 6, by - 2); ctx.rotate(-ang*0.6); ctx.fillStyle = '#c69c6d'; ctx.fillRect(0, -4, 16, 8); ctx.restore();
      } else {
        // idle arm
        ctx.fillStyle = '#c69c6d'; ctx.fillRect(bx - 22, by - 6, 12, 6); ctx.fillRect(bx + 10, by - 6, 12, 6);
        ctx.restore();
      }

      // nameplate
      ctx.font = '12px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = 'rgba(17,24,39,.78)'; ctx.fillText(a.name, bx, by + 44);

      // speech bubble (stable rendering, fade)
      if (a.bubble.text) {
        const now = Date.now();
        const bx2 = bx;
        const by2 = by - 46;
        // fade handling already managed in step()
        ctx.save(); ctx.globalAlpha = Math.max(0.1, a.bubble.opacity || 1);
        ctx.fillStyle = 'white'; ctx.strokeStyle = 'rgba(0,0,0,0.08)'; ctx.lineWidth = 1;
        const bw = a.bubble.width || Math.min(260, 10 + ctx.measureText(a.bubble.text).width + 12);
        const bh = 28;
        roundRect(ctx, bx2 - bw / 2, by2 - bh, bw, bh, 8); ctx.fill(); ctx.stroke();
        // tail
        ctx.beginPath(); ctx.moveTo(bx2 - 6, by2); ctx.lineTo(bx2 - 2, by2 + 8); ctx.lineTo(bx2 + 6, by2 + 2); ctx.closePath(); ctx.fill(); ctx.stroke();
        // text
        ctx.fillStyle = '#111827'; ctx.font = '13px system-ui, -apple-system, Segoe UI, Roboto, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(a.bubble.text, bx2, by2 - 6);
        ctx.restore();
      }
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
