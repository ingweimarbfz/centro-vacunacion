import React, { useEffect, useState } from 'react'
import { MdAdd, MdDelete, MdSave, MdErrorOutline, MdAlarm } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { Card, Spinner, useToast } from '../components/ui'

const SHIFTS = { manana: 'Mañana', tarde: 'Tarde' }

// Cadena de frío → Configuración: horas a las que se recuerda registrar la temperatura.
const ColdChainReminderSettings = () => {
  const [toast, toastNode] = useToast()
  const [f, setF] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { api.get('/temperatura/recordatorios').then(({ data }) => setF({ enabled: data.enabled, reminders: data.reminders })).catch((e) => setErr(errorMessage(e))) }, [])
  const setRow = (i, k, v) => setF({ ...f, reminders: f.reminders.map((r, j) => (j === i ? { ...r, [k]: v } : r)) })
  const add = () => {
    const last = f.reminders[f.reminders.length - 1]
    setF({ ...f, reminders: [...f.reminders, { time: '', shift: last?.shift || 'manana' }] })
  }
  const save = async () => {
    setErr('')
    if (f.reminders.some((r) => !r.time)) return setErr('Escribe la hora de cada recordatorio.')
    setBusy(true)
    try { const { data } = await api.put('/temperatura/recordatorios', f); setF(data); toast('Recordatorios guardados') } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }
  return (
    <div style={{ marginTop: 18, maxWidth: 640 }}>
      <Card title="Recordatorios del registro de temperatura" icon={<MdAlarm style={{ color: 'var(--brand)' }} />}
        subtitle="Cada día se registran la mañana y la tarde (mínima y máxima). A la hora indicada se avisa al personal si esa jornada no se ha registrado">
        {!f ? (err ? <div className="alert bad"><MdErrorOutline /><span>{err}</span></div> : <div className="splash" style={{ minHeight: 80 }}><Spinner /></div>) : (
          <div className="stack" style={{ gap: 12 }}>
            <label className="switch"><input type="checkbox" checked={f.enabled} onChange={(e) => setF({ ...f, enabled: e.target.checked })} /> {f.enabled ? 'Recordatorios activos' : 'Recordatorios desactivados'}</label>
            <div className="stack" style={{ gap: 8, opacity: f.enabled ? 1 : 0.55 }}>
              {f.reminders.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input type="time" className="input" style={{ width: 130 }} value={r.time} onChange={(e) => setRow(i, 'time', e.target.value)} aria-label="Hora del recordatorio" />
                  <span className="hint" style={{ whiteSpace: 'nowrap' }}>si no se ha registrado la</span>
                  <select className="input" style={{ width: 120 }} value={r.shift} onChange={(e) => setRow(i, 'shift', e.target.value)} aria-label="Jornada">{Object.entries(SHIFTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                  <button type="button" className="btn btn-ghost btn-icon" aria-label="Quitar recordatorio" style={{ color: 'var(--bad)', marginLeft: 'auto' }} onClick={() => setF({ ...f, reminders: f.reminders.filter((_, j) => j !== i) })}><MdDelete /></button>
                </div>
              ))}
              {f.reminders.length === 0 && <span className="hint">Sin recordatorios.</span>}
            </div>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={add} disabled={f.reminders.length >= 10}><MdAdd /> Agregar hora</button>
              <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <MdSave />} Guardar</button>
            </div>
            {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
          </div>
        )}
      </Card>
      {toastNode}
    </div>
  )
}

export default ColdChainReminderSettings
