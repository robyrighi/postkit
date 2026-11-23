// Area amministratore: statistiche e registro attività.
// La protezione vera è nel database (funzioni pk_admin_* controllano l'email
// dell'utente loggato): questa pagina da sola non dà accesso a nulla.
import type { Session } from '@supabase/supabase-js'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/api'

interface Overview {
  visitors: number
  registered: number
  active7: number
  active_today: number
  exports: number
  saves: number
  ratings: number
  avg_score: number | null
}
interface Stats {
  overview: Overview
  daily: { day: string; visitors: number; exports: number }[]
  modules: { module: string; opens: number; exports: number; saves: number }[]
  platforms: { platform: string; n: number }[]
  languages: { lang: string; n: number }[]
  feedback: { created_at: string; module: string; score: number; comment: string | null; name: string | null; email: string | null }[]
}
interface Funnel {
  visitors: number
  tool_open: number
  upload: number
  export: number
  free_download: number
  gate_shown: number
  gate_cancel: number
  gate_submit: number
  save: number
}
interface EventRow {
  created_at: string
  module: string
  event_type: string
  meta: Record<string, unknown> | null
  visitor_id: string
  name: string | null
  email: string | null
  platform: string | null
  lang: string | null
}
interface VisitorRow {
  id: string
  name: string | null
  email: string | null
  newsletter?: boolean
  platform: string | null
  lang: string | null
  visits: number
  first_seen: string
  last_seen: string
  events: number
  exports: number
  saves: number
}

const MODULES: Record<string, string> = {
  sport: '🏃 Card sport',
  text: '✍️ Testo',
  carousel: '🎞️ Panoramica',
  home: '🏠 Home',
  privacy: '🔒 Privacy',
  app: '📲 App',
  lang: '🌐 Lingua',
  gate: '✉️ Richiesta nome/email',
}
const EVENTS: Record<string, string> = {
  open: 'ha aperto',
  upload: 'ha caricato una foto',
  export: 'ha creato',
  save: 'ha salvato',
  template: 'ha scelto lo stile',
  layout: 'ha scelto l’impaginazione',
  sport: 'ha scelto lo sport',
  filter: 'ha scelto il filtro',
  position: 'ha scelto la posizione',
  drag: 'ha spostato il testo',
  behind_on: 'ha attivato testo dietro la persona',
  ai_error: 'errore IA (non disponibile)',
  change: 'ha cambiato',
  open_standalone: 'ha aperto da app installata',
  install_click: 'ha toccato “Installa”',
  install_accepted: 'ha installato',
  install_dismissed: 'ha rifiutato l’installazione',
  install_dismiss: 'ha chiuso il banner',
  installed: 'installata ✅',
  free_download: 'ha usato il download libero',
  shown: 'ha visto',
  cancel: 'ha annullato',
  submit: 'ha compilato ✅',
}
const PLATFORM: Record<string, string> = {
  ios: '📱 iPhone/iPad',
  android: '🤖 Android',
  windows: '🪟 Windows',
  mac: '🍎 Mac',
  linux: '🐧 Linux',
  other: '❔ Altro',
}
const FACE = ['', '😡', '😕', '😐', '🙂', '😍']

const who = (r: { name: string | null; email: string | null; visitor_id?: string; id?: string }) =>
  r.name ? r.name : `Anonimo #${(r.visitor_id ?? r.id ?? '').slice(0, 4)}`

