import React, { useEffect, useState } from 'react'
import MonthPicker, { shortMonth } from '../../components/MonthPicker'
import ExpiringSupplies from '../../components/ExpiringSupplies'
import PendingSignatures from '../../components/PendingSignatures'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import {
  MdAdd, MdWarning, MdEmergency, MdTimer, MdPeople, MdInventory2, MdErrorOutline, MdArrowForward, MdPlace, MdEventAvailable
} from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { can } from '../../utils/permissions'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { StatusBadge, fmtDateTime, duration, qty, CATEGORY_LABELS } from './common'
import SitesSummary from '../../components/SitesSummary'
import { getSiteFilter } from '../../api/client'

const axis = { fontSize: 11, fill: '#6B7280' }
const currentMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()).slice(0, 7)
const monthLabel = (ym) => shortMonth(ym)

const Kpi = ({ label, value, unit, icon, tone = '', foot }) => (
  <div className="card kpi">
    <div className="kpi-top"><span className="kpi-label">{label}</span><span className={`kpi-icon ${tone}`}>{icon}</span></div>
    <div className="kpi-value">{value}{unit && <small>{unit}</small>}</div>
    {foot && <div className="kpi-foot">{foot}</div>}
  </div>
)

const SocorroDashboard = () => {
  const { user } = useAuth()
  const { settings } = useSettings()
  const [month, setMonth] = useState(currentMonth)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const staff = can.registerData(user.role)

  useEffect(() => {
    let alive = true
    setError('')
    api.get('/socorro/dashboard', { params: { mes: month } })
      .then(({ data: d }) => alive && setData(d))
      .catch((e) => alive && setError(errorMessage(e)))
    return () => { alive = false }
  }, [month])

  const EventLink = ({ ev, children }) => staff ? <Link to={`/socorro/${ev.area === 'educacion' ? 'educacion' : 'eventos'}/${ev.id}`}>{children}</Link> : children

  return (
    <>
      <PageHead title="Operaciones Generales" subtitle={`Resumen de ${monthLabel(month)}: Socorro, Educación, personal e inventario de la bodega.`}>
        <MonthPicker value={month} max={currentMonth()} onChange={setMonth} />
        {staff && <Link to="/socorro/educacion" className="btn btn-outline"><MdAdd /> Actividad de educación</Link>}
        {staff && <Link to="/socorro/eventos" className="btn btn-primary"><MdAdd /> Nuevo evento</Link>}
      </PageHead>
      <div style={{ marginBottom: 18 }}><PendingSignatures /></div>
      <div style={{ marginBottom: 18 }}><ExpiringSupplies /></div>

      {error && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{error}</span></div>}
      {!data && !error && <div className="splash" style={{ minHeight: 300 }}><Spinner /> Cargando…</div>}

      {data && (
        <div className="stack">
          {data.lowStock.length > 0 && (
            <div className="alert bad">
              <MdWarning />
              <div>
                <strong>{data.lowStock.length} elemento{data.lowStock.length === 1 ? '' : 's'} por reponer en el inventario</strong>
                {data.lowStock.slice(0, 4).map((i) => `${i.name} (${qty(i.stock)} de mín. ${qty(i.minStock)})`).join(' · ')}{data.lowStock.length > 4 ? '…' : ''}
              </div>
              {staff && <Link to="/socorro/inventario" className="btn btn-outline btn-sm alert-actions">Ir al inventario</Link>}
            </div>
          )}

          {staff && data.incompleteVolunteers?.length > 0 && (
            <div className="alert warn">
              <MdWarning />
              <div><strong>{data.incompleteVolunteers.length} voluntario{data.incompleteVolunteers.length === 1 ? '' : 's'} con datos por completar</strong>
                {data.incompleteVolunteers.slice(0, 3).map((v) => `${v.fullName}${v.autoCreated ? ' (creado automáticamente)' : ''}: falta ${v.missing.join(', ')}`).join(' · ')}{data.incompleteVolunteers.length > 3 ? '…' : ''}</div>
              <Link to="/socorro/personas?incompletos=1" className="btn btn-outline btn-sm alert-actions">Completar datos</Link>
            </div>
          )}
          <div className="grid grid-kpi">
            <Kpi label="Eventos en curso" value={data.kpis.openEvents} icon={<MdEmergency />} tone={data.kpis.openEvents ? 'warn' : 'ok'} foot={data.kpis.openEvents ? 'Servicios activos ahora' : 'Ningún servicio activo'} />
            <Kpi label="Actividades del mes" value={data.kpis.monthEvents} icon={<MdEventAvailable />} tone="navy" foot={`Socorro ${data.kpis.monthSocorro ?? 0} · Educación ${data.kpis.monthEducacion ?? 0}`} />
            <Kpi label="Horas de servicio" value={data.kpis.serviceHours} unit="h" icon={<MdTimer />} tone="ok" foot="Eventos finalizados del mes" />
            <Kpi label="Voluntarios en servicio" value={data.kpis.volunteersInMonth} icon={<MdPeople />} tone="navy" foot={`De ${data.kpis.activeVolunteers} personas activas registradas`} />
            <Kpi label="Stock bajo" value={data.kpis.lowStock} icon={<MdInventory2 />} tone={data.kpis.lowStock ? '' : 'ok'} foot={`De ${data.kpis.totalItems} elementos en inventario`} />
          </div>

          {user.role === 'administrador' && !getSiteFilter() && <SitesSummary />}
          <div className="dash-grid">
            <div className="span-2">
              <Card title="Eventos en curso" subtitle="Servicios activos en este momento" icon={<span className="dot pulse" style={{ color: 'var(--warn)' }} />}>
                {data.openEvents.length === 0 ? <Empty icon={<MdEmergency />}>No hay servicios activos.</Empty> : (
                  <ul className="list">
                    {data.openEvents.map((e) => (
                      <li key={e.id}>
                        <span className="icon-bubble brand"><MdEmergency /></span>
                        <div className="grow">
                          <strong><EventLink ev={e}>{e.name}</EventLink></strong>
                          <span><MdPlace style={{ verticalAlign: -2 }} /> {e.place} · Coord. {e.coordinator} · {e.personnelCount} persona{e.personnelCount === 1 ? "" : "s"}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}><span className="badge warn">{duration(e.startedAt)}</span><div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>desde {fmtDateTime(e.startedAt).split(', ')[1] || ''}</div></div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>
            <div className="span-1">
              <Card title="Alertas de reposición" subtitle="Elementos en o por debajo del mínimo" actions={data.lowStock.length ? <span className="badge bad">{data.lowStock.length}</span> : <span className="badge ok">Todo OK</span>}>
                {data.lowStock.length === 0 ? <Empty icon={<MdInventory2 />}>El inventario está al día.</Empty> : (
                  <ul className="list">
                    {data.lowStock.slice(0, 7).map((i) => (
                      <li key={i.id}>
                        <span className="icon-bubble bad"><MdWarning /></span>
                        <div className="grow"><strong>{i.name}</strong><span>{CATEGORY_LABELS[i.category]} · mínimo {qty(i.minStock)} {i.unit}</span></div>
                        <strong style={{ color: 'var(--bad)' }}>{qty(i.stock)}</strong>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="span-2">
              <Card title="Eventos por mes" subtitle="Últimos 6 meses">
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={data.eventsByMonth} margin={{ top: 10, right: 8, left: -24, bottom: 0 }}>
                    <CartesianGrid stroke="#EEF0F2" vertical={false} />
                    <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
                    <YAxis tick={axis} tickLine={false} axisLine={false} allowDecimals={false} />
                    <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: 10, borderColor: '#E5E7EB', fontSize: 12.5 }} formatter={(v) => [v, 'Eventos']} />
                    <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={42}>
                      {data.eventsByMonth.map((m) => <Cell key={m.key} fill={m.key === month ? settings.primaryColor : settings.secondaryColor} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
            <div className="span-1">
              <Card title="Insumos más consumidos" subtitle="En el mes">
                {data.topConsumption.length === 0 ? <Empty icon={<MdInventory2 />}>Sin consumos este mes.</Empty> : (
                  <ul className="list">
                    {data.topConsumption.map((c) => {
                      const max = data.topConsumption[0].value
                      return (
                        <li key={c.name} style={{ padding: '8px 0' }}>
                          <div className="grow"><span style={{ color: 'var(--ink-2)', fontSize: 13 }}>{c.name}</span>
                            <div className="progress" style={{ marginTop: 6 }}><span style={{ width: `${(c.value / max) * 100}%` }} /></div></div>
                          <strong style={{ minWidth: 54, textAlign: 'right' }}>{qty(c.value)} <span style={{ fontWeight: 400, fontSize: 11, color: 'var(--muted)' }}>{c.unit}</span></strong>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </Card>
            </div>

            <div className="span-2">
              <Card title="Últimos eventos y actividades" flush actions={staff ? <Link to="/socorro/eventos" className="btn btn-ghost btn-sm">Ver todos <MdArrowForward /></Link> : null}>
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="table">
                    <thead><tr><th>Evento</th><th>Inicio</th><th>Duración</th><th className="num">Personal</th><th>Estado</th></tr></thead>
                    <tbody>
                      {data.recentEvents.map((e) => (
                        <tr key={e.id}>
                          <td><strong style={{ color: 'var(--ink)' }}><EventLink ev={e}>{e.name}</EventLink></strong><div style={{ fontSize: 12, color: 'var(--muted)' }}><span className={`badge ${e.area === 'educacion' ? 'info' : 'brand'}`} style={{ fontSize: 10.5, padding: '0 6px' }}>{e.area === 'educacion' ? 'Educación' : 'Socorro'}</span> {e.code} · {e.place}</div></td>
                          <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(e.startedAt)}</td>
                          <td>{duration(e.startedAt, e.endedAt)}</td>
                          <td className="num">{e.personnelCount}</td>
                          <td><StatusBadge status={e.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
            <div className="span-1">
              <Card title="Bodega por categoría" actions={staff ? <Link to="/socorro/inventario" className="btn btn-ghost btn-sm">Inventario <MdArrowForward /></Link> : null}>
                <ul className="list">
                  {data.byCategory.map((c) => (
                    <li key={c.name}>
                      <span className="icon-bubble brand"><MdInventory2 /></span>
                      <div className="grow"><strong>{CATEGORY_LABELS[c.name]}</strong><span>{c.items} elementos</span></div>
                      {c.low ? <span className="badge bad">{c.low} bajo</span> : <span className="badge ok">OK</span>}
                    </li>
                  ))}
                </ul>
              </Card>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default SocorroDashboard
