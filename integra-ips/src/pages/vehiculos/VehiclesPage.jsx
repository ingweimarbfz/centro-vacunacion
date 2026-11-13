import React, { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MdAdd, MdSearch, MdErrorOutline, MdWarning, MdDirectionsCar, MdSpeed } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { can } from '../../utils/permissions'
import { PageHead, Card, Modal, Empty, Spinner } from '../../components/ui'
import { VehicleIcon, StatusPill, DocBadge, km } from './common'
import { PlateInput } from '../../components/inputs'

export const EMPTY_VEHICLE = {
  movil: '', plate: '', vehicleType: '', brand: '', line: '', modelYear: '', color: '', serial: '', engineNumber: '',
  owner: 'Cruz Roja Colombiana Seccional Cesar', fuelType: 'Diésel', condition: 'usado', initialKm: '', purchaseDate: '', status: 'activo', notes: '', siteId: '', assignedDriverId: ''
}

export const VehicleForm = ({ initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [form, setForm] = useState(() => (editing ? { ...EMPTY_VEHICLE, ...Object.fromEntries(Object.entries(initial).filter(([k]) => k in EMPTY_VEHICLE).map(([k, v]) => [k, v ?? ''])) } : EMPTY_VEHICLE))
  const [types, setTypes] = useState([])
  const [sites, setSites] = useState([])
  const [drivers, setDrivers] = useState([])
  useEffect(() => { api.get('/sedes', { params: { sede: undefined } }).then(({ data }) => setSites(data)).catch(() => {}); api.get('/vehiculos/conductores', { params: { todas: 1, sede: undefined } }).then(({ data }) => setDrivers(data)).catch(() => {}) }, [])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { api.get('/vehiculos/tipos').then(({ data }) => setTypes(data)).catch(() => {}) }, [])
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value })
  const isNew = form.condition === 'nuevo'

  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!form.movil.trim() || !form.plate.trim() || !form.vehicleType) return setError('Móvil, placa y tipo de vehículo son requeridos.')
    if (!isNew && (form.initialKm === '' || Number(form.initialKm) < 0)) return setError('Ingresa el kilometraje inicial del vehículo usado.')
    setSaving(true)
    try {
      const body = { ...form, initialKm: isNew ? 0 : form.initialKm }
      const { data } = editing ? await api.put(`/vehiculos/${initial.id}`, body) : await api.post('/vehiculos', body)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }

  return (
    <Modal title={editing ? `Editar hoja de vida · Móvil ${initial.movil}` : 'Nuevo vehículo'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" form="vehicle-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} {editing ? 'Guardar cambios' : 'Registrar vehículo'}</button></>}>
      <form id="vehicle-form" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div className="field"><label>N° de móvil <span className="req">*</span></label><input value={form.movil} onChange={set('movil')} placeholder="Ej. 105" autoFocus /></div>
          <div className="field"><label>Placa <span className="req">*</span></label><PlateInput value={form.plate} onChange={set('plate')} /></div>
          <div className="field"><label>Tipo de vehículo <span className="req">*</span></label>
            <select value={form.vehicleType} onChange={set('vehicleType')}><option value="">Selecciona…</option>{types.map((t) => <option key={t}>{t}</option>)}</select></div>
          <div className="field"><label>Marca</label><input value={form.brand} onChange={set('brand')} /></div>
          <div className="field"><label>Línea / modelo</label><input value={form.line} onChange={set('line')} placeholder="Ej. Hilux 4x4" /></div>
          <div className="field"><label>Año</label><input type="number" min="1950" max={new Date().getFullYear() + 1} step="1" value={form.modelYear} onChange={set('modelYear')} placeholder="2024" /></div>
          <div className="field"><label>Color</label><input value={form.color} onChange={set('color')} /></div>
          <div className="field"><label>Serial / VIN</label><input value={form.serial} onChange={set('serial')} /></div>
          <div className="field"><label>N° de motor</label><input value={form.engineNumber} onChange={set('engineNumber')} /></div>
          <div className="field"><label>Combustible</label>
            <select value={form.fuelType} onChange={set('fuelType')}>{['Diésel', 'Gasolina', 'Gas (GNV)', 'Eléctrico', 'Híbrido'].map((f) => <option key={f}>{f}</option>)}</select></div>
          <div className="field span-2"><label>Propietario</label><input value={form.owner} onChange={set('owner')} /></div>
          <div className="field"><label>Condición</label>
            <select value={form.condition} onChange={set('condition')}><option value="nuevo">Nuevo (0 km)</option><option value="usado">Usado</option></select></div>
          <div className="field"><label>Km inicial {!isNew && <span className="req">*</span>}</label>
            <input type="number" min="0" value={isNew ? 0 : form.initialKm} disabled={isNew} onChange={set('initialKm')} />
            <span className="hint">{isNew ? 'Vehículo 0 km' : 'Lectura del tacómetro al registrarlo'}</span></div>
          <div className="field"><label>Fecha de compra</label><input type="date" value={form.purchaseDate} onChange={set('purchaseDate')} /></div>
          <div className="field"><label>Adscrito a (sede)</label>
            <select value={form.siteId} onChange={set('siteId')}>
              <option value="">{editing ? 'Sin cambio' : 'Sede del filtro o Seccional'}</option>
              {sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
            </select><span className="hint">Propiedad de la Seccional; se adscribe a una unidad o grupo.</span></div>
          <div className="field"><label>Estado</label>
            <select value={form.status} onChange={set('status')}><option value="activo">Activo</option><option value="mantenimiento">En mantenimiento</option><option value="fuera_servicio">Fuera de servicio</option></select></div>
          <div className="field"><label>Conductor asignado</label>
            <select value={form.assignedDriverId} onChange={set('assignedDriverId')}><option value="">Sin asignar</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.siteName}</option>)}</select>
            <span className="hint">{/TAB|TAM/i.test(form.vehicleType) ? 'Verá esta ambulancia en IPS · Traslado asistencial.' : 'Responsable habitual del vehículo.'}</span></div>
          <div className="field span-all"><label>Observaciones</label><textarea value={form.notes} onChange={set('notes')} /></div>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

