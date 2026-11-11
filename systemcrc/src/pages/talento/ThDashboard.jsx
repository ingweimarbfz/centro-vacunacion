import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts'
import { MdGroups, MdVerified, MdWork, MdSchool, MdWarning, MdFactCheck, MdErrorOutline, MdArrowForward, MdNotificationsActive } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { Percent, CONTRACT_STATUS, StatusBadge, fmt } from './common'

const PALETTE = ['#E30613', '#1F2A44', '#0EA5A4', '#F59E0B', '#6366F1', '#94A3B8', '#EC4899', '#84CC16']
const COMPLIANCE_COLORS = ['#16A34A', '#F59E0B', '#DC2626']
const KIND = { contrato: 'Contrato', certificado: 'Certificado', requisito: 'Requisito', cargo: 'Cargo', chequeo: 'Verificación' }
const axis = { fontSize: 11, fill: '#4B5563' }

const Kpi = ({ label, value, foot, icon, tone = '', to }) => {
  const body = (
    <>
      <div className="kpi-top"><span className="kpi-label">{label}</span><span className={`kpi-icon ${tone}`}>{icon}</span></div>
      <div className="kpi-value">{value}</div>
      {foot && <div className="kpi-foot">{foot}</div>}
    </>
  )
  return to ? <Link to={to} className="card kpi th-kpi-link">{body}</Link> : <div className="card kpi">{body}</div>
}

