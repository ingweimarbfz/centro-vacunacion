import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { MdVisibility, MdAdd, MdErrorOutline, MdSearch, MdBlock, MdMedicalServices, MdReceipt, MdRemove } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { tipoDocumento } from '../../utils/dataGeneral'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { formatMoney } from '../../utils/format'
import './facturacion.css'

// Exenciones de copago y cuota moderadora (Acuerdo 260 de 2004 y leyes especiales).
const EXEMPTIONS = [['', 'Sin exención'], ['urgencias', 'Atención inicial de urgencias'], ['alto_costo', 'Enfermedad de alto costo'], ['ley1438', 'Niño, niña o adolescente exento (Ley 1438, art. 18)'], ['victima', 'Víctima del conflicto (Ley 1448)'], ['indigena', 'Población indígena'], ['otra', 'Otra exención legal']]

const fmt = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const STATUS = { por_facturar: ['Por facturar', 'warn'], no_aplica: ['Pagado en caja', 'ok'], pendiente: ['Pendiente cuenta de cobro', 'warn'], cobrada: ['En cuenta de cobro', 'navy'], pagada: ['Pagado por la EPS', 'ok'], anulada: ['Anulada', ''] }
const DOC_SHORT = { 'Cédula de ciudadanía': 'CC', 'Tarjeta de identidad': 'TI', 'Cédula de extranjería': 'CE', Pasaporte: 'PA', 'Registro civil': 'RC', NIT: 'NIT' }
const docLabel = (r) => (r.docNumber ? `${DOC_SHORT[r.docType] || r.docType || ''} ${r.docNumber}`.trim() : r.documento)
const KIND_SHORT = { aseguradora: 'aseguradora', clinica: 'clínica', hospital_publico: 'hospital público', ips: 'IPS', empresa_publica: 'entidad pública', empresa_privada: 'empresa', otra: 'institución' }
const discLabel = (d) => (d.type === 'porcentaje' ? `${d.value}%` : formatMoney(d.value))

// Ítems del tarifario del servicio: se eligen con cantidad; el valor sale del tarifario.
const ItemsPicker = ({ tariffs, value, onChange }) => {
  const qty = (id) => value.find((x) => x.tariffId === id)?.quantity || 0
  const setQty = (id, q) => onChange(q <= 0 ? value.filter((x) => x.tariffId !== id) : value.some((x) => x.tariffId === id) ? value.map((x) => (x.tariffId === id ? { ...x, quantity: q } : x)) : [...value, { tariffId: id, quantity: q }])
  if (!tariffs.length) return <div className="alert warn" style={{ margin: 0 }}><MdErrorOutline /><span>Este servicio no tiene ítems en el tarifario. Agrégalos en Facturación → Tarifario.</span></div>
  return (
    <div className="tariff-picker">{tariffs.map((t) => {
      const q = qty(t.id)
      return (
        <div key={t.id} className={`tariff-row${q ? ' on' : ''}`}>
          <label className="tariff-name"><input type="checkbox" checked={q > 0} onChange={(e) => setQty(t.id, e.target.checked ? 1 : 0)} /> <span>{t.name}{t.code && <small className="hint"> · {t.code}</small>}</span></label>
          <span className="tariff-price">{formatMoney(t.price)}</span>
          <div className="tariff-qty">
            <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Menos" onClick={() => setQty(t.id, q - 1)} disabled={!q}><MdRemove /></button>
            <span>{q}</span>
            <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Más" onClick={() => setQty(t.id, q + 1)}><MdAdd /></button>
          </div>
        </div>
      )
    })}</div>
  )
}

