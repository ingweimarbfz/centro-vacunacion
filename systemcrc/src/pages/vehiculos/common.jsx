import React, { useRef, useState } from 'react'
import { MdSearch, MdClose, MdPhotoCamera, MdDirectionsCar, MdLocalShipping, MdTwoWheeler, MdAirportShuttle, MdErrorOutline, MdCheckCircle } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Spinner } from '../../components/ui'
import { resizeImage } from '../../utils/image'

export const VEHICLE_STATUS = {
  activo: ['Activo', 'ok'],
  mantenimiento: ['En mantenimiento', 'warn'],
  fuera_servicio: ['Fuera de servicio', '']
}
export const MAINT_TYPE = { preventivo: ['Preventivo', 'info'], correctivo: ['Correctivo', 'warn'] }
export const DOC_TYPES = { soat: 'SOAT', tecnomecanica: 'Revisión tecnomecánica', poliza: 'Póliza', otro: 'Otro' }
export const PHOTO_SLOTS = [['front', 'Frontal'], ['left', 'Lateral izquierdo'], ['right', 'Lateral derecho'], ['back', 'Trasera']]

export const km = (n) => (n == null ? '—' : `${new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 }).format(n)} km`)
export const money = (n) => (n == null ? '—' : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n))
export const dateLabel = (iso) => {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

export const VehicleIcon = ({ type, ...rest }) => {
  const t = (type || '').toLowerCase()
  if (t.includes('moto')) return <MdTwoWheeler {...rest} />
  if (t.includes('ambulancia') || t.includes('bus')) return <MdAirportShuttle {...rest} />
  if (t.includes('camión') || t.includes('camion')) return <MdLocalShipping {...rest} />
  return <MdDirectionsCar {...rest} />
}

export const StatusPill = ({ status }) => {
  const [label, tone] = VEHICLE_STATUS[status] || [status, '']
  return <span className={`badge ${tone}`}><span className="dot" /> {label}</span>
}

export const DocBadge = ({ doc, label = 'SOAT' }) => {
  if (!doc) return <span className="badge bad">Sin {label}</span>
  if (doc.daysLeft < 0) return <span className="badge bad">{label} vencido</span>
  if (doc.daysLeft <= 30) return <span className="badge warn">{label}: {doc.daysLeft} días</span>
  return <span className="badge ok">{label} al día</span>
}

// Búsqueda de vehículo por número de móvil (o placa).
export const VehicleLookup = ({ onFound, autoFocus }) => {
  const [value, setValue] = useState('')
  const [found, setFound] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const search = async () => {
    if (!value.trim()) return
    setLoading(true); setError(''); setFound(null)
    try {
      const { data } = await api.get('/vehiculos/buscar', { params: { movil: value.trim() } })
      setFound(data); onFound?.(data)
    } catch (e) { setError(errorMessage(e)); onFound?.(null) } finally { setLoading(false) }
  }
  const clear = () => { setFound(null); setValue(''); onFound?.(null) }
  return (
    <div className="field">
      <label>Número de móvil <span className="req">*</span></label>
      {!found ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="input-icon" style={{ flex: 1 }}><MdSearch />
            <input value={value} autoFocus={autoFocus} onChange={(e) => setValue(e.target.value)} placeholder="Ej. 101" inputMode="numeric"
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search() } }} />
          </div>
          <button type="button" className="btn btn-outline" onClick={search} disabled={loading}>{loading ? <Spinner /> : 'Buscar'}</button>
        </div>
      ) : (
        <div className="person-found">
          <span className="icon-bubble brand"><VehicleIcon type={found.vehicleType} /></span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>Móvil {found.movil} · {found.plate}</strong>
            <span>{found.vehicleType} {found.brand} {found.line} · {km(found.currentKm)} · {found.siteName}</span>
            {found.visitor && <span className="badge info" style={{ fontSize: 11 }}>Vehículo de otra sede: irás como conductor visitante</span>}
          </div>
          <MdCheckCircle style={{ color: 'var(--ok)', fontSize: 20 }} />
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={clear} aria-label="Cambiar vehículo"><MdClose /></button>
        </div>
      )}
      {error && <span className="error" style={{ display: 'flex', gap: 4, alignItems: 'center' }}><MdErrorOutline /> {error}</span>}
      {found?.openTrip && <span className="error">Esta móvil tiene una actividad abierta ({found.openTrip.code}); ciérrala antes de iniciar otra.</span>}
    </div>
  )
}

// Foto desde archivo o cámara (en celular abre la cámara trasera). Devuelve un dataURL reducido.
export const PhotoField = ({ label, value, onChange, required, hint }) => {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const pick = async (file) => {
    if (!file) return
    setBusy(true)
    try { onChange(await resizeImage(file, { max: 1280, type: 'image/jpeg', quality: 0.82 })) } finally {
      setBusy(false); if (ref.current) ref.current.value = ''
    }
  }
  return (
    <div className="field">
      <label>{label}{required && <span className="req"> *</span>}</label>
      <input ref={ref} type="file" accept="image/*" capture="environment" hidden onChange={(e) => pick(e.target.files[0])} />
      {value ? (
        <div className="photo-field">
          <img src={value} alt={label} />
          <button type="button" className="btn btn-outline btn-sm" onClick={() => ref.current.click()}><MdPhotoCamera /> Cambiar</button>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => onChange(null)} aria-label="Quitar foto"><MdClose /></button>
        </div>
      ) : (
        <button type="button" className="photo-drop" onClick={() => ref.current.click()} disabled={busy}>
          {busy ? <Spinner /> : <MdPhotoCamera />} <span>Tomar o cargar foto</span>
        </button>
      )}
      {hint && <span className="hint">{hint}</span>}
    </div>
  )
}
