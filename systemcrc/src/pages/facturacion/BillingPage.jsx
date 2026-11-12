import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import { MdReceiptLong, MdErrorOutline, MdPrint, MdCheckCircle, MdBlock, MdSearch, MdHourglassTop, MdPayments, MdWarning, MdTimer, MdHandshake, MdPercent } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { formatMoney } from '../../utils/format'
import '../../components/cytology.css'
import './facturacion.css'

const fmt = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const STATUS = { emitida: ['Emitida', 'warn'], pagada: ['Pagada', 'ok'], anulada: ['Anulada', ''] }

const short = (n) => (n >= 1e6 ? `$${(n / 1e6).toFixed(1)} M` : n >= 1e3 ? `$${Math.round(n / 1e3)} mil` : `$${n}`)
const plural = (n, s, p) => `${n} ${n === 1 ? s : p}`
const Kpi = ({ label, value, foot, icon, tone = '' }) => (
  <div className="card kpi"><div className="kpi-top"><span className="kpi-label">{label}</span><span className={`kpi-icon ${tone}`}>{icon}</span></div><div className="kpi-value" style={{ fontSize: 24 }}>{value}</div>{foot && <div className="kpi-foot">{foot}</div>}</div>
)

// Dashboard: cartera con las EPS, recaudo, antigüedad y comportamiento mensual.
const BillingDashboard = () => {
  const [year, setYear] = useState(today().slice(0, 4))
  const [d, setD] = useState(null)
  useEffect(() => { api.get('/facturacion/resumen', { params: { anio: year } }).then(({ data }) => setD(data)).catch(() => setD(null)) }, [year])
  if (!d) return <div className="splash" style={{ minHeight: 140 }}><Spinner /></div>
  const k = d.kpis
  const years = Array.from({ length: 4 }, (_, i) => String(Number(today().slice(0, 4)) - i))
  const mixColors = ['#1F2A44', '#94A3B8']
  return (
    <div className="stack" style={{ marginBottom: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
        <span className="hint">Todos los servicios de la IPS: citologías, laboratorio, vacunación, traslados y los que se registren en Servicios facturables</span>
        <select className="input" style={{ width: 110 }} value={year} onChange={(e) => setYear(e.target.value)} aria-label="Año">{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
      </div>
      <div className="grid bill-kpis">
        <Kpi label="Pendiente por facturar" value={formatMoney(k.pendienteValor)} foot={`${plural(k.pendienteCount, 'servicio', 'servicios')} sin cuenta de cobro`} icon={<MdHourglassTop />} tone="warn" />
        <Kpi label="Cuentas por cobrar" value={formatMoney(k.emitidoValor)} foot={`${plural(k.emitidoCount, 'cuenta emitida', 'cuentas emitidas')} sin pagar`} icon={<MdReceiptLong />} tone="navy" />
        <Kpi label={`Recaudado ${d.year}`} value={formatMoney(k.pagadoValor)} foot={plural(k.pagadoCount, 'cuenta pagada', 'cuentas pagadas')} icon={<MdPayments />} tone="ok" />
        <Kpi label="Cartera vencida (> 30 días)" value={formatMoney(k.vencidoValor)} foot={plural(k.vencidoCount, 'cuenta', 'cuentas')} icon={<MdWarning />} tone={k.vencidoCount ? 'warn' : 'ok'} />
        <Kpi label="Recaudo" value={k.recaudo == null ? '—' : `${k.recaudo}%`} foot={k.promedioDiasPago == null ? 'Sin pagos registrados' : `Pagan en ${k.promedioDiasPago} días en promedio`} icon={<MdPercent />} />
        <Kpi label="Convenios vigentes" value={k.conveniosVigentes} foot={`Descuentos otorgados ${formatMoney(k.descuentosConvenio)}`} icon={<MdHandshake />} />
      </div>
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Card title="Cartera por entidad" subtitle="Pendiente por facturar, por cobrar y recaudado">
          {d.byEps.length === 0 ? <Empty icon={<MdReceiptLong />}>Sin servicios con cuenta de cobro en {d.year}.</Empty> : (
            <div style={{ width: '100%', height: Math.max(220, d.byEps.length * 48) }}><ResponsiveContainer>
              <BarChart data={d.byEps} layout="vertical" margin={{ left: 0, right: 16 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                <XAxis type="number" tickFormatter={short} tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="name" width={104} tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="pendiente" name="Pendiente" stackId="a" fill="#F59E0B" isAnimationActive={false} />
                <Bar dataKey="cobrado" name="Por cobrar" stackId="a" fill="#1F2A44" isAnimationActive={false} />
                <Bar dataKey="pagado" name="Recaudado" stackId="a" fill="#16A34A" isAnimationActive={false} />
              </BarChart>
            </ResponsiveContainer></div>
          )}
        </Card>
        <div className="stack">
          <Card title="Antigüedad de las cuentas por cobrar">
            <div style={{ width: '100%', height: 190 }}><ResponsiveContainer>
              <BarChart data={d.aging} margin={{ left: 0, right: 10 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tickFormatter={short} tick={{ fontSize: 11 }} width={60} />
                <Tooltip formatter={(v) => formatMoney(v)} />
                <Bar dataKey="valor" name="Valor" radius={[4, 4, 0, 0]} isAnimationActive={false}>{d.aging.map((a, i) => <Cell key={a.name} fill={['#16A34A', '#F59E0B', '#EA580C', '#DC2626'][i]} />)}</Bar>
              </BarChart>
            </ResponsiveContainer></div>
          </Card>
          <Card title="Forma de pago de los servicios" subtitle={`Año ${d.year}`}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ width: 140, height: 140 }}><ResponsiveContainer>
                <PieChart><Pie data={d.mix} dataKey="servicios" nameKey="name" innerRadius={38} outerRadius={62} isAnimationActive={false}>{d.mix.map((m, i) => <Cell key={m.name} fill={mixColors[i]} />)}</Pie><Tooltip /></PieChart>
              </ResponsiveContainer></div>
              <div style={{ flex: 1, minWidth: 160, display: 'flex', flexDirection: 'column', gap: 8 }}>{d.mix.map((m, i) => (
                <div key={m.name} style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span style={{ width: 10, height: 10, borderRadius: 3, background: mixColors[i], flex: '0 0 auto' }} /><div><strong style={{ color: 'var(--ink)', fontSize: 13 }}>{m.name}</strong><div className="hint">{m.servicios} servicios · {formatMoney(m.valor)}</div></div></div>
              ))}</div>
            </div>
          </Card>
        </div>
      </div>
      <Card title="Facturación por servicio" subtitle={`Valor de los servicios prestados en ${d.year}, en caja y en cuenta de cobro a entidades`}>
        {!d.byService?.length ? <Empty icon={<MdReceiptLong />}>Aún no hay servicios registrados en {d.year}.</Empty> : (
          <div style={{ width: '100%', height: Math.max(180, d.byService.length * 46) }}><ResponsiveContainer>
            <BarChart data={d.byService} layout="vertical" margin={{ left: 0, right: 16 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tickFormatter={short} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 11 }} />
              <Tooltip formatter={(v) => formatMoney(v)} /><Legend wrapperStyle={{ fontSize: 12 }} />
              <Bar dataKey="cuentaCobro" name="Cuenta de cobro a entidades" stackId="s" fill="#1F2A44" isAnimationActive={false} />
              <Bar dataKey="caja" name="Pagado en caja" stackId="s" fill="#94A3B8" isAnimationActive={false} />
            </BarChart>
          </ResponsiveContainer></div>
        )}
      </Card>
      <Card title="Comportamiento mensual" subtitle="Valor generado a entidades con convenio, pagado en caja y recaudado">
        <div style={{ width: '100%', height: 240 }}><ResponsiveContainer>
          <BarChart data={d.byMonth} margin={{ left: 0, right: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="mes" tick={{ fontSize: 11 }} /><YAxis tickFormatter={short} tick={{ fontSize: 11 }} width={60} />
            <Tooltip formatter={(v) => formatMoney(v)} /><Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="generado" name="Cuenta de cobro a entidades" fill="#1F2A44" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="caja" name="Pagado en caja" fill="#94A3B8" radius={[4, 4, 0, 0]} isAnimationActive={false} />
            <Bar dataKey="recaudado" name="Recaudado de entidades" fill="#16A34A" radius={[4, 4, 0, 0]} isAnimationActive={false} />
          </BarChart>
        </ResponsiveContainer></div>
      </Card>
      {d.overdue.length > 0 && (
        <div className="alert warn" style={{ margin: 0 }}><MdTimer /><span><b>Cuentas con más de 30 días sin pago:</b> {d.overdue.map((o) => `${o.code} (${o.eps}, ${o.dias} días, ${formatMoney(o.total)})`).join(' · ')}</span></div>
      )}
    </div>
  )
}

// Facturación → Dashboard: indicadores de la cartera con las EPS.
export const BillingDashboardPage = () => {
  const navigate = useNavigate()
  return (
    <>
      <PageHead title="Dashboard de facturación" subtitle="Cartera con EPS, clínicas, hospitales y empresas con convenio: recaudo, antigüedad y comportamiento mensual">
        <button type="button" className="btn btn-primary" onClick={() => navigate('/facturacion/cuentas-cobro')}><MdReceiptLong /> Cuentas de cobro</button>
      </PageHead>
      <BillingDashboard />
    </>
  )
}

// Facturación → Cuentas de cobro EPS: pendientes por EPS, generación y seguimiento del pago.
export const BillingPage = () => {
  const navigate = useNavigate()
  const { user } = useAuth()
  const [toast, toastNode] = useToast()
  const [pending, setPending] = useState(null); const [bills, setBills] = useState(null)
  const [f, setF] = useState({ desde: `${today().slice(0, 8)}01`, hasta: today() })
  const [confirm, setConfirm] = useState(null); const [busy, setBusy] = useState(false)
  const load = useCallback(() => Promise.all([
    api.get('/facturacion/cuentas-cobro/pendientes', { params: f }).then(({ data }) => setPending(data)),
    api.get('/facturacion/cuentas-cobro').then(({ data }) => setBills(data))
  ]).catch((e) => toast(errorMessage(e), 'bad')), [f, toast])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load() }, [])
  const generate = async () => {
    setBusy(true)
    try { const { data } = await api.post('/facturacion/cuentas-cobro', { epsId: confirm.epsId, from: f.desde, to: f.hasta }); setConfirm(null); navigate(`/facturacion/cuentas-cobro/${data.id}`) } catch (e) { toast(errorMessage(e), 'bad'); setBusy(false) }
  }
  const setStatus = async (b, status) => { try { await api.put(`/facturacion/cuentas-cobro/${b.id}`, { status }); toast(status === 'pagada' ? 'Cuenta de cobro marcada como pagada' : 'Cuenta de cobro anulada'); load() } catch (e) { toast(errorMessage(e), 'bad') } }

  return (
    <>
      <PageHead title="Cuentas de cobro" subtitle="Servicios facturados a EPS, clínicas, hospitales o empresas con convenio y forma de pago “cuenta de cobro”" />
      <Card flush title="Pendientes por cobrar" icon={<MdReceiptLong style={{ color: 'var(--brand)' }} />}
        actions={<form className="bill-filter" onSubmit={(e) => { e.preventDefault(); load() }}>
          <input type="date" className="input" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} aria-label="Desde" />
          <input type="date" className="input" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} aria-label="Hasta" />
          <button type="submit" className="btn btn-outline btn-sm"><MdSearch /> Filtrar</button>
        </form>}>
        {!pending ? <div className="splash" style={{ minHeight: 100 }}><Spinner /></div> : pending.length === 0 ? <Empty icon={<MdCheckCircle />}>No hay servicios pendientes de cobro en el periodo.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Entidad</th><th>Servicios</th><th className="num">Cantidad</th><th className="num">Valor a cobrar</th><th className="actions" /></tr></thead>
            <tbody>{pending.map((g) => (
              <tr key={g.epsId || 0}>
                <td><strong style={{ color: 'var(--ink)' }}>{g.epsName}</strong><div className="hint">{g.rows.slice(0, 3).map((r) => r.paciente).join(', ')}{g.rows.length > 3 ? '…' : ''}</div></td>
                <td><div className="chips">{g.services.map((x) => <span key={x.name} className="badge">{x.name} · {x.count}</span>)}</div></td>
                <td className="num">{g.count}</td>
                <td className="num"><strong>{formatMoney(g.total)}</strong></td>
                <td className="actions">{g.epsId && <button type="button" className="btn btn-primary btn-sm" onClick={() => setConfirm(g)}><MdReceiptLong /> Generar cuenta de cobro</button>}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      <div style={{ marginTop: 18 }}>
        <Card flush title="Cuentas de cobro generadas" icon={<MdReceiptLong style={{ color: 'var(--brand)' }} />}>
          {!bills ? <div className="splash" style={{ minHeight: 100 }}><Spinner /></div> : bills.length === 0 ? <Empty icon={<MdReceiptLong />}>Aún no hay cuentas de cobro.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Código</th><th>Entidad</th><th>Periodo</th><th className="num">Servicios</th><th className="num">Total</th><th>Estado</th><th className="actions" /></tr></thead>
              <tbody>{bills.map((b) => (
                <tr key={b.id}>
                  <td><strong style={{ color: 'var(--ink)' }}>{b.code}</strong><div className="hint">{fmt(b.createdAt)}</div></td>
                  <td>{b.epsName}{b.services?.length > 0 && <div className="hint">{b.services.join(', ')}</div>}</td>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmt(b.from)} – {fmt(b.to)}</td>
                  <td className="num">{b.count}</td>
                  <td className="num"><strong>{formatMoney(b.total)}</strong></td>
                  <td><span className={`badge ${STATUS[b.status][1]}`}>{STATUS[b.status][0]}</span>{b.paidAt && <div className="hint">{fmt(b.paidAt)}</div>}</td>
                  <td className="actions">
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(`/facturacion/cuentas-cobro/${b.id}`)}><MdPrint /> Ver / PDF</button>
                    {b.status === 'emitida' && <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--ok)' }} onClick={() => setStatus(b, 'pagada')}><MdCheckCircle /> Pagada</button>}
                    {b.status === 'emitida' && user.role === 'administrador' && <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} onClick={() => setStatus(b, 'anulada')}><MdBlock /> Anular</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      </div>
      {confirm && (
        <Modal title="Generar cuenta de cobro" size="sm" onClose={() => setConfirm(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setConfirm(null)}>Cancelar</button><button type="button" className="btn btn-primary" onClick={generate} disabled={busy}>{busy ? <Spinner /> : <MdReceiptLong />} Generar</button></>}>
          <p style={{ margin: 0 }}>Se generará la cuenta de cobro a <b>{confirm.epsName}</b> por <b>{confirm.count}</b> servicio{confirm.count === 1 ? '' : 's'} ({confirm.services.map((x) => `${x.name}: ${x.count}`).join(', ')}) del {fmt(f.desde)} al {fmt(f.hasta)}, por un total de <b>{formatMoney(confirm.total)}</b>.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

// Formato imprimible de la cuenta de cobro (con el logo y los datos de la IPS).
export const BillingSheet = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { logo, settings } = useSettings()
  const [b, setB] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api.get(`/facturacion/cuentas-cobro/${id}`).then(({ data }) => setB(data)).catch((e) => setErr(errorMessage(e))) }, [id])
  useEffect(() => { if (b) { const t = document.title; document.title = `Cuenta_cobro_${b.code}_${b.epsName}`; return () => { document.title = t } } return undefined }, [b])
  if (err) return <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>
  if (!b) return <div className="splash"><Spinner /></div>
  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={() => navigate('/facturacion/cuentas-cobro')}>← Cuentas de cobro</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
      </div>
      <article className="cy-sheet ev-sheet">
        <header className="cy-sheet-header">
          <img src={logo} alt={settings.ipsName} className="cy-logo" />
          <div className="cy-sheet-heading"><p className="cy-kicker">{settings.shortName} · Servicios de IPS</p><h2>Cuenta de cobro</h2></div>
          <dl className="cy-meta">
            <div><dt>N°</dt><dd>{b.code}</dd></div>
            <div><dt>Fecha</dt><dd>{fmt(b.createdAt)}</dd></div>
            <div><dt>Estado</dt><dd>{STATUS[b.status][0]}</dd></div>
          </dl>
        </header>
        <div className="cy-patient-band ev-band">
          <div><span className="cy-field-label">Debe a</span><strong className="cy-patient-name">{settings.ipsName}</strong><span className="ev-sub">{b.siteName || ''}</span></div>
          <div><span className="cy-field-label">Entidad</span><strong>{b.epsName}</strong><span className="ev-sub">{[b.epsNit && `NIT ${b.epsNit}`, b.agreementNumber && `Convenio N° ${b.agreementNumber}`].filter(Boolean).join(' · ')}</span></div>
          <div><span className="cy-field-label">Periodo</span><strong>{fmt(b.from)} – {fmt(b.to)}</strong></div>
        </div>
        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Servicios prestados</h3>
          <table className="ev-table">
            <thead><tr><th>#</th><th>Servicio</th><th>Factura</th><th>Fecha</th><th>Paciente</th><th>Documento</th><th style={{ textAlign: 'right' }}>Valor</th><th style={{ textAlign: 'right' }}>Descuento</th><th style={{ textAlign: 'right' }}>Copago / C. mod.</th><th style={{ textAlign: 'right' }}>A cobrar</th></tr></thead>
            <tbody>{b.rows.map((r, i) => (
              <tr key={r.id}><td>{i + 1}</td><td>{r.serviceName}{r.descripcion ? <div style={{ fontSize: 10, color: '#64748B' }}>{r.descripcion}</div> : null}</td><td>{r.numFactura || '—'}</td><td>{fmt(r.fecha)}</td><td><b>{r.paciente}</b></td><td>{r.documento}</td><td style={{ textAlign: 'right' }}>{formatMoney(r.valorBase)}</td><td style={{ textAlign: 'right' }}>{r.descuento ? formatMoney(r.descuento) : '—'}</td><td style={{ textAlign: 'right' }}>{r.shared?.amount ? formatMoney(r.shared.amount) : r.shared?.exemptReason ? 'Exento' : '—'}</td><td style={{ textAlign: 'right' }}><b>{formatMoney(r.valor)}</b></td></tr>
            ))}</tbody>
          </table>
          <p className="ev-complete" style={{ justifyContent: 'flex-end' }}>Total a cobrar ({b.count} servicio{b.count === 1 ? '' : 's'}): <b style={{ marginLeft: 6, fontSize: 14 }}>{formatMoney(b.total)}</b></p>
          {(() => {
            const shared = b.rows.reduce((t, r) => t + (r.shared?.amount || 0), 0)
            const rf = b.rows.reduce((t, r) => t + (r.retefuente || 0), 0); const ri = b.rows.reduce((t, r) => t + (r.reteica || 0), 0)
            return (
              <div style={{ fontSize: 11, color: '#475569', textAlign: 'right', lineHeight: 1.6 }}>
                {shared > 0 && <div>Copagos y cuotas moderadoras recaudados por la IPS (ya descontados): {formatMoney(shared)}</div>}
                <div>Servicios de salud excluidos de IVA (Estatuto Tributario, art. 476 num. 1).</div>
                {(rf > 0 || ri > 0) && <div>Deducciones estimadas que practica la entidad: retención en la fuente {formatMoney(rf)}{ri ? ` · ReteICA y estampillas ${formatMoney(ri)}` : ''} · neto esperado {formatMoney(b.total - rf - ri)}</div>}
              </div>
            )
          })()}
        </section>
        {b.notes && <section className="cy-section cy-notes"><div><h3 className="cy-section-title">Observaciones</h3><p>{b.notes}</p></div></section>}
        <section className="cy-signatures" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <div className="sig-block"><div className="sig-img" /><span className="cy-sign-line" /><strong>{b.createdBy || ' '}</strong><span className="cy-field-label">Elaboró · {settings.shortName}</span></div>
          <div className="sig-block"><div className="sig-img" /><span className="cy-sign-line" /><strong>{b.billingContact || ' '}</strong><span className="cy-field-label">Recibido · {b.epsName}</span></div>
        </section>
        <footer className="cy-sheet-footer"><span>{settings.ipsName} · Cuenta de cobro {b.code}</span><span>{b.billingEmail ? `Enviar a: ${b.billingEmail}` : ''}</span></footer>
      </article>
    </div>
  )
}
