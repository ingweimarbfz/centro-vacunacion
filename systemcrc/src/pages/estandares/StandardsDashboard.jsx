import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, LabelList } from 'recharts'
import {
  MdRule, MdGroups, MdApartment, MdMedicalServices, MdMedication, MdAccountTree, MdHistoryEdu, MdHub,
  MdWarning, MdError, MdNotificationsActive, MdDraw, MdArrowForward, MdLock, MdCheckCircle, MdRefresh
} from 'react-icons/md'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { hasModule } from '../../utils/permissions'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import PendingSignatures from '../../components/PendingSignatures'
import { StandardsGrid } from '../talento/StandardsHome'

const STAFF = ['administrador', 'empleado']
const SIGN_TYPES = ['th_chequeo', 'std_chequeo', 'th_hoja_vida']
const fmt = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '')
const monthsAgo = (iso) => (iso ? (Date.now() - new Date(`${iso.slice(0, 10)}T12:00:00`).getTime()) / (30.4 * 86400000) : Infinity)
const pctTone = (p) => (p == null ? '' : p >= 90 ? 'ok' : p >= 70 ? 'warn' : 'bad')
const COLOR = { ok: '#16A34A', warn: '#F59E0B', bad: '#DC2626', '': '#94A3B8' }

// Definición de cada estándar: módulo, ruta y de dónde sale su información.
const STANDARDS = [
  { n: 1, key: 'talento_humano', name: 'Talento humano', icon: MdGroups, to: '/estandares/talento-humano', module: 'talento_humano', kind: 'th' },
  { n: 2, key: 'infraestructura', name: 'Infraestructura', icon: MdApartment, to: '/estandares/infraestructura', module: 'infraestructura', kind: 'folder', followUp: true },
  { n: 3, key: 'dotacion', name: 'Dotación', icon: MdMedicalServices, to: '/equipos', module: 'equipos', kind: 'equipos' },
  { n: 4, key: 'medicamentos', name: 'Medicamentos, dispositivos e insumos', icon: MdMedication, to: '/estandares/medicamentos', module: 'medicamentos', kind: 'docs', inventory: true },
  { n: 5, key: 'procesos_prioritarios', name: 'Procesos prioritarios', icon: MdAccountTree, to: '/estandares/procesos-prioritarios', module: 'procesos_prioritarios', kind: 'docs' },
  { n: 6, key: 'historia_clinica', name: 'Historia clínica y registros', icon: MdHistoryEdu, to: '/estandares/historia-clinica', module: 'historia_clinica', kind: 'folder' },
  { n: 7, key: 'interdependencia', name: 'Interdependencia', icon: MdHub, to: '/estandares/interdependencia', module: 'interdependencia', kind: 'folder' }
]
const get = (url) => api.get(url).then((r) => r.data).catch(() => null)

