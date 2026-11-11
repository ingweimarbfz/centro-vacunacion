import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import {
  MdAirportShuttle, MdErrorOutline, MdWarning, MdLocalHospital, MdSpeed, MdFactCheck, MdPriorityHigh, MdArrowForward, MdPlace, MdInfo
} from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { StatusPill, km, money } from './common'
import { fmtDateTime } from '../socorro/common'
import { PRIORITIES } from './transfer'

const axis = { fontSize: 11, fill: '#6B7280' }
const currentMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()).slice(0, 7)
const monthLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15))) }
const Kpi = ({ label, value, icon, tone = '', foot }) => (
  <div className="card kpi">
    <div className="kpi-top"><span className="kpi-label">{label}</span><span className={`kpi-icon ${tone}`}>{icon}</span></div>
    <div className="kpi-value">{value}</div>
    {foot && <div className="kpi-foot">{foot}</div>}
  </div>
)
const Breakdown = ({ title, rows, labels }) => (
  <Card title={title}>
    {rows.length === 0 ? <Empty icon={<MdLocalHospital />}>Sin traslados en el mes.</Empty> : (
      <ul className="list">{rows.map((r) => (
        <li key={r.name}><div className="grow"><strong>{labels ? (Array.isArray(labels[r.name]) ? labels[r.name][0] : labels[r.name]) || r.name : r.name}</strong></div><b>{r.value}</b></li>
      ))}</ul>
    )}
  </Card>
)

