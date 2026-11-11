import React, { useCallback, useEffect, useRef, useState } from 'react'
import { MdDraw, MdUpload, MdDelete, MdSave, MdErrorOutline, MdClose, MdCheckCircle } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Spinner, useToast } from './ui'

const TZ = 'America/Bogota'
const fmtSigned = (iso) => new Intl.DateTimeFormat('es-CO', { timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }).format(new Date(iso))

// Lienzo para dibujar la firma con el mouse, el dedo o un lápiz. Exporta PNG con fondo blanco.
const SignaturePad = ({ onChange }) => {
  const ref = useRef(null)
  const drawing = useRef(false)
  const dirty = useRef(false)
  useEffect(() => {
    const c = ref.current; const ratio = window.devicePixelRatio || 1
    c.width = c.offsetWidth * ratio; c.height = c.offsetHeight * ratio
    const ctx = c.getContext('2d'); ctx.scale(ratio, ratio)
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
    ctx.lineWidth = 2.4; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = '#111827'
  }, [])
  const pos = (e) => { const r = ref.current.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top] }
  const down = (e) => { e.preventDefault(); ref.current.setPointerCapture(e.pointerId); drawing.current = true; const ctx = ref.current.getContext('2d'); ctx.beginPath(); ctx.moveTo(...pos(e)) }
  const move = (e) => { if (!drawing.current) return; const ctx = ref.current.getContext('2d'); ctx.lineTo(...pos(e)); ctx.stroke(); dirty.current = true }
  const up = () => { if (!drawing.current) return; drawing.current = false; if (dirty.current) onChange(ref.current.toDataURL('image/png')) }
  const clear = () => { const c = ref.current; const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); dirty.current = false; onChange(null) }
  return (
    <div className="sig-pad">
      <canvas ref={ref} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} aria-label="Área para dibujar la firma" />
      <div className="sig-pad-foot"><span>Firma aquí</span><button type="button" className="btn btn-ghost btn-sm" onClick={clear}><MdClose /> Limpiar</button></div>
    </div>
  )
}

const readFile = (file) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file) })
// Reduce imágenes grandes y conserva el fondo blanco (las PNG transparentes se aplanan sobre blanco).
const normalizeImage = async (file) => {
  const src = await readFile(file)
  if (file.type === 'image/svg+xml') return src
  const img = await new Promise((resolve, reject) => { const i = new Image(); i.onload = () => resolve(i); i.onerror = reject; i.src = src })
  const scale = Math.min(1, 900 / img.width, 360 / img.height)
  const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale)
  const ctx = c.getContext('2d'); ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height); ctx.drawImage(img, 0, 0, c.width, c.height)
  return c.toDataURL('image/png')
}

// Editor: dibujar o cargar imagen (PNG/JPG con fondo blanco o SVG).
export const SignatureEditor = ({ current, onSave, onRemove, saving }) => {
  const [mode, setMode] = useState('dibujar')
  const [draft, setDraft] = useState(null)
  const [error, setError] = useState('')
  const fileRef = useRef(null)
  const pick = async (file) => {
    setError('')
    if (!file) return
    if (!['image/png', 'image/jpeg', 'image/svg+xml'].includes(file.type)) return setError('Usa una imagen PNG o JPG con fondo blanco, o un vector SVG.')
    if (file.size > 2 * 1024 * 1024) return setError('La imagen supera 2 MB.')
    try { setDraft(await normalizeImage(file)) } catch { setError('No se pudo leer la imagen.') }
  }
  return (
    <div className="stack" style={{ gap: 14 }}>
      {current && (
        <div className="sig-current">
          <span className="label">Firma actual</span>
          <img src={current} alt="Firma actual" />
          {onRemove && <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} onClick={onRemove}><MdDelete /> Quitar firma</button>}
        </div>
      )}
      <div className="module-switch" style={{ alignSelf: 'flex-start' }}>
        <button type="button" className={mode === 'dibujar' ? 'on' : ''} onClick={() => { setMode('dibujar'); setDraft(null) }}><MdDraw /> Dibujar</button>
        <button type="button" className={mode === 'cargar' ? 'on' : ''} onClick={() => { setMode('cargar'); setDraft(null) }}><MdUpload /> Cargar imagen</button>
      </div>
      {mode === 'dibujar' ? <SignaturePad onChange={setDraft} /> : (
        <div className="sig-upload" onClick={() => fileRef.current.click()} role="button" tabIndex={0}>
          {draft ? <img src={draft} alt="Vista previa de la firma" /> : <><MdUpload /><span>Selecciona una foto de tu firma (fondo blanco) o un archivo SVG</span></>}
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/svg+xml" hidden onChange={(e) => pick(e.target.files[0])} />
        </div>
      )}
      {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      <div><button type="button" className="btn btn-primary" disabled={!draft || saving} onClick={() => onSave(draft)}>{saving ? <Spinner /> : <MdSave />} Guardar firma</button></div>
    </div>
  )
}

