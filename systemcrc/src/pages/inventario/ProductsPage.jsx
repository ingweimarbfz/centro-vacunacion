import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { MdAdd, MdEdit, MdDelete, MdSearch, MdCategory, MdErrorOutline, MdInfo } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { CATEGORY_ORDER, CATEGORY_PLURAL, CATEGORY_LABELS, CategoryBadge, useCatalogs, regulatory, qty } from './common'

// Campos de cada categoría según la Resolución 3100 de 2019 (lote y vencimiento se piden en cada ingreso).
const FIELDS = {
  medicamento: [['principioActivo', 'Principio activo'], ['formaFarmaceutica', 'Forma farmacéutica'], ['concentracion', 'Concentración'], ['presentacionComercial', 'Presentación comercial'], ['registroInvima', 'Registro sanitario vigente (INVIMA)']],
  dispositivo_medico: [['descripcion', 'Descripción'], ['marca', 'Marca'], ['serie', 'Serie (cuando aplique)'], ['presentacionComercial', 'Presentación comercial'], ['registroInvima', 'Registro sanitario o permiso de comercialización (INVIMA)'], ['clasificacionRiesgo', 'Clasificación de riesgo'], ['vidaUtil', 'Vida útil (cuando aplique)']],
  reactivo: [['marca', 'Marca'], ['presentacionComercial', 'Presentación comercial'], ['registroInvima', 'Registro sanitario o permiso de comercialización (INVIMA)'], ['clasificacionRiesgo', 'Clasificación del riesgo sanitario'], ['vidaUtil', 'Vida útil (cuando aplique)']],
  operacional: [['marca', 'Marca'], ['descripcion', 'Descripción']],
  no_operacional: [['marca', 'Marca'], ['descripcion', 'Descripción']]
}
const PLACEHOLDER = {
  principioActivo: 'Ej. Cloruro de sodio', formaFarmaceutica: 'Ej. Solución inyectable', concentracion: 'Ej. 0,9%', presentacionComercial: 'Ej. Bolsa x 500 ml',
  registroInvima: 'Ej. INVIMA 2016M-0004512', descripcion: 'Qué es y para qué se usa', marca: 'Fabricante o marca', serie: 'Si aplica', vidaUtil: 'Ej. 3 años'
}
const EMPTY = { category: 'medicamento', code: '', name: '', unit: '', principioActivo: '', formaFarmaceutica: '', concentracion: '', descripcion: '', marca: '', serie: '', presentacionComercial: '', registroInvima: '', clasificacionRiesgo: '', vidaUtil: '', minStock: '', minStockGeneral: '', notes: '', active: true }

