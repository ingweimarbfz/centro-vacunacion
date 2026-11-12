import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MdSearch, MdSwapHoriz, MdErrorOutline, MdPrint } from 'react-icons/md'
import api, { errorMessage, getSiteFilter } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { fmtDateTime } from '../socorro/common'
import usePagedList from '../../hooks/usePagedList'
import LoadMore from '../../components/LoadMore'
import { CATEGORY_ORDER, CATEGORY_PLURAL, CategoryBadge, MOVE_TONE, useCatalogs, qty } from './common'

const MovementsPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const cat = useCatalogs()
  const [params] = useSearchParams()
  const [warehouses, setWarehouses] = useState([])
  const [f, setF] = useState({ bodega: '', tipo: '', categoria: '', desde: '', hasta: '', item: params.get('item') || '' })
  const list = usePagedList('/inventario/movimientos', 100); const rows = list.rows; const setRows = list.setRows
  const [error, setError] = useState('')

  const load = useCallback(async (x) => {
    setError(''); setRows(null)
    try {
      await list.load({ bodega: x.bodega || undefined, tipo: x.tipo || undefined, categoria: x.categoria || undefined, desde: x.desde || undefined, hasta: x.hasta || undefined, item: x.item || undefined })
    } catch (e) { setError(errorMessage(e)) }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(f) }, [load])
  useEffect(() => { api.get('/inventario/bodegas', { params: { sede: undefined } }).then(({ data }) => setWarehouses(data)).catch(() => {}) }, [])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const labels = cat?.moveLabels || {}

  return (
    <>
      <PageHead title="Movimientos y entregas" subtitle="Kárdex: ingresos, traslados entre bodegas, entregas semanales, consumos en actividades y bajas">
        <button type="button" className="btn btn-outline no-print" onClick={() => window.print()} disabled={!rows}><MdPrint /> Imprimir</button>
      </PageHead>
      <Card className="no-print">
        <form className="form-grid" style={{ alignItems: 'end' }} onSubmit={(e) => { e.preventDefault(); load(f) }}>
          <div className="field"><label>Bodega</label><select value={f.bodega} onChange={set('bodega')}><option value="">Todas</option>{warehouses.filter((w) => !admin || !getSiteFilter() || w.siteId === getSiteFilter()).map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}</select></div>
          <div className="field"><label>Tipo</label><select value={f.tipo} onChange={set('tipo')}><option value="">Todos</option>{Object.entries(labels).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Categoría</label><select value={f.categoria} onChange={set('categoria')}><option value="">Todas</option>{CATEGORY_ORDER.map((c) => <option key={c} value={c}>{CATEGORY_PLURAL[c]}</option>)}</select></div>
          <div className="field"><label>Desde</label><input type="date" value={f.desde} onChange={set('desde')} /></div>
          <div className="field"><label>Hasta</label><input type="date" value={f.hasta} onChange={set('hasta')} /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-dark" style={{ flex: 1 }}><MdSearch /> Filtrar</button>
            {f.item && <button type="button" className="btn btn-outline" onClick={() => { const x = { ...f, item: '' }; setF(x); load(x) }}>Quitar lote</button>}
          </div>
        </form>
      </Card>
      {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      <Card flush className="cy-results-card" title="Movimientos" subtitle={rows ? `${list.total} registros${f.item && rows[0] ? ` · ${rows[0].item.name}${rows[0].item.lot ? ` lote ${rows[0].item.lot}` : ''}` : ''}` : ''}>
        {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : rows.length === 0 ? <Empty icon={<MdSwapHoriz />}>Sin movimientos con esos filtros.</Empty> : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead><tr><th>Fecha</th><th>Movimiento</th><th>Producto</th><th>Bodega</th><th className="num">Cantidad</th><th className="num">Saldo</th><th>Detalle</th></tr></thead>
              <tbody>{rows.map((m) => (
                <tr key={m.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(m.createdAt)}{m.ref && <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'monospace' }}>{m.ref}</div>}</td>
                  <td><span className={`badge ${MOVE_TONE[m.type] || ''}`}>{m.typeLabel}</span></td>
                  <td style={{ maxWidth: 240, whiteSpace: 'normal' }}><strong style={{ color: 'var(--ink)' }}>{m.item?.name}</strong><div style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 12, color: 'var(--muted)' }}><CategoryBadge category={m.item?.category} />{m.item?.lot ? ` lote ${m.item.lot}` : ''}</div></td>
                  <td style={{ whiteSpace: 'normal' }}>{m.item?.warehouseName}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{m.item?.siteName}</div></td>
                  <td className="num" style={{ color: m.quantity < 0 ? 'var(--bad)' : 'var(--ok)', fontWeight: 600 }}>{m.quantity > 0 ? '+' : ''}{qty(m.quantity)}</td>
                  <td className="num">{qty(m.stockAfter)}</td>
                  <td style={{ whiteSpace: 'normal', fontSize: 12.5, maxWidth: 300 }}>
                    {m.destinationLabel && <div><b>{m.destinationLabel}</b></div>}
                    {m.counterpart && <div>{m.type === 'traslado_salida' ? 'Hacia' : 'Desde'} {m.counterpart}</div>}
                    {m.event && <div><Link to={`/socorro/eventos/${m.event.id}`}>{m.event.code}</Link> · {m.event.name}</div>}
                    {m.note && <div>{m.note}</div>}
                    {m.user && <div style={{ color: 'var(--muted)' }}>{m.user}</div>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
        {rows && <LoadMore shown={rows.length} total={list.total} hasMore={list.hasMore} loading={list.loadingMore} onMore={() => list.more().catch((e) => setError(errorMessage(e)))} />}
      </Card>
    </>
  )
}

export default MovementsPage
