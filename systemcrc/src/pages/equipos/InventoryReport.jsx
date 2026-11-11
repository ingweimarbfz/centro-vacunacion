import React, { useEffect } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { money, dateLabel } from '../vehiculos/common'
import { CATEGORY, STATUS, daysFromToday } from './common'
import '../../components/cytology.css'

// Reporte PDF del inventario de equipos (respeta los filtros aplicados en pantalla).
const InventoryReport = ({ rows, filters, onBack }) => {
  const { logo, settings } = useSettings()
  const printedAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())
  useEffect(() => { const p = document.title; document.title = 'Inventario_de_equipos'; return () => { document.title = p } }, [])
  const live = rows.filter((r) => r.status !== 'dado_de_baja')
  const alerts = live.reduce((a, r) => a + r.alerts.length, 0)
  const value = rows.reduce((a, r) => a + (r.purchasePrice || 0) * (r.quantity || 1), 0)
  const scope = [filters.svc, filters.cat && CATEGORY[filters.cat][0], filters.st && STATUS[filters.st][0], filters.q && `"${filters.q}"`].filter(Boolean).join(' · ')

  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={onBack}>← Volver</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>
      <article className="cy-sheet ev-sheet">
        <header className="cy-sheet-header">
          <img src={logo} alt={settings.ipsName} className="cy-logo" />
          <div className="cy-sheet-heading">
            <p className="cy-kicker">{settings.shortName} · Equipos e infraestructura</p>
            <h2>Inventario de equipos</h2>
            <p className="ev-formats">{scope ? `Filtro: ${scope}` : 'Todos los equipos'}</p>
          </div>
          <dl className="cy-meta">
            <div><dt>Equipos</dt><dd>{rows.length}</dd></div>
            <div><dt>Unidades</dt><dd>{rows.reduce((a, r) => a + r.quantity, 0)}</dd></div>
            <div><dt>Alertas</dt><dd>{alerts}</dd></div>
          </dl>
        </header>

        <div className="tr-km" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginTop: '5mm' }}>
          {Object.entries(STATUS).map(([k, [l]]) => (
            <div key={k} className={k === 'fuera_servicio' && rows.some((r) => r.status === k) ? 'hl' : ''}><span>{l}</span><strong>{rows.filter((r) => r.status === k).length}</strong></div>
          ))}
        </div>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Detalle</h3>
          <table className="ev-table">
            <thead><tr><th>Código</th><th>Equipo</th><th>Marca / modelo / serial</th><th>Área</th><th>Stock</th><th>Estado</th><th>Próx. preventivo</th><th>Garantía</th></tr></thead>
            <tbody>{rows.map((r) => {
              const [sl, st] = STATUS[r.status]
              const n = daysFromToday(r.nextPreventive); const w = daysFromToday(r.warrantyUntil)
              return (
                <tr key={r.id}>
                  <td><b>{r.code}</b></td>
                  <td><b>{r.name}</b><div className="vs-parts">{CATEGORY[r.category][0]}</div></td>
                  <td>{[r.brand, r.model].filter(Boolean).join(' ') || '—'}{r.serial && <div className="vs-parts" style={{ fontFamily: 'monospace' }}>{r.serial}</div>}</td>
                  <td>{r.area || '—'}</td>
                  <td>{r.minQuantity && r.quantity <= r.minQuantity ? <span className="badge bad">{r.quantity}</span> : r.quantity}</td>
                  <td><span className={`badge ${st}`}>{sl}</span></td>
                  <td>{r.nextPreventive ? <span className={`badge ${n < 0 ? 'bad' : n <= 15 ? 'warn' : 'ok'}`}>{dateLabel(r.nextPreventive)}</span> : '—'}</td>
                  <td>{r.warrantyUntil ? <span className={`badge ${w < 0 ? '' : w <= 30 ? 'warn' : 'ok'}`}>{w < 0 ? 'Vencida' : dateLabel(r.warrantyUntil)}</span> : '—'}</td>
                </tr>
              )
            })}</tbody>
          </table>
          <p className="ev-complete">Valor de compra registrado: <b style={{ marginLeft: 4 }}>{money(value)}</b></p>
        </section>

        <footer className="cy-sheet-footer">
          <span>{settings.ipsName} · Inventario de equipos</span>
          <span>Impreso el {printedAt}</span>
        </footer>
      </article>
    </div>
  )
}

export default InventoryReport
