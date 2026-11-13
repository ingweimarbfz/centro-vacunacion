import React from 'react'
import { formatMoney } from '../../utils/format'
import '../cytology.css'
import '../../pages/vacunacion/vacunacion.css'

const fmt = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')
const SEX = { F: 'Femenino', M: 'Masculino', I: 'Intersexual' }

// Carnet de vacunación (se usa en el sistema y en el enlace público que recibe el paciente).
export const VaccinationCardSheet = ({ patient: p, records, institution }) => {
  const pending = Object.values(records.reduce((a, r) => { a[r.vaccineId] = r; return a }, {})).filter((r) => r.nextDoseDate)
  return (
    <article className="cy-sheet ev-sheet">
      <header className="cy-sheet-header">
        {institution.logo && <img src={institution.logo} alt={institution.name} className="cy-logo" />}
        <div className="cy-sheet-heading"><p className="cy-kicker">{institution.shortName || institution.name} · Vacunación</p><h2>Carnet de vacunación</h2></div>
        <dl className="cy-meta"><div><dt>Documento</dt><dd>{p.docNumber}</dd></div><div><dt>Expedido</dt><dd>{fmt(new Date().toISOString())}</dd></div></dl>
      </header>
      <div className="cy-patient-band ev-band">
        <div><span className="cy-field-label">Paciente</span><strong className="cy-patient-name">{p.patient}</strong><span className="ev-sub">{p.docType} {p.docNumber}</span></div>
        <div><span className="cy-field-label">Nacimiento</span><strong>{fmt(p.birthDate)}</strong><span className="ev-sub">{SEX[p.sex] || ''}</span></div>
        <div><span className="cy-field-label">EPS</span><strong>{p.epsName || 'Sin EPS'}</strong><span className="ev-sub">{p.populationGroup}</span></div>
      </div>
      <section className="cy-section ev-table-section">
        <h3 className="cy-section-title">Dosis aplicadas</h3>
        <table className="ev-table vac-card-table">
          <thead><tr><th>Fecha</th><th>Biológico</th><th>Dosis</th><th>Lote</th><th>Vacunador</th><th>Firma</th><th>Sede</th></tr></thead>
          <tbody>{records.map((r) => <tr key={r.id}><td>{fmt(r.appliedOn)}</td><td><b>{r.vaccine}</b>{r.pai ? '' : ' (particular)'}</td><td>{r.dose}</td><td>{r.lot || '—'}</td><td>{r.vaccinator}</td><td>{r.vaccinatorSignature ? <img src={r.vaccinatorSignature} alt={`Firma de ${r.vaccinator}`} className="vac-sign" /> : <span style={{ color: '#B45309', fontSize: 10 }}>Sin firma</span>}</td><td>{r.siteName}</td></tr>)}</tbody>
        </table>
      </section>
      {pending.length > 0 && (
        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Próximas dosis</h3>
          <table className="ev-table vac-card-table">
            <thead><tr><th>Biológico</th><th>Dosis</th><th>Fecha sugerida</th></tr></thead>
            <tbody>{pending.map((r) => <tr key={r.id}><td><b>{r.vaccine}</b></td><td>{r.nextDoseLabel}</td><td>{fmt(r.nextDoseDate)}</td></tr>)}</tbody>
          </table>
        </section>
      )}
      <footer className="cy-sheet-footer"><span>{institution.name} · Carnet de vacunación</span><span>Presente este carnet en cada vacunación</span></footer>
    </article>
  )
}

const STATUS = { no_aplica: 'Pagada en caja', pendiente: 'A cargo de la entidad (cuenta de cobro)', cobrada: 'En cuenta de cobro', pagada: 'Pagada por la entidad', anulada: 'Anulada', por_facturar: 'Por facturar' }

