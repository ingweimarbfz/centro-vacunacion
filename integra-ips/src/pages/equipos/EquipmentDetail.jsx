import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MdArrowBack, MdEdit, MdDelete, MdPrint, MdAdd, MdPhotoCamera, MdWarning, MdErrorOutline, MdBuild, MdClose, MdSave, MdEvent, MdVerifiedUser, MdInventory2 } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { can } from '../../utils/permissions'
import { Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { resizeImage } from '../../utils/image'
import { money, dateLabel } from '../vehiculos/common'
import { EquipmentForm } from './EquipmentPage'
import EquipmentSheet from './EquipmentSheet'
import { CATEGORY, RESPONSIBLE, RESULT, CategoryIcon, StatusBadge, NextBadge, WarrantyBadge } from './common'

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())

const MaintForm = ({ eq, initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => editing
    ? { ...initial, company: initial.company || '', reportNumber: initial.reportNumber || '', nextDueDate: initial.nextDueDate || '', notes: initial.notes || '', parts: initial.parts.map((p) => ({ ...p })) }
    : { type: 'preventivo', date: today(), description: '', responsibleType: eq.category === 'biomedico' || eq.category === 'refrigeracion' ? 'biomedico' : 'taller', responsibleName: '', company: '', reportNumber: '', laborCost: '', result: 'operativo', nextDueDate: '', notes: '', parts: [] })
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const setPart = (i, k, v) => setF({ ...f, parts: f.parts.map((p, j) => (j === i ? { ...p, [k]: v } : p)) })
  const total = f.parts.reduce((a, p) => a + (Number(p.quantity) || 0) * (Number(p.unitPrice) || 0), 0) + (Number(f.laborCost) || 0)
  const submit = async () => {
    setError('')
    if (!f.description.trim()) return setError('Describe el trabajo realizado.')
    if (!f.responsibleName.trim()) return setError('Indica el nombre del responsable.')
    setSaving(true)
    try {
      if (editing) await api.put(`/equipos/${eq.id}/mantenimientos/${initial.id}`, f)
      else await api.post(`/equipos/${eq.id}/mantenimientos`, f)
      onSaved()
    } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar mantenimiento' : `Registrar mantenimiento · ${eq.code}`} onClose={onClose}
      footer={<><span style={{ marginRight: 'auto', fontWeight: 700 }}>Total: {money(total)}</span><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div className="field"><label>Tipo</label><select value={f.type} onChange={set('type')}><option value="preventivo">Preventivo</option><option value="correctivo">Correctivo</option></select></div>
          <div className="field"><label>Fecha</label><input type="date" value={f.date} max={today()} onChange={set('date')} /></div>
          <div className="field"><label>N° de reporte / orden</label><input value={f.reportNumber} onChange={set('reportNumber')} /></div>
          <div className="field span-all"><label>Trabajo realizado <span className="req">*</span></label><textarea value={f.description} onChange={set('description')} style={{ minHeight: 64 }} /></div>
          <div className="field"><label>Realizado por</label><select value={f.responsibleType} onChange={set('responsibleType')}>{Object.entries(RESPONSIBLE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Nombre del responsable <span className="req">*</span></label><input value={f.responsibleName} onChange={set('responsibleName')} placeholder={f.responsibleType === 'biomedico' ? 'Ing. …' : 'Técnico que lo realizó'} /></div>
          <div className="field"><label>{f.responsibleType === 'taller' ? 'Taller / empresa' : 'Empresa (opcional)'}</label><input value={f.company} onChange={set('company')} /></div>
          <div className="field"><label>Mano de obra (COP)</label><input type="number" min="0" value={f.laborCost} onChange={set('laborCost')} /></div>
          <div className="field"><label>Resultado</label><select value={f.result} onChange={set('result')}>{Object.entries(RESULT).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select><span className="hint">Actualiza el estado del equipo</span></div>
          {f.type === 'preventivo' && <div className="field"><label>Próximo preventivo</label><input type="date" value={f.nextDueDate} min={f.date} onChange={set('nextDueDate')} /><span className="hint">{eq.maintenanceMonths ? `Vacío = cada ${eq.maintenanceMonths} meses` : 'Opcional'}</span></div>}
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <span className="label">Repuestos / piezas</span>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => setF({ ...f, parts: [...f.parts, { name: '', quantity: 1, unitPrice: '' }] })}><MdAdd /> Agregar pieza</button>
          </div>
          {f.parts.length === 0 ? <p style={{ margin: 0, color: 'var(--muted)', fontSize: 13 }}>Sin repuestos.</p> : (
            <table className="table parts-table" style={{ border: '1px solid var(--line)', borderRadius: 10 }}>
              <thead><tr><th>Pieza</th><th style={{ width: 90 }}>Cant.</th><th style={{ width: 140 }}>Precio unit.</th><th className="num">Subtotal</th><th /></tr></thead>
              <tbody>{f.parts.map((p, i) => (
                <tr key={i}>
                  <td><input className="input" value={p.name} onChange={(e) => setPart(i, 'name', e.target.value)} /></td>
                  <td><input className="input" type="number" min="1" value={p.quantity} onChange={(e) => setPart(i, 'quantity', e.target.value)} /></td>
                  <td><input className="input" type="number" min="0" value={p.unitPrice} onChange={(e) => setPart(i, 'unitPrice', e.target.value)} /></td>
                  <td className="num">{money((Number(p.quantity) || 0) * (Number(p.unitPrice) || 0))}</td>
                  <td><button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setF({ ...f, parts: f.parts.filter((_, j) => j !== i) })} aria-label="Quitar"><MdClose /></button></td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

const Spec = ({ label, children }) => <div className="spec"><span>{label}</span><strong>{children || '—'}</strong></div>

const EquipmentDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const admin = can.manageEquipment(user.role)
  const [toast, toastNode] = useToast()
  const [eq, setEq] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [printing, setPrinting] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/equipos/${id}`); setEq(data) } catch (e) { setError(errorMessage(e)) }
  }, [id])
  useEffect(() => { load() }, [load])

  const uploadPhoto = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      await api.post(`/equipos/${eq.id}/foto`, { image: await resizeImage(file, { max: 1280, type: 'image/jpeg', quality: 0.82 }) })
      await load(); toast('Foto actualizada')
    } catch (e) { toast(errorMessage(e), 'bad') } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!eq) return <div className="splash"><Spinner /> Cargando hoja de vida…</div>
  if (printing) return <EquipmentSheet eq={eq} onBack={() => setPrinting(false)} />

  return (
    <>
      <div style={{ marginBottom: 14 }}><Link to="/equipos" className="btn btn-ghost btn-sm"><MdArrowBack /> Equipos</Link></div>

      <section className="card ev-hero">
        <div className="ev-hero-top">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', minWidth: 0 }}>
            <div className="eq-photo">
              {eq.photo ? <img src={eq.photo} alt={eq.name} /> : <CategoryIcon category={eq.category} />}
              {admin && <button type="button" className="btn btn-primary btn-icon btn-sm" onClick={() => fileRef.current.click()} disabled={uploading} aria-label="Cargar foto">{uploading ? <Spinner /> : <MdPhotoCamera />}</button>}
              <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => uploadPhoto(e.target.files[0])} />
            </div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                <span className="badge navy">{eq.code}</span><span className="badge">{CATEGORY[eq.category][0]}</span><StatusBadge status={eq.status} />
              </div>
              <h1 style={{ fontSize: 22 }}>{eq.name}</h1>
              <span style={{ color: 'var(--muted)' }}>{[eq.brand, eq.model].filter(Boolean).join(' · ') || '—'}{eq.serial ? ` · S/N ${eq.serial}` : ''}</span>
            </div>
          </div>
          <div className="page-actions">
            {admin && <button type="button" className="btn btn-ghost" onClick={() => setModal({ edit: true })}><MdEdit /> Editar</button>}
            {admin && <button type="button" className="btn btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => setModal({ deleteEq: true })}><MdDelete /> Eliminar</button>}
            <button type="button" className="btn btn-outline" onClick={() => setPrinting(true)}><MdPrint /> Hoja de vida PDF</button>
          </div>
        </div>
        <div className="ev-info-grid">
          <div className="ev-info"><span className="icon-bubble brand"><MdEvent /></span><div><span>Próximo preventivo</span><strong>{dateLabel(eq.nextPreventive)}</strong><small><NextBadge date={eq.nextPreventive} /></small></div></div>
          <div className="ev-info"><span className="icon-bubble brand"><MdVerifiedUser /></span><div><span>Garantía</span><strong>{dateLabel(eq.warrantyUntil)}</strong><small><WarrantyBadge date={eq.warrantyUntil} /></small></div></div>
          <div className="ev-info"><span className="icon-bubble brand"><MdInventory2 /></span><div><span>Stock</span><strong>{eq.quantity} unidad{eq.quantity === 1 ? '' : 'es'}</strong><small>{eq.minQuantity ? `Mínimo ${eq.minQuantity}` : 'Sin mínimo'}</small></div></div>
          <div className="ev-info"><span className="icon-bubble brand"><MdBuild /></span><div><span>Mantenimientos</span><strong>{money(eq.totals.maintenance)}</strong><small>{eq.totals.preventive} preventivos · {eq.totals.corrective} correctivos</small></div></div>
        </div>
      </section>

      {eq.alerts.length > 0 && (
        <div className="stack" style={{ gap: 8, marginTop: 18 }}>
          {eq.alerts.map((a, i) => <div key={i} className={`alert ${a.level}`}><MdWarning /><span><b>{a.message}</b>{a.date ? ` (${dateLabel(a.date)})` : ''}</span></div>)}
        </div>
      )}

      <div className="grid grid-2" style={{ marginTop: 18, alignItems: 'start' }}>
        <Card title="Datos del equipo">
          <div className="spec-grid">
            <Spec label="Código">{eq.code}</Spec><Spec label="Categoría">{CATEGORY[eq.category][0]}</Spec><Spec label="Área / servicio">{eq.area}</Spec>
            <Spec label="Marca">{eq.brand}</Spec><Spec label="Modelo">{eq.model}</Spec><Spec label="Serial">{eq.serial}</Spec>
            {eq.category === 'biomedico' && <><Spec label="Registro INVIMA">{eq.invima}</Spec><Spec label="Clase de riesgo">{eq.riskClass}</Spec></>}
            <Spec label="Proveedor">{eq.supplier}</Spec><Spec label="Fecha de compra">{dateLabel(eq.purchaseDate)}</Spec><Spec label="Valor de compra">{eq.purchasePrice != null ? money(eq.purchasePrice) : null}</Spec>
            <Spec label="Frecuencia preventivo">{eq.maintenanceMonths ? `Cada ${eq.maintenanceMonths} meses` : 'Sin plan'}</Spec>
          </div>
        </Card>
        <Card title="Ficha técnica">
          <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: eq.technicalSpecs ? 'var(--ink-2)' : 'var(--muted)' }}>{eq.technicalSpecs || 'Sin ficha técnica registrada.'}</p>
          {eq.notes && <><div className="label" style={{ marginTop: 14 }}>Observaciones</div><p style={{ margin: '4px 0 0', whiteSpace: 'pre-wrap' }}>{eq.notes}</p></>}
        </Card>
      </div>

      <div style={{ marginTop: 18 }}>
        <Card title="Mantenimientos" subtitle="Preventivos y correctivos con su responsable, costos y repuestos" icon={<MdBuild style={{ color: 'var(--brand)' }} />} flush
          actions={admin ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ maint: {} })}><MdAdd /> Registrar mantenimiento</button> : null}>
          {eq.maintenances.length === 0 ? <Empty icon={<MdBuild />}>Sin mantenimientos registrados.</Empty> : (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead><tr><th>Fecha</th><th>Tipo</th><th>Trabajo realizado</th><th>Responsable</th><th className="num">Total</th><th>Resultado</th><th>Próximo</th>{admin && <th className="actions" />}</tr></thead>
                <tbody>{eq.maintenances.map((m) => (
                  <tr key={m.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{dateLabel(m.date)}{m.reportNumber && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.reportNumber}</div>}</td>
                    <td><span className={`badge ${m.type === 'preventivo' ? 'info' : 'warn'}`}>{m.type === 'preventivo' ? 'Preventivo' : 'Correctivo'}</span></td>
                    <td style={{ whiteSpace: 'normal', minWidth: 220 }}><strong style={{ color: 'var(--ink)' }}>{m.description}</strong>{m.parts.length > 0 && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.parts.map((p) => `${p.quantity}× ${p.name}`).join(', ')}</div>}</td>
                    <td style={{ whiteSpace: 'normal', minWidth: 160 }}>{m.responsibleName}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{RESPONSIBLE[m.responsibleType]}{m.company ? ` · ${m.company}` : ''}</div></td>
                    <td className="num"><strong>{money(m.total)}</strong></td>
                    <td><span className={`badge ${RESULT[m.result][1]}`}>{RESULT[m.result][0]}</span></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{m.type === 'preventivo' ? dateLabel(m.nextDueDate) : '—'}</td>
                    {admin && <td className="actions">
                      <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ maint: m })}><MdEdit /></button>
                      <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delMaint: m })}><MdDelete /></button>
                    </td>}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      </div>

      {modal?.edit && <EquipmentForm initial={eq} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); toast('Hoja de vida actualizada') }} />}
      {modal?.maint && <MaintForm eq={eq} initial={modal.maint.id ? modal.maint : null} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); toast('Mantenimiento guardado') }} />}
      {modal?.delMaint && (
        <Modal title="Eliminar mantenimiento" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={async () => { try { await api.delete(`/equipos/${eq.id}/mantenimientos/${modal.delMaint.id}`); setModal(null); load(); toast('Mantenimiento eliminado') } catch (e) { toast(errorMessage(e), 'bad') } }}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar el mantenimiento del {dateLabel(modal.delMaint.date)}? Esta acción no se puede deshacer.</p>
        </Modal>
      )}
      {modal?.deleteEq && (
        <Modal title="Eliminar equipo" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={async () => { try { await api.delete(`/equipos/${eq.id}`); navigate('/equipos') } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) } }}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar <b>{eq.code} · {eq.name}</b>? Si tiene mantenimientos no se podrá eliminar; cámbialo a "dado de baja" para conservar su historial.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default EquipmentDetail
