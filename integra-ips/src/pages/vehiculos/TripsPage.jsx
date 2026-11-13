import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MdAdd, MdSearch, MdAssignment, MdErrorOutline, MdFlag, MdArrowForward, MdPlayArrow, MdAccessTime } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Modal, Empty, Spinner } from '../../components/ui'
import { VehicleLookup, PhotoField, km, money } from './common'
import { fmtDateTime, duration } from '../socorro/common'
import { TransferFields, EMPTY_TRANSFER, missingTransfer } from './transfer'

// ---------------------------------------------------------------- Iniciar actividad
// Solo el conductor abre reportes diarios (el administrador los consulta).
const NewTripModal = ({ onClose }) => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [vehicle, setVehicle] = useState(null)
  const [acts, setActs] = useState([])
  const [f, setF] = useState({ mode: 'previa', eventId: '', activity: '', observation: '' })
  const [isTransfer, setIsTransfer] = useState(false)
  const [transfer, setTransfer] = useState(EMPTY_TRANSFER)
  const transferOn = Boolean(vehicle?.isAmbulance) && f.mode === 'nueva' && isTransfer
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const [myOpen, setMyOpen] = useState(null)
  // Los servicios en curso son los de la sede del vehículo (un conductor puede ser visitante).
  useEffect(() => {
    api.get('/vehiculos/actividades', { params: vehicle ? { vehiculoSede: vehicle.siteId } : {} }).then(({ data }) => setActs(data)).catch(() => {})
  }, [vehicle])
  useEffect(() => {
    api.get('/vehiculos-reportes', { params: { estado: 'abierto' } }).then(({ data }) => setMyOpen(data[0] || null)).catch(() => {})
  }, [])
  // Preoperacional de hoy del vehículo (y del conductor, si es él quien abre el reporte).
  const [pre, setPre] = useState(undefined)
  useEffect(() => {
    setPre(undefined)
    if (!vehicle) return
    api.get('/vehiculos-preoperacional/hoy', { params: { vehiculo: vehicle.id, conductor: user.id } }).then(({ data }) => setPre(data)).catch(() => setPre(null))
  }, [vehicle, user.id])
  const busyDriver = myOpen ? { code: myOpen.code, movil: myOpen.vehicle.movil } : null

  const submit = async () => {
    setError('')
    if (!vehicle) return setError('Busca la móvil por su número.')
    if (vehicle.openTrip) return setError('Esa móvil ya tiene una actividad abierta.')
    if (vehicle.blockers?.length) return setError(`No se puede registrar el servicio: ${vehicle.blockers.join('. ')}.`)
    if (busyDriver) return setError(`Ya tienes la Móvil ${busyDriver.movil} en actividad (${busyDriver.code}). Debe cerrarla primero.`)
    if (f.mode === 'previa' && !f.eventId) return setError('Selecciona la actividad o servicio.')
    if (transferOn) {
      const miss = missingTransfer(transfer)
      if (miss.length) return setError(`Completa los datos del traslado: ${miss.join(', ')}.`)
    } else if (f.mode === 'nueva' && !f.activity.trim()) return setError('Escribe la nueva actividad.')
    setSaving(true)
    try {
      const { data } = await api.post('/vehiculos-reportes', {
        vehicleId: vehicle.id, observation: f.observation,
        eventId: f.mode === 'previa' ? f.eventId : undefined, activity: f.mode === 'nueva' ? f.activity : undefined,
        transfer: transferOn ? transfer : undefined
      })
      navigate(`/socorro/vehiculos/reportes/${data.id}`)
    } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }

  return (
    <Modal title="Nuevo reporte diario" size={transferOn ? 'lg' : ''} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving || !!busyDriver || !!vehicle?.blockers?.length}>{saving ? <Spinner /> : <MdPlayArrow />} Iniciar actividad</button></>}>
      <div className="stack" style={{ gap: 16 }}>
        <VehicleLookup onFound={setVehicle} autoFocus />
        {vehicle && (
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field"><label>Placa</label><input value={vehicle.plate} readOnly /></div>
            <div className="field"><label>Km de salida</label><input value={km(vehicle.currentKm)} readOnly /><span className="hint">Se toma del último km reportado</span></div>
          </div>
        )}
        <div className="field"><label>Conductor</label>
          <input value={user.fullName} readOnly />
          {busyDriver && <span className="error">Ya tienes la Móvil {busyDriver.movil} en actividad ({busyDriver.code}). Debe cerrarla antes de tomar otro vehículo.</span>}
        </div>
        <div className="field">
          <label>Actividad o servicio</label>
          <div className="module-switch" style={{ marginBottom: 8 }}>
            <button type="button" className={f.mode === 'previa' ? 'on' : ''} onClick={() => setF({ ...f, mode: 'previa' })}>Servicio existente</button>
            <button type="button" className={f.mode === 'nueva' ? 'on' : ''} onClick={() => setF({ ...f, mode: 'nueva' })}>Nueva actividad</button>
          </div>
          {f.mode === 'previa' ? (
            acts.length === 0
              ? <span className="hint">No hay servicios en curso en este momento. Registra una actividad nueva.</span>
              : (
                <>
                  <select value={f.eventId} onChange={(e) => setF({ ...f, eventId: e.target.value })}>
                    <option value="">Selecciona el servicio en curso…</option>
                    {acts.map((a) => <option key={a.id} value={a.id}>{a.name} · {a.code} · {a.place}</option>)}
                  </select>
                  <span className="hint">Solo se muestran los servicios que están en curso.</span>
                </>
              )
          ) : (
            <>
              {vehicle?.isAmbulance && (
                <label className={`rc-check transfer-check${isTransfer ? ' on' : ''}`}><input type="checkbox" checked={isTransfer} onChange={(e) => setIsTransfer(e.target.checked)} /> Es un traslado asistencial de paciente (ambulancia {vehicle.ambulanceType})</label>
              )}
              {transferOn ? <TransferFields value={transfer} onChange={setTransfer} />
                : <input value={f.activity} onChange={(e) => setF({ ...f, activity: e.target.value })} placeholder="Ej. Traslado de insumos a bodega central" maxLength={150} style={vehicle?.isAmbulance ? { marginTop: 10 } : undefined} />}
            </>
          )}
        </div>
        {vehicle && pre === null && <div className="alert warn"><MdFlag /><span>No hay preoperacional de hoy para la Móvil {vehicle.movil}. Regístralo antes de salir: <Link to="/socorro/vehiculos/preoperacional/nuevo">hacer preoperacional</Link>.</span></div>}
        {vehicle?.blockers?.length > 0 && (
          <div className="alert bad"><MdFlag /><div><strong>No se puede registrar servicios con la Móvil {vehicle.movil}</strong>{vehicle.blockers.map((b) => <div key={b}>• {b}</div>)}</div></div>
        )}
        {vehicle && pre && pre.result === 'apto' && <div className="alert ok"><MdFlag /><span>Preoperacional de hoy {pre.code}: vehículo <b>APTO</b>.</span></div>}
        <div className="field"><label>Observación</label><input value={f.observation} onChange={(e) => setF({ ...f, observation: e.target.value })} placeholder="Opcional" /></div>
        <div className="alert info"><MdAccessTime /><span>La hora de salida se registra automáticamente. Al terminar, cierra la actividad con el km del tacómetro y la foto de evidencia.</span></div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------- Cerrar actividad
