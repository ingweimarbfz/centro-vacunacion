import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MdAdd, MdErrorOutline, MdGroups, MdArrowForward, MdSearch } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { SITE_TYPES } from '../../utils/permissions'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { DOC_TYPES, STUDENT_STATUS, EDUCATION_LEVELS, StatusBadge } from './common'

const EMPTY = { docType: 'CC', docNumber: '', firstName: '', lastName: '', birthDate: '', gender: '', phone: '', email: '', address: '', municipality: '', eps: '', educationLevel: '', guardianName: '', guardianPhone: '', siteId: '', status: 'activo', notes: '' }

// Datos del estudiante (ficha). El acudiente aplica para menores de edad.
export const StudentForm = ({ initial, onClose, onSaved }) => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => ({ ...EMPTY, ...Object.fromEntries(Object.entries(initial || {}).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])) }))
  const [sites, setSites] = useState([])
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  useEffect(() => { if (admin) api.get('/sedes', { params: { sede: undefined } }).then(({ data }) => setSites(data)).catch(() => {}) }, [admin])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.docNumber.trim() || !f.firstName.trim() || !f.lastName.trim()) return setError('El documento, los nombres y los apellidos son requeridos.')
    setSaving(true)
    try {
      const { data } = editing ? await api.put(`/academico/estudiantes/${initial.id}`, f) : await api.post('/academico/estudiantes', f)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? `Editar a ${initial.fullName}` : 'Nuevo estudiante'} onClose={onClose} size="lg"
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="stu-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} Guardar</button></>}>
      <form id="stu-form" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div className="field"><label>Tipo de documento</label><select value={f.docType} onChange={set('docType')}>{Object.entries(DOC_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Número <span className="req">*</span></label><input value={f.docNumber} onChange={set('docNumber')} inputMode={['CC', 'TI', 'RC'].includes(f.docType) ? 'numeric' : 'text'} autoFocus /></div>
          <div className="field"><label>Fecha de nacimiento</label><input type="date" value={f.birthDate} onChange={set('birthDate')} /></div>
          <div className="field"><label>Nombres <span className="req">*</span></label><input value={f.firstName} onChange={set('firstName')} /></div>
          <div className="field"><label>Apellidos <span className="req">*</span></label><input value={f.lastName} onChange={set('lastName')} /></div>
          <div className="field"><label>Sexo</label><select value={f.gender} onChange={set('gender')}><option value="">—</option><option>Femenino</option><option>Masculino</option><option>Otro</option></select></div>
          <div className="field"><label>Celular</label><input type="tel" inputMode="numeric" value={f.phone} onChange={set('phone')} placeholder="3001234567" /><span className="hint">También para avisos por Telegram.</span></div>
          <div className="field"><label>Correo</label><input type="email" value={f.email} onChange={set('email')} placeholder="nombre@correo.com" /></div>
          <div className="field"><label>EPS</label><input value={f.eps} onChange={set('eps')} /></div>
          <div className="field"><label>Dirección</label><input value={f.address} onChange={set('address')} /></div>
          <div className="field"><label>Municipio</label><input value={f.municipality} onChange={set('municipality')} /></div>
          <div className="field"><label>Nivel educativo</label><select value={f.educationLevel} onChange={set('educationLevel')}><option value="">—</option>{EDUCATION_LEVELS.map((l) => <option key={l}>{l}</option>)}</select></div>
          <div className="field"><label>Acudiente (si es menor)</label><input value={f.guardianName} onChange={set('guardianName')} /></div>
          <div className="field"><label>Teléfono del acudiente</label><input type="tel" inputMode="numeric" value={f.guardianPhone} onChange={set('guardianPhone')} /></div>
          {admin && <div className="field"><label>Sede</label>
            <select value={f.siteId} onChange={set('siteId')}>
              <option value="">Seccional (por defecto)</option>
              {Object.entries(SITE_TYPES).map(([t, l]) => <optgroup key={t} label={l}>{sites.filter((x) => x.type === t).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>)}
            </select></div>}
          {editing && <div className="field"><label>Estado</label><select value={f.status} onChange={set('status')}>{Object.entries(STUDENT_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>}
          <div className="field span-all"><label>Observaciones</label><input value={f.notes} onChange={set('notes')} /></div>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

const StudentsPage = () => {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null)
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(params.get('nuevo') === '1')
  const load = useCallback(() => api.get('/academico/estudiantes', { params: { q: q.trim() || undefined, estado: status || undefined } }).then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))), [q, status])
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t) }, [load])
  const close = () => { setCreating(false); if (params.get('nuevo')) setParams({}) }

  return (
    <>
      <PageHead title="Estudiantes" subtitle="Ficha de cada estudiante, sus matrículas y su acceso al portal">
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><MdAdd /> Nuevo estudiante</button>
      </PageHead>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <div className="input-icon" style={{ flex: '1 1 260px' }}><MdSearch /><input className="input" aria-label="Buscar estudiante" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre o documento" /></div>
        <select className="input" style={{ width: 'auto', minWidth: 200 }} aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(STUDENT_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? (!error && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>) : rows.length === 0 ? (
        <Card><Empty icon={<MdGroups />}>{q || status ? 'Ningún estudiante coincide con la búsqueda.' : 'Aún no hay estudiantes registrados.'}</Empty></Card>
      ) : (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Estudiante</th><th>Documento</th><th>Contacto</th><th>Matrícula activa</th><th>Sede</th><th>Estado</th><th className="actions" /></tr></thead>
              <tbody>{rows.map((s) => (
                <tr key={s.id}>
                  <td><Link to={`/educacion/estudiantes/${s.id}`} style={{ color: 'var(--ink)' }}><b>{s.fullName}</b></Link></td>
                  <td>{s.docType} {s.docNumber}</td>
                  <td style={{ fontSize: 12.5 }}>{s.phone || '—'}{s.email && <div style={{ color: 'var(--muted)' }}>{s.email}</div>}</td>
                  <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>{s.enrollments.length ? s.enrollments.map((e) => <div key={e.id}>{e.program}{e.group ? ` · ${e.group}` : ''}</div>) : <span style={{ color: 'var(--muted)' }}>Sin matrícula</span>}</td>
                  <td>{s.siteName || '—'}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="actions"><Link className="btn btn-ghost btn-icon" aria-label="Abrir ficha" title="Abrir ficha" to={`/educacion/estudiantes/${s.id}`}><MdArrowForward /></Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}
      {creating && <StudentForm onClose={close} onSaved={(d) => { close(); toast('Estudiante registrado'); navigate(`/educacion/estudiantes/${d.id}`) }} />}
      {toastNode}
    </>
  )
}

export default StudentsPage
