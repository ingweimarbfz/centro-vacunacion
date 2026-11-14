import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, Cell } from 'recharts'
import { MdInsertChart, MdHowToReg, MdAssignment, MdGrading, MdEvent } from 'react-icons/md'
import { Card } from '../../components/ui'
import { Bars, Donut, NoData, C } from './EduCharts'

// Gráficas de los paneles del docente y del estudiante.
const AXIS = { fontSize: 11.5, fill: 'var(--muted)' }
const TIP = { contentStyle: { borderRadius: 8, border: '1px solid var(--line)', fontSize: 12.5 }, cursor: { fill: 'var(--line-2)' } }
const ico = (I, color = 'var(--brand)') => <I style={{ color }} />
const SUB_COLOR = { 'Por calificar': C.warn, Calificadas: C.ok, Devueltas: C.bad, 'Sin entregar': '#9CA3AF', Entregados: C.info, Pendientes: C.warn }

// Notas de 0 a 5 con la línea de la nota mínima para aprobar.
const ScoreBars = ({ data, passing }) => {
  if (!data.length) return <NoData>Aún no tienes notas registradas.</NoData>
  return (
    <div style={{ width: '100%', height: Math.max(170, data.length * 42 + 50) }}>
      <ResponsiveContainer>
        <BarChart data={data} layout="vertical" margin={{ top: 20, right: 16, left: 6, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
          <XAxis type="number" domain={[0, 5]} ticks={[0, 1, 2, 3, 4, 5]} tick={AXIS} />
          <YAxis type="category" dataKey="name" tick={AXIS} width={130} />
          <Tooltip {...TIP} formatter={(v) => [String(v).replace('.', ','), 'Definitiva']} />
          <ReferenceLine x={passing} stroke={C.warn} strokeDasharray="5 4" label={{ value: `Aprueba con ${String(passing).replace('.', ',')}`, fontSize: 11, fill: C.warn, position: 'top' }} />
          <Bar dataKey="score" radius={[0, 5, 5, 0]} maxBarSize={16} isAnimationActive={false}>{data.map((x, i) => <Cell key={i} fill={x.score >= passing ? C.ok : C.bad} />)}</Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

export const TeacherCharts = ({ charts: c }) => {
  if (!c) return null
  return (
    <>
      <div className="grid grid-2-1">
        <Card title="Horas de clase por semana" subtitle="Últimas 8 semanas · dictadas y aún programadas" icon={ico(MdInsertChart)}>
          <Bars data={c.hoursByWeek} xKey="week" keys={[{ key: 'dictadas', name: 'Dictadas', color: C.ok }, { key: 'programadas', name: 'Programadas', color: C.info }]} />
        </Card>
        <Card title="Entregas de talleres" subtitle="Estado de las entregas de tus grupos" icon={ico(MdAssignment)}>
          <Donut data={c.submissions} colors={SUB_COLOR} />
        </Card>
      </div>
      <Card title="Asistencia y aprobación por grupo" subtitle="Promedio de asistencia y porcentaje de definitivas aprobadas" icon={ico(MdHowToReg, 'var(--ok)')}>
        {c.byGroup?.some((g) => g.attendance != null || g.approval != null)
          ? <Bars data={c.byGroup} xKey="code" layout="vertical" yMax={100} refY={c.minAttendance} keys={[{ key: 'attendance', name: 'Asistencia', color: C.ok }, { key: 'approval', name: 'Aprobación', color: C.info }]} />
          : <NoData>Aún no hay asistencia ni notas registradas.</NoData>}
      </Card>
    </>
  )
}

// Estudiante: definitivas por asignatura, asistencia por curso, talleres y clases de las próximas semanas.
export const StudentCharts = ({ aula, att, classes }) => {
  const passing = aula?.passingScore ?? 3
  const multi = (aula?.groups || []).length > 1
  const scores = (aula?.groups || []).flatMap((g) => g.grades.filter((x) => x.final.score != null).map((x) => ({ name: multi ? `${x.subject} (${g.code})` : x.subject, score: x.final.score })))
  const talleres = (aula?.groups || []).flatMap((g) => g.materials.filter((m) => m.kind === 'taller'))
  const tall = [
    { name: 'Calificadas', value: talleres.filter((m) => m.mySubmission?.status === 'revisado').length },
    { name: 'Entregados', value: talleres.filter((m) => m.mySubmission?.status === 'entregado').length },
    { name: 'Devueltas', value: talleres.filter((m) => m.mySubmission?.status === 'devuelto').length },
    { name: 'Pendientes', value: talleres.filter((m) => !m.mySubmission).length }
  ]
  const attRows = (att?.groups || []).map((g) => ({ name: g.code, Asistió: g.attended || 0, Excusa: g.excusa || 0, Ausente: g.ausente || 0 }))
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
  const weekOf = (d) => { const x = new Date(`${d}T12:00:00Z`); const w = (x.getUTCDay() + 6) % 7; x.setUTCDate(x.getUTCDate() - w); return x.toISOString().slice(0, 10) }
  const w0 = weekOf(today)
  const weeks = [0, 1, 2, 3].map((i) => { const x = new Date(`${w0}T12:00:00Z`); x.setUTCDate(x.getUTCDate() + 7 * i); return x.toISOString().slice(0, 10) })
  const upcoming = weeks.map((w, i) => ({ name: i === 0 ? 'Esta semana' : new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${w}T12:00:00Z`)).replace(' de ', ' ').replace('.', ''), Presencial: (classes || []).filter((x) => x.status !== 'cancelada' && weekOf(x.date) === w && x.modality !== 'virtual').length, Virtual: (classes || []).filter((x) => x.status !== 'cancelada' && weekOf(x.date) === w && x.modality === 'virtual').length }))
  return (
    <>
      <div className="grid grid-2-1">
        <Card title="Mis definitivas por asignatura" subtitle="Escala 0,0 a 5,0" icon={ico(MdGrading)}><ScoreBars data={scores} passing={passing} /></Card>
        <Card title="Mis talleres" subtitle="Estado de tus entregas" icon={ico(MdAssignment)}><Donut data={tall} colors={SUB_COLOR} /></Card>
      </div>
      <div className="grid grid-2">
        <Card title="Mi asistencia por curso" subtitle={att ? `Clases con asistencia tomada · mínimo ${att.minPct} %` : ''} icon={ico(MdHowToReg, 'var(--ok)')}>
          <Bars data={attRows} layout="vertical" keys={[{ key: 'Asistió', name: 'Asistió', color: C.ok }, { key: 'Excusa', name: 'Excusa', color: C.warn }, { key: 'Ausente', name: 'Ausente', color: C.bad }]} />
        </Card>
        <Card title="Mis próximas clases" subtitle="Clases por semana, sin las canceladas" icon={ico(MdEvent)}>
          <Bars data={upcoming} keys={[{ key: 'Presencial', name: 'Presencial', color: C.navy }, { key: 'Virtual', name: 'Virtual', color: C.brand }]} />
        </Card>
      </div>
    </>
  )
}
