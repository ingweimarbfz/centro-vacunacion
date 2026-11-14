import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdPrint, MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { Spinner } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import '../../components/cytology.css'

// Valor en letras (pesos colombianos) para el recibo de caja.
const UN = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte', 'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve']
const DEC = ['', '', '', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa']
const CEN = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos']
const hundreds = (n) => {
  if (n === 0) return ''
  if (n === 100) return 'cien'
  const c = Math.floor(n / 100); const r = n % 100
  const rest = r < 30 ? UN[r] : `${DEC[Math.floor(r / 10)]}${r % 10 ? ` y ${UN[r % 10]}` : ''}`
  return [CEN[c], rest].filter(Boolean).join(' ')
}
export const inWords = (value) => {
  const n = Math.round(Number(value) || 0)
  if (n === 0) return 'cero pesos'
  const millions = Math.floor(n / 1e6); const thousands = Math.floor((n % 1e6) / 1000); const rest = n % 1000
  const parts = []
  if (millions) parts.push(millions === 1 ? 'un millón' : `${hundreds(millions).replace(/uno$/, 'un')} millones`)
  if (thousands) parts.push(thousands === 1 ? 'mil' : `${hundreds(thousands).replace(/uno$/, 'un')} mil`)
  if (rest) parts.push(hundreds(rest))
  const text = parts.join(' ')
  return `${text}${!rest && !thousands && millions ? ' de' : ''} pesos`.replace(/^./, (c) => c.toUpperCase())
}

// Recibo de caja de un pago de matrícula: imprimible o guardable como PDF.
const ReceiptPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { logo, settings } = useSettings()
  const [r, setR] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api.get(`/academico/pagos/${id}`).then(({ data }) => setR(data)).catch((e) => setErr(errorMessage(e))) }, [id])
  useEffect(() => { if (r) { const t = document.title; document.title = `Recibo_${r.receiptNumber}`; return () => { document.title = t } } return undefined }, [r])
  if (err) return <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>
  if (!r) return <div className="splash"><Spinner /></div>
  const e = r.enrollment
  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>← Volver</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
      </div>
      <article className="cy-sheet" style={{ position: 'relative' }}>
        {r.voided && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 90, fontWeight: 800, color: 'rgba(220,38,38,.15)', transform: 'rotate(-18deg)', pointerEvents: 'none' }}>ANULADO</div>}
        <header className="cy-sheet-header">
          <img className="cy-logo" src={r.settings.logoUrl || logo} alt={r.settings.institution || settings.ipsName} />
          <div className="cy-sheet-heading"><p className="cy-kicker">Educación para el trabajo y el desarrollo humano</p><h2>Recibo de caja</h2><div style={{ fontSize: 12 }}>{r.settings.institution || settings.ipsName}</div></div>
          <dl className="cy-meta"><div><dt>N.º</dt><dd>{r.receiptNumber}</dd></div><div><dt>Fecha</dt><dd>{formatDate(r.paidAt)}</dd></div></dl>
        </header>
        <div className="cy-patient-band">
          <div><span className="cy-field-label">Recibimos de</span><b className="cy-patient-name">{r.student?.fullName}</b><span>{r.student?.docType} {r.student?.docNumber}</span></div>
          <div><span className="cy-field-label">Valor</span><b className="cy-patient-name">{formatMoney(r.amount)}</b></div>
          <div><span className="cy-field-label">Medio de pago</span><b>{r.methodLabel}</b>{r.reference && <span>Ref. {r.reference}</span>}</div>
        </div>
        <section className="cy-section">
          <h3 className="cy-section-title">La suma de</h3>
          <p style={{ margin: 0, fontWeight: 600 }}>{inWords(r.amount)} M/CTE.</p>
        </section>
        <section className="cy-section">
          <h3 className="cy-section-title">Por concepto de</h3>
          <div className="cy-grid">
            <div className="cy-field cy-field-wide"><span className="cy-field-label">Programa</span><span className="cy-field-value">{e.program?.name}</span></div>
            <div className="cy-field"><span className="cy-field-label">Periodo</span><span className="cy-field-value">{[e.period?.name, e.academicPeriod].filter(Boolean).join(' · ') || '—'}</span></div>
            <div className="cy-field"><span className="cy-field-label">Grupo</span><span className="cy-field-value">{e.group?.code || '—'}</span></div>
          </div>
        </section>
        <section className="cy-section">
          <h3 className="cy-section-title">Estado de la cuenta</h3>
          <div className="cy-grid">
            <div className="cy-field"><span className="cy-field-label">Valor de la matrícula</span><span className="cy-field-value">{formatMoney(e.account.total)}</span></div>
            <div className="cy-field"><span className="cy-field-label">Total pagado</span><span className="cy-field-value">{formatMoney(e.account.paid)}</span></div>
            <div className="cy-field"><span className="cy-field-label">Saldo</span><span className="cy-field-value">{formatMoney(e.account.balance)}</span></div>
            <div className="cy-field"><span className="cy-field-label">Próxima cuota</span><span className="cy-field-value">{e.account.nextDue ? `${formatDate(e.account.nextDue.dueDate)} · ${formatMoney(e.account.nextDue.balance)}` : 'Paz y salvo'}</span></div>
          </div>
          <p style={{ margin: '3mm 0 0', fontSize: 10.5, color: '#6b7280' }}>Estado de cuenta a la fecha de impresión.</p>
        </section>
        {(r.notes || r.voided) && <section className="cy-section"><h3 className="cy-section-title">Observaciones</h3><p style={{ margin: 0 }}>{r.voided ? `Recibo anulado: ${r.voidedReason}` : r.notes}</p></section>}
        <div className="cy-signatures">
          <div><span className="cy-sign-line" /><b>{r.cashier || 'Caja'}</b><span>Recibió</span></div>
          <div><span className="cy-sign-line" /><b>{r.student?.fullName}</b><span>Estudiante</span></div>
        </div>
        <footer className="cy-sheet-footer"><span>{r.settings.institution}</span><span>Recibo N.º {r.receiptNumber}</span></footer>
      </article>
    </div>
  )
}

export default ReceiptPage
