import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdGroups, MdHowToReg, MdClass, MdMenuBook, MdErrorOutline, MdWarning, MdAdd, MdAttachMoney, MdArrowForward, MdAccountBalanceWallet, MdGavel, MdPayments } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { canSee, ROUTE_ROLES } from '../../utils/permissions'
import { PageHead, Card, Spinner, Empty } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { StatusBadge } from './common'
import EduCharts from './EduCharts'

const Kpi = ({ icon, tone = '', label, value, foot, to }) => (
  <div className="card kpi">
    <div className="kpi-top"><span className="kpi-label">{label}</span><span className={`kpi-icon ${tone}`}>{icon}</span></div>
    <div className="kpi-value">{value}</div>
    {foot && <div className="kpi-foot">{to ? <Link to={to}>{foot}</Link> : foot}</div>}
  </div>
)

// Dashboard del director o encargado del instituto: información general de la institución ETDH.
const EduDashboard = () => {
  const { user } = useAuth()
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.get('/academico/resumen').then(({ data }) => setD(data)).catch((e) => setError(errorMessage(e))) }, [])
  const showValue = d?.enrollments?.value != null
  const canEnroll = canSee(user, { roles: ROUTE_ROLES.STAFF, module: 'edu_estudiantes' })

  return (
    <>
      <PageHead title="Dashboard del instituto" subtitle="Institución de Educación para el Trabajo y el Desarrollo Humano · información general">
        {canEnroll && <Link className="btn btn-primary" to="/educacion/estudiantes?nuevo=1"><MdAdd /> Nuevo estudiante</Link>}
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      {!d ? (!error && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>) : (
        <div className="stack">
          <div className="grid grid-kpi">
            <Kpi icon={<MdHowToReg />} label="Matrículas activas" value={d.enrollments.active} foot={d.enrollments.preinscritos ? `${d.enrollments.preinscritos} preinscritos` : 'Ver matrículas'} to="/educacion/matriculas" />
            <Kpi icon={<MdGroups />} tone="navy" label="Estudiantes activos" value={d.students.active} foot={`${d.students.graduated} graduados · ${d.students.total} en total`} />
            <Kpi icon={<MdMenuBook />} tone="ok" label="Programas activos" value={d.programs.active} foot={`${d.programs.technical} carreras técnicas`} to="/educacion/programas" />
            <Kpi icon={<MdClass />} tone="warn" label="Grupos en curso" value={d.groups.running} foot={`${d.groups.planned} planeados`} to="/educacion/grupos" />
            {d.enrollments.value != null && <Kpi icon={<MdAttachMoney />} label="Valor matriculado" value={formatMoney(d.enrollments.value)} foot="Matrículas activas, con descuentos y convenios" />}
          </div>
          {d.finance && (
            <div className="grid grid-kpi">
              <Kpi icon={<MdAccountBalanceWallet />} label="Cartera por cobrar" value={formatMoney(d.finance.balance)} foot="Ver cartera" to="/educacion/cartera" />
              <Kpi icon={<MdWarning />} tone="warn" label="Cartera vencida" value={formatMoney(d.finance.overdue)} foot={`${d.finance.inArrears} matrículas en mora`} to="/educacion/cartera" />
              <Kpi icon={<MdPayments />} tone="ok" label="Recaudo del mes" value={formatMoney(d.finance.collectedMonth)} />
              <Kpi icon={<MdGavel />} tone="navy" label="Contratos sin firmar" value={d.contractsPending} foot="Carreras técnicas con contrato obligatorio" />
            </div>
          )}
          {d.attendance && (
            <div className="grid grid-kpi">
              <Kpi icon={<MdHowToReg />} tone="ok" label="Asistencia promedio" value={d.attendance.avgPct != null ? `${d.attendance.avgPct} %` : '—'} foot={`Mínimo exigido: ${d.attendance.minPct} %`} />
              <Kpi icon={<MdWarning />} tone="warn" label="Estudiantes bajo el mínimo" value={d.attendance.atRisk} foot="En grupos en curso" />
              <Kpi icon={<MdGavel />} tone="navy" label="Actas por firmar" value={d.attendance.actasPendientes} foot="Ver actas" to="/educacion/actas" />
            </div>
          )}

          <EduCharts charts={d.charts} />

          <div className="grid grid-2-1">
            <Card title="Grupos en curso y planeados" flush icon={<MdClass style={{ color: 'var(--brand)' }} />}
              actions={<Link className="btn btn-ghost btn-sm" to="/educacion/grupos">Ver todos <MdArrowForward /></Link>}>
              {d.runningGroups.length === 0 ? <Empty icon={<MdClass />}>Aún no hay grupos. Crea los programas y luego sus grupos.</Empty> : (
                <div className="table-wrap">
                  <table className="table">
                    <thead><tr><th>Grupo</th><th>Programa</th><th>Periodo</th><th>Fechas</th><th className="num">Matriculados</th><th>Estado</th></tr></thead>
                    <tbody>{d.runningGroups.map((g) => (
                      <tr key={g.id}>
                        <td><b>{g.code}</b></td>
                        <td style={{ whiteSpace: 'normal' }}>{g.program}</td>
                        <td>{g.periodLabel} {g.currentPeriod}</td>
                        <td>{formatDate(g.startDate)} – {formatDate(g.endDate)}</td>
                        <td className="num">{g.enrolled}{g.capacity ? ` / ${g.capacity}` : ''}</td>
                        <td><StatusBadge status={g.status} /></td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </Card>
            <div className="stack">
              <Card title="Alertas de registro de programas" subtitle="Registro ante la Secretaría de Educación (vencido, por vencer en 6 meses o sin registrar)" icon={<MdWarning style={{ color: 'var(--warn)' }} />}>
                {d.registrationAlerts.length === 0 ? <div className="alert ok" style={{ margin: 0 }}><span>Todos los registros de programas están vigentes.</span></div> : (
                  <div className="stack" style={{ gap: 10 }}>
                    {d.registrationAlerts.map((p) => (
                      <Link key={p.id} to={`/educacion/programas/${p.id}`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', color: 'inherit', textDecoration: 'none' }}>
                        <span style={{ fontSize: 13.5 }}><b>{p.name}</b><br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>{p.expires ? `Vence ${formatDate(p.expires)}` : 'Sin número ni vencimiento de registro'}</span></span>
                        <StatusBadge status={p.state} label={p.state === 'por_vencer' ? `${p.days} días` : undefined} />
                      </Link>
                    ))}
                  </div>
                )}
              </Card>
              <Card title="Matrícula por programa" icon={<MdMenuBook style={{ color: 'var(--brand)' }} />}>
                {d.byProgram.length === 0 ? <Empty icon={<MdHowToReg />}>Sin matrículas activas.</Empty> : (
                  <div className="stack" style={{ gap: 10 }}>
                    {d.byProgram.map((p) => {
                      const max = d.byProgram[0].enrolled || 1
                      return (
                        <div key={p.id}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}><span>{p.name}</span><b>{p.enrolled}</b></div>
                          <div style={{ height: 8, background: 'var(--line-2)', borderRadius: 99, marginTop: 5 }}><div style={{ width: `${Math.max(4, (p.enrolled / max) * 100)}%`, height: 8, background: 'var(--brand)', borderRadius: 99 }} /></div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </Card>
            </div>
          </div>

          <Card title="Últimas matrículas" flush icon={<MdHowToReg style={{ color: 'var(--brand)' }} />}>
            {d.recent.length === 0 ? <Empty icon={<MdHowToReg />}>Aún no hay matrículas.</Empty> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Fecha</th><th>Estudiante</th><th>Programa</th>{showValue && <th className="num">Valor</th>}<th>Estado</th></tr></thead>
                  <tbody>{d.recent.map((e) => (
                    <tr key={e.id}><td>{formatDate(e.enrolledAt)}</td><td>{e.student}</td><td style={{ whiteSpace: 'normal' }}>{e.program}</td>{showValue && <td className="num">{formatMoney(e.totalValue)}</td>}<td><StatusBadge status={e.status} /></td></tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
    </>
  )
}

export default EduDashboard