// Facturar: un servicio nuevo (charge = null) o uno que llegó "por facturar" desde su módulo (citología).
const InvoiceForm = ({ charge, catalog, eps, discounts, onClose, onSaved }) => {
  const services = charge ? catalog.filter((s) => s.id === charge.serviceId) : catalog
  const [f, setF] = useState(() => ({
    serviceId: String(charge?.serviceId || services[0]?.id || ''), date: charge?.fecha || today(), names: '', surnames: '', docType: 'Cédula de ciudadanía', docNumber: '',
    regimen: 'contributivo', affiliateType: 'cotizante', incomeRange: 'A', sharedType: 'cuota_moderadora', exemption: '',
    payerType: 'paciente', payerName: '', payerDocType: 'NIT', payerDocNumber: '', payerPhone: '', payerEmail: '',
    description: charge?.descripcion || '', reference: '', epsId: charge?.epsId ? String(charge.epsId) : '', discountId: '',
    paymentMode: (() => { const c = eps.find((x) => x.id === charge?.epsId && x.agreementActive); return c ? c.paymentMode : 'contado' })(),
    items: charge ? charge.items.filter((i) => i.tariffId).map((i) => ({ tariffId: i.tariffId, quantity: i.quantity })) : []
  }))
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const svc = services.find((s) => String(s.id) === String(f.serviceId))
  const tariffs = svc?.tariffs || []
  const conv = useMemo(() => eps.find((e) => String(e.id) === String(f.epsId) && e.agreementActive), [eps, f.epsId])
  const locked = conv?.discountEnabled && conv?.discount?.active ? conv.discount : null
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const pickEps = (e) => { const c = eps.find((x) => String(x.id) === e.target.value && x.agreementActive); setF({ ...f, epsId: e.target.value, paymentMode: c ? c.paymentMode : 'contado', discountId: '' }) }
  // Totales calculados en el servidor con la misma regla de la factura (IVA, pago compartido, retenciones).
  const [q, setQ] = useState(null)
  const epsPays = Boolean(conv) && (conv.kind || 'eps') === 'eps' && f.paymentMode === 'cuenta_cobro'
  const allPyp = f.items.length > 0 && f.items.every((i) => tariffs.find((t) => t.id === i.tariffId)?.isPyp)
  const quoteKey = JSON.stringify([f.items, f.epsId, f.paymentMode, f.discountId, f.regimen, f.affiliateType, f.incomeRange, f.sharedType, f.exemption, f.payerType, f.serviceId])
  useEffect(() => {
    if (!f.items.length) { setQ(null); return undefined }
    const t = setTimeout(() => {
      api.post('/facturacion/cotizar', { ...f, chargeId: charge?.id, epsId: Number(f.epsId) || null, discountId: locked ? undefined : Number(f.discountId) || undefined })
        .then(({ data }) => { setQ(data); setErr('') }).catch((e) => { setQ(null); setErr(errorMessage(e)) })
    }, 250)
    return () => clearTimeout(t)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quoteKey])
  const save = async () => {
    setErr('')
    if (!f.items.length) return setErr('Elige al menos un ítem del tarifario.')
    const units = f.items.reduce((a, i) => a + i.quantity, 0)
    if (!charge && f.payerType === 'paciente') {
      if (!f.names.trim()) return setErr('Escribe los nombres del paciente.')
      if (svc?.form && !f.docNumber.trim()) return setErr('Escribe el número de documento del paciente: con él se enlaza la factura al formulario.')
      if (svc?.form && units > 1) return setErr('Para facturar varios servicios en una sola factura, elige "Otra persona" o "Empresa" como quien paga.')
    }
    if (!charge && f.payerType !== 'paciente' && (!f.payerName.trim() || !f.payerDocNumber.trim())) return setErr(f.payerType === 'empresa' ? 'Escribe la razón social y el NIT de la empresa.' : 'Escribe el nombre y el documento de quien paga.')
    if (!charge && f.payerType !== 'paciente' && svc?.form && units > 1 && f.docNumber.trim()) return setErr('Con varios servicios deja el paciente en blanco: cada paciente se define al registrar su formulario.')
    setBusy(true)
    const body = { ...f, epsId: Number(f.epsId) || null, discountId: locked ? undefined : Number(f.discountId) || undefined }
    try { const { data } = charge ? await api.post(`/facturacion/servicios/${charge.id}/facturar`, body) : await api.post('/facturacion/servicios', body); onSaved(data) } catch (e) { setErr(errorMessage(e)); setBusy(false) }
  }
  return (
    <Modal title={charge ? `Facturar ${charge.serviceName.toLowerCase()}` : 'Registrar y facturar servicio'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={save} disabled={busy || !tariffs.length}>{busy ? <Spinner /> : <MdReceipt />} Generar factura</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        {charge ? (
          <div className="alert info" style={{ margin: 0 }}><MdMedicalServices /><span><b>{charge.paciente}</b> · {charge.documento} · {fmt(charge.fecha)}{charge.reference ? ` · ${charge.reference}` : ''}{charge.siteName ? ` · ${charge.siteName}` : ''}</span></div>
        ) : (
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field"><label>Servicio <span className="req">*</span></label>
              <select value={f.serviceId} onChange={(e) => setF({ ...f, serviceId: e.target.value, items: [] })}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
              {svc?.form && <span className="hint">Después se registra en {svc.form.label} con el documento del paciente.</span>}
            </div>
            <div className="field"><label>Fecha del servicio <span className="req">*</span></label><input type="date" value={f.date} max={today()} onChange={set('date')} /></div>
          </div>
        )}
        {!charge && (
          <div className="field"><label>Facturar a</label>
            <div className="module-switch" role="radiogroup" aria-label="Facturar a" style={{ width: '100%' }}>
              {[['paciente', 'El paciente'], ['tercero', 'Otra persona'], ['empresa', 'Empresa']].map(([k, l]) => (
                <button key={k} type="button" style={{ flex: 1 }} className={f.payerType === k ? 'on' : ''} aria-pressed={f.payerType === k} onClick={() => setF({ ...f, payerType: k, payerDocType: k === 'empresa' ? 'NIT' : 'Cédula de ciudadanía' })}>{l}</button>
              ))}
            </div>
          </div>
        )}
        {!charge && f.payerType !== 'paciente' && (
          <div className="grid grid-2" style={{ gap: 12 }}>
            <div className="field"><label>{f.payerType === 'empresa' ? 'Razón social' : 'Nombre de quien paga'} <span className="req">*</span></label><input value={f.payerName} onChange={set('payerName')} /></div>
            <div className="field"><label>{f.payerType === 'empresa' ? 'NIT' : 'Documento'} <span className="req">*</span></label>
              <div style={{ display: 'flex', gap: 6 }}>
                {f.payerType !== 'empresa' && <select value={f.payerDocType} onChange={set('payerDocType')} style={{ width: 110 }}>{tipoDocumento.map((t) => <option key={t.tipoDoc} value={t.tipoDoc}>{t.tipoDoc}</option>)}</select>}
                <input value={f.payerDocNumber} onChange={set('payerDocNumber')} style={{ flex: 1, minWidth: 0 }} />
              </div>
            </div>
            <div className="field"><label>Teléfono</label><input value={f.payerPhone} onChange={set('payerPhone')} inputMode="tel" /></div>
            <div className="field"><label>Correo</label><input type="email" value={f.payerEmail} onChange={set('payerEmail')} /></div>
          </div>
        )}
        {!charge && (
          <div className="field"><label>{f.payerType === 'paciente' ? 'Paciente' : 'Paciente que recibe el servicio (opcional)'}</label>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <select value={f.docType} onChange={set('docType')} aria-label="Tipo de documento">{tipoDocumento.map((t) => <option key={t.tipoDoc} value={t.tipoDoc}>{t.tipoDoc}</option>)}</select>
              <input value={f.docNumber} onChange={set('docNumber')} inputMode="numeric" placeholder={`N° documento${f.payerType === 'paciente' && svc?.form ? ' *' : ''}`} aria-label="Número de documento" />
              <input value={f.names} onChange={set('names')} placeholder={`Nombres${f.payerType === 'paciente' ? ' *' : ''}`} aria-label="Nombres" />
              <input value={f.surnames} onChange={set('surnames')} placeholder="Apellidos" aria-label="Apellidos" />
            </div>
            {f.payerType !== 'paciente' && svc?.form && <span className="hint">Si lo dejas en blanco, la factura queda con {f.items.reduce((a, i) => a + i.quantity, 0) || 'N'} cupo(s): cada paciente se define al llenar {svc.form.label}, buscando por el N° de factura o el documento de quien paga.</span>}
          </div>
        )}
        <div className="field"><label>Ítems del tarifario <span className="req">*</span></label><ItemsPicker tariffs={tariffs} value={f.items} onChange={(items) => setF({ ...f, items })} /></div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>EPS o entidad con convenio</label>
            <select value={f.epsId} onChange={pickEps}><option value="">Particular / sin EPS ni convenio</option>{eps.map((e) => <option key={e.id} value={e.id}>{e.kind && e.kind !== 'eps' ? `${e.name} (${KIND_SHORT[e.kind] || e.kind})` : e.name}{e.agreementActive ? ' · convenio' : ''}</option>)}</select>
            {f.epsId && <span className="hint">{conv ? `Convenio${conv.agreementNumber ? ` N° ${conv.agreementNumber}` : ''}` : 'Sin convenio vigente: se paga en caja'}</span>}
          </div>
          <div className="field"><label>Forma de pago</label>
            <select value={f.paymentMode} onChange={set('paymentMode')} disabled={!conv}><option value="contado">Pago inmediato en caja</option><option value="cuenta_cobro">Cuenta de cobro a la entidad</option></select>
          </div>
          <div className="field"><label>Descuento</label>
            <select value={locked ? String(locked.id) : f.discountId} onChange={set('discountId')} disabled={Boolean(locked)}>
              <option value="">Sin descuento</option>
              {(locked ? [locked] : discounts).map((x) => <option key={x.id} value={x.id}>{x.name} · {discLabel(x)}</option>)}
            </select>
            {locked && <span className="hint">Descuento del convenio con {conv.name}; no se puede aplicar otro.</span>}
          </div>
          {epsPays && (<>
            <div className="field"><label>Régimen del afiliado</label><select value={f.regimen} onChange={set('regimen')}><option value="contributivo">Contributivo</option><option value="subsidiado">Subsidiado</option></select></div>
            {f.regimen === 'contributivo' && <div className="field"><label>Tipo de afiliado</label><select value={f.affiliateType} onChange={(e) => setF({ ...f, affiliateType: e.target.value, sharedType: 'cuota_moderadora' })}><option value="cotizante">Cotizante</option><option value="beneficiario">Beneficiario</option></select></div>}
            {f.regimen === 'contributivo' && <div className="field"><label>Rango salarial (IBC del cotizante)</label><select value={f.incomeRange} onChange={set('incomeRange')}><option value="A">A · menos de 2 SMMLV</option><option value="B">B · de 2 a 5 SMMLV</option><option value="C">C · más de 5 SMMLV</option></select></div>}
            {f.regimen === 'contributivo' && f.affiliateType === 'beneficiario' && <div className="field"><label>Pago compartido</label><select value={f.sharedType} onChange={set('sharedType')}><option value="cuota_moderadora">Cuota moderadora (consulta, laboratorio ambulatorio)</option><option value="copago">Copago (procedimientos y demás servicios)</option></select></div>}
            <div className="field"><label>Exención de pagos compartidos</label>
              <select value={allPyp ? 'pyp' : f.exemption} onChange={set('exemption')} disabled={allPyp}>{allPyp ? <option value="pyp">Promoción y prevención (Res. 3280 de 2018)</option> : EXEMPTIONS.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              {allPyp && <span className="hint">Servicio de promoción y prevención: sin copago ni cuota moderadora.</span>}
            </div>
          </>)}
          {!charge && <div className="field"><label>Detalle u observación</label><input value={f.description} onChange={set('description')} placeholder="Opcional" /></div>}
        </div>
        {q && (
          <div className="invoice-total">
            <div><span>Subtotal</span><b>{formatMoney(q.subtotal)}</b></div>
            {q.discount > 0 && <div><span>Descuento {q.discountName}</span><b>− {formatMoney(q.discount)}</b></div>}
            <div><span>IVA</span><b>{q.iva ? formatMoney(q.iva) : 'Excluido (servicios de salud)'}</b></div>
            <div><span>Total de la factura</span><b>{formatMoney(q.total)}</b></div>
            {q.isEps && <div><span>{q.shared.type === 'copago' ? 'Copago' : q.shared.type === 'cuota_moderadora' ? 'Cuota moderadora' : 'Pago compartido'} · lo paga el afiliado en caja</span><b>{q.shared.amount ? formatMoney(q.shared.amount) : q.shared.exemptReason ? `Exento · ${q.shared.exemptReason}` : '$ 0'}</b></div>}
            <div className="grand"><span>{q.epsPays ? 'A cobrar a la entidad' : 'A pagar'}</span><b>{formatMoney(q.payable)}</b></div>
            {(q.retefuente > 0 || q.reteica > 0 || q.stamps > 0) && <div className="hint" style={{ display: 'block' }}>Deducciones que aplicará quien paga (estimadas): retención en la fuente {formatMoney(q.retefuente)}{q.reteica ? ` · ReteICA ${formatMoney(q.reteica)}` : ''}{q.stamps ? ` · ${q.stampsLabel} ${formatMoney(q.stamps)}` : ''}. Neto a recibir {formatMoney(q.netExpected)}.</div>}
          </div>
        )}
        {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
      </div>
    </Modal>
  )
}

const VoidForm = ({ charge, onClose, onSaved }) => {
  const [reason, setReason] = useState(''); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const save = async () => { setBusy(true); try { await api.post(`/facturacion/servicios/${charge.id}/anular`, { reason }); onSaved() } catch (e) { setErr(errorMessage(e)); setBusy(false) } }
  return (
    <Modal title={`Anular factura ${charge.numFactura}`} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-danger" onClick={save} disabled={busy || !reason.trim()}>{busy ? <Spinner /> : <MdBlock />} Anular</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        <p style={{ margin: 0 }}>La factura queda registrada como anulada (el consecutivo no se reutiliza).</p>
        <div className="field"><label>Motivo <span className="req">*</span></label><input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></div>
        {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
      </div>
    </Modal>
  )
}

// Facturación → Servicios facturables: aquí se factura todo servicio de la IPS (también las citologías).
const ServicesBillingPage = () => {
  const { user } = useAuth()
  const [toast, toastNode] = useToast()
  const navigate = useNavigate()
  const [tab, setTab] = useState('facturados')
  const [rows, setRows] = useState(null); const [pending, setPending] = useState([])
  const [catalog, setCatalog] = useState([]); const [eps, setEps] = useState([]); const [discounts, setDiscounts] = useState([])
  const [f, setF] = useState({ desde: `${today().slice(0, 8)}01`, hasta: today(), servicio: '' })
  const [modal, setModal] = useState(null)
  const load = useCallback(() => Promise.all([
    api.get('/facturacion/servicios', { params: f }).then(({ data }) => setRows(data.filter((r) => r.billingStatus !== 'por_facturar'))),
    api.get('/facturacion/servicios', { params: { estado: 'por_facturar' } }).then(({ data }) => setPending(data))
  ]).catch((e) => toast(errorMessage(e), 'bad')), [f, toast])
  useEffect(() => {
    load()
    api.get('/facturacion/catalogo').then(({ data }) => setCatalog(data)).catch(() => {})
    api.get('/eps').then(({ data }) => setEps(data.filter((x) => x.active))).catch(() => {})
    api.get('/descuentos', { params: { activos: 1 } }).then(({ data }) => setDiscounts(data)).catch(() => {})
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  const done = (msg) => () => { setModal(null); toast(msg); load() }
  const live = (rows || []).filter((r) => r.billingStatus !== 'anulada')
  const totals = live.reduce((a, r) => { a.total += r.valor; if (r.paymentMode === 'cuenta_cobro') a.eps += r.valor; else a.caja += r.valor; return a }, { total: 0, eps: 0, caja: 0 })
  const Items = ({ r }) => (r.items.length ? <div className="hint">{r.items.map((i) => `${i.quantity > 1 ? `${i.quantity} × ` : ''}${i.name}`).join(' · ')}</div> : null)
  return (
    <>
      <PageHead title="Servicios facturables" subtitle="Toda factura de la IPS se genera aquí, con los valores del tarifario. Los servicios con formulario (como la citología) se facturan primero y luego se registran con el documento del paciente">
        <button type="button" className="btn btn-primary" onClick={() => setModal({ invoice: null })} disabled={!catalog.length}><MdAdd /> Facturar servicio</button>
      </PageHead>
      {pending.length > 0 && (
        <div className="module-switch" style={{ marginBottom: 14 }} role="tablist">
          <button type="button" className={tab === 'facturados' ? 'on' : ''} onClick={() => setTab('facturados')}>Facturados</button>
          <button type="button" className={tab === 'por_facturar' ? 'on' : ''} onClick={() => setTab('por_facturar')}>Registrados sin factura <span className="badge warn">{pending.length}</span></button>
        </div>
      )}
      {tab === 'por_facturar' && pending.length > 0 ? (
        <Card flush title="Servicios por facturar" subtitle="Registros hechos sin factura previa. Al facturarlos se aplica el convenio y se genera la factura FV">
          {pending.length === 0 ? <Empty icon={<MdReceipt />}>No hay servicios por facturar.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Fecha</th><th>Servicio</th><th>Paciente</th><th>EPS / entidad</th><th className="num">Valor tarifa</th><th className="actions" /></tr></thead>
              <tbody>{pending.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.fecha)}{r.siteName && <div className="hint">{r.siteName}</div>}</td>
                  <td><strong style={{ color: 'var(--ink)' }}>{r.serviceName}</strong>{r.reference && <div className="hint">{r.reference}</div>}<Items r={r} /></td>
                  <td style={{ minWidth: 150 }}>{r.paciente}<div className="hint">{docLabel(r)}</div></td>
                  <td>{r.epsName || <span className="hint">Particular</span>}</td>
                  <td className="num"><strong>{formatMoney(r.valorBase)}</strong></td>
                  <td className="actions"><button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ invoice: r })}><MdReceipt /> Facturar</button></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      ) : (
        <Card flush title={rows ? `${live.length} factura${live.length === 1 ? '' : 's'} · ${formatMoney(totals.total)}` : 'Facturas'} subtitle={rows ? `En caja ${formatMoney(totals.caja)} · a EPS ${formatMoney(totals.eps)}` : ''}
          actions={<form className="bill-filter" onSubmit={(e) => { e.preventDefault(); load() }}>
            <select className="input" value={f.servicio} onChange={(e) => setF({ ...f, servicio: e.target.value })} aria-label="Servicio"><option value="">Todos los servicios</option>{catalog.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
            <input type="date" className="input" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} aria-label="Desde" />
            <input type="date" className="input" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} aria-label="Hasta" />
            <button type="submit" className="btn btn-outline btn-sm"><MdSearch /> Filtrar</button>
          </form>}>
          {!rows ? <div className="splash" style={{ minHeight: 100 }}><Spinner /></div> : rows.length === 0 ? <Empty icon={<MdMedicalServices />}>No hay facturas en el periodo.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Factura</th><th>Servicio</th><th>Paciente</th><th>EPS / entidad</th><th className="num">Valor</th><th>Estado</th><th className="actions" /></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id} style={r.billingStatus === 'anulada' ? { opacity: 0.55 } : undefined}>
                  <td><strong style={{ color: 'var(--ink)', whiteSpace: 'nowrap' }}>{r.numFactura || '—'}</strong><div className="hint">{fmt(r.fecha)}</div>{r.siteName && <div className="hint">{r.siteName}</div>}</td>
                  <td><strong style={{ color: 'var(--ink)' }}>{r.serviceName}</strong><Items r={r} /></td>
                  <td style={{ minWidth: 150 }}>{r.paciente}<div className="hint">{docLabel(r)}</div>{r.payer?.type && r.payer.type !== 'paciente' && <div className="hint">Paga: {r.payer.name}{r.payer.docNumber ? ` (${r.payer.type === 'empresa' ? 'NIT ' : ''}${r.payer.docNumber})` : ''}</div>}</td>
                  <td>{r.epsName || <span className="hint">Particular</span>}</td>
                  <td className="num"><strong>{formatMoney(r.valor)}</strong>{r.descuento > 0 && <div className="hint">{r.descuentoNombre} −{formatMoney(r.descuento)}</div>}{r.shared?.amount > 0 && <div className="hint">{r.shared.type === 'copago' ? 'Copago' : 'Cuota moderadora'} {formatMoney(r.shared.amount)}</div>}{r.iva > 0 && <div className="hint">IVA {formatMoney(r.iva)}</div>}</td>
                  <td><span className={`badge ${STATUS[r.billingStatus]?.[1] || ''}`}>{STATUS[r.billingStatus]?.[0] || r.billingStatus}</span>{r.voidReason && <div className="hint">{r.voidReason}</div>}
                    {r.form && r.billingStatus !== 'anulada' && <div style={{ marginTop: 4 }}>{r.form.units > 1 ? <span className={r.form.linked ? 'hint' : 'badge warn'}>{r.form.used} de {r.form.units} registrados</span> : r.form.linked ? <span className="hint">Registrado{r.reference ? ` · ${r.reference}` : ''}</span> : <span className="badge warn">Falta el registro</span>}</div>}</td>
                  <td className="actions" style={{ whiteSpace: 'nowrap' }}><button type="button" className="btn btn-ghost btn-icon" title="Ver, imprimir o enviar la factura" aria-label="Ver factura" onClick={() => navigate(`/facturacion/factura/${r.id}`)}><MdVisibility /></button>{r.form && !r.form.linked && r.billingStatus !== 'anulada' && <button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`${r.form.path}?factura=${r.id}&q=${encodeURIComponent(r.docNumber || r.numFactura || '')}`)}>{r.form.label}</button>}{user.role === 'administrador' && ['no_aplica', 'pendiente'].includes(r.billingStatus) && <button type="button" className="btn btn-ghost btn-icon" title="Anular factura" aria-label="Anular factura" style={{ color: 'var(--bad)' }} onClick={() => setModal({ void: r })}><MdBlock /></button>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      )}
      {modal && 'invoice' in modal && <InvoiceForm charge={modal.invoice} catalog={catalog} eps={eps} discounts={discounts} onClose={() => setModal(null)} onSaved={(data) => { setModal(null); load(); toast(data?.form && !data.form.linked ? `Factura ${data.numFactura} generada. Ahora llena ${data.form.label} buscando ${data.docNumber ? `el documento ${data.docNumber}` : `la factura ${data.numFactura}`}` : `Factura ${data?.numFactura || ''} generada`) }} />}
      {modal?.void && <VoidForm charge={modal.void} onClose={() => setModal(null)} onSaved={done('Factura anulada')} />}
      {toastNode}
    </>
  )
}

export default ServicesBillingPage
