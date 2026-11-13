import React, { useEffect, useRef, useState } from 'react'
import { MdErrorOutline, MdSave, MdPhotoCamera } from 'react-icons/md'
import api, { errorMessage, getSiteFilter } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Modal, Spinner } from '../../components/ui'
import { resizeImage } from '../../utils/image'
import { DOC_TYPE_LABELS, SEX, BLOOD, today, useCatalogs } from './common'
import { sanitize, check } from '../../utils/validate'

const EMPTY = {
  documentType: 'CC', document: '', firstName: '', lastName: '', birthDate: '', sex: '', bloodType: '', phone: '', email: '', address: '', city: '',
  profession: '', professionalCard: '', rethus: '', positionId: '', eps: '', arl: '', pensionFund: '', severanceFund: '',
  emergencyContact: '', emergencyPhone: '', notes: '', status: 'activo', siteId: '',
  specialty: '', assignedService: '', hireDate: '', educationLevel: '', degreeTitle: '', institution: '', graduationYear: '', rethusVerifiedAt: ''
}

// Formulario de hoja de vida: datos personales, profesionales, de seguridad social y de contacto.
const StaffForm = ({ initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const cat = useCatalogs()
  const [sites, setSites] = useState([])
  const [f, setF] = useState(() => {
    if (!editing) return { ...EMPTY, siteId: admin ? String(getSiteFilter() || '') : '' }
    const o = { ...EMPTY }
    for (const k of Object.keys(EMPTY)) if (initial[k] != null) o[k] = typeof initial[k] === 'number' ? String(initial[k]) : initial[k]
    return o
  })
  const [photo, setPhoto] = useState(null)
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  useEffect(() => { if (admin) api.get('/sedes', { params: { sede: undefined } }).then(({ data }) => setSites(data.filter((s) => s.active !== false))).catch(() => {}) }, [admin])
  const CLEAN = { phone: sanitize.phone, emergencyPhone: sanitize.phone, document: (v) => sanitize.doc(v, f.documentType) }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : CLEAN[k] ? CLEAN[k](e.target.value) : e.target.value })
  const pickPhoto = async (file) => { if (file) { try { setPhoto(await resizeImage(file, { max: 600, type: 'image/jpeg', quality: 0.85 })) } catch { setError('No se pudo leer la foto') } } }

  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.document.trim() || !f.firstName.trim() || !f.lastName.trim()) return setError('Documento, nombres y apellidos son requeridos.')
    if (admin && !editing && !f.siteId) return setError('Selecciona la sede.')
    const bad = [['N° de documento', check.doc(f.document, f.documentType || 'CC')], ['Teléfono', check.phone(f.phone)], ['Teléfono del contacto de emergencia', check.phone(f.emergencyPhone)], ['Correo', check.email(f.email)]].find(([, m]) => m)
    if (bad) return setError(`${bad[0]}: ${bad[1]}.`)
    setSaving(true)
    try {
      const body = { ...f, photo: photo || undefined }
      const { data } = editing ? await api.put(`/estandares/th/personal/${initial.id}`, body) : await api.post('/estandares/th/personal', body)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  const field = (k, label, props = {}) => <div className="field"><label>{label}{props.required && <span className="req"> *</span>}</label><input value={f[k]} onChange={set(k)} {...props} required={undefined} /></div>
  const preview = photo || initial?.photoUrl

  return (
    <Modal title={editing ? `Editar hoja de vida · ${initial.fullName}` : 'Nueva hoja de vida'} size="lg" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="th-staff-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <MdSave />} {editing ? 'Guardar cambios' : 'Crear hoja de vida'}</button></>}>
      <form id="th-staff-form" onSubmit={submit} noValidate className="stack" style={{ gap: 18 }}>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <button type="button" className="th-photo" onClick={() => fileRef.current.click()} aria-label="Cargar foto">
            {preview ? <img src={preview} alt="Foto" /> : <MdPhotoCamera />}
          </button>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files[0])} />
          <div><strong>Foto del profesional</strong><div className="hint">Opcional. Aparece en la hoja de vida impresa.</div></div>
        </div>

        <div><span className="label">Datos personales</span>
          <div className="form-grid" style={{ marginTop: 8 }}>
            <div className="field"><label>Tipo de documento</label><select value={f.documentType} onChange={set('documentType')}>{Object.entries(DOC_TYPE_LABELS).map(([k, l]) => <option key={k} value={k}>{k} · {l}</option>)}</select></div>
            {field('document', 'N° de documento', { required: true, inputMode: 'numeric', placeholder: '1065123456' })}
            {field('firstName', 'Nombres', { required: true })}
            {field('lastName', 'Apellidos', { required: true })}
            <div className="field"><label>Fecha de nacimiento</label><input type="date" value={f.birthDate} max={today()} onChange={set('birthDate')} /></div>
            <div className="field"><label>Sexo</label><select value={f.sex} onChange={set('sex')}><option value="">—</option>{Object.entries(SEX).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div className="field"><label>Grupo sanguíneo (RH)</label><select value={f.bloodType} onChange={set('bloodType')}><option value="">—</option>{BLOOD.map((b) => <option key={b} value={b}>{b}</option>)}</select></div>
            {field('phone', 'Teléfono / celular', { inputMode: 'numeric', maxLength: 10, placeholder: '3001234567' })}
            {field('email', 'Correo electrónico', { type: 'email', placeholder: 'nombre@correo.com' })}
            {field('address', 'Dirección de residencia')}
            {field('city', 'Municipio')}
          </div>
        </div>

        <div><span className="label">Vinculación</span>
          <div className="form-grid" style={{ marginTop: 8 }}>
            {admin && <div className="field"><label>Sede <span className="req">*</span></label><select value={f.siteId} onChange={set('siteId')}><option value="">Selecciona…</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
            <div className="field"><label>Cargo (denominación)</label><select value={f.positionId} onChange={set('positionId')}><option value="">Sin cargo</option>{(cat?.positions || []).filter((p) => p.active || String(p.id) === f.positionId).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select><span className="hint">Define los requisitos que se verifican</span></div>
            <div className="field"><label>Profesión</label><input list="th-professions" value={f.profession} onChange={set('profession')} placeholder="Elige o escribe" /></div>
            {field('specialty', 'Especialidad', { placeholder: 'NA si no aplica' })}
            <div className="field"><label>Servicio asignado</label><input list="th-services" value={f.assignedService} onChange={set('assignedService')} placeholder="Ej: VACUNACIÓN" /></div>
            <div className="field"><label>Fecha de ingreso</label><input type="date" value={f.hireDate} max={today()} onChange={set('hireDate')} /></div>
            <div className="field"><label>Estado</label><select value={f.status} onChange={set('status')}>{Object.entries(cat?.staffStatus || { activo: 'Activo', inactivo: 'Inactivo', por_eventos: 'Por eventos' }).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          </div>
          <datalist id="th-professions">{(cat?.professions || []).map((p) => <option key={p} value={p} />)}</datalist>
          <datalist id="th-services">{(cat?.services || []).map((p) => <option key={p} value={p} />)}</datalist>
        </div>

        <div><span className="label">Formación y habilitación legal</span>
          <div className="form-grid" style={{ marginTop: 8 }}>
            <div className="field"><label>Nivel máximo de formación</label><select value={f.educationLevel} onChange={set('educationLevel')}><option value="">—</option>{(cat?.educationLevels || []).map((l) => <option key={l} value={l}>{l}</option>)}</select></div>
            {field('degreeTitle', 'Título obtenido')}
            {field('institution', 'Institución educativa')}
            {field('graduationYear', 'Año de graduación', { type: 'number', min: 1950, max: 2100 })}
            {field('professionalCard', 'Nº tarjeta profesional / resolución')}
            {field('rethus', 'Registro ReTHUS')}
            <div className="field"><label>Fecha de verificación ReTHUS</label><input type="date" value={f.rethusVerifiedAt} max={today()} onChange={set('rethusVerifiedAt')} /></div>
          </div>
        </div>

        <div><span className="label">Seguridad social</span>
          <div className="form-grid" style={{ marginTop: 8 }}>
            {field('eps', 'EPS')}{field('arl', 'ARL')}{field('pensionFund', 'Fondo de pensiones')}{field('severanceFund', 'Fondo de cesantías')}
          </div>
        </div>

        <div><span className="label">Contacto de emergencia y observaciones</span>
          <div className="form-grid" style={{ marginTop: 8 }}>
            {field('emergencyContact', 'Nombre del contacto')}{field('emergencyPhone', 'Teléfono del contacto', { inputMode: 'numeric', placeholder: '3001234567' })}
            <div className="field span-all"><label>Observaciones</label><textarea value={f.notes} onChange={set('notes')} style={{ minHeight: 56 }} /></div>
          </div>
        </div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

export default StaffForm
