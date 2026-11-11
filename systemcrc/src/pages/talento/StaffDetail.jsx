import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  MdArrowBack, MdEdit, MdDelete, MdPrint, MdAdd, MdErrorOutline, MdSave, MdUploadFile, MdPictureAsPdf, MdVerified, MdWarning,
  MdWork, MdFactCheck, MdBadge, MdSchool, MdDescription, MdPerson, MdLocalHospital
} from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import StaffForm from './StaffForm'
import StaffSheet from './StaffSheet'
import { CONTRACT_STATUS, CHECK_VALUES, DOC_TYPE_LABELS, SEX, StatusBadge, Percent, fmt, today, readAsDataUrl, checkFile, useCatalogs } from './common'

// ---------------------------------------------------------------- Soporte / certificado
const DocForm = ({ staff, initial, preset, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const cat = useCatalogs()
  const [f, setF] = useState(() => editing
    ? { requirementTypeId: initial.requirementTypeId ? String(initial.requirementTypeId) : '', name: initial.name, category: initial.category, issuer: initial.issuer || '', issueDate: initial.issueDate || '', expires: initial.expires, expiryDate: initial.expiryDate || '', hours: initial.hours ?? '', notes: initial.notes || '' }
    : { requirementTypeId: preset ? String(preset) : '', name: '', category: 'curso', issuer: '', issueDate: '', expires: false, expiryDate: '', hours: '', notes: '' })
  const [file, setFile] = useState(null)
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const req = cat?.requirements.find((r) => String(r.id) === f.requirementTypeId)
  // Al elegir un requisito se toman su categoría y si vence.
  useEffect(() => { if (req && !editing) setF((x) => ({ ...x, category: req.category, expires: req.expires })) }, [req, editing])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const autoExpiry = f.expires && !f.expiryDate && f.issueDate && req?.validityMonths
  const pick = (x) => { const err = checkFile(x); if (err) { setError(err); return } setError(''); setFile(x) }
  const submit = async () => {
    setError('')
    if (!f.requirementTypeId && !f.name.trim()) return setError('Elige el requisito o escribe el nombre del curso / certificado.')
    if (f.expires && !f.expiryDate && !autoExpiry) return setError('Indica la fecha de vencimiento del certificado.')
    if (!editing && !file) return setError('Carga el certificado en PDF.')
    setSaving(true)
    try {
      const body = { ...f, file: file ? await readAsDataUrl(file) : undefined }
      const { data } = editing ? await api.put(`/estandares/th/personal/${staff.id}/documentos/${initial.id}`, body) : await api.post(`/estandares/th/personal/${staff.id}/documentos`, body)
      onSaved(data)
    } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  const groups = cat ? Object.entries(cat.categories).map(([k, l]) => [k, l, cat.requirements.filter((r) => r.category === k && (r.active || String(r.id) === f.requirementTypeId))]).filter(([, , rs]) => rs.length) : []
  return (
    <Modal title={editing ? 'Editar soporte' : 'Cargar soporte / curso'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="form-grid">
          <div className="field span-all"><label>Requisito al que corresponde</label>
            <select value={f.requirementTypeId} onChange={set('requirementTypeId')}>
              <option value="">Otro curso o certificado (no es un requisito)</option>
              {groups.map(([k, l, rs]) => <optgroup key={k} label={l}>{rs.map((r) => <option key={r.id} value={r.id}>{r.name}{r.expires ? ` (vence${r.validityMonths ? ` cada ${r.validityMonths} meses` : ''})` : ''}</option>)}</optgroup>)}
            </select></div>
          <div className="field span-all"><label>Nombre del curso / certificado {!f.requirementTypeId && <span className="req">*</span>}</label><input value={f.name} onChange={set('name')} placeholder={req ? req.name : 'Ej: Curso de soporte vital básico'} /></div>
          {!f.requirementTypeId && <div className="field"><label>Categoría</label><select value={f.category} onChange={set('category')}>{Object.entries(cat?.categories || {}).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>}
          <div className="field"><label>Entidad que lo expide</label><input value={f.issuer} onChange={set('issuer')} placeholder="Universidad, SENA, CRC…" /></div>
          <div className="field"><label>Fecha de expedición</label><input type="date" value={f.issueDate} max={today()} onChange={set('issueDate')} /></div>
          <div className="field"><label>Intensidad horaria</label><input type="number" min="0" value={f.hours} onChange={set('hours')} placeholder="Horas" /></div>
        </div>
        <div className="th-expires">
          <label className="switch"><input type="checkbox" checked={f.expires} onChange={set('expires')} /> <b>El certificado vence</b></label>
          {f.expires && <div className="field" style={{ minWidth: 200 }}><label>Fecha de vencimiento {!autoExpiry && <span className="req">*</span>}</label><input type="date" value={f.expiryDate} min={f.issueDate || undefined} onChange={set('expiryDate')} />
            {autoExpiry && <span className="hint">Vacío = {req.validityMonths} meses desde la expedición</span>}</div>}
        </div>
        <div className="field"><label>Certificado (PDF) {!editing && <span className="req">*</span>}</label>
          <div className="th-file" onClick={() => fileRef.current.click()} role="button" tabIndex={0}>
            <MdUploadFile /><span>{file ? `${file.name} · ${(file.size / 1024 / 1024).toFixed(1)} MB` : editing ? 'Reemplazar el archivo (opcional)' : 'Selecciona el PDF del certificado (máx. 10 MB)'}</span>
          </div>
          <input ref={fileRef} type="file" accept="application/pdf,image/png,image/jpeg" hidden onChange={(e) => pick(e.target.files[0])} />
        </div>
        <div className="field"><label>Observaciones</label><input value={f.notes} onChange={set('notes')} /></div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------- Contrato
const ContractForm = ({ staff, initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const cat = useCatalogs()
  const [f, setF] = useState(() => editing
    ? { contractType: initial.contractType, number: initial.number || '', startDate: initial.startDate, endDate: initial.endDate || '', weeklyHours: initial.weeklyHours ?? '', positionName: initial.positionName || '', notes: initial.notes || '' }
    : { contractType: 'termino_fijo', number: '', startDate: today(), endDate: '', weeklyHours: '', positionName: staff.positionName || '', notes: '' })
  const [file, setFile] = useState(null)
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const fileRef = useRef(null)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async () => {
    setError('')
    if (!f.startDate) return setError('Indica la fecha de inicio.')
    if (f.contractType !== 'indefinido' && !f.endDate) return setError('Indica la fecha de terminación.')
    setSaving(true)
    try {
      const body = { ...f, file: file ? await readAsDataUrl(file) : undefined }
      const { data } = editing ? await api.put(`/estandares/th/personal/${staff.id}/contratos/${initial.id}`, body) : await api.post(`/estandares/th/personal/${staff.id}/contratos`, body)
      onSaved(data)
    } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar contrato' : 'Registrar contrato'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="form-grid">
          <div className="field"><label>Tipo de vinculación</label><select value={f.contractType} onChange={set('contractType')}>{Object.entries(cat?.contractTypes || {}).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>N° de contrato</label><input value={f.number} onChange={set('number')} /></div>
          <div className="field"><label>Cargo / objeto</label><input value={f.positionName} onChange={set('positionName')} /></div>
          <div className="field"><label>Fecha de inicio <span className="req">*</span></label><input type="date" value={f.startDate} onChange={set('startDate')} /></div>
          <div className="field"><label>Fecha de terminación {f.contractType !== 'indefinido' && <span className="req">*</span>}</label><input type="date" value={f.endDate} min={f.startDate} onChange={set('endDate')} /></div>
          <div className="field"><label>Horas semanales</label><input type="number" min="0" max="80" value={f.weeklyHours} onChange={set('weeklyHours')} /></div>
          <div className="field span-all"><label>Observaciones</label><input value={f.notes} onChange={set('notes')} /></div>
        </div>
        <div className="field"><label>Contrato firmado (PDF, opcional)</label>
          <div className="th-file" onClick={() => fileRef.current.click()} role="button" tabIndex={0}><MdUploadFile /><span>{file ? file.name : initial?.fileUrl ? 'Reemplazar el archivo' : 'Selecciona el PDF del contrato'}</span></div>
          <input ref={fileRef} type="file" accept="application/pdf" hidden onChange={(e) => { const x = e.target.files[0]; const err = checkFile(x, { images: false }); if (err) setError(err); else { setError(''); setFile(x) } }} />
        </div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------- Lista de chequeo
const ChecklistForm = ({ staff, onClose, onSaved }) => {
  const [draft, setDraft] = useState(null)
  const [date, setDate] = useState(today())
  const [obs, setObs] = useState('')
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  useEffect(() => { api.get(`/estandares/th/personal/${staff.id}/chequeo/borrador`).then(({ data }) => setDraft(data.items)).catch((e) => setError(errorMessage(e))) }, [staff.id])
  const setItem = (i, k, v) => setDraft(draft.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const fails = (draft || []).filter((i) => i.mandatory && i.value === 'no_cumple').length
  const submit = async () => {
    setSaving(true); setError('')
    try { const { data } = await api.post(`/estandares/th/personal/${staff.id}/chequeo`, { date, items: draft, observations: obs }); onSaved(data) } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title={`Lista de chequeo · ${staff.fullName}`} size="lg" onClose={onClose}
      footer={<><span style={{ marginRight: 'auto' }}>{draft && <span className={`badge ${fails ? 'bad' : 'ok'}`}>{fails ? `No cumple · ${fails} requisito${fails === 1 ? '' : 's'} obligatorio${fails === 1 ? '' : 's'}` : 'Cumple'}</span>}</span>
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving || !draft?.length}>{saving ? <Spinner /> : <MdSave />} Guardar verificación</button></>}>
      {!draft && !error ? <div className="splash" style={{ minHeight: 120 }}><Spinner /></div> : (
        <div className="stack" style={{ gap: 14 }}>
          <div className="alert info" style={{ margin: 0 }}><MdFactCheck /><span>El sistema propone el resultado según los soportes cargados. Revisa cada ítem contra el documento original y ajústalo si es necesario.</span></div>
          <div className="field" style={{ maxWidth: 220 }}><label>Fecha de verificación</label><input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} /></div>
          {draft?.length === 0 ? <div className="alert warn"><MdWarning /><span>El cargo no tiene requisitos configurados. Configúralos en Cargos y requisitos.</span></div> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Requisito</th><th>Soporte</th><th style={{ width: 300 }}>Resultado</th><th>Observación</th></tr></thead>
              <tbody>{(draft || []).map((it, i) => (
                <tr key={it.requirementTypeId}>
                  <td style={{ whiteSpace: 'normal' }}><strong style={{ color: 'var(--ink)' }}>{it.name}</strong>{it.mandatory ? <div className="hint">Obligatorio</div> : <div className="hint">Opcional</div>}</td>
                  <td><StatusBadge status={it.status} /></td>
                  <td><div className="th-seg">{Object.entries(CHECK_VALUES).map(([k, [l, tone]]) => (
                    <button key={k} type="button" className={it.value === k ? `on ${tone}` : ''} onClick={() => setItem(i, 'value', k)}>{l}</button>
                  ))}</div></td>
                  <td><input className="input" value={it.observation} onChange={(e) => setItem(i, 'observation', e.target.value)} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
          <div className="field"><label>Observaciones generales</label><textarea value={obs} onChange={(e) => setObs(e.target.value)} style={{ minHeight: 56 }} /></div>
          {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
        </div>
      )}
    </Modal>
  )
}

const Spec = ({ label, children }) => <div className="spec"><span>{label}</span><strong>{children || '—'}</strong></div>
const CAT_ICON = { identificacion: MdBadge, formacion: MdSchool, habilitacion: MdVerified, curso: MdSchool, salud: MdLocalHospital, contractual: MdDescription, otro: MdDescription }

const StaffDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [toast, toastNode] = useToast()
  const [s, setS] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [printing, setPrinting] = useState(false)
  const load = useCallback(async () => { try { const { data } = await api.get(`/estandares/th/personal/${id}`); setS(data) } catch (e) { setError(errorMessage(e)) } }, [id])
  useEffect(() => { load() }, [load])
  const done = (msg) => (data) => { setModal(null); if (data?.id && data.documents) setS(data); else load(); toast(msg) }
  const act = async (fn, msg) => { try { const { data } = await fn(); if (data?.documents) setS(data); else load(); setModal(null); toast(msg) } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) } }

  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!s) return <div className="splash"><Spinner /> Cargando hoja de vida…</div>
  if (printing) return <StaffSheet staff={s} onBack={() => setPrinting(false)} />
  const c = s.compliance
  const extra = s.documents.filter((d) => !d.requirementTypeId || !c.items.some((i) => i.documentId === d.id))

  return (
    <>
      <div style={{ marginBottom: 14 }}><Link to="/estandares/talento-humano/personal" className="btn btn-ghost btn-sm"><MdArrowBack /> Hojas de vida</Link></div>
      <section className="card ev-hero">
        <div className="ev-hero-top">
          <div style={{ display: 'flex', gap: 16, alignItems: 'center', minWidth: 0 }}>
            <div className="th-avatar">{s.photoUrl ? <img src={s.photoUrl} alt={s.fullName} /> : <MdPerson />}</div>
            <div style={{ minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                <span className="badge navy">{s.documentType} {s.document}</span>{s.positionName ? <span className="badge">{s.positionName}</span> : <span className="badge warn">Sin cargo</span>}
                {!s.active && <span className="badge">Inactivo</span>}
              </div>
              <h1 style={{ fontSize: 22 }}>{s.fullName}</h1>
              <span style={{ color: 'var(--muted)' }}>{[s.profession, s.siteName].filter(Boolean).join(' · ') || '—'}</span>
            </div>
          </div>
          <div className="page-actions">
            <button type="button" className="btn btn-ghost" onClick={() => setModal({ edit: true })}><MdEdit /> Editar</button>
            {admin && <button type="button" className="btn btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => setModal({ del: true })}><MdDelete /> Eliminar</button>}
            <button type="button" className="btn btn-outline" onClick={() => setPrinting(true)}><MdPrint /> Hoja de vida PDF</button>
            <button type="button" className="btn btn-primary" onClick={() => setModal({ check: true })}><MdFactCheck /> Lista de chequeo</button>
          </div>
        </div>
        <div className="ev-info-grid">
          <div className="ev-info"><span className="icon-bubble brand"><MdVerified /></span><div><span>Cumplimiento de requisitos</span><strong><Percent value={c.percent} /></strong><small>{c.ok} de {c.mandatory} obligatorios</small></div></div>
          <div className="ev-info"><span className="icon-bubble brand"><MdWarning /></span><div><span>Alertas de soportes</span><strong>{c.missing} faltante{c.missing === 1 ? '' : 's'} · {c.expired} vencido{c.expired === 1 ? '' : 's'}</strong><small>{c.expiring} por vencer (30 días)</small></div></div>
          <div className="ev-info"><span className="icon-bubble brand"><MdWork /></span><div><span>Contrato actual</span><strong>{s.contract ? s.contract.contractTypeLabel : 'Sin contrato'}</strong><small>{s.contract ? <>{s.contract.endDate ? `Hasta ${fmt(s.contract.endDate)}` : 'Sin fecha de terminación'} <StatusBadge status={s.contract.status} map={CONTRACT_STATUS} days={s.contract.daysLeft} /></> : 'Regístralo abajo'}</small></div></div>
          <div className="ev-info"><span className="icon-bubble brand"><MdFactCheck /></span><div><span>Última lista de chequeo</span><strong>{s.checklists[0] ? `${s.checklists[0].code} · ${fmt(s.checklists[0].date)}` : 'Sin verificar'}</strong><small>{s.checklists[0] && <span className={`badge ${s.checklists[0].result === 'cumple' ? 'ok' : 'bad'}`}>{s.checklists[0].result === 'cumple' ? 'Cumple' : 'No cumple'}</span>}</small></div></div>
        </div>
      </section>

      <div className="grid grid-2" style={{ marginTop: 18, alignItems: 'start' }}>
        <Card title="Datos personales">
          <div className="spec-grid">
            <Spec label="Documento">{`${DOC_TYPE_LABELS[s.documentType] || s.documentType} ${s.document}`}</Spec><Spec label="Nacimiento">{fmt(s.birthDate)}</Spec><Spec label="Sexo / RH">{[SEX[s.sex], s.bloodType].filter(Boolean).join(' · ')}</Spec>
            <Spec label="Teléfono">{s.phone}</Spec><Spec label="Correo">{s.email}</Spec><Spec label="Dirección">{[s.address, s.city].filter(Boolean).join(', ')}</Spec>
            <Spec label="Contacto de emergencia">{[s.emergencyContact, s.emergencyPhone].filter(Boolean).join(' · ')}</Spec>
          </div>
        </Card>
        <Card title="Perfil profesional y seguridad social">
          <div className="spec-grid">
            <Spec label="Profesión">{s.profession}</Spec><Spec label="Tarjeta profesional">{s.professionalCard}</Spec><Spec label="ReTHUS">{s.rethus}</Spec>
            <Spec label="EPS">{s.eps}</Spec><Spec label="ARL">{s.arl}</Spec><Spec label="Pensiones">{s.pensionFund}</Spec><Spec label="Cesantías">{s.severanceFund}</Spec>
          </div>
          {s.notes && <p style={{ margin: '12px 0 0', whiteSpace: 'pre-wrap', color: 'var(--ink-2)' }}>{s.notes}</p>}
        </Card>
      </div>

      <div style={{ marginTop: 18 }}>
        <Card flush title="Requisitos del cargo" subtitle={s.positionName ? `Lo que exige el cargo ${s.positionName} y el estado de cada soporte` : 'Asigna un cargo para verificar sus requisitos'} icon={<MdVerified style={{ color: 'var(--brand)' }} />}>
          {c.items.length === 0 ? <Empty icon={<MdVerified />}>{s.positionName ? 'El cargo no tiene requisitos configurados.' : 'Sin cargo asignado.'}</Empty> : (
            <div className="table-wrap" style={{ marginTop: 12 }}><table className="table">
              <thead><tr><th>Requisito</th><th>Estado</th><th>Vence</th><th className="actions" /></tr></thead>
              <tbody>{c.items.map((i) => (
                <tr key={i.requirementTypeId}>
                  <td style={{ whiteSpace: 'normal' }}><strong style={{ color: 'var(--ink)' }}>{i.name}</strong> {!i.mandatory && <span className="hint">(opcional)</span>}</td>
                  <td><StatusBadge status={i.status} /></td>
                  <td>{fmt(i.expiryDate)}</td>
                  <td className="actions">
                    {i.fileUrl && <a className="btn btn-ghost btn-sm" href={i.fileUrl} target="_blank" rel="noreferrer"><MdPictureAsPdf /> Ver</a>}
                    {(i.status === 'faltante' || i.status === 'vencido' || i.status === 'por_vencer') && <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ doc: {}, preset: i.requirementTypeId })}><MdUploadFile /> {i.status === 'faltante' ? 'Cargar' : 'Renovar'}</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18 }}>
        <Card flush title="Soportes, cursos y certificados" subtitle="Todos los documentos cargados en la hoja de vida (PDF)" icon={<MdSchool style={{ color: 'var(--brand)' }} />}
          actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ doc: {} })}><MdAdd /> Agregar curso / soporte</button>}>
          {s.documents.length === 0 ? <Empty icon={<MdSchool />}>Aún no hay soportes cargados.</Empty> : (
            <div className="table-wrap" style={{ marginTop: 12 }}><table className="table">
              <thead><tr><th>Soporte</th><th>Expedición</th><th>Vencimiento</th><th>Estado</th><th>Verificado</th><th className="actions" /></tr></thead>
              <tbody>{s.documents.map((d) => {
                const I = CAT_ICON[d.category] || MdDescription
                return (
                  <tr key={d.id}>
                    <td style={{ whiteSpace: 'normal', minWidth: 220 }}><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><span className="icon-bubble brand" style={{ width: 30, height: 30 }}><I /></span><div><strong style={{ color: 'var(--ink)' }}>{d.name}</strong><div className="hint">{d.categoryLabel}{d.issuer ? ` · ${d.issuer}` : ''}{d.hours ? ` · ${d.hours} h` : ''}{extra.includes(d) && d.requirementTypeId == null ? ' · adicional' : ''}</div></div></div></td>
                    <td>{fmt(d.issueDate)}</td>
                    <td>{d.expires ? fmt(d.expiryDate) : <span className="hint">No vence</span>}</td>
                    <td><StatusBadge status={d.status} days={d.daysLeft} /></td>
                    <td>{d.verified ? <span className="badge ok" title={`${d.verifiedBy || ''} · ${fmt(d.verifiedAt)}`}><MdVerified /> Sí</span> : <button type="button" className="btn btn-ghost btn-sm" onClick={() => act(() => api.post(`/estandares/th/personal/${s.id}/documentos/${d.id}/verificar`, { verified: true }), 'Soporte verificado')}>Verificar</button>}</td>
                    <td className="actions">
                      <a className="btn btn-ghost btn-icon" href={d.fileUrl} target="_blank" rel="noreferrer" aria-label="Ver PDF"><MdPictureAsPdf /></a>
                      <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ doc: d })}><MdEdit /></button>
                      <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delDoc: d })}><MdDelete /></button>
                    </td>
                  </tr>
                )
              })}</tbody>
            </table></div>
          )}
        </Card>
      </div>

      <div className="grid grid-2" style={{ marginTop: 18, alignItems: 'start' }}>
        <Card flush title="Contratos" icon={<MdWork style={{ color: 'var(--brand)' }} />} actions={<button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ contract: {} })}><MdAdd /> Contrato</button>}>
          {s.contracts.length === 0 ? <Empty icon={<MdWork />}>Sin contratos registrados.</Empty> : (
            <ul className="list" style={{ padding: '4px 20px 8px' }}>{s.contracts.map((k) => (
              <li key={k.id}>
                <div className="grow"><strong>{k.contractTypeLabel}{k.number ? ` · N° ${k.number}` : ''} <StatusBadge status={k.status} map={CONTRACT_STATUS} days={k.daysLeft} /></strong>
                  <span>{fmt(k.startDate)} → {k.endDate ? fmt(k.endDate) : 'indefinido'}{k.positionName ? ` · ${k.positionName}` : ''}{k.weeklyHours ? ` · ${k.weeklyHours} h/sem` : ''}</span></div>
                {k.fileUrl && <a className="btn btn-ghost btn-icon" href={k.fileUrl} target="_blank" rel="noreferrer" aria-label="Ver contrato"><MdPictureAsPdf /></a>}
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ contract: k })}><MdEdit /></button>
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delContract: k })}><MdDelete /></button>
              </li>
            ))}</ul>
          )}
        </Card>
        <Card flush title="Listas de chequeo" icon={<MdFactCheck style={{ color: 'var(--brand)' }} />} actions={<button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ check: true })}><MdAdd /> Verificar</button>}>
          {s.checklists.length === 0 ? <Empty icon={<MdFactCheck />}>Sin verificaciones.</Empty> : (
            <ul className="list" style={{ padding: '4px 20px 8px' }}>{s.checklists.map((k) => (
              <li key={k.id}>
                <div className="grow"><strong>{k.code} <span className={`badge ${k.result === 'cumple' ? 'ok' : 'bad'}`}>{k.result === 'cumple' ? 'Cumple' : 'No cumple'}</span></strong><span>{fmt(k.date)} · {k.compliant}/{k.total} ítems · {k.reviewer || '—'}</span></div>
                <Link className="btn btn-ghost btn-sm" to={`/estandares/talento-humano/chequeo/${k.id}`}><MdPrint /> Ver / firmar</Link>
              </li>
            ))}</ul>
          )}
        </Card>
      </div>

      {modal?.edit && <StaffForm initial={s} onClose={() => setModal(null)} onSaved={done('Hoja de vida actualizada')} />}
      {modal?.doc && <DocForm staff={s} initial={modal.doc.id ? modal.doc : null} preset={modal.preset} onClose={() => setModal(null)} onSaved={done('Soporte guardado')} />}
      {modal?.contract && <ContractForm staff={s} initial={modal.contract.id ? modal.contract : null} onClose={() => setModal(null)} onSaved={done('Contrato guardado')} />}
      {modal?.check && <ChecklistForm staff={s} onClose={() => setModal(null)} onSaved={(d) => navigate(`/estandares/talento-humano/chequeo/${d.id}`)} />}
      {modal?.delDoc && <Confirm title="Eliminar soporte" onClose={() => setModal(null)} onOk={() => act(() => api.delete(`/estandares/th/personal/${s.id}/documentos/${modal.delDoc.id}`), 'Soporte eliminado')}>¿Eliminar <b>{modal.delDoc.name}</b> y su archivo? No se puede deshacer.</Confirm>}
      {modal?.delContract && <Confirm title="Eliminar contrato" onClose={() => setModal(null)} onOk={() => act(() => api.delete(`/estandares/th/personal/${s.id}/contratos/${modal.delContract.id}`), 'Contrato eliminado')}>¿Eliminar el contrato {modal.delContract.contractTypeLabel} del {fmt(modal.delContract.startDate)}?</Confirm>}
      {modal?.del && <Confirm title="Eliminar hoja de vida" onClose={() => setModal(null)} onOk={async () => { try { await api.delete(`/estandares/th/personal/${s.id}`); navigate('/estandares/talento-humano/personal') } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) } }}>
        ¿Eliminar la hoja de vida de <b>{s.fullName}</b> con todos sus soportes, contratos y listas de chequeo? Si la persona se retiró, mejor márcala como inactiva para conservar el historial.</Confirm>}
      {toastNode}
    </>
  )
}

export const Confirm = ({ title, children, onClose, onOk }) => (
  <Modal title={title} size="sm" onClose={onClose}
    footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-danger" onClick={onOk}><MdDelete /> Eliminar</button></>}>
    <p style={{ margin: 0 }}>{children}</p>
  </Modal>
)

export default StaffDetail
