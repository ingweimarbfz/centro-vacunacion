import React, { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdDelete, MdSave, MdErrorOutline, MdAcUnit, MdPhone, MdEmail, MdPerson, MdPlace } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { Card, Modal, Empty, Spinner, useToast } from '../components/ui'
import { EntityForm } from './facturacion/ProvidersPage'
import './facturacion/facturacion.css'

// Datos de contacto de un proveedor (se reusa en la alerta del dashboard).
export const ProviderContact = ({ p }) => (
  <div className="provider-contact">
    {p.contactName && <span><MdPerson style={{ verticalAlign: -2 }} /> {p.contactName}</span>}
    {p.phone && <span><MdPhone style={{ verticalAlign: -2 }} /> <a href={`tel:${p.phone.replace(/\s/g, '')}`}>{p.phone}</a></span>}
    {p.email && <span><MdEmail style={{ verticalAlign: -2 }} /> <a href={`mailto:${p.email}`}>{p.email}</a></span>}
    {(p.address || p.city) && <span><MdPlace style={{ verticalAlign: -2 }} /> {[p.address, p.city].filter(Boolean).join(', ')}</span>}
    {!p.contactName && !p.phone && !p.email && <span className="hint">Sin datos de contacto: complétalos en Facturación → Proveedores.</span>}
  </div>
)

const AssignForm = ({ equipment, services, providers, onClose, onSaved, onNewProvider }) => {
  const [f, setF] = useState({ equipmentId: equipment[0] ? String(equipment[0].id) : '', entityId: '', service: 'mantenimiento', notes: '' })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { if (providers.length && !f.entityId) setF((x) => ({ ...x, entityId: String(providers[0].id) })) }, [providers, f.entityId])
  const save = async () => {
    setErr('')
    if (!f.equipmentId || !f.entityId) return setErr('Elige el equipo y el proveedor.')
    setBusy(true)
    try { await api.post('/temperatura/proveedores', f); onSaved() } catch (e) { setErr(errorMessage(e)); setBusy(false) }
  }
  return (
    <Modal title="Asignar proveedor a un equipo" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        <div className="field"><label>Equipo de cadena de frío <span className="req">*</span></label>
          <select value={f.equipmentId} onChange={(e) => setF({ ...f, equipmentId: e.target.value })}>
            {equipment.map((e) => <option key={e.id} value={e.id}>{e.name}{e.siteName ? ` · ${e.siteName}` : ''}</option>)}
          </select>
          <span className="hint">Neveras, congeladores, aires y planta eléctrica registrados en la hoja de vida de equipos.</span>
        </div>
        <div className="field"><label>Proveedor <span className="req">*</span></label>
          <div style={{ display: 'flex', gap: 8 }}>
            <select value={f.entityId} onChange={(e) => setF({ ...f, entityId: e.target.value })} style={{ flex: 1, minWidth: 0 }}>
              {!providers.length && <option value="">Aún no hay proveedores</option>}
              {providers.map((p) => <option key={p.id} value={p.id}>{p.name}{p.phone ? ` · ${p.phone}` : ''}</option>)}
            </select>
            <button type="button" className="btn btn-outline" onClick={onNewProvider}><MdAdd /> Nuevo</button>
          </div>
        </div>
        <div className="field"><label>Servicio que presta</label>
          <select value={f.service} onChange={(e) => setF({ ...f, service: e.target.value })}>{Object.entries(services).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        </div>
        <div className="field"><label>Observaciones</label><input value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} placeholder="Ej: contrato de mantenimiento vigente hasta junio" /></div>
        {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
      </div>
    </Modal>
  )
}

// Cadena de frío → Configuración: proveedores de los equipos que conservan la cadena de frío.
const ColdChainSuppliers = () => {
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null); const [eq, setEq] = useState({ equipment: [], services: {} }); const [providers, setProviders] = useState([])
  const [modal, setModal] = useState(null)
  const load = useCallback(() => Promise.all([
    api.get('/temperatura/proveedores').then(({ data }) => setRows(data)),
    api.get('/temperatura/equipos-frio').then(({ data }) => setEq(data)),
    api.get('/proveedores').then(({ data }) => setProviders(data.filter((p) => p.active).sort((a, b) => Number(b.categories.includes('cadena_frio')) - Number(a.categories.includes('cadena_frio')))))
  ]).catch((e) => toast(errorMessage(e), 'bad')), [toast])
  useEffect(() => { load() }, [load])
  const remove = async (r) => { try { await api.delete(`/temperatura/proveedores/${r.id}`); toast('Proveedor quitado del equipo'); load() } catch (e) { toast(errorMessage(e), 'bad') } }
  return (
    <div style={{ marginTop: 18 }}>
      <Card flush title="Proveedores de los equipos de cadena de frío" icon={<MdAcUnit style={{ color: 'var(--brand)' }} />}
        subtitle="Si una lectura supera la temperatura máxima, el dashboard muestra a quién contactar"
        actions={<button type="button" className="btn btn-primary btn-sm" disabled={!eq.equipment.length} onClick={() => setModal('assign')}><MdAdd /> Asignar proveedor</button>}>
        {!rows ? <div className="splash" style={{ minHeight: 80 }}><Spinner /></div> : !eq.equipment.length ? <Empty icon={<MdAcUnit />}>Registra primero las neveras en Equipos e infraestructura → Hoja de vida de equipos (categoría refrigeración).</Empty> : rows.length === 0 ? <Empty icon={<MdAcUnit />}>Aún no hay proveedores asignados a los equipos.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Equipo</th><th>Proveedor</th><th>Contacto</th><th className="actions" /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td><strong style={{ color: 'var(--ink)' }}>{r.equipment.name}</strong><div className="hint">{[r.equipment.siteName, r.equipment.brand, r.equipment.model].filter(Boolean).join(' · ')}</div></td>
                <td><strong style={{ color: 'var(--ink)' }}>{r.provider.name}</strong><div className="hint">{[r.serviceLabel, r.provider.nit && `NIT ${r.provider.nit}`].filter(Boolean).join(' · ')}</div>{r.notes && <div className="hint">{r.notes}</div>}</td>
                <td><ProviderContact p={r.provider} /></td>
                <td className="actions"><button type="button" className="btn btn-ghost btn-icon" aria-label="Quitar" style={{ color: 'var(--bad)' }} onClick={() => remove(r)}><MdDelete /></button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      {modal === 'assign' && <AssignForm equipment={eq.equipment} services={eq.services} providers={providers} onClose={() => setModal(null)} onSaved={() => { setModal(null); toast('Proveedor asignado'); load() }} onNewProvider={() => setModal('provider')} />}
      {modal === 'provider' && <EntityForm defaultCategories={['cadena_frio', 'mantenimiento']} onClose={() => setModal('assign')} onSaved={(p) => { setProviders((list) => [p, ...list]); toast('Proveedor creado'); setModal('assign') }} />}
      {toastNode}
    </div>
  )
}

export default ColdChainSuppliers
