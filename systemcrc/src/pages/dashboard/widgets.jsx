import React from 'react'
import { Link } from 'react-router-dom'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine,
  ReferenceArea, Cell, PieChart, Pie
} from 'recharts'
import {
  MdThermostat, MdWarning, MdCheckCircle, MdBiotech, MdTrendingUp, MdTrendingDown, MdEventAvailable, MdAttachMoney,
  MdPeople, MdVaccines, MdScience, MdLocalHospital, MdMedication, MdMonitorHeart, MdArrowForward, MdAcUnit
} from 'react-icons/md'
import { Card, Empty } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '../../utils/permissions'
import { readingPoints, dayTick, ReadingTip, shiftDot, SHIFT_COLORS } from '../../components/tempChart'

const ADMIN = ['administrador']
const STAFF = ['administrador', 'empleado']
const ALL = ['administrador', 'empleado']

const PALETTE = ['#1F2A44', '#E30613', '#0EA5A4', '#F59E0B', '#6366F1', '#94A3B8']
const axis = { fontSize: 11, fill: '#6B7280' }
// Agrupa las lecturas por día: mínima y máxima de la mañana y de la tarde.
const byDay = (series) => {
  const days = {}
  for (const r of series) {
    const d = days[r.isoDate] || (days[r.isoDate] = { isoDate: r.isoDate, label: r.isoDate.slice(8, 10), date: r.date })
    const k = r.shift === 'tarde' ? 'Pm' : 'Am'
    d[`min${k}`] = d[`min${k}`] == null ? r.tempMin : Math.min(d[`min${k}`], r.tempMin)
    d[`max${k}`] = d[`max${k}`] == null ? r.tempMax : Math.max(d[`max${k}`], r.tempMax)
    d[`alert${k}`] = d[`alert${k}`] || r.alertHigh || r.alertLow
  }
  return Object.keys(days).sort().map((k) => days[k])
}
const DayTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const d = payload[0].payload
  return (
    <div className="chart-tip">
      <strong>{d.date}</strong>
      {payload.map((p) => <div key={p.dataKey} style={{ color: p.color }}>{p.name}: {p.value} °C</div>)}
    </div>
  )
}

const Tip = ({ active, payload, label, unit = '', labelPrefix = '' }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tip">
      <strong>{labelPrefix}{label}</strong>
      {payload.map((p) => (
        <div key={p.dataKey} style={{ color: p.color || p.payload?.fill }}>{p.name}: <b>{p.value}{unit}</b></div>
      ))}
    </div>
  )
}

// ---------------------------------------------------------------- KPIs
const Kpi = ({ label, value, unit, icon, tone = '', foot, children }) => (
  <div className="card kpi">
    <div className="kpi-top">
      <span className="kpi-label">{label}</span>
      <span className={`kpi-icon ${tone}`}>{icon}</span>
    </div>
    <div className="kpi-value">{value ?? '—'}{unit && value != null && <small>{unit}</small>}</div>
    {children}
    {foot && <div className="kpi-foot">{foot}</div>}
  </div>
)

const delta = (now, before) => {
  if (!before) return null
  return Math.round(((now - before) / before) * 100)
}

