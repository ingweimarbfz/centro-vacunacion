import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdAlarm, MdClose, MdThermostat } from 'react-icons/md'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { canSee } from '../utils/permissions'

const SHIFT = { manana: 'mañana', tarde: 'tarde' }
const nowBogota = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
const seenKey = (date, time) => `cv_temp_rem:${date}:${time}`
const wasSeen = (k) => { try { return sessionStorage.getItem(k) === '1' } catch { return false } }
const markSeen = (k) => { try { sessionStorage.setItem(k, '1') } catch { /* sin almacenamiento */ } }

// Aviso (toast) cuando llega una hora configurada y la jornada de temperatura aún no se registra.
const TemperatureReminder = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const allowed = canSee(user, { roles: ['administrador', 'empleado'], module: 'temperatura', service: 'cadena_frio' })
  const [alert, setAlert] = useState(null)
  const check = useCallback(async () => {
    try {
      const { data } = await api.get('/temperatura/recordatorios')
      if (!data.enabled || !data.reminders.length) return setAlert(null)
      const now = nowBogota()
      const due = data.reminders.filter((r) => r.time <= now).pop()
      if (!due) return setAlert(null)
      const pending = data.sites.filter((s) => !s.done[`${due.shift}-${due.slot || 1}`])
      const key = seenKey(data.today, due.time)
      if (!pending.length || wasSeen(key)) return setAlert(null)
      setAlert({ key, time: due.time, shift: due.shift, slot: due.slot || 1, sites: pending })
    } catch { /* sin conexión: se intenta en el próximo ciclo */ }
  }, [])
  useEffect(() => {
    if (!allowed) return undefined
    check()
    const id = setInterval(check, 60000)
    return () => clearInterval(id)
  }, [allowed, check])
  if (!allowed || !alert) return null
  const close = () => { markSeen(alert.key); setAlert(null) }
  const many = alert.sites.length > 1
  return (
    <div className="temp-reminder" role="alert">
      <span className="temp-reminder-icon"><MdAlarm /></span>
      <div className="temp-reminder-body">
        <strong>Recordatorio de temperatura · {alert.time}</strong>
        <span>Aún no se registra la <b>{alert.slot}.ª lectura de la {SHIFT[alert.shift]?.toLowerCase()}</b>{many ? ` en ${alert.sites.length} sedes` : alert.sites[0]?.siteName ? ` en ${alert.sites[0].siteName}` : ''}.</span>
        {many && <span className="hint">{alert.sites.map((s) => s.siteName).join(' · ')}</span>}
        <div className="temp-reminder-actions">
          <button type="button" className="btn btn-primary btn-sm" onClick={() => { close(); navigate('/temperatura') }}><MdThermostat /> Registrar ahora</button>
          <button type="button" className="btn btn-ghost btn-sm" onClick={close}>Más tarde</button>
        </div>
      </div>
      <button type="button" className="btn btn-ghost btn-icon temp-reminder-x" aria-label="Cerrar" onClick={close}><MdClose /></button>
    </div>
  )
}

export default TemperatureReminder
