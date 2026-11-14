import React from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ReferenceLine } from 'recharts'
import { MdInsertChart, MdPieChart, MdHowToReg, MdEvent, MdPeople, MdPayments, MdAccountBalanceWallet } from 'react-icons/md'
import { Card } from '../../components/ui'
import { formatMoney } from '../../utils/format'

// Gráficas del dashboard del instituto. Los datos llegan de /academico/resumen (charts);
// recaudo y cartera solo vienen cuando el usuario es administrador.
export const C = { brand: 'var(--brand)', navy: 'var(--secondary)', ok: 'var(--ok)', warn: 'var(--warn)', info: 'var(--info)', bad: 'var(--bad)', muted: '#9CA3AF' }
const SERIES = [C.brand, C.navy, C.info, C.ok, C.warn, C.muted]
const STATUS_COLOR = { Activos: C.ok, Graduados: C.info, Retirados: C.bad, Inactivos: C.muted, Aplazados: C.warn, Realizadas: C.ok, Programadas: C.info, Canceladas: C.bad, Presencial: C.navy, Virtual: C.brand, Femenino: C.brand, Masculino: C.navy, Otro: C.warn, 'Sin dato': C.muted }
const colorOf = (name, i) => STATUS_COLOR[name] || SERIES[i % SERIES.length]
const AXIS = { fontSize: 11.5, fill: 'var(--muted)' }
const TIP = { contentStyle: { borderRadius: 8, border: '1px solid var(--line)', fontSize: 12.5 }, cursor: { fill: 'var(--line-2)' } }
const compactMoney = (v) => (Math.abs(v) >= 1e6 ? `$${Math.round(v / 1e5) / 10} M` : Math.abs(v) >= 1e3 ? `$${Math.round(v / 1e3)} mil` : `$${v}`)
const sum = (rows, k = 'value') => (rows || []).reduce((a, r) => a + (Number(r[k]) || 0), 0)

export const NoData = ({ children = 'Sin datos todavía.' }) => (
  <div style={{ height: 200, display: 'grid', placeItems: 'center', color: 'var(--muted)', fontSize: 13 }}>{children}</div>
)

export const Donut = ({ data, height = 220, unit = '', colors }) => {
  const total = sum(data)
  if (!total) return <NoData />
  return (
    <div style={{ position: 'relative', width: '100%', height }}>
      <ResponsiveContainer>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius="58%" outerRadius="85%" paddingAngle={2} isAnimationActive={false}>
            {data.map((x, i) => <Cell key={x.name} fill={colors?.[x.name] || colorOf(x.name, i)} stroke="var(--surface)" />)}
          </Pie>
          <Tooltip {...TIP} formatter={(v, n) => [`${v}${unit} (${Math.round((v / total) * 100)} %)`, n]} />
          <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />
        </PieChart>
      </ResponsiveContainer>
      <div style={{ position: 'absolute', left: 0, right: 0, top: `calc(${(height - 36) / 2}px - 14px)`, textAlign: 'center', pointerEvents: 'none' }}>
        <div style={{ fontSize: 20, fontWeight: 700, lineHeight: 1 }}>{total}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>total</div>
      </div>
    </div>
  )
}

