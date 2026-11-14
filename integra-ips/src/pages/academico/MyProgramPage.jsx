import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdErrorOutline, MdSchool, MdMenuBook, MdDraw, MdGavel, MdAccountBalanceWallet, MdSchedule, MdOpenInNew } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { SUBJECT_KINDS, StatusBadge, hoursLabel } from './common'
import { AccountView } from './EnrollmentAccount'
import { SignModal, ATT } from './AttendancePage'
import { MdAssignment, MdGrading, MdEvent } from 'react-icons/md'
import { fmtScore } from './CoursePage'
import { StudentCharts } from './PanelCharts'
import { MdWorkspacePremium, MdPrint } from 'react-icons/md'
import { useToast } from '../../components/ui'

// Portal del estudiante (fase 1): su programa, su pensum y sus matrículas.
// Horario, asistencia, notas, talleres y certificados llegan en las siguientes fases.
const MyProgramPage = () => {
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  const [classes, setClasses] = useState([])
  const [att, setAtt] = useState(null)
  const [aula, setAula] = useState(null)
  useEffect(() => { api.get('/academico/mi-aula', { noCache: true }).then(({ data }) => setAula(data)).catch(() => {}) }, [])
  const [certs, setCerts] = useState([])
  useEffect(() => { api.get('/academico/mis-certificados').then(({ data }) => setCerts(data.filter((c) => !c.voided))).catch(() => {}) }, [])
  const [signing, setSigning] = useState(null)
  const [toast, toastNode] = useToast()
  const loadAtt = () => api.get('/academico/mi-asistencia', { noCache: true }).then(({ data }) => setAtt(data)).catch(() => {})
  useEffect(() => { api.get('/academico/mis-clases').then(({ data }) => setClasses(data)).catch(() => {}); loadAtt() }, [])
  useEffect(() => { api.get('/academico/mi-programa').then(({ data }) => setD(data)).catch((e) => setError(errorMessage(e))) }, [])
  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!d) return <div className="splash"><Spinner /></div>
  if (!d.student) return <Card><Empty icon={<MdSchool />}>Tu usuario aún no está vinculado a una ficha de estudiante. Comunícate con la secretaría académica.</Empty></Card>
  const active = d.enrollments.filter((e) => ['matriculado', 'preinscrito', 'aplazado'].includes(e.status))
  const others = d.enrollments.filter((e) => !active.includes(e))

  return (
    <>
      <PageHead title={`Hola, ${d.student.firstName}`} subtitle="Tu resumen, tu programa, tu pensum, tus pagos y tus certificados" />
      {d.enrollments.length === 0 && <Card><Empty icon={<MdSchool />}>Aún no tienes matrículas registradas.</Empty></Card>}
      <div className="stack">
        {certs.length > 0 && (
          <Card title="Mis certificados" icon={<MdWorkspacePremium style={{ color: 'var(--brand)' }} />}>
            <div className="stack" style={{ gap: 8 }}>{certs.map((c) => (
              <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap', fontSize: 13.5 }}>
                <span><b>{c.title}</b> · {c.snapshot?.program?.name} <span className="hint">{c.numberLabel} · {formatDate(c.issuedAt)}</span></span>
                <Link className="btn btn-outline btn-sm" to={`/educacion/mi-programa/certificado/${c.id}`}><MdPrint /> Ver e imprimir</Link>
              </div>
            ))}</div>
          </Card>
        )}
        {(() => {
          const now = new Date()
          const next = classes.find((x) => x.status !== 'cancelada' && new Date(`${x.date}T${x.endTime}:00-05:00`) >= now)
          const todo = (aula?.groups || []).flatMap((g) => g.materials.filter((m) => m.kind === 'taller' && (!m.mySubmission || m.mySubmission.status === 'devuelto')))
          const finals = (aula?.groups || []).flatMap((g) => g.grades.map((x) => x.final.score)).filter((v) => v != null)
          const avg = finals.length ? finals.reduce((a, v) => a + v, 0) / finals.length : null
          const pct = att?.groups?.length ? Math.round(att.groups.reduce((a, g) => a + (g.pct || 0), 0) / att.groups.length) : null
          const kpi = (to, icon, label, value, foot) => <Link to={to} className="card kpi" style={{ color: 'inherit', textDecoration: 'none' }}><div className="kpi-top"><span className="kpi-label">{label}</span><span className="kpi-icon">{icon}</span></div><div className="kpi-value" style={{ fontSize: 20 }}>{value}</div><div className="kpi-foot">{foot}</div></Link>
          return (
            <div className="grid grid-kpi">
              {kpi('/educacion/mi-horario', <MdEvent />, 'Próxima clase', next ? `${formatDate(next.date)} · ${next.startTime}` : 'Sin clases', next ? `${next.subject || 'Clase'} · ${next.modality === 'virtual' ? 'Virtual' : 'Presencial'}` : 'Ver mi horario')}
              {kpi('/educacion/mi-aula', <MdAssignment />, 'Talleres por entregar', todo.length, todo.length ? 'Ir a mi aula' : 'Estás al día')}
              {kpi('/educacion/mis-notas', <MdGrading />, 'Promedio de definitivas', avg != null ? fmtScore(avg) : '—', 'Ver mis notas')}
              {kpi('/educacion/mi-programa', <MdSchedule />, 'Mi asistencia', pct != null ? `${pct} %` : '—', att ? `Mínimo exigido: ${att.minPct} %` : '')}
            </div>
          )
        })()}
        <StudentCharts aula={aula} att={att} classes={classes} />
        {att && (att.groups.length > 0 || att.pending.length > 0) && (
          <Card title="Mi asistencia" subtitle={`Asistencia mínima exigida: ${att.minPct} %`} icon={<MdSchedule style={{ color: 'var(--brand)' }} />}>
            <div className="stack" style={{ gap: 12 }}>
              {att.groups.map((g) => (
                <div key={g.groupId}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span><b>{g.code}</b> · {g.program}</span><span className={`badge ${g.atRisk ? 'bad' : 'ok'}`}>{g.pct ?? '—'} %</span></div>
                  <div style={{ height: 8, background: 'var(--line-2)', borderRadius: 99, marginTop: 6 }}><div style={{ width: `${g.pct || 0}%`, height: 8, background: g.atRisk ? 'var(--bad)' : 'var(--ok)', borderRadius: 99 }} /></div>
                  <div className="hint">{g.attended} de {g.total} clases · {g.excusa} con excusa · {g.ausente} ausencias</div>
                </div>
              ))}
              {att.pending.length > 0 && (
                <div className="stack" style={{ gap: 8 }}>
                  <b style={{ fontSize: 13.5 }}>Asistencias por firmar</b>
                  {att.pending.map((p) => (
                    <div key={p.sessionId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, fontSize: 13.5, flexWrap: 'wrap' }}>
                      <span>{formatDate(p.date)} · {p.subject || 'Clase'} · {p.group} <span className={`badge ${ATT[p.status][2]}`}>{ATT[p.status][1]}</span></span>
                      <button type="button" className="btn btn-outline btn-sm" onClick={() => setSigning(p)}><MdDraw /> Firmar</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Card>
        )}
        {active.map((e) => (
          <Card key={e.id} title={e.program?.name} icon={<MdSchool style={{ color: 'var(--brand)' }} />} actions={<StatusBadge status={e.status} />}
            subtitle={[e.group?.code && `Grupo ${e.group.code}`, e.period?.name, e.academicPeriod, e.pensum && hoursLabel(e.pensum.totalHours)].filter(Boolean).join(' · ')}>
            {e.contract && !e.contract.signedAt && (e.contract.required || e.status === 'matriculado') && (
              <div className="alert warn" style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span>{e.contract.required ? 'Debes firmar tu contrato de matrícula y aceptar el reglamento estudiantil.' : 'Tu contrato de matrícula está disponible para firmar.'}</span>
                <Link className="btn btn-primary btn-sm" to={`/educacion/mi-programa/contrato/${e.id}`}><MdDraw /> Leer y firmar</Link>
              </div>
            )}
            {e.contract?.signedAt && <div style={{ marginBottom: 12 }}><Link className="btn btn-outline btn-sm" to={`/educacion/mi-programa/contrato/${e.id}`}><MdGavel /> Ver mi contrato firmado</Link></div>}
            <div className="grid grid-kpi" style={{ marginBottom: 16 }}>
              <div className="card kpi"><span className="kpi-label">Fecha de matrícula</span><div className="kpi-value" style={{ fontSize: 20 }}>{formatDate(e.enrolledAt)}</div></div>
              {e.pensum && <div className="card kpi"><span className="kpi-label">Al terminar recibes</span><div className="kpi-value" style={{ fontSize: 15, lineHeight: 1.3 }}>{e.pensum.certLabel}</div></div>}
            </div>
            {e.account && (
              <div style={{ marginBottom: 16 }}>
                <b style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}><MdAccountBalanceWallet /> Mis pagos</b>
                <AccountView enrollment={e} readOnly receiptBase="/educacion/mi-programa/recibo" invoiceBase="/educacion/mi-programa/factura" />
              </div>
            )}
            {e.pensum && (
              <div className="stack" style={{ gap: 12 }}>
                <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MdMenuBook /> Pensum</b>
                {e.pensum.periods.map((x) => (
                  <div key={x.id} style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 14px', background: e.period?.id === x.id ? 'var(--brand-50)' : 'var(--line-2)', fontSize: 13.5 }}>
                      <b>{x.name}{e.period?.id === x.id ? ' · en curso' : ''}</b><span>{hoursLabel(x.hours)}</span>
                    </div>
                    {x.subjects.map((s) => <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, padding: '8px 14px', fontSize: 13.5, borderTop: '1px solid var(--line-2)' }}><span>{s.name} <span style={{ color: 'var(--muted)', fontSize: 12 }}>· {SUBJECT_KINDS[s.kind]}</span></span><span>{hoursLabel(s.hours)}</span></div>)}
                  </div>
                ))}
              </div>
            )}
          </Card>
        ))}
        {others.length > 0 && (
          <Card title="Historial" flush>
            <div className="table-wrap"><table className="table"><thead><tr><th>Programa</th><th>Periodo</th><th>Fecha</th><th>Estado</th></tr></thead>
              <tbody>{others.map((e) => <tr key={e.id}><td>{e.program?.name}</td><td>{[e.period?.name, e.academicPeriod].filter(Boolean).join(' · ') || '—'}</td><td>{formatDate(e.enrolledAt)}</td><td><StatusBadge status={e.status} /></td></tr>)}</tbody></table></div>
          </Card>
        )}
      </div>
      {signing && <SignModal title={`Firmar asistencia del ${formatDate(signing.date)}`} hint="Con tu firma confirmas que asististe a esta clase." onClose={() => setSigning(null)} onSign={async (sig) => { await api.post(`/academico/mi-asistencia/${signing.sessionId}/firmar`, { signature: sig }); setSigning(null); loadAtt(); toast('Asistencia firmada') }} />}
      {toastNode}
    </>
  )
}

export default MyProgramPage
