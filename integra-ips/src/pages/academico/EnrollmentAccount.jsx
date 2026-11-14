import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { MdAdd, MdErrorOutline, MdReceiptLong, MdBlock, MdGavel, MdRequestQuote } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Modal, Spinner, useToast } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { PAY_METHODS, AccountBadge, ContractBadge } from './common'

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())

const PaymentForm = ({ enrollment, onClose, onSaved }) => {
  const acc = enrollment.account
  const [f, setF] = useState({ amount: acc.nextDue ? acc.nextDue.balance : acc.balance, paidAt: today(), method: 'efectivo', reference: '', notes: '' })
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!(Number(f.amount) > 0)) return setError('Escribe el valor del pago.')
    if (Number(f.amount) > acc.balance) return setError(`El pago supera el saldo (${formatMoney(acc.balance)}).`)
    setSaving(true)
    try { const { data } = await api.post(`/academico/matriculas/${enrollment.id}/pagos`, f); onSaved(data) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title="Registrar pago" size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="pay-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <MdReceiptLong />} Registrar y generar recibo</button></>}>
      <form id="pay-form" onSubmit={submit} noValidate className="stack" style={{ gap: 12 }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>Saldo pendiente: <b>{formatMoney(acc.balance)}</b>{acc.nextDue && <> · próxima cuota {acc.nextDue.number} por {formatMoney(acc.nextDue.balance)}</>}</div>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="field"><label>Valor <span className="req">*</span></label><input type="number" min="1" step="100" value={f.amount} onChange={set('amount')} autoFocus /></div>
          <div className="field"><label>Fecha del pago</label><input type="date" max={today()} value={f.paidAt} onChange={set('paidAt')} /></div>
          <div className="field"><label>Medio de pago</label><select value={f.method} onChange={set('method')}>{Object.entries(PAY_METHODS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Referencia</label><input value={f.reference} onChange={set('reference')} placeholder="N.º de transacción o consignación" /></div>
          <div className="field span-all"><label>Observaciones</label><input value={f.notes} onChange={set('notes')} /></div>
        </div>
        <span className="hint">El pago se aplica a las cuotas en orden de vencimiento.</span>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

const VoidForm = ({ payment, onClose, onSaved }) => {
  const [reason, setReason] = useState(''); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!reason.trim()) return setError('Escribe el motivo de la anulación.')
    setSaving(true)
    try { const { data } = await api.post(`/academico/pagos/${payment.id}/anular`, { reason }); onSaved(data) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={`Anular recibo N.º ${payment.receiptNumber}`} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-danger" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdBlock />} Anular</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13.5 }}>El recibo de {formatMoney(payment.amount)} queda anulado (no se borra) y su valor vuelve al saldo de la matrícula.</p>
        <div className="field"><label>Motivo</label><input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus placeholder="Ej. Pago duplicado, error de digitación" /></div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

// Cuenta de una matrícula: plan de cuotas con su estado, pagos con recibo y anulaciones.
// readOnly: vista del estudiante (sin registrar ni anular).
const VoidInvoiceForm = ({ enrollment: e, onClose, onSaved }) => {
  const [reason, setReason] = useState(''); const [tipo, setTipo] = useState('ambas'); const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async () => {
    if (!reason.trim()) return setError('Escribe el motivo de la anulación.')
    setSaving(true)
    try { const { data } = await api.post(`/academico/matriculas/${e.id}/anular-factura`, { reason, tipo: tipo === 'ambas' ? undefined : tipo }); onSaved(data) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title="Anular factura" size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-danger" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdBlock />} Anular</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13.5 }}>La factura queda anulada (su número no se reutiliza). Después puedes corregir la matrícula y facturarla de nuevo.</p>
        {e.invoice.number && e.invoice.agreementNumber && <div className="field"><label>Qué factura</label><select value={tipo} onChange={(x) => setTipo(x.target.value)}><option value="ambas">Las dos</option><option value="estudiante">Solo la del estudiante ({e.invoice.number})</option><option value="convenio">Solo la del convenio ({e.invoice.agreementNumber})</option></select></div>}
        <div className="field"><label>Motivo</label><input value={reason} onChange={(x) => setReason(x.target.value)} autoFocus placeholder="Ej. Cambio de descuento, error en el valor" /></div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

export const AccountView = ({ enrollment: e, onChange, readOnly = false, receiptBase = '/educacion/recibos', invoiceBase = '/educacion/facturas' }) => {
  const { user } = useAuth()
  const admin = user?.role === 'administrador'
  const [toast, toastNode] = useToast()
  const [modal, setModal] = useState(null)
  const acc = e.account
  return (
    <div className="stack" style={{ gap: 14 }}>
      <div className="grid grid-kpi">
        <div className="card kpi"><span className="kpi-label">Valor a cargo del estudiante</span><div className="kpi-value" style={{ fontSize: 22 }}>{formatMoney(acc.total)}</div><div className="kpi-foot">{e.installments > 1 ? `${e.installments} cuotas` : 'Contado'}</div></div>
        <div className="card kpi"><span className="kpi-label">Pagado</span><div className="kpi-value" style={{ fontSize: 22, color: 'var(--ok)' }}>{formatMoney(acc.paid)}</div><div className="kpi-foot">{acc.payments.filter((p) => !p.voided).length} recibos</div></div>
        <div className="card kpi"><span className="kpi-label">Saldo</span><div className="kpi-value" style={{ fontSize: 22 }}>{formatMoney(acc.balance)}</div><div className="kpi-foot"><AccountBadge state={acc.state} />{acc.overdue > 0 && <span>{formatMoney(acc.overdue)} vencido</span>}</div></div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {e.invoice?.number && <Link className="btn btn-outline btn-sm" to={`${invoiceBase}/${e.id}`}><MdRequestQuote /> Factura {e.invoice.number}</Link>}
        {!readOnly && e.invoice?.agreementNumber && <Link className="btn btn-outline btn-sm" to={`${invoiceBase}/${e.id}?tipo=convenio`}><MdRequestQuote /> Factura convenio {e.invoice.agreementNumber}</Link>}
        {!readOnly && !e.invoice?.number && !e.invoice?.agreementNumber && ['matriculado', 'finalizado', 'aplazado'].includes(e.status) && (acc.total > 0 || e.agreementValue > 0) && <button type="button" className="btn btn-outline btn-sm" onClick={async () => { try { const { data } = await api.post(`/academico/matriculas/${e.id}/facturar`); onChange?.(data); toast('Matrícula facturada') } catch (err) { toast(errorMessage(err), 'bad') } }}><MdRequestQuote /> Facturar</button>}
        {!readOnly && admin && (e.invoice?.number || e.invoice?.agreementNumber) && <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} onClick={() => setModal({ voidInvoice: true })}><MdBlock /> Anular factura</button>}
        {!readOnly && !e.invoice?.number && e.status === 'preinscrito' && <span className="hint">Se factura al pasar a matriculado.</span>}
      </div>
      {!readOnly && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ pay: true })} disabled={acc.balance <= 0}><MdAdd /> Registrar pago</button>
          <Link className="btn btn-outline btn-sm" to={`/educacion/contratos/${e.id}`}><MdGavel /> {e.contract.signedAt ? 'Ver contrato firmado' : 'Contrato de matrícula'}</Link>
          <ContractBadge contract={e.contract} />
        </div>
      )}
      <div className="table-wrap">
        <table className="table">
          <thead><tr><th>Cuota</th><th>Vence</th><th className="num">Valor</th><th className="num">Abonado</th><th className="num">Saldo</th><th>Estado</th></tr></thead>
          <tbody>{acc.plan.map((q) => (
            <tr key={q.id}><td>{q.number}</td><td>{formatDate(q.dueDate)}</td><td className="num">{formatMoney(q.amount)}</td><td className="num">{formatMoney(q.paid)}</td><td className="num">{formatMoney(q.balance)}</td><td><AccountBadge state={q.status} label={q.status === 'vencida' ? `Vencida · ${q.daysLate} d` : undefined} /></td></tr>
          ))}</tbody>
        </table>
      </div>
      <div>
        <b style={{ fontSize: 14 }}>Pagos</b>
        {acc.payments.length === 0 ? <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: 13.5 }}>Aún no hay pagos.</p> : (
          <div className="table-wrap" style={{ marginTop: 6 }}>
            <table className="table">
              <thead><tr><th>Recibo</th><th>Fecha</th><th>Medio</th><th className="num">Valor</th><th>Estado</th><th className="actions" /></tr></thead>
              <tbody>{acc.payments.map((p) => (
                <tr key={p.id} style={p.voided ? { opacity: 0.6 } : undefined}>
                  <td><b>N.º {p.receiptNumber}</b></td><td>{formatDate(p.paidAt)}</td>
                  <td>{p.methodLabel}{p.reference && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.reference}</div>}</td>
                  <td className="num" style={p.voided ? { textDecoration: 'line-through' } : undefined}>{formatMoney(p.amount)}</td>
                  <td>{p.voided ? <span className="badge bad" title={p.voidedReason}>Anulado</span> : <span className="badge ok">Vigente</span>}</td>
                  <td className="actions">
                    <Link className="btn btn-ghost btn-icon" aria-label="Ver recibo" title="Ver e imprimir recibo" to={`${receiptBase}/${p.id}`}><MdReceiptLong /></Link>
                    {!readOnly && admin && !p.voided && <button type="button" className="btn btn-ghost btn-icon" aria-label="Anular recibo" title="Anular recibo" style={{ color: 'var(--bad)' }} onClick={() => setModal({ void: p })}><MdBlock /></button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
      {modal?.pay && <PaymentForm enrollment={e} onClose={() => setModal(null)} onSaved={(d) => { setModal(null); onChange?.(d.enrollment); toast(`Pago registrado · recibo N.º ${d.receiptNumber}`) }} />}
      {modal?.voidInvoice && <VoidInvoiceForm enrollment={e} onClose={() => setModal(null)} onSaved={(d) => { setModal(null); onChange?.(d); toast('Factura anulada') }} />}
      {modal?.void && <VoidForm payment={modal.void} onClose={() => setModal(null)} onSaved={(d) => { setModal(null); onChange?.(d); toast('Recibo anulado') }} />}
      {toastNode}
    </div>
  )
}

// Modal con la cuenta de la matrícula (desde la ficha del estudiante o la cartera).
export const AccountModal = ({ enrollment, onClose, onChange }) => {
  const [e, setE] = useState(enrollment)
  return (
    <Modal title={`Cuenta · ${e.program?.name}${e.period ? ` · ${e.period.name}` : ''}`} size="lg" onClose={onClose}
      footer={<button type="button" className="btn btn-outline" onClick={onClose}>Cerrar</button>}>
      <AccountView enrollment={e} onChange={(d) => { setE(d); onChange?.(d) }} />
    </Modal>
  )
}
