import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import {
  MdInventory2, MdWarehouse, MdErrorOutline, MdWarning, MdEventBusy, MdMoveToInbox, MdLocalShipping, MdOutbox, MdPrint, MdArrowForward, MdCategory, MdTrendingDown
} from 'react-icons/md'
import api, { errorMessage, getSiteFilter } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Empty, Spinner, useToast } from '../../components/ui'
import { CATEGORY_ORDER, CATEGORY_PLURAL, CATEGORY_LABELS, CATEGORY_COLOR, CATEGORY_SHORT, CategoryBadge, ExpiryBadge, EntryModal, TransferModal, DeliveryModal, qty } from './common'

const axis = { fontSize: 11, fill: '#6B7280' }
// Etiqueta del eje X en varias líneas para que los nombres de bodega no se monten.
const WrapTick = ({ x, y, payload }) => {
  const words = String(payload.value).split(' ')
  const lines = []
  for (const w of words) { const last = lines[lines.length - 1]; if (last && (last + ' ' + w).length <= 11) lines[lines.length - 1] = `${last} ${w}`; else lines.push(w) }
  return (
    <text x={x} y={y + 12} textAnchor="middle" fontSize={10.5} fill="#6B7280">
      {lines.slice(0, 3).map((l, i) => <tspan key={i} x={x} dy={i ? 12 : 0}>{l}</tspan>)}
    </text>
  )
}
const Kpi = ({ label, value, icon, tone = '', foot }) => (
  <div className="card kpi">
    <div className="kpi-top"><span className="kpi-label">{label}</span><span className={`kpi-icon ${tone}`}>{icon}</span></div>
    <div className="kpi-value">{value}</div>
    {foot && <div className="kpi-foot">{foot}</div>}
  </div>
)

