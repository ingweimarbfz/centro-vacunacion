import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdEventBusy, MdArrowForward } from 'react-icons/md'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { hasModule } from '../utils/permissions'
import { Card } from './ui'
import { CategoryBadge, ExpiryBadge, qty } from '../pages/inventario/common'

// Productos e insumos vencidos o próximos a vencer (60 días) de las bodegas que ve el usuario.
const ExpiringSupplies = () => {
  const { user } = useAuth()
  const allowed = ['administrador', 'empleado'].includes(user.role) || hasModule(user, 'inventario')
  const [rows, setRows] = useState(null)
  useEffect(() => {
    if (!allowed || !hasModule(user, 'inventario')) return
    api.get('/inventario/resumen').then(({ data }) => setRows(data.expiring)).catch(() => setRows([]))
  }, [allowed, user])
  if (!rows || rows.length === 0) return null
  const expired = rows.filter((l) => l.expired).length
  return (
    <Card flush title={`Insumos próximos a vencer (${rows.length})`} subtitle={`${expired ? `${expired} lote${expired === 1 ? '' : 's'} vencido${expired === 1 ? '' : 's'} · ` : ''}lotes que vencen en los próximos 60 días`}
      icon={<MdEventBusy style={{ color: expired ? 'var(--bad)' : 'var(--warn)' }} />}
      actions={<Link to="/socorro/inventario/existencias?vencimiento=proximos" className="btn btn-ghost btn-sm">Ver en inventario <MdArrowForward /></Link>}>
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="table">
          <thead><tr><th>Producto</th><th>Lote</th><th>Bodega</th><th className="num">Existencia</th><th>Vence</th></tr></thead>
          <tbody>{rows.slice(0, 8).map((l) => (
            <tr key={l.id} className={l.expired ? 'po-bad' : ''}>
              <td style={{ whiteSpace: 'normal' }}><strong style={{ color: 'var(--ink)' }}>{l.product.name}</strong><div><CategoryBadge category={l.product.category} /></div></td>
              <td style={{ fontFamily: 'monospace' }}>{l.lot || '—'}</td>
              <td style={{ whiteSpace: 'normal' }}>{l.warehouseName}</td>
              <td className="num">{qty(l.stock)} {l.product.unitLabel}</td>
              <td><ExpiryBadge line={l} />{!l.expired && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>en {l.daysToExpiry} día{l.daysToExpiry === 1 ? '' : 's'}</div>}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>
      {rows.length > 8 && <p style={{ margin: '8px 16px 14px', fontSize: 12.5, color: 'var(--muted)' }}>Y {rows.length - 8} lote{rows.length - 8 === 1 ? '' : 's'} más.</p>}
    </Card>
  )
}

export default ExpiringSupplies
