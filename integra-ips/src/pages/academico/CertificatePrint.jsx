import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdPrint, MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { Spinner } from '../../components/ui'
import '../../components/cytology.css'

const longDate = (iso) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: 'UTC' }).format(new Date(`${String(iso).slice(0, 10)}T12:00:00Z`))

// Certificado imprimible (diploma) con el código y el enlace de verificación pública.
const CertificatePrint = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { logo, settings } = useSettings()
  const [c, setC] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api.get(`/academico/certificados/${id}`).then(({ data }) => setC(data)).catch((e) => setErr(errorMessage(e))) }, [id])
  useEffect(() => { if (c) { const t = document.title; document.title = `Certificado_${c.numberLabel}`; return () => { document.title = t } } return undefined }, [c])
  if (err) return <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>
  if (!c) return <div className="splash"><Spinner /></div>
  const s = c.snapshot
  const verifyUrl = `${window.location.origin}/verificar/${c.verificationCode}`
  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print" style={{ maxWidth: '279mm' }}>
        <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>← Volver</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
      </div>
      {c.voided && <div className="alert bad no-print" style={{ maxWidth: '279mm', margin: '0 auto 12px' }}><span>Certificado anulado: {c.voidReason}</span></div>}
      <article className="cy-sheet sheet-landscape" style={{ position: 'relative', textAlign: 'center', padding: '14mm 18mm', border: '6px double #1F2A44' }}>
        {c.voided && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 110, fontWeight: 800, color: 'rgba(220,38,38,.15)', transform: 'rotate(-15deg)', pointerEvents: 'none' }}>ANULADO</div>}
        <img src={s.logoUrl || settings?.eduLogoUrl || logo} alt={s.institution} style={{ maxHeight: 70, maxWidth: 240, objectFit: 'contain' }} />
        <p style={{ margin: '4mm 0 0', fontSize: 12, letterSpacing: '.08em', textTransform: 'uppercase', color: '#6b7280' }}>{s.institution}{s.nit ? ` · NIT ${s.nit}` : ''}</p>
        <p style={{ margin: '1mm 0 0', fontSize: 11, color: '#6b7280' }}>Institución de Educación para el Trabajo y el Desarrollo Humano{s.program?.registrationNumber ? ` · Registro del programa ${s.program.registrationNumber}` : ''}</p>
        <h1 style={{ margin: '8mm 0 2mm', fontFamily: 'Georgia, serif', fontSize: 30, color: '#1F2A44' }}>{c.title}</h1>
        <p style={{ margin: 0, fontSize: 14 }}>Otorgado a</p>
        <p style={{ margin: '3mm 0 1mm', fontSize: 26, fontWeight: 700 }}>{s.student.name}</p>
        <p style={{ margin: 0, fontSize: 13 }}>{s.student.docType} {s.student.docNumber}</p>
        <p style={{ margin: '6mm auto 0', maxWidth: '200mm', fontSize: 14, lineHeight: 1.6 }}>
          Por haber cursado y aprobado el programa <b>{s.program.name}</b>{s.program.occupation ? <>, que lo acredita como <b>{s.program.occupation}</b></> : ''}, con una intensidad de <b>{c.hours.toLocaleString('es-CO')} horas</b>, de conformidad con el Decreto 1075 de 2015.
        </p>
        <p style={{ margin: '4mm 0 0', fontSize: 13 }}>Dado en {s.city || '—'}, el {longDate(c.issuedAt)}.</p>
        <div style={{ display: 'flex', justifyContent: 'space-around', alignItems: 'flex-end', marginTop: '12mm', gap: '10mm' }}>
          <div style={{ minWidth: '70mm' }}>{c.signerSignatureUrl ? <img src={c.signerSignatureUrl} alt="Firma" style={{ maxHeight: 55, maxWidth: '100%', objectFit: 'contain' }} /> : <div style={{ height: 55 }} />}<div style={{ borderTop: '1px solid #111', paddingTop: 2 }}><b>{s.signer?.name || ''}</b><div style={{ fontSize: 11 }}>{s.signer?.role || 'Director(a) de educación'}</div></div></div>
          <div style={{ minWidth: '70mm' }}><div style={{ height: 55 }} /><div style={{ borderTop: '1px solid #111', paddingTop: 2 }}><b>Secretaría académica</b><div style={{ fontSize: 11 }}>{s.institution}</div></div></div>
        </div>
        <div style={{ marginTop: '8mm', fontSize: 10.5, color: '#6b7280', display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
          <span>Certificado N.º {c.numberLabel} · Libro de registro de certificados</span>
          <span>Verifica su autenticidad en {verifyUrl} · código <b style={{ letterSpacing: '.1em' }}>{c.verificationCode}</b></span>
        </div>
      </article>
    </div>
  )
}

export default CertificatePrint
