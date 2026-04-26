import { useEffect, useMemo, useState } from 'react'
import { supabase, supabaseConfigured } from '../supabaseClient'

export function useSupabaseQuery({ key, enabled = true, queryFn }) {
  const k = useMemo(() => JSON.stringify(key ?? 'key'), [key])
  const [state, setState] = useState({ loading: false, error: null, data: null })

  useEffect(() => {
    let cancelled = false
    async function run() {
      if (!enabled) return
      if (!supabaseConfigured || !supabase) {
        setState({ loading: false, error: 'Supabase not configured (.env missing).', data: null })
        return
      }
      try {
        setState((s) => ({ ...s, loading: true, error: null }))
        const data = await queryFn(supabase)
        if (cancelled) return
        setState({ loading: false, error: null, data })
      } catch (e) {
        if (cancelled) return
        setState({ loading: false, error: e?.message || String(e), data: null })
      }
    }
    run()
    return () => {
      cancelled = true
    }
  }, [k, enabled, queryFn])

  return state
}

