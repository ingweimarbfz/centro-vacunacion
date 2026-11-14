import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { MdArrowBack, MdAdd, MdEdit, MdDelete, MdErrorOutline, MdLibraryBooks, MdAssignment, MdGrading, MdOpenInNew, MdDownload, MdSave, MdVisibilityOff, MdLink } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import FileDrop from '../../components/FileDrop'
import { FileIcon, readFile, size } from '../estandares/StdDocumentsPage'

export const MATERIAL_KINDS = { guia: 'Guía', taller: 'Taller', documento: 'Documento', enlace: 'Enlace', video: 'Video' }
const GRADE_KINDS = { taller: 'Taller', parcial: 'Parcial', practica: 'Práctica', quiz: 'Quiz', final: 'Examen final', otro: 'Otro' }
export const ACCEPT_EDU = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,.mp4'
const extOf = (name = '') => name.split('.').pop().toLowerCase().replace('jpeg', 'jpg')
const dt = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) : '')
const toLocalInput = (iso) => { if (!iso) return ''; const d = new Date(iso); const p = (n) => String(n).padStart(2, '0'); return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}` }
export const fmtScore = (v) => (v == null ? '—' : Number(v).toFixed(1).replace('.', ','))

const MaterialForm = ({ groupId, subjects, initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => ({ kind: initial?.kind || 'guia', title: initial?.title || '', description: initial?.description || '', subjectId: initial?.subjectId || '', linkUrl: initial?.linkUrl || '', dueAt: toLocalInput(initial?.dueAt), allowLate: initial?.allowLate ?? true, published: initial?.published ?? true }))
  const [file, setFile] = useState(null)
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.title.trim()) return setError('Escribe el título.')
    if (file && file.size > 15 * 1024 * 1024) return setError('El archivo supera 15 MB.')
    setSaving(true)
    try {
      const body = { ...f, dueAt: f.dueAt ? new Date(f.dueAt).toISOString() : null, ...(file ? { file: { name: file.name, data: await readFile(file) } } : {}) }
      const { data } = editing ? await api.put(`/academico/materiales/${initial.id}`, body) : await api.post(`/academico/grupos/${groupId}/materiales`, body)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar material' : 'Publicar material o taller'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="mat-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} {editing ? 'Guardar' : 'Publicar'}</button></>}>
      <form id="mat-form" onSubmit={submit} noValidate className="stack" style={{ gap: 12 }}>
        <div className="module-switch inline" style={{ alignSelf: 'flex-start', flexWrap: 'wrap' }}>{Object.entries(MATERIAL_KINDS).map(([k, l]) => <button key={k} type="button" className={f.kind === k ? 'on' : ''} onClick={() => setF({ ...f, kind: k })}>{l}</button>)}</div>
        <div className="field"><label>Título <span className="req">*</span></label><input value={f.title} onChange={set('title')} autoFocus placeholder={f.kind === 'taller' ? 'Ej. Taller 3 · RCP en adultos' : 'Ej. Guía de aprendizaje módulo 2'} /></div>
        <div className="field"><label>Asignatura</label><select value={f.subjectId} onChange={set('subjectId')}><option value="">General del grupo</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.period}</option>)}</select></div>
        <div className="field"><label>{f.kind === 'taller' ? 'Instrucciones' : 'Descripción'}</label><textarea rows={3} value={f.description} onChange={set('description')} /></div>
        <div className="field"><label>Archivo {['guia', 'documento'].includes(f.kind) && !editing && <span className="req">*</span>}</label>
          <FileDrop file={file} onPick={setFile} accept={ACCEPT_EDU} current={editing ? initial.file?.name : null} icon={file ? <FileIcon ext={extOf(file.name)} /> : null} placeholder="Arrastra el archivo o haz clic: PDF, Word, Excel, PowerPoint, imagen, ZIP o MP4 (máx. 15 MB)" /></div>
        {['enlace', 'video', 'taller', 'guia'].includes(f.kind) && <div className="field"><label>Enlace {['enlace', 'video'].includes(f.kind) && <span className="hint">(o el archivo)</span>}</label><input value={f.linkUrl} onChange={set('linkUrl')} placeholder="https://…" /></div>}
        {f.kind === 'taller' && (
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field"><label>Fecha límite de entrega</label><input type="datetime-local" value={f.dueAt} onChange={set('dueAt')} /></div>
            <label className="switch" style={{ alignSelf: 'end' }}><input type="checkbox" checked={f.allowLate} onChange={set('allowLate')} /> Aceptar entregas tardías</label>
          </div>
        )}
        <label className="switch"><input type="checkbox" checked={f.published} onChange={set('published')} /> {f.published ? 'Publicado (lo ven los estudiantes y se avisa por Telegram)' : 'Borrador (no lo ven los estudiantes)'}</label>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

// Entregas de un taller: lista del grupo, descarga y calificación con retroalimentación.
export const SubmissionsModal = ({ material, onClose }) => {
  const [toast, toastNode] = useToast()
  const [d, setD] = useState(null); const [edit, setEdit] = useState({}); const [busy, setBusy] = useState(null)
  const load = useCallback(() => api.get(`/academico/materiales/${material.id}/entregas`, { noCache: true }).then(({ data }) => { setD(data); setEdit(Object.fromEntries(data.rows.filter((r) => r.submission).map((r) => [r.submission.id, { score: r.submission.score ?? '', feedback: r.submission.feedback || '' }]))) }).catch(() => {}), [material.id])
  useEffect(() => { load() }, [load])
  const grade = async (sub, status = 'revisado') => {
    setBusy(sub.id)
    try { await api.put(`/academico/entregas/${sub.id}/calificar`, { ...edit[sub.id], score: String(edit[sub.id].score).replace(',', '.'), status }); toast(status === 'devuelto' ? 'Entrega devuelta para corregir' : 'Calificación guardada'); load() } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy(null) }
  }
  return (
    <Modal title={`Entregas · ${material.title}`} size="lg" onClose={onClose} footer={<button type="button" className="btn btn-outline" onClick={onClose}>Cerrar</button>}>
      {!d ? <div className="splash" style={{ minHeight: 120 }}><Spinner /></div> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Estudiante</th><th>Entrega</th><th style={{ width: 90 }}>Nota</th><th>Retroalimentación</th><th className="actions" /></tr></thead>
            <tbody>{d.rows.map((r) => {
              const s = r.submission
              return (
                <tr key={r.studentId}>
                  <td style={{ whiteSpace: 'normal' }}><b>{r.fullName}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.docNumber}</div></td>
                  <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>{!s ? <span className="badge">Sin entregar</span> : (
                    <div className="stack" style={{ gap: 4 }}>
                      {s.file && <a href={`${s.file.url}?download=${encodeURIComponent(s.file.name)}`} target="_blank" rel="noreferrer"><MdDownload style={{ verticalAlign: -2 }} /> {s.file.name}</a>}
                      {s.linkUrl && <a href={s.linkUrl} target="_blank" rel="noreferrer"><MdLink style={{ verticalAlign: -2 }} /> Enlace</a>}
                      {s.comment && <span style={{ color: 'var(--muted)' }}>“{s.comment}”</span>}
                      <span>{dt(s.submittedAt)} {s.late && <span className="badge warn">Tardía</span>} <span className={`badge ${s.status === 'revisado' ? 'ok' : s.status === 'devuelto' ? 'bad' : 'info'}`}>{s.status === 'revisado' ? 'Revisada' : s.status === 'devuelto' ? 'Devuelta' : 'Por revisar'}</span></span>
                    </div>
                  )}</td>
                  <td>{s && <input className="input" style={{ width: 70 }} aria-label="Nota" value={edit[s.id]?.score ?? ''} onChange={(e) => setEdit({ ...edit, [s.id]: { ...edit[s.id], score: e.target.value } })} placeholder="0,0" />}</td>
                  <td>{s && <input className="input" aria-label="Retroalimentación" value={edit[s.id]?.feedback ?? ''} onChange={(e) => setEdit({ ...edit, [s.id]: { ...edit[s.id], feedback: e.target.value } })} placeholder="Comentario para el estudiante" />}</td>
                  <td className="actions">{s && <><button type="button" className="btn btn-primary btn-sm" disabled={busy === s.id} onClick={() => grade(s)}>Calificar</button> <button type="button" className="btn btn-ghost btn-sm" disabled={busy === s.id} onClick={() => grade(s, 'devuelto')}>Devolver</button></>}</td>
                </tr>
              )
            })}</tbody>
          </table>
        </div>
      )}
      {toastNode}
    </Modal>
  )
}

const ITEM_EMPTY = { name: '', kind: 'parcial', weight: '', materialId: '' }
const ItemForm = ({ groupId, subjectId, talleres, initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => ({ ...ITEM_EMPTY, ...(initial ? { name: initial.name, kind: initial.kind, weight: initial.weight, materialId: initial.materialId || '' } : {}) }))
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setError(''); setSaving(true)
    try { editing ? await api.put(`/academico/evaluaciones/${initial.id}`, { ...f, subjectId }) : await api.post(`/academico/grupos/${groupId}/evaluaciones`, { ...f, subjectId }); onSaved() } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar evaluación' : 'Nueva evaluación'} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="item-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} Guardar</button></>}>
      <form id="item-form" onSubmit={submit} noValidate className="stack" style={{ gap: 12 }}>
        <div className="field"><label>Nombre</label><input value={f.name} onChange={set('name')} autoFocus placeholder="Ej. Parcial 1" /></div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Tipo</label><select value={f.kind} onChange={set('kind')}>{Object.entries(GRADE_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Peso (%)</label><input type="number" min="1" max="100" value={f.weight} onChange={set('weight')} /></div>
        </div>
        {f.kind === 'taller' && <div className="field"><label>Taller ligado</label><select value={f.materialId} onChange={set('materialId')}><option value="">Sin taller (nota manual)</option>{talleres.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select><span className="hint">Al calificar las entregas del taller, la nota pasa sola a la planilla.</span></div>}
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

// Planilla de notas de una asignatura: estudiantes × evaluaciones, definitiva ponderada y estado.
export const GradesTab = ({ data, groupId }) => {
  const [toast, toastNode] = useToast()
  const subjects = data.subjects
  const [subjectId, setSubjectId] = useState(() => String(subjects.find((s) => data.gradeItems.some((i) => i.subjectId === s.id))?.id || subjects[0]?.id || ''))
  const [sheet, setSheet] = useState(null); const [cells, setCells] = useState({}); const [dirty, setDirty] = useState(false); const [modal, setModal] = useState(null); const [saving, setSaving] = useState(false)
  const load = useCallback(() => { if (!subjectId) return; api.get(`/academico/grupos/${groupId}/notas`, { params: { asignatura: subjectId }, noCache: true }).then(({ data: d }) => { setSheet(d); setCells(Object.fromEntries(d.students.flatMap((s) => d.items.map((i) => [`${s.studentId}-${i.id}`, s.grades[i.id] != null ? fmtScore(s.grades[i.id]) : ''])))); setDirty(false) }).catch(() => {}) }, [groupId, subjectId])
  useEffect(() => { load() }, [load])
  const save = async () => {
    setSaving(true)
    try {
      const grades = Object.entries(cells).map(([k, v]) => { const [studentId, itemId] = k.split('-'); return { studentId, itemId, score: v === '' ? '' : v.replace(',', '.') } })
      await api.put(`/academico/grupos/${groupId}/notas`, { grades }); toast('Notas guardadas'); load()
    } catch (e) { toast(errorMessage(e), 'bad') } finally { setSaving(false) }
  }
  const removeItem = async (it) => { try { await api.delete(`/academico/evaluaciones/${it.id}`); toast('Evaluación eliminada'); load() } catch (e) { toast(errorMessage(e), 'bad') } }
  const talleres = data.materials.filter((m) => m.kind === 'taller' && (!m.subjectId || m.subjectId === Number(subjectId)))
  return (
    <Card flush title="Planilla de notas" subtitle={sheet ? `Escala 0,0 – 5,0 · aprueba con ${fmtScore(sheet.passingScore)} · pesos ${sheet.weightTotal} % de 100 %` : ''}
      actions={<div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <select className="input" style={{ width: 'auto', minWidth: 220 }} aria-label="Asignatura" value={subjectId} onChange={(e) => setSubjectId(e.target.value)}>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.period}</option>)}</select>
        <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({})} disabled={!subjectId}><MdAdd /> Evaluación</button>
        <button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={!dirty || saving}>{saving ? <Spinner /> : <MdSave />} Guardar notas</button>
      </div>}>
      {!sheet ? <div className="splash" style={{ minHeight: 120 }}><Spinner /></div> : sheet.items.length === 0 ? <Empty icon={<MdGrading />}>Crea las evaluaciones de la asignatura (talleres, parciales, prácticas) con su peso.</Empty> : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Estudiante</th>{sheet.items.map((i) => <th key={i.id} style={{ whiteSpace: 'nowrap' }}>{i.name} · {i.weight} % <button type="button" className="btn btn-ghost btn-icon" aria-label={`Editar ${i.name}`} onClick={() => setModal(i)} style={{ width: 24, height: 24 }}><MdEdit /></button><button type="button" className="btn btn-ghost btn-icon" aria-label={`Eliminar ${i.name}`} onClick={() => removeItem(i)} style={{ width: 24, height: 24, color: 'var(--bad)' }}><MdDelete /></button></th>)}<th>Definitiva</th><th>Estado</th></tr></thead>
            <tbody>{sheet.students.map((s) => (
              <tr key={s.studentId}>
                <td style={{ whiteSpace: 'normal' }}><b>{s.fullName}</b></td>
                {sheet.items.map((i) => <td key={i.id}><input className="input" style={{ width: 64, textAlign: 'center' }} aria-label={`${i.name} de ${s.fullName}`} value={cells[`${s.studentId}-${i.id}`] ?? ''} onChange={(e) => { setCells({ ...cells, [`${s.studentId}-${i.id}`]: e.target.value }); setDirty(true) }} /></td>)}
                <td><b>{fmtScore(s.final.score)}</b>{!s.final.complete && s.final.score != null && <div className="hint">Parcial ({s.final.weightGraded} %)</div>}</td>
                <td>{s.final.state === 'aprobado' ? <span className="badge ok">Aprueba</span> : s.final.state === 'reprobado' ? <span className="badge bad">No aprueba</span> : <span className="badge">Sin notas</span>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {modal && <ItemForm groupId={groupId} subjectId={subjectId} talleres={talleres} initial={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={() => { setModal(null); load() }} />}
      {toastNode}
    </Card>
  )
}

// Aula del grupo (docente y personal): material, talleres con sus entregas y planilla de notas.
const CoursePage = () => {
  const { id } = useParams()
  const { user } = useAuth()
  const [toast, toastNode] = useToast()
  const [d, setD] = useState(null); const [error, setError] = useState('')
  const [params] = useSearchParams()
  const [tab, setTab] = useState(() => (['talleres', 'notas'].includes(params.get('tab')) ? params.get('tab') : 'material')); const [modal, setModal] = useState(null)
  const load = useCallback(() => api.get(`/academico/grupos/${id}/aula`, { noCache: true }).then(({ data }) => setD(data)).catch((e) => setError(errorMessage(e))), [id])
  useEffect(() => { load() }, [load])
  const list = useMemo(() => (d?.materials || []).filter((m) => (tab === 'talleres' ? m.kind === 'taller' : m.kind !== 'taller')), [d, tab])
  const remove = async (m) => { try { await api.delete(`/academico/materiales/${m.id}`); toast('Material eliminado'); load() } catch (e) { toast(errorMessage(e), 'bad') } }
  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!d) return <div className="splash"><Spinner /></div>
  const back = user.role === 'docente' ? '/educacion/docente/grupos' : '/educacion/grupos'
  return (
    <>
      <div style={{ marginBottom: 14 }}><Link to={back} className="btn btn-ghost btn-sm"><MdArrowBack /> {user.role === 'docente' ? 'Mis grupos' : 'Grupos'}</Link></div>
      <PageHead title={`Aula · ${d.group.code}`} subtitle={`${d.group.program} · ${d.group.period}`}>
        {tab !== 'notas' && <button type="button" className="btn btn-primary" onClick={() => setModal({ material: { kind: tab === 'talleres' ? 'taller' : 'guia' } })}><MdAdd /> {tab === 'talleres' ? 'Nuevo taller' : 'Publicar material'}</button>}
      </PageHead>
      <div className="module-switch inline" style={{ marginBottom: 16, alignSelf: 'flex-start', display: 'inline-flex' }}>
        <button type="button" className={tab === 'material' ? 'on' : ''} onClick={() => setTab('material')}><MdLibraryBooks /> Material</button>
        <button type="button" className={tab === 'talleres' ? 'on' : ''} onClick={() => setTab('talleres')}><MdAssignment /> Talleres y entregas</button>
        <button type="button" className={tab === 'notas' ? 'on' : ''} onClick={() => setTab('notas')}><MdGrading /> Calificaciones</button>
      </div>
      {tab === 'notas' ? <GradesTab data={d} groupId={id} /> : (
        <Card flush>
          {list.length === 0 ? <Empty icon={tab === 'talleres' ? <MdAssignment /> : <MdLibraryBooks />}>{tab === 'talleres' ? 'Aún no hay talleres.' : 'Aún no hay material publicado.'}</Empty> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>{tab === 'talleres' ? 'Taller' : 'Material'}</th><th>Asignatura</th>{tab === 'talleres' ? <><th>Entrega hasta</th><th className="num">Entregas</th></> : <th>Archivo o enlace</th>}<th>Publicado</th><th className="actions" /></tr></thead>
                <tbody>{list.map((m) => (
                  <tr key={m.id} style={m.published ? undefined : { opacity: 0.6 }}>
                    <td style={{ whiteSpace: 'normal' }}><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>{m.file ? <FileIcon ext={extOf(m.file.name)} /> : <span className="sd-icon" style={{ color: 'var(--info)', background: 'var(--info-50)' }}><MdLink /></span>}<div><b>{m.title}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.kindLabel}{m.description ? ` · ${m.description.slice(0, 80)}` : ''}</div></div></div></td>
                    <td>{m.subject || 'General'}</td>
                    {tab === 'talleres'
                      ? <><td>{m.dueAt ? dt(m.dueAt) : 'Sin fecha'}{m.dueAt && !m.allowLate && <div className="hint">No acepta tardías</div>}</td><td className="num"><button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ subs: m })}>{m.submissions?.total || 0} · {m.submissions?.pending || 0} por revisar</button></td></>
                      : <td style={{ fontSize: 12.5 }}>{m.file && <a href={`${m.file.url}?download=${encodeURIComponent(m.file.name)}`} target="_blank" rel="noreferrer"><MdDownload style={{ verticalAlign: -2 }} /> {m.file.name} ({size(m.file.size)})</a>}{m.linkUrl && <div><a href={m.linkUrl} target="_blank" rel="noreferrer"><MdOpenInNew style={{ verticalAlign: -2 }} /> Abrir enlace</a></div>}</td>}
                    <td>{m.published ? <span className="badge ok">Sí</span> : <span className="badge"><MdVisibilityOff /> Borrador</span>}</td>
                    <td className="actions"><button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ material: m })}><MdEdit /></button><button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => remove(m)}><MdDelete /></button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {modal?.material && <MaterialForm groupId={id} subjects={d.subjects} initial={modal.material.id ? modal.material : { kind: modal.material.kind }} onClose={() => setModal(null)} onSaved={(x, e) => { setModal(null); load(); toast(e ? 'Material actualizado' : 'Material publicado') }} />}
      {modal?.subs && <SubmissionsModal material={modal.subs} onClose={() => { setModal(null); load() }} />}
      {toastNode}
    </>
  )
}

export default CoursePage