// ---------------------------------------------------------------- Firmas en documentos
export const useDocSignatures = (docType, docKey) => {
  const [sigs, setSigs] = useState([])
  const load = useCallback(() => {
    if (!docType || !docKey) return
    api.get('/firmas', { params: { tipo: docType, clave: docKey, sede: undefined } }).then(({ data }) => setSigs(data)).catch(() => {})
  }, [docType, docKey])
  useEffect(() => { load() }, [load])
  return { sigs, reload: load, docType, docKey }
}

// Casilla de firma: muestra la firma estampada o un botón para firmar (este no se imprime).
export const SignBlock = ({ doc, slot, label, name, canSign = true, className = '' }) => {
  const { user } = useAuth()
  const [toast, toastNode] = useToast()
  const [busy, setBusy] = useState(false)
  const sig = doc.sigs.find((s) => s.slot === slot)
  const sign = async () => {
    if (!user.signatureUrl) return toast('Primero crea tu firma en Cuenta → Mi firma digital y vuelve a intentarlo', 'bad')
    setBusy(true)
    try { await api.post('/firmas', { docType: doc.docType, docKey: doc.docKey, slot }); doc.reload(); toast('Documento firmado') } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy(false) }
  }
  const remove = async () => {
    setBusy(true)
    try { await api.delete(`/firmas/${sig.id}`); doc.reload(); toast('Firma retirada') } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy(false) }
  }
  return (
    <div className={`sig-block ${className}`}>
      <div className="sig-img">{sig ? <img src={sig.signatureUrl} alt={`Firma de ${sig.signerName}`} /> : canSign && (
        <button type="button" className="btn btn-outline btn-sm no-print" onClick={sign} disabled={busy}>{busy ? <Spinner /> : <MdDraw />} Firmar</button>
      )}</div>
      <span className="cy-sign-line" />
      <strong>{sig ? sig.signerName : (name || ' ')}</strong>
      <span className="cy-field-label">{label}</span>
      {sig && <span className="sig-meta">Firmado digitalmente {sig.signerIdentification ? `· CC ${sig.signerIdentification} ` : ''}· {fmtSigned(sig.signedAt)}
        {(sig.userId === user.id || user.role === 'administrador') && <button type="button" className="sig-remove no-print" onClick={remove} disabled={busy} title="Quitar firma"><MdClose /></button>}</span>}
      {!sig && !canSign && <span className="sig-meta no-print">Pendiente de firma{name && name.trim() && name !== '—' ? ` · solo ${name} puede firmar esta casilla` : ''}</span>}
      {toastNode}
    </div>
  )
}
export const SignedBadge = () => <MdCheckCircle />

// Firma compacta para una fila de tabla (p. ej. la salida de personal de un evento).
export const SignCell = ({ doc, slot, canSign, who }) => {
  const { user } = useAuth()
  const [toast, toastNode] = useToast()
  const [busy, setBusy] = useState(false)
  const sig = doc.sigs.find((s) => s.slot === slot)
  const sign = async () => {
    if (!user.signatureUrl) return toast('Primero crea tu firma en Cuenta → Mi firma digital y vuelve a intentarlo', 'bad')
    setBusy(true)
    try { await api.post('/firmas', { docType: doc.docType, docKey: doc.docKey, slot }); doc.reload(); toast('Firmado') } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy(false) }
  }
  const remove = async () => {
    setBusy(true)
    try { await api.delete(`/firmas/${sig.id}`); doc.reload() } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy(false) }
  }
  return (
    <div className="sig-cell">
      {sig ? (
        <>
          <img src={sig.signatureUrl} alt={`Firma de ${sig.signerName}`} title={`Firmado digitalmente · ${fmtSigned(sig.signedAt)}`} />
          {(sig.userId === user.id || user.role === 'administrador') && <button type="button" className="sig-remove no-print" onClick={remove} disabled={busy} title="Quitar firma"><MdClose /></button>}
        </>
      ) : canSign ? <button type="button" className="btn btn-outline btn-sm no-print" onClick={sign} disabled={busy}>{busy ? <Spinner /> : <MdDraw />} Firmar</button>
        : <span className="sig-meta no-print" title={who ? `Pendiente de firma de ${who}` : 'Pendiente de firma'}>Pendiente</span>}
      {toastNode}
    </div>
  )
}