const fmtDate = (s: string) =>
  new Date(s).toLocaleString('it-CH', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' })

function ago(s: string) {
  const d = (Date.now() - new Date(s).getTime()) / 1000
  if (d < 60) return 'adesso'
  if (d < 3600) return `${Math.floor(d / 60)} min fa`
  if (d < 86400) return `${Math.floor(d / 3600)} h fa`
  return `${Math.floor(d / 86400)} g fa`
}

function metaText(m: Record<string, unknown> | null): string {
  if (!m) return ''
  return Object.entries(m)
    .filter(([, v]) => v !== null && v !== undefined && v !== '')
    .map(([k, v]) => `${k}: ${String(v)}`)
    .join(' · ')
}

function downloadCsv(rows: VisitorRow[]) {
  const head = ['nome', 'email', 'newsletter', 'piattaforma', 'lingua', 'visite', 'immagini_create', 'salvataggi', 'prima_visita', 'ultima_visita']
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const lines = rows
    .filter((r) => r.email)
    .map((r) => [r.name, r.email, r.newsletter ? 'si' : 'no', r.platform, r.lang, r.visits, r.exports, r.saves, r.first_seen, r.last_seen].map(esc).join(';'))
  const blob = new Blob(['﻿' + [head.join(';'), ...lines].join('\n')], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = `pizkit-utenti-${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 3000)
}

// ------------------------------------------------------------------ login

function Login() {
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [step, setStep] = useState<'email' | 'code'>('email')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')

  async function send(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim().toLowerCase(),
      options: { shouldCreateUser: true, emailRedirectTo: window.location.origin + window.location.pathname },
    })
    setBusy(false)
    if (error) setMsg('Invio non riuscito: ' + error.message)
    else setStep('code')
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault()
    setBusy(true)
    setMsg('')
    const { error } = await supabase.auth.verifyOtp({ email: email.trim().toLowerCase(), token: code.trim(), type: 'email' })
    setBusy(false)
    if (error) setMsg('Codice non valido o scaduto. Richiedine uno nuovo.')
  }

  return (
    <div className="module admin-login">
      <form className="modal" onSubmit={step === 'email' ? send : verify}>
        <h2>🔐 Area admin</h2>
        {step === 'email' ? (
          <>
            <p className="muted">Inserisci la tua email: ricevi un codice di accesso.</p>
            <label>
              Email
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
            </label>
            <button className="btn primary" disabled={busy || !email.includes('@')}>
              {busy ? 'Invio…' : 'Invia codice'}
            </button>
          </>
        ) : (
          <>
            <p className="muted">
              Controlla la posta di <strong>{email}</strong> e inserisci il codice. Se nell’email c’è un link invece del
              codice, puoi anche cliccare quello (su questo stesso browser).
            </p>
            <label>
              Codice
              <input
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                maxLength={10}
                required
              />
            </label>
            <div className="row">
              <button type="button" className="btn ghost" onClick={() => (setStep('email'), setCode(''))}>
                Indietro
              </button>
              <button className="btn primary" disabled={busy || code.length < 6}>
                {busy ? 'Verifica…' : 'Entra'}
              </button>
            </div>
          </>
        )}
        {msg && <p className="error">{msg}</p>}
      </form>
    </div>
  )
}

// ------------------------------------------------------------------ dashboard

type Tab = 'overview' | 'activity' | 'users' | 'feedback'

function Kpi({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="kpi">
      <span className="kpi-label">{label}</span>
      <span className="kpi-value">{value}</span>
      {sub && <span className="kpi-sub">{sub}</span>}
    </div>
  )
}

function Bars({ data }: { data: Stats['daily'] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.visitors, d.exports)))
  return (
    <div className="bars" role="img" aria-label="Utilizzo ultimi 30 giorni">
      {data.map((d) => (
        <div key={d.day} className="bar-col" title={`${new Date(d.day).toLocaleDateString('it-CH')}: ${d.visitors} visitatori, ${d.exports} immagini`}>
          <div className="bar v" style={{ height: `${(d.visitors / max) * 100}%` }} />
          <div className="bar e" style={{ height: `${(d.exports / max) * 100}%` }} />
        </div>
      ))}
    </div>
  )
}

function ListBars({ rows }: { rows: { label: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n))
  return (
    <div className="list-bars">
      {rows.map((r) => (
        <div key={r.label} className="lb-row">
          <span className="lb-label">{r.label}</span>
          <span className="lb-track">
            <span className="lb-fill" style={{ width: `${(r.n / max) * 100}%` }} />
          </span>
          <span className="lb-n">{r.n}</span>
        </div>
      ))}
      {!rows.length && <p className="muted small">Nessun dato</p>}
    </div>
  )
}

function Dashboard({ session }: { session: Session }) {
  const [tab, setTab] = useState<Tab>('overview')
  const [stats, setStats] = useState<Stats | null>(null)
  const [funnel, setFunnel] = useState<Funnel | null>(null)
  const [events, setEvents] = useState<EventRow[]>([])
  const [visitors, setVisitors] = useState<VisitorRow[]>([])
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [modFilter, setModFilter] = useState('')
  const [visitorFilter, setVisitorFilter] = useState<{ id: string; label: string } | null>(null)
  const [search, setSearch] = useState('')
  const [onlyRegistered, setOnlyRegistered] = useState(false)
  const [live, setLive] = useState(true)
  const [updated, setUpdated] = useState<Date | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    const [s, e, v, f] = await Promise.all([
      supabase.rpc('pk_admin_stats', { p_days: 30 }),
      supabase.rpc('pk_admin_events', { p_limit: 500, p_module: modFilter || null, p_visitor: visitorFilter?.id ?? null }),
      supabase.rpc('pk_admin_visitors', { p_limit: 2000 }),
      supabase.rpc('pk_admin_funnel', { p_days: 30 }),
    ])
    setLoading(false)
    const err = s.error ?? e.error ?? v.error
    if (err) {
      setError(err.message.includes('not authorized') ? 'not authorized' : err.message)
      return
    }
    setError('')
    setStats(s.data as Stats)
    setEvents((e.data as EventRow[]) ?? [])
    setVisitors((v.data as VisitorRow[]) ?? [])
    if (!f.error) setFunnel(f.data as Funnel)
    setUpdated(new Date())
  }, [modFilter, visitorFilter])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!live) return
    const id = setInterval(load, 30000)
    return () => clearInterval(id)
  }, [live, load])

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()
    return visitors.filter(
      (v) =>
        (!onlyRegistered || v.email) &&
        (!q || [v.name, v.email, v.platform, v.id].some((x) => x?.toLowerCase().includes(q))),
    )
  }, [visitors, search, onlyRegistered])

  const filteredEvents = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return events
    return events.filter((e) => [e.name, e.email, e.module, e.event_type, metaText(e.meta)].some((x) => x?.toLowerCase().includes(q)))
  }, [events, search])

  const logout = () => supabase.auth.signOut()

  if (error === 'not authorized')
    return (
      <div className="module admin-login">
        <div className="modal">
          <h2>⛔ Accesso negato</h2>
          <p className="muted">L’account {session.user.email} non è autorizzato.</p>
          <button className="btn ghost" onClick={logout}>
            Esci
          </button>
        </div>
      </div>
    )

  const o = stats?.overview
  const showVisitorLog = (v: VisitorRow) => {
    setVisitorFilter({ id: v.id, label: who(v) })
    setTab('activity')
  }

  return (
    <section className="module admin">
      <header className="row between wrap admin-head">
        <div>
          <h1>📊 Dashboard</h1>
          <p className="muted small">
            {session.user.email} · {updated ? `aggiornato ${updated.toLocaleTimeString('it-CH')}` : 'caricamento…'}
          </p>
        </div>
        <div className="row wrap">
          <label className="toggle small-toggle">
            <input type="checkbox" checked={live} onChange={(e) => setLive(e.target.checked)} />
            <span className="toggle-ui" />
            <span>Live (30 s)</span>
          </label>
          <button className="btn ghost small" onClick={load} disabled={loading}>
            {loading ? '…' : '↻ Aggiorna'}
          </button>
          <button className="btn ghost small" onClick={logout}>
            Esci
          </button>
        </div>
      </header>

      {error && <p className="error">{error}</p>}

      <div className="segmented admin-tabs">
        {(
          [
            ['overview', '📈 Panoramica'],
            ['activity', '⚡ Attività'],
            ['users', '👥 Utenti'],
            ['feedback', '💬 Feedback'],
          ] as [Tab, string][]
        ).map(([k, l]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {tab === 'overview' && o && stats && (
        <>
          <div className="kpis">
            <Kpi label="Visitatori" value={o.visitors} sub={`${o.active_today} oggi · ${o.active7} in 7 giorni`} />
            <Kpi label="Registrati" value={o.registered} sub={o.visitors ? `${Math.round((o.registered / o.visitors) * 100)}% dei visitatori` : ''} />
            <Kpi label="Immagini create" value={o.exports} sub={`${o.saves} salvate`} />
            <Kpi label="Voto medio" value={o.avg_score ? `${o.avg_score} / 5` : '—'} sub={`${o.ratings} valutazioni`} />
          </div>
          <div className="card">
            <div className="row between wrap">
              <h3>Ultimi 30 giorni</h3>
              <span className="legend">
                <i className="dot v" /> visitatori <i className="dot e" /> immagini create
              </span>
            </div>
            <Bars data={stats.daily} />
          </div>
          {funnel && (
            <div className="card">
              <h3>Imbuto (30 giorni, persone)</h3>
              <ListBars
                rows={[
                  { label: 'Visitatori', n: funnel.visitors },
                  { label: 'Aprono uno strumento', n: funnel.tool_open },
                  { label: 'Caricano una foto', n: funnel.upload },
                  { label: 'Creano un’immagine', n: funnel.export },
                  { label: 'Download libero', n: funnel.free_download },
                  { label: 'Vedono nome/email', n: funnel.gate_shown },
                  { label: 'Annullano', n: funnel.gate_cancel },
                  { label: 'Si registrano', n: funnel.gate_submit },
                  { label: 'Salvano', n: funnel.save },
                ]}
              />
            </div>
          )}
          <div className="admin-grid">
            <div className="card">
              <h3>Strumenti</h3>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Strumento</th>
                    <th>Aperture</th>
                    <th>Create</th>
                    <th>Salvate</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.modules.map((m) => (
                    <tr key={m.module}>
                      <td>{MODULES[m.module] ?? m.module}</td>
                      <td>{m.opens}</td>
                      <td>{m.exports}</td>
                      <td>{m.saves}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="card">
              <h3>Dispositivi</h3>
              <ListBars rows={stats.platforms.map((p) => ({ label: PLATFORM[p.platform] ?? p.platform, n: p.n }))} />
              <h3 style={{ marginTop: 18 }}>Lingue</h3>
              <ListBars rows={stats.languages.map((l) => ({ label: l.lang.toUpperCase(), n: l.n }))} />
            </div>
          </div>
        </>
      )}

      {tab === 'activity' && (
        <div className="card">
          <div className="row wrap admin-filters">
            <select value={modFilter} onChange={(e) => setModFilter(e.target.value)}>
              <option value="">Tutti gli strumenti</option>
              {Object.entries(MODULES).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
            <input placeholder="Cerca nome, email, azione…" value={search} onChange={(e) => setSearch(e.target.value)} />
            {visitorFilter && (
              <button className="chip on" onClick={() => setVisitorFilter(null)}>
                👤 {visitorFilter.label} ✕
              </button>
            )}
          </div>
          <div className="log">
            {filteredEvents.map((e, i) => (
              <div key={i} className="log-row">
                <span className="log-time" title={fmtDate(e.created_at)}>
                  {ago(e.created_at)}
                </span>
                <span className="log-who">
                  <button
                    className="link"
                    onClick={() => setVisitorFilter({ id: e.visitor_id, label: who(e) })}
                    title={e.email ?? e.visitor_id}
                  >
                    {who(e)}
                  </button>
                  <span className="muted small"> {PLATFORM[e.platform ?? 'other']?.split(' ')[0]}</span>
                </span>
                <span className="log-what">
                  {EVENTS[e.event_type] ?? e.event_type} <strong>{MODULES[e.module] ?? e.module}</strong>
                  {e.meta && <span className="muted small"> · {metaText(e.meta)}</span>}
                </span>
              </div>
            ))}
            {!filteredEvents.length && <p className="muted">Nessuna attività ancora.</p>}
          </div>
        </div>
      )}

      {tab === 'users' && (
        <div className="card">
          <div className="row wrap admin-filters">
            <input placeholder="Cerca…" value={search} onChange={(e) => setSearch(e.target.value)} />
            <label className="toggle small-toggle">
              <input type="checkbox" checked={onlyRegistered} onChange={(e) => setOnlyRegistered(e.target.checked)} />
              <span className="toggle-ui" />
              <span>Solo registrati</span>
            </label>
            <button className="btn ghost small" onClick={() => downloadCsv(visitors)}>
              ⬇️ CSV registrati
            </button>
          </div>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Chi</th>
                  <th>Dispositivo</th>
                  <th>Visite</th>
                  <th>Create</th>
                  <th>Salvate</th>
                  <th>Ultima visita</th>
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((v) => (
                  <tr key={v.id} onClick={() => showVisitorLog(v)} className="clickable" title="Mostra attività">
                    <td>
                      <strong>{who(v)}</strong>
                      {v.email && (
                        <span className="muted small block">
                          {v.email} {v.newsletter ? '· 📬 newsletter' : ''}
                        </span>
                      )}
                    </td>
                    <td>
                      {PLATFORM[v.platform ?? 'other'] ?? v.platform} {v.lang ? `· ${v.lang.slice(0, 2).toUpperCase()}` : ''}
                    </td>
                    <td>{v.visits}</td>
                    <td>{v.exports}</td>
                    <td>{v.saves}</td>
                    <td title={fmtDate(v.last_seen)}>{ago(v.last_seen)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!filteredUsers.length && <p className="muted">Nessun utente ancora.</p>}
          </div>
        </div>
      )}

      {tab === 'feedback' && stats && (
        <div className="card">
          {stats.feedback.map((f, i) => (
            <div key={i} className="fb-row">
              <span className="fb-face">{FACE[f.score]}</span>
              <div>
                <div>
                  <strong>{f.name ?? 'Anonimo'}</strong>{' '}
                  <span className="muted small">
                    · {MODULES[f.module] ?? f.module} · {fmtDate(f.created_at)}
                  </span>
                </div>
                {f.comment ? <p>{f.comment}</p> : <p className="muted small">(nessun commento)</p>}
              </div>
            </div>
          ))}
          {!stats.feedback.length && <p className="muted">Nessun feedback ancora.</p>}
        </div>
      )}
    </section>
  )
}

export function Admin() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSession(s))
    return () => data.subscription.unsubscribe()
  }, [])

  if (session === undefined) return <div className="module muted">Carico…</div>
  return session ? <Dashboard session={session} /> : <Login />
}