// Arma la información y las alertas de un estándar a partir de sus servicios.
const loadStandard = async (s, user) => {
  const out = { ...s, alerts: [], metrics: [], percent: null }
  const alert = (level, message, to = s.to, date) => out.alerts.push({ level, message, to, date, std: s.name, n: s.n, icon: s.icon })
  if (s.kind === 'th') {
    const d = await get('/estandares/th/resumen')
    if (!d) return { ...out, error: true }
    const k = d.kpis
    out.percent = k.avgCompliance
    out.metrics = [[`${k.total}`, 'personas activas'], [`${k.compliant}`, 'con requisitos al día'], [`${k.contractsExpiring + k.contractsExpired}`, 'contratos por vencer o vencidos'], [`${k.docsExpiring + k.docsExpired}`, 'certificados por vencer o vencidos']]
    for (const a of d.alerts) alert(a.level, `${a.name}: ${a.message}`, `/estandares/talento-humano/personal/${a.staffId}`, a.date)
  }
  if (s.kind === 'folder') {
    const d = await get(`/estandares/documentos/${s.key}/carpeta`)
    if (!d) return { ...out, error: true }
    const sm = d.summary
    out.percent = sm.total ? Math.round(((sm.cumple + sm.porVencer) / sm.total) * 100) : null
    const last = d.checklists.find((c) => (c.siteId || null) === (d.siteId || null)) || d.checklists[0]
    out.metrics = [[`${sm.cumple + sm.porVencer}/${sm.total}`, 'documentos obligatorios'], [`${sm.faltante}`, 'faltantes'], [`${sm.vencido} / ${sm.porVencer}`, 'vencidos / por vencer'], [last ? fmt(last.date) : '—', 'última verificación']]
    for (const it of d.items) {
      if (it.status === 'faltante') alert('bad', `Falta en la carpeta: ${it.name}`)
      if (it.status === 'vencido') alert('bad', `Documento vencido: ${it.name}`, s.to, it.documents.map((x) => x.validUntil).filter(Boolean).sort().pop())
      for (const doc of it.documents) if (doc.validity === 'por_vencer') alert('warn', `${doc.name} vence en ${doc.daysLeft} día${doc.daysLeft === 1 ? '' : 's'}`, s.to, doc.validUntil)
    }
    if (!last) alert('warn', 'La carpeta nunca se ha verificado')
    else if (monthsAgo(last.date) > 6) alert('warn', `Última verificación de carpeta hace más de 6 meses (${fmt(last.date)})`)
    else if (last.result === 'no_cumple') alert('warn', `La última verificación (${last.code}) no cumple`, `${s.to}/verificacion/${last.id}`, last.date)
    if (s.followUp) {
      const f = (d.followups || []).find((c) => (c.siteId || null) === (d.siteId || null)) || (d.followups || [])[0]
      if (f && f.total - f.compliant > 0) alert('warn', `${f.total - f.compliant} hallazgo${f.total - f.compliant === 1 ? '' : 's'} pendiente${f.total - f.compliant === 1 ? '' : 's'} en el seguimiento ${f.code}`, `${s.to}/seguimiento/${f.id}`, f.date)
      out.metrics.push([f ? `${f.compliant}/${f.total}` : '—', 'actividades Ok (último seguimiento)'])
    }
  }
  if (s.kind === 'docs' || s.inventory) {
    const docs = await get(`/estandares/documentos/${s.key}`)
    if (docs) {
      out.metrics.push([`${docs.length}`, 'documentos cargados'])
      if (!docs.length) alert('warn', 'Aún no hay documentos cargados')
      for (const doc of docs) {
        if (doc.validity === 'vencido') alert('bad', `Documento vencido: ${doc.name}`, s.to, doc.validUntil)
        if (doc.validity === 'por_vencer') alert('warn', `${doc.name} vence en ${doc.daysLeft} días`, s.to, doc.validUntil)
      }
    }
  }
  if (s.inventory && STAFF.includes(user.role) && hasModule(user, 'inventario')) {
    const d = await get('/inventario/resumen')
    if (d) {
      const health = (['medicamento', 'dispositivo_medico', 'reactivo'])
      const lines = d.byCategory.filter((c) => health.includes(c.key)).reduce((a, c) => a + c.lines, 0)
      const bad = (d.expiring || []).filter((l) => health.includes(l.product?.category))
      const expired = bad.filter((l) => l.expired).length
      out.percent = lines ? Math.max(0, Math.round(((lines - expired) / lines) * 100)) : null
      out.metrics.push([`${lines}`, 'lotes en inventario'], [`${expired} / ${bad.length - expired}`, 'lotes vencidos / por vencer'], [`${d.kpis.low}`, 'productos bajo el mínimo'])
      for (const l of bad.slice(0, 15)) alert(l.expired ? 'bad' : 'warn', `${l.product?.name}${l.lot ? ` (lote ${l.lot})` : ''} ${l.expired ? 'vencido' : `vence en ${l.daysToExpiry} días`} · ${l.warehouseName || ''}`, `/socorro/inventario/existencias?vencimiento=${l.expired ? 'vencidos' : 'proximos'}`, l.expiryDate)
      if (d.kpis.low) alert('warn', `${d.kpis.low} producto${d.kpis.low === 1 ? '' : 's'} por debajo del stock mínimo`, '/socorro/inventario')
    }
  }
  if (s.kind === 'equipos') {
    if (!(STAFF.includes(user.role) && hasModule(user, 'equipos'))) return { ...out, locked: true }
    const d = await get('/equipos-resumen')
    if (!d) return { ...out, error: true }
    const badEq = new Set(d.alerts.filter((a) => a.level === 'bad').map((a) => a.equipmentId)).size
    out.percent = d.total ? Math.round(((d.total - badEq) / d.total) * 100) : null
    out.metrics = [[`${d.total}`, 'equipos activos'], [`${d.yearMaintenance.count}`, 'mantenimientos este año'], [`${d.dueSoon}`, 'preventivos próximos'], [`${d.alerts.length}`, 'alertas']]
    for (const a of d.alerts) alert(a.level, `${a.code} ${a.name}: ${a.message}`, `/equipos/${a.equipmentId}`, a.date)
  }
  return out
}