// Dashboard del estándar de talento humano: indicadores, alertas y gráficas.
const ThDashboard = () => {
  const navigate = useNavigate()
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  const [kind, setKind] = useState('')
  useEffect(() => { api.get('/estandares/th/resumen').then(({ data }) => setD(data)).catch((e) => setError(errorMessage(e))) }, [])
  const alerts = useMemo(() => (d ? d.alerts.filter((a) => !kind || a.kind === kind) : []), [d, kind])
  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!d) return <div className="splash"><Spinner /> Cargando talento humano…</div>
  const k = d.kpis
  const counts = d.alerts.reduce((a, x) => ({ ...a, [x.kind]: (a[x.kind] || 0) + 1 }), {})

  return (
    <>
      <PageHead title="Talento humano" subtitle="Estándar transversal 1 · cumplimiento de requisitos, contratos y certificados del personal">
        <Link to="/estandares/talento-humano/personal" className="btn btn-primary"><MdGroups /> Hojas de vida</Link>
      </PageHead>

      <div className="grid grid-kpi">
        <Kpi label="Personal activo" value={k.total} icon={<MdGroups />} tone="navy" foot={`${k.compliant} con todos los requisitos al día`} to="/estandares/talento-humano/personal" />
        <Kpi label="Cumplimiento promedio" value={`${k.avgCompliance}%`} icon={<MdVerified />} tone={k.avgCompliance === 100 ? 'ok' : 'warn'} foot={`${k.missing} requisito${k.missing === 1 ? '' : 's'} obligatorio${k.missing === 1 ? '' : 's'} sin soporte`} />
        <Kpi label="Contratos por vencer" value={k.contractsExpiring} icon={<MdWork />} tone={k.contractsExpiring ? 'warn' : 'ok'} foot={`${k.contractsExpired} vencido${k.contractsExpired === 1 ? '' : 's'} · ${k.withoutContract} sin contrato`} />
        <Kpi label="Certificados por vencer" value={k.docsExpiring} icon={<MdSchool />} tone={k.docsExpiring ? 'warn' : 'ok'} foot={`${k.docsExpired} vencido${k.docsExpired === 1 ? '' : 's'} (30 días de aviso)`} />
        <Kpi label="Sin lista de chequeo" value={k.withoutChecklist} icon={<MdFactCheck />} tone={k.withoutChecklist ? 'warn' : 'ok'} foot="Sin verificar en el último año" />
      </div>

      <div className="grid grid-2" style={{ marginTop: 18, alignItems: 'start' }}>
        <Card flush title="Alertas" subtitle="Contratos y certificados por vencer, requisitos faltantes y verificaciones pendientes" icon={<MdNotificationsActive style={{ color: 'var(--brand)' }} />}>
          <div className="th-chips">
            <button type="button" className={!kind ? 'on' : ''} onClick={() => setKind('')}>Todas ({d.alerts.length})</button>
            {Object.entries(KIND).filter(([x]) => counts[x]).map(([x, l]) => <button key={x} type="button" className={kind === x ? 'on' : ''} onClick={() => setKind(x)}>{l} ({counts[x]})</button>)}
          </div>
          {alerts.length === 0 ? <Empty icon={<MdVerified />}>Sin alertas. Todo al día.</Empty> : (
            <ul className="list th-alerts">{alerts.slice(0, 60).map((a, i) => (
              <li key={i} onClick={() => navigate(`/estandares/talento-humano/personal/${a.staffId}`)} role="button" tabIndex={0}>
                <span className={`icon-bubble ${a.level === 'bad' ? 'bad' : 'warn'}`}><MdWarning /></span>
                <div className="grow"><strong>{a.name}</strong><span>{a.message}{a.date ? ` · ${fmt(a.date)}` : ''}</span></div>
                <span className="badge">{KIND[a.kind]}</span>
              </li>
            ))}</ul>
          )}
          {alerts.length > 60 && <p className="hint" style={{ padding: '0 20px 12px' }}>Y {alerts.length - 60} más. Usa el filtro “Solo con alertas” en Hojas de vida.</p>}
        </Card>

        <div className="stack" style={{ gap: 18 }}>
          <Card title="Cumplimiento de requisitos por persona">
            {k.total === 0 ? <Empty icon={<MdGroups />}>Aún no hay hojas de vida.</Empty> : (
              <div style={{ width: '100%', height: 220 }}><ResponsiveContainer>
                <PieChart><Pie data={d.compliance} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>{d.compliance.map((_, i) => <Cell key={i} fill={COMPLIANCE_COLORS[i]} />)}</Pie><Tooltip /><Legend /></PieChart>
              </ResponsiveContainer></div>
            )}
          </Card>
          <Card title="Personal por cargo">
            {d.byPosition.length === 0 ? <Empty icon={<MdWork />}>Sin datos.</Empty> : (
              <div style={{ width: '100%', height: Math.max(160, d.byPosition.length * 34) }}><ResponsiveContainer>
                <BarChart data={d.byPosition} layout="vertical" margin={{ left: 10, right: 20 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} tick={axis} /><YAxis type="category" dataKey="name" width={150} tick={axis} /><Tooltip /><Bar dataKey="value" name="Personas" fill="#1F2A44" radius={[0, 4, 4, 0]} /></BarChart>
              </ResponsiveContainer></div>
            )}
          </Card>
          <Card title="Tipo de vinculación">
            {d.byContract.length === 0 ? <Empty icon={<MdWork />}>Sin datos.</Empty> : (
              <div style={{ width: '100%', height: 220 }}><ResponsiveContainer>
                <PieChart><Pie data={d.byContract} dataKey="value" nameKey="name" outerRadius={80}>{d.byContract.map((_, i) => <Cell key={i} fill={PALETTE[i % PALETTE.length]} />)}</Pie><Tooltip /><Legend /></PieChart>
              </ResponsiveContainer></div>
            )}
          </Card>
        </div>
      </div>

      <div style={{ marginTop: 18 }}>
        <Card flush title="Personal con menor cumplimiento" actions={<Link to="/estandares/talento-humano/listado" className="btn btn-ghost btn-sm">Listado completo <MdArrowForward /></Link>}>
          {d.staff.length === 0 ? <Empty icon={<MdGroups />}>Aún no hay hojas de vida.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Profesional</th><th>Cargo</th><th>Sede</th><th>Requisitos</th><th>Contrato</th></tr></thead>
              <tbody>{[...d.staff].sort((a, b) => a.percent - b.percent).slice(0, 10).map((r) => (
                <tr key={r.id} className="th-row" onClick={() => navigate(`/estandares/talento-humano/personal/${r.id}`)}>
                  <td><strong style={{ color: 'var(--ink)' }}>{r.fullName}</strong></td><td>{r.positionName || '—'}</td><td>{r.siteName}</td>
                  <td style={{ minWidth: 140 }}><Percent value={r.percent} /></td><td><StatusBadge status={r.contract} map={CONTRACT_STATUS} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      </div>
    </>
  )
}

export default ThDashboard
