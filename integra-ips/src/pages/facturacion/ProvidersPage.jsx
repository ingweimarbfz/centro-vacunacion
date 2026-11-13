import React, { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdEdit, MdDelete, MdSave, MdErrorOutline, MdBusiness, MdHealthAndSafety, MdHandshake, MdPhone, MdEmail, MdPerson } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { formatMoney } from '../../utils/format'
import './facturacion.css'
import { PhoneInput, EmailInput, NitInput } from '../../components/inputs'

const REGIMEN = { contributivo: 'Contributivo', subsidiado: 'Subsidiado', ambos: 'Contributivo y subsidiado', especial: 'Especial' }
const MODE = { contado: 'Pago inmediato en caja', cuenta_cobro: 'Cuenta de cobro a la entidad' }
const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '')
const discLabel = (d) => (d.type === 'porcentaje' ? `${d.value}%` : formatMoney(d.value))

// Categorías del catálogo general de proveedores: cada módulo usa las suyas.
export const PROVIDER_CATEGORIES = { toma_muestras: 'Toma de muestras', laboratorio: 'Laboratorio', cadena_frio: 'Equipos de cadena de frío', mantenimiento: 'Mantenimiento de equipos', insumos: 'Medicamentos e insumos', servicios: 'Servicios generales', otro: 'Otro' }

