import React, { useCallback, useEffect, useState } from 'react'
import { MdLibraryBooks, MdAssignment, MdGrading, MdDownload, MdOpenInNew, MdUpload, MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Card, Modal, Spinner, Empty, PageHead, useToast } from '../../components/ui'
import FileDrop from '../../components/FileDrop'
import { FileIcon, readFile } from '../estandares/StdDocumentsPage'
import { ACCEPT_EDU, fmtScore } from './CoursePage'

const dt = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) : '')
const extOf = (name = '') => name.split('.').pop().toLowerCase().replace('jpeg', 'jpg')

const SubmitModal = ({ material, onClose, onDone }) => {
  const [file, setFile] = useState(null); const [linkUrl, setLink] = useState(''); const [comment, setComment] = useState('')
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const late = material.dueAt && new Date() > new Date(material.dueAt)
  const submit = async () => {
    setError('')
    if (!file && !linkUrl.trim()) return setError('Carga el archivo o pega el enlace de tu trabajo.')
    if (file && file.size > 15 * 1024 * 1024) return setError('El archivo supera 15 MB.')
    setBusy(true)
    try { await api.post(`/academico/materiales/${material.id}/entregar`, { linkUrl, comment, ...(file ? { file: { name: file.name, data: await readFile(file) } } : {}) }); onDone() } catch (e) { setError(errorMessage(e)); setBusy(false) }
  }
  return (
    <Modal title={`Entregar · ${material.title}`} onClose={onClose} footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? <Spinner /> : <MdUpload />} Entregar</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        {material.description && <p style={{ margin: 0, fontSize: 13.5, whiteSpace: 'pre-line' }}>{material.description}</p>}
        {late && <div className="alert warn"><span>La fecha límite ya pasó: tu entrega quedará como tardía.</span></div>}
        <FileDrop file={file} onPick={setFile} accept={ACCEPT_EDU} icon={file ? <FileIcon ext={extOf(file.name)} /> : null} placeholder="Arrastra tu archivo o haz clic (máx. 15 MB)" />
        <div className="field"><label>O pega un enlace</label><input value={linkUrl} onChange={(e) => setLink(e.target.value)} placeholder="https://drive.google.com/…" /></div>
        <div className="field"><label>Comentario para el docente</label><input value={comment} onChange={(e) => setComment(e.target.value)} /></div>
        {material.mySubmission && <span className="hint">Ya entregaste; esta entrega reemplaza la anterior.</span>}
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

// Portal del estudiante: "Mi aula" (material y talleres) y "Mis notas", separados por curso (grupo) con un selector.
const MyCourse = ({ mode = 'aula' }) => {
  const [toast, toastNode] = useToast()
  const [d, setD] = useState(null); const [submit, setSubmit] = useState(null); const [course, setCourse] = useState('')
  const load = useCallback(() => api.get('/academico/mi-aula', { noCache: true }).then(({ data }) => setD(data)).catch(() => setD({ groups: [] })), [])
  useEffect(() => { load() }, [load])
  const notas = mode === 'notas'
  const head = <PageHead title={notas ? 'Mis notas' : 'Mi aula'} subtitle={notas ? `Tus calificaciones por curso y asignatura${d ? ` · aprueba con ${fmtScore(d.passingScore)}` : ''}` : 'Material de estudio y talleres de cada uno de tus cursos'} />
  if (!d) return <>{head}<div className="splash"><Spinner /></div></>
  if (!d.groups.length) return <>{head}<Card><Empty icon={notas ? <MdGrading /> : <MdLibraryBooks />}>Aún no estás en un grupo con clases.</Empty></Card></>
  const shown = d.groups.filter((g) => !course || String(g.groupId) === course)
  return (
    <>
      {head}
      {d.groups.length > 1 && (
        <div className="module-switch inline" style={{ marginBottom: 16 }}>
          <button type="button" className={!course ? 'on' : ''} onClick={() => setCourse('')}>Todos mis cursos</button>
          {d.groups.map((g) => <button key={g.groupId} type="button" className={course === String(g.groupId) ? 'on' : ''} onClick={() => setCourse(String(g.groupId))}>{g.program} · {g.code}</button>)}
        </div>
      )}
      <div className="stack">
      {shown.map((g) => {
        const talleres = notas ? [] : g.materials.filter((m) => m.kind === 'taller')
        const material = notas ? [] : g.materials.filter((m) => m.kind !== 'taller')
        const grades = notas ? g.grades : []
        return (
          <Card key={g.groupId} title={g.program} subtitle={`Grupo ${g.code}`} icon={notas ? <MdGrading style={{ color: 'var(--brand)' }} /> : <MdLibraryBooks style={{ color: 'var(--brand)' }} />}>
            <div className="stack" style={{ gap: 18 }}>
              {!notas && talleres.length === 0 && material.length === 0 && <Empty icon={<MdLibraryBooks />}>Tu docente aún no ha publicado material ni talleres.</Empty>}
              {notas && grades.length === 0 && <Empty icon={<MdGrading />}>Aún no hay evaluaciones registradas en este curso.</Empty>}
              {talleres.length > 0 && (
                <div className="stack" style={{ gap: 8 }}>
                  <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MdAssignment /> Talleres</b>
                  {talleres.map((m) => {
                    const s = m.mySubmission
                    return (
                      <div key={m.id} style={{ display: 'flex', gap: 12, alignItems: 'center', padding: 10, border: '1px solid var(--line)', borderRadius: 10, flexWrap: 'wrap' }}>
                        <div style={{ flex: '1 1 220px', minWidth: 0 }}><b style={{ fontSize: 14 }}>{m.title}</b><div style={{ fontSize: 12.5, color: 'var(--muted)' }}>{m.subject || 'General'}{m.dueAt ? ` · entrega hasta ${dt(m.dueAt)}` : ''}</div>
                          {s?.feedback && <div style={{ fontSize: 12.5, marginTop: 4 }}>Docente: “{s.feedback}”</div>}</div>
                        {m.file && <a className="btn btn-ghost btn-sm" href={`${m.file.url}?download=${encodeURIComponent(m.file.name)}`} target="_blank" rel="noreferrer"><MdDownload /> Enunciado</a>}
                        {s ? (s.status === 'revisado'
                          ? <span className="badge ok">Nota {fmtScore(s.score)}</span>
                          : s.status === 'devuelto' ? <><span className="badge bad">Devuelto para corregir</span><button type="button" className="btn btn-primary btn-sm" onClick={() => setSubmit(m)}><MdUpload /> Volver a entregar</button></>
                            : <><span className="badge info">Entregado{s.late ? ' (tarde)' : ''}</span><button type="button" className="btn btn-ghost btn-sm" onClick={() => setSubmit(m)}>Reemplazar</button></>)
                          : <button type="button" className="btn btn-primary btn-sm" onClick={() => setSubmit(m)}><MdUpload /> Entregar</button>}
                      </div>
                    )
                  })}
                </div>
              )}
              {material.length > 0 && (
                <div className="stack" style={{ gap: 8 }}>
                  <b style={{ display: 'flex', alignItems: 'center', gap: 6 }}><MdLibraryBooks /> Material de estudio</b>
                  {material.map((m) => (
                    <div key={m.id} style={{ display: 'flex', gap: 10, alignItems: 'center', fontSize: 13.5, flexWrap: 'wrap' }}>
                      {m.file ? <FileIcon ext={extOf(m.file.name)} /> : null}
                      <span style={{ flex: '1 1 200px' }}><b>{m.title}</b> <span style={{ color: 'var(--muted)', fontSize: 12 }}>· {m.kindLabel}{m.subject ? ` · ${m.subject}` : ''}</span></span>
                      {m.file && <a className="btn btn-ghost btn-sm" href={`${m.file.url}?download=${encodeURIComponent(m.file.name)}`} target="_blank" rel="noreferrer"><MdDownload /> Descargar</a>}
                      {m.linkUrl && <a className="btn btn-ghost btn-sm" href={m.linkUrl} target="_blank" rel="noreferrer"><MdOpenInNew /> Abrir</a>}
                    </div>
                  ))}
                </div>
              )}
              {grades.length > 0 && (
                <div className="stack" style={{ gap: 8 }}>
                                    <div className="table-wrap">
                    <table className="table">
                      <thead><tr><th>Asignatura</th><th>Evaluaciones</th><th>Definitiva</th><th>Estado</th></tr></thead>
                      <tbody>{grades.map((s) => (
                        <tr key={s.subjectId}>
                          <td style={{ whiteSpace: 'normal' }}><b>{s.subject}</b></td>
                          <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>{s.items.map((i) => `${i.name} (${i.weight} %): ${fmtScore(i.score)}`).join(' · ')}</td>
                          <td><b>{fmtScore(s.final.score)}</b></td>
                          <td>{s.final.state === 'aprobado' ? <span className="badge ok">Aprueba</span> : s.final.state === 'reprobado' ? <span className="badge bad">No aprueba</span> : <span className="badge">Sin notas</span>}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </Card>
        )
      })}
      </div>
      {submit && <SubmitModal material={submit} onClose={() => setSubmit(null)} onDone={() => { setSubmit(null); load(); toast('Taller entregado') }} />}
      {toastNode}
    </>
  )
}

export default MyCourse
