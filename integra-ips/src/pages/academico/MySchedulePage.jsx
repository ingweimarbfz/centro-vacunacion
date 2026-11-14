import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdChevronLeft, MdChevronRight, MdCalendarMonth, MdViewWeek, MdViewList, MdOpenInNew, MdFactCheck, MdErrorOutline, MdToday } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Empty, Modal, Spinner } from '../../components/ui'

// Horario del docente o del estudiante en calendario (mes o semana) o en lista, con filtro por grupo.
const pad = (n) => String(n).padStart(2, '0')
const iso = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
const parse = (s) => new Date(`${s}T12:00:00Z`)
const addDays = (s, n) => { const d = parse(s); d.setUTCDate(d.getUTCDate() + n); return iso(d) }
const mondayOf = (s) => { const d = parse(s); const w = (d.getUTCDay() + 6) % 7; return addDays(s, -w) }
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const fmt = (s, o) => new Intl.DateTimeFormat('es-CO', { timeZone: 'UTC', ...o }).format(parse(s))
const DOW = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
const PALETTE = ['#E30613', '#2563EB', '#059669', '#D97706', '#7C3AED', '#0891B2', '#DB2777', '#4B5563']
const VIEWS = [['mes', 'Mes', MdCalendarMonth], ['semana', 'Semana', MdViewWeek], ['lista', 'Lista', MdViewList]]
const loadView = () => { try { return localStorage.getItem('edu_horario_vista') || 'mes' } catch { return 'mes' } }

const rangeOf = (view, anchor) => {
  if (view === 'semana') { const from = mondayOf(anchor); return [from, addDays(from, 6)] }
  if (view === 'lista') return [anchor, addDays(anchor, 30)]
  const first = `${anchor.slice(0, 7)}-01`; const from = mondayOf(first)
  const last = iso(new Date(Date.UTC(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)), 0)))
  return [from, addDays(mondayOf(last), 6)]
}

const ClassActions = ({ x, teacher }) => (
  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
    {x.status !== 'cancelada' && x.modality === 'virtual' && x.meetingUrl && <a className="btn btn-primary btn-sm" href={x.meetingUrl} target="_blank" rel="noreferrer"><MdOpenInNew /> {teacher ? `Abrir ${x.platformLabel || 'clase'}` : 'Entrar a la clase'}</a>}
    {teacher && x.status !== 'cancelada' && <Link className="btn btn-outline btn-sm" to={`/educacion/clases/${x.id}/asistencia`}><MdFactCheck /> Asistencia</Link>}
  </div>
)
const where = (x) => (x.modality === 'virtual' ? (x.platformLabel || 'Virtual') : x.classroom || x.location || 'Presencial')