export const EntityForm = ({ initial, defaultCategories = [], onClose, onSaved }) => {
  const [f, setF] = useState(() => {
    const base = { name: '', nit: '', description: '', contactName: '', phone: '', email: '', address: '', city: '', categories: defaultCategories, active: true }
    if (!initial?.id) return base
    const o = { ...base, ...initial }
    for (const k of Object.keys(base)) if (o[k] == null) o[k] = base[k]
    return o
  })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const toggleCat = (c) => setF({ ...f, categories: f.categories.includes(c) ? f.categories.filter((x) => x !== c) : [...f.categories, c] })
  const save = async () => {
    setErr('')
    if (!f.name.trim()) return setErr('Escribe el nombre del proveedor.')
    if (!f.categories.length) return setErr('Elige al menos una categoría.')
    setBusy(true)
    try { const { data } = initial?.id ? await api.put(`/proveedores/${initial.id}`, f) : await api.post('/proveedores', f); onSaved(data) } catch (e) { setErr(errorMessage(e)); setBusy(false) }
  }
  return (
    <Modal title={initial?.id ? 'Editar proveedor' : 'Nuevo proveedor'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Nombre o razón social <span className="req">*</span></label><input value={f.name} onChange={set('name')} placeholder="Ej: Frío Técnico del Cesar S.A.S." autoFocus /></div>
          <div className="field"><label>NIT</label><NitInput value={f.nit} onChange={set('nit')} /></div>
        </div>
        <div className="field"><label>Categorías <span className="req">*</span></label>
          <div className="chips">{Object.entries(PROVIDER_CATEGORIES).map(([k, v]) => (
            <button type="button" key={k} className={`chip${f.categories.includes(k) ? ' on' : ''}`} onClick={() => toggleCat(k)} aria-pressed={f.categories.includes(k)}>{v}</button>
          ))}</div>
          <span className="hint">Toma de muestras y laboratorio aparecen en el registro de citología; cadena de frío, en la configuración de temperatura.</span>
        </div>
        <div className="field"><label>Descripción</label><input value={f.description} onChange={set('description')} placeholder="Qué servicio o producto presta" /></div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Persona de contacto</label><input value={f.contactName} onChange={set('contactName')} /></div>
          <div className="field"><label>Teléfono</label><PhoneInput value={f.phone} onChange={set('phone')} /></div>
          <div className="field"><label>Correo</label><EmailInput value={f.email} onChange={set('email')} /></div>
          <div className="field"><label>Ciudad</label><input value={f.city} onChange={set('city')} /></div>
        </div>
        <div className="field"><label>Dirección</label><input value={f.address} onChange={set('address')} /></div>
        {initial?.id && <label className="switch"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> {f.active ? 'Activo' : 'Inactivo'}</label>}
        {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
      </div>
    </Modal>
  )
}

// Tipos de entidad con convenio o responsables de pago.
export const ENTITY_KINDS = { eps: 'EPS', aseguradora: 'Aseguradora / ARL / SOAT', clinica: 'Clínica privada', hospital_publico: 'Hospital o ESE pública', ips: 'Otra IPS', empresa_publica: 'Empresa o entidad pública', empresa_privada: 'Empresa privada', otra: 'Otra institución' }

const EpsForm = ({ initial, discounts, onClose, onSaved }) => {
  const [f, setF] = useState(() => initial?.id
    ? { ...initial, nit: initial.nit || '', code: initial.code || '', regimen: initial.regimen || '', discountId: initial.discountId ? String(initial.discountId) : '', agreementNumber: initial.agreementNumber || '', agreementValidUntil: initial.agreementValidUntil || '', billingContact: initial.billingContact || '', billingEmail: initial.billingEmail || '', notes: initial.notes || '' }
    : { name: '', nit: '', code: '', regimen: '', active: true, hasAgreement: false, paymentMode: 'cuenta_cobro', discountId: '', discountEnabled: true, agreementNumber: '', agreementValidUntil: '', billingContact: '', billingEmail: '', notes: '', kind: 'eps', withholdingAgent: true, stampsPct: 0, stampsLabel: '' })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const save = async () => {
    setErr(''); if (!f.name.trim()) return setErr('Escribe el nombre de la entidad.')
    setBusy(true)
    try { initial?.id ? await api.put(`/eps/${initial.id}`, f) : await api.post('/eps', f); onSaved() } catch (e) { setErr(errorMessage(e)); setBusy(false) }
  }
  return (
    <Modal title={initial?.id ? `Editar · ${initial.name}` : 'Nueva entidad con convenio'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="form-grid">
          <div className="field span-2"><label>Nombre o razón social <span className="req">*</span></label><input value={f.name} onChange={set('name')} autoFocus /></div>
          <div className="field"><label>Tipo de entidad</label><select value={f.kind || 'eps'} onChange={(e) => setF({ ...f, kind: e.target.value })}>{Object.entries(ENTITY_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>NIT</label><NitInput value={f.nit} onChange={set('nit')} /></div>
          {(f.kind || 'eps') === 'eps' && <div className="field"><label>Código de la EPS</label><input value={f.code} onChange={set('code')} placeholder="Ej: EPS037" /></div>}
          {(f.kind || 'eps') === 'eps' && <div className="field"><label>Régimen</label><select value={f.regimen} onChange={set('regimen')}><option value="">—</option>{Object.entries(REGIMEN).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>}
        </div>
        <label className="switch"><input type="checkbox" checked={f.hasAgreement} onChange={set('hasAgreement')} /> <b>Tiene convenio con la IPS</b></label>
        {f.hasAgreement && (
          <div className="form-grid" style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 12, background: '#FAFAFB' }}>
            <div className="field"><label>Forma de pago</label><select value={f.paymentMode} onChange={set('paymentMode')}>{Object.entries(MODE).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select><span className="hint">Se propone al registrar; se puede cambiar en cada registro</span></div>
            <div className="field"><label>Descuento del convenio</label><select value={f.discountId} onChange={set('discountId')}><option value="">Sin descuento</option>{discounts.map((d) => <option key={d.id} value={d.id}>{d.name} · {discLabel(d)}</option>)}</select>
              {f.discountId && <label className="switch" style={{ marginTop: 8 }}><input type="checkbox" checked={f.discountEnabled !== false} onChange={set('discountEnabled')} /> {f.discountEnabled !== false ? 'Descuento activo' : 'Descuento desactivado'}</label>}
              <span className="hint">Si está activo, es el único descuento que se puede aplicar con esta entidad</span></div>
            <div className="field"><label>N° de convenio</label><input value={f.agreementNumber} onChange={set('agreementNumber')} /></div>
            <div className="field"><label>Vigente hasta</label><input type="date" value={f.agreementValidUntil} onChange={set('agreementValidUntil')} /><span className="hint">Vencido = se paga en caja</span></div>
            <div className="field"><label>Contacto de facturación</label><input value={f.billingContact} onChange={set('billingContact')} /></div>
            <div className="field"><label>Correo de facturación</label><EmailInput value={f.billingEmail} onChange={set('billingEmail')} placeholder="facturacion@empresa.com" /></div>
          </div>
        )}
        <div className="form-grid" style={{ padding: 14, border: '1px solid var(--line)', borderRadius: 12 }}>
          <div className="field span-2"><label className="switch"><input type="checkbox" checked={f.withholdingAgent !== false} onChange={set('withholdingAgent')} /> Es agente retenedor (practica retención en la fuente al pagar)</label><span className="hint">Las EPS, clínicas, hospitales y empresas son agentes retenedores; una persona natural normalmente no.</span></div>
          {['hospital_publico', 'empresa_publica'].includes(f.kind) && <>
            <div className="field"><label>Estampillas u otras deducciones (%)</label><input type="number" min="0" max="20" step="0.1" value={f.stampsPct ?? 0} onChange={set('stampsPct')} /><span className="hint">Las que descuenta la entidad pública al pagar (pro-hospital, pro-adulto mayor…)</span></div>
            <div className="field"><label>Nombre de la deducción</label><input value={f.stampsLabel || ''} onChange={set('stampsLabel')} placeholder="Estampilla pro-hospital" /></div>
          </>}
        </div>
        <div className="field"><label>Observaciones</label><input value={f.notes} onChange={set('notes')} /></div>
        {initial?.id && <label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Activa' : 'Inactiva'}</label>}
        {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
      </div>
    </Modal>
  )
}

// Citologías → Configuración: entidades y EPS con convenio.
// Facturación → Proveedores, EPS y convenios (catálogos generales para los servicios de IPS).
const ProvidersPage = () => {
  const [toast, toastNode] = useToast()
  const [entities, setEntities] = useState(null); const [eps, setEps] = useState(null); const [discounts, setDiscounts] = useState([])
  const [modal, setModal] = useState(null)
  const load = useCallback(() => Promise.all([
    api.get('/proveedores').then(({ data }) => setEntities(data)),
    api.get('/eps').then(({ data }) => setEps(data)),
    api.get('/descuentos').then(({ data }) => setDiscounts(data.filter((d) => d.active)))
  ]).catch(() => {}), [])
  useEffect(() => { load() }, [load])
  const toggleDiscount = async (x, enabled) => {
    try { await api.patch(`/eps/${x.id}/descuento`, { enabled }); toast(enabled ? `Descuento activado para ${x.name}` : `Descuento desactivado para ${x.name}`); load() } catch (e) { toast(errorMessage(e), 'bad') }
  }
  const del = async (url, msg) => { try { await api.delete(url); toast(msg); load() } catch (e) { toast(errorMessage(e), 'bad') } }
  const done = (msg) => () => { setModal(null); toast(msg); load() }
  return (
    <>
    <PageHead title="Proveedores y convenios" subtitle="Catálogos generales para todos los servicios de IPS: proveedores, y EPS, clínicas, hospitales y empresas con convenio" />
    <div className="stack">
      <Card flush title="Proveedores y entidades" subtitle="Quién toma o procesa muestras, mantiene los equipos, vende insumos o presta otros servicios" icon={<MdBusiness style={{ color: 'var(--brand)' }} />}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ entity: {} })}><MdAdd /> Nuevo proveedor</button>}>
        {!entities ? <div className="splash" style={{ minHeight: 80 }}><Spinner /></div> : entities.length === 0 ? <Empty icon={<MdBusiness />}>Aún no hay proveedores.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Proveedor</th><th>Categorías</th><th>Contacto</th><th className="actions" /></tr></thead>
            <tbody>{entities.map((x) => (
              <tr key={x.id} style={x.active ? undefined : { opacity: 0.55 }}>
                <td><strong style={{ color: 'var(--ink)' }}>{x.name}</strong>{!x.active && <span className="badge" style={{ marginLeft: 6 }}>Inactivo</span>}<div className="hint">{[x.nit && `NIT ${x.nit}`, x.description].filter(Boolean).join(' · ') || '—'}</div></td>
                <td><div className="chips">{x.categories.map((c) => <span key={c} className="badge">{PROVIDER_CATEGORIES[c] || c}</span>)}</div></td>
                <td style={{ fontSize: 13 }}>{x.contactName && <div><MdPerson style={{ verticalAlign: -2 }} /> {x.contactName}</div>}{x.phone && <div><MdPhone style={{ verticalAlign: -2 }} /> <a href={`tel:${x.phone.replace(/\s/g, '')}`}>{x.phone}</a></div>}{x.email && <div><MdEmail style={{ verticalAlign: -2 }} /> <a href={`mailto:${x.email}`}>{x.email}</a></div>}{!x.contactName && !x.phone && !x.email && <span className="hint">Sin datos de contacto</span>}</td>
                <td className="actions">
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ entity: x })}><MdEdit /></button>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => del(`/proveedores/${x.id}`, 'Proveedor eliminado')}><MdDelete /></button>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      <Card flush title="Convenios y entidades pagadoras" subtitle="EPS, aseguradoras, clínicas, hospitales y empresas públicas o privadas. Con convenio vigente se aplica su descuento y se les puede facturar por cuenta de cobro" icon={<MdHealthAndSafety style={{ color: 'var(--brand)' }} />}
        actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ eps: {} })}><MdAdd /> Nueva entidad</button>}>
        {!eps ? <div className="splash" style={{ minHeight: 80 }}><Spinner /></div> : eps.length === 0 ? <Empty icon={<MdHealthAndSafety />}>Aún no hay EPS.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Entidad</th><th>Convenio</th><th>Forma de pago</th><th>Descuento</th><th className="actions" /></tr></thead>
            <tbody>{eps.map((x) => (
              <tr key={x.id} style={x.active ? undefined : { opacity: 0.55 }}>
                <td><strong style={{ color: 'var(--ink)' }}>{x.name}</strong>{!x.active && <span className="badge" style={{ marginLeft: 6 }}>Inactiva</span>}<div className="hint">{[ENTITY_KINDS[x.kind] || 'EPS', x.nit && `NIT ${x.nit}`, x.code, REGIMEN[x.regimen], x.stampsPct ? `${x.stampsLabel || 'Estampillas'} ${x.stampsPct} %` : null, x.withholdingAgent === false ? 'No retiene' : null].filter(Boolean).join(' · ')}</div></td>
                <td>{x.hasAgreement ? <span className={`badge ${x.agreementActive ? 'ok' : 'warn'}`}><MdHandshake /> {x.agreementActive ? 'Vigente' : 'Vencido'}</span> : <span className="hint">Sin convenio</span>}{x.agreementNumber && <div className="hint">N° {x.agreementNumber}{x.agreementValidUntil ? ` · hasta ${fmt(x.agreementValidUntil)}` : ''}</div>}</td>
                <td>{x.hasAgreement ? MODE[x.paymentMode] : 'Pago en caja'}</td>
                <td>{x.discount ? (
                  <label className="switch" title="Activar o desactivar el descuento del convenio">
                    <input type="checkbox" checked={x.discountEnabled} onChange={(e) => toggleDiscount(x, e.target.checked)} />
                    <span className={`badge ${x.discountEnabled ? 'brand' : ''}`} style={x.discountEnabled ? undefined : { textDecoration: 'line-through' }}>{x.discount.name} · {discLabel(x.discount)}</span>
                  </label>) : '—'}</td>
                <td className="actions">
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ eps: x })}><MdEdit /></button>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => del(`/eps/${x.id}`, 'Entidad eliminada')}><MdDelete /></button>
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      {modal?.entity && <EntityForm initial={modal.entity.id ? modal.entity : null} onClose={() => setModal(null)} onSaved={done('Proveedor guardado')} />}
      {modal?.eps && <EpsForm initial={modal.eps.id ? modal.eps : null} discounts={discounts} onClose={() => setModal(null)} onSaved={done('EPS guardada')} />}
      {toastNode}
    </div>
    </>
  )
}

export default ProvidersPage
