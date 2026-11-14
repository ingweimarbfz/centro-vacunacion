import React, { useEffect, useState } from 'react'
import { MdPrint, MdErrorOutline, MdDownload, MdAssessment } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { PageHead, Card, Spinner } from '../../components/ui'
import '../../components/cytology.css'

const REPORTS = {
  matriculados: { label: 'Estudiantes matriculados', needs: ['programa', 'grupo', 'periodo'] },
  asistencia: { label: 'Consolidado de asistencia por grupo', needs: ['grupo'], required: 'grupo' },
  notas: { label: 'Consolidado de notas por grupo', needs: ['grupo'], required: 'grupo' },
  cartera: { label: 'Cartera por cobrar', needs: ['programa'] },
  horas: { label: 'Horas dictadas por docente', needs: ['desde', 'hasta'] },
  siet: { label: 'Reporte de matrícula para el SIET', needs: ['periodo'] }
}
const csvCell = (v) => { const s = String(v ?? ''); return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s }

// Reportes del módulo de Educación: se imprimen o se guardan en PDF con el logo de la institución; el SIET y cualquier
// reporte también se descargan en CSV (separado por punto y coma, para abrir en Excel).
const ReportsPage = () => {
  const { logo, settings } = useSettings()
  const [tipo, setTipo] = useState('matriculados')
  const [f, setF] = useState({ programa: '', grupo: '', periodo: '', desde: '', hasta: '' })
  const [programs, setPrograms] = useState([]); const [groups, setGroups] = useState([])
  const [d, setD] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { api.get('/academico/programas').then(({ data }) => setPrograms(data)).catch(() => {}); api.get('/academico/grupos').then(({ data }) => setGroups(data)).catch(() => {}) }, [])
  const R = REPORTS[tipo]
  const run = async () => {
    setError(''); setD(null)
    if (R.required && !f[R.required]) return setError('Elige el grupo.')
    setBusy(true)
    try { const params = Object.fromEntries(R.needs.filter((k) => f[k]).map((k) => [k, f[k]])); const { data } = await api.get(`/academico/reportes/${tipo}`, { params, noCache: true }); setD(data) } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  useEffect(() => { setD(null) }, [tipo])
  const csv = () => {
    const text = [d.columns, ...d.rows].map((r) => r.map(csvCell).join(';')).join('\r\n')
    const blob = new Blob([`﻿${text}`], { type: 'text/csv;charset=utf-8' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${d.title.replace(/[^\w\sáéíóúñ-]/gi, '').replace(/\s+/g, '_')}.csv`; a.click(); URL.revokeObjectURL(a.href)
  }
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  return (
    <>
      <div className="no-print">
        <PageHead title="Reportes" subtitle="Reportes del instituto en PDF (imprimir o guardar) y en CSV, incluido el reporte de matrícula para el SIET" />
        <Card icon={<MdAssessment style={{ color: 'var(--brand)' }} />} title="Generar reporte">
          <div className="form-grid">
            <div className="field"><label>Reporte</label><select value={tipo} onChange={(e) => setTipo(e.target.value)}>{Object.entries(REPORTS).map(([k, r]) => <option key={k} value={k}>{r.label}</option>)}</select></div>
            {R.needs.includes('programa') && <div className="field"><label>Programa</label><select value={f.programa} onChange={set('programa')}><option value="">Todos</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>}
            {R.needs.includes('grupo') && <div className="field"><label>Grupo {R.required === 'grupo' && <span className="req">*</span>}</label><select value={f.grupo} onChange={set('grupo')}><option value="">{R.required ? 'Selecciona…' : 'Todos'}</option>{groups.filter((g) => !f.programa || g.programId === Number(f.programa)).map((g) => <option key={g.id} value={g.id}>{g.code} · {g.program?.name}</option>)}</select></div>}
            {R.needs.includes('periodo') && <div className="field"><label>Periodo académico</label><input value={f.periodo} onChange={set('periodo')} placeholder="Ej. 2026-2 (vacío: todos)" /></div>}
            {R.needs.includes('desde') && <div className="field"><label>Desde</label><input type="date" value={f.desde} onChange={set('desde')} /></div>}
            {R.needs.includes('hasta') && <div className="field"><label>Hasta</label><input type="date" value={f.hasta} onChange={set('hasta')} /></div>}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 14, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-primary" onClick={run} disabled={busy}>{busy ? <Spinner /> : <MdAssessment />} Generar</button>
            {d && <button type="button" className="btn btn-outline" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>}
            {d && <button type="button" className="btn btn-outline" onClick={csv}><MdDownload /> Descargar CSV</button>}
          </div>
          {tipo === 'siet' && <div className="alert info" style={{ marginTop: 12 }}><span>Base para el cargue de matrícula al SIET del Ministerio de Educación. Revisa el orden de las columnas contra la plantilla vigente antes de cargarlo.</span></div>}
          {error && <div className="alert bad" style={{ marginTop: 12 }}><MdErrorOutline /><span>{error}</span></div>}
        </Card>
      </div>
      {d && (
        <article className={`cy-sheet ${d.columns.length > 8 ? 'sheet-landscape sheet-compact' : ''}`} style={{ marginTop: 18 }}>
          <header className="cy-sheet-header">
            <img className="cy-logo" src={settings?.eduLogoUrl || logo} alt={d.institution} />
            <div className="cy-sheet-heading"><p className="cy-kicker">{d.institution}</p><h2>{d.title}</h2>{d.subtitle && <div style={{ fontSize: 12 }}>{d.subtitle}</div>}</div>
            <dl className="cy-meta"><div><dt>Generado</dt><dd>{new Date(d.generatedAt).toLocaleDateString('es-CO')}</dd></div><div><dt>Registros</dt><dd>{d.rows.length}</dd></div></dl>
          </header>
          <div style={{ overflowX: 'auto' }}>
            <table className="table" style={{ fontSize: 11.5, marginTop: '4mm' }}>
              <thead><tr>{d.columns.map((c) => <th key={c}>{c}</th>)}</tr></thead>
              <tbody>{d.rows.length === 0 ? <tr><td colSpan={d.columns.length} style={{ color: 'var(--muted)' }}>Sin registros.</td></tr> : d.rows.map((r, i) => <tr key={i}>{r.map((v, j) => <td key={j} style={{ whiteSpace: 'normal' }}>{v}</td>)}</tr>)}</tbody>
            </table>
          </div>
          {d.totals?.length > 0 && <p style={{ margin: '3mm 0 0', fontWeight: 600 }}>{d.totals.join(' · ')}</p>}
          <footer className="cy-sheet-footer"><span>{d.institution}</span><span>{d.title}</span></footer>
        </article>
      )}
    </>
  )
}

export default ReportsPage
