import React, { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MdSearch, MdErrorOutline, MdReceiptLong, MdInfoOutline } from 'react-icons/md'
import { Card, Spinner } from './ui'
import { formatMoney } from '../utils/format'
import '../pages/facturacion/facturacion.css'

const cupos = (n) => `${n} cupo${n === 1 ? '' : 's'} disponible${n === 1 ? '' : 's'}`

// Tarjeta "Factura del servicio" para cualquier formulario de servicio: busca por documento del paciente,
// N° de factura o documento/NIT de quien pagó. No es un <form> (va dentro del formulario del servicio).
const InvoicePicker = ({ inv, serviceLabel = 'el servicio', patientLabel = 'el paciente', error }) => {
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || params.get('doc') || '')
  const { invoice, search, select, clear, state, unitValue } = inv
  // Desde Servicios facturables llega la factura ya elegida (?factura=&q=).
  useEffect(() => { const pre = params.get('q') || params.get('doc'); if (pre) search(pre, params.get('factura')) }, [params, search])
  const run = () => search(q)
  return (
    <Card title={`Factura de ${serviceLabel}`} icon={<MdReceiptLong style={{ color: 'var(--brand)' }} />}
      subtitle={`Primero se factura en Facturación → Servicios facturables. Busca por documento de ${patientLabel}, N° de factura o documento/NIT de quien pagó`}>
      {invoice ? (
        <div className="stack" style={{ gap: 10 }}>
          <div className="invoice-picked">
            <div><span className="cy-field-label">Factura</span><strong>{invoice.numFactura}</strong><span className="hint">{invoice.fecha?.split('-').reverse().join('/')}</span></div>
            <div><span className="cy-field-label">{invoice.docNumber ? 'Paciente' : 'Pagó'}</span><strong>{invoice.docNumber ? invoice.paciente : invoice.payer?.name}</strong><span className="hint">{invoice.docNumber ? invoice.documento : cupos(invoice.remaining)}</span></div>
            <div><span className="cy-field-label">EPS / entidad</span><strong>{invoice.epsName || 'Particular'}</strong><span className="hint">{invoice.paymentMode === 'cuenta_cobro' ? 'Cuenta de cobro a la entidad' : 'Pagado en caja'}</span></div>
            <div><span className="cy-field-label">Valor</span><strong>{formatMoney(unitValue)}</strong>{invoice.descuento > 0 && <span className="hint">{invoice.descuentoNombre}</span>}</div>
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { clear(); setQ('') }}>Cambiar</button>
          </div>
          {!invoice.docNumber && <div className="alert info" style={{ margin: 0 }}><MdInfoOutline /><span>Esta factura la pagó {invoice.payer?.name || 'un tercero'} y no tiene paciente asignado: escribe abajo los datos de {patientLabel}.</span></div>}
        </div>
      ) : (
        <div className="stack" style={{ gap: 10 }}>
          <div className="invoice-search">
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); run() } }}
              placeholder={`Documento de ${patientLabel}, N° de factura (FV-…) o NIT de quien pagó`} aria-label="Buscar factura" />
            <button type="button" className="btn btn-primary" onClick={run} disabled={!q.trim() || state.loading}>{state.loading ? <Spinner /> : <MdSearch />} Buscar factura</button>
          </div>
          {state.error && <div className="alert bad" style={{ margin: 0 }}><MdErrorOutline /><span>{state.error}</span></div>}
          {state.results && state.results.length === 0 && !state.error && <div className="alert warn" style={{ margin: 0 }}><MdErrorOutline /><span>No hay facturas de {serviceLabel} con cupos para “{state.query}”. <Link to="/facturacion/servicios">Facturar en Servicios facturables</Link>.</span></div>}
          {state.results?.length > 1 && (
            <ul className="list">{state.results.map((x) => (
              <li key={x.id}><div className="grow"><strong>{x.numFactura} · {x.docNumber ? x.paciente : `Pagó ${x.payer?.name}`}</strong><span>{x.fecha?.split('-').reverse().join('/')} · {x.epsName || 'Particular'} · {cupos(x.remaining)}</span></div><button type="button" className="btn btn-outline btn-sm" onClick={() => select(x)}>Usar</button></li>
            ))}</ul>
          )}
          {error && <span className="error">{error}</span>}
        </div>
      )}
    </Card>
  )
}

export default InvoicePicker