// IPS · Traslado asistencial: dashboard de las ambulancias TAB y TAM.
const AmbulanceDashboard = () => {
  const { user } = useAuth()
  const driver = user.role === 'conductor'
  const [month, setMonth] = useState(currentMonth())
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    let alive = true
    setD(null)
    api.get('/ambulancias-dashboard', { params: { mes: month } }).then(({ data }) => alive && setD(data)).catch((e) => alive && setError(errorMessage(e)))
    return () => { alive = false }
  }, [month])

  return (
    <>
      <PageHead title={driver ? 'Mi ambulancia' : 'Traslado asistencial'} subtitle={`${driver ? 'Ambulancia asignada' : 'Ambulancias TAB y TAM'} · ${monthLabel(month)}: traslados de pacientes, kilometraje, preoperacional y alertas.`}>
        <input type="month" className="input" style={{ width: 180 }} value={month} max={currentMonth()} onChange={(e) => e.target.value && setMonth(e.target.value)} aria-label="Mes" />
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{error}</span></div>}
      {!d && !error && <div className="splash" style={{ minHeight: 300 }}><Spinner /> Cargando…</div>}
      {d && d.ambulances.length === 0 && (
        <Card><Empty icon={<MdAirportShuttle />}>{driver ? 'No tienes una ambulancia TAB o TAM asignada. El administrador la asigna en la hoja de vida del vehículo.' : 'No hay ambulancias TAB o TAM registradas en la flota.'}</Empty></Card>
      )}
      {d && d.ambulances.length > 0 && (
        <div className="stack">
          <div className="grid grid-kpi">
            <Kpi label={driver ? 'Ambulancia' : 'Ambulancias'} value={d.kpis.ambulances} icon={<MdAirportShuttle />} tone="navy" foot={`TAB ${d.kpis.tab} · TAM ${d.kpis.tam}`} />
            <Kpi label="Disponibles" value={d.kpis.available} icon={<MdAirportShuttle />} tone="ok" foot={`${d.kpis.inService} en servicio · ${d.kpis.outOfService} fuera de servicio`} />
            <Kpi label="Traslados del mes" value={d.kpis.transfers} icon={<MdLocalHospital />} tone="" foot={`${d.kpis.urgent} urgentes`} />
            <Kpi label="Kilómetros del mes" value={km(d.kpis.km)} icon={<MdSpeed />} tone="navy" foot={`Combustible ${money(d.kpis.fuel)}`} />
            <Kpi label="Preoperacional hoy" value={`${d.kpis.preopToday}/${d.kpis.ambulances}`} icon={<MdFactCheck />} tone={d.kpis.preopToday === d.kpis.ambulances ? 'ok' : 'warn'} foot={`${d.ambulances.filter((a) => a.lastPreop?.today && a.lastPreop.result !== 'apto').length} no aptos · ${d.kpis.alerts} alertas de documentos o mantenimiento`} />
          </div>

          <div className="amb-grid">
            {d.ambulances.map((a) => (
              <div key={a.id} className="card amb-card">
                <div className="amb-head">
                  {a.photo ? <img className="amb-photo" src={a.photo} alt={`Móvil ${a.movil}`} /> : <span className="amb-photo"><MdAirportShuttle /></span>}
                  <div style={{ minWidth: 0 }}>
                    <strong style={{ color: 'var(--ink)' }}>Móvil {a.movil} · <span className={`badge ${a.ambulanceType === 'TAM' ? 'brand' : 'navy'}`}>{a.ambulanceType}</span></strong>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{a.plate} · {a.brand} {a.line} · {a.siteName}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>Conductor: {a.assignedDriverName || 'sin asignar'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <StatusPill status={a.status} />
                  {a.openTrip ? <span className="badge warn">En servicio · {a.openTrip.code}</span> : a.status === 'activo' && <span className="badge ok">Disponible</span>}
                  {a.lastPreop && (a.lastPreop.today
                    ? <span className={`badge ${a.lastPreop.result === 'apto' ? 'ok' : 'bad'}`}>Preop. hoy: {a.lastPreop.result === 'apto' ? 'apto' : 'no apto'}</span>
                    : <span className="badge warn">Sin preoperacional hoy</span>)}
                </div>
                <div className="amb-stats">
                  <div><b>{a.month.transfers}</b><span>traslados</span></div>
                  <div><b>{a.month.activities}</b><span>otras act.</span></div>
                  <div><b>{km(a.month.km).replace(' km', '')}</b><span>km mes</span></div>
                  <div><b>{km(a.currentKm).replace(' km', '')}</b><span>km total</span></div>
                </div>
                {a.alerts.length > 0 && <div className="alert warn" style={{ margin: 0, padding: '8px 10px', fontSize: 12.5 }}><MdWarning /><span>{a.alerts.slice(0, 2).map((x) => x.message).join(' · ')}{a.alerts.length > 2 ? '…' : ''}</span></div>}
                <Link to={`/socorro/vehiculos/flota/${a.id}`} className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }}>Hoja de vida <MdArrowForward /></Link>
              </div>
            ))}
          </div>

          <div className="grid grid-2-1">
            <Card title="Traslados por mes" subtitle="Últimos 6 meses · traslados TAB y TAM y otras actividades">
              <div style={{ width: '100%', height: 260 }}>
                <ResponsiveContainer>
                  <BarChart data={d.byMonth} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F3" vertical={false} />
                    <XAxis dataKey="label" tick={axis} /><YAxis tick={axis} allowDecimals={false} />
                    <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} formatter={(k) => (k === 'other' ? 'Otras actividades' : `Traslados ${k}`)} />
                    <Bar dataKey="TAB" stackId="a" fill="#1E3A5F" /><Bar dataKey="TAM" stackId="a" fill="#C8102E" /><Bar dataKey="other" stackId="a" fill="#CBD5E1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Breakdown title="Por prioridad" rows={d.byPriority} labels={PRIORITIES} />
          </div>

          <div className="grid grid-3">
            <Breakdown title="Por EPS" rows={d.byEps} />
            <Breakdown title="Por tipo de traslado" rows={d.byType} labels={{ primario: 'Primario', secundario: 'Secundario' }} />
            <Breakdown title="Destinos más frecuentes" rows={d.byDestination} />
          </div>

          <Card flush title="Últimos traslados" subtitle="Pacientes trasladados en las ambulancias">
            {d.recent.length === 0 ? <Empty icon={<MdLocalHospital />}>Aún no hay traslados registrados.</Empty> : (
              <div className="table-wrap" style={{ marginTop: 12 }}>
                <table className="table">
                  <thead><tr><th>Reporte</th><th>Paciente</th><th>EPS</th><th>Origen → destino</th><th>Prioridad</th>{!driver && <th>Conductor</th>}<th className="num">Km</th></tr></thead>
                  <tbody>{d.recent.map((t) => (
                    <tr key={t.id}>
                      <td><Link to={`/socorro/vehiculos/reportes/${t.id}`} style={{ fontWeight: 600, color: 'var(--ink)' }}>{t.code}</Link><div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(t.startedAt)} · Móvil {t.movil} {t.ambulanceType}</div></td>
                      <td style={{ whiteSpace: 'normal' }}><strong style={{ color: 'var(--ink)' }}>{t.patientName}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{t.document}</div></td>
                      <td>{t.eps}</td>
                      <td style={{ whiteSpace: 'normal', maxWidth: 320, fontSize: 12.5 }}><MdPlace style={{ verticalAlign: -2, color: 'var(--muted)' }} /> {t.origin} → <b>{t.destination}</b></td>
                      <td><span className={`badge ${PRIORITIES[t.priority][1]}`}>{t.priority === 'urgente' && <MdPriorityHigh />}{PRIORITIES[t.priority][0]}</span></td>
                      {!driver && <td>{t.driver}</td>}
                      <td className="num">{t.kmDiff == null ? (t.status === 'abierto' ? <span className="badge warn">En curso</span> : '—') : km(t.kmDiff)}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Card>
          <p style={{ color: 'var(--muted)', fontSize: 12.5, margin: 0 }}><MdInfo style={{ verticalAlign: -2 }} /> Los traslados se registran en Operaciones Generales → Flota vehicular → Reportes diarios: al elegir una ambulancia TAB o TAM y "Nueva actividad", marca "Es un traslado asistencial".</p>
        </div>
      )}
    </>
  )
}

export default AmbulanceDashboard