const KpiRow = ({ data, role }) => {
  const t = data.temperature.stats
  const c = data.cytology
  const d = delta(c.count, c.prevCount)
  const overMax = t.max && t.max.value > data.thresholds.max
  return (
    <div className="grid grid-kpi">
      <Kpi label="Temperatura más alta" value={t.max?.value} unit="°C" icon={<MdThermostat />} tone={overMax ? '' : 'ok'}
        foot={t.max ? <>{overMax ? <span className="badge bad">Sobre el límite</span> : <span className="badge ok">En rango</span>} el {t.max.date}</> : 'Sin registros este mes'} />
      <Kpi label="Promedio máx. / mín." value={t.avgMax != null ? `${t.avgMax} / ${t.avgMin}` : null} unit="°C" icon={<MdAcUnit />} tone="navy"
        foot={`Rango permitido ${data.thresholds.min}–${data.thresholds.max} °C`} />
      <Kpi label="Citologías del mes" value={c.count} icon={<MdBiotech />}
        foot={d == null ? `Mes anterior: ${c.prevCount}` : (
          <><span className={`badge ${d >= 0 ? 'ok' : 'bad'}`}>{d >= 0 ? <MdTrendingUp /> : <MdTrendingDown />} {d > 0 ? '+' : ''}{d}%</span> vs. mes anterior ({c.prevCount})</>
        )} />
      <Kpi label="Cumplimiento de registro" value={t.compliance} unit="%" icon={<MdEventAvailable />} tone={t.compliance >= 90 ? 'ok' : 'warn'}
        foot={`${t.daysWithReading} de ${t.elapsedDays} días con temperatura registrada`}>
        <div className="progress"><span style={{ width: `${Math.min(100, t.compliance)}%` }} /></div>
      </Kpi>
      {ADMIN.includes(role) && (
        <Kpi label="Ingresos por citología" value={formatMoney(c.revenue)} icon={<MdAttachMoney />} tone="ok" foot="Valor facturado en el mes" />
      )}
    </div>
  )
}

