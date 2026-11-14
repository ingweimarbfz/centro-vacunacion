import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdPrint, MdErrorOutline, MdDraw, MdClose } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { Modal, Spinner, useToast } from '../../components/ui'
import '../../components/cytology.css'

const TZ = 'America/Bogota'
const fmtStamp = (iso) => new Intl.DateTimeFormat('es-CO', { timeZone: TZ, dateStyle: 'long', timeStyle: 'short' }).format(new Date(iso))

// Lienzo de firma (mouse, dedo o lápiz) con fondo blanco.
export const Pad = ({ onChange }) => {
  const ref = useRef(null); const drawing = useRef(false); const dirty = useRef(false)
  useEffect(() => {
    const c = ref.current; const ratio = window.devicePixelRatio || 1
    c.width = c.offsetWidth * ratio; c.height = c.offsetHeight * ratio
    const ctx = c.getContext('2d'); ctx.scale(ratio, ratio); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111827'
  }, [])
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  const down = (e) => { e.preventDefault(); ref.current.setPointerCapture(e.pointerId); drawing.current = true; const ctx = ref.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(...pos(e)) }
  const move = (e) => { if (!drawing.current) return; const ctx = ref.current.getContext('2d'); ctx.lineTo(...pos(e)); ctx.stroke(); dirty.current = true }
  const up = () => { if (!drawing.current) return; drawing.current = false; if (dirty.current) onChange(ref.current.toDataURL('image/png')) }
  const clear = () => { const c = ref.current; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); dirty.current = false; onChange(null) }
  return (
    <div className="sig-pad">
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} aria-label="Área para dibujar la firma" style={{ touchAction: 'none' }} />
      <div className="sig-pad-foot"><span>Firma aquí</span><button type="button" className="btn btn-ghost btn-sm" onClick={clear}><MdClose /> Limpiar</button></div>
    </div>
  )
}

const SignModal = ({ doc, onClose, onSigned }) => {
  const [signature, setSignature] = useState(null)
  const [signerName, setSignerName] = useState(doc.student.name)
  const [accept, setAccept] = useState(false); const [acceptRules, setAcceptRules] = useState(false)
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async () => {
    setError('')
    if (!signature) return setError('Dibuja la firma.')
    if (!accept || !acceptRules) return setError('Marca las dos casillas de aceptación.')
    setSaving(true)
    try { await api.post(`/academico/matriculas/${doc.enrollmentId}/contrato/firmar`, { signature, signerName, accept, acceptRules }); onSigned() } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title="Firmar contrato de matrícula" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdDraw />} Firmar</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        <div className="field"><label>Nombre de quien firma</label><input value={signerName} onChange={(e) => setSignerName(e.target.value)} /><span className="hint">Si el estudiante es menor de edad, firma su acudiente.</span></div>
        <Pad onChange={setSignature} />
        <label style={{ display: 'flex', gap: 8, fontSize: 13.5, alignItems: 'flex-start' }}><input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} /> Leí el contrato de matrícula y acepto sus cláusulas, el valor y el plan de pagos.</label>
        <label style={{ display: 'flex', gap: 8, fontSize: 13.5, alignItems: 'flex-start' }}><input type="checkbox" checked={acceptRules} onChange={(e) => setAcceptRules(e.target.checked)} /> Conozco y acepto el {doc.rules.title.toLowerCase()} (versión {doc.rules.version}).</label>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

// Contrato de matrícula: lo firma el estudiante (en la sede o desde su portal) y se imprime o guarda en PDF.
// Firmado, se muestra el texto tal como se firmó.
const ContractPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { logo } = useSettings()
  const { user } = useAuth()
  const [toast, toastNode] = useToast()
  const [doc, setDoc] = useState(null); const [err, setErr] = useState(''); const [signing, setSigning] = useState(false)
  const load = useCallback(() => api.get(`/academico/matriculas/${id}/contrato`).then(({ data }) => setDoc(data)).catch((e) => setErr(errorMessage(e))), [id])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (doc) { const t = document.title; document.title = `Contrato_matricula_${doc.student.docNumber}`; return () => { document.title = t } } return undefined }, [doc])
  if (err) return <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>
  if (!doc) return <div className="splash"><Spinner /></div>
  const c = doc.contract
  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>← Volver</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {!c.signedAt && <button type="button" className="btn btn-primary" onClick={() => setSigning(true)}><MdDraw /> {user.role === 'estudiante' ? 'Firmar mi contrato' : 'Firmar con el estudiante'}</button>}
          <button type="button" className={`btn ${c.signedAt ? 'btn-primary' : 'btn-outline'}`} onClick={() => window.print()}><MdPrint /> Imprimir / PDF</button>
        </div>
      </div>
      {!c.signedAt && c.required && <div className="alert warn no-print" style={{ maxWidth: '216mm', margin: '0 auto 12px' }}><span>Contrato obligatorio (carrera técnica) pendiente de firma.</span></div>}
      <article className="cy-sheet">
        <header className="cy-sheet-header">
          <img className="cy-logo" src={doc.logoUrl || logo} alt={doc.institution} />
          <div className="cy-sheet-heading"><p className="cy-kicker">{doc.institution}</p><h2>{doc.title}</h2></div>
          <dl className="cy-meta"><div><dt>Estudiante</dt><dd>{doc.student.docType} {doc.student.docNumber}</dd></div><div><dt>Estado</dt><dd>{c.signedAt ? 'Firmado' : 'Sin firmar'}</dd></div></dl>
        </header>
        <p style={{ marginTop: '5mm', textAlign: 'justify' }}>{doc.intro}</p>
        {doc.sections.map((s, i) => (
          <section key={s.title} className="cy-section" style={{ breakInside: 'auto' }}>
            <h3 className="cy-section-title">{`${i + 1}. ${s.title}`}</h3>
            {s.paragraphs.map((p, j) => <p key={j} style={{ margin: '0 0 2mm', textAlign: 'justify', whiteSpace: 'pre-line' }}>{p}</p>)}
          </section>
        ))}
        {doc.rules.text && (
          <section className="cy-section" style={{ breakInside: 'auto' }}>
            <h3 className="cy-section-title">Anexo · {doc.rules.title} (versión {doc.rules.version})</h3>
            <p style={{ margin: 0, whiteSpace: 'pre-line', textAlign: 'justify', fontSize: 11.5 }}>{doc.rules.text}</p>
          </section>
        )}
        <div className="cy-signatures">
          <div>{c.signatureUrl ? <img src={c.signatureUrl} alt="Firma del estudiante" style={{ maxHeight: 60, maxWidth: '100%', objectFit: 'contain', alignSelf: 'flex-start' }} /> : <div style={{ height: 60 }} />}<span className="cy-sign-line" /><b>{c.signerName || doc.student.name}</b><span>EL ESTUDIANTE{c.signedAt ? ` · ${fmtStamp(c.signedAt)}` : ''}</span></div>
          <div><div style={{ height: 60 }} /><span className="cy-sign-line" /><b>{doc.institution}</b><span>LA INSTITUCIÓN</span></div>
        </div>
        {c.signedAt && <footer className="cy-sheet-footer"><span>Firmado electrónicamente el {fmtStamp(c.signedAt)}. Reglamento aceptado: versión {c.rulesVersion}.</span><span>Matrícula N.º {doc.enrollmentId}</span></footer>}
      </article>
      {signing && <SignModal doc={doc} onClose={() => setSigning(false)} onSigned={() => { setSigning(false); load(); toast('Contrato firmado') }} />}
      {toastNode}
    </div>
  )
}

export default ContractPage
