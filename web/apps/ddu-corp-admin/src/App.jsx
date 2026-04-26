import { NavLink, Route, Routes } from 'react-router-dom'
import './app.css'

function Layout({ children }) {
  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand__logo">🏢</div>
          <div className="brand__text">
            <div className="brand__name">DDU CORP</div>
            <div className="brand__sub">DU BRIDGE Admin · ver 0.1.0</div>
          </div>
        </div>

        <nav className="nav">
          <NavLink className={({ isActive }) => `nav__item ${isActive ? 'is-active' : ''}`} to="/">Dashboard (Office)</NavLink>
          <NavLink className={({ isActive }) => `nav__item ${isActive ? 'is-active' : ''}`} to="/jobs">Jobs / Queue</NavLink>
          <NavLink className={({ isActive }) => `nav__item ${isActive ? 'is-active' : ''}`} to="/escalations">Escalations</NavLink>
          <NavLink className={({ isActive }) => `nav__item ${isActive ? 'is-active' : ''}`} to="/telegram">Telegram Control</NavLink>
          <NavLink className={({ isActive }) => `nav__item ${isActive ? 'is-active' : ''}`} to="/settings">설정</NavLink>
        </nav>

        <div className="sidebar__footer">
          <div className="hint">
            플랜 기반으로 “중간 산출물”을 계속 남기고,
            불확실성만 Escalation으로 모읍니다.
          </div>
        </div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div className="topbar__left">
            <div className="crumb">DU BRIDGE Admin</div>
            <div className="subtitle">cursor처럼: 만들면서 바로 확인 가능하게</div>
          </div>
          <div className="topbar__right">
            <div className="pill">상태: Draft</div>
          </div>
        </header>

        <section className="content">{children}</section>
      </main>
    </div>
  )
}

function Dashboard() {
  return (
    <div className="grid">
      <div className="card card--wide">
        <div className="card__title">
          <h3>Office View (720×480)</h3>
          <span className="tag">v0 mock</span>
        </div>
        <div className="office">
          <div className="office__canvas">
            <div className="office__placeholder">
              <div className="office__title">(Canvas Placeholder)</div>
              <div className="muted">아이소메트릭 오피스 + 워커 캐릭터 + 말풍선 + HUD</div>
            </div>
          </div>
          <div className="office__hud">
            <div className="kpi">
              <div className="kpi__item"><div className="kpi__label">running</div><div className="kpi__value">1</div></div>
              <div className="kpi__item"><div className="kpi__label">failed/rework</div><div className="kpi__value">0</div></div>
              <div className="kpi__item"><div className="kpi__label">escalations(queued)</div><div className="kpi__value">1</div></div>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card__title"><h3>Workers</h3><span className="tag">mock</span></div>
        <table className="table">
          <thead><tr><th>worker</th><th>status</th><th>last heartbeat</th></tr></thead>
          <tbody>
            <tr><td className="mono">worker-main</td><td><span className="status"><span className="dot dot--new"></span>working</span></td><td className="mono">2026-04-26 01:06</td></tr>
            <tr><td className="mono">worker-system</td><td><span className="status"><span className="dot"></span>idle</span></td><td className="mono">2026-04-26 01:05</td></tr>
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card__title"><h3>Recent jobs</h3><span className="tag">mock</span></div>
        <table className="table">
          <thead><tr><th>id</th><th>job</th><th>worker</th><th>status</th></tr></thead>
          <tbody>
            <tr><td className="mono">JOB-1201</td><td>ddu_jobs consume</td><td className="mono">worker-main</td><td><span className="status"><span className="dot dot--new"></span>running</span></td></tr>
            <tr><td className="mono">JOB-1200</td><td>state snapshot</td><td className="mono">worker-system</td><td><span className="status"><span className="dot dot--ok"></span>done</span></td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Jobs() {
  return (
    <div className="grid">
      <div className="card card--wide">
        <div className="card__title"><h3>Jobs / Queue</h3><span className="tag">v0</span></div>
        <div className="muted" style={{ marginTop: 8 }}>
          다음 단계: supabase 연결해서 ddu_jobs / ddu_events / ddu_escalations를 실제로 조회.
        </div>
        <table className="table">
          <thead><tr><th>id</th><th>title</th><th>worker</th><th>status</th><th>updated</th></tr></thead>
          <tbody>
            <tr><td className="mono">JOB-1201</td><td>ddu_jobs consume</td><td className="mono">worker-main</td><td><span className="status"><span className="dot dot--new"></span>running</span></td><td className="mono">2026-04-26 01:06</td></tr>
            <tr><td className="mono">JOB-1199</td><td>rework: escalation resolve</td><td className="mono">worker-main</td><td><span className="status"><span className="dot dot--warn"></span>rework</span></td><td className="mono">2026-04-26 01:01</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Escalations() {
  return (
    <div className="grid">
      <div className="card card--wide">
        <div className="card__title"><h3>Escalations</h3><span className="tag">v0</span></div>
        <div className="muted" style={{ marginTop: 8 }}>
          질문을 대화로 흩뿌리지 않고, 여기로 “큐잉”해서 사용자 체크를 최소화.
        </div>
        <table className="table">
          <thead><tr><th>id</th><th>title</th><th>status</th><th>updated</th></tr></thead>
          <tbody>
            <tr><td className="mono">ESC-3001</td><td>외부 전송 허용 여부 확인 필요</td><td><span className="status"><span className="dot dot--new"></span>queued</span></td><td className="mono">2026-04-26 01:06</td></tr>
            <tr><td className="mono">ESC-3000</td><td>요구사항 모호: UI 무드/톤</td><td><span className="status"><span className="dot dot--ok"></span>resolved</span></td><td className="mono">2026-04-25 23:58</td></tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Telegram() {
  return (
    <div className="grid">
      <div className="card card--wide">
        <div className="card__title"><h3>Telegram Control</h3><span className="tag">drawer 예정</span></div>
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.5 }}>
          PLAN 기준: 우측 Drawer + @ddu_chat_bot 송수신 + 파일 첨부.
          <br />v0에서는 UI 프레임만 고정하고, 연결은 단계적으로 붙입니다.
        </div>
      </div>
    </div>
  )
}

function Settings() {
  return (
    <div className="grid">
      <div className="card card--wide">
        <div className="card__title"><h3>운영 원칙(고정)</h3><span className="tag">policy</span></div>
        <div className="muted" style={{ marginTop: 10, lineHeight: 1.6 }}>
          1) 프로젝트 제목에 “결과물 타입(웹/프로그램/이미지/보고서)”를 명시
          <br />2) 생산(run) 시작하면 플랜 기준으로 최대한 비슷하게 구현 + 중간 산출물 지속 노출
          <br />3) 불확실성만 Escalation으로 모아 질문 비용 최소화
          <br />4) 웹앱은 GitHub push → 렌더/프리뷰 링크로 즉시 확인
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/jobs" element={<Jobs />} />
        <Route path="/escalations" element={<Escalations />} />
        <Route path="/telegram" element={<Telegram />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="*" element={<Dashboard />} />
      </Routes>
    </Layout>
  )
}
