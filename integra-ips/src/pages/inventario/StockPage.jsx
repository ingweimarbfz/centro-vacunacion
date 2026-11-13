import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MdSearch, MdWarehouse, MdErrorOutline, MdPrint, MdRemoveCircle, MdMoveToInbox, MdLocalShipping, MdOutbox, MdHistory } from 'react-icons/md'
import api, { errorMessage, getSiteFilter } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Empty, Spinner, useToast } from '../../components/ui'
import { CATEGORY_ORDER, CATEGORY_PLURAL, CategoryBadge, ExpiryBadge, EntryModal, TransferModal, DeliveryModal, WriteOffModal, regulatory, qty } from './common'

const StockPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [toast, toastNode] = useToast()
  const [params, setParams] = useSearchParams()
  const [warehouses, setWarehouses] = useState([])
  const [products, setProducts] = useState([])
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const f = {
    bodega: params.get('bodega') || '',
    categoria: params.get('categoria') || '', vencimiento: params.get('vencimiento') || '', q: params.get('q') || ''
  }
  const [q, setQ] = useState(f.q)
  const setF = (k, v) => { const p = new URLSearchParams(params); if (v) p.set(k, v); else p.delete(k); setParams(p, { replace: true }) }

  const load = useCallback(async () => {
    setError('')
    try {
      const { data } = await api.get('/inventario/stock', { params: { bodega: f.bodega || undefined, categoria: f.categoria || undefined, vencimiento: f.vencimiento || undefined, q: f.q || undefined } })
      setRows(data)
    } catch (e) { setError(errorMessage(e)) }
  }, [f.bodega, f.categoria, f.vencimiento, f.q])
  useEffect(() => { load() }, [load])
  useEffect(() => { api.get('/inventario/bodegas', { params: { sede: undefined } }).then(({ data }) => setWarehouses(data)).catch(() => {}) }, [])
  useEffect(() => { if (admin) api.get('/inventario/productos', { params: { sede: undefined } }).then(({ data }) => setProducts(data)).catch(() => {}) }, [admin])

  const current = warehouses.find((w) => String(w.id) === f.bodega)
  const general = warehouses.find((w) => w.isGeneral)
  const siteFilter = admin ? Number(getSiteFilter()) || null : null
  const whOptions = warehouses.filter((w) => !siteFilter || w.siteId === siteFilter)
  const done = (msg) => { setModal(null); toast(msg); load() }
  const totals = useMemo(() => (rows || []).reduce((a, l) => a + l.stock, 0), [rows])
  const reportLink = `/socorro/inventario/reporte?${new URLSearchParams(Object.entries({ bodega: f.bodega, categoria: f.categoria, vencimiento: f.vencimiento, q: f.q }).filter(([, v]) => v)).toString()}`

  return (
    <>
      <PageHead title={current ? current.name : 'Existencias por bodega'} subtitle={current ? `${current.code} · ${current.siteName}${current.responsible ? ` · responsable ${current.responsible}` : ''} · existencias por producto y lote` : `Existencias actuales de ${admin && !siteFilter ? 'todas las bodegas' : 'las bodegas de la sede'}, por producto y lote`}>
        <Link to={reportLink} className="btn btn-outline"><MdPrint /> Reporte PDF</Link>
        <button type="button" className="btn btn-outline" onClick={() => setModal({ delivery: true })} disabled={!whOptions.length}><MdOutbox /> Entrega semanal</button>
        {admin && <button type="button" className="btn btn-outline" onClick={() => setModal({ transfer: true })}><MdLocalShipping /> Trasladar</button>}
        {admin && <button type="button" className="btn btn-primary" onClick={() => setModal({ entry: true })}><MdMoveToInbox /> Ingreso</button>}
      </PageHead>

      <Card>
        <form className="form-grid" style={{ alignItems: 'end' }} onSubmit={(e) => { e.preventDefault(); setF('q', q.trim()) }}>
          <div className="field"><label>Bodega</label>
            <select value={f.bodega} onChange={(e) => setF('bodega', e.target.value)}>
              <option value="">{admin && !siteFilter ? 'Todas las bodegas' : 'Todas las bodegas de la sede'}</option>
              {whOptions.map((w) => <option key={w.id} value={w.id}>{w.name}{w.isGeneral ? ' (general)' : admin && !siteFilter ? ` · ${w.siteName}` : ''}{w.active ? '' : ' · inactiva'}</option>)}
            </select></div>
          <div className="field"><label>Categoría</label><select value={f.categoria} onChange={(e) => setF('categoria', e.target.value)}><option value="">Todas</option>{CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_PLURAL[c]}</option>)}</select></div>
          <div className="field"><label>Vencimiento</label><select value={f.vencimiento} onChange={(e) => setF('vencimiento', e.target.value)}><option value="">Todos</option><option value="proximos">Vencen en 60 días</option><option value="vencidos">Vencidos</option></select></div>
          <div className="field"><label>Buscar</label><div className="input-icon"><MdSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Producto, lote, INVIMA, marca" /></div></div>
          <button type="submit" className="btn btn-dark"><MdSearch /> Buscar</button>
        </form>
      </Card>

      {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}

      <Card flush className="cy-results-card" title="Existencias" subtitle={rows ? `${rows.length} lotes / líneas · ${qty(totals)} unidades` : ''}>
        {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : rows.length === 0 ? <Empty icon={<MdWarehouse />}>Sin existencias con esos filtros.</Empty> : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead><tr><th>Producto</th><th>Datos regulatorios</th><th>Lote</th><th>Vencimiento</th>{!current && <th>Bodega</th>}<th className="num">Existencia</th><th className="actions" /></tr></thead>
              <tbody>{rows.map((l) => (
                <tr key={l.id} className={l.expired ? 'po-bad' : ''}>
                  <td style={{ maxWidth: 280, whiteSpace: 'normal' }}><strong style={{ color: 'var(--ink)' }}>{l.product.name}</strong><div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 12, color: 'var(--muted)' }}><CategoryBadge category={l.product.category} /> {l.product.code}</div></td>
                  <td style={{ maxWidth: 280, whiteSpace: 'normal', fontSize: 12.5 }}>{regulatory(l.product) || '—'}{l.product.registroInvima && <div style={{ color: 'var(--muted)' }}>{l.product.registroInvima}</div>}</td>
                  <td style={{ fontFamily: 'monospace' }}>{l.lot || '—'}</td>
                  <td><ExpiryBadge line={l} /></td>
                  {!current && <td>{l.warehouseName}{l.isGeneral && <div><span className="badge brand" style={{ fontSize: 10.5 }}>General</span></div>}</td>}
                  <td className="num"><b style={{ color: l.stock <= l.minStock ? 'var(--bad)' : 'var(--ink)' }}>{qty(l.stock)}</b> <span style={{ color: 'var(--muted)', fontSize: 12 }}>{l.product.unitLabel}</span></td>
                  <td className="actions">
                    <Link className="btn btn-ghost btn-icon" title="Movimientos" aria-label="Movimientos" to={`/socorro/inventario/movimientos?item=${l.id}`}><MdHistory /></Link>
                    {admin && <button type="button" className="btn btn-ghost btn-icon" title="Baja o ajuste" aria-label="Baja o ajuste" style={{ color: 'var(--bad)' }} onClick={() => setModal({ writeOff: l })}><MdRemoveCircle /></button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>

      {modal?.entry && <EntryModal products={products} generalName={general?.name} onClose={() => setModal(null)} onSaved={done} />}
      {modal?.transfer && <TransferModal warehouses={warehouses} fromId={current?.id} onClose={() => setModal(null)} onSaved={done} />}
      {modal?.delivery && <DeliveryModal warehouses={whOptions} warehouseId={current?.id} onClose={() => setModal(null)} onSaved={done} />}
      {modal?.writeOff && <WriteOffModal line={modal.writeOff} onClose={() => setModal(null)} onSaved={done} />}
      {toastNode}
    </>
  )
}

export default StockPage
