import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdErrorOutline, MdToday, MdClass, MdSchedule, MdGroups, MdOpenInNew, MdEdit, MdWarning, MdFactCheck } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Empty, Spinner, useToast } from '../../components/ui'
import { formatDate } from '../../utils/format'
import { SessionModal } from './SchedulePage'
import { TeacherCharts } from './PanelCharts'

const ClassRow = ({ x, onOpen }) => (
  <div style={{ display: 'flex', gap: 14, alignItems: 'center', padding: 12, border: '1px solid var(--line)', borderRadius: 10, flexWrap: 'wrap' }}>
    <div style={{ minWidth: 96 }}><b>{x.startTime}–{x.endTime}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{formatDate(x.date)}</div></div>
    <div style={{ flex: '1 1 220px', minWidth: 0 }}>
      <div style={{ fontWeight: 600 }}>{x.subject || 'Clase'} · {x.group?.code}</div>
      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{x.group?.program} · {x.modality === 'virtual' ? (x.platformLabel || 'Virtual') : (x.location || 'Presencial')}{x.topic ? ` · ${x.topic}` : ''}</div>
    </div>
    <span className={`badge ${x.modality === 'virtual' ? 'info' : 'brand'}`}>{x.modality === 'virtual' ? 'Virtual' : 'Presencial'}</span>
    {x.status === 'realizada' && <span className="badge ok">Realizada</span>}
    <Link className="btn btn-outline btn-sm" to={`/educacion/clases/${x.id}/asistencia`}><MdFactCheck /> Asistencia</Link>
    {x.modality === 'virtual' && x.meetingUrl && <a className="btn btn-primary btn-sm" href={x.meetingUrl} target="_blank" rel="noreferrer"><MdOpenInNew /> Abrir {x.platformLabel || 'clase'}</a>}
    <button type="button" className="btn btn-ghost btn-icon" aria-label="Enlace, tema o marcar realizada" title="Enlace, tema o marcar realizada" onClick={() => onOpen(x)}><MdEdit /></button>
  </div>
)

// Panel del docente: clases de hoy (con el botón para entrar a Meet o Teams), la semana, sus grupos e indicadores del mes.
const TeacherDashboard = () => {
  const { user } = useAuth()
  const [toast, toastNode] = useToast()
  const [d, setD] = useState(null); const [error, setError] = useState(''); const [open, setOpen] = useState(null)
  const load = useCallback(() => api.get('/academico/docente/resumen').then(({ data }) => setD(data)).catch((e) => setError(errorMessage(e))), [])
  useEffect(() => { load() }, [load])
  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!d) return <div className="splash"><Spinner /></div>
  return (
    <>
      <PageHead title={`Hola, ${user.name}`} subtitle={d.today.length ? `Hoy tienes ${d.today.length} clase${d.today.length === 1 ? '' : 's'}` : 'Hoy no tienes clases programadas'} />
      <div className="stack">
        <div className="grid grid-kpi">
          <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Grupos a cargo</span><span className="kpi-icon navy"><MdGroups /></span></div><div className="kpi-value">{d.stats.groups}</div></div>
          <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Clases del mes</span><span className="kpi-icon"><MdClass /></span></div><div className="kpi-value">{d.stats.classesMonth}</div></div>
          <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Horas dictadas en el mes</span><span className="kpi-icon ok"><MdSchedule /></span></div><div className="kpi-value">{d.stats.hoursMonth} <small>h</small></div><div className="kpi-foot">Clases marcadas como realizadas</div></div>
          <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Clases sin cerrar</span><span className="kpi-icon warn"><MdWarning /></span></div><div className="kpi-value">{d.stats.pendingToClose}</div><div className="kpi-foot">Pasadas y aún programadas</div></div>
        </div>
        <TeacherCharts charts={d.charts} />
        <div className="grid grid-2-1">
          <div className="stack">
            <Card title="Clases de hoy" icon={<MdToday style={{ color: 'var(--brand)' }} />}>
              {d.today.length === 0 ? <Empty icon={<MdToday />}>Sin clases hoy.</Empty> : <div className="stack" style={{ gap: 8 }}>{d.today.map((x) => <ClassRow key={x.id} x={x} onOpen={setOpen} />)}</div>}
            </Card>
            <Card title="Próximos 7 días" icon={<MdSchedule style={{ color: 'var(--brand)' }} />}>
              {d.week.length === 0 ? <Empty icon={<MdSchedule />}>Sin clases esta semana.</Empty> : <div className="stack" style={{ gap: 8 }}>{d.week.map((x) => <ClassRow key={x.id} x={x} onOpen={setOpen} />)}</div>}
            </Card>
          </div>
          <div className="stack">
          {d.actasPorCerrar?.length > 0 && (
            <Card title="Actas por cerrar" subtitle="Clases pasadas sin el acta firmada" icon={<MdFactCheck style={{ color: 'var(--warn)' }} />}>
              <div className="stack" style={{ gap: 8 }}>{d.actasPorCerrar.map((a) => (
                <Link key={a.id} to={`/educacion/clases/${a.id}/asistencia`} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13.5, color: 'inherit', textDecoration: 'none' }}><span><b>{a.group}</b> · {a.subject || 'Clase'}</span><span style={{ color: 'var(--muted)' }}>{formatDate(a.date)}</span></Link>
              ))}</div>
            </Card>
          )}
          {d.atRisk?.length > 0 && (
            <Card title="Estudiantes en riesgo" subtitle={`Asistencia por debajo del ${d.minPct} %`} icon={<MdWarning style={{ color: 'var(--bad)' }} />}>
              <div className="stack" style={{ gap: 8 }}>{d.atRisk.map((s) => <div key={s.studentId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13.5 }}><span>{s.fullName}</span><span className="badge bad">{s.pct} %</span></div>)}</div>
            </Card>
          )}
          <Card title="Mis grupos" icon={<MdGroups style={{ color: 'var(--brand)' }} />}>
            {d.groups.length === 0 ? <Empty icon={<MdGroups />}>Aún no tienes grupos asignados.</Empty> : (
              <div className="stack" style={{ gap: 10 }}>{d.groups.map((g) => (
                <div key={g.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 10, fontSize: 13.5 }}>
                  <span><b>{g.code}</b><br /><span style={{ color: 'var(--muted)', fontSize: 12 }}>{g.program}{g.period ? ` · ${g.period}` : ''}</span></span>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center' }}><span className="badge">{g.students} estudiantes</span><Link className="btn btn-outline btn-sm" to={`/educacion/grupos/${g.id}/aula`}>Aula y calificaciones</Link></span>
                </div>
              ))}</div>
            )}
          </Card>
          </div>
        </div>
      </div>
      {open && <SessionModal session={open} teacherMode onClose={() => setOpen(null)} onSaved={(x, msg) => { setOpen(null); load(); toast(msg) }} />}
      {toastNode}
    </>
  )
}

export default TeacherDashboard
