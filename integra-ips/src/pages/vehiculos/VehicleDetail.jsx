import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  MdArrowBack, MdEdit, MdDelete, MdPrint, MdAdd, MdPhotoCamera, MdWarning, MdErrorOutline, MdVerifiedUser, MdBuild,
  MdAssignment, MdSpeed, MdClose, MdSave, MdAttachMoney
} from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { can } from '../../utils/permissions'
import { Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { resizeImage } from '../../utils/image'
import { VehicleForm } from './VehiclesPage'
import VehicleSheet from './VehicleSheet'
import { VehicleIcon, StatusPill, DocBadge, km, money, dateLabel, PHOTO_SLOTS, MAINT_TYPE, DOC_TYPES } from './common'

// ---------------------------------------------------------------- Documento (SOAT…)
const DocForm = ({ vehicleId, initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState({ docType: 'soat', entity: '', number: '', purchaseDate: '', expiryDate: '', price: '', notes: '', ...(initial || {}) })
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async () => {
    setError('')
    if (!f.expiryDate) return setError('La fecha de vencimiento es requerida.')
    setSaving(true)
    try {
      if (editing) await api.put(`/vehiculos/${vehicleId}/documentos/${initial.id}`, f)
      else await api.post(`/vehiculos/${vehicleId}/documentos`, f)
      onSaved()
    } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar documento' : 'Registrar SOAT / documento'} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <div className="field"><label>Tipo</label><select value={f.docType} onChange={set('docType')}>{Object.entries(DOC_TYPES).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field"><label>Aseguradora / entidad</label><input value={f.entity || ''} onChange={set('entity')} /></div>
        <div className="field"><label>N° de póliza</label><input value={f.number || ''} onChange={set('number')} /></div>
        <div className="field"><label>Precio (COP)</label><input type="number" min="0" value={f.price ?? ''} onChange={set('price')} /></div>
        <div className="field"><label>Fecha de compra</label><input type="date" value={f.purchaseDate || ''} onChange={set('purchaseDate')} /></div>
        <div className="field"><label>Fecha de vencimiento <span className="req">*</span></label><input type="date" value={f.expiryDate || ''} onChange={set('expiryDate')} /></div>
      </div>
      {error && <div className="alert bad" style={{ marginTop: 14 }}><MdErrorOutline /><span>{error}</span></div>}
    </Modal>
  )
}

// ---------------------------------------------------------------- Mantenimiento con repuestos
const MaintForm = ({ vehicle, initial, drivers, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => editing
    ? { ...initial, technician: initial.technician || '', driverId: initial.driver?.id || '', km: initial.km ?? '', nextDueDate: initial.nextDueDate || '', nextDueKm: initial.nextDueKm ?? '', parts: initial.parts.map((p) => ({ ...p })) }
    : { type: 'preventivo', date: new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()), km: vehicle.currentKm, description: '', workshop: '', technician: '', driverId: '', laborCost: '', nextDueDate: '', nextDueKm: '', notes: '', parts: [] })
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setPart = (i, k, v) => setF({ ...f, parts: f.parts.map((p, j) => (j === i ? { ...p, [k]: v } : p)) })
  const partsTotal = f.parts.reduce((a, p) => a + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0), 0)
  const total = partsTotal + (Number(f.laborCost) || 0)
  const submit = async () => {
    setError('')
    if (!f.description.trim()) return setError('Describe el mantenimiento.')
    setSaving(true)
    try {
      if (editing) await api.put(`/vehiculos/${vehicle.id}/mantenimientos/${initial.id}`, f)
      else await api.post(`/vehiculos/${vehicle.id}/mantenimientos`, f)
      onSaved()
    } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar mantenimiento' : 'Registrar mantenimiento'} onClose={onClose}
      footer={<><span style={{ marginRight: 'auto', fontWeight: 700 }}>Total: {money(total)}</span><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div className="field"><label>Tipo</label><select value={f.type} onChange={set('type')}><option value="preventivo">Preventivo</option><option value="correctivo">Correctivo</option></select></div>
          <div className="field"><label>Fecha</label><input type="date" value={f.date} onChange={set('date')} /></div>
          <div className="field"><label>Kilometraje</label><input type="number" min="0" step="1" value={f.km} onChange={set('km')} placeholder="45000" /></div>
          <div className="field span-all"><label>Descripción del trabajo <span className="req">*</span></label><textarea value={f.description} onChange={set('description')} style={{ minHeight: 64 }} /></div>
          <div className="field"><label>Taller</label><input value={f.workshop || ''} onChange={set('workshop')} /></div>
          <div className="field"><label>Realizado por (técnico del taller)</label><input value={f.technician} onChange={set('technician')} placeholder="Nombre del empleado del taller" /></div>
          <div className="field"><label>Conductor responsable</label>
            <select value={f.driverId} onChange={set('driverId')}>
              <option value="">Selecciona un conductor disponible…</option>
              {drivers.map((d) => {
                const keep = editing && initial.driver?.id === d.id
                return <option key={d.id} value={d.id} disabled={!!d.openTrip && !keep}>{d.name}{d.openTrip && !keep ? ` — en actividad (Móvil ${d.openTrip.movil})` : ''}</option>
              })}
            </select>
            <span className="hint">Quien llevó el vehículo al taller. Solo conductores sin actividad abierta.</span>
          </div>
          <div className="field"><label>Mano de obra (COP)</label><input type="number" min="0" value={f.laborCost} onChange={set('laborCost')} /></div>
          {f.type === 'preventivo' && <>
            <div className="field"><label>Próximo mantenimiento (fecha)</label><input type="date" value={f.nextDueDate} onChange={set('nextDueDate')} /></div>
            <div className="field"><label>Próximo mantenimiento (km)</label><input type="number" min="0" step="1" value={f.nextDueKm} onChange={set('nextDueKm')} placeholder={`Actual: ${vehicle.currentKm}`} /></div>
          </>}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="label">Repuestos / piezas</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setF({ ...f, parts: [...f.parts, { name: '', quantity: 1, unitPrice: '' }] })}><MdAdd /> Agregar pieza</button>
          </div>
          {f.parts.length === 0 ? <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>Sin repuestos.</p> : (
            <table className="table parts-table" style={{ border: '1px solid var(--line)', borderRadius: 10 }}>
              <thead><tr><th>Pieza</th><th style={{ width: 90 }}>Cant.</th><th style={{ width: 140 }}>Precio unit.</th><th className="num">Subtotal</th><th /></tr></thead>
              <tbody>
                {f.parts.map((p, i) => (
                  <tr key={i}>
                    <td><input className="input" value={p.name} onChange={(e) => setPart(i, 'name', e.target.value)} placeholder="Ej. Filtro de aceite" /></td>
                    <td><input className="input" type="number" min="1" value={p.quantity} onChange={(e) => setPart(i, 'quantity', e.target.value)} /></td>
                    <td><input className="input" type="number" min="0" value={p.unitPrice} onChange={(e) => setPart(i, 'unitPrice', e.target.value)} /></td>
                    <td className="num">{money((Number(p.quantity) || 0) * (Number(p.unitPrice) || 0))}</td>
                    <td><button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setF({ ...f, parts: f.parts.filter((_, j) => j !== i) })} aria-label="Quitar"><MdClose /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

const Spec = ({ label, children }) => <div className="spec"><span>{label}</span><strong>{children || '—'}</strong></div>

const VehicleDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const admin = can.manageVehicles(user.role)
  const [toast, toastNode] = useToast()
  const [v, setV] = useState(null)
  const [drivers, setDrivers] = useState([])
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [printing, setPrinting] = useState(false)
  const [uploading, setUploading] = useState('')
  const fileRef = useRef(null)
  const slotRef = useRef(null)

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/vehiculos/${id}`); setV(data) } catch (e) { setError(errorMessage(e)) }
  }, [id])
  useEffect(() => { load(); api.get('/vehiculos/conductores').then(({ data }) => setDrivers(data)).catch(() => {}) }, [load])

  const uploadPhoto = async (file) => {
    const slot = slotRef.current
    if (!file || !slot) return
    setUploading(slot)
    try {
      const image = await resizeImage(file, { max: 1280, type: 'image/jpeg', quality: 0.82 })
      await api.post(`/vehiculos/${v.id}/fotos`, { slot, image })
      await load(); toast('Foto actualizada')
    } catch (e) { toast(errorMessage(e), 'bad') } finally { setUploading(''); if (fileRef.current) fileRef.current.value = '' }
  }
  const removePhoto = async (slot) => {
    try { await api.delete(`/vehiculos/${v.id}/fotos/${slot}`); await load(); toast('Foto eliminada') } catch (e) { toast(errorMessage(e), 'bad') }
  }
  const del = async (url, msg) => {
    try { await api.delete(url); await load(); toast(msg); setModal(null) } catch (e) { toast(errorMessage(e), 'bad') }
  }

  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!v) return <div className="splash"><Spinner /> Cargando hoja de vida…</div>
  if (printing) return <VehicleSheet v={v} onBack={() => setPrinting(false)} />

  const soat = v.documents.filter((d) => d.docType === 'soat')[0]

  return (
    <>
      <div style={{ marginBottom: 14 }}><Link to="/socorro/vehiculos/flota" className="btn btn-ghost btn-sm"><MdArrowBack /> Vehículos</Link></div>

      <section className="card ev-hero">
        <div className="ev-hero-top">
          <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
            <span className="icon-bubble brand" style={{ width: 52, height: 52, fontSize: 28 }}><VehicleIcon type={v.vehicleType} /></span>
            <div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                <span className="badge navy">Móvil {v.movil}</span><span className="badge" style={{ background: '#FFD43B', color: '#111', fontFamily: 'monospace' }}>{v.plate}</span>
                <StatusPill status={v.status} /><DocBadge doc={soat} />
              </div>
              <h1 style={{ fontSize: 22 }}>{v.brand} {v.line}</h1>
              <span style={{ color: 'var(--muted)' }}>{v.vehicleType} · {v.modelYear || '—'} · {v.condition === 'nuevo' ? 'Nuevo (0 km)' : 'Usado'}</span>
            </div>
          </div>
          <div className="page-actions">
            {admin && <button type="button" className="btn btn-ghost" onClick={() => setModal({ vehicle: true })}><MdEdit /> Editar</button>}
            {admin && <button type="button" className="btn btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => setModal({ deleteVehicle: true })}><MdDelete /> Eliminar</button>}
            <button type="button" className="btn btn-outline" onClick={() => setPrinting(true)}><MdPrint /> Hoja de vida PDF</button>
          </div>
        </div>
        <div className="ev-info-grid">
          <div className="ev-info"><span className="icon-bubble brand"><MdSpeed /></span><div><span>Kilometraje actual</span><strong className="km-big">{km(v.currentKm)}</strong></div></div>
          <div className="ev-info"><span className="icon-bubble brand"><MdSpeed /></span><div><span>Km inicial · recorridos</span><strong>{km(v.initialKm)} · {km(v.totals.kmTraveled)}</strong></div></div>
          <div className="ev-info"><span className="icon-bubble brand"><MdBuild /></span><div><span>Gasto en mantenimiento</span><strong>{money(v.totals.maintenance)}</strong><small>Prev. {money(v.totals.preventive)} · Corr. {money(v.totals.corrective)}</small></div></div>
          <div className="ev-info"><span className="icon-bubble brand"><MdAttachMoney /></span><div><span>Gasto en SOAT y documentos</span><strong>{money(v.totals.documents)}</strong></div></div>
        </div>
      </section>

      {v.alerts.length > 0 && (
        <div className="stack" style={{ gap: 8, marginTop: 18 }}>
          {v.alerts.map((a, i) => <div key={i} className={`alert ${a.level}`}><MdWarning /><span><b>{a.message}</b>{a.date ? ` (${dateLabel(a.date)})` : ''}</span></div>)}
        </div>
      )}

      <div className="stack" style={{ marginTop: 18 }}>
        <Card title="Fotos del vehículo" subtitle={admin ? 'Frontal, laterales y trasera' : ''}>
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => uploadPhoto(e.target.files[0])} />
          <div className="gallery">
            {PHOTO_SLOTS.map(([slot, label]) => (
              <div key={slot} className="gallery-slot">
                {v.photos[slot] ? <img src={v.photos[slot]} alt={label} /> : <><VehicleIcon type={v.vehicleType} style={{ fontSize: 34, color: '#C4C8CE' }} /><span>Sin foto</span></>}
                <span className="tag">{label}</span>
                {admin && (
                  <div className="tools">
                    <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={`Cargar foto ${label}`} disabled={!!uploading}
                      onClick={() => { slotRef.current = slot; fileRef.current.click() }}>{uploading === slot ? <Spinner /> : <MdPhotoCamera />}</button>
                    {v.photos[slot] && <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={`Quitar foto ${label}`} onClick={() => removePhoto(slot)}><MdClose /></button>}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        <Card title="Hoja de vida" subtitle="Datos del vehículo">
          <div className="spec-grid">
            <Spec label="Móvil">{v.movil}</Spec><Spec label="Placa">{v.plate}</Spec><Spec label="Tipo">{v.vehicleType}</Spec>
            <Spec label="Marca">{v.brand}</Spec><Spec label="Línea / modelo">{v.line}</Spec><Spec label="Año">{v.modelYear}</Spec>
            <Spec label="Color">{v.color}</Spec><Spec label="Serial / VIN">{v.serial}</Spec><Spec label="N° de motor">{v.engineNumber}</Spec>
            <Spec label="Combustible">{v.fuelType}</Spec><Spec label="Fecha de compra">{dateLabel(v.purchaseDate)}</Spec><Spec label="Propietario">{v.owner}</Spec>
          </div>
          {v.notes && <p style={{ margin: '16px 0 0', color: 'var(--ink-2)' }}>{v.notes}</p>}
        </Card>

        <Card title="SOAT y documentos" icon={<MdVerifiedUser style={{ color: 'var(--brand)' }} />} flush
          actions={admin ? <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ doc: {} })}><MdAdd /> Registrar</button> : null}>
          {v.documents.length === 0 ? <Empty icon={<MdVerifiedUser />}>Sin documentos registrados.</Empty> : (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead><tr><th>Documento</th><th>Aseguradora</th><th>N° póliza</th><th>Compra</th><th>Vencimiento</th><th className="num">Precio</th><th>Estado</th>{admin && <th className="actions" />}</tr></thead>
                <tbody>
                  {v.documents.map((d, i) => {
                    const current = v.documents.findIndex((x) => x.docType === d.docType) === i
                    return (
                      <tr key={d.id} style={!current ? { opacity: .6 } : undefined}>
                        <td><strong style={{ color: 'var(--ink)' }}>{DOC_TYPES[d.docType]}</strong>{!current && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Histórico</div>}</td>
                        <td>{d.entity || '—'}</td><td>{d.number || '—'}</td><td>{dateLabel(d.purchaseDate)}</td><td>{dateLabel(d.expiryDate)}</td>
                        <td className="num">{money(d.price)}</td>
                        <td>{current ? <DocBadge doc={d} label={d.docType === 'soat' ? 'SOAT' : 'Vigencia'} /> : <span className="badge">Reemplazado</span>}</td>
                        {admin && <td className="actions">
                          <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ doc: d })}><MdEdit /></button>
                          <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ confirm: { url: `/vehiculos/${v.id}/documentos/${d.id}`, msg: 'Documento eliminado', text: `¿Eliminar el ${DOC_TYPES[d.docType]} que vence el ${dateLabel(d.expiryDate)}?` } })}><MdDelete /></button>
                        </td>}
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Mantenimientos" subtitle="Preventivos y correctivos con costos y repuestos" icon={<MdBuild style={{ color: 'var(--brand)' }} />} flush
          actions={admin ? <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ maint: {} })}><MdAdd /> Registrar</button> : null}>
          {v.maintenances.length === 0 ? <Empty icon={<MdBuild />}>Sin mantenimientos registrados.</Empty> : (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Trabajo realizado</th><th>Realizó / responsable</th><th className="num">Mano de obra</th><th className="num">Repuestos</th><th className="num">Total</th><th>Próximo</th>{admin && <th className="actions" />}</tr></thead>
                <tbody>
                  {v.maintenances.map((m) => (
                    <tr key={m.id}>
                      <td style={{ whiteSpace: 'nowrap' }}>{dateLabel(m.date)}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{km(m.km)}</div></td>
                      <td><span className={`badge ${MAINT_TYPE[m.type][1]}`}>{MAINT_TYPE[m.type][0]}</span></td>
                      <td style={{ whiteSpace: 'normal', minWidth: 220 }}><strong style={{ color: 'var(--ink)' }}>{m.description}</strong>
                        <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.workshop || ''}{m.parts.length ? ` · ${m.parts.map((p) => `${p.quantity}× ${p.name}`).join(', ')}` : ''}</div></td>
                      <td style={{ whiteSpace: 'normal', minWidth: 140 }}>{m.technician || '—'}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.driver ? `Llevó: ${m.driver.name}` : ''}</div></td>
                      <td className="num">{money(m.laborCost)}</td><td className="num">{money(m.partsCost)}</td><td className="num"><strong>{money(m.total)}</strong></td>
                      <td style={{ whiteSpace: 'nowrap', fontSize: 12.5 }}>{m.type === 'preventivo' ? <>{dateLabel(m.nextDueDate)}<div style={{ color: 'var(--muted)' }}>{m.nextDueKm ? km(m.nextDueKm) : ''}</div></> : '—'}</td>
                      {admin && <td className="actions">
                        <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ maint: m })}><MdEdit /></button>
                        <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ confirm: { url: `/vehiculos/${v.id}/mantenimientos/${m.id}`, msg: 'Mantenimiento eliminado', text: `¿Eliminar el mantenimiento del ${dateLabel(m.date)}?` } })}><MdDelete /></button>
                      </td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="Últimos reportes diarios" icon={<MdAssignment style={{ color: 'var(--brand)' }} />} flush>
          {v.trips.length === 0 ? <Empty icon={<MdAssignment />}>Sin reportes.</Empty> : (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead><tr><th>Reporte</th><th>Actividad</th><th>Conductor</th><th className="num">Salida</th><th className="num">Llegada</th><th className="num">Recorrido</th><th className="num">Combustible</th></tr></thead>
                <tbody>
                  {v.trips.map((t) => (
                    <tr key={t.id}>
                      <td>{can.driverReports(user.role) ? <Link to={`/socorro/vehiculos/reportes/${t.id}`} style={{ fontWeight: 600 }}>{t.code}</Link> : t.code}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{dateLabel(new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date(t.startedAt)))}</div></td>
                      <td style={{ whiteSpace: 'normal' }}>{t.activity}</td><td>{t.driver?.name}</td>
                      <td className="num">{km(t.kmOut)}</td><td className="num">{t.kmIn == null ? <span className="badge info">Abierto</span> : km(t.kmIn)}</td>
                      <td className="num"><strong>{t.kmDiff == null ? '—' : km(t.kmDiff)}</strong></td><td className="num">{t.fuelValue ? money(t.fuelValue) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {modal?.vehicle && <VehicleForm initial={v} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); toast('Hoja de vida actualizada') }} />}
      {modal?.doc && <DocForm vehicleId={v.id} initial={modal.doc.id ? modal.doc : null} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); toast('Documento guardado') }} />}
      {modal?.maint && <MaintForm vehicle={v} initial={modal.maint.id ? modal.maint : null} drivers={drivers} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); toast('Mantenimiento guardado') }} />}
      {modal?.confirm && (
        <Modal title="Confirmar" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={() => del(modal.confirm.url, modal.confirm.msg)}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>{modal.confirm.text} Esta acción no se puede deshacer.</p>
        </Modal>
      )}
      {modal?.deleteVehicle && (
        <Modal title="Eliminar vehículo" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={async () => { try { await api.delete(`/vehiculos/${v.id}`); navigate('/socorro/vehiculos/flota') } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) } }}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar la hoja de vida de la <b>Móvil {v.movil} ({v.plate})</b>? Si ya tiene reportes diarios no se podrá eliminar; márcala como "fuera de servicio".</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default VehicleDetail