const StandardCard = ({ s }) => {
  const navigate = useNavigate()
  const tone = pctTone(s.percent)
  const bad = s.alerts.filter((a) => a.level === 'bad').length
  const warn = s.alerts.length - bad
  return (
    <div className={`card sdb-card ${s.available ? '' : 'off'}`}>
      <div className="sdb-head">
        <span className="th-std-n">{s.n}</span>
        <span className="icon-bubble brand"><s.icon /></span>
        <div className="grow"><strong>{s.name}</strong>
          {s.available && !s.locked && !s.error && <span className="sdb-badges">{bad > 0 && <span className="badge bad">{bad} crítica{bad === 1 ? '' : 's'}</span>}{warn > 0 && <span className="badge warn">{warn} aviso{warn === 1 ? '' : 's'}</span>}{!s.alerts.length && <span className="badge ok"><MdCheckCircle /> Al día</span>}</span>}
        </div>
        {s.percent != null && <div className={`sdb-pct ${tone}`}><b>{s.percent}%</b><small>cumplimiento</small></div>}
      </div>
      {!s.available ? <p className="hint" style={{ margin: 0 }}><MdLock /> No tienes habilitado este módulo.</p>
        : s.locked ? <p className="hint" style={{ margin: 0 }}><MdLock /> Requiere el módulo de equipos (IPS).</p>
          : s.error ? <p className="hint" style={{ margin: 0 }}>No se pudo cargar la información.</p>
            : s.kind === 'link' ? <p className="hint" style={{ margin: 0 }}>Instructivo y formatos generales del estándar de talento humano.</p>
              : (
                <>
                  <div className="sdb-metrics">{s.metrics.slice(0, 4).map(([v, l]) => <div key={l}><b>{v}</b><span>{l}</span></div>)}</div>
                  {s.alerts.length > 0 && (
                    <ul className="sdb-alerts">{s.alerts.slice(0, 3).map((a, i) => (
                      <li key={i}><button type="button" onClick={() => navigate(a.to)}>{a.level === 'bad' ? <MdError className="bad" /> : <MdWarning className="warn" />}<span>{a.message}</span></button></li>
                    ))}{s.alerts.length > 3 && <li className="hint">y {s.alerts.length - 3} más…</li>}</ul>
                  )}
                </>
              )}
      {s.available && <Link to={s.to} className="btn btn-ghost btn-sm sdb-go">Abrir <MdArrowForward /></Link>}
    </div>
  )
}

