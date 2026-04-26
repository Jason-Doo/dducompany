import { NavLink, Route, Routes } from 'react-router-dom'
import './app.css'
import { EnvHint, LoadingRow, Notice } from './components/Ui.jsx'
import { useSupabaseQuery } from './hooks/useSupabaseQuery.js'

function MobileNav() {
  return (
    <nav className="mobileNav" aria-label="Primary">
      <NavLink className={({ isActive }) => `mobileNav__item ${isActive ? 'is-active' : ''}`} to="/">홈</NavLink>
      <NavLink className={({ isActive }) => `mobileNav__item ${isActive ? 'is-active' : ''}`} to="/jobs">Jobs</NavLink>
      <NavLink className={({ isActive }) => `mobileNav__item ${isActive ? 'is-active' : ''}`} to="/escalations">Esc</NavLink>
      <NavLink className={({ isActive }) => `mobileNav__item ${isActive ? 'is-active' : ''}`} to="/telegram">TG</NavLink>
      <NavLink className={({ isActive }) => `mobileNav__item ${isActive ? 'is-active' : ''}`} to="/settings">설정</NavLink>
    </nav>
  )
}

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

        <MobileNav />

        <section className="content">{children}</section>
      </main>
    </div>
  )
}

function Dashboard() {
  const runtime = useSupabaseQuery({
    key: ['runtime'],
    queryFn: async (sb) => {
      const { data, error } = await sb.from('ddu_runtime').select('*').order('updated_at', { ascending: false }).limit(1)
      if (error) throw error
      return data?.[0] || null
    },
  })

  return (
    <div className="grid">
      <div className="card card--wide">
        <div className="card__title">
          <h3>Office View (720×480)</h3>
          <span className="tag">v0 mock</span>
        </div>
        <EnvHint />
        {runtime.loading ? <LoadingRow label="runtime 조회중…" /> : null}
        {runtime.error ? (
          <Notice tone="warn" title="runtime 조회 실패">
            <div className="mono">{String(runtime.error)}</div>
          </Notice>
        ) : null}
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
  const jobs = useSupabaseQuery({
    key: ['jobs'],
    queryFn: async (sb) => {
      const { data, error } = await sb
        .from('ddu_jobs')
        .select('id,title,worker_id,status,updated_at,created_at,job_type')
        .order('updated_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data || []
    },
  })

  return (
    <div className="grid">
      <div className="card card--wide">
        <div className="card__title"><h3>Jobs / Queue</h3><span className="tag">v0</span></div>
        <EnvHint />
        {jobs.loading ? <LoadingRow label="ddu_jobs 조회중…" /> : null}
        {jobs.error ? (
          <Notice tone="warn" title="ddu_jobs 조회 실패">
            <div className="mono">{String(jobs.error)}</div>
          </Notice>
        ) : null}
        <table className="table">
          <thead><tr><th>id</th><th>title</th><th>worker</th><th>status</th><th>updated</th></tr></thead>
          <tbody>
            {(jobs.data || []).map((j) => (
              <tr key={j.id}>
                <td className="mono">{String(j.id).slice(0, 8)}</td>
                <td>{j.title || j.job_type || '-'}</td>
                <td className="mono">{j.worker_id || '-'}</td>
                <td><span className="status"><span className="dot"></span>{j.status || '-'}</span></td>
                <td className="mono">{(j.updated_at || j.created_at || '').replace('T', ' ').slice(0, 16)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Escalations() {
  const esc = useSupabaseQuery({
    key: ['escalations'],
    queryFn: async (sb) => {
      const { data, error } = await sb
        .from('ddu_escalations')
        .select('id,status,question_ko,answer_ko,decision_required,created_at,answered_at')
        .order('created_at', { ascending: false })
        .limit(50)
      if (error) throw error
      return data || []
    },
  })

  return (
    <div className="grid">
      <div className="card card--wide">
        <div className="card__title"><h3>Escalations</h3><span className="tag">v0</span></div>
        <EnvHint />
        {esc.loading ? <LoadingRow label="ddu_escalations 조회중…" /> : null}
        {esc.error ? (
          <Notice tone="warn" title="ddu_escalations 조회 실패">
            <div className="mono">{String(esc.error)}</div>
          </Notice>
        ) : null}
        <table className="table">
          <thead><tr><th>id</th><th>question</th><th>status</th><th>updated</th></tr></thead>
          <tbody>
            {(esc.data || []).map((e) => (
              <tr key={e.id}>
                <td className="mono">{String(e.id).slice(0, 8)}</td>
                <td style={{ maxWidth: 640 }}>
                  <div style={{ fontWeight: 700 }}>{String(e.question_ko || '').slice(0, 120) || '-'}</div>
                  {e.decision_required ? <div className="tag" style={{ marginTop: 8, display: 'inline-block' }}>decision_required</div> : null}
                </td>
                <td><span className="status"><span className="dot"></span>{e.status || '-'}</span></td>
                <td className="mono">{(e.answered_at || e.created_at || '').replace('T', ' ').slice(0, 16)}</td>
              </tr>
            ))}
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
        <Notice tone="info" title="준비중">
          Telegram 송수신/컨트롤은 다음 단계에서 붙입니다.
          <div className="muted" style={{ marginTop: 6 }}>
            (웹앱에서 텔레그램을 직접 제어하려면 별도 백엔드/서버리스 함수가 필요합니다)
          </div>
        </Notice>
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