const InventoryDashboard = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [toast, toastNode] = useToast()
  const [data, setData] = useState(null)
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)

  const load = useCallback(async () => {
    try {
      const [{ data: r }, { data: w }] = await Promise.all([api.get('/inventario/resumen'), api.get('/inventario/bodegas', { params: { sede: undefined } })])
      setData(r); setWarehouses(w)
    } catch (e) { setError(errorMessage(e)) }
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (admin) api.get('/inventario/productos', { params: { sede: undefined } }).then(({ data: p }) => setProducts(p)).catch(() => {}) }, [admin])

  const filterSite = admin ? Number(getSiteFilter()) || null : user.siteId
  const general = warehouses.find((w) => w.isGeneral)
  const scopeWh = warehouses.filter((w) => !filterSite || w.siteId === filterSite)
  const scopeName = filterSite ? `${scopeWh[0]?.siteName || 'Sede'} · ${scopeWh.length} bodega${scopeWh.length === 1 ? '' : 's'}` : `Todas las bodegas (${warehouses.length})`
  const deliveryWhs = admin ? scopeWh : warehouses
  const done = (msg) => { setModal(null); toast(msg); load() }

  const chart = data ? data.byWarehouse.map((w) => ({ name: w.isGeneral ? 'General' : w.name.replace(/^Bodega\s+/i, ''), ...Object.fromEntries(w.byCategory.map((c) => [c.key, c.units])) })) : []

  return (
    <>
      <PageHead title="Inventario y bodegas" subtitle={`${scopeName} · medicamentos, dispositivos médicos, reactivos y equipos (Resolución 3100 de 2019)`}>
        <Link to="/socorro/inventario/reporte" className="btn btn-outline"><MdPrint /> Reporte PDF</Link>
        <button type="button" className="btn btn-outline" onClick={() => setModal('delivery')} disabled={!deliveryWhs.length}><MdOutbox /> Entrega semanal</button>
        {admin && <button type="button" className="btn btn-outline" onClick={() => setModal('transfer')}><MdLocalShipping /> Trasladar</button>}
        {admin && <button type="button" className="btn btn-primary" onClick={() => setModal('entry')}><MdMoveToInbox /> Ingreso a bodega general</button>}
      </PageHead>

      {error && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{error}</span></div>}
      {!data && !error && <div className="splash" style={{ minHeight: 300 }}><Spinner /> Cargando…</div>}

      {data && (
        <div className="stack">
          {(data.kpis.expired > 0 || data.expiring.length > 0) && (
            <div className={`alert ${data.kpis.expired ? 'bad' : 'warn'}`}>
              <MdEventBusy />
              <div><strong>{data.kpis.expired ? `${data.kpis.expired} lote(s) vencido(s)` : ''}{data.kpis.expired && data.kpis.expiringSoon ? ' · ' : ''}{data.kpis.expiringSoon ? `${data.kpis.expiringSoon} lote(s) vencen en los próximos 60 días` : ''}</strong>
                {data.expiring.slice(0, 3).map((l) => `${l.product.name} (lote ${l.lot}, ${l.warehouseName})`).join(' · ')}</div>
              <Link to="/socorro/inventario/existencias?vencimiento=proximos" className="btn btn-outline btn-sm alert-actions">Ver lotes</Link>
            </div>
          )}

          <div className="grid grid-kpi">
            <Kpi label="Unidades en bodega" value={qty(data.kpis.units)} icon={<MdInventory2 />} tone="navy" foot={`${data.kpis.lines} lotes / líneas de stock`} />
            <Kpi label="Productos en catálogo" value={data.kpis.products} icon={<MdCategory />} tone="ok" foot="Activos" />
            <Kpi label="Stock bajo" value={data.kpis.low} icon={<MdWarning />} tone={data.kpis.low ? '' : 'ok'} foot="Productos bajo el mínimo de su bodega" />
            <Kpi label="Por vencer / vencidos" value={`${data.kpis.expiringSoon} / ${data.kpis.expired}`} icon={<MdEventBusy />} tone={data.kpis.expired ? '' : data.kpis.expiringSoon ? 'warn' : 'ok'} foot="Próximos 60 días" />
            <Kpi label="Salidas del mes" value={qty(data.kpis.monthOut)} icon={<MdTrendingDown />} tone="warn" foot={`Ingresos ${qty(data.kpis.monthIn)} · traslados ${qty(data.kpis.monthTransfers)}`} />
          </div>

          <div className="grid grid-3">
            {CATEGORY_ORDER.slice(0, 3).map((c) => {
              const x = data.byCategory.find((k) => k.key === c)
              return (
                <Link key={c} to={`/socorro/inventario/existencias?categoria=${c}`} className="card inv-cat" style={{ borderTop: `3px solid ${CATEGORY_COLOR[c]}` }}>
                  <span className="kpi-label">{CATEGORY_PLURAL[c]}</span>
                  <div className="kpi-value">{qty(x.units)}</div>
                  <span className="kpi-foot">{x.products} productos · {x.lines} lotes</span>
                </Link>
              )
            })}
          </div>

          <div className="grid grid-2-1">
            <Card title="Existencias por bodega y categoría" subtitle="Unidades disponibles en cada bodega">
              <div style={{ width: '100%', height: 320 }}>
                <ResponsiveContainer>
                  <BarChart data={chart} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#EEF0F3" vertical={false} />
                    <XAxis dataKey="name" tick={<WrapTick />} interval={0} height={46} tickLine={false} />
                    <YAxis tick={axis} />
                    <Tooltip formatter={(v, k) => [qty(v), CATEGORY_LABELS[k]]} />
                    <Legend formatter={(k) => CATEGORY_LABELS[k]} wrapperStyle={{ fontSize: 12, paddingTop: 6 }} />
                    {CATEGORY_ORDER.map((c) => <Bar key={c} dataKey={c} stackId="a" fill={CATEGORY_COLOR[c]} radius={c === 'no_operacional' ? [4, 4, 0, 0] : 0} />)}
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </Card>
            <Card title="Entregas del mes" subtitle="A servicios de IPS, Educación, Socorro y actividades">
              {data.deliveries.length === 0 ? <Empty icon={<MdOutbox />}>Sin entregas este mes.</Empty> : (
                <ul className="list">{data.deliveries.map((d) => (
                  <li key={d.key}><span className="icon-bubble navy"><MdOutbox /></span><div className="grow"><strong>{d.label.replace('Operaciones Generales · ', '')}</strong><span>{d.label.startsWith('IPS') ? 'Servicio de IPS' : d.key === 'actividades' ? 'Consumo en eventos' : 'Operaciones Generales'}</span></div><b>{qty(d.units)}</b></li>
                ))}</ul>
              )}
            </Card>
          </div>

          <Card flush title="Bodegas" subtitle={admin ? 'Bodega general y bodegas de cada sede' : 'Bodegas de tu sede'} icon={<MdWarehouse style={{ color: 'var(--brand)' }} />}>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead><tr><th style={{ minWidth: 200 }}>Bodega</th>{CATEGORY_ORDER.map((c) => <th key={c} className="num">{CATEGORY_SHORT[c]}</th>)}<th className="num">Total</th><th>Alertas</th><th className="actions" /></tr></thead>
                <tbody>{data.byWarehouse.map((w) => (
                  <tr key={w.warehouseId}>
                    <td style={{ whiteSpace: 'normal' }}><strong style={{ color: 'var(--ink)' }}>{w.name}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{w.isGeneral ? 'Bodega general · ' : ''}{w.siteName}{w.active ? '' : ' · inactiva'}</div></td>
                    {CATEGORY_ORDER.map((c) => <td key={c} className="num">{qty(w.byCategory.find((x) => x.key === c).units)}</td>)}
                    <td className="num"><b>{qty(w.units)}</b></td>
                    <td><div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {w.low > 0 && <span className="badge bad">{w.low} bajo</span>}
                      {w.expired > 0 && <span className="badge bad">{w.expired} vencido</span>}
                      {w.expiringSoon > 0 && <span className="badge warn">{w.expiringSoon} por vencer</span>}
                      {!w.low && !w.expired && !w.expiringSoon && <span className="badge ok">OK</span>}
                    </div></td>
                    <td className="actions"><Link className="btn btn-outline btn-sm" to={`/socorro/inventario/existencias?bodega=${w.warehouseId}`}>Ver <MdArrowForward /></Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>

          <div className="grid grid-2">
            <Card flush title="Stock bajo" subtitle="Productos por debajo del mínimo de la bodega">
              {data.lowStock.length === 0 ? <Empty icon={<MdInventory2 />}>Todo está sobre el mínimo.</Empty> : (
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="table"><thead><tr><th>Producto</th><th>Bodega</th><th className="num">Stock</th><th className="num">Mínimo</th></tr></thead>
                    <tbody>{data.lowStock.slice(0, 12).map((x) => (
                      <tr key={`${x.warehouseId}-${x.product.id}`}><td><strong style={{ color: 'var(--ink)' }}>{x.product.name}</strong><div><CategoryBadge category={x.product.category} /></div></td><td style={{ whiteSpace: 'normal' }}>{x.warehouseName}</td><td className="num" style={{ color: 'var(--bad)', fontWeight: 600 }}>{qty(x.stock)}</td><td className="num">{qty(x.minStock)}</td></tr>
                    ))}</tbody></table>
                </div>
              )}
            </Card>
            <Card flush title="Vencimientos" subtitle="Lotes vencidos o que vencen en los próximos 60 días">
              {data.expiring.length === 0 ? <Empty icon={<MdEventBusy />}>Sin lotes próximos a vencer.</Empty> : (
                <div className="table-wrap" style={{ marginTop: 12 }}>
                  <table className="table"><thead><tr><th>Producto · lote</th><th>Bodega</th><th className="num">Stock</th><th>Vence</th></tr></thead>
                    <tbody>{data.expiring.slice(0, 12).map((l) => (
                      <tr key={l.id}><td style={{ whiteSpace: 'normal' }}><strong style={{ color: 'var(--ink)' }}>{l.product.name}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>Lote {l.lot}</div></td><td style={{ whiteSpace: 'normal' }}>{l.warehouseName}</td><td className="num">{qty(l.stock)}</td><td><ExpiryBadge line={l} /></td></tr>
                    ))}</tbody></table>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}

      {modal === 'entry' && <EntryModal products={products} generalName={general?.name} onClose={() => setModal(null)} onSaved={done} />}
      {modal === 'transfer' && <TransferModal warehouses={warehouses} onClose={() => setModal(null)} onSaved={done} />}
      {modal === 'delivery' && <DeliveryModal warehouses={deliveryWhs} onClose={() => setModal(null)} onSaved={done} />}
      {toastNode}
    </>
  )
}

export default InventoryDashboard
