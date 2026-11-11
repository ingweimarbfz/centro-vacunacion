import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MdPrint, MdSearch, MdGroups, MdErrorOutline, MdGridOn } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { Spinner } from '../../components/ui'
import { fmt, printedAt, useCatalogs } from './common'
import FormatHeader from './FormatHeader'
import '../../components/cytology.css'

const year = (iso) => (iso ? iso.slice(0, 4) : '')
const TONE = { vigente: 'ok', por_vencer: 'warn', vencido: 'bad' }

// Herramienta única de control de talento humano (estructura del listado de la IPS). Imprime en horizontal y exporta a Excel.
const ThListado = () => {
  const { settings } = useSettings()
  const cat = useCatalogs()
  const [f, setF] = useState({ cargo: '', estado: 'activos', servicio: '' })
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const tableRef = useRef(null)
  const load = useCallback(async (x) => {
    setLoading(true); setError('')
    try { const { data } = await api.get('/estandares/th/personal', { params: { cargo: x.cargo || undefined, estado: x.estado || undefined, servicio: x.servicio || undefined } }); setRows(data) } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(f) }, [load])
  useEffect(() => {
    const st = document.createElement('style')
    st.textContent = '@media print { @page { size: legal landscape; margin: 7mm; } }'
    document.head.appendChild(st)
    const p = document.title; document.title = 'Listado_talento_humano'
    return () => { st.remove(); document.title = p }
  }, [])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const listed = useMemo(() => (cat?.requirements || []).filter((r) => r.inListado && r.active), [cat])
  const courses = listed.filter((r) => r.category !== 'documentos')
  const vaccine = listed.filter((r) => r.category === 'documentos')

  // Excel: tabla HTML con el formato, que Excel abre conservando los encabezados agrupados.
  const exportExcel = () => {
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>
      <h3>${settings.ipsName} · HERRAMIENTA ÚNICA – CONTROL DE TALENTO HUMANO IPS</h3>${tableRef.current.outerHTML}</body></html>`
    const blob = new Blob(['﻿', html], { type: 'application/vnd.ms-excel' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Listado_talento_humano_${new Date().toISOString().slice(0, 10)}.xls`; a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 2000)
  }
  const cell = (c) => (c ? <span className={`th-c ${TONE[c.status] || ''}`}>{fmt(c.issueDate)}</span> : '')

  return (
    <div className="cy-detail-page vr-page th-landscape">
      <div className="card no-print vr-filters">
        <div className="vr-filters-head"><MdGroups /> <strong>Listado de talento humano</strong></div>
        <form className="form-grid" style={{ alignItems: 'end' }} onSubmit={(e) => { e.preventDefault(); load(f) }}>
          <div className="field"><label>Cargo</label><select value={f.cargo} onChange={set('cargo')}><option value="">Todos</option>{(cat?.positions || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="field"><label>Servicio asignado</label><select value={f.servicio} onChange={set('servicio')}><option value="">Todos</option>{(cat?.services || []).map((p) => <option key={p} value={p}>{p}</option>)}</select></div>
          <div className="field"><label>Estado</label><select value={f.estado} onChange={set('estado')}><option value="activos">Activos y por eventos</option><option value="activo">Activos</option><option value="por_eventos">Por eventos</option><option value="inactivos">Inactivos</option><option value="">Todos</option></select></div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="submit" className="btn btn-dark" disabled={loading}>{loading ? <Spinner /> : <MdSearch />} Generar</button>
            <button type="button" className="btn btn-outline" onClick={exportExcel} disabled={!rows?.length}><MdGridOn /> Excel</button>
            <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={!rows}><MdPrint /> PDF</button>
          </div>
        </form>
      </div>
      {error && <div className="alert bad no-print"><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? <div className="splash"><Spinner /></div> : (
        <article className="cy-sheet ev-sheet th-wide">
          <FormatHeader format={cat?.formats?.listado} title="Herramienta única – Control de talento humano IPS" extra={<span>{rows.length} personas</span>} />
          <div className="th-scroll">
            <table className="th-ctl" ref={tableRef}>
              <thead>
                <tr>
                  <th rowSpan={2}>#</th>
                  <th colSpan={6} className="g1">IDENTIFICACIÓN</th>
                  <th colSpan={7} className="g2">VINCULACIÓN</th>
                  <th colSpan={4} className="g3">FORMACIÓN</th>
                  <th colSpan={3} className="g4">HABILITACIÓN LEGAL</th>
                  {courses.length > 0 && <th colSpan={courses.length} className="g5">CURSOS OBLIGATORIOS (CONTROL ÚNICO)</th>}
                  {vaccine.length > 0 && <th colSpan={vaccine.length} className="g6">VACUNACIÓN</th>}
                  <th rowSpan={2}>Requisitos</th>
                  <th rowSpan={2}>Observación</th>
                </tr>
                <tr>
                  {['Nombre completo', 'Tipo doc', 'Nº documento', 'Fecha de nacimiento', 'Teléfono', 'Correo electrónico',
                    'Cargo', 'Profesión', 'Especialidad', 'Servicio asignado', 'Tipo vinculación', 'Fecha ingreso', 'Estado',
                    'Nivel máximo de formación', 'Título obtenido', 'Institución educativa', 'Año de graduación',
                    'Nº tarjeta', 'ReTHUS', 'Fecha verif. ReTHUS'].map((h) => <th key={h}>{h}</th>)}
                  {courses.map((r) => <th key={r.id}>{r.listadoLabel || r.name}</th>)}
                  {vaccine.map((r) => <th key={r.id}>{r.listadoLabel || r.name}</th>)}
                </tr>
              </thead>
              <tbody>{rows.length === 0 ? <tr><td colSpan={30} className="ev-empty">No hay personal con esos filtros.</td></tr> : rows.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td><td><b>{r.fullName.toUpperCase()}</b></td><td>{r.documentType}</td><td>{r.document}</td><td>{fmt(r.birthDate)}</td><td>{r.phone || ''}</td><td>{r.email || ''}</td>
                  <td>{r.positionName || ''}</td><td>{r.profession || ''}</td><td>{r.specialty || ''}</td><td>{r.assignedService || ''}</td><td>{r.contract?.contractTypeLabel || ''}</td><td>{fmt(r.hireDate || r.contract?.startDate)}</td><td>{r.statusLabel}</td>
                  <td>{r.educationLevel || ''}</td><td>{r.degreeTitle || ''}</td><td>{r.institution || ''}</td><td>{r.graduationYear || ''}</td>
                  <td>{r.professionalCard || ''}</td><td>{r.rethus || ''}</td><td>{fmt(r.rethusVerifiedAt)}</td>
                  {courses.map((c) => <td key={c.id}>{cell(r.courses?.[c.id])}</td>)}
                  {vaccine.map((c) => <td key={c.id}>{r.courses?.[c.id] ? `SÍ ${year(r.courses[c.id].issueDate)}` : ''}</td>)}
                  <td><b>{r.compliance.percent}%</b></td>
                  <td>{r.notes || ''}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
          <footer className="cy-sheet-footer"><span>{settings.ipsName} · Control de talento humano · fechas = expedición del último soporte</span><span>Impreso el {printedAt()}</span></footer>
        </article>
      )}
    </div>
  )
}

export default ThListado