// Dashboard general de los estándares transversales: cumplimiento por estándar y alertas priorizadas.
const StandardsDashboard = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [pending, setPending] = useState(null)
  const [filter, setFilter] = useState('')
  const [tick, setTick] = useState(0)
  useEffect(() => {
    let alive = true
    setRows(null)
    Promise.all(STANDARDS.map(async (s) => {
      const available = hasModule(user, s.module) && (s.kind !== 'equipos' || STAFF.includes(user.role))
      if (!available) return { ...s, available, alerts: [], metrics: [] }
      return { ...(await loadStandard(s, user)), available }
    })).then((r) => { if (alive) setRows(r) })
    get('/firmas/pendientes').then((d) => { if (alive) setPending(d ? d.items.filter((i) => SIGN_TYPES.includes(i.docType)) : []) })
    return () => { alive = false }
  }, [user, tick])
  const alerts = useMemo(() => (rows || []).flatMap((r) => r.alerts).sort((a, b) => (a.level === b.level ? String(a.date || '9').localeCompare(String(b.date || '9')) : a.level === 'bad' ? -1 : 1)), [rows])
  if (!rows) return (
    <>
      <PageHead title="Estándares transversales" subtitle="Dashboard general: cumplimiento y alertas de cada estándar de habilitación" />
      <StandardsGrid />
      <div className="splash" style={{ minHeight: 160 }}><Spinner /> Reuniendo la información de los estándares…</div>
    </>
  )
  const scored = rows.filter((r) => r.available && r.percent != null)
  const avg = scored.length ? Math.round(scored.reduce((a, r) => a + r.percent, 0) / scored.length) : null
  const bad = alerts.filter((a) => a.level === 'bad').length
  const shown = alerts.filter((a) => !filter || String(a.n) === filter)
  const chart = scored.map((r) => ({ name: `${r.n}. ${r.name.length > 22 ? `${r.name.slice(0, 20)}…` : r.name}`, value: r.percent, tone: pctTone(r.percent) }))

  return (
    <>
      <PageHead title="Estándares transversales" subtitle="Dashboard general: cumplimiento y alertas de cada estándar de habilitación">
        <button type="button" className="btn btn-ghost" onClick={() => setTick((t) => t + 1)}><MdRefresh /> Actualizar</button>
      </PageHead>

      <StandardsGrid />
      <h3 className="sdb-title">Dashboard</h3>

      <div className="grid grid-kpi">
        <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Cumplimiento general</span><span className={`kpi-icon ${pctTone(avg) === 'ok' ? 'ok' : 'warn'}`}><MdRule /></span></div><div className="kpi-value">{avg == null ? '—' : `${avg}%`}</div><div className="kpi-foot">Promedio de {scored.length} estándar{scored.length === 1 ? '' : 'es'} medidos</div></div>
        <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Alertas críticas</span><span className="kpi-icon"><MdError /></span></div><div className="kpi-value">{bad}</div><div className="kpi-foot">Faltantes, vencidos y no conformidades</div></div>
        <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Avisos</span><span className="kpi-icon warn"><MdWarning /></span></div><div className="kpi-value">{alerts.length - bad}</div><div className="kpi-foot">Por vencer, hallazgos y verificaciones pendientes</div></div>
        <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Mis firmas pendientes</span><span className="kpi-icon navy"><MdDraw /></span></div><div className="kpi-value">{pending == null ? '…' : pending.length}</div><div className="kpi-foot">Listas de chequeo, seguimientos y hojas de vida</div></div>
      </div>

      <div className="grid grid-2" style={{ marginTop: 18, alignItems: 'start' }}>
        <Card title="Cumplimiento por estándar" subtitle="Porcentaje de requisitos o documentos obligatorios al día">
          {chart.length === 0 ? <Empty icon={<MdRule />}>Sin datos.</Empty> : (
            <div style={{ width: '100%', height: Math.max(180, chart.length * 40) }}><ResponsiveContainer>
              <BarChart data={chart} layout="vertical" margin={{ left: 10, right: 36 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} unit="%" />
                <YAxis type="category" dataKey="name" width={170} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => `${v}%`} />
                <Bar dataKey="value" name="Cumplimiento" radius={[0, 4, 4, 0]} isAnimationActive={false}>{chart.map((c, i) => <Cell key={i} fill={COLOR[c.tone]} />)}<LabelList dataKey="value" position="right" formatter={(v) => `${v}%`} style={{ fontSize: 11, fill: '#374151' }} /></Bar>
              </BarChart>
            </ResponsiveContainer></div>
          )}
        </Card>
        <Card flush title="Alertas y notificaciones" subtitle="Ordenadas por prioridad; haz clic para ir al detalle" icon={<MdNotificationsActive style={{ color: 'var(--brand)' }} />}>
          <div className="th-chips">
            <button type="button" className={!filter ? 'on' : ''} onClick={() => setFilter('')}>Todas ({alerts.length})</button>
            {rows.filter((r) => r.alerts.length).map((r) => <button key={r.n} type="button" className={filter === String(r.n) ? 'on' : ''} onClick={() => setFilter(String(r.n))}>{r.n}. {r.name.split(' ')[0]} ({r.alerts.length})</button>)}
          </div>
          {shown.length === 0 ? <Empty icon={<MdCheckCircle />}>Sin alertas. Todo al día.</Empty> : (
            <ul className="list th-alerts">{shown.slice(0, 80).map((a, i) => (
              <li key={i} onClick={() => navigate(a.to)} role="button" tabIndex={0}>
                <span className={`icon-bubble ${a.level === 'bad' ? 'bad' : 'warn'}`}>{a.level === 'bad' ? <MdError /> : <MdWarning />}</span>
                <div className="grow"><strong>{a.message}</strong><span>{a.n}. {a.std}{a.date ? ` · ${fmt(a.date)}` : ''}</span></div>
              </li>
            ))}</ul>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18 }}><PendingSignatures types={SIGN_TYPES} /></div>

      <h3 className="sdb-title">Estado por estándar</h3>
      <div className="sdb-grid">{rows.map((s) => <StandardCard key={s.n} s={s} />)}</div>
    </>
  )
}

export default StandardsDashboard
