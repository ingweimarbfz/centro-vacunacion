import React, { useState } from 'react'
import { MdSearch, MdCheckCircle, MdErrorOutline, MdClose } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Spinner, initials } from '../../components/ui'

export const CATEGORY_LABELS = { medicamento: 'Medicamento', dispositivo_medico: 'Dispositivo médico', reactivo: 'Reactivo', operacional: 'Equipo operacional', no_operacional: 'Equipo no operacional' }
export const CATEGORY_PLURAL = { medicamento: 'Medicamentos', dispositivo_medico: 'Dispositivos médicos', reactivo: 'Reactivos de diagnóstico in vitro', operacional: 'Equipos operacionales', no_operacional: 'Equipos no operacionales' }
export const CATEGORY_TONE = { medicamento: 'brand', dispositivo_medico: 'ok', reactivo: 'warn', operacional: 'navy', no_operacional: 'info' }
export const CONSUMABLE = ['medicamento', 'dispositivo_medico', 'reactivo']
export const isConsumable = (c) => CONSUMABLE.includes(c)
export const STATE_LABELS = { bueno: 'Bueno', regular: 'Regular', malo: 'Malo', perdido: 'Perdido' }
export const STATE_TONE = { bueno: 'ok', regular: 'warn', malo: 'bad', perdido: 'bad' }
export const BLOOD_TYPES = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']
export const AGRUPACIONES = ['Socorrismo', 'Damas Grises', 'Juventud']

const TZ = 'America/Bogota'
export const fmtDateTime = (iso) => iso
  ? new Intl.DateTimeFormat('es-CO', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(iso))
  : '—'
export const fmtDate = (iso) => iso ? new Intl.DateTimeFormat('es-CO', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric' }).format(new Date(iso)) : '—'
export const fmtTime = (iso) => iso ? new Intl.DateTimeFormat('es-CO', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(iso)) : '—'
export const duration = (from, to) => {
  if (!from) return '—'
  const mins = Math.max(0, Math.round(((to ? new Date(to) : new Date()) - new Date(from)) / 60000))
  const h = Math.floor(mins / 60); const m = mins % 60
  return h ? `${h} h ${m} min` : `${m} min`
}
export const qty = (n) => (Number.isInteger(n) ? n : Number(n).toFixed(1))

export const StatusBadge = ({ status }) => status === 'en_curso'
  ? <span className="badge warn"><span className="dot pulse" /> En curso</span>
  : <span className="badge ok"><span className="dot" /> Finalizado</span>

// Busca una persona registrada por carnet o documento.
export const PersonLookup = ({ onFound, label = 'Carnet o documento', autoFocus, compact, excludeEventId, siteId }) => {
  const [value, setValue] = useState('')
  const [found, setFound] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const search = async (e) => {
    e?.preventDefault()
    if (!value.trim()) return
    setLoading(true); setError(''); setFound(null)
    try {
      const { data } = await api.get('/socorro/personas/buscar', { params: { valor: value.trim(), ...(siteId ? { sede: siteId } : {}) } })
      // Una persona solo puede estar en un evento en curso a la vez.
      if (data.activeEvent && data.activeEvent.id !== excludeEventId) {
        setError(`${data.fullName} ya está en el evento en curso ${data.activeEvent.code} · ${data.activeEvent.name}. Debe finalizar o retirarse de ese evento primero.`)
        onFound?.(null)
        return
      }
      // El seguro debe estar vigente para participar en actividades o servicios.
      if (data.insuranceExpired) {
        setError(`El seguro de ${data.fullName} está vencido${data.insuranceExpiry ? ` (${data.insuranceExpiry.split('-').reverse().join('/')})` : ''}. Debe actualizarlo en Personas antes de registrarse en una actividad o servicio.`)
        onFound?.(null)
        return
      }
      setFound(data)
      onFound?.(data)
    } catch (err) {
      setError(errorMessage(err))
      onFound?.(null)
    } finally {
      setLoading(false)
    }
  }

  const clear = () => { setFound(null); setValue(''); onFound?.(null) }

  return (
    <div className="field">
      <label>{label}</label>
      {!found ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <div className="input-icon" style={{ flex: 1 }}>
            <MdSearch />
            <input value={value} autoFocus={autoFocus} onChange={(e) => setValue(e.target.value)} placeholder="Ej. CRC-0103 o 1065…"
              onKeyDown={(e) => { if (e.key === 'Enter') search(e) }} />
          </div>
          <button type="button" className="btn btn-outline" onClick={search} disabled={loading}>{loading ? <Spinner /> : 'Buscar'}</button>
        </div>
      ) : (
        <div className="person-found">
          <span className="avatar sm">{initials(found.fullName)}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <strong>{found.fullName}</strong>
            {found.visitor && <span className="badge info" style={{ fontSize: 11 }}>Visitante · {found.siteName}</span>}
            {found.paid && <span className="badge warn" style={{ fontSize: 11 }} title="Personal remunerado: no suma horas de voluntariado">Remunerado</span>}
            <span>{found.carnet || 'Sin carnet'} · CC {found.document}{!compact && found.bloodType ? ` · ${found.bloodType}` : ''}{!compact && found.agrupacion ? ` · ${found.agrupacion}` : ''}</span>
          </div>
          <MdCheckCircle style={{ color: 'var(--ok)', fontSize: 20 }} />
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={clear} aria-label="Cambiar persona"><MdClose /></button>
        </div>
      )}
      {error && <span className="error" style={{ display: 'flex', gap: 4, alignItems: 'center' }}><MdErrorOutline /> {error}</span>}
    </div>
  )
}
