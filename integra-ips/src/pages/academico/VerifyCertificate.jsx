import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdVerified, MdCancel, MdSearch } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Spinner } from '../../components/ui'

const longDate = (iso) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${String(iso).slice(0, 10)}T12:00:00Z`))

// Verificación pública de certificados (sin iniciar sesión): con el código impreso en el certificado.
const VerifyCertificate = () => {
  const { code } = useParams()
  const navigate = useNavigate()
  const [value, setValue] = useState(code || '')
  const [d, setD] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => {
    if (!code) return
    setBusy(true); setErr(''); setD(null)
    api.get(`/publico/certificados/${encodeURIComponent(code)}`).then(({ data }) => setD(data)).catch((e) => setErr(errorMessage(e))).finally(() => setBusy(false))
  }, [code])
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '48px 16px' }}>
      <div className="card" style={{ width: 'min(560px, 100%)', padding: 28 }}>
        <h1 style={{ margin: '0 0 6px', fontSize: 22 }}>Verificación de certificados</h1>
        <p style={{ margin: '0 0 18px', color: 'var(--muted)', fontSize: 14 }}>Escribe el código que aparece al pie del certificado.</p>
        <form onSubmit={(e) => { e.preventDefault(); if (value.trim()) navigate(`/verificar/${value.trim().toUpperCase()}`) }} style={{ display: 'flex', gap: 8 }}>
          <input className="input" value={value} onChange={(e) => setValue(e.target.value)} placeholder="Código de verificación" aria-label="Código de verificación" style={{ flex: 1, textTransform: 'uppercase', letterSpacing: '.08em' }} />
          <button type="submit" className="btn btn-primary"><MdSearch /> Verificar</button>
        </form>
        {busy && <div className="splash" style={{ minHeight: 100 }}><Spinner /></div>}
        {err && <div className="alert bad" style={{ marginTop: 16 }}><MdCancel /><span>{err}</span></div>}
        {d && (
          <div className={`alert ${d.valid ? 'ok' : 'bad'}`} style={{ marginTop: 16, alignItems: 'flex-start' }}>
            {d.valid ? <MdVerified /> : <MdCancel />}
            <div style={{ fontSize: 14, lineHeight: 1.6 }}>
              <b>{d.valid ? 'Certificado válido' : 'Certificado anulado'}</b><br />
              {d.title} · {d.number}<br />
              {d.student} ({d.document})<br />
              Programa: {d.program} · {d.hours} horas<br />
              {d.institution} · expedido el {longDate(d.issuedAt)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default VerifyCertificate