// ---------------------------------------------------------------- Temperatura del mes
const TempMonth = ({ data, colors }) => {
  const { series } = data.temperature
  const { min, max } = data.thresholds
  const points = readingPoints(series)
  return (
    <Card title="Temperatura del mes" subtitle="Cada punto es una lectura (4 al día) con su mínima y máxima, frente al rango permitido"
      actions={<div className="legend"><span><i style={{ background: colors.primary }} />Máxima</span><span><i style={{ background: colors.secondary }} />Mínima</span><span><i style={{ background: SHIFT_COLORS.manana, borderRadius: '50%' }} />Mañana</span><span><i style={{ background: SHIFT_COLORS.tarde, borderRadius: '50%' }} />Tarde</span></div>}>
      {series.length === 0 ? <Empty icon={<MdThermostat />}>No hay temperaturas registradas en este mes.</Empty> : (
        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={points} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#EEF0F2" vertical={false} />
            <ReferenceArea y1={min} y2={max} fill="#DCFCE7" fillOpacity={0.45} />
            <XAxis dataKey="x" tick={axis} tickLine={false} axisLine={false} interval={0} tickFormatter={(v, i) => dayTick(points)(v, i).slice(0, 2)} />
            <YAxis tick={axis} tickLine={false} axisLine={false} domain={[(dMin) => Math.floor(Math.min(dMin, min) - 2), (dMax) => Math.ceil(Math.max(dMax, max) + 2)]} unit="°" />
            <Tooltip content={<ReadingTip />} />
            <ReferenceLine y={max} stroke="#DC2626" strokeDasharray="5 4" label={{ value: `Máx ${max}°`, position: 'insideTopRight', fontSize: 11, fill: '#DC2626' }} />
            <ReferenceLine y={min} stroke="#2563EB" strokeDasharray="5 4" label={{ value: `Mín ${min}°`, position: 'insideBottomRight', fontSize: 11, fill: '#2563EB' }} />
            <Line type="monotone" dataKey="tempMax" name="Máxima" stroke={colors.primary} strokeWidth={2} dot={shiftDot(3)} activeDot={{ r: 5 }} />
            <Line type="monotone" dataKey="tempMin" name="Mínima" stroke={colors.secondary} strokeWidth={2} dot={shiftDot(3)} activeDot={{ r: 5 }} />
          </LineChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------- Alertas
const Alerts = ({ data, role }) => {
  const { alerts, registeredToday, last } = data.temperature
  return (
    <Card title="Alertas de temperatura" subtitle={`${alerts.length} lectura${alerts.length === 1 ? '' : 's'} fuera de rango`}
      actions={alerts.length ? <span className="badge bad"><span className="dot" /> {alerts.length}</span> : <span className="badge ok">Sin alertas</span>}>
      <ul className="list">
        {registeredToday === false && (
          <li>
            <span className="icon-bubble info"><MdEventAvailable /></span>
            <div className="grow"><strong>Falta el registro de hoy</strong><span>Última lectura: {last ? `${last.date} ${last.time}` : '—'}</span></div>
            {STAFF.includes(role) && <Link className="btn btn-outline btn-sm" to="/temperatura">Registrar</Link>}
          </li>
        )}
        {alerts.slice(0, 6).map((a) => (
          <li key={a.id}>
            <span className="icon-bubble bad"><MdWarning /></span>
            <div className="grow"><strong>{a.message}</strong><span>{a.date} · {a.shiftLabel ? `${a.shiftLabel} · ` : ''}{a.time}</span></div>
            <span className={`badge ${a.type === 'alta' ? 'bad' : 'info'}`}>{a.type === 'alta' ? 'Alta' : 'Baja'}</span>
          </li>
        ))}
        {!alerts.length && registeredToday !== false && (
          <li><span className="icon-bubble brand" style={{ background: 'var(--ok-50)', color: 'var(--ok)' }}><MdCheckCircle /></span>
            <div className="grow"><strong>Todo en rango</strong><span>Ninguna lectura superó los límites este mes</span></div></li>
        )}
      </ul>
    </Card>
  )
}

// ---------------------------------------------------------------- Máxima diaria
const MaxBars = ({ data, colors }) => {
  const { series } = data.temperature
  const { max } = data.thresholds
  return (
    <Card title="Temperatura máxima por día" subtitle="Mañana y tarde · las barras en rojo superaron el límite máximo"
      actions={<div className="legend"><span><i style={{ background: SHIFT_COLORS.manana }} />Mañana</span><span><i style={{ background: SHIFT_COLORS.tarde }} />Tarde</span></div>}>
      {series.length === 0 ? <Empty icon={<MdThermostat />}>Sin datos.</Empty> : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={byDay(series)} margin={{ top: 10, right: 8, left: -18, bottom: 0 }}>
            <CartesianGrid stroke="#EEF0F2" vertical={false} />
            <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={14} />
            <YAxis tick={axis} tickLine={false} axisLine={false} unit="°" domain={[0, (d) => Math.ceil(Math.max(d, max) + 2)]} />
            <Tooltip content={<DayTip />} cursor={{ fill: '#F3F4F6' }} />
            <ReferenceLine y={max} stroke="#DC2626" strokeDasharray="5 4" />
            <Bar dataKey="maxAm" name="Máx. mañana" radius={[5, 5, 0, 0]} maxBarSize={14}>
              {byDay(series).map((d) => <Cell key={d.isoDate} fill={d.maxAm > max ? '#DC2626' : SHIFT_COLORS.manana} />)}
            </Bar>
            <Bar dataKey="maxPm" name="Máx. tarde" radius={[5, 5, 0, 0]} maxBarSize={14}>
              {byDay(series).map((d) => <Cell key={d.isoDate} fill={d.maxPm > max ? '#DC2626' : SHIFT_COLORS.tarde} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      )}
    </Card>
  )
}

// ---------------------------------------------------------------- Resumen de temperatura
const TempSummary = ({ data }) => {
  const { stats, last } = data.temperature
  const rows = [
    ['Registro más alto', stats.max ? `${stats.max.value} °C` : '—', stats.max?.date],
    ['Registro más bajo', stats.min ? `${stats.min.value} °C` : '—', stats.min?.date],
    ['Lecturas del mes', stats.count, `${stats.alerts} fuera de rango`],
    ['Última lectura', last ? `${last.tempMin} / ${last.tempMax} °C` : '—', last ? `${last.date} ${last.time}` : '']
  ]
  return (
    <Card title="Resumen cadena de frío" icon={<MdThermostat style={{ color: 'var(--brand)' }} />}>
      <ul className="list">
        {rows.map(([k, v, s]) => (
          <li key={k}><div className="grow"><span>{k}</span><strong style={{ fontSize: 16 }}>{v}</strong></div><span className="kpi-foot">{s}</span></li>
        ))}
      </ul>
    </Card>
  )
}

// ---------------------------------------------------------------- Citologías por día
const CytoPerDay = ({ data, colors }) => (
  <Card title="Citologías tomadas en el mes" subtitle={`${data.cytology.count} muestras · ${data.cytology.abnormal} con hallazgos en el cuello`}>
    <ResponsiveContainer width="100%" height={240}>
      <BarChart data={data.cytology.perDay} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
        <CartesianGrid stroke="#EEF0F2" vertical={false} />
        <XAxis dataKey="day" tick={axis} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={10} />
        <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <Tooltip content={<Tip labelPrefix="Día " />} cursor={{ fill: '#F3F4F6' }} />
        <Bar dataKey="value" name="Citologías" fill={colors.primary} radius={[6, 6, 0, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  </Card>
)

// ---------------------------------------------------------------- Distribución
const Donut = ({ title, subtitle, rows }) => {
  const total = rows.reduce((a, r) => a + r.value, 0)
  return (
    <Card title={title} subtitle={subtitle}>
      {total === 0 ? <Empty icon={<MdBiotech />}>Sin datos este mes.</Empty> : (
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ width: 150, height: 150, position: 'relative' }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={rows} dataKey="value" nameKey="name" innerRadius={48} outerRadius={70} paddingAngle={2} stroke="none">
                  {rows.map((r, i) => <Cell key={r.name} fill={PALETTE[i % PALETTE.length]} />)}
                </Pie>
                <Tooltip content={<Tip />} />
              </PieChart>
            </ResponsiveContainer>
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', pointerEvents: 'none' }}>
              <strong style={{ fontSize: 22 }}>{total}</strong><span style={{ fontSize: 11, color: 'var(--muted)' }}>total</span>
            </div>
          </div>
          <ul className="list" style={{ flex: 1, minWidth: 160 }}>
            {rows.map((r, i) => (
              <li key={r.name} style={{ padding: '7px 0' }}>
                <i style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[i % PALETTE.length] }} />
                <div className="grow"><span style={{ color: 'var(--ink-2)', fontSize: 13 }}>{r.name}</span></div>
                <strong>{Math.round((r.value / total) * 100)}%</strong>
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  )
}

const AgeGroups = ({ data, colors }) => (
  <Card title="Pacientes por edad" subtitle="Citologías del mes por grupo de edad">
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data.cytology.ageGroups} layout="vertical" margin={{ top: 0, right: 16, left: 4, bottom: 0 }}>
        <CartesianGrid stroke="#EEF0F2" horizontal={false} />
        <XAxis type="number" tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
        <YAxis type="category" dataKey="name" tick={axis} tickLine={false} axisLine={false} width={46} />
        <Tooltip content={<Tip />} cursor={{ fill: '#F3F4F6' }} />
        <Bar dataKey="value" name="Pacientes" fill={colors.secondary} radius={[0, 6, 6, 0]} maxBarSize={18} />
      </BarChart>
    </ResponsiveContainer>
  </Card>
)

// ---------------------------------------------------------------- Últimas citologías
const RecentCyto = ({ data }) => (
  <Card title="Últimas citologías registradas" flush actions={<Link to="/citologias/consultar" className="btn btn-ghost btn-sm">Ver todas <MdArrowForward /></Link>}>
    {data.cytology.recent.length === 0 ? <Empty icon={<MdBiotech />}>Aún no hay citologías.</Empty> : (
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="table">
          <thead><tr><th>Paciente</th><th>Documento</th><th>Lámina</th><th>Fecha</th></tr></thead>
          <tbody>
            {data.cytology.recent.map((r) => (
              <tr key={r.id}>
                <td><strong style={{ color: 'var(--ink)' }}>{r.nombre} {r.apellidos}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.entidad || '—'}</div></td>
                <td>{r.numDocumento}</td>
                <td><span className="badge navy">{r.numLamina}</span></td>
                <td>{formatDate(r.fechaExamen)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </Card>
)

// ---------------------------------------------------------------- Servicios de la IPS (escalable)
// Para habilitar un servicio nuevo: cambiar status a 'active', agregar su ruta y sus widgets.
export const SERVICES = [
  { id: 'cadena-frio', name: 'Cadena de frío', desc: 'Temperatura de neveras y ambiente', icon: MdThermostat, status: 'active', to: '/temperatura' },
  { id: 'citologia', name: 'Citología', desc: 'Toma de muestras cervicouterinas', icon: MdBiotech, status: 'active', to: '/citologias/consultar' },
  { id: 'vacunacion', name: 'Vacunación PAI', desc: 'Dosis aplicadas e inventario', icon: MdVaccines, status: 'soon' },
  { id: 'laboratorio', name: 'Laboratorio clínico', desc: 'Órdenes y resultados', icon: MdScience, status: 'soon' },
  { id: 'consulta', name: 'Consulta externa', desc: 'Agenda y atenciones', icon: MdLocalHospital, status: 'soon' },
  { id: 'farmacia', name: 'Farmacia', desc: 'Dispensación y stock', icon: MdMedication, status: 'soon' },
  { id: 'signos', name: 'Signos vitales', desc: 'Tamizajes y controles', icon: MdMonitorHeart, status: 'soon' }
]

const Services = ({ role }) => (
  <Card title="Servicios de la IPS" subtitle="Módulos activos y próximos servicios a integrar">
    <div className="services">
      {SERVICES.map((s) => {
        const content = (
          <>
            <span className="icon-bubble brand" style={s.status === 'soon' ? { background: 'var(--line-2)', color: 'var(--muted)' } : undefined}><s.icon /></span>
            <strong>{s.name}</strong>
            <span>{s.desc}</span>
            <span className={`badge ${s.status === 'active' ? 'ok' : ''}`} style={{ alignSelf: 'flex-start' }}>{s.status === 'active' ? 'Activo' : 'Próximamente'}</span>
          </>
        )
        return s.status === 'active' && s.to && STAFF.includes(role)
          ? <Link key={s.id} to={s.to} className="service">{content}</Link>
          : <div key={s.id} className={`service${s.status === 'soon' ? ' soon' : ''}`}>{content}</div>
      })}
    </div>
  </Card>
)

const Team = ({ data, role }) => (
  <Card title="Equipo" subtitle={`${data.users.total} usuarios activos`} actions={ADMIN.includes(role) ? <Link to="/usuarios" className="btn btn-ghost btn-sm">Gestionar <MdArrowForward /></Link> : null}>
    <ul className="list">
      {data.users.byRole.map((r) => (
        <li key={r.name}>
          <span className="icon-bubble brand"><MdPeople /></span>
          <div className="grow"><strong>{ROLE_LABELS[r.name]}</strong><span>{ROLE_DESCRIPTIONS[r.name]}</span></div>
          <strong>{r.value}</strong>
        </li>
      ))}
    </ul>
  </Card>
)

// ---------------------------------------------------------------- Hallazgos del cuello
const Findings = ({ data }) => {
  const rows = data.cytology.findings || []
  const max = Math.max(1, ...rows.map((r) => r.value))
  return (
    <Card title="Hallazgos en el cuello" subtitle={`${data.cytology.abnormal} de ${data.cytology.count} muestras con algún hallazgo`}>
      <ul className="list">
        {rows.map((r) => (
          <li key={r.name} style={{ padding: '8px 0' }}>
            <div className="grow"><span style={{ color: 'var(--ink-2)', fontSize: 13 }}>{r.name}</span>
              <div className="progress" style={{ marginTop: 6 }}><span style={{ width: `${(r.value / max) * 100}%`, background: r.value ? 'var(--brand)' : 'transparent' }} /></div>
            </div>
            <strong style={{ minWidth: 20, textAlign: 'right' }}>{r.value}</strong>
          </li>
        ))}
      </ul>
    </Card>
  )
}

// ---------------------------------------------------------------- Equipos e infraestructura
const EQ_STATUS = { operativo: ['Operativos', 'ok'], en_mantenimiento: ['En mantenimiento', 'warn'], fuera_servicio: ['Fuera de servicio', 'bad'], dado_de_baja: ['Dados de baja', ''] }
const Equipment = ({ data, role }) => {
  const eq = data.equipment
  if (!eq) return null
  const staff = STAFF.includes(role)
  return (
    <Card title="Equipos e infraestructura" subtitle={`${eq.total} equipos activos · ${eq.units} unidades · ${eq.dueSoon} con preventivo vencido o en los próximos ${eq.thresholds.maintDays} días`}
      icon={<MdMonitorHeart style={{ color: 'var(--brand)' }} />} actions={staff ? <Link to="/equipos" className="btn btn-ghost btn-sm">Ver equipos <MdArrowForward /></Link> : null}>
      <div className="grid eq-widget-grid">
        <div>
          <div className="grid eq-stat-grid">
            {eq.byStatus.filter((s) => s.name !== 'dado_de_baja').map((s) => (
              <div key={s.name} style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
                <span className={`badge ${EQ_STATUS[s.name][1]}`}><span className="dot" /> {EQ_STATUS[s.name][0]}</span>
                <div style={{ fontSize: 24, fontWeight: 700, marginTop: 6 }}>{s.value}</div>
              </div>
            ))}
            <div style={{ border: '1px solid var(--line)', borderRadius: 10, padding: '10px 12px' }}>
              <span className="badge info">Mantenimientos {new Date().getFullYear()}</span>
              <div style={{ fontSize: 16, fontWeight: 700, marginTop: 8 }}>{formatMoney(eq.yearMaintenance.cost)}</div>
              <span style={{ fontSize: 12, color: 'var(--muted)' }}>{eq.yearMaintenance.preventive} prev. · {eq.yearMaintenance.corrective} corr.</span>
            </div>
          </div>
        </div>
        <div>
          <span className="label">Alertas ({eq.alerts.length})</span>
          {eq.alerts.length === 0 ? <Empty icon={<MdCheckCircle />}>Todos los equipos al día.</Empty> : (
            <ul className="list">
              {eq.alerts.slice(0, 6).map((a, i) => (
                <li key={i} style={{ padding: '9px 0' }}>
                  <span className={`icon-bubble ${a.level === 'bad' ? 'bad' : 'brand'}`} style={a.level === 'warn' ? { background: 'var(--warn-50)', color: 'var(--warn)' } : undefined}><MdWarning /></span>
                  <div className="grow"><strong>{staff ? <Link to={`/equipos/${a.equipmentId}`}>{a.name}</Link> : a.name}</strong><span>{a.code}{a.area ? ` · ${a.area}` : ''} · {a.message}</span></div>
                </li>
              ))}
              {eq.alerts.length > 6 && <li style={{ color: 'var(--muted)', fontSize: 12.5 }}>y {eq.alerts.length - 6} más…</li>}
            </ul>
          )}
        </div>
      </div>
    </Card>
  )
}

// ---------------------------------------------------------------- Registro de widgets
// span: columnas que ocupa (de 3). roles: quién lo ve. Agregar un widget = agregar una entrada.
export const WIDGETS = [
  { id: 'kpis', span: 3, roles: ALL, render: (p) => <KpiRow {...p} /> },
  { id: 'temp-month', span: 2, roles: ALL, render: (p) => <TempMonth {...p} /> },
  { id: 'alerts', span: 1, roles: ALL, render: (p) => <Alerts {...p} /> },
  { id: 'max-bars', span: 2, roles: ALL, render: (p) => <MaxBars {...p} /> },
  { id: 'temp-summary', span: 1, roles: ALL, render: (p) => <TempSummary {...p} /> },
  { id: 'equipment', span: 3, roles: ALL, render: (p) => <Equipment {...p} /> },
  { id: 'cyto-day', span: 2, roles: ALL, render: (p) => <CytoPerDay {...p} /> },
  { id: 'cyto-entidad', span: 1, roles: ALL, render: (p) => <Donut title="Citologías por entidad" subtitle="Distribución del mes" rows={p.data.cytology.byEntidad} /> },
  { id: 'recent', span: 2, roles: STAFF, render: (p) => <RecentCyto {...p} /> },
  { id: 'regimen', span: 1, roles: ALL, render: (p) => <Donut title="Citologías por régimen" subtitle="Distribución del mes" rows={p.data.cytology.byRegimen} /> },
  { id: 'age', span: 1, roles: ALL, render: (p) => <AgeGroups {...p} /> },
  { id: 'findings', span: 1, roles: ALL, render: (p) => <Findings {...p} /> },
  { id: 'team', span: 1, roles: STAFF, render: (p) => <Team {...p} /> },
  { id: 'services', span: 3, roles: ALL, render: (p) => <Services {...p} /> }
]
