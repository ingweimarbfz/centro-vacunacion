import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import ServiceTabs, { serviceLabel } from './ServiceTabs'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from 'recharts'
import { MdFolderShared, MdDescription, MdWarning, MdEventBusy, MdFolderOff, MdCategory, MdErrorOutline, MdUploadFile, MdMedicalServices } from 'react-icons/md'
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
  const [params, setParams] = useSearchParams()
  // 'todos' = toda la IPS; 'general' = documentos generales; <id> = el árbol de ese servicio.
  const svc = params.get('servicio') || 'todos'
  const pick = (v) => setParams(v === 'todos' ? {} : { servicio: v })
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { setD(null); api.get('/calidad/resumen', { params: { servicio: svc === 'todos' ? undefined : svc } }).then(({ data }) => setD(data)).catch((e) => setErr(errorMessage(e))) }, [svc])
  const docsLink = (extra = {}, service = svc) => { const q = new URLSearchParams({ ...(service && service !== 'todos' && service !== 'general' ? { servicio: service } : {}), ...extra }).toString(); return `/estandares/doc-generales/documentos${q ? `?${q}` : ''}` }
  if (err) return <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>
  if (!d) return <div className="splash"><Spinner /></div>
  const k = d.kpis
  const scopeName = svc === 'todos' ? 'toda la IPS' : serviceLabel(d.services, svc)
  return (
    <>
      <PageHead title="Doc. Generales" subtitle={`Resumen de los documentos de calidad y habilitación · ${scopeName}`}>
        <Link to={docsLink()} className="btn btn-primary"><MdUploadFile /> Ir a documentos</Link>
      </PageHead>
      <ServiceTabs services={d.services} value={svc} onChange={pick} allValue="todos" />
      <div className="stack">
        <div className="grid grid-kpi">
          <Kpi label="Documentos" value={k.documentos} foot={`${k.items} ítems principales · ${k.carpetas} carpetas`} icon={<MdDescription />} />
          <Kpi label="Carpetas sin documentos" value={k.sinCargar} foot="Pendientes por cargar" icon={<MdFolderOff />} tone={k.sinCargar ? 'warn' : 'ok'} />
          <Kpi label="Por vencer" value={k.porVencer} foot="En los próximos 30 días" icon={<MdWarning />} tone={k.porVencer ? 'warn' : 'ok'} />
          <Kpi label="Vencidos" value={k.vencidos} foot="Actualízalos" icon={<MdEventBusy />} tone={k.vencidos ? 'warn' : 'ok'} />
        </div>
        <Card flush title="Documentos por servicio" subtitle="Cada servicio tiene su propio árbol de carpetas. Toca una fila para ver solo ese servicio." icon={<MdMedicalServices style={{ color: 'var(--brand)' }} />}>
          <div className="table-wrap"><table className="table qd-svc-table">
            <thead><tr><th>Servicio</th><th className="num">Ítems</th><th className="num">Carpetas</th><th className="num">Documentos</th><th className="num">Carpetas vacías</th><th>Vigencia</th></tr></thead>
            <tbody>{d.byService.map((x) => {
              const v = x.id == null ? 'general' : String(x.id)
              return (
                <tr key={v} className={svc === v ? 'on' : ''} style={{ cursor: 'pointer' }} onClick={() => pick(v)}>
                  <td><strong style={{ color: 'var(--ink)' }}>{x.name}</strong></td>
                  <td className="num">{x.items}</td>
                  <td className="num">{x.carpetas}</td>
                  <td className="num"><strong>{x.documentos}</strong></td>
                  <td className="num">{x.sinCargar ? <span className="badge warn">{x.sinCargar}</span> : '0'}</td>
                  <td>{x.items === 0 ? <span className="hint">Sin árbol de carpetas</span> : x.vencidos ? <span className="badge bad">{x.vencidos} vencido{x.vencidos === 1 ? '' : 's'}</span> : x.porVencer ? <span className="badge warn">{x.porVencer} por vencer</span> : <span className="hint">Al día</span>}</td>
                </tr>
              )
            })}</tbody>
          </table></div>
        </Card>
        <div className="qd-dash-top">
          <Card flush title="Documentos por ítem principal" icon={<MdFolderShared style={{ color: 'var(--brand)' }} />}>
            {d.byItem.length === 0 ? <Empty icon={<MdFolderShared />}>Aún no hay ítems principales{svc === 'todos' ? '' : ` en ${scopeName}`}.</Empty> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Ítem</th><th>Tipo</th><th className="num">Documentos</th><th className="num">Carpetas vacías</th><th>Vigencia</th></tr></thead>
                <tbody>{d.byItem.map((x) => (
                  <tr key={x.id} style={{ cursor: 'pointer' }} onClick={() => navigate(docsLink({ carpeta: x.id }, x.serviceId == null ? 'general' : String(x.serviceId)))}>
                    <td><strong style={{ color: 'var(--ink)' }}>{x.code ? `${x.code}. ` : ''}{x.name}</strong>{svc === 'todos' && <div className="hint">{x.serviceId == null ? 'Generales' : serviceLabel(d.services, x.serviceId)}</div>}</td>
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
