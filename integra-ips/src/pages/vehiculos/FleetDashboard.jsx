import React, { useEffect, useState } from 'react'
import MonthPicker, { shortMonth } from '../../components/MonthPicker'
import PendingSignatures from '../../components/PendingSignatures'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import {
  MdAdd, MdWarning, MdDirectionsCar, MdSpeed, MdLocalGasStation, MdBuild, MdErrorOutline, MdArrowForward, MdAssignment, MdFlag, MdVerifiedUser, MdFactCheck
} from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { VehicleIcon, StatusPill, DocBadge, km, money } from './common'
import { fmtDateTime, duration } from '../socorro/common'

const axis = { fontSize: 11, fill: '#6B7280' }
const currentMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()).slice(0, 7)
const monthLabel = (ym) => shortMonth(ym)
const shortMoney = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)}M` : n >= 1e3 ? `$${Math.round(n / 1e3)}k` : `$${n}`)

const Kpi = ({ label, value, icon, tone = '', foot }) => (
  <div className="card kpi">
    <div className="kpi-top"><span className="kpi-label">{label}</span><span className={`kpi-icon ${tone}`}>{icon}</span></div>
    <div className="kpi-value" style={{ fontSize: 24 }}>{value}</div>
    {foot && <div className="kpi-foot">{foot}</div>}
  </div>
)

const FleetDashboard = () => {
  const { user } = useAuth()
  const { settings } = useSettings()
  const [month, setMonth] = useState(currentMonth)
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  const [pre, setPre] = useState(null)
  const driver = user.role === 'conductor'
  const fleetLinks = user.role !== 'invitado'

  useEffect(() => {
    let alive = true
    setError('')
    api.get('/vehiculos-dashboard', { params: { mes: month } }).then(({ data }) => alive && setD(data)).catch((e) => alive && setError(errorMessage(e)))
    api.get('/vehiculos-preoperacional-resumen').then(({ data }) => alive && setPre(data)).catch(() => {})
    return () => { alive = false }
  }, [month])

  const VLink = ({ id, children }) => (fleetLinks ? <Link to={`/socorro/vehiculos/flota/${id}`}>{children}</Link> : children)

  return (
    <>
      <PageHead title={driver ? `Hola, ${user.name.split(' ')[0]}` : 'Flota vehicular'} subtitle={`Resumen de ${monthLabel(month)}: kilometraje, combustible, mantenimiento y alertas.`}>
        <MonthPicker value={month} max={currentMonth()} onChange={setMonth} />
        {driver && <Link to="/socorro/vehiculos/reportes" className="btn btn-primary"><MdAdd /> Reporte diario</Link>}
      </PageHead>
      <div style={{ marginBottom: 18 }}><PendingSignatures /></div>

      {error && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{error}</span></div>}
      {!d && !error && <div className="splash" style={{ minHeight: 300 }}><Spinner /> Cargando…</div>}

      {d && (
        <div className="stack">
          {d.mine?.open?.length > 0 && driver && d.mine.open.map((t) => (
            <div key={t.id} className="alert warn">
              <span className="dot pulse" style={{ marginTop: 6 }} />
              <div><strong>Tienes una actividad abierta · Móvil {t.movil}</strong>{t.activity} · desde {fmtDateTime(t.startedAt)} ({duration(t.startedAt)})</div>
              <Link to={`/socorro/vehiculos/reportes/${t.id}`} className="btn btn-primary btn-sm alert-actions"><MdFlag /> Cerrar</Link>
            </div>
          ))}
          {d.alerts.length > 0 && (
            <div className="alert bad">
              <MdWarning />
              <div><strong>{d.alerts.length} alerta{d.alerts.length === 1 ? '' : 's'} de SOAT o mantenimiento</strong>
                {d.alerts.slice(0, 3).map((a) => `Móvil ${a.movil}: ${a.message}`).join(' · ')}{d.alerts.length > 3 ? '…' : ''}</div>
            </div>
          )}

          <div className="grid grid-kpi">
            {driver ? (
              <>
                <Kpi label="Mis reportes del mes" value={d.mine.trips} icon={<MdAssignment />} />
                <Kpi label="Mis km recorridos" value={km(d.mine.km)} icon={<MdSpeed />} tone="navy" />
                <Kpi label="Mis tanqueos" value={money(d.mine.fuel)} icon={<MdLocalGasStation />} tone="warn" />
              </>
            ) : (
              <>
                <Kpi label="Vehículos" value={d.kpis.vehicles} icon={<MdDirectionsCar />} tone="navy" foot={`${d.kpis.active} activos · ${d.kpis.inService} en servicio ahora`} />
                <Kpi label="Km recorridos" value={km(d.kpis.monthKm)} icon={<MdSpeed />} foot={`${d.kpis.monthTrips} reportes en el mes`} />
                <Kpi label="Combustible" value={money(d.kpis.monthFuel)} icon={<MdLocalGasStation />} tone="warn" foot="Tanqueos del mes" />
                <Kpi label="Mantenimiento" value={money(d.kpis.monthMaintenance)} icon={<MdBuild />} tone="ok" foot="Mano de obra + repuestos" />
              </>
            )}
            <Kpi label="Alertas" value={d.kpis.alerts} icon={<MdWarning />} tone={d.kpis.alerts ? '' : 'ok'} foot={`SOAT ≤ ${d.thresholds.docDays} días · preventivo ≤ ${d.thresholds.maintDays} días o ${d.thresholds.maintKm} km`} />
          </div>

          {pre && pre.noAptoToday > 0 && (
            <div className="alert bad"><MdFactCheck /><div><strong>{pre.noAptoToday} vehículo{pre.noAptoToday === 1 ? '' : 's'} NO APTO{pre.noAptoToday === 1 ? '' : 'S'} en el preoperacional de hoy</strong>
              {pre.vehicles.filter((v) => v.today && v.last.result === 'no_apto').map((v) => `Móvil ${v.movil} (${v.last.anomalies} anomalía${v.last.anomalies === 1 ? '' : 's'})`).join(' · ')}</div>
              <Link to="/socorro/vehiculos/preoperacional?resultado=no_apto" className="btn btn-outline btn-sm alert-actions">Revisar</Link></div>
          )}
          {pre && (
            <Card title="Preoperacional de hoy" subtitle={`${pre.doneToday} de ${pre.vehicles.length} vehículos revisados · ${pre.monthCount} en el mes`} icon={<MdFactCheck style={{ color: 'var(--brand)' }} />}
              actions={<Link to={driver ? '/socorro/vehiculos/preoperacional/nuevo' : '/socorro/vehiculos/preoperacional'} className="btn btn-ghost btn-sm">{driver ? 'Hacer preoperacional' : 'Ver todos'} <MdArrowForward /></Link>}>
              <div className="po-grid">
                {pre.vehicles.map((v) => (
                  <div key={v.vehicleId} className={`po-tile ${!v.today ? 'pending' : v.last.result === 'apto' ? 'ok' : 'bad'}`}>
                    <strong>Móvil {v.movil}</strong><span style={{ fontFamily: 'monospace' }}>{v.plate}</span>
                    {!v.today ? <span className="badge warn">Pendiente</span> : v.last.result === 'apto' ? <span className="badge ok">Apto</span> : <span className="badge bad">No apto · {v.last.anomalies}</span>}
                    {v.today && v.last.driver && <small>{v.last.driver}</small>}
                  </div>
                ))}
              </div>
            </Card>
          )}
          <div className="dash-grid">
            <div className="span-2">
              <Card title="Estado de la flota" flush>
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="table">
                    <thead><tr><th>Móvil</th><th>Vehículo</th><th className="num">Km actual</th><th>SOAT</th><th>Estado</th><th>Ahora</th></tr></thead>
                    <tbody>
                      {d.fleet.map((v) => (
                        <tr key={v.id}>
                          <td><VLink id={v.id}><div className="cell-user"><span className="icon-bubble brand"><VehicleIcon type={v.vehicleType} /></span><div><strong>Móvil {v.movil}</strong><span style={{ fontFamily: 'monospace' }}>{v.plate}</span></div></div></VLink></td>
                          <td>{v.brand} {v.line}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{v.vehicleType}</div></td>
                          <td className="num"><strong>{km(v.currentKm)}</strong></td>
                          <td><DocBadge doc={v.soat} /></td>
                          <td><StatusPill status={v.status} />{v.alerts > 0 && <span className="badge bad" style={{ marginLeft: 4 }}><MdWarning /> {v.alerts}</span>}</td>
                          <td>{v.openTrip ? <span className="badge info"><span className="dot pulse" /> {v.openTrip.driver}</span> : <span style={{ color: 'var(--muted)' }}>Disponible</span>}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
            <div className="span-1">
              <Card title="Alertas" subtitle="SOAT y mantenimiento preventivo" actions={d.alerts.length ? <span className="badge bad">{d.alerts.length}</span> : <span className="badge ok">Todo al día</span>}>
                {d.alerts.length === 0 ? <Empty icon={<MdVerifiedUser />}>Sin vencimientos próximos.</Empty> : (
                  <ul className="list">
                    {d.alerts.map((a, i) => (
                      <li key={i}>
                        <span className={`icon-bubble ${a.level === 'bad' ? 'bad' : 'brand'}`} style={a.level === 'warn' ? { background: 'var(--warn-50)', color: 'var(--warn)' } : undefined}>{a.kind === 'mantenimiento' ? <MdBuild /> : <MdVerifiedUser />}</span>
                        <div className="grow"><strong>Móvil {a.movil} · {a.plate}</strong><span>{a.message}</span></div>
                      </li>
                    ))}
                  </ul>
                )}
              </Card>
            </div>

            <div className="span-2">
              <Card title="Kilometraje y combustible" subtitle="Últimos 6 meses">
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={d.byMonth} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
                    <CartesianGrid stroke="#EEF0F2" vertical={false} />
                    <XAxis dataKey="label" tick={axis} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="km" tick={axis} tickLine={false} axisLine={false} unit=" km" width={62} />
                    <YAxis yAxisId="money" orientation="right" tick={axis} tickLine={false} axisLine={false} tickFormatter={shortMoney} width={52} />
                    <Tooltip contentStyle={{ borderRadius: 10, borderColor: '#E5E7EB', fontSize: 12.5 }} formatter={(v, n) => (n === 'Km' ? [km(v), n] : [money(v), n])} cursor={{ fill: '#F3F4F6' }} />
                    <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                    <Bar yAxisId="km" dataKey="km" name="Km" fill={settings.secondaryColor} radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Bar yAxisId="money" dataKey="fuel" name="Combustible" fill={settings.primaryColor} radius={[6, 6, 0, 0]} maxBarSize={28} />
                    <Bar yAxisId="money" dataKey="maintenance" name="Mantenimiento" fill="#F59E0B" radius={[6, 6, 0, 0]} maxBarSize={28} />
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
            <div className="span-1">
              <Card title="Km por móvil" subtitle="En el mes">
                <ul className="list">
                  {d.kmByVehicle.map((v) => {
                    const max = Math.max(1, ...d.kmByVehicle.map((x) => x.km))
                    return (
                      <li key={v.name} style={{ padding: '9px 0' }}>
                        <div className="grow"><span style={{ color: 'var(--ink-2)', fontSize: 13 }}>{v.name} · {v.plate}</span>
                          <div className="progress" style={{ marginTop: 6 }}><span style={{ width: `${(v.km / max) * 100}%` }} /></div></div>
                        <strong style={{ minWidth: 70, textAlign: 'right' }}>{km(v.km)}<div style={{ fontWeight: 400, fontSize: 11, color: 'var(--muted)' }}>{v.trips} reportes</div></strong>
                      </li>
                    )
                  })}
                </ul>
              </Card>
            </div>

            {d.recentTrips.length > 0 && (
              <div className="span-3">
                <Card title={driver ? 'Mis últimos reportes' : 'Últimos reportes diarios'} flush actions={<Link to="/socorro/vehiculos/reportes" className="btn btn-ghost btn-sm">Ver todos <MdArrowForward /></Link>}>
                  <div className="table-wrap" style={{ marginTop: 12 }}>
                    <table className="table">
                      <thead><tr><th>Reporte</th><th>Móvil</th><th>Actividad</th>{!driver && <th>Conductor</th>}<th className="num">Recorrido</th><th className="num">Combustible</th><th>Estado</th></tr></thead>
                      <tbody>
                        {d.recentTrips.map((t) => (
                          <tr key={t.id}>
                            <td><Link to={`/socorro/vehiculos/reportes/${t.id}`} style={{ fontWeight: 600 }}>{t.code}</Link><div style={{ fontSize: 12, color: 'var(--muted)' }}>{fmtDateTime(t.startedAt)}</div></td>
                            <td><span className="badge navy">Móvil {t.movil}</span></td>
                            <td style={{ whiteSpace: 'normal' }}>{t.activity}</td>
                            {!driver && <td>{t.driver}</td>}
                            <td className="num"><strong>{t.kmDiff == null ? '—' : km(t.kmDiff)}</strong></td>
                            <td className="num">{t.fuelValue ? money(t.fuelValue) : '—'}</td>
                            <td>{t.status === 'abierto' ? <span className="badge warn"><span className="dot pulse" /> Abierto</span> : <span className="badge ok">Cerrado</span>}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default FleetDashboard
