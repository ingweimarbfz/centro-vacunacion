import React, { useEffect, useState } from 'react'
import PendingSignatures from '../../components/PendingSignatures'
import { Link, useSearchParams } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts'
import { MdTimer, MdVerifiedUser, MdEmergency, MdErrorOutline, MdWarning, MdCheckCircle, MdBadge, MdPlace, MdAdd, MdArrowForward } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { StatusBadge, fmtDateTime, fmtDate } from './common'

const VolunteerPanel = () => {
  const { user } = useAuth()
  const { settings } = useSettings()
  const [params] = useSearchParams()
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  const id = params.get('id')

  useEffect(() => {
    api.get('/voluntario/panel', { params: id ? { id } : {} }).then(({ data }) => setD(data)).catch((e) => setError(errorMessage(e)))
  }, [id])

  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!d) return <div className="splash"><Spinner /> Cargando panel…</div>

  const v = d.volunteer
  const own = user.role === 'voluntario'
  const pct = Math.min(100, Math.round((d.monthHours / d.minHours) * 100))
  const base = v.volunteerType === 'base'
  const ins = d.insurance
  const insTone = { vigente: 'ok', por_vencer: 'warn', vencido: 'bad', sin_seguro: 'bad' }[ins.status]
  const insLabel = { vigente: 'Al día', por_vencer: `Vence en ${ins.daysLeft} días`, vencido: 'Vencido', sin_seguro: 'Sin seguro registrado' }[ins.status]

  return (
    <>
      <PageHead title={own ? `Hola, ${v.firstName.split(' ')[0]}` : `Panel de ${v.fullName}`} subtitle={`${v.siteName || v.site?.name} · ${base ? 'Voluntario de base' : 'Voluntario de apoyo'} · Carnet ${v.carnet || '—'}`}>
        {own && <Link to="/socorro/eventos" className="btn btn-primary"><MdAdd /> Registrar actividad</Link>}
      </PageHead>
      <div style={{ marginBottom: 18 }}><PendingSignatures /></div>

      {!v.active && (
        <div className="alert bad" style={{ marginBottom: 18 }}><MdWarning /><div><strong>Voluntario inactivo</strong>{v.inactiveReason || 'Inactivo'}. Mientras esté inactivo no puede participar en actividades ni servicios; comunícate con el coordinador de tu sede.</div></div>
      )}
      {v.active && base && d.requirement.shortStreak > 0 && (
        <div className="alert warn" style={{ marginBottom: 18 }}><MdWarning /><div><strong>{d.requirement.message}</strong>Si completas 3 meses seguidos por debajo de {d.minHours} h quedarás inactivo. {d.requirement.monthsToInactive === 1 ? 'Este mes es decisivo.' : ''}</div></div>
      )}
      {ins.status !== 'vigente' && (
        <div className={`alert ${insTone}`} style={{ marginBottom: 18 }}><MdVerifiedUser /><div><strong>Seguro del voluntariado: {insLabel}</strong>Actualízalo con la coordinación de voluntariado.</div></div>
      )}

      <div className="grid grid-kpi" style={{ marginBottom: 18 }}>
        <div className="card kpi">
          <div className="kpi-top"><span className="kpi-label">Horas este mes</span><span className="kpi-icon"><MdTimer /></span></div>
          <div className="kpi-value">{d.monthHours}<small>{base ? `de ${d.minHours} h` : 'h'}</small></div>
          {base && <div className="progress"><span style={{ width: `${pct}%`, background: pct >= 100 ? 'var(--ok)' : undefined }} /></div>}
          <div className="kpi-foot">{base ? (pct >= 100 ? 'Cumpliste el mínimo del mes' : `Te faltan ${Math.max(0, Math.round((d.minHours - d.monthHours) * 10) / 10)} h`) : 'Sin mínimo obligatorio'}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-top"><span className="kpi-label">Estado</span><span className={`kpi-icon ${v.active ? 'ok' : ''}`}>{v.active ? <MdCheckCircle /> : <MdWarning />}</span></div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{v.active ? 'Activo' : 'Inactivo'}</div>
          <div className="kpi-foot">{d.requirement.message}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-top"><span className="kpi-label">Seguro del voluntariado</span><span className={`kpi-icon ${insTone === 'ok' ? 'ok' : insTone === 'warn' ? 'warn' : ''}`}><MdVerifiedUser /></span></div>
          <div className="kpi-value" style={{ fontSize: 20 }}><span className={`badge ${insTone}`} style={{ fontSize: 14 }}>{insLabel}</span></div>
          <div className="kpi-foot">{ins.entity || '—'} · {ins.policy || '—'} · vence {ins.expiry ? fmtDate(`${ins.expiry}T12:00:00-05:00`) : '—'}</div>
        </div>
        <div className="card kpi">
          <div className="kpi-top"><span className="kpi-label">Tipo</span><span className="kpi-icon navy"><MdBadge /></span></div>
          <div className="kpi-value" style={{ fontSize: 22 }}>{base ? 'Base' : 'Apoyo'}</div>
          <div className="kpi-foot">{base ? `Mínimo ${d.minHours} h al mes` : 'Sin horas mínimas'} · {v.agrupacion || '—'}</div>
        </div>
      </div>

      <div className="grid grid-2-1" style={{ alignItems: 'start' }}>
        <Card title="Horas por mes" subtitle={base ? `Línea roja: mínimo de ${d.minHours} h` : 'Últimos 6 meses'}>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={d.months} margin={{ top: 10, right: 8, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="#EEF0F2" vertical={false} />
              <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} unit=" h" />
              <Tooltip formatter={(x) => [`${x} h`, 'Horas']} contentStyle={{ borderRadius: 10, borderColor: '#E5E7EB', fontSize: 12.5 }} cursor={{ fill: '#F3F4F6' }} />
              {base && <ReferenceLine y={d.minHours} stroke="#DC2626" strokeDasharray="5 4" />}
              <Bar dataKey="hours" radius={[6, 6, 0, 0]} maxBarSize={40}>
                {d.months.map((m) => <Cell key={m.key} fill={!base || m.met ? settings.secondaryColor : m.current ? '#F59E0B' : '#DC2626'} fillOpacity={m.counts || !base ? 1 : 0.35} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          {base && <p style={{ margin: '6px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>En rojo, los meses por debajo del mínimo; los meses anteriores a tu ingreso o reactivación salen atenuados y no cuentan.</p>}
        </Card>
        <Card title="Eventos en curso en tu sede" icon={<MdPlace style={{ color: 'var(--brand)' }} />}>
          {d.openEvents.length === 0 ? <Empty icon={<MdEmergency />}>No hay servicios activos.</Empty> : (
            <ul className="list">
              {d.openEvents.map((e) => (
                <li key={e.id}>
                  <span className="icon-bubble brand"><MdEmergency /></span>
                  <div className="grow"><strong><Link to={`/socorro/eventos/${e.id}`}>{e.name}</Link></strong><span>{e.code} · {e.place} · {e.personnelCount} personas</span></div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18 }}>
        <Card title="Mis participaciones" flush actions={<Link to="/socorro/eventos" className="btn btn-ghost btn-sm">Eventos <MdArrowForward /></Link>}>
          {d.participations.length === 0 ? <Empty icon={<MdEmergency />}>Aún no hay participaciones registradas.</Empty> : (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead><tr><th>Evento</th><th>Rol</th><th>Inicio</th><th className="num">Horas</th><th>Estado</th></tr></thead>
                <tbody>{d.participations.map((p) => (
                  <tr key={p.id}>
                    <td><Link to={`/socorro/eventos/${p.id}`} style={{ fontWeight: 600, color: 'var(--ink)' }}>{p.name}</Link><div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.code} · {p.place}</div></td>
                    <td>{p.role === 'Coordinador' ? <span className="badge brand">Coordinador</span> : <span className="badge">Personal</span>}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(p.startedAt)}</td>
                    <td className="num"><strong>{p.hours == null ? '—' : `${p.hours} h`}</strong></td>
                    <td><StatusBadge status={p.status} /></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </>
  )
}

export default VolunteerPanel
