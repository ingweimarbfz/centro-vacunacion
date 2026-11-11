import React, { useCallback, useEffect, useState } from 'react'
import { MdPrint, MdSearch, MdGroups, MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { Spinner } from '../../components/ui'
import { CONTRACT_STATUS, StatusBadge, fmt, printedAt, useCatalogs } from './common'
import '../../components/cytology.css'

// Listado del talento humano contratado (formato imprimible en horizontal).
const ThListado = () => {
  const { logo, settings } = useSettings()
  const cat = useCatalogs()
  const [f, setF] = useState({ cargo: '', estado: 'activos' })
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const load = useCallback(async (x) => {
    setLoading(true); setError('')
    try { const { data } = await api.get('/estandares/th/personal', { params: { cargo: x.cargo || undefined, estado: x.estado || undefined } }); setRows(data) } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(f) }, [load])
  useEffect(() => {
    const st = document.createElement('style')
    st.textContent = '@media print { @page { size: letter landscape; margin: 9mm; } }'
    document.head.appendChild(st)
    const p = document.title; document.title = 'Listado_talento_humano'
    return () => { st.remove(); document.title = p }
  }, [])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })

  return (
    <div className="cy-detail-page vr-page th-landscape">
      <div className="card no-print vr-filters">
        <div className="vr-filters-head"><MdGroups /> <strong>Listado de talento humano</strong></div>
        <form className="form-grid" style={{ alignItems: 'end' }} onSubmit={(e) => { e.preventDefault(); load(f) }}>
          <div className="field"><label>Cargo</label><select value={f.cargo} onChange={set('cargo')}><option value="">Todos</option>{(cat?.positions || []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="field"><label>Estado</label><select value={f.estado} onChange={set('estado')}><option value="activos">Activos</option><option value="inactivos">Inactivos</option><option value="">Todos</option></select></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-dark" disabled={loading}>{loading ? <Spinner /> : <MdSearch />} Generar</button>
            <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={!rows}><MdPrint /> PDF</button>
          </div>
        </form>
      </div>
      {error && <div className="alert bad no-print"><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? <div className="splash"><Spinner /></div> : (
        <article className="cy-sheet ev-sheet">
          <header className="cy-sheet-header">
            <img src={logo} alt={settings.ipsName} className="cy-logo" />
            <div className="cy-sheet-heading">
              <p className="cy-kicker">{settings.shortName} · Estándar de talento humano</p>
              <h2>Listado de talento humano</h2>
            </div>
            <dl className="cy-meta">
              <div><dt>Personas</dt><dd>{rows.length}</dd></div>
              <div><dt>Cargo</dt><dd>{cat?.positions.find((p) => String(p.id) === f.cargo)?.name || 'Todos'}</dd></div>
              <div><dt>Estado</dt><dd>{f.estado === 'activos' ? 'Activos' : f.estado === 'inactivos' ? 'Inactivos' : 'Todos'}</dd></div>
            </dl>
          </header>
          <section className="cy-section ev-table-section">
            {rows.length === 0 ? <p className="ev-empty">No hay personal con esos filtros.</p> : (
              <table className="ev-table th-list-table">
                <thead><tr><th>#</th><th>Nombre</th><th>Documento</th><th>Cargo / profesión</th><th>Tarjeta prof. / ReTHUS</th><th>Sede</th><th>Vinculación</th><th>Inicio</th><th>Fin</th><th>Estado</th><th>Req.</th><th>Teléfono</th></tr></thead>
                <tbody>{rows.map((r, i) => (
                  <tr key={r.id}>
                    <td>{i + 1}</td><td><b>{r.fullName}</b></td><td>{r.documentType} {r.document}</td>
                    <td>{r.positionName || '—'}{r.profession ? <div className="vs-parts">{r.profession}</div> : null}</td>
                    <td>{[r.professionalCard, r.rethus].filter(Boolean).join(' / ') || '—'}</td><td>{r.siteName}</td>
                    <td>{r.contract?.contractTypeLabel || '—'}</td><td>{fmt(r.contract?.startDate)}</td><td>{r.contract ? (r.contract.endDate ? fmt(r.contract.endDate) : 'Indef.') : '—'}</td>
                    <td><StatusBadge status={r.contract?.status || 'sin_contrato'} map={CONTRACT_STATUS} /></td>
                    <td><b>{r.compliance.percent}%</b></td><td>{r.phone || '—'}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </section>
          <footer className="cy-sheet-footer"><span>{settings.ipsName} · Listado de talento humano</span><span>Impreso el {printedAt()}</span></footer>
        </article>
      )}
    </div>
  )
}

export default ThListado
