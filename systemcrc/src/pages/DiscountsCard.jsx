import React, { useCallback, useEffect, useState } from 'react'
import {
  MdAdd, MdEdit, MdDelete, MdErrorOutline, MdLocalOffer, MdHandshake, MdPerson, MdCake, MdStar, MdWork, MdSchool, MdEmojiEvents, MdFavorite
} from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { Card, Modal, Empty, Spinner, useToast } from '../components/ui'
import { formatMoney } from '../utils/format'

export const DISCOUNT_ICONS = { handshake: MdHandshake, person: MdPerson, cake: MdCake, star: MdStar, briefcase: MdWork, school: MdSchool, trophy: MdEmojiEvents, heart: MdFavorite }
const COLORS = ['#14B8A6', '#8B5CF6', '#3B82F6', '#EC4899', '#F97316', '#06B6D4', '#E30613', '#84CC16']
const EMPTY = { name: '', type: 'porcentaje', value: '', icon: 'handshake', color: COLORS[0], description: '', active: true }
export const discountLabel = (d) => (d.type === 'porcentaje' ? `${d.value}%` : formatMoney(d.value))

const DiscountForm = ({ initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(editing ? { ...EMPTY, ...initial, description: initial.description || '' } : EMPTY)
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.name.trim()) return setError('El nombre es requerido.')
    if (!(Number(f.value) > 0)) return setError('Ingresa un valor mayor que cero.')
    if (f.type === 'porcentaje' && Number(f.value) > 100) return setError('El porcentaje no puede superar 100.')
    setSaving(true)
    try { const { data } = editing ? await api.put(`/descuentos/${initial.id}`, f) : await api.post('/descuentos', f); onSaved(data, editing) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar descuento' : 'Nuevo descuento'} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="disc-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} {editing ? 'Guardar' : 'Crear'}</button></>}>
      <form id="disc-form" onSubmit={submit} noValidate className="stack" style={{ gap: 14 }}>
        <div className="field"><label>Nombre <span className="req">*</span></label><input value={f.name} onChange={set('name')} placeholder="Ej: Voluntario CRC" autoFocus /></div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Tipo</label><select value={f.type} onChange={set('type')}><option value="porcentaje">Porcentaje (%)</option><option value="valor">Valor fijo ($)</option></select></div>
          <div className="field"><label>Valor <span className="req">*</span></label><input type="number" min="0" step={f.type === 'porcentaje' ? 1 : 500} value={f.value} onChange={set('value')} placeholder={f.type === 'porcentaje' ? 'Ej: 20' : 'Ej: 5000'} /></div>
        </div>
        <div className="field"><label>Ícono</label>
          <div className="disc-icons">{Object.entries(DISCOUNT_ICONS).map(([k, I]) => (
            <button key={k} type="button" className={f.icon === k ? 'on' : ''} onClick={() => setF({ ...f, icon: k })} aria-label={k} style={f.icon === k ? { borderColor: f.color, color: f.color } : undefined}><I /></button>
          ))}</div></div>
        <div className="field"><label>Color</label>
          <div className="disc-colors">{COLORS.map((c) => (
            <button key={c} type="button" className={f.color === c ? 'on' : ''} style={{ background: c }} onClick={() => setF({ ...f, color: c })} aria-label={`Color ${c}`} />
          ))}</div>
          <span className="hint">Se usa para identificar el descuento en los registros.</span></div>
        <div className="field"><label>Descripción</label><input value={f.description} onChange={set('description')} placeholder="A quién aplica" /></div>
        {editing && <label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Activo' : 'Inactivo (no se puede aplicar)'}</label>}
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

// Configuración general → Descuentos de la IPS (se aplican en los registros de servicios).
const DiscountsCard = () => {
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null)
  const [modal, setModal] = useState(null)
  const load = useCallback(() => api.get('/descuentos').then(({ data }) => setRows(data)).catch(() => setRows([])), [])
  useEffect(() => { load() }, [load])
  const remove = async () => {
    try { await api.delete(`/descuentos/${modal.delete.id}`); toast('Descuento eliminado'); setModal(null); load() } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) }
  }
  return (
    <Card flush title="Descuentos de la IPS" subtitle="Se pueden aplicar al registrar un servicio (por ejemplo, una citología)" icon={<MdLocalOffer style={{ color: 'var(--brand)' }} />}
      actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ edit: {} })}><MdAdd /> Nuevo descuento</button>}>
      {!rows ? <div className="splash" style={{ minHeight: 100 }}><Spinner /></div> : rows.length === 0 ? <Empty icon={<MdLocalOffer />}>Aún no hay descuentos.</Empty> : (
        <ul className="list" style={{ padding: '4px 20px 8px' }}>{rows.map((d) => {
          const I = DISCOUNT_ICONS[d.icon] || MdLocalOffer
          return (
            <li key={d.id} style={d.active ? undefined : { opacity: 0.55 }}>
              <span className="icon-bubble" style={{ background: `${d.color}22`, color: d.color }}><I /></span>
              <div className="grow"><strong>{d.name} <span className="badge" style={{ background: `${d.color}22`, color: d.color }}>{discountLabel(d)}</span>{!d.active && <span className="badge" style={{ marginLeft: 4 }}>Inactivo</span>}</strong><span>{d.description || (d.type === 'porcentaje' ? 'Porcentaje sobre el valor' : 'Valor fijo')}</span></div>
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ edit: d })}><MdEdit /></button>
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delete: d })}><MdDelete /></button>
            </li>
          )
        })}</ul>
      )}
      {modal?.edit && <DiscountForm initial={modal.edit.id ? modal.edit : null} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); load(); toast(e ? 'Descuento actualizado' : `Descuento ${d.name} creado`) }} />}
      {modal?.delete && (
        <Modal title="Eliminar descuento" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={remove}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar <b>{modal.delete.name}</b>? Si ya se aplicó en algún registro no se podrá eliminar; desactívalo en su lugar.</p>
        </Modal>
      )}
      {toastNode}
    </Card>
  )
}

export default DiscountsCard
