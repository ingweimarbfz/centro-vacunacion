import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { MdVaccines, MdPeople, MdWarning, MdEventRepeat, MdInventory2, MdScience, MdAdd, MdThermostat, MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import MonthPicker, { shortMonth } from '../../components/MonthPicker'
import './vacunacion.css'

const currentMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()).slice(0, 7)
const fmt = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')
const Kpi = ({ label, value, foot, icon, tone = '' }) => (
  <div className="card kpi"><div className="kpi-top"><span className="kpi-label">{label}</span><span className={`kpi-icon ${tone}`}>{icon}</span></div><div className="kpi-value" style={{ fontSize: 24 }}>{value}</div>{foot && <div className="kpi-foot">{foot}</div>}</div>
)

// Vacunación → Dashboard: dosis aplicadas, biológicos, seguimiento, ESAVI, frascos abiertos e inventario.
const VaccinationDashboard = () => {
  const [month, setMonth] = useState(currentMonth)
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { setD(null); api.get('/vacunacion/dashboard', { params: { mes: month } }).then(({ data }) => setD(data)).catch((e) => setErr(errorMessage(e))) }, [month])
  const k = d?.kpis
  return (
    <>
      <PageHead title="Vacunación" subtitle={`Resumen de ${shortMonth(month)}: dosis aplicadas, seguimiento de esquemas, ESAVI y biológicos`}>
        <MonthPicker value={month} max={currentMonth()} onChange={setMonth} ariaLabel="Mes del resumen" />
        <Link to="/vacunacion/registrar" className="btn btn-primary"><MdAdd /> Registrar vacunación</Link>
      </PageHead>
      {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
      {!d && !err && <div className="splash" style={{ minHeight: 240 }}><Spinner /></div>}
      {d && (
        <div className="stack">
          {k.esaviSinNotificar > 0 && <div className="alert bad" style={{ margin: 0 }}><MdWarning /><span><b>{k.esaviSinNotificar} ESAVI grave{k.esaviSinNotificar === 1 ? '' : 's'} sin notificar en SIVIGILA.</b> <Link to="/vacunacion/consultar?tab=esavi">Revisar</Link></span></div>}
          {k.frascosVencidos > 0 && <div className="alert warn" style={{ margin: 0 }}><MdScience /><span>{k.frascosVencidos} frasco{k.frascosVencidos === 1 ? '' : 's'} multidosis abierto{k.frascosVencidos === 1 ? '' : 's'} ya superó su vida útil: descártalo{k.frascosVencidos === 1 ? '' : 's'}. <Link to="/vacunacion/consultar?tab=frascos">Ver frascos</Link></span></div>}
          <div className="grid vac-kpis">
            <Kpi label="Dosis aplicadas" value={k.dosis} foot={`${k.personas} persona${k.personas === 1 ? '' : 's'} vacunada${k.personas === 1 ? '' : 's'}`} icon={<MdVaccines />} />
            <Kpi label="PAI / particulares" value={`${k.pai} / ${k.particular}`} foot="Dosis del programa y dosis cobradas" icon={<MdPeople />} tone="navy" />
            <Kpi label="Dosis atrasadas" value={k.atrasadas} foot={`${k.proximas} en los próximos 7 días`} icon={<MdEventRepeat />} tone={k.atrasadas ? 'warn' : 'ok'} />
            <Kpi label="ESAVI" value={k.esavi} foot={`${k.esaviGraves} grave${k.esaviGraves === 1 ? '' : 's'}`} icon={<MdWarning />} tone={k.esaviGraves ? 'warn' : 'ok'} />
            <Kpi label="Frascos abiertos" value={k.frascosAbiertos} foot="Multidosis en uso" icon={<MdScience />} />
            <Kpi label="Lotes por vencer" value={k.lotesPorVencer} foot="En los próximos 60 días" icon={<MdInventory2 />} tone={k.lotesPorVencer ? 'warn' : 'ok'} />
          </div>
          <Card title="Dosis por día" subtitle="Programa Ampliado de Inmunizaciones (PAI) y vacunas particulares">
            <div style={{ width: '100%', height: 230 }}><ResponsiveContainer>
              <BarChart data={d.perDay} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} interval={1} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                <Tooltip /><Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pai" name="PAI" stackId="a" fill="#1F2A44" isAnimationActive={false} />
                <Bar dataKey="particular" name="Particular" stackId="a" fill="#F59E0B" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer></div>
          </Card>
          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            <Card title="Dosis por biológico">
              {d.byVaccine.length === 0 ? <Empty icon={<MdVaccines />}>Sin dosis en el mes.</Empty> : (
                <div style={{ width: '100%', height: Math.max(180, d.byVaccine.length * 40) }}><ResponsiveContainer>
                  <BarChart data={d.byVaccine} layout="vertical" margin={{ left: 0, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} /><YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
                    <Tooltip /><Bar dataKey="dosis" name="Dosis" fill="var(--brand)" radius={[0, 4, 4, 0]} isAnimationActive={false} />
                  </BarChart>
                </ResponsiveContainer></div>
              )}
            </Card>
            <Card title="Dosis por grupo de edad">
              <div style={{ width: '100%', height: 200 }}><ResponsiveContainer>
                <BarChart data={d.byAge} margin={{ left: 0, right: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                  <Tooltip /><Bar dataKey="value" name="Dosis" fill="#0EA5E9" radius={[4, 4, 0, 0]} isAnimationActive={false} />
                </BarChart>
              </ResponsiveContainer></div>
              <div className="vac-split">{d.byModality.map((m) => <div key={m.name}><b>{m.value}</b><span>{m.name}</span></div>)}</div>
            </Card>
          </div>
          <div className="grid grid-2" style={{ alignItems: 'start' }}>
            <Card flush title="Seguimiento de dosis" subtitle="Personas con la siguiente dosis atrasada o próxima" actions={<Link to="/vacunacion/seguimiento" className="btn btn-outline btn-sm">Ver todo</Link>}>
              {d.overdue.length + d.upcoming.length === 0 ? <Empty icon={<MdEventRepeat />}>Nadie con dosis atrasadas ni próximas.</Empty> : (
                <ul className="list" style={{ padding: '4px 20px 8px' }}>{[...d.overdue, ...d.upcoming].map((f) => (
                  <li key={f.id}><div className="grow"><strong>{f.patient}</strong><span>{f.vaccine} · {f.nextDose} · {fmt(f.dueDate)}</span></div><span className={`badge ${f.daysLate > 0 ? 'warn' : ''}`}>{f.daysLate > 0 ? `${f.daysLate} días tarde` : f.daysLate === 0 ? 'Hoy' : `En ${-f.daysLate} días`}</span></li>
                ))}</ul>
              )}
            </Card>
            <Card flush title="Biológicos en inventario" subtitle="Frascos disponibles en la sede y lotes por vencer" actions={<Link to="/socorro/inventario/existencias" className="btn btn-outline btn-sm">Inventario</Link>}>
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Biológico</th><th className="num">Frascos</th><th>Por vencer</th></tr></thead>
                <tbody>{d.stock.map((s) => (
                  <tr key={s.productId}><td>{s.name}</td><td className="num"><strong>{s.frascos}</strong></td><td>{s.porVencer.length ? s.porVencer.map((l) => <span key={l.lot} className="badge warn" style={{ marginRight: 4 }}>{l.lot} · {fmt(l.expiry)}</span>) : <span className="hint">—</span>}</td></tr>
                ))}</tbody>
              </table></div>
            </Card>
          </div>
          <div className="alert info" style={{ margin: 0 }}><MdThermostat /><span>La cadena de frío de las neveras se registra en <Link to="/temperatura">Cadena de frío → Registro de temperatura</Link>; las alertas de temperatura aparecen en el dashboard de IPS.</span></div>
        </div>
      )}
    </>
  )
}

export default VaccinationDashboard
