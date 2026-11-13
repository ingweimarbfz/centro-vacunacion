import React, { useEffect, useState } from 'react'
import { MdEmail, MdContentCopy, MdErrorOutline, MdCheckCircle, MdOpenInNew } from 'react-icons/md'
import { FaWhatsapp } from 'react-icons/fa'
import api, { errorMessage } from '../../api/client'
import { Modal, Spinner } from '../ui'

// Enviar al paciente su carnet o su factura: WhatsApp, correo o enlace (privado, vence en 30 días).
const ShareDialog = ({ kind, refId, onClose }) => {
  const [s, setS] = useState(null); const [err, setErr] = useState(''); const [ok, setOk] = useState('')
  const [phone, setPhone] = useState(''); const [email, setEmail] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => {
    api.post('/compartir', { kind, ref: refId }).then(({ data }) => { setS(data); setPhone(data.contact.phone || ''); setEmail(data.contact.email || '') }).catch((e) => setErr(errorMessage(e)))
  }, [kind, refId])
  const log = (channel, recipient) => api.post(`/compartir/${s.token}/registro`, { channel, recipient }).catch(() => {})
  const whatsapp = () => {
    const digits = phone.replace(/\D/g, '')
    if (digits.length < 10) return setErr('Escribe un celular de 10 dígitos.')
    const number = digits.length === 10 ? `57${digits}` : digits
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(s.message)}`, '_blank', 'noopener')
    log('whatsapp', number); setOk('Se abrió WhatsApp con el mensaje listo para enviar.')
  }
  const sendEmail = async () => {
    setErr(''); setOk('')
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) return setErr('Escribe un correo válido.')
    if (!s.emailConfigured) {
      window.location.href = `mailto:${email.trim()}?subject=${encodeURIComponent(s.title)}&body=${encodeURIComponent(s.message)}`
      log('enlace', email.trim()); return setOk('Se abrió tu programa de correo con el mensaje listo.')
    }
    setBusy(true)
    try { await api.post('/compartir/correo', { kind, ref: refId, email: email.trim() }); setOk(`Correo enviado a ${email.trim()}.`) } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }
  const copy = async () => { try { await navigator.clipboard.writeText(s.url); log('enlace', null); setOk('Enlace copiado.') } catch { setErr('No se pudo copiar el enlace.') } }
  return (
    <Modal title={s ? `Enviar ${s.title}` : 'Enviar documento'} size="sm" onClose={onClose}
      footer={<button type="button" className="btn btn-outline" onClick={onClose}>Cerrar</button>}>
      {!s ? (err ? <div className="alert bad"><MdErrorOutline /><span>{err}</span></div> : <div className="splash" style={{ minHeight: 120 }}><Spinner /></div>) : (
        <div className="stack" style={{ gap: 12 }}>
          <div className="field"><label>Celular (WhatsApp)</label>
            <div style={{ display: 'flex', gap: 8 }}><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="numeric" placeholder="3001234567" style={{ flex: 1, minWidth: 0 }} />
              <button type="button" className="btn btn-primary" style={{ background: '#25D366', borderColor: '#25D366' }} onClick={whatsapp}><FaWhatsapp /> WhatsApp</button></div>
          </div>
          <div className="field"><label>Correo</label>
            <div style={{ display: 'flex', gap: 8 }}><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="paciente@correo.com" style={{ flex: 1, minWidth: 0 }} />
              <button type="button" className="btn btn-primary" onClick={sendEmail} disabled={busy}>{busy ? <Spinner /> : <MdEmail />} {s.emailConfigured ? 'Enviar' : 'Abrir en mi correo'}</button></div>
            {!s.emailConfigured && <span className="hint">El envío automático requiere configurar el correo del servidor (SMTP); mientras tanto se abre tu programa de correo.</span>}
          </div>
          <div className="field"><label>Enlace privado</label>
            <div style={{ display: 'flex', gap: 8 }}><input value={s.url} readOnly style={{ flex: 1, minWidth: 0 }} />
              <button type="button" className="btn btn-outline" onClick={copy}><MdContentCopy /> Copiar</button>
              <a className="btn btn-ghost btn-icon" href={s.url} target="_blank" rel="noreferrer" aria-label="Abrir enlace"><MdOpenInNew /></a></div>
            <span className="hint">Vence el {s.expiresAt.slice(0, 10).split('-').reverse().join('/')}. Compártelo solo con el titular (Ley 1581 de 2012).</span>
          </div>
          {ok && <div className="alert ok" style={{ margin: 0 }}><MdCheckCircle /><span>{ok}</span></div>}
          {err && <div className="alert bad" style={{ margin: 0 }}><MdErrorOutline /><span>{err}</span></div>}
        </div>
      )}
    </Modal>
  )
}

export default ShareDialog
