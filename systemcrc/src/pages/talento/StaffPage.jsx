import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MdAdd, MdSearch, MdFolderShared, MdErrorOutline, MdPerson, MdWarning } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Empty, Spinner, useToast } from '../../components/ui'
import StaffForm from './StaffForm'
import { CONTRACT_STATUS, StatusBadge, Percent, useCatalogs } from './common'

// Hojas de vida del talento humano: búsqueda, filtros y acceso a cada profesional.
const StaffPage = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const cat = useCatalogs()
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [cargo, setCargo] = useState('')
  const [estado, setEstado] = useState('activos')
  const [alerta, setAlerta] = useState(params.get('alerta') === '1')
  const [creating, setCreating] = useState(false)
  const load = useCallback(async () => {
    setError('')
    try { const { data } = await api.get('/estandares/th/personal', { params: { q: q || undefined, cargo: cargo || undefined, estado: estado || undefined, alerta: alerta ? 1 : undefined } }); setRows(data) } catch (e) { setError(errorMessage(e)); setRows([]) }
  }, [q, cargo, estado, alerta])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])

  return (
    <>
      <PageHead title="Hojas de vida" subtitle="Estándar de talento humano: datos del profesional, soportes, contratos y verificación">
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><MdAdd /> Nueva hoja de vida</button>
      </PageHead>
      <Card flush>
        <div className="table-toolbar">
          <div className="input-icon"><MdSearch /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, documento, cargo o profesión" /></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="input" style={{ width: 210 }} value={cargo} onChange={(e) => setCargo(e.target.value)} aria-label="Cargo"><option value="">Todos los cargos</option>{(cat?.positions || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
            <select className="input" style={{ width: 150 }} value={estado} onChange={(e) => setEstado(e.target.value)} aria-label="Estado"><option value="activos">Activos y por eventos</option><option value="activo">Activos</option><option value="por_eventos">Por eventos</option><option value="inactivos">Inactivos</option><option value="">Todos</option></select>
            <label className="switch"><input type="checkbox" checked={alerta} onChange={(e) => setAlerta(e.target.checked)} /> Solo con alertas</label>
          </div>
        </div>
        {error && <div className="alert bad" style={{ margin: 16 }}><MdErrorOutline /><span>{error}</span></div>}
        {!rows ? <div className="splash" style={{ minHeight: 160 }}><Spinner /></div> : rows.length === 0 ? <Empty icon={<MdFolderShared />}>No hay hojas de vida con esos filtros.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Profesional</th><th>Cargo</th><th>Sede</th><th>Requisitos</th><th>Contrato</th><th>Alertas</th></tr></thead>
            <tbody>{rows.map((r) => {
              const alerts = r.compliance.missing + r.compliance.expired + r.expiringDocs.length
              return (
                <tr key={r.id} className="th-row" onClick={() => navigate(`/estandares/talento-humano/personal/${r.id}`)}>
                  <td><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="th-avatar sm">{r.photoUrl ? <img src={r.photoUrl} alt="" /> : <MdPerson />}</span>
                    <div><strong style={{ color: 'var(--ink)' }}>{r.fullName}</strong>{r.status !== 'activo' && <span className="badge" style={{ marginLeft: 6 }}>{r.statusLabel}</span>}<div className="hint">{r.documentType} {r.document}{r.profession ? ` · ${r.profession}` : ''}</div></div>
                  </div></td>
                  <td>{r.positionName || <span className="badge warn">Sin cargo</span>}{r.assignedService && <div className="hint">{r.assignedService}</div>}</td>
                  <td>{r.siteName}</td>
                  <td style={{ minWidth: 140 }}><Percent value={r.compliance.percent} /></td>
                  <td><StatusBadge status={r.contract?.status || 'sin_contrato'} map={CONTRACT_STATUS} days={r.contract?.daysLeft} /></td>
                  <td>{alerts ? <span className="badge bad"><MdWarning /> {alerts}</span> : <span className="badge ok">Al día</span>}</td>
                </tr>
              )
            })}</tbody>
          </table></div>
        )}
      </Card>
      {creating && <StaffForm onClose={() => setCreating(false)} onSaved={(d) => { setCreating(false); toast('Hoja de vida creada'); navigate(`/estandares/talento-humano/personal/${d.id}`) }} />}
      {toastNode}
    </>
  )
}

export default StaffPage