const MySchedulePage = () => {
  const { user } = useAuth()
  const teacher = user.role === 'docente'
  const [view, setView] = useState(loadView)
  const [anchor, setAnchor] = useState(todayISO)
  const [rows, setRows] = useState(null); const [error, setError] = useState('')
  const [group, setGroup] = useState(''); const [open, setOpen] = useState(null)
  const [from, to] = rangeOf(view, anchor)
  useEffect(() => {
    setRows(null); setError('')
    api.get('/academico/mis-clases', { params: { desde: from, hasta: to }, noCache: true }).then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e)))
  }, [from, to])
  useEffect(() => { try { localStorage.setItem('edu_horario_vista', view) } catch { /* sin almacenamiento */ } }, [view])
  const [groups, setGroups] = useState([])
  useEffect(() => { if (rows) setGroups((g) => { const m = new Map(g.map((x) => [x.id, x])); rows.forEach((x) => x.group && m.set(x.group.id, x.group)); return [...m.values()] }) }, [rows])
  const colorOf = (gid) => PALETTE[Math.max(0, groups.findIndex((g) => g.id === gid)) % PALETTE.length]
  const list = useMemo(() => (rows || []).filter((x) => !group || String(x.group?.id) === group), [rows, group])
  const byDay = useMemo(() => list.reduce((a, x) => { (a[x.date] = a[x.date] || []).push(x); return a }, {}), [list])
  const today = todayISO()
  const move = (n) => setAnchor(view === 'mes' ? iso(new Date(Date.UTC(Number(anchor.slice(0, 4)), Number(anchor.slice(5, 7)) - 1 + n, 1))) : addDays(anchor, n * (view === 'semana' ? 7 : 30)))
  const cap = (t) => t.charAt(0).toUpperCase() + t.slice(1)
  const title0 = view === 'mes' ? fmt(`${anchor.slice(0, 7)}-15`, { month: 'long', year: 'numeric' }) : `${fmt(from, { day: 'numeric', month: 'short' })} – ${fmt(to, { day: 'numeric', month: 'short', year: 'numeric' })}`
  const title = cap(title0)

  const Chip = ({ x }) => (
    <button type="button" onClick={() => setOpen(x)} title={`${x.startTime}–${x.endTime} · ${x.subject || 'Clase'} · ${x.group?.code}`}
      style={{ display: 'block', width: '100%', textAlign: 'left', border: 0, borderLeft: `3px solid ${colorOf(x.group?.id)}`, background: 'var(--line-2)', borderRadius: 6, padding: '3px 6px', fontSize: 11.5, lineHeight: 1.3, cursor: 'pointer', color: 'inherit', textDecoration: x.status === 'cancelada' ? 'line-through' : 'none', opacity: x.status === 'cancelada' ? 0.55 : 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>
      <b>{x.startTime}</b> {x.subject || 'Clase'} · {x.group?.code}
    </button>
  )

  const days = []
  for (let d = from; d <= to; d = addDays(d, 1)) days.push(d)

  return (
    <>
      <PageHead title="Mi horario" subtitle={teacher ? 'Tus clases en calendario o en lista: entra a la clase virtual o toma asistencia' : 'Tus clases en calendario o en lista, con el enlace a las clases virtuales'} />
      <Card>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', marginBottom: 14 }}>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Anterior" onClick={() => move(-1)}><MdChevronLeft /></button>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setAnchor(todayISO())}><MdToday /> Hoy</button>
            <button type="button" className="btn btn-ghost btn-icon" aria-label="Siguiente" onClick={() => move(1)}><MdChevronRight /></button>
          </div>
          <b style={{ fontSize: 16, flex: '1 1 160px' }}>{title}</b>
          {groups.length > 1 && <select className="input" style={{ width: 'auto' }} aria-label="Grupo" value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Todos los grupos</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.code} · {g.program}</option>)}</select>}
          <div className="module-switch inline">{VIEWS.map(([k, l, I]) => <button key={k} type="button" className={view === k ? 'on' : ''} onClick={() => setView(k)}><I /> {l}</button>)}</div>
        </div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
        {!rows ? (!error && <div className="splash" style={{ minHeight: 240 }}><Spinner /></div>) : view === 'lista' ? (
          list.length === 0 ? <Empty icon={<MdViewList />}>No tienes clases en los próximos 30 días.</Empty> : (
            <div className="stack" style={{ gap: 14 }}>{Object.entries(byDay).map(([day, xs]) => (
              <div key={day}>
                <div style={{ fontWeight: 700, fontSize: 13.5, textTransform: 'capitalize', marginBottom: 6, color: day === today ? 'var(--brand)' : undefined }}>{fmt(day, { weekday: 'long', day: 'numeric', month: 'long' })}{day === today ? ' · hoy' : ''}</div>
                <div className="stack" style={{ gap: 8 }}>{xs.map((x) => (
                  <div key={x.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, border: '1px solid var(--line)', borderLeft: `4px solid ${colorOf(x.group?.id)}`, borderRadius: 10, flexWrap: 'wrap', opacity: x.status === 'cancelada' ? 0.6 : 1 }}>
                    <div style={{ minWidth: 92 }}><b>{x.startTime}–{x.endTime}</b></div>
                    <div style={{ flex: '1 1 220px', minWidth: 0 }}><b style={{ fontSize: 14 }}>{x.subject || 'Clase'}</b><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{x.group?.code} · {x.group?.program} · {where(x)}{!teacher && x.teacher ? ` · ${x.teacher}` : ''}{x.topic ? ` · ${x.topic}` : ''}</div></div>
                    {x.status === 'cancelada' ? <span className="badge bad">Cancelada{x.cancelReason ? `: ${x.cancelReason}` : ''}</span> : x.status === 'realizada' ? <span className="badge ok">Realizada</span> : <span className={`badge ${x.modality === 'virtual' ? 'info' : 'brand'}`}>{x.modality === 'virtual' ? 'Virtual' : 'Presencial'}</span>}
                    <ClassActions x={x} teacher={teacher} />
                  </div>
                ))}</div>
              </div>
            ))}</div>
          )
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(110px, 1fr))', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', minWidth: 770 }}>
              {DOW.map((d) => <div key={d} style={{ padding: '8px 10px', fontSize: 12, fontWeight: 700, color: 'var(--muted)', background: 'var(--line-2)', textTransform: 'uppercase' }}>{d}</div>)}
              {days.map((day) => {
                const out = view === 'mes' && day.slice(0, 7) !== anchor.slice(0, 7)
                const xs = byDay[day] || []
                return (
                  <div key={day} style={{ minHeight: view === 'semana' ? 260 : 104, padding: 6, borderTop: '1px solid var(--line)', borderLeft: '1px solid var(--line-2)', background: out ? 'var(--line-2)' : 'var(--card, #fff)', opacity: out ? 0.6 : 1 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 22, height: 22, borderRadius: 99, padding: '0 6px', ...(day === today ? { background: 'var(--brand)', color: '#fff' } : {}) }}>{Number(day.slice(8))}{view === 'semana' ? ` ${fmt(day, { month: 'short' })}` : ''}</div>
                    <div className="stack" style={{ gap: 3 }}>{(view === 'mes' ? xs.slice(0, 3) : xs).map((x) => <Chip key={x.id} x={x} />)}{view === 'mes' && xs.length > 3 && <button type="button" className="btn btn-ghost btn-sm" style={{ fontSize: 11, padding: '0 4px', height: 20 }} onClick={() => { setAnchor(day); setView('semana') }}>+{xs.length - 3} más</button>}</div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
        {groups.length > 1 && <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginTop: 12, fontSize: 12.5 }}>{groups.map((g) => <span key={g.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={{ width: 10, height: 10, borderRadius: 3, background: colorOf(g.id) }} />{g.code} · {g.program}</span>)}</div>}
      </Card>
      {open && (
        <Modal title={open.subject || 'Clase'} size="sm" onClose={() => setOpen(null)} footer={<button type="button" className="btn btn-outline" onClick={() => setOpen(null)}>Cerrar</button>}>
          <div className="stack" style={{ gap: 10, fontSize: 14 }}>
            <div><b style={{ textTransform: 'capitalize' }}>{fmt(open.date, { weekday: 'long', day: 'numeric', month: 'long' })}</b> · {open.startTime}–{open.endTime}</div>
            <div>{open.group?.code} · {open.group?.program}</div>
            <div>{open.modality === 'virtual' ? `Virtual · ${open.platformLabel || ''}` : `Presencial · ${where(open)}`}</div>
            {!teacher && open.teacher && <div>Docente: {open.teacher}</div>}
            {open.topic && <div>Tema: {open.topic}</div>}
            {open.status === 'cancelada' && <div className="alert bad" style={{ margin: 0 }}><span>Clase cancelada{open.cancelReason ? `: ${open.cancelReason}` : ''}</span></div>}
            <ClassActions x={open} teacher={teacher} />
          </div>
        </Modal>
      )}
    </>
  )
}

export default MySchedulePage