// Factura del servicio (control interno; la factura electrónica se emite ante la DIAN con el proveedor tecnológico).
export const InvoiceSheet = ({ c, institution }) => {
  const payer = c.payer || {}
  const sharedLabel = c.shared?.type === 'copago' ? 'Copago' : c.shared?.type === 'cuota_moderadora' ? 'Cuota moderadora' : null
  return (
    <article className="cy-sheet ev-sheet">
      <header className="cy-sheet-header">
        {institution.logo && <img src={institution.logo} alt={institution.name} className="cy-logo" />}
        <div className="cy-sheet-heading"><p className="cy-kicker">{institution.shortName || institution.name} · {c.serviceName}</p><h2>Factura de venta</h2></div>
        <dl className="cy-meta"><div><dt>N°</dt><dd>{c.numFactura}</dd></div><div><dt>Fecha</dt><dd>{fmt(c.invoicedAt || c.fecha)}</dd></div><div><dt>Estado</dt><dd>{STATUS[c.billingStatus] || c.billingStatus}</dd></div></dl>
      </header>
      <div className="cy-patient-band ev-band">
        <div><span className="cy-field-label">Cliente</span><strong className="cy-patient-name">{payer.name || c.paciente}</strong><span className="ev-sub">{[payer.docType, payer.docNumber].filter(Boolean).join(' ')}</span></div>
        <div><span className="cy-field-label">Paciente</span><strong>{c.paciente}</strong><span className="ev-sub">{c.documento}</span></div>
        <div><span className="cy-field-label">EPS / entidad</span><strong>{c.epsName || 'Particular'}</strong><span className="ev-sub">{c.paymentMode === 'cuenta_cobro' ? 'Cuenta de cobro' : 'Pago en caja'}{c.siteName ? ` · ${c.siteName}` : ''}</span></div>
      </div>
      <section className="cy-section ev-table-section">
        <h3 className="cy-section-title">Detalle</h3>
        <table className="ev-table">
          <thead><tr><th>Concepto</th><th style={{ textAlign: 'right' }}>Cant.</th><th style={{ textAlign: 'right' }}>Valor unitario</th><th style={{ textAlign: 'right' }}>IVA</th><th style={{ textAlign: 'right' }}>Subtotal</th></tr></thead>
          <tbody>{(c.items || []).map((i) => <tr key={i.id}><td><b>{i.name}</b></td><td style={{ textAlign: 'right' }}>{i.quantity}</td><td style={{ textAlign: 'right' }}>{formatMoney(i.unitPrice)}</td><td style={{ textAlign: 'right' }}>{i.ivaRate ? `${i.ivaRate} %` : 'Excluido'}</td><td style={{ textAlign: 'right' }}>{formatMoney(i.subtotal)}</td></tr>)}</tbody>
        </table>
        <div className="invoice-total" style={{ marginTop: 10, marginLeft: 'auto', maxWidth: 360 }}>
          <div><span>Subtotal</span><b>{formatMoney(c.valorBase)}</b></div>
          {c.descuento > 0 && <div><span>Descuento {c.descuentoNombre || ''}</span><b>− {formatMoney(c.descuento)}</b></div>}
          <div><span>IVA</span><b>{c.iva ? formatMoney(c.iva) : 'Excluido'}</b></div>
          <div><span>Total factura</span><b>{formatMoney(c.total)}</b></div>
          {sharedLabel && c.shared.amount > 0 && <div><span>{sharedLabel} pagado por el usuario</span><b>{formatMoney(c.shared.amount)}</b></div>}
          <div className="grand"><span>{c.paymentMode === 'cuenta_cobro' ? `A cargo de ${c.epsName || 'la entidad'}` : 'Total pagado'}</span><b>{formatMoney(c.valor)}</b></div>
        </div>
      </section>
      <footer className="cy-sheet-footer" style={{ flexDirection: 'column', gap: 2 }}>
        <span>{c.dian?.resolution ? `Resolución DIAN N° ${c.dian.resolution}${c.dian.prefix ? ` · prefijo ${c.dian.prefix}` : ''}${c.dian.from ? ` · del ${c.dian.from} al ${c.dian.to}` : ''}${c.dian.validUntil ? ` · vigente hasta ${fmt(c.dian.validUntil)}` : ''}` : 'Documento de control interno de la IPS.'}</span>
        <span>Servicios de salud excluidos de IVA (Estatuto Tributario, art. 476 num. 1). {institution.name}</span>
      </footer>
    </article>
  )
}
