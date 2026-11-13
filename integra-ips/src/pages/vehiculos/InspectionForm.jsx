import React, { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdCheckCircle, MdCancel, MdPhotoCamera, MdClose, MdSave, MdErrorOutline, MdHealthAndSafety, MdDirectionsCar, MdNotes, MdPerson } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Spinner } from '../../components/ui'
import { resizeImage } from '../../utils/image'
import { VehicleLookup, km } from './common'

// Varias fotos (cámara o galería) con miniaturas.
export const PhotosField = ({ value, onChange, max = 3, label = 'Agregar foto' }) => {
  const ref = useRef(null)
  const [busy, setBusy] = useState(false)
  const add = async (files) => {
    setBusy(true)
    try {
      const list = []
      for (const f of [...files].slice(0, max - value.length)) list.push(await resizeImage(f, { max: 1024, type: 'image/jpeg', quality: 0.8 }))
      onChange([...value, ...list])
    } finally { setBusy(false); if (ref.current) ref.current.value = '' }
  }
  return (
    <div className="photos-field">
      {value.map((src, i) => (
        <div key={i} className="photo-thumb"><img src={src} alt={`Foto ${i + 1}`} />
          <button type="button" aria-label="Quitar foto" onClick={() => onChange(value.filter((_, j) => j !== i))}><MdClose /></button></div>
      ))}
      {value.length < max && (
        <button type="button" className="photo-add" onClick={() => ref.current.click()} disabled={busy}>
          {busy ? <Spinner /> : <MdPhotoCamera />}<span>{label}</span>
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" capture="environment" multiple hidden onChange={(e) => add(e.target.files)} />
    </div>
  )
}

const YesNo = ({ value, onChange, name }) => (
  <div className="yesno" role="radiogroup" aria-label={name}>
    <button type="button" className={value === true ? 'on yes' : ''} onClick={() => onChange(true)} aria-pressed={value === true}><MdCheckCircle /> Cumple</button>
    <button type="button" className={value === false ? 'on no' : ''} onClick={() => onChange(false)} aria-pressed={value === false}><MdCancel /> No cumple</button>
  </div>
)

const now = () => new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())

const InspectionForm = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [items, setItems] = useState([])
  const [vehicle, setVehicle] = useState(null)
  const [f, setF] = useState({ km: '', driverFit: null, driverFitObservation: '', generalObservation: '' })
  const [answers, setAnswers] = useState({})
  const [generalPhotos, setGeneralPhotos] = useState([])
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => { api.get('/vehiculos-preoperacional/items').then(({ data }) => setItems(data)).catch(() => {}) }, [])
  useEffect(() => { if (vehicle) setF((x) => ({ ...x, km: vehicle.currentKm })) }, [vehicle])

  const setAns = (key, patch) => setAnswers((a) => ({ ...a, [key]: { ok: null, observation: '', photos: [], ...a[key], ...patch } }))
  const answered = items.filter((i) => typeof answers[i.key]?.ok === 'boolean').length
  const anomalies = items.filter((i) => answers[i.key]?.ok === false).length + (f.driverFit === false ? 1 : 0)
  const allOk = () => items.forEach((i) => { if (answers[i.key]?.ok !== false) setAns(i.key, { ok: true }) })

  const submit = async () => {
    setError('')
    if (!vehicle) return setError('Busca el vehículo por su número de móvil.')
    if (f.km === '' || Number(f.km) < vehicle.currentKm) return setError(`El kilometraje no puede ser menor a ${vehicle.currentKm} km.`)
    if (f.driverFit === null) return setError('Responde si estás en condiciones de salud y descanso para conducir.')
    if (f.driverFit === false && !f.driverFitObservation.trim()) return setError('Describe por qué no estás en condiciones de conducir.')
    const missing = items.filter((i) => typeof answers[i.key]?.ok !== 'boolean')
    if (missing.length) return setError(`Faltan por responder: ${missing.map((i) => i.label).join(', ')}.`)
    const noObs = items.filter((i) => answers[i.key].ok === false && !answers[i.key].observation.trim())
    if (noObs.length) return setError(`Describe la anomalía en: ${noObs.map((i) => i.label).join(', ')}.`)
    setSaving(true)
    try {
      const { data } = await api.post('/vehiculos-preoperacional', {
        vehicleId: vehicle.id, km: Number(f.km), driverFit: f.driverFit, driverFitObservation: f.driverFitObservation,
        items: items.map((i) => ({ key: i.key, ok: answers[i.key].ok, observation: answers[i.key].observation, photos: answers[i.key].ok ? [] : answers[i.key].photos })),
        generalObservation: f.generalObservation, generalPhotos
      })
      navigate(`/socorro/vehiculos/preoperacional/${data.id}`, { replace: true })
    } catch (e) { setError(errorMessage(e)); setSaving(false); window.scrollTo({ top: 0, behavior: 'smooth' }) }
  }

  return (
    <>
      <PageHead title="Preoperacional del vehículo" subtitle="Lista de chequeo diaria antes de salir · basada en el formato SURA para automóvil o pick-up" />
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}

      <div className="stack">
        <Card title="1. Información general" icon={<MdDirectionsCar style={{ color: 'var(--brand)' }} />}>
          <div className="form-grid">
            <div className="field"><label>Nombre del conductor</label><input value={user.fullName} readOnly /></div>
            <div className="field"><label>Documento de identidad</label><input value={user.identification} readOnly /></div>
            <div className="field"><label>Fecha y hora</label><input value={now()} readOnly /></div>
          </div>
          <div className="form-grid" style={{ marginTop: 14 }}>
            <VehicleLookup onFound={setVehicle} autoFocus />
            <div className="field"><label>Placa</label><input value={vehicle?.plate || ''} readOnly placeholder="Se completa al buscar" /></div>
            <div className="field"><label>Kilometraje (tacómetro) <span className="req">*</span></label>
              <input type="number" min={vehicle?.currentKm || 0} value={f.km} onChange={(e) => setF({ ...f, km: e.target.value })} disabled={!vehicle} />
              {vehicle && <span className="hint">Último registrado: {km(vehicle.currentKm)}</span>}</div>
          </div>
        </Card>

        <Card title="2. Condiciones del conductor" subtitle="Para garantizar una movilidad segura, revisa tu estado de salud" icon={<MdPerson style={{ color: 'var(--brand)' }} />}>
          <div className={`check-row${f.driverFit === false ? ' bad' : ''}`}>
            <div className="check-text"><strong>¿Estás en condiciones de salud y descanso para usar el vehículo?</strong><span>Sin malestar, mareos, fiebre, sueño u otros síntomas.</span></div>
            <YesNo value={f.driverFit} onChange={(v) => setF({ ...f, driverFit: v })} name="Condición del conductor" />
            {f.driverFit === false && <div className="field check-obs"><label>Observación <span className="req">*</span></label><input value={f.driverFitObservation} onChange={(e) => setF({ ...f, driverFitObservation: e.target.value })} placeholder="Describe tu condición" /></div>}
          </div>
        </Card>

        <Card title="3. Condiciones del vehículo" subtitle={`${answered} de ${items.length} ítems revisados · si algo no cumple, descríbelo y agrega fotos`} icon={<MdHealthAndSafety style={{ color: 'var(--brand)' }} />}
          actions={<button type="button" className="btn btn-outline btn-sm" onClick={allOk}><MdCheckCircle /> Marcar el resto como "Cumple"</button>}>
          {items.length === 0 ? <div className="splash" style={{ minHeight: 120 }}><Spinner /></div> : items.map((it, n) => {
            const a = answers[it.key] || {}
            return (
              <div key={it.key} className={`check-row${a.ok === false ? ' bad' : a.ok ? ' good' : ''}`}>
                <div className="check-text"><strong>{n + 1}. {it.label}</strong><span>{it.help}</span></div>
                <YesNo value={a.ok ?? null} onChange={(v) => setAns(it.key, { ok: v })} name={it.label} />
                {a.ok === false && (
                  <div className="check-obs">
                    <div className="field"><label>Observación / hallazgo <span className="req">*</span></label><input value={a.observation} onChange={(e) => setAns(it.key, { observation: e.target.value })} placeholder="Describe la anomalía" /></div>
                    <PhotosField value={a.photos || []} onChange={(p) => setAns(it.key, { photos: p })} max={3} />
                  </div>
                )}
              </div>
            )
          })}
        </Card>

        <Card title="Observación general" icon={<MdNotes style={{ color: 'var(--brand)' }} />}>
          <div className="field"><textarea value={f.generalObservation} onChange={(e) => setF({ ...f, generalObservation: e.target.value })} placeholder="Otras novedades del vehículo (opcional)" /></div>
          <div style={{ marginTop: 12 }}><span className="label">Fotos generales (opcional, máx. 6)</span><div style={{ marginTop: 8 }}><PhotosField value={generalPhotos} onChange={setGeneralPhotos} max={6} /></div></div>
        </Card>

        <div className={`alert ${anomalies ? 'warn' : 'ok'}`}>
          {anomalies ? <MdCancel /> : <MdCheckCircle />}
          <span>{anomalies ? <><b>{anomalies} anomalía{anomalies === 1 ? '' : 's'}</b>: el vehículo quedará como <b>NO APTO</b> y se informará al administrador de la flota, quien decidirá si puede movilizarse.</> : <>Si todo cumple, el vehículo quedará como <b>APTO</b> para operar hoy.</>}</span>
        </div>
        <div className="form-actions" style={{ marginTop: 0 }}>
          <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <><Spinner /> Guardando…</> : <><MdSave /> Registrar preoperacional</>}</button>
        </div>
      </div>
    </>
  )
}

export default InspectionForm
