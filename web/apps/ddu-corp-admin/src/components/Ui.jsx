import React from 'react'
import { supabaseConfigured } from '../supabaseClient'

export function Notice({ tone = 'info', title, children }) {
  const cls = `notice notice--${tone}`
  return (
    <div className={cls} role="status">
      {title ? <div className="notice__title">{title}</div> : null}
      <div className="notice__body">{children}</div>
    </div>
  )
}

export function LoadingRow({ label = 'Loading…' }) {
  return (
    <div className="muted" style={{ padding: 10 }}>{label}</div>
  )
}

export function EnvHint() {
  if (supabaseConfigured) return null
  return (
    <Notice tone="warn" title="Supabase 미설정">
      이 어드민은 현재 목업+프레임 단계입니다. 실데이터를 보려면 repo에 아래 환경변수를 추가해야 합니다.
      <div style={{ marginTop: 8 }} className="mono">
        VITE_SUPABASE_URL=...<br />
        VITE_SUPABASE_ANON_KEY=...
      </div>
      <div style={{ marginTop: 8 }} className="muted">
        (보안상 Service Role Key는 웹앱에 넣지 않습니다.)
      </div>
    </Notice>
  )
}