const ProductForm = ({ initial, catalogs, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => (editing ? { ...EMPTY, ...Object.fromEntries(Object.entries(initial).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])) } : EMPTY))
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const required = new Set(catalogs.required[f.category] || [])
  const risk = catalogs.risk[f.category]
  const submit = async (e) => {
    e.preventDefault(); setError('')
    const missing = [['name', 'Nombre'], ['unit', 'Unidad de medida'], ...FIELDS[f.category].filter(([k]) => required.has(k))].filter(([k]) => !String(f[k] || '').trim())
    if (missing.length) return setError(`Completa los campos obligatorios: ${missing.map(([, l]) => l).join(', ')}.`)
    if (f.minStock === '' || f.minStockGeneral === '') return setError('Indica los stocks mínimos para las alertas.')
    setSaving(true)
    try {
      const { data } = editing ? await api.put(`/inventario/productos/${initial.id}`, f) : await api.post('/inventario/productos', f)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  const lbl = (k, l) => <label>{l} {required.has(k) && <span className="req">*</span>}</label>
  return (
    <Modal title={editing ? `Editar ${initial.code}` : 'Nuevo producto'} size="lg" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="prod-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} {editing ? 'Guardar cambios' : 'Crear producto'}</button></>}>
      <form id="prod-form" onSubmit={submit} noValidate className="stack" style={{ gap: 16 }}>
        <div className="field"><label>Categoría <span className="req">*</span></label>
          <div className="rc-checks">{CATEGORY_ORDER.map((c) => (
            <label key={c} className={`rc-check${f.category === c ? ' on' : ''}`}><input type="radio" name="cat" checked={f.category === c} onChange={() => setF({ ...f, category: c, clasificacionRiesgo: '' })} /> {CATEGORY_LABELS[c]}</label>
          ))}</div></div>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div className="field span-2"><label>{f.category === 'reactivo' ? 'Nombre del reactivo' : 'Nombre'} <span className="req">*</span></label><input value={f.name} onChange={set('name')} autoFocus /></div>
          <div className="field"><label>Código</label><input value={f.code} onChange={set('code')} placeholder="Automático" /></div>
          <div className="field"><label>Unidad de medida <span className="req">*</span></label>
            <select value={f.unit} onChange={set('unit')}><option value="">Selecciona…</option>{Object.entries(catalogs.units).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          {FIELDS[f.category].map(([k, l]) => (
            <div key={k} className={`field${k === 'descripcion' || k === 'registroInvima' ? ' span-2' : ''}`}>{lbl(k, l)}
              {k === 'clasificacionRiesgo' && risk
                ? <select value={f.clasificacionRiesgo} onChange={set('clasificacionRiesgo')}><option value="">Selecciona…</option>{risk.map((r) => <option key={r} value={r}>{f.category === 'reactivo' ? `Categoría ${r}` : `Clase ${r}`}</option>)}</select>
                : <input value={f[k]} onChange={set(k)} placeholder={PLACEHOLDER[k]} />}
            </div>
          ))}
          <div className="field"><label>Stock mínimo por bodega <span className="req">*</span></label><input type="number" min="0" value={f.minStock} onChange={set('minStock')} /></div>
          <div className="field"><label>Stock mínimo bodega general <span className="req">*</span></label><input type="number" min="0" value={f.minStockGeneral} onChange={set('minStockGeneral')} /></div>
          <div className="field span-all"><label>Observaciones</label><input value={f.notes} onChange={set('notes')} /></div>
          {editing && <div className="field span-all"><label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Activo' : 'Inactivo (no se puede ingresar)'}</label></div>}
        </div>
        {['medicamento', 'dispositivo_medico', 'reactivo'].includes(f.category) && <div className="alert info"><MdInfo /><span>El <b>lote</b> y la <b>fecha de vencimiento</b> son obligatorios y se registran en cada ingreso a la bodega general.</span></div>}
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

const ProductsPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const catalogs = useCatalogs()
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [cat, setCat] = useState('')
  const [q, setQ] = useState('')
  const [modal, setModal] = useState(null)
  const load = useCallback(() => api.get('/inventario/productos', { params: admin ? { sede: undefined } : {} }).then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))), [admin])
  useEffect(() => { load() }, [load])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (rows || []).filter((p) => (!cat || p.category === cat) && (!s || [p.name, p.code, p.principioActivo, p.marca, p.registroInvima].some((v) => v && v.toLowerCase().includes(s))))
  }, [rows, cat, q])
  const remove = async () => {
    try { await api.delete(`/inventario/productos/${modal.delete.id}`); toast('Producto eliminado'); setModal(null); load() } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) }
  }

  return (
    <>
      <PageHead title="Catálogo de productos" subtitle="Medicamentos, dispositivos médicos, reactivos y equipos con los datos que exige la Resolución 3100 de 2019">
        {admin && <button type="button" className="btn btn-primary" onClick={() => setModal({ edit: {} })} disabled={!catalogs}><MdAdd /> Nuevo producto</button>}
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      <Card flush>
        <div className="table-toolbar">
          <div className="input-icon"><MdSearch /><input className="input" placeholder="Buscar por nombre, código, principio activo, marca o INVIMA" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="module-switch">
            <button type="button" className={!cat ? 'on' : ''} onClick={() => setCat('')}>Todos</button>
            {CATEGORY_ORDER.map((c) => <button key={c} type="button" className={cat === c ? 'on' : ''} onClick={() => setCat(c)}>{CATEGORY_LABELS[c]}</button>)}
          </div>
        </div>
        {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : filtered.length === 0 ? <Empty icon={<MdCategory />}>Sin productos.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Producto</th><th>Categoría</th><th>Datos regulatorios</th><th>Presentación · unidad</th><th className="num">{admin ? 'Existencia total' : 'En tu bodega'}</th><th className="num">Mínimos</th>{admin && <th className="actions" />}</tr></thead>
              <tbody>{filtered.map((p) => (
                <tr key={p.id} style={p.active ? undefined : { opacity: 0.55 }}>
                  <td style={{ maxWidth: 260, whiteSpace: 'normal' }}><strong style={{ color: 'var(--ink)' }}>{p.name}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.code}{p.active ? '' : ' · inactivo'}</div></td>
                  <td><CategoryBadge category={p.category} /></td>
                  <td style={{ maxWidth: 300, whiteSpace: 'normal', fontSize: 12.5 }}>{regulatory(p) || '—'}{p.registroInvima && <div style={{ color: 'var(--muted)' }}>{p.registroInvima}{p.vidaUtil ? ` · vida útil ${p.vidaUtil}` : ''}</div>}</td>
                  <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>{p.presentacionComercial || '—'}<div style={{ color: 'var(--muted)' }}>{p.unitLabel}</div></td>
                  <td className="num"><b>{qty(p.stock)}</b></td>
                  <td className="num" style={{ fontSize: 12.5 }}>{qty(p.minStock)} / {qty(p.minStockGeneral)}<div style={{ color: 'var(--muted)', fontSize: 11 }}>bodega / general</div></td>
                  {admin && <td className="actions">
                    <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ edit: p })}><MdEdit /></button>
                    <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delete: p })}><MdDelete /></button>
                  </td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
      <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 10 }}>{CATEGORY_ORDER.map((c) => `${CATEGORY_PLURAL[c]}: ${(rows || []).filter((p) => p.category === c).length}`).join(' · ')}</p>
      {modal?.edit && catalogs && <ProductForm initial={modal.edit.id ? modal.edit : null} catalogs={catalogs} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); load(); toast(e ? 'Producto actualizado' : `Producto ${d.code} creado`) }} />}
      {modal?.delete && (
        <Modal title="Eliminar producto" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={remove}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar <b>{modal.delete.name}</b>? Si ya tiene existencias o movimientos no se podrá eliminar; desactívalo en su lugar.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default ProductsPage
