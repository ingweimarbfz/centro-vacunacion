import React, { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { MdFolderShared, MdDescription, MdWarning, MdEventBusy, MdFolderOff, MdCategory, MdErrorOutline, MdUploadFile } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { FileIcon, VAL, date } from '../estandares/StdDocumentsPage'
import './calidad.css'

const Kpi = ({ label, value, foot, icon, tone = '' }) => (
  <div className="card kpi"><div className="kpi-top"><span className="kpi-label">{label}</span><span className={`kpi-icon ${tone}`}>{icon}</span></div><div className="kpi-value" style={{ fontSize: 24 }}>{value}</div>{foot && <div className="kpi-foot">{foot}</div>}</div>
)

// Calidad IPS → Doc. Generales → Dashboard: documentos por ítem, vigencias y cargas recientes.
const DocGeneralesDashboard = () => {
  const navigate = useNavigate()
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api.get('/calidad/resumen').then(({ data }) => setD(data)).catch((e) => setErr(errorMessage(e))) }, [])
  if (err) return <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>
  if (!d) return <div className="splash"><Spinner /></div>
  const k = d.kpis
  return (
    <>
      <PageHead title="Doc. Generales" subtitle="Resumen de los documentos de calidad por ítem principal">
        <Link to="/estandares/doc-generales/documentos" className="btn btn-primary"><MdUploadFile /> Ir a documentos</Link>
      </PageHead>
      <div className="stack">
        <div className="grid grid-kpi">
          <Kpi label="Documentos" value={k.documentos} foot={`${k.items} ítems principales · ${k.carpetas} carpetas`} icon={<MdDescription />} />
          <Kpi label="Carpetas sin documentos" value={k.sinCargar} foot="Pendientes por cargar" icon={<MdFolderOff />} tone={k.sinCargar ? 'warn' : 'ok'} />
          <Kpi label="Por vencer" value={k.porVencer} foot="En los próximos 30 días" icon={<MdWarning />} tone={k.porVencer ? 'warn' : 'ok'} />
          <Kpi label="Vencidos" value={k.vencidos} foot="Actualízalos" icon={<MdEventBusy />} tone={k.vencidos ? 'warn' : 'ok'} />
        </div>
        <div className="qd-dash-top">
          <Card flush title="Documentos por ítem principal" icon={<MdFolderShared style={{ color: 'var(--brand)' }} />}>
            {d.byItem.length === 0 ? <Empty icon={<MdFolderShared />}>Aún no hay ítems principales.</Empty> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Ítem</th><th>Tipo</th><th className="num">Documentos</th><th className="num">Carpetas vacías</th><th>Vigencia</th></tr></thead>
                <tbody>{d.byItem.map((x) => (
                  <tr key={x.id} style={{ cursor: 'pointer' }} onClick={() => navigate(`/estandares/doc-generales/documentos?carpeta=${x.id}`)}>
                    <td><strong style={{ color: 'var(--ink)' }}>{x.code ? `${x.code}. ` : ''}{x.name}</strong></td>
                    <td><span className="badge">{x.kind}</span></td>
                    <td className="num"><strong>{x.documentos}</strong></td>
                    <td className="num">{x.carpetasVacias ? <span className="badge warn">{x.carpetasVacias}</span> : '0'}</td>
                    <td>{x.vencidos ? <span className="badge bad">{x.vencidos} vencido{x.vencidos === 1 ? '' : 's'}</span> : x.porVencer ? <span className="badge warn">{x.porVencer} por vencer</span> : <span className="hint">Al día</span>}</td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </Card>
          <Card title="Documentos por tipo de archivo" icon={<MdCategory style={{ color: 'var(--brand)' }} />}>
            <div style={{ width: '100%', height: 220 }}><ResponsiveContainer>
              <BarChart data={d.byType} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 11 }} width={30} />
                <Tooltip /><Bar dataKey="value" name="Documentos" fill="var(--brand)" radius={[4, 4, 0, 0]} isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer></div>
          </Card>
        </div>
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <Card flush title="Vencidos y por vencer">
            {d.expiring.length === 0 ? <Empty icon={<MdEventBusy />}>Ningún documento vencido ni por vencer.</Empty> : (
              <ul className="list" style={{ padding: '4px 20px 8px' }}>{d.expiring.map((x) => (
                <li key={x.id}><FileIcon ext={x.fileExt} /><div className="grow"><strong>{x.name}</strong><span>{x.folderPath}</span></div><span className={`badge ${VAL[x.validity][1]}`}>{VAL[x.validity][0]} {x.validUntil.split('-').reverse().join('/')}</span></li>
              ))}</ul>
            )}
          </Card>
          <Card flush title="Cargados recientemente">
            {d.recent.length === 0 ? <Empty icon={<MdDescription />}>Aún no hay documentos.</Empty> : (
              <ul className="list" style={{ padding: '4px 20px 8px' }}>{d.recent.map((x) => (
                <li key={x.id}><FileIcon ext={x.fileExt} /><div className="grow"><strong>{x.name}</strong><span>{x.folderPath} · {date(x.createdAt)}{x.createdBy ? ` · ${x.createdBy}` : ''}</span></div></li>
              ))}</ul>
            )}
          </Card>
        </div>
      </div>
    </>
  )
}

export default DocGeneralesDashboard