const VehiclesPage = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [q, setQ] = useState('')
  const [creating, setCreating] = useState(false)
  const admin = can.manageVehicles(user.role)

  useEffect(() => { api.get('/vehiculos').then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))) }, [])
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (rows || []).filter((v) => !s || [v.movil, v.plate, v.brand, v.line, v.vehicleType].some((x) => x && x.toLowerCase().includes(s)))
  }, [rows, q])
  const alerts = (rows || []).reduce((a, v) => a + v.alerts.length, 0)

  return (
    <>
      <PageHead title="Vehículos" subtitle={admin ? 'Hojas de vida de la flota. Solo el administrador puede registrarlas o modificarlas.' : 'Hojas de vida de la flota (consulta)'}>
        <div className="input-icon" style={{ width: 240 }}><MdSearch /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Móvil, placa o marca" /></div>
        {admin && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><MdAdd /> Nuevo vehículo</button>}
      </PageHead>
      {alerts > 0 && <div className="alert warn" style={{ marginBottom: 18 }}><MdWarning /><span><b>{alerts} alerta{alerts === 1 ? '' : 's'}</b> de SOAT o mantenimiento en la flota. Revisa las tarjetas marcadas.</span></div>}
      {error && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? <div className="splash" style={{ minHeight: 240 }}><Spinner /></div> : filtered.length === 0 ? <Card><Empty icon={<MdDirectionsCar />}>No hay vehículos registrados.</Empty></Card> : (
        <div className="vehicle-grid">
          {filtered.map((v) => (
            <Link key={v.id} to={`/socorro/vehiculos/flota/${v.id}`} className="card vehicle-card">
              <div className="vehicle-cover">
                {v.photos.front ? <img src={v.photos.front} alt={`Móvil ${v.movil}`} /> : <VehicleIcon type={v.vehicleType} />}
                <span className="movil">Móvil {v.movil}</span>
                <span className="plate">{v.plate}</span>
              </div>
              <div className="vehicle-body">
                <h3>{v.brand} {v.line}</h3>
                <span className="meta">{v.vehicleType} · {v.modelYear || '—'} · {v.color || '—'}</span>
                {v.siteName && <span className="meta" style={{ color: 'var(--brand)', fontWeight: 600 }}>📍 {v.siteName}</span>}
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontWeight: 700 }}><MdSpeed style={{ color: 'var(--muted)' }} /> {km(v.currentKm)}</span>
                <div className="badges">
                  <StatusPill status={v.status} />
                  <DocBadge doc={v.soat} />
                  {v.alerts.length > 0 && <span className="badge bad"><MdWarning /> {v.alerts.length}</span>}
                  {v.openTrip && <span className="badge info"><span className="dot pulse" /> En servicio</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      {creating && <VehicleForm onClose={() => setCreating(false)} onSaved={(v) => navigate(`/socorro/vehiculos/flota/${v.id}`)} />}
    </>
  )
}

export default VehiclesPage