export const CloseTripModal = ({ trip, onClose, onClosed }) => {
  const [f, setF] = useState({ kmIn: '', observation: trip.observation || '', fuel: false, fuelValue: '', fuelGallons: '' })
  const [tach, setTach] = useState(null)
  const [ticket, setTicket] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const diff = f.kmIn !== '' ? Number(f.kmIn) - trip.kmOut : null

  const submit = async () => {
    setError('')
    if (f.kmIn === '' || Number.isNaN(Number(f.kmIn))) return setError('Ingresa el km de llegada que marca el tacómetro.')
    if (diff < 0) return setError(`El km de llegada no puede ser menor al de salida (${trip.kmOut}).`)
    if (!tach) return setError('Toma o carga la foto del tacómetro.')
    if (f.fuel && (!f.fuelValue || Number(f.fuelValue) <= 0)) return setError('Ingresa el valor del tanqueo.')
    if (f.fuel && !ticket) return setError('Adjunta la foto del ticket del tanqueo.')
    setSaving(true)
    try {
      const { data } = await api.post(`/vehiculos-reportes/${trip.id}/cerrar`, {
        kmIn: Number(f.kmIn), tachometerImage: tach, observation: f.observation,
        fuelValue: f.fuel ? Number(f.fuelValue) : null, fuelGallons: f.fuel && f.fuelGallons ? Number(f.fuelGallons) : null, fuelTicketImage: f.fuel ? ticket : null
      })
      onClosed(data)
    } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }

  return (
    <Modal title={`Cerrar actividad · Móvil ${trip.vehicle.movil}`} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdFlag />} Cerrar actividad</button></>}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="grid grid-3" style={{ gap: 12, gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div className="field"><label>Km de salida</label><input value={trip.kmOut} readOnly /></div>
          <div className="field"><label>Km de llegada <span className="req">*</span></label><input type="number" min={trip.kmOut} value={f.kmIn} onChange={(e) => setF({ ...f, kmIn: e.target.value })} autoFocus placeholder="Tacómetro" /></div>
          <div className="field"><label>Diferencia</label><input value={diff == null ? '' : `${diff} km`} readOnly style={diff < 0 ? { color: 'var(--bad)' } : undefined} /></div>
        </div>
        <PhotoField label="Foto del tacómetro (evidencia)" required value={tach} onChange={setTach} hint="En el celular se abre la cámara." />
        <div className="field"><label>Observación</label><textarea value={f.observation} onChange={(e) => setF({ ...f, observation: e.target.value })} style={{ minHeight: 60 }} /></div>
        <label className="switch"><input type="checkbox" checked={f.fuel} onChange={(e) => setF({ ...f, fuel: e.target.checked })} /> Se realizó tanqueo de combustible</label>
        {f.fuel && (
          <>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="field"><label>Valor del tanqueo (COP) <span className="req">*</span></label><input type="number" min="0" value={f.fuelValue} onChange={(e) => setF({ ...f, fuelValue: e.target.value })} /></div>
              <div className="field"><label>Galones</label><input type="number" min="0" step="0.01" value={f.fuelGallons} onChange={(e) => setF({ ...f, fuelGallons: e.target.value })} /></div>
            </div>
            <PhotoField label="Foto del ticket" required value={ticket} onChange={setTicket} />
          </>
        )}
        <div className="alert info"><MdAccessTime /><span>La hora de llegada se registra automáticamente al cerrar. El km de llegada pasa a ser el km actual de la móvil.</span></div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

const TripsPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [filters, setFilters] = useState({ estado: '', desde: '', hasta: '', vehiculo: '', conductor: '' })
  const [rows, setRows] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [drivers, setDrivers] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const [closing, setClosing] = useState(null)

  const load = useCallback(async (f) => {
    setError('')
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v))
      const { data } = await api.get('/vehiculos-reportes', { params }); setRows(data)
    } catch (e) { setError(errorMessage(e)) }
  }, [])
  useEffect(() => {
    load({})
    api.get('/vehiculos').then(({ data }) => setVehicles(data)).catch(() => {})
    if (admin) api.get('/vehiculos/conductores').then(({ data }) => setDrivers(data)).catch(() => {})
  }, [load, admin])

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })
  const open = (rows || []).filter((r) => r.status === 'abierto')
  const totals = (rows || []).reduce((a, r) => ({ km: a.km + (r.kmDiff || 0), fuel: a.fuel + (r.fuelValue || 0) }), { km: 0, fuel: 0 })

  return (
    <>
      <PageHead title="Reportes diarios" subtitle={admin ? 'Actividades de todos los conductores' : 'Tus actividades y servicios con la móvil'}>
        {!admin && <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><MdAdd /> Nuevo reporte</button>}
      </PageHead>

      {open.length > 0 && (
        <div className="stack" style={{ gap: 8, marginBottom: 18 }}>
          {open.map((t) => (
            <div key={t.id} className="alert warn">
              <span className="dot pulse" style={{ marginTop: 6 }} />
              <div><strong>Actividad abierta · Móvil {t.vehicle.movil} · {t.activity}</strong>{t.driver.name} · salió {fmtDateTime(t.startedAt)} con {km(t.kmOut)} · {duration(t.startedAt)}</div>
              {t.canClose
                ? <button type="button" className="btn btn-primary btn-sm alert-actions" onClick={() => setClosing(t)}><MdFlag /> Cerrar</button>
                : <span className="badge info alert-actions" title="Se podrá cerrar cuando el coordinador finalice el servicio">Esperando cierre de {t.event?.code}</span>}
            </div>
          ))}
        </div>
      )}

      <Card>
        <form className="form-grid" style={{ alignItems: 'end' }} onSubmit={(e) => { e.preventDefault(); load(filters) }}>
          <div className="field"><label>Móvil</label><select value={filters.vehiculo} onChange={set('vehiculo')}><option value="">Todas</option>{vehicles.map((v) => <option key={v.id} value={v.id}>Móvil {v.movil} · {v.plate}</option>)}</select></div>
          {admin && <div className="field"><label>Conductor</label><select value={filters.conductor} onChange={set('conductor')}><option value="">Todos</option>{drivers.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></div>}
          <div className="field"><label>Estado</label><select value={filters.estado} onChange={set('estado')}><option value="">Todos</option><option value="abierto">Abiertos</option><option value="cerrado">Cerrados</option></select></div>
          <div className="field"><label>Desde</label><input type="date" value={filters.desde} onChange={set('desde')} /></div>
          <div className="field"><label>Hasta</label><input type="date" value={filters.hasta} onChange={set('hasta')} /></div>
          <button type="submit" className="btn btn-dark"><MdSearch /> Filtrar</button>
        </form>
      </Card>

      {error && <div className="alert bad" style={{ marginTop: 18 }}><MdErrorOutline /><span>{error}</span></div>}

      <Card flush className="cy-results-card" title="Reportes" subtitle={rows ? `${rows.length} reportes · ${km(totals.km)} recorridos · ${money(totals.fuel)} en combustible` : ''}>
        {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : rows.length === 0 ? <Empty icon={<MdAssignment />}>No hay reportes.</Empty> : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead><tr><th>Reporte</th><th>Móvil</th><th>Actividad / servicio</th>{admin && <th>Conductor</th>}<th className="num">Salida</th><th className="num">Llegada</th><th className="num">Recorrido</th><th className="num">Combustible</th><th>Estado</th><th className="actions" /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td><Link to={`/socorro/vehiculos/reportes/${r.id}`} style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.code}</Link><div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(r.startedAt)}</div></td>
                    <td><span className="badge navy">Móvil {r.vehicle.movil}</span><div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{r.vehicle.plate}</div></td>
                    <td style={{ whiteSpace: 'normal', minWidth: 200 }}>{r.activity}{r.event && <div><span className="badge info" style={{ fontSize: 11 }}>{r.event.code}</span></div>}</td>
                    {admin && <td>{r.driver.name}</td>}
                    <td className="num">{km(r.kmOut)}</td><td className="num">{r.kmIn == null ? '—' : km(r.kmIn)}</td>
                    <td className="num"><strong>{r.kmDiff == null ? '—' : km(r.kmDiff)}</strong></td>
                    <td className="num">{r.fuelValue ? money(r.fuelValue) : '—'}</td>
                    <td>{r.status === 'abierto' ? <span className="badge warn"><span className="dot pulse" /> Abierto</span> : <span className="badge ok"><span className="dot" /> Cerrado</span>}</td>
                    <td className="actions">
                      {r.status === 'abierto'
                        ? (r.canClose
                          ? <button type="button" className="btn btn-primary btn-sm" onClick={() => setClosing(r)}><MdFlag /> Cerrar</button>
                          : <Link className="btn btn-outline btn-sm" to={`/socorro/vehiculos/reportes/${r.id}`} title="Esperando que finalice el servicio">Ver</Link>)
                        : <Link className="btn btn-outline btn-sm" to={`/socorro/vehiculos/reportes/${r.id}`}>Ver / PDF <MdArrowForward /></Link>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {creating && <NewTripModal onClose={() => setCreating(false)} />}
      {closing && <CloseTripModal trip={closing} onClose={() => setClosing(null)} onClosed={() => { setClosing(null); load(filters) }} />}
    </>
  )
}

export default TripsPage
