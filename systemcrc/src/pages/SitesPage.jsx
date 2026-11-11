import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdAdd, MdEdit, MdDelete, MdAccountTree, MdErrorOutline, MdLocalHospital, MdPeople, MdEmergency, MdDirectionsCar, MdMedicalServices, MdBadge, MdWarehouse } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { SITE_TYPES } from '../utils/permissions'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../components/ui'

const EMPTY = { type: 'unidad_municipal', name: '', municipality: '', parentId: '', address: '', phone: '', email: '', serviceIds: [], active: true }
const TYPE_TONE = { seccional: 'brand', unidad_municipal: 'navy', grupo_apoyo: 'info' }

const SiteForm = ({ initial, seccionales, services, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => (editing ? { ...EMPTY, ...Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v ?? ''])), serviceIds: (initial.services || []).map((x) => x.id) } : { ...EMPTY, parentId: seccionales[0]?.id || '' }))
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const toggleService = (k) => setF({ ...f, serviceIds: f.serviceIds.includes(k) ? f.serviceIds.filter((x) => x !== k) : [...f.serviceIds, k] })
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.name.trim() || !f.municipality.trim()) return setError('Nombre y municipio son requeridos.')
    if (f.type !== 'seccional' && !f.parentId) return setError('Selecciona la seccional a la que pertenece.')
    setSaving(true)
    try {
      const { data } = editing ? await api.put(`/sedes/${initial.id}`, f) : await api.post('/sedes', f)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? `Editar ${initial.name}` : 'Nueva sede'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="site-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} Guardar</button></>}>
      <form id="site-form" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="field"><label>Tipo de sede</label><select value={f.type} onChange={set('type')}>{Object.entries(SITE_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          {f.type !== 'seccional'
            ? <div className="field"><label>Pertenece a la seccional</label><select value={f.parentId} onChange={set('parentId')}><option value="">Selecciona…</option>{seccionales.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
            : <div />}
          <div className="field"><label>Nombre <span className="req">*</span></label><input value={f.name} onChange={set('name')} placeholder="Ej. Unidad Municipal Aguachica" autoFocus /></div>
          <div className="field"><label>Municipio <span className="req">*</span></label><input value={f.municipality} onChange={set('municipality')} /></div>
          <div className="field"><label>Dirección</label><input value={f.address} onChange={set('address')} /></div>
          <div className="field"><label>Teléfono</label><input value={f.phone} onChange={set('phone')} inputMode="numeric" /></div>
          <div className="field span-all"><label>Correo</label><input type="email" value={f.email} onChange={set('email')} /></div>
          <div className="field span-all">
            <label>Servicios de IPS habilitados</label>
            <div className="rc-checks" style={{ marginTop: 6 }}>
              {services.map((x) => (
                <label key={x.id} className={`rc-check${f.serviceIds.includes(x.id) ? ' on' : ''}`}><input type="checkbox" checked={f.serviceIds.includes(x.id)} onChange={() => toggleService(x.id)} /> {x.name}{x.active ? '' : ' (inactivo)'}</label>
              ))}
            </div>
            <span className="hint">{f.serviceIds.length ? 'La sede contará con IPS.' : 'Sin servicios: la sede no tiene IPS.'} Los servicios se crean en <Link to="/servicios-ips">Servicios de IPS</Link>.</span>
          </div>
          <div className="field span-all"><label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Sede activa' : 'Sede inactiva (sus usuarios no podrán ingresar)'}</label></div>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

const Stat = ({ icon, value, label }) => (
  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 12.5, color: 'var(--ink-2)' }} title={label}>{icon}<b>{value}</b> <span style={{ color: 'var(--muted)' }}>{label}</span></span>
)

const SitesPage = () => {
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [services, setServices] = useState([])
  useEffect(() => { api.get('/servicios-ips').then(({ data }) => setServices(data)).catch(() => {}) }, [])
  const load = useCallback(() => api.get('/sedes-resumen', { params: { sede: undefined } }).then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))), [])
  useEffect(() => { load() }, [load])

  const seccionales = (rows || []).filter((s) => s.type === 'seccional')
  const remove = async () => {
    try { await api.delete(`/sedes/${modal.delete.id}`, { params: { sede: undefined } }); toast('Sede eliminada'); setModal(null); load() } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) }
  }

  return (
    <>
      <PageHead title="Sedes" subtitle="Seccionales, unidades municipales y grupos de apoyo: servicios de IPS y bodegas de cada una">
        <button type="button" className="btn btn-primary" onClick={() => setModal({ edit: {} })}><MdAdd /> Nueva sede</button>
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : rows.length === 0 ? <Card><Empty icon={<MdAccountTree />}>Sin sedes registradas.</Empty></Card> : (
        <div className="stack">
          {seccionales.map((sec) => {
            const children = rows.filter((s) => s.parentId === sec.id)
            return (
              <Card key={sec.id} flush title={sec.name} subtitle={`Seccional · ${sec.municipality} · ${children.length} unidades y grupos`} icon={<MdAccountTree style={{ color: 'var(--brand)' }} />}>
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="table">
                    <thead><tr><th>Sede</th><th>Tipo</th><th>IPS, servicios y bodega</th><th>Personal y recursos</th><th>Estado</th><th className="actions" /></tr></thead>
                    <tbody>
                      {[sec, ...children].map((s) => (
                        <tr key={s.id}>
                          <td><strong style={{ color: 'var(--ink)' }}>{s.name}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.municipality}{s.phone ? ` · ${s.phone}` : ''}</div></td>
                          <td><span className={`badge ${TYPE_TONE[s.type]}`}>{SITE_TYPES[s.type]}</span></td>
                          <td style={{ whiteSpace: 'normal' }}>{s.hasIps
                            ? <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}><span className="badge ok"><MdLocalHospital /> IPS</span>{s.services.map((x) => <span key={x.id} className="badge">{x.name}</span>)}</div>
                            : <span className="badge">Sin IPS</span>}
                            <Link to="/bodegas" style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4, display: 'flex', alignItems: 'center', gap: 4 }}><MdWarehouse /> {s.warehouses.length ? s.warehouses.map((w) => w.name + (w.isGeneral ? ' (general)' : '')).join(', ') : 'Sin bodegas'}</Link></td>
                          <td><div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            <Stat icon={<MdPeople />} value={s.employees} label="empl." /><Stat icon={<MdBadge />} value={s.volunteers} label="volunt." />
                            <Stat icon={<MdEmergency />} value={s.openEvents} label="eventos en curso" /><Stat icon={<MdDirectionsCar />} value={s.vehicles} label="vehíc." /><Stat icon={<MdMedicalServices />} value={s.equipment} label="equipos" />
                          </div></td>
                          <td>{s.active ? <span className="badge ok"><span className="dot" /> Activa</span> : <span className="badge"><span className="dot" /> Inactiva</span>}</td>
                          <td className="actions">
                            <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ edit: s })}><MdEdit /></button>
                            <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delete: s })}><MdDelete /></button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )
          })}
        </div>
      )}
      {modal?.edit && <SiteForm initial={modal.edit.id ? modal.edit : null} seccionales={seccionales} services={services} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); load(); toast(e ? 'Sede actualizada' : 'Sede creada') }} />}
      {modal?.delete && (
        <Modal title="Eliminar sede" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={remove}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar <b>{modal.delete.name}</b>? Si tiene usuarios, voluntarios o registros no se podrá eliminar; desactívala en su lugar.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default SitesPage
