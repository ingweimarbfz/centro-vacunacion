import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MdArrowBack, MdSave, MdErrorOutline, MdDraw, MdPrint, MdDoneAll, MdLockOpen, MdCheckCircle, MdVerified } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Modal, Spinner, useToast } from '../../components/ui'
import { formatDate } from '../../utils/format'
import { Pad } from './ContractPage'

export const ATT = { presente: ['P', 'Presente', 'ok'], tarde: ['T', 'Llegó tarde', 'warn'], excusa: ['E', 'Excusa', 'info'], ausente: ['A', 'Ausente', 'bad'] }
const ACTA_TONE = { firmada: 'ok', pendiente_director: 'warn', sin_cerrar: 'info', sin_asistencia: '' }

// Firma dibujada en el momento (estudiante en el aula) o con "Mi firma digital" (docente y director).
export const SignModal = ({ title, hint, allowSaved, onClose, onSign }) => {
  const [mode, setMode] = useState(allowSaved ? 'guardada' : 'dibujar')
  const [sig, setSig] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async () => {
    if (mode === 'dibujar' && !sig) return setError('Dibuja la firma.')
    setBusy(true); setError('')
    try { await onSign(mode === 'dibujar' ? sig : undefined) } catch (e) { setError(errorMessage(e)); setBusy(false) }
  }
  return (
    <Modal title={title} onClose={onClose} footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={busy}>{busy ? <Spinner /> : <MdDraw />} Firmar</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        {hint && <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-2)' }}>{hint}</p>}
        {allowSaved && (
          <div className="module-switch inline" style={{ alignSelf: 'flex-start' }}>
            <button type="button" className={mode === 'guardada' ? 'on' : ''} onClick={() => setMode('guardada')}>Usar mi firma digital</button>
            <button type="button" className={mode === 'dibujar' ? 'on' : ''} onClick={() => setMode('dibujar')}>Dibujar ahora</button>
          </div>
        )}
        {mode === 'dibujar' ? <Pad onChange={setSig} /> : <span className="hint">Se usa la firma registrada en “Mi firma digital”.</span>}
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

// Asistencia de una clase: checklist del docente, firmas de los estudiantes, cierre del acta (docente) y firma del director.
const AttendancePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [toast, toastNode] = useToast()
  const [d, setD] = useState(null); const [error, setError] = useState('')
  const [marks, setMarks] = useState({}); const [dirty, setDirty] = useState(false); const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(null); const [reason, setReason] = useState('')
  const apply = (data) => { setD(data); setMarks(Object.fromEntries(data.roster.map((r) => [r.studentId, { status: r.status || '', arrivedAt: r.arrivedAt || '', note: r.note || '' }]))); setDirty(false) }
  const load = useCallback(() => api.get(`/academico/clases/${id}/asistencia`, { noCache: true }).then(({ data }) => apply(data)).catch((e) => setError(errorMessage(e))), [id])
  useEffect(() => { load() }, [load])
  const setMark = (sid, patch) => { setMarks((m) => ({ ...m, [sid]: { ...m[sid], ...patch } })); setDirty(true) }
  const allPresent = () => { setMarks((m) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, { ...v, status: v.status || 'presente' }]))); setDirty(true) }
  const counts = useMemo(() => Object.values(marks).reduce((a, v) => ({ ...a, [v.status || 'sin']: (a[v.status || 'sin'] || 0) + 1 }), {}), [marks])
  const save = async () => {
    setSaving(true)
    try { const { data } = await api.put(`/academico/clases/${id}/asistencia`, { records: Object.entries(marks).filter(([, v]) => v.status).map(([studentId, v]) => ({ studentId, ...v })) }); apply(data); toast('Asistencia guardada') } catch (e) { toast(errorMessage(e), 'bad') } finally { setSaving(false) }
  }
  const post = async (path, body, msg) => { const { data } = await api.post(`/academico/clases/${id}/asistencia${path}`, body); apply(data); setModal(null); toast(msg) }
  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!d) return <div className="splash"><Spinner /></div>
  const s = d.session
  const back = user.role === 'docente' ? '/educacion/docente' : '/educacion/actas'
  return (
    <>
      <div style={{ marginBottom: 14 }}><Link to={back} className="btn btn-ghost btn-sm"><MdArrowBack /> {user.role === 'docente' ? 'Mi panel' : 'Asistencia y actas'}</Link></div>
      <PageHead title={`Asistencia · ${s.subject || 'Clase'}`} subtitle={`${s.group?.code} · ${s.group?.program} · ${formatDate(s.date)} ${s.startTime}–${s.endTime}${s.teacher ? ` · ${s.teacher}` : ''}`}>
        <span className={`badge ${ACTA_TONE[d.state]}`} style={{ alignSelf: 'center' }}>{d.stateLabel}</span>
        <button type="button" className="btn btn-outline" onClick={() => navigate(`/educacion/clases/${id}/acta`)}><MdPrint /> Acta</button>
        {d.can.edit && <button type="button" className="btn btn-primary" onClick={save} disabled={saving || !dirty}>{saving ? <Spinner /> : <MdSave />} Guardar asistencia</button>}
      </PageHead>
      {d.format.code && <div className="hint" style={{ marginTop: -10, marginBottom: 12 }}>Formato {d.format.code}{d.format.version ? ` · versión ${d.format.version}` : ''} · {d.format.name}</div>}
      {!d.can.edit && !d.teacher.signedAt && s.date > new Date().toISOString().slice(0, 10) && <div className="alert info" style={{ marginBottom: 12 }}><span>La asistencia se toma el día de la clase.</span></div>}
      <div className="grid grid-kpi" style={{ marginBottom: 16 }}>
        {Object.entries(ATT).map(([k, [, l, tone]]) => <div key={k} className="card kpi"><span className="kpi-label">{l}</span><div className="kpi-value" style={{ color: tone === 'ok' ? 'var(--ok)' : tone === 'bad' ? 'var(--bad)' : undefined }}>{counts[k] || 0}</div></div>)}
        <div className="card kpi"><span className="kpi-label">Firmas de estudiantes</span><div className="kpi-value">{d.summary.firmas} <small>/ {d.summary.debenFirmar}</small></div></div>
      </div>
      <div className="grid grid-2-1" style={{ alignItems: 'start' }}>
        <Card title="Checklist de asistencia" flush actions={d.can.edit && <button type="button" className="btn btn-ghost btn-sm" onClick={allPresent}><MdDoneAll /> Marcar todos presentes</button>}>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Estudiante</th><th>Asistencia</th><th>Llegada</th><th>Observación</th><th>Firma</th></tr></thead>
              <tbody>{d.roster.map((r) => {
                const m = marks[r.studentId] || {}
                const attended = m.status === 'presente' || m.status === 'tarde'
                return (
                  <tr key={r.studentId}>
                    <td style={{ whiteSpace: 'normal' }}><b>{r.fullName}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.docType} {r.docNumber}</div></td>
                    <td>{d.can.edit ? (
                      <div style={{ display: 'flex', gap: 4 }} role="radiogroup" aria-label={`Asistencia de ${r.fullName}`}>
                        {Object.entries(ATT).map(([k, [short, label, tone]]) => (
                          <button key={k} type="button" title={label} aria-label={label} aria-pressed={m.status === k} onClick={() => setMark(r.studentId, { status: k })}
                            className={`badge ${m.status === k ? tone : ''}`} style={{ border: m.status === k ? '1px solid currentColor' : '1px solid var(--line)', cursor: 'pointer', minWidth: 30, justifyContent: 'center', height: 28, fontSize: 13 }}>{short}</button>
                        ))}
                      </div>
                    ) : m.status ? <span className={`badge ${ATT[m.status][2]}`}>{ATT[m.status][1]}</span> : '—'}</td>
                    <td>{d.can.edit && m.status === 'tarde' ? <input className="input" type="time" value={m.arrivedAt} onChange={(e) => setMark(r.studentId, { arrivedAt: e.target.value })} style={{ width: 110 }} aria-label="Hora de llegada" /> : (m.arrivedAt || '—')}</td>
                    <td>{d.can.edit ? <input className="input" value={m.note} onChange={(e) => setMark(r.studentId, { note: e.target.value })} placeholder={m.status === 'excusa' ? 'Motivo de la excusa' : ''} aria-label="Observación" style={{ minWidth: 140 }} /> : (m.note || '—')}</td>
                    <td>{r.signedAt
                      ? <span className="badge ok" title={new Date(r.signedAt).toLocaleString('es-CO')}><MdCheckCircle /> {r.signedFrom === 'portal' ? 'Portal' : 'Firmó'}</span>
                      : attended && r.status && !d.director.signedAt
                        ? <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ student: r })} disabled={dirty}><MdDraw /> Firmar</button>
                        : <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                  </tr>
                )
              })}</tbody>
            </table>
          </div>
          {dirty && <div className="hint" style={{ padding: '8px 16px' }}>Guarda la asistencia antes de recoger firmas o cerrar el acta.</div>}
        </Card>
        <Card title="Firmas del acta" icon={<MdVerified style={{ color: 'var(--brand)' }} />}>
          <div className="stack" style={{ gap: 14 }}>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><b>Docente</b>{d.teacher.signedAt ? <span className="badge ok">Firmado</span> : <span className="badge warn">Pendiente</span>}</div>
              <div style={{ height: 70, border: '1px dashed var(--line)', borderRadius: 10, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFB' }}>{d.teacher.signatureUrl ? <img src={d.teacher.signatureUrl} alt="Firma del docente" style={{ maxHeight: 60, maxWidth: '90%' }} /> : <span className="hint">{d.teacher.name || 'Sin firmar'}</span>}</div>
              {d.teacher.signedAt && <div className="hint">{d.teacher.name} · {new Date(d.teacher.signedAt).toLocaleString('es-CO')}</div>}
              {d.can.close && <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setModal({ close: true })} disabled={dirty}><MdDraw /> Cerrar acta y firmar</button>}
            </div>
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14 }}><b>Director de educación</b>{d.director.signedAt ? <span className="badge ok">Firmado</span> : <span className="badge warn">Pendiente</span>}</div>
              <div style={{ height: 70, border: '1px dashed var(--line)', borderRadius: 10, marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#FAFAFB' }}>{d.director.signatureUrl ? <img src={d.director.signatureUrl} alt="Firma del director" style={{ maxHeight: 60, maxWidth: '90%' }} /> : <span className="hint">{d.teacher.signedAt ? 'Se le avisa al cerrar el acta' : 'Firma después del docente'}</span>}</div>
              {d.director.signedAt && <div className="hint">{d.director.name} · {new Date(d.director.signedAt).toLocaleString('es-CO')}</div>}
              {d.can.directorSign && <button type="button" className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={() => setModal({ director: true })}><MdDraw /> Firmar como director</button>}
            </div>
            {d.can.reopen && <button type="button" className="btn btn-ghost btn-sm" style={{ alignSelf: 'flex-start' }} onClick={() => setModal({ reopen: true })}><MdLockOpen /> Reabrir acta</button>}
            <span className="hint">Al cerrar el acta la clase queda como realizada y el director recibe el aviso por Telegram.</span>
          </div>
        </Card>
      </div>
      {modal?.student && <SignModal title={`Firma de ${modal.student.fullName}`} hint="El estudiante firma en este dispositivo. También puede firmar después desde su portal." onClose={() => setModal(null)} onSign={(sig) => post(`/${modal.student.studentId}/firma`, { signature: sig }, 'Firma registrada')} />}
      {modal?.close && <SignModal title="Cerrar acta de asistencia" hint={`Quedan ${d.summary.sinMarcar} estudiantes sin marcar. Después de cerrar no se puede cambiar la asistencia.`} allowSaved onClose={() => setModal(null)} onSign={(sig) => post('/cerrar', { signature: sig }, 'Acta cerrada y firmada')} />}
      {modal?.director && <SignModal title="Firma del director de educación" allowSaved onClose={() => setModal(null)} onSign={(sig) => post('/firmar-director', { signature: sig }, 'Acta firmada por el director')} />}
      {modal?.reopen && (
        <Modal title="Reabrir acta" size="sm" onClose={() => setModal(null)} footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={() => post('/reabrir', { reason }, 'Acta reabierta').catch((e) => toast(errorMessage(e), 'bad'))}><MdLockOpen /> Reabrir</button></>}>
          <div className="stack" style={{ gap: 10 }}><p style={{ margin: 0, fontSize: 13.5 }}>Se quitan las firmas del docente y del director para corregir la asistencia.</p><div className="field"><label>Motivo</label><input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></div></div>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default AttendancePage
