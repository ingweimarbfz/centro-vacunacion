import React, { useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { MdPrint, MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { Spinner } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { inWords } from './ReceiptPage'
import '../../components/cytology.css'

// Factura de la matrícula (al estudiante) o del aporte del convenio (a la entidad). Imprimible o PDF.
const EduInvoicePage = () => {
  const { id } = useParams()
  const [params] = useSearchParams()
  const tipo = params.get('tipo') === 'convenio' ? 'convenio' : 'estudiante'
  const navigate = useNavigate()
  const { logo } = useSettings()
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api.get(`/academico/matriculas/${id}/factura`, { params: { tipo } }).then(({ data }) => setD(data)).catch((e) => setErr(errorMessage(e))) }, [id, tipo])
  useEffect(() => { if (d) { const t = document.title; document.title = `Factura_${d.number}`; return () => { document.title = t } } return undefined }, [d])
  if (err) return <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>
  if (!d) return <div className="splash"><Spinner /></div>
  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>← Volver</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
      </div>
      <article className="cy-sheet">
        <header className="cy-sheet-header">
          <img className="cy-logo" src={d.issuer.logoUrl || logo} alt={d.issuer.name} />
          <div className="cy-sheet-heading">
            <p className="cy-kicker">{d.issuer.name}{d.issuer.nit ? ` · NIT ${d.issuer.nit}` : ''}</p>
            <h2>Factura de venta</h2>
            <div style={{ fontSize: 11.5 }}>{d.kind === 'convenio' ? 'Aporte del convenio a la matrícula' : 'Matrícula'}{d.issuer.city ? ` · ${d.issuer.city}` : ''}</div>
          </div>
          <dl className="cy-meta"><div><dt>N.º</dt><dd>{d.number}</dd></div><div><dt>Fecha</dt><dd>{formatDate(d.issuedAt)}</dd></div><div><dt>Pago</dt><dd>{d.payment.mode}</dd></div></dl>
        </header>
        <div className="cy-patient-band">
          <div><span className="cy-field-label">{d.kind === 'convenio' ? 'Entidad' : 'Cliente'}</span><b className="cy-patient-name">{d.buyer.name}</b><span>{d.buyer.docType} {d.buyer.docNumber || '—'}</span></div>
          <div><span className="cy-field-label">Contacto</span><span>{[d.buyer.contact, d.buyer.phone, d.buyer.email].filter(Boolean).join(' · ') || '—'}</span>{d.buyer.address && <span>{d.buyer.address}</span>}</div>
          <div><span className="cy-field-label">Total</span><b className="cy-patient-name">{formatMoney(d.total)}</b></div>
        </div>
        <section className="cy-section">
          <h3 className="cy-section-title">Detalle</h3>
          <table className="table" style={{ fontSize: 12 }}>
            <thead><tr><th>Concepto</th><th className="num">Valor</th></tr></thead>
            <tbody>
              {d.lines.map((l, i) => <tr key={i}><td style={{ whiteSpace: 'normal' }}>{l.description}</td><td className="num">{l.value < 0 ? `− ${formatMoney(-l.value)}` : formatMoney(l.value)}</td></tr>)}
              <tr><td style={{ textAlign: 'right' }}>Subtotal</td><td className="num">{formatMoney(d.subtotal)}</td></tr>
              <tr><td style={{ textAlign: 'right' }}>IVA</td><td className="num">{formatMoney(d.iva)}</td></tr>
              <tr><td style={{ textAlign: 'right' }}><b>Total a pagar</b></td><td className="num"><b>{formatMoney(d.total)}</b></td></tr>
            </tbody>
          </table>
          <p style={{ margin: '2mm 0 0' }}><b>Son:</b> {inWords(d.total)} M/CTE.</p>
          <p style={{ margin: '1mm 0 0', fontSize: 10.5, color: '#6b7280' }}>{d.ivaNote}</p>
        </section>
        {d.payment.plan.length > 1 && (
          <section className="cy-section">
            <h3 className="cy-section-title">Plan de pagos</h3>
            <div className="cy-grid">{d.payment.plan.map((q) => <div key={q.number} className="cy-field"><span className="cy-field-label">Cuota {q.number} · {formatDate(q.dueDate)}</span><span className="cy-field-value">{formatMoney(q.amount)}</span></div>)}</div>
          </section>
        )}
        {d.kind === 'convenio' && <p style={{ marginTop: '3mm' }}>Beneficiario: <b>{d.student.name}</b> ({d.student.docType} {d.student.docNumber}).</p>}
        <footer className="cy-sheet-footer">
          <span>{d.resolution?.number ? `Resolución DIAN ${d.resolution.number}${d.resolution.prefix ? ` · prefijo ${d.resolution.prefix}` : ''}${d.resolution.from ? ` · del ${d.resolution.from} al ${d.resolution.to}` : ''}${d.resolution.validUntil ? ` · vigente hasta ${formatDate(d.resolution.validUntil)}` : ''}` : 'Numeración de facturación configurada en Facturación → Impuestos y numeración'}</span>
          <span>Factura N.º {d.number}</span>
        </footer>
      </article>
    </div>
  )
}

export default EduInvoicePage
