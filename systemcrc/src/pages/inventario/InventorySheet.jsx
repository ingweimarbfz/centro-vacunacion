import React, { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { MdArrowBack, MdPrint, MdErrorOutline } from 'react-icons/md'
import api, { errorMessage, getSiteFilter } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { Spinner } from '../../components/ui'
import { SignBlock, useDocSignatures } from '../../components/signature'
import { CATEGORY_ORDER, CATEGORY_PLURAL, fmtDay, qty } from './common'
import '../../components/cytology.css'

// Columnas regulatorias por categoría (Resolución 3100 de 2019).
const COLUMNS = {
  medicamento: [['Principio activo', (p) => p.principioActivo], ['Forma farmacéutica', (p) => p.formaFarmaceutica], ['Concentración', (p) => p.concentracion], ['Presentación', (p) => p.presentacionComercial]],
  dispositivo_medico: [['Descripción · marca', (p) => [p.descripcion, p.marca].filter(Boolean).join(' · ')], ['Serie', (p) => p.serie], ['Presentación', (p) => p.presentacionComercial], ['Riesgo · vida útil', (p) => [p.clasificacionRiesgo, p.vidaUtil].filter(Boolean).join(' · ')]],
  reactivo: [['Marca', (p) => p.marca], ['Presentación', (p) => p.presentacionComercial], ['Riesgo sanitario', (p) => p.clasificacionRiesgo], ['Vida útil', (p) => p.vidaUtil]],
  operacional: [['Marca', (p) => p.marca], ['Descripción', (p) => p.descripcion]],
  no_operacional: [['Marca', (p) => p.marca], ['Descripción', (p) => p.descripcion]]
}

// Reporte imprimible del inventario: general, por bodega y por categoría.
const InventorySheet = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const navigate = useNavigate()
  const { logo, settings } = useSettings()
  const [params] = useSearchParams()
  const bodega = params.get('bodega') || ''
  const categoria = params.get('categoria') || ''
  const vencimiento = params.get('vencimiento') || ''
  const q = params.get('q') || ''
  const [lines, setLines] = useState(null)
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
  const doc = useDocSignatures('inventario', `${bodega ? `b${bodega}` : admin ? `s${getSiteFilter() || 'todas'}` : `s${user.siteId}`}:${categoria || 'todas'}:${today}`)
  const [summary, setSummary] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    const p = bodega ? { bodega, sede: undefined } : {}
    Promise.all([
      api.get('/inventario/stock', { params: { ...p, categoria: categoria || undefined, vencimiento: vencimiento || undefined, q: q || undefined } }),
      api.get('/inventario/resumen', { params: p })
    ]).then(([a, b]) => { setLines(a.data); setSummary(b.data) }).catch((e) => setError(errorMessage(e)))
  }, [bodega, categoria, vencimiento, q])

  const whName = bodega ? summary?.byWarehouse.find((w) => String(w.warehouseId) === bodega)?.name : (admin && !getSiteFilter() ? null : summary?.byWarehouse[0]?.siteName)
  useEffect(() => { const p = document.title; document.title = `Inventario_${(whName || 'general').replace(/\W+/g, '_')}`; return () => { document.title = p } }, [whName])

  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!lines || !summary) return <div className="splash"><Spinner /> Cargando…</div>
  const printedAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())
  const cats = CATEGORY_ORDER.filter((c) => (!categoria || c === categoria) && lines.some((l) => l.product.category === c))
  const scope = [whName || 'Todas las bodegas', categoria && CATEGORY_PLURAL[categoria], vencimiento === 'proximos' && 'Lotes por vencer (60 días)', vencimiento === 'vencidos' && 'Lotes vencidos', q && `"${q}"`].filter(Boolean).join(' · ')

  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}><MdArrowBack /> Volver</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
      </div>
      <article className="cy-sheet ev-sheet">
        <header className="cy-sheet-header">
          <img src={logo} alt={settings.ipsName} className="cy-logo" />
          <div className="cy-sheet-heading">
            <p className="cy-kicker">{settings.shortName} · Inventario institucional</p>
            <h2>Medicamentos, dispositivos médicos, reactivos y equipos</h2>
            <p className="ev-formats">{scope} · Resolución 3100 de 2019</p>
          </div>
          <dl className="cy-meta">
            <div><dt>Lotes</dt><dd>{lines.length}</dd></div>
            <div><dt>Unidades</dt><dd>{qty(lines.reduce((a, l) => a + l.stock, 0))}</dd></div>
            <div><dt>Vencidos</dt><dd>{lines.filter((l) => l.expired).length}</dd></div>
          </dl>
        </header>

        {!bodega && summary.byWarehouse.length > 1 && (
          <section className="cy-section ev-table-section">
            <h3 className="cy-section-title">Consolidado por bodega</h3>
            <table className="ev-table">
              <thead><tr><th>Bodega</th>{CATEGORY_ORDER.map((c) => <th key={c}>{CATEGORY_PLURAL[c]}</th>)}<th>Total</th><th>Alertas</th></tr></thead>
              <tbody>{summary.byWarehouse.map((w) => (
                <tr key={w.warehouseId}><td><b>{w.name}</b>{w.isGeneral ? ' (general)' : ''}</td>{CATEGORY_ORDER.map((c) => <td key={c}>{qty(w.byCategory.find((x) => x.key === c).units)}</td>)}<td><b>{qty(w.units)}</b></td>
                  <td>{[w.low && `${w.low} bajo mínimo`, w.expired && `${w.expired} vencidos`, w.expiringSoon && `${w.expiringSoon} por vencer`].filter(Boolean).join(' · ') || 'OK'}</td></tr>
              ))}</tbody>
            </table>
          </section>
        )}

        {cats.map((c, n) => (
          <section key={c} className="cy-section ev-table-section">
            <h3 className="cy-section-title">{n + 1}. {CATEGORY_PLURAL[c]}</h3>
            <table className="ev-table">
              <thead><tr><th>Código · nombre</th>{COLUMNS[c].map(([l]) => <th key={l}>{l}</th>)}<th>Unidad</th><th>Registro INVIMA</th><th>Lote</th><th>Vence</th>{!bodega && <th>Bodega</th>}<th>Existencia</th></tr></thead>
              <tbody>{lines.filter((l) => l.product.category === c).map((l) => (
                <tr key={l.id} className={l.expired ? 'po-bad' : ''}>
                  <td><b>{l.product.name}</b><div className="vs-parts">{l.product.code}</div></td>
                  {COLUMNS[c].map(([lbl, get]) => <td key={lbl}>{get(l.product) || '—'}</td>)}
                  <td>{l.product.unitLabel}</td>
                  <td>{l.product.registroInvima || '—'}</td>
                  <td style={{ fontFamily: 'monospace' }}>{l.lot || '—'}</td>
                  <td>{l.expiryDate ? <span className={`badge ${l.expired ? 'bad' : l.expiringSoon ? 'warn' : ''}`}>{fmtDay(l.expiryDate)}</span> : '—'}</td>
                  {!bodega && <td>{l.warehouseName}</td>}
                  <td><b>{qty(l.stock)}</b></td>
                </tr>
              ))}</tbody>
            </table>
          </section>
        ))}
        {cats.length === 0 && <p className="ev-complete">Sin existencias con estos filtros.</p>}

        <section className="cy-signatures" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <SignBlock doc={doc} slot="genero" label="Generó el reporte" name={user.fullName} />
          <SignBlock doc={doc} slot="responsable" label="Responsable de la bodega" />
        </section>
        <footer className="cy-sheet-footer"><span>{settings.ipsName} · Inventario {whName || 'consolidado'}</span><span>Impreso el {printedAt}</span></footer>
      </article>
    </div>
  )
}

export default InventorySheet
