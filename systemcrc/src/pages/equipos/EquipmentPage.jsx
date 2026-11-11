import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MdAdd, MdSearch, MdErrorOutline, MdWarning, MdPrint, MdMedicalServices, MdArrowForward } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { can } from '../../utils/permissions'
import { PageHead, Card, Modal, Empty, Spinner } from '../../components/ui'
import { CATEGORY, STATUS, CategoryIcon, StatusBadge, NextBadge, WarrantyBadge } from './common'
import InventoryReport from './InventoryReport'

export const EMPTY_EQUIPMENT = {
  name: '', category: 'biomedico', brand: '', model: '', serial: '', invima: '', riskClass: '', serviceId: '', supplier: '',
  purchaseDate: '', purchasePrice: '', warrantyUntil: '', quantity: 1, minQuantity: 0, status: 'operativo', maintenanceMonths: '', technicalSpecs: '', notes: '', siteId: ''
}

export const EquipmentForm = ({ initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => (editing ? { ...EMPTY_EQUIPMENT, ...Object.fromEntries(Object.entries(initial).filter(([k]) => k in EMPTY_EQUIPMENT).map(([k, v]) => [k, v ?? ''])) } : EMPTY_EQUIPMENT))
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const bio = f.category === 'biomedico'
  const [sites, setSites] = useState([])
  const [services, setServices] = useState([])
  useEffect(() => {
    api.get('/sedes', { params: { sede: undefined } }).then(({ data }) => setSites(data.filter((x) => x.hasIps))).catch(() => {})
    api.get('/servicios-ips').then(({ data }) => setServices(data)).catch(() => {})
  }, [])
  // Servicios habilitados en la sede elegida (o en la del equipo); si no hay sede elegida, todos los activos.
  const siteId = Number(f.siteId) || initial?.siteId
  const serviceOptions = services.filter((x) => (x.active || Number(f.serviceId) === x.id) && (!siteId || x.siteIds.includes(siteId) || Number(f.serviceId) === x.id))
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.name.trim()) return setError('El nombre del equipo es requerido.')
    if (f.quantity === '' || Number(f.quantity) < 0) return setError('Indica la cantidad en inventario.')
    if (!f.serviceId) return setError('Selecciona el área / servicio de IPS.')
    setSaving(true)
    try {
      const { data } = editing ? await api.put(`/equipos/${initial.id}`, f) : await api.post('/equipos', f)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? `Editar ${initial.code}` : 'Registrar equipo'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" form="eq-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} {editing ? 'Guardar cambios' : 'Registrar equipo'}</button></>}>
      <form id="eq-form" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div className="field span-2"><label>Nombre del equipo <span className="req">*</span></label><input value={f.name} onChange={set('name')} autoFocus placeholder="Ej. Nevera para vacunas" /></div>
          <div className="field"><label>Categoría</label><select value={f.category} onChange={set('category')}>{Object.entries(CATEGORY).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Marca</label><input value={f.brand} onChange={set('brand')} /></div>
          <div className="field"><label>Modelo</label><input value={f.model} onChange={set('model')} /></div>
          <div className="field"><label>Serial</label><input value={f.serial} onChange={set('serial')} /></div>
          {bio && <>
            <div className="field"><label>Registro INVIMA</label><input value={f.invima} onChange={set('invima')} /></div>
            <div className="field"><label>Clase de riesgo</label><select value={f.riskClass} onChange={set('riskClass')}><option value="">—</option>{['I', 'IIa', 'IIb', 'III'].map((r) => <option key={r}>{r}</option>)}</select></div>
          </>}
          <div className="field"><label>Sede</label><select value={f.siteId} onChange={set('siteId')}><option value="">{editing ? 'Sin cambio' : 'Sede del filtro o Seccional'}</option>{sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
          <div className="field"><label>Área / servicio de IPS <span className="req">*</span></label><select value={f.serviceId} onChange={set('serviceId')}><option value="">Selecciona…</option>{serviceOptions.map((x) => <option key={x.id} value={x.id}>{x.name}{x.active ? '' : ' (inactivo)'}</option>)}</select>
            <span className="hint">Servicios creados en "Servicios de IPS"{siteId ? ' y habilitados en la sede' : ''}.</span></div>
          <div className="field"><label>Proveedor</label><input value={f.supplier} onChange={set('supplier')} /></div>
          <div className="field"><label>Fecha de compra</label><input type="date" value={f.purchaseDate} onChange={set('purchaseDate')} /></div>
          <div className="field"><label>Valor de compra (COP)</label><input type="number" min="0" value={f.purchasePrice} onChange={set('purchasePrice')} /></div>
          <div className="field"><label>Garantía hasta</label><input type="date" value={f.warrantyUntil} onChange={set('warrantyUntil')} /></div>
          <div className="field"><label>Cantidad (stock) <span className="req">*</span></label><input type="number" min="0" value={f.quantity} onChange={set('quantity')} /></div>
          <div className="field"><label>Stock mínimo</label><input type="number" min="0" value={f.minQuantity} onChange={set('minQuantity')} /><span className="hint">Genera alerta al llegar a este valor</span></div>
          <div className="field"><label>Mantenimiento preventivo cada</label>
            <select value={f.maintenanceMonths} onChange={set('maintenanceMonths')}><option value="">Sin plan</option>{[1, 2, 3, 4, 6, 12, 24].map((m) => <option key={m} value={m}>{m} {m === 1 ? 'mes' : 'meses'}</option>)}</select></div>
          <div className="field"><label>Estado</label><select value={f.status} onChange={set('status')}>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field span-all"><label>Ficha técnica</label><textarea value={f.technicalSpecs} onChange={set('technicalSpecs')} placeholder="Voltaje, potencia, capacidad, rangos de operación, accesorios…" /></div>
          <div className="field span-all"><label>Observaciones</label><textarea value={f.notes} onChange={set('notes')} style={{ minHeight: 60 }} /></div>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

const EquipmentPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const admin = can.manageEquipment(user.role)
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [st, setSt] = useState(''); const [svc, setSvc] = useState(''); const [onlyAlerts, setOnlyAlerts] = useState(false)
  const [creating, setCreating] = useState(false)
  const [printing, setPrinting] = useState(false)

  useEffect(() => { api.get('/equipos').then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))) }, [])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (rows || []).filter((r) => (!cat || r.category === cat) && (!st || r.status === st) && (!onlyAlerts || r.alerts.length) &&
      (!svc || (svc === 'none' ? !r.serviceId : String(r.serviceId) === svc)) &&
      (!s || [r.name, r.code, r.brand, r.model, r.serial, r.area].some((v) => v && v.toLowerCase().includes(s))))
  }, [rows, q, cat, st, svc, onlyAlerts])

  const serviceNames = Object.fromEntries((rows || []).filter((r) => r.serviceId).map((r) => [String(r.serviceId), r.area]))
  if (printing) return <InventoryReport rows={filtered} filters={{ cat, st, q, svc: svc && (svc === 'none' ? 'Sin servicio' : serviceNames[svc]) }} onBack={() => setPrinting(false)} />

  const live = (rows || []).filter((r) => r.status !== 'dado_de_baja')
  const alerts = live.flatMap((r) => r.alerts.map((a) => ({ ...a, r })))
  const count = (s) => (rows || []).filter((r) => r.status === s).length

  return (
    <>
      <PageHead title="Hoja de vida de equipos" subtitle="Equipos biomédicos, cadena de frío, aires acondicionados, plantas eléctricas y más">
        <button type="button" className="btn btn-outline" onClick={() => setPrinting(true)} disabled={!rows}><MdPrint /> Inventario PDF</button>
        {admin && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><MdAdd /> Registrar equipo</button>}
      </PageHead>

      <div className="grid grid-kpi" style={{ marginBottom: 18 }}>
        <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Equipos activos</span><span className="kpi-icon navy"><MdMedicalServices /></span></div><div className="kpi-value">{live.length}</div><div className="kpi-foot">{live.reduce((a, r) => a + r.quantity, 0)} unidades en inventario</div></div>
        <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Operativos</span><span className="kpi-icon ok"><MdMedicalServices /></span></div><div className="kpi-value">{count('operativo')}</div></div>
        <div className="card kpi"><div className="kpi-top"><span className="kpi-label">En mantenimiento</span><span className="kpi-icon warn"><MdMedicalServices /></span></div><div className="kpi-value">{count('en_mantenimiento')}</div></div>
        <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Fuera de servicio</span><span className="kpi-icon"><MdMedicalServices /></span></div><div className="kpi-value" style={{ color: count('fuera_servicio') ? 'var(--bad)' : undefined }}>{count('fuera_servicio')}</div></div>
        <button type="button" className="card kpi" style={{ textAlign: 'left', cursor: 'pointer', border: onlyAlerts ? '1.5px solid var(--brand)' : undefined }} onClick={() => setOnlyAlerts((x) => !x)}>
          <div className="kpi-top"><span className="kpi-label">Alertas</span><span className="kpi-icon"><MdWarning /></span></div><div className="kpi-value">{alerts.length}</div><div className="kpi-foot">{onlyAlerts ? 'Mostrando solo equipos con alerta' : 'Clic para ver solo esos equipos'}</div>
        </button>
      </div>

      {error && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{error}</span></div>}

      <Card flush>
        <div className="table-toolbar">
          <div className="input-icon"><MdSearch /><input className="input" placeholder="Buscar por nombre, código, marca, serial o área" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select className="input" style={{ width: 210 }} value={svc} onChange={(e) => setSvc(e.target.value)} aria-label="Área / servicio"><option value="">Todas las áreas / servicios</option>{Object.entries(serviceNames).sort((a, b) => a[1].localeCompare(b[1])).map(([k, l]) => <option key={k} value={k}>{l}</option>)}{(rows || []).some((r) => !r.serviceId) && <option value="none">Sin servicio asignado</option>}</select>
            <select className="input" style={{ width: 210 }} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoría"><option value="">Todas las categorías</option>{Object.entries(CATEGORY).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
            <select className="input" style={{ width: 180 }} value={st} onChange={(e) => setSt(e.target.value)} aria-label="Estado"><option value="">Todos los estados</option>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select>
          </div>
        </div>
        {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : filtered.length === 0 ? <Empty icon={<MdMedicalServices />}>No hay equipos que coincidan.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Equipo</th><th>Marca / modelo</th><th>Área / servicio</th><th className="num">Stock</th><th>Estado</th><th>Próximo preventivo</th><th>Garantía</th><th className="actions" /></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} style={r.status === 'dado_de_baja' ? { opacity: .55 } : undefined}>
                    <td><Link to={`/equipos/${r.id}`} className="cell-user" style={{ color: 'inherit' }}>
                      {r.photo ? <img className="avatar" src={r.photo} alt="" style={{ borderRadius: 8 }} /> : <span className="icon-bubble brand"><CategoryIcon category={r.category} /></span>}
                      <div><strong>{r.name}</strong><span>{r.code} · {CATEGORY[r.category][0]}</span></div>
                    </Link></td>
                    <td>{[r.brand, r.model].filter(Boolean).join(' ') || '—'}<div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{r.serial || ''}</div></td>
                    <td>{r.area ? <span className="badge navy">{r.area}</span> : <span className="badge">Sin servicio</span>}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.siteName}</div></td>
                    <td className="num"><strong style={{ color: r.minQuantity && r.quantity <= r.minQuantity ? 'var(--bad)' : 'var(--ink)' }}>{r.quantity}</strong>{r.minQuantity ? <div style={{ fontSize: 11, color: 'var(--muted)' }}>mín. {r.minQuantity}</div> : null}</td>
                    <td><StatusBadge status={r.status} />{r.alerts.length > 0 && <span className="badge bad" style={{ marginLeft: 4 }}><MdWarning /> {r.alerts.length}</span>}</td>
                    <td><NextBadge date={r.nextPreventive} /></td>
                    <td><WarrantyBadge date={r.warrantyUntil} /></td>
                    <td className="actions"><button type="button" className="btn btn-outline btn-sm" onClick={() => navigate(`/equipos/${r.id}`)}>Hoja de vida <MdArrowForward /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {creating && <EquipmentForm onClose={() => setCreating(false)} onSaved={(d) => navigate(`/equipos/${d.id}`)} />}
    </>
  )
}

export default EquipmentPage
