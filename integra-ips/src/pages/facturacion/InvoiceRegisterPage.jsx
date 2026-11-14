import React, { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdReceiptLong, MdErrorOutline, MdDownload, MdPrint, MdSearch, MdOpenInNew, MdBlock, MdAttachMoney, MdHourglassBottom } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import '../../components/cytology.css'

// Libro de facturas emitidas. scope="todas": Facturación (IPS y Educación comparten el consecutivo FV);
// scope="educacion": solo las facturas de matrículas y convenios de Educación.
const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const csvCell = (v) => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }
const TONE = { ok: 'ok', bad: 'bad', warn: 'warn', info: 'info' }

const InvoiceRegister = ({ scope = 'todas' }) => {
  const edu = scope === 'educacion'
  const { logo, settings } = useSettings()
  const [f, setF] = useState({ desde: `${todayISO().slice(0, 4)}-01-01`, hasta: todayISO(), origen: '', tipo: '', estado: '', q: '', programa: '' })
  const [rows, setRows] = useState(null); const [error, setError] = useState('')
  useEffect(() => {
    setRows(null); setError('')
    api.get(edu ? '/academico/facturas' : '/facturacion/facturas-emitidas', { params: { desde: f.desde || undefined, hasta: f.hasta || undefined }, noCache: true })
      .then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e)))
  }, [edu, f.desde, f.hasta])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const programs = useMemo(() => [...new Set((rows || []).map((r) => r.program).filter(Boolean))].sort(), [rows])
  const kinds = useMemo(() => [...new Map((rows || []).map((r) => [r.kindLabel, r.kindLabel])).keys()].sort(), [rows])
  const list = useMemo(() => {
    const q = f.q.trim().toLowerCase()
    return (rows || []).filter((r) => (!f.origen || r.origin === f.origen) && (!f.tipo || r.kindLabel === f.tipo) && (!f.estado || r.status === f.estado) && (!f.programa || r.program === f.programa)
      && (!q || [r.number, r.customer, r.customerDoc, r.concept].some((v) => v && String(v).toLowerCase().includes(q))))
  }, [rows, f])
  const valid = list.filter((r) => r.status === 'vigente')
  const totals = { count: valid.length, total: valid.reduce((a, r) => a + (r.total || 0), 0), voided: list.length - valid.length, pending: valid.reduce((a, r) => a + (r.balance || 0), 0), ips: valid.filter((r) => r.origin === 'ips').reduce((a, r) => a + (r.total || 0), 0), edu: valid.filter((r) => r.origin === 'educacion').reduce((a, r) => a + (r.total || 0), 0) }
  const csv = () => {
    const head = ['Número', 'Fecha', ...(edu ? [] : ['Origen']), 'Tipo', 'Cliente', 'Documento', 'Concepto', 'Sede', 'Subtotal', 'Descuentos', 'IVA', 'Total', 'Estado', 'Pago', 'Motivo de anulación']
    const body = list.map((r) => [r.number, r.issuedAt, ...(edu ? [] : [r.originLabel]), r.kindLabel, r.customer, r.customerDoc, r.concept, r.site || '', r.subtotal ?? '', r.discount ?? '', r.iva ?? '', r.total ?? '', r.status === 'anulada' ? 'Anulada' : 'Vigente', r.payment?.label || '', r.voidReason || ''])
    const blob = new Blob([`﻿${[head, ...body].map((x) => x.map(csvCell).join(';')).join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Facturas_${edu ? 'educacion_' : ''}${f.desde || 'inicio'}_${f.hasta || 'hoy'}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }
  const kpi = (icon, label, value, foot, tone = '') => <div className="card kpi"><div className="kpi-top"><span className="kpi-label">{label}</span><span className={`kpi-icon ${tone}`}>{icon}</span></div><div className="kpi-value" style={{ fontSize: 22 }}>{value}</div>{foot && <div className="kpi-foot">{foot}</div>}</div>
  return (
    <>
      <div className="no-print">
        <PageHead title={edu ? 'Facturas de educación' : 'Facturas emitidas'} subtitle={edu ? 'Facturas de matrículas (al estudiante) y de convenios, con su estado de pago' : 'Libro de facturas del consecutivo FV: servicios de IPS y, si aplica, matrículas y convenios de Educación'}>
          <button type="button" className="btn btn-outline" onClick={() => window.print()} disabled={!rows}><MdPrint /> Imprimir / PDF</button>
          <button type="button" className="btn btn-primary" onClick={csv} disabled={!list.length}><MdDownload /> Descargar CSV</button>
        </PageHead>
        <div className="grid grid-kpi" style={{ marginBottom: 16 }}>
          {kpi(<MdReceiptLong />, 'Facturas vigentes', totals.count, `${totals.voided} anulada${totals.voided === 1 ? '' : 's'} en el periodo`)}
          {kpi(<MdAttachMoney />, 'Total facturado', formatMoney(totals.total), edu ? 'Facturas vigentes del periodo' : `IPS ${formatMoney(totals.ips)} · Educación ${formatMoney(totals.edu)}`, 'ok')}
          {edu && kpi(<MdHourglassBottom />, 'Saldo por cobrar', formatMoney(totals.pending), 'Estudiantes y convenios', 'warn')}
          {kpi(<MdBlock />, 'Anuladas', totals.voided, 'El número queda registrado como anulado', 'bad')}
        </div>
        <Card>
          <div className="form-grid">
            <div className="field"><label>Desde</label><input type="date" value={f.desde} onChange={set('desde')} /></div>
            <div className="field"><label>Hasta</label><input type="date" value={f.hasta} onChange={set('hasta')} /></div>
            {!edu && <div className="field"><label>Origen</label><select value={f.origen} onChange={set('origen')}><option value="">IPS y Educación</option><option value="ips">IPS (servicios)</option><option value="educacion">Educación</option></select></div>}
            <div className="field"><label>Tipo</label><select value={f.tipo} onChange={set('tipo')}><option value="">Todos</option>{kinds.map((k) => <option key={k}>{k}</option>)}</select></div>
            <div className="field"><label>Estado</label><select value={f.estado} onChange={set('estado')}><option value="">Vigentes y anuladas</option><option value="vigente">Vigentes</option><option value="anulada">Anuladas</option></select></div>
            {programs.length > 0 && <div className="field"><label>Programa</label><select value={f.programa} onChange={set('programa')}><option value="">Todos</option>{programs.map((p) => <option key={p}>{p}</option>)}</select></div>}
            <div className="field"><label>Buscar</label><div style={{ position: 'relative' }}><MdSearch style={{ position: 'absolute', left: 10, top: 12, color: 'var(--muted)' }} /><input style={{ paddingLeft: 32 }} value={f.q} onChange={set('q')} placeholder="Número, cliente, documento o concepto" /></div></div>
          </div>
        </Card>
      </div>
      {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? (!error && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>) : (
        <div style={{ marginTop: 16 }} className="no-print"><Card flush title={`${list.length} factura${list.length === 1 ? '' : 's'}`} subtitle={`${f.desde ? formatDate(f.desde) : 'Inicio'} a ${f.hasta ? formatDate(f.hasta) : 'hoy'} · ${totals.count} vigentes · ${formatMoney(totals.total)}`}>
          {list.length === 0 ? <Empty icon={<MdReceiptLong />}>No hay facturas con estos filtros.</Empty> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Número</th><th>Fecha</th>{!edu && <th>Origen</th>}<th>Tipo</th><th>Cliente</th><th>Concepto</th><th className="num">Total</th><th>Estado / pago</th><th className="actions no-print" /></tr></thead>
                <tbody>{list.map((r) => (
                  <tr key={r.key} style={r.status === 'anulada' ? { opacity: 0.6 } : undefined}>
                    <td style={{ whiteSpace: 'nowrap' }}><b style={r.status === 'anulada' ? { textDecoration: 'line-through' } : undefined}>{r.number}</b></td>
                    <td>{formatDate(r.issuedAt)}</td>
                    {!edu && <td><span className={`badge ${r.origin === 'educacion' ? 'info' : ''}`}>{r.originLabel}</span></td>}
                    <td style={{ whiteSpace: 'normal', fontSize: 12.5, minWidth: 110 }}>{r.kindLabel}</td>
                    <td style={{ whiteSpace: 'normal', minWidth: 170 }}><b>{r.customer}</b>{r.customerDoc && <div className="hint">{r.customerDoc}</div>}</td>
                    <td style={{ whiteSpace: 'normal', fontSize: 12.5, minWidth: 230, maxWidth: 360 }}>{r.concept}{r.site ? <div className="hint">{r.site}</div> : null}</td>
                    <td className="num">{r.total == null ? '—' : formatMoney(r.total)}</td>
                    <td style={{ whiteSpace: 'normal', minWidth: 150 }}><span className={`badge ${TONE[r.payment?.tone] || ''}`}>{r.payment?.label}</span>{r.voidReason && <div className="hint">{r.voidReason}</div>}</td>
                    <td className="actions no-print">{r.href && <Link className="btn btn-ghost btn-icon" to={r.href} aria-label={`Abrir factura ${r.number}`} title="Ver e imprimir"><MdOpenInNew /></Link>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card></div>
      )}
      {rows && (
        <article className="cy-sheet sheet-landscape sheet-compact ir-print">
          <style>{'@media print { @page { size: letter landscape; margin: 8mm; } }'}</style>
          <header className="cy-sheet-header">
            <img className="cy-logo" src={(edu && settings?.eduLogoUrl) || logo} alt={settings?.ipsName || ''} />
            <div className="cy-sheet-heading"><p className="cy-kicker">{settings?.ipsName}</p><h2>{edu ? 'Facturas de educación' : 'Libro de facturas emitidas'}</h2><div style={{ fontSize: 11 }}>{f.desde ? formatDate(f.desde) : 'Inicio'} a {f.hasta ? formatDate(f.hasta) : 'hoy'}{f.origen ? ` · ${f.origen === 'ips' ? 'IPS' : 'Educación'}` : ''}{f.tipo ? ` · ${f.tipo}` : ''}{f.estado ? ` · ${f.estado === 'vigente' ? 'Vigentes' : 'Anuladas'}` : ''}{f.programa ? ` · ${f.programa}` : ''}{f.q ? ` · “${f.q}”` : ''}</div></div>
            <dl className="cy-meta"><div><dt>Vigentes</dt><dd>{totals.count}</dd></div><div><dt>Total</dt><dd>{formatMoney(totals.total)}</dd></div><div><dt>Anuladas</dt><dd>{totals.voided}</dd></div>{edu && <div><dt>Por cobrar</dt><dd>{formatMoney(totals.pending)}</dd></div>}</dl>
          </header>
          <table className="ev-table" style={{ marginTop: '3mm' }}>
            <thead><tr><th>Número</th><th>Fecha</th>{!edu && <th>Origen</th>}<th>Tipo</th><th>Cliente</th><th>Documento</th><th>Concepto</th><th style={{ textAlign: 'right' }}>Subtotal</th><th style={{ textAlign: 'right' }}>Desc.</th><th style={{ textAlign: 'right' }}>IVA</th><th style={{ textAlign: 'right' }}>Total</th><th>Estado / pago</th></tr></thead>
            <tbody>{list.map((r) => (
              <tr key={r.key}>
                <td style={{ whiteSpace: 'nowrap', fontWeight: 700, textDecoration: r.status === 'anulada' ? 'line-through' : 'none' }}>{r.number}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{formatDate(r.issuedAt)}</td>
                {!edu && <td>{r.originLabel}</td>}
                <td>{r.kindLabel}</td><td>{r.customer}</td><td style={{ whiteSpace: 'nowrap' }}>{r.customerDoc}</td>
                <td>{r.concept}{r.site ? ` · ${r.site}` : ''}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.subtotal == null ? '—' : formatMoney(r.subtotal)}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.discount ? formatMoney(r.discount) : '—'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>{r.iva ? formatMoney(r.iva) : '—'}</td>
                <td style={{ textAlign: 'right', whiteSpace: 'nowrap', fontWeight: 700 }}>{r.total == null ? '—' : formatMoney(r.total)}</td>
                <td>{r.payment?.label}{r.voidReason ? ` · ${r.voidReason}` : ''}</td>
              </tr>
            ))}</tbody>
            <tfoot><tr><td colSpan={edu ? 9 : 10} style={{ textAlign: 'right', fontWeight: 700, borderTop: '1.5px solid #111' }}>Total vigentes</td><td style={{ textAlign: 'right', fontWeight: 700, borderTop: '1.5px solid #111', whiteSpace: 'nowrap' }}>{formatMoney(totals.total)}</td><td style={{ borderTop: '1.5px solid #111' }} /></tr></tfoot>
          </table>
          <footer className="cy-sheet-footer"><span>{settings?.ipsName}</span><span>Generado el {formatDate(todayISO())}</span></footer>
        </article>
      )}
    </>
  )
}

export const InvoiceRegisterPage = () => <InvoiceRegister scope="todas" />
export const EduInvoiceRegisterPage = () => <InvoiceRegister scope="educacion" />
export default InvoiceRegisterPage
