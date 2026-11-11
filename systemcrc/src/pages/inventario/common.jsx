import React, { useEffect, useMemo, useState } from 'react'
import { MdErrorOutline, MdAdd, MdDelete, MdMoveToInbox, MdLocalShipping, MdOutbox, MdRemoveCircle } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Modal, Spinner } from '../../components/ui'
import { CATEGORY_LABELS, CATEGORY_PLURAL, CATEGORY_TONE, qty } from '../socorro/common'

export { CATEGORY_LABELS, CATEGORY_PLURAL, CATEGORY_TONE, qty }
export const CATEGORY_ORDER = ['medicamento', 'dispositivo_medico', 'reactivo', 'operacional', 'no_operacional']
export const CATEGORY_COLOR = { medicamento: '#C8102E', dispositivo_medico: '#15803D', reactivo: '#B45309', operacional: '#1E3A5F', no_operacional: '#0E7490' }
export const MOVE_TONE = {
  entrada: 'ok', traslado_entrada: 'ok', traslado_salida: 'navy', entrega: 'info', consumo: 'brand', salida: 'navy', devolucion: 'info', reverso: '', ajuste: 'warn', baja: 'bad'
}
export const CATEGORY_SHORT = { medicamento: 'Medicamentos', dispositivo_medico: 'Disp. médicos', reactivo: 'Reactivos', operacional: 'Eq. operac.', no_operacional: 'Eq. no operac.' }
export const isConsumable = (c) => ['medicamento', 'dispositivo_medico', 'reactivo'].includes(c)
export const fmtDay = (iso) => (iso ? new Intl.DateTimeFormat('es-CO', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`)) : '—')

// Catálogos del servidor (unidades, categorías, campos obligatorios y destinos de entrega).
let cache = null
export const useCatalogs = () => {
  const [c, setC] = useState(cache)
  useEffect(() => {
    let alive = true
    api.get('/inventario/catalogos').then(({ data }) => { cache = data; if (alive) setC(data) }).catch(() => {})
    return () => { alive = false }
  }, [])
  return c
}

export const CategoryBadge = ({ category }) => <span className={`badge ${CATEGORY_TONE[category]}`}>{CATEGORY_LABELS[category]}</span>

export const ExpiryBadge = ({ line }) => {
  if (!line.expiryDate) return <span style={{ color: 'var(--muted)' }}>—</span>
  if (line.expired) return <span className="badge bad">Vencido · {fmtDay(line.expiryDate)}</span>
  if (line.expiringSoon) return <span className="badge warn" title={`Vence en ${line.daysToExpiry} días`}>{fmtDay(line.expiryDate)}</span>
  return <span>{fmtDay(line.expiryDate)}</span>
}

// Resumen de los datos regulatorios del producto (Resolución 3100 de 2019).
export const regulatory = (p) => {
  if (p.category === 'medicamento') return [p.principioActivo, p.formaFarmaceutica, p.concentracion].filter(Boolean).join(' · ')
  if (p.category === 'dispositivo_medico') return [p.marca, p.clasificacionRiesgo && `Riesgo ${p.clasificacionRiesgo}`, p.serie && `Serie ${p.serie}`].filter(Boolean).join(' · ')
  if (p.category === 'reactivo') return [p.marca, p.clasificacionRiesgo && `Riesgo ${p.clasificacionRiesgo}`].filter(Boolean).join(' · ')
  return [p.marca, p.descripcion].filter(Boolean).join(' · ')
}

// Selector de líneas (producto + lote) con cantidades, para traslados y entregas.
const LinesPicker = ({ lines, value, onChange }) => {
  const [pick, setPick] = useState('')
  const [q, setQ] = useState('')
  const available = lines.filter((l) => !l.expired && l.stock > 0 && !value.some((v) => v.itemId === l.id))
  const add = () => {
    const l = lines.find((x) => x.id === Number(pick))
    if (!l) return
    onChange([...value, { itemId: l.id, quantity: q || 1, line: l }]); setPick(''); setQ('')
  }
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div className="ev-add" style={{ padding: 0, borderBottom: 0 }}>
        <select className="input" value={pick} onChange={(e) => setPick(e.target.value)} aria-label="Elemento">
          <option value="">Agregar elemento…</option>
          {CATEGORY_ORDER.map((c) => {
            const ls = available.filter((l) => l.product.category === c)
            return ls.length ? <optgroup key={c} label={CATEGORY_PLURAL[c]}>{ls.map((l) => <option key={l.id} value={l.id}>{l.product.name}{l.lot ? ` · lote ${l.lot}` : ''}{l.expiryDate ? ` · vence ${fmtDay(l.expiryDate)}` : ''} — disp. {qty(l.stock)} {l.product.unitLabel}</option>)}</optgroup> : null
          })}
        </select>
        <input className="input" type="number" min="1" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cant." aria-label="Cantidad" style={{ width: 90 }} />
        <button type="button" className="btn btn-outline" onClick={add} disabled={!pick}><MdAdd /> Agregar</button>
      </div>
      {value.length > 0 && (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Elemento</th><th>Lote</th><th className="num">Disponible</th><th className="num">Cantidad</th><th className="actions" /></tr></thead>
            <tbody>{value.map((v, i) => (
              <tr key={v.itemId}>
                <td><strong style={{ color: 'var(--ink)' }}>{v.line.product.name}</strong><div><CategoryBadge category={v.line.product.category} /></div></td>
                <td>{v.line.lot || '—'}</td>
                <td className="num">{qty(v.line.stock)} {v.line.product.unitLabel}</td>
                <td className="num"><input className="input" type="number" min="1" max={v.line.stock} value={v.quantity} onChange={(e) => onChange(value.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))} style={{ width: 90, textAlign: 'right' }} aria-label="Cantidad" /></td>
                <td className="actions"><button type="button" className="btn btn-ghost btn-icon" aria-label="Quitar" onClick={() => onChange(value.filter((_, j) => j !== i))}><MdDelete /></button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
    </div>
  )
}

const validLines = (items) => {
  if (!items.length) return 'Agrega al menos un elemento.'
  const bad = items.find((x) => !(Number(x.quantity) > 0) || Number(x.quantity) > x.line.stock)
  return bad ? `Revisa la cantidad de ${bad.line.product.name} (disponible ${qty(bad.line.stock)}).` : ''
}

// ---------------------------------------------------------------- Ingreso a la bodega general (admin)
export const EntryModal = ({ products, generalName, onClose, onSaved }) => {
  const [f, setF] = useState({ productId: '', lot: '', expiryDate: '', quantity: '', supplier: '', invoice: '', note: '' })
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const product = products.find((p) => p.id === Number(f.productId))
  const needsLot = product && isConsumable(product.category)
  const submit = async () => {
    setError('')
    if (!product) return setError('Selecciona el producto del catálogo.')
    if (!(Number(f.quantity) > 0)) return setError('Ingresa la cantidad.')
    if (needsLot && (!f.lot.trim() || !f.expiryDate)) return setError('El lote y la fecha de vencimiento son obligatorios.')
    setSaving(true)
    try { await api.post('/inventario/entradas', { ...f, quantity: Number(f.quantity) }); onSaved(`Ingresaron ${f.quantity} ${product.unitLabel} de ${product.name} a la bodega general`) } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title="Ingreso a bodega general" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdMoveToInbox />} Registrar ingreso</button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="alert info"><MdMoveToInbox /><span>Todo el inventario ingresa a <b>{generalName || 'la bodega general'}</b> y desde allí se traslada a las bodegas de las unidades municipales y grupos de apoyo.</span></div>
        <div className="field"><label>Producto <span className="req">*</span></label>
          <select value={f.productId} onChange={set('productId')} autoFocus>
            <option value="">Selecciona…</option>
            {CATEGORY_ORDER.map((c) => <optgroup key={c} label={CATEGORY_PLURAL[c]}>{products.filter((p) => p.category === c && p.active).map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name} ({p.unitLabel})</option>)}</optgroup>)}
          </select>
          {product && <span className="hint">{regulatory(product)}{product.registroInvima ? ` · ${product.registroInvima}` : ''}</span>}</div>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div className="field"><label>Lote {needsLot && <span className="req">*</span>}</label><input value={f.lot} onChange={set('lot')} placeholder={needsLot ? 'Obligatorio' : 'Opcional'} /></div>
          <div className="field"><label>Vencimiento {needsLot && <span className="req">*</span>}</label><input type="date" value={f.expiryDate} onChange={set('expiryDate')} /></div>
          <div className="field"><label>Cantidad <span className="req">*</span></label><input type="number" min="1" value={f.quantity} onChange={set('quantity')} />{product && <span className="hint">{product.unitLabel}</span>}</div>
          <div className="field"><label>Proveedor</label><input value={f.supplier} onChange={set('supplier')} /></div>
          <div className="field"><label>Factura / remisión</label><input value={f.invoice} onChange={set('invoice')} /></div>
          <div className="field"><label>Nota</label><input value={f.note} onChange={set('note')} /></div>
        </div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------- Traslado entre bodegas (admin)
// Desde la general a cualquier bodega, o entre bodegas de una misma sede. Nunca de regreso a la general.
export const TransferModal = ({ warehouses, fromId, onClose, onSaved }) => {
  const general = warehouses.find((w) => w.isGeneral)
  const [from, setFrom] = useState(String(fromId || general?.id || ''))
  const source = warehouses.find((w) => String(w.id) === from)
  const targets = warehouses.filter((w) => w.active && !w.isGeneral && w.id !== source?.id && (source?.isGeneral || w.siteId === source?.siteId))
  const [to, setTo] = useState('')
  const [lines, setLines] = useState(null)
  const [items, setItems] = useState([])
  const [note, setNote] = useState('Entrega semanal')
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  useEffect(() => {
    setLines(null); setItems([]); setTo('')
    if (from) api.get('/inventario/stock', { params: { bodega: from, sede: undefined } }).then(({ data }) => setLines(data)).catch((e) => setError(errorMessage(e)))
  }, [from])
  const submit = async () => {
    setError('')
    if (!to) return setError('Selecciona la bodega de destino.')
    const v = validLines(items); if (v) return setError(v)
    setSaving(true)
    try {
      const { data } = await api.post('/inventario/traslados', { fromWarehouseId: Number(from), toWarehouseId: Number(to), note, items: items.map((x) => ({ itemId: x.itemId, quantity: Number(x.quantity) })) })
      onSaved(`Traslado ${data.ref} enviado a ${data.warehouseName}`)
    } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title="Trasladar entre bodegas" size="lg" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdLocalShipping />} Enviar traslado</button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="field"><label>Desde <span className="req">*</span></label><select value={from} onChange={(e) => setFrom(e.target.value)}>{warehouses.filter((w) => w.active).map((w) => <option key={w.id} value={w.id}>{w.name}{w.isGeneral ? ' (general)' : ` · ${w.siteName}`}</option>)}</select></div>
          <div className="field"><label>Hacia <span className="req">*</span></label><select value={to} onChange={(e) => setTo(e.target.value)}><option value="">Selecciona la bodega…</option>{targets.map((w) => <option key={w.id} value={w.id}>{w.name} · {w.siteName}</option>)}</select>
            {source && !source.isGeneral && <span className="hint">Desde una bodega de unidad o grupo solo se traslada a otra bodega de la misma sede.</span>}</div>
          <div className="field span-all"><label>Nota</label><input value={note} onChange={(e) => setNote(e.target.value)} /></div>
        </div>
        {!lines ? <div className="splash" style={{ minHeight: 100 }}><Spinner /></div> : <LinesPicker lines={lines} value={items} onChange={setItems} />}
        <div className="alert warn"><MdLocalShipping /><span>Lo que sale de la bodega general queda en la bodega de destino y <b>no regresa</b> a la general.</span></div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------- Entrega semanal a un servicio de IPS, Educación o Socorro
export const DeliveryModal = ({ warehouses, warehouseId, onClose, onSaved }) => {
  const options = warehouses.filter((w) => w.active)
  const [wh, setWh] = useState(String(warehouseId || options[0]?.id || ''))
  const [lines, setLines] = useState(null)
  const [dests, setDests] = useState([])
  const [items, setItems] = useState([])
  const [f, setF] = useState({ destination: '', receivedBy: '', note: '' })
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  useEffect(() => {
    setLines(null); setItems([])
    if (!wh) return
    api.get('/inventario/stock', { params: { bodega: wh, sede: undefined } }).then(({ data }) => setLines(data)).catch((e) => setError(errorMessage(e)))
    api.get('/inventario/catalogos', { params: { bodega: wh, sede: undefined } }).then(({ data }) => setDests(data.destinations)).catch(() => {})
  }, [wh])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async () => {
    setError('')
    if (!wh) return setError('Selecciona la bodega que entrega.')
    if (!f.destination) return setError('Selecciona el servicio o área que recibe.')
    if (!f.receivedBy.trim()) return setError('Indica quién recibe.')
    const v = validLines(items); if (v) return setError(v)
    setSaving(true)
    try {
      const { data } = await api.post('/inventario/entregas', { ...f, warehouseId: Number(wh), items: items.map((x) => ({ itemId: x.itemId, quantity: Number(x.quantity) })) })
      onSaved(`Entrega ${data.ref} registrada para ${data.destination}`)
    } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  const groups = useMemo(() => ({ ips: dests.filter((d) => d.group === 'ips'), ops: dests.filter((d) => d.group !== 'ips') }), [dests])
  return (
    <Modal title="Entrega semanal" size="lg" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdOutbox />} Registrar entrega</button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="field"><label>Bodega que entrega <span className="req">*</span></label><select value={wh} onChange={(e) => setWh(e.target.value)}>{options.map((w) => <option key={w.id} value={w.id}>{w.name}{w.isGeneral ? ' (general)' : ` · ${w.siteName}`}</option>)}</select></div>
          <div className="field"><label>Servicio / área que recibe <span className="req">*</span></label>
            <select value={f.destination} onChange={set('destination')}>
              <option value="">Selecciona…</option>
              {groups.ips.length > 0 && <optgroup label="Servicios de IPS">{groups.ips.map((d) => <option key={d.key} value={d.key}>{d.label.replace('IPS · ', '')}</option>)}</optgroup>}
              <optgroup label="Operaciones Generales">{groups.ops.map((d) => <option key={d.key} value={d.key}>{d.label.replace('Operaciones Generales · ', '')}</option>)}</optgroup>
            </select></div>
          <div className="field"><label>Recibe <span className="req">*</span></label><input value={f.receivedBy} onChange={set('receivedBy')} placeholder="Nombre y cargo" /></div>
          <div className="field"><label>Nota</label><input value={f.note} onChange={set('note')} placeholder="Ej. Semana 46" /></div>
        </div>
        {!lines ? <div className="splash" style={{ minHeight: 100 }}><Spinner /></div> : <LinesPicker lines={lines} value={items} onChange={setItems} />}
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------- Baja o ajuste de una línea (admin)
export const WriteOffModal = ({ line, onClose, onSaved }) => {
  const [f, setF] = useState({ type: line.expired ? 'baja' : 'baja', quantity: line.expired ? line.stock : '', reason: line.expired ? 'Producto vencido' : '' })
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async () => {
    setError('')
    const q = Number(f.quantity)
    if (!q || (f.type === 'baja' && (q < 0 || q > line.stock))) return setError('Cantidad inválida.')
    if (!f.reason.trim()) return setError('Indica el motivo.')
    setSaving(true)
    try { await api.post('/inventario/bajas', { itemId: line.id, ...f, quantity: q }); onSaved(f.type === 'baja' ? 'Baja registrada' : 'Ajuste registrado') } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title={`Baja o ajuste · ${line.product.name}`} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-danger" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdRemoveCircle />} Guardar</button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <p style={{ margin: 0, color: 'var(--muted)' }}>{line.warehouseName}{line.lot ? ` · lote ${line.lot}` : ''} · existencia <b style={{ color: 'var(--ink)' }}>{qty(line.stock)} {line.product.unitLabel}</b></p>
        <div className="module-switch">
          <button type="button" className={f.type === 'baja' ? 'on' : ''} onClick={() => setF({ ...f, type: 'baja' })}>Baja (vencido, averiado, pérdida)</button>
          <button type="button" className={f.type === 'ajuste' ? 'on' : ''} onClick={() => setF({ ...f, type: 'ajuste' })}>Ajuste de conteo</button>
        </div>
        <div className="field"><label>{f.type === 'baja' ? 'Cantidad que sale' : 'Cantidad (+ suma / − resta)'}</label><input type="number" value={f.quantity} onChange={(e) => setF({ ...f, quantity: e.target.value })} /></div>
        <div className="field"><label>Motivo <span className="req">*</span></label><input value={f.reason} onChange={(e) => setF({ ...f, reason: e.target.value })} /></div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}