export const Bars = ({ data, keys, height = 240, money = false, layout = 'horizontal', yMax, refY, xKey = 'name' }) => {
  if (!data?.length || !keys.some((k) => sum(data, k.key))) return <NoData />
  const vertical = layout === 'vertical'
  const fmt = (v) => (money ? formatMoney(v) : v)
  return (
    <div style={{ width: '100%', height: vertical ? Math.max(160, data.length * 44 + 50) : height }}>
      <ResponsiveContainer>
        <BarChart data={data} layout={vertical ? 'vertical' : 'horizontal'} margin={{ top: refY != null ? 20 : 8, right: 16, left: vertical ? 6 : money ? 4 : -18, bottom: 0 }} barGap={3}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={!vertical} vertical={vertical} />
          {vertical ? (
            <>
              <XAxis type="number" tick={AXIS} domain={[0, yMax || 'auto']} allowDecimals={false} unit={yMax === 100 ? ' %' : ''} />
              <YAxis type="category" dataKey={xKey} tick={AXIS} width={84} />
            </>
          ) : (
            <>
              <XAxis dataKey={xKey} tick={AXIS} interval={0} angle={data.length > 8 ? -35 : 0} textAnchor={data.length > 8 ? 'end' : 'middle'} height={data.length > 8 ? 46 : 28} />
              <YAxis tick={AXIS} allowDecimals={false} width={money ? 64 : 40} tickFormatter={money ? compactMoney : undefined} />
            </>
          )}
          <Tooltip {...TIP} formatter={(v, n) => [v == null ? 'Sin datos' : money ? fmt(v) : yMax === 100 ? `${v} %` : v, n]} />
          {keys.length > 1 && <Legend iconType="circle" iconSize={9} wrapperStyle={{ fontSize: 12 }} />}
          {refY != null && <ReferenceLine {...(vertical ? { x: refY } : { y: refY })} stroke={C.warn} strokeDasharray="5 4" label={{ value: `Mínimo ${refY} %`, fontSize: 11, fill: C.warn, position: vertical ? 'top' : 'right' }} />}
          {keys.map((k) => (
            <Bar key={k.key} dataKey={k.key} name={k.name} fill={k.color} radius={vertical ? [0, 5, 5, 0] : [5, 5, 0, 0]} maxBarSize={vertical ? 16 : 34} isAnimationActive={false}>
              {k.byName && data.map((x, i) => <Cell key={i} fill={colorOf(x[xKey], i)} />)}
            </Bar>
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}

const icon = (I, color = 'var(--brand)') => <I style={{ color }} />

const EduCharts = ({ charts }) => {
  if (!charts) return null
  const c = charts
  const admin = Array.isArray(c.collectionsByMonth)
  return (
    <div className="stack">
      <div className="grid grid-2-1">
        <Card title="Matrículas y certificados por mes" subtitle="Últimos 12 meses (sin preinscritos ni certificados anulados)" icon={icon(MdInsertChart)}>
          <Bars data={c.enrollmentsByMonth} xKey="month" keys={[{ key: 'matriculas', name: 'Matrículas', color: C.brand }, { key: 'certificados', name: 'Certificados', color: C.navy }]} height={260} />
        </Card>
        <Card title="Estudiantes por estado" subtitle="Todos los estudiantes registrados" icon={icon(MdPieChart, 'var(--secondary)')}>
          <Donut data={c.studentsByStatus} height={260} />
        </Card>
      </div>

      <div className="grid grid-2-1">
        <Card title="Asistencia y aprobación por grupo" subtitle="Grupos en curso · promedio de asistencia y porcentaje de notas finales aprobadas" icon={icon(MdHowToReg, 'var(--ok)')}>
          {c.byGroup?.length
            ? <Bars data={c.byGroup} xKey="code" layout="vertical" yMax={100} refY={c.minAttendance} keys={[{ key: 'attendance', name: 'Asistencia', color: C.ok }, { key: 'approval', name: 'Aprobación', color: C.info }]} />
            : <NoData>No hay grupos en curso.</NoData>}
        </Card>
        <Card title="Matrícula por tipo de programa" subtitle="Matrículas activas" icon={icon(MdPieChart)}>
          <Donut data={c.byKind} />
        </Card>
      </div>

      <div className="grid grid-2">
        <Card title="Clases del mes" subtitle="Por estado y, sin las canceladas, por modalidad" icon={icon(MdEvent, 'var(--info)')}>
          <div className="grid grid-2" style={{ gap: 8 }}>
            <Bars data={c.sessionsMonth} layout="vertical" keys={[{ key: 'value', name: 'Clases', color: C.info, byName: true }]} height={220} />
            <Donut data={c.modality} />
          </div>
        </Card>
        <Card title="Estudiantes activos por sexo y edad" subtitle="Datos de la ficha del estudiante" icon={icon(MdPeople, 'var(--secondary)')}>
          <div className="grid grid-2" style={{ gap: 8 }}>
            <Donut data={c.gender} />
            <Bars data={c.ages} layout="vertical" keys={[{ key: 'value', name: 'Estudiantes', color: C.navy }]} height={220} />
          </div>
        </Card>
      </div>

      {admin && (
        <div className="grid grid-2">
          <Card title="Recaudo por mes" subtitle="Pagos registrados, sin recibos anulados · solo administrador" icon={icon(MdPayments, 'var(--ok)')}>
            <Bars data={c.collectionsByMonth} xKey="month" money keys={[{ key: 'recaudo', name: 'Recaudo', color: C.ok }]} height={250} />
          </Card>
          <Card title="Cartera por antigüedad" subtitle="Saldo por cobrar según los días de mora de la cuota más vencida · solo administrador" icon={icon(MdAccountBalanceWallet, 'var(--warn)')}>
            <Bars data={c.aging} money keys={[{ key: 'value', name: 'Saldo', color: C.warn }]} height={250} />
          </Card>
        </div>
      )}
    </div>
  )
}

export default EduCharts
