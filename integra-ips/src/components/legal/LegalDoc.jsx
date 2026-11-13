import React from 'react'
import './legal.css'
import mark from '../../assets/integraMark.svg'

const TZ = 'America/Bogota'
const fdate = (iso) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeZone: TZ }).format(new Date(`${iso.slice(0, 10)}T12:00:00`))
const fstamp = (iso) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short', timeZone: TZ }).format(new Date(iso))

const SigBox = ({ sig, label, hint }) => (
  <div className="ldoc-sig">
    <div className="img">{sig?.signatureUrl ? <img src={sig.signatureUrl} alt={`Firma de ${sig.signerName}`} /> : null}</div>
    <div className="line" />
    <b>{sig ? sig.signerName : ' '}</b>
    <div>{label}</div>
    {sig ? <div className="meta">{sig.signerRole ? `${sig.signerRole} · ` : ''}{sig.signerId ? `C.C. ${sig.signerId} · ` : ''}Firmado electrónicamente el {fstamp(sig.signedAt)}{sig.ip ? ` · IP ${sig.ip}` : ''}</div>
      : <div className="meta pending">{hint || 'Pendiente de firma'}</div>}
  </div>
)

// Documento legal con el formato de Integra IPS: encabezado de marca, código, versión, partes, cláusulas y firmas.
const LegalDoc = ({ doc, toolbar, signatures = doc?.signatures || [] }) => {
  if (!doc) return null
  const client = signatures.find((s) => s.party === 'cliente')
  const provider = signatures.find((s) => s.party === 'proveedor')
  const hasParties = doc.kind !== 'terminos'
  return (
    <div className="ldoc-wrap">
      {toolbar && <div className="ldoc-toolbar no-print">{toolbar}</div>}
      <article className="ldoc">
        <header className="ldoc-head">
          <img className="ldoc-mark" src={mark} alt="Integra IPS" />
          <div className="ldoc-brand"><b>{doc.brand}</b><span>Sistema de información para IPS</span></div>
          <div className="ldoc-meta">Código <b>{doc.code}</b><br />Versión <b>{doc.version}</b> · Vigente desde {fdate(doc.effectiveDate)}</div>
        </header>
        <h1>{doc.title}</h1>
        <div className="ldoc-sub">{doc.organization ? `${doc.organization.name}${doc.organization.planName ? ` · Plan ${doc.organization.planName}` : ''}${doc.organization.billingCycle ? ` · Pago ${doc.organization.billingCycle}` : ''}` : 'Usuarios de la plataforma'}</div>
        {hasParties && (
          <div className="ldoc-parties">
            <div><small>{doc.kind === 'datos' ? 'Encargado del tratamiento' : 'El proveedor'}</small><b>{doc.provider.legalName}</b><span>{doc.provider.nit ? `NIT ${doc.provider.nit}` : 'NIT por definir'} · {doc.provider.city || ''}</span></div>
            <div><small>{doc.kind === 'datos' ? 'Responsable del tratamiento' : 'El cliente'}</small><b>{doc.organization?.name || '—'}</b><span>{doc.organization?.nit ? `NIT ${doc.organization.nit}` : 'NIT por definir'} · {doc.organization?.city || ''}</span></div>
          </div>
        )}
        <p>{doc.intro}</p>
        {doc.sections.map((s, i) => (
          <section key={i}>
            <h2>{hasParties ? `Cláusula ${i + 1}. ` : `${i + 1}. `}{s.title}</h2>
            {(s.paragraphs || []).map((p, j) => <p key={j}>{p}</p>)}
            {s.items?.length > 0 && <ul>{s.items.map((it, j) => <li key={j}>{it}</li>)}</ul>}
          </section>
        ))}
        {hasParties && (
          <>
            <p style={{ marginTop: 14 }}>En constancia, las partes firman electrónicamente este documento en las fechas indicadas junto a cada firma.</p>
            <div className="ldoc-sigs">
              <SigBox sig={client} label={doc.kind === 'datos' ? 'Responsable del tratamiento' : 'Por EL CLIENTE · Representante legal'} />
              <SigBox sig={provider} label={doc.kind === 'datos' ? 'Encargado del tratamiento' : 'Por EL PROVEEDOR · Representante legal'} hint="Pendiente de firma del proveedor" />
            </div>
          </>
        )}
        <div className="ldoc-foot"><span>{doc.brand} · {doc.code} v{doc.version}</span><span>Documento generado por la plataforma {doc.brand}</span></div>
      </article>
    </div>
  )
}

export default LegalDoc
