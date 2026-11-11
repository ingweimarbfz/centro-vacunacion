import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdAdd, MdEdit, MdDelete, MdWarehouse, MdErrorOutline, MdArrowForward, MdPerson, MdPlace } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { SITE_TYPES } from '../../utils/permissions'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { qty } from './common'

const ORDER = { seccional: 0, unidad_municipal: 1, grupo_apoyo: 2 }
const EMPTY = { name: '', siteId: '', responsible: '', location: '', description: '', active: true }

const WarehouseForm = ({ initial, sites, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => (editing ? { ...EMPTY, ...Object.fromEntries(Object.entries(initial).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])) } : { ...EMPTY, siteId: initial?.siteId || '' }))
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.name.trim()) return setError('El nombre de la bodega es requerido.')
    if (!f.siteId) return setError('Selecciona la sede a la que se asigna la bodega.')
    setSaving(true)
    try {
      const { data } = editing ? await api.put(`/inventario/bodegas/${initial.id}`, f) : await api.post('/inventario/bodegas', f)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? `Editar ${initial.code}` : 'Nueva bodega'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="wh-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} Guardar</button></>}>
      <form id="wh-form" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="field span-all"><label>Nombre de la bodega <span className="req">*</span></label><input value={f.name} onChange={set('name')} autoFocus placeholder="Ej. Bodega IPS Aguachica, Bodega Ambulancia 105" /></div>
          <div className="field"><label>Sede asignada <span className="req">*</span></label>
            <select value={f.siteId} onChange={set('siteId')} disabled={initial?.isGeneral}>
              <option value="">Selecciona la sede…</option>
              {Object.entries(SITE_TYPES).map(([t, l]) => <optgroup key={t} label={l}>{sites.filter((x) => x.type === t).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>)}
            </select>
            {initial?.isGeneral && <span className="hint">La bodega general es la de la Seccional.</span>}</div>
          <div className="field"><label>Responsable</label><input value={f.responsible} onChange={set('responsible')} placeholder="Nombre y cargo" /></div>
          <div className="field span-all"><label>Ubicación</label><input value={f.location} onChange={set('location')} placeholder="Dirección, piso, cuarto…" /></div>
          <div className="field span-all"><label>Descripción / uso</label><input value={f.description} onChange={set('description')} placeholder="Qué se guarda en esta bodega" /></div>
          {editing && !initial.isGeneral && <div className="field span-all"><label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Bodega activa' : 'Bodega inactiva (no recibe traslados ni hace entregas)'}</label></div>}
        </div>
        {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

// Administración de bodegas: varias por sede; la general es la de la Seccional.
const WarehousesPage = () => {
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null)
  const [sites, setSites] = useState([])
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const load = useCallback(() => api.get('/inventario/bodegas', { params: { sede: undefined, todas: 1 } }).then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))), [])
  useEffect(() => { load(); api.get('/sedes', { params: { sede: undefined } }).then(({ data }) => setSites(data)).catch(() => {}) }, [load])
  const bySite = useMemo(() => [...sites].sort((x, y) => ORDER[x.type] - ORDER[y.type] || x.name.localeCompare(y.name)).map((s) => ({ ...s, list: (rows || []).filter((w) => w.siteId === s.id) })), [sites, rows])
  const remove = async () => {
    try { await api.delete(`/inventario/bodegas/${modal.delete.id}`); toast('Bodega eliminada'); setModal(null); load() } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) }
  }

  return (
    <>
      <PageHead title="Bodegas" subtitle="Crea las bodegas y asígnalas a la Seccional, a una unidad municipal o a un grupo de apoyo. Una sede puede tener varias.">
        <button type="button" className="btn btn-primary" onClick={() => setModal({ edit: {} })}><MdAdd /> Nueva bodega</button>
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : (
        <div className="stack">
          {bySite.map((s) => (
            <Card key={s.id} flush title={s.name} subtitle={`${SITE_TYPES[s.type]} · ${s.list.length} bodega${s.list.length === 1 ? '' : 's'}`} icon={<MdWarehouse style={{ color: 'var(--brand)' }} />}
              actions={<button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal({ edit: { siteId: s.id } })}><MdAdd /> Agregar</button>}>
              {s.list.length === 0 ? <Empty icon={<MdWarehouse />}>Esta sede aún no tiene bodegas.</Empty> : (
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="table">
                    <thead><tr><th>Bodega</th><th>Responsable · ubicación</th><th className="num">Productos</th><th className="num">Unidades</th><th>Alertas</th><th>Estado</th><th className="actions" /></tr></thead>
                    <tbody>{s.list.map((w) => (
                      <tr key={w.id} style={w.active ? undefined : { opacity: 0.6 }}>
                        <td style={{ whiteSpace: 'normal' }}><strong style={{ color: 'var(--ink)' }}>{w.name}</strong> {w.isGeneral && <span className="badge brand">General</span>}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{w.code}{w.description ? ` · ${w.description}` : ''}</div></td>
                        <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>{w.responsible ? <div><MdPerson style={{ verticalAlign: -2 }} /> {w.responsible}</div> : '—'}{w.location && <div style={{ color: 'var(--muted)' }}><MdPlace style={{ verticalAlign: -2 }} /> {w.location}</div>}</td>
                        <td className="num">{w.products}</td>
                        <td className="num"><b>{qty(w.units)}</b></td>
                        <td><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>{w.expired > 0 && <span className="badge bad">{w.expired} vencido</span>}{w.expiringSoon > 0 && <span className="badge warn">{w.expiringSoon} por vencer</span>}{!w.expired && !w.expiringSoon && <span className="badge ok">OK</span>}</div></td>
                        <td>{w.active ? <span className="badge ok"><span className="dot" /> Activa</span> : <span className="badge"><span className="dot" /> Inactiva</span>}</td>
                        <td className="actions">
                          <Link className="btn btn-ghost btn-icon" title="Ver existencias" aria-label="Ver existencias" to={`/socorro/inventario/existencias?bodega=${w.id}`}><MdArrowForward /></Link>
                          <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ edit: w })}><MdEdit /></button>
                          {!w.isGeneral && <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delete: w })}><MdDelete /></button>}
                        </td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {modal?.edit && <WarehouseForm initial={modal.edit.id ? modal.edit : modal.edit.siteId ? { siteId: modal.edit.siteId } : null} sites={sites} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); load(); toast(e ? 'Bodega actualizada' : `Bodega ${d.code} creada`) }} />}
      {modal?.delete && (
        <Modal title="Eliminar bodega" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={remove}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar <b>{modal.delete.name}</b>? Si ya tuvo movimientos no se podrá eliminar; desactívala en su lugar.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default WarehousesPage
