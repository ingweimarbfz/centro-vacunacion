import React, { useCallback, useEffect, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, PieChart, Pie, Cell, Legend } from 'recharts'
import { MdSearch, MdPrint, MdErrorOutline, MdInsights } from 'react-icons/md'
import api, { errorMessage, getSiteFilter } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { Spinner, Empty } from '../../components/ui'
import { SITE_TYPES } from '../../utils/permissions'
import { AGRUPACIONES } from './common'
import '../../components/cytology.css'

const PALETTE = ['#E30613', '#1F2A44', '#0EA5A4', '#F59E0B', '#6366F1', '#94A3B8', '#EC4899', '#84CC16']
const INS_COLOR = { 'Vigente': '#16A34A', 'Vence en 30 días': '#F59E0B', 'Vencido': '#DC2626', 'Sin seguro': '#94A3B8' }
const axis = { fontSize: 10.5, fill: '#4B5563' }
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const firstOfYear = () => `${today().slice(0, 4)}-01-01`
const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '—')
const INS_BADGE = { vigente: ['Vigente', 'ok'], por_vencer: ['Por vencer', 'warn'], vencido: ['Vencido', 'bad'], sin_seguro: ['Sin seguro', ''] }

const ChartBox = ({ title, children, wide }) => (
  <div className={`vr-chart${wide ? ' wide' : ''}`}>
    <h4>{title}</h4>
    <div style={{ width: '100%', height: 210 }}>{children}</div>
  </div>
)

// Reporte general de voluntarios: filtros, gráficas tipo dashboard, tabla e impresión en PDF.
const VolunteerReport = () => {
  const { user } = useAuth()
  const { logo, settings } = useSettings()
  const admin = user.role === 'administrador'
  const [sites, setSites] = useState([])
  const [f, setF] = useState({ desde: firstOfYear(), hasta: today(), agrupacion: '', tipoSede: '', sede: admin ? String(getSiteFilter() || '') : '', tipo: '', estado: 'activos' })
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  useEffect(() => { if (admin) api.get('/sedes', { params: { sede: undefined } }).then(({ data: d }) => setSites(d)).catch(() => {}) }, [admin])
  const load = useCallback(async (x) => {
    setError(''); setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(x).filter(([, v]) => v))
      const { data: d } = await api.get('/socorro/reporte-voluntarios', { params: { sede: undefined, ...params } })
      setData(d)
    } catch (e) { setError(errorMessage(e)) } finally { setLoading(false) }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(f) }, [load])
  useEffect(() => { const p = document.title; document.title = `Reporte_voluntarios_${f.desde}_${f.hasta}`; return () => { document.title = p } }, [f.desde, f.hasta])
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value, ...(k === 'tipoSede' ? { sede: '' } : {}) })
  const siteName = sites.find((s) => String(s.id) === f.sede)?.name
  const scope = [
    admin ? (siteName || (f.tipoSede ? `Todas las sedes tipo ${SITE_TYPES[f.tipoSede].toLowerCase()}` : 'Todas las sedes')) : (user.site?.name || ''),
    f.agrupacion || 'Todas las agrupaciones',
    f.tipo ? `Voluntarios de ${f.tipo}` : null,
    f.estado === 'activos' ? 'Activos' : f.estado === 'inactivos' ? 'Inactivos' : 'Activos e inactivos'
  ].filter(Boolean).join(' · ')
  const printedAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())

  return (
    <div className="cy-detail-page vr-page">
      <div className="card no-print vr-filters">
        <div className="vr-filters-head"><MdInsights /> <strong>Reporte general de voluntarios</strong></div>
        <form className="form-grid" style={{ alignItems: 'end' }} onSubmit={(e) => { e.preventDefault(); load(f) }}>
          <div className="field"><label>Desde</label><input type="date" value={f.desde} max={f.hasta} onChange={set('desde')} /></div>
          <div className="field"><label>Hasta</label><input type="date" value={f.hasta} max={today()} onChange={set('hasta')} /></div>
          <div className="field"><label>Agrupación</label><select value={f.agrupacion} onChange={set('agrupacion')}><option value="">Todas</option>{AGRUPACIONES.map((a) => <option key={a} value={a}>{a}</option>)}</select></div>
          {admin && <div className="field"><label>Tipo de sede</label><select value={f.tipoSede} onChange={set('tipoSede')}><option value="">Todas</option>{Object.entries(SITE_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>}
          {admin && <div className="field"><label>Sede</label><select value={f.sede} onChange={set('sede')}><option value="">Todas</option>{sites.filter((s) => !f.tipoSede || s.type === f.tipoSede).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
          <div className="field"><label>Tipo de voluntario</label><select value={f.tipo} onChange={set('tipo')}><option value="">Todos</option><option value="base">Base</option><option value="apoyo">Apoyo</option></select></div>
          <div className="field"><label>Estado</label><select value={f.estado} onChange={set('estado')}><option value="">Todos</option><option value="activos">Activos</option><option value="inactivos">Inactivos</option></select></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-dark" disabled={loading}>{loading ? <Spinner /> : <MdSearch />} Generar</button>
            <button type="button" className="btn btn-primary" onClick={() => window.print()} disabled={!data}><MdPrint /> PDF</button>
          </div>
        </form>
      </div>
      {error && <div className="alert bad no-print" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      {!data && !error && <div className="splash" style={{ minHeight: 240 }}><Spinner /> Generando…</div>}

      {data && (
        <article className="cy-sheet ev-sheet vr-sheet">
          <header className="cy-sheet-header">
            <img src={logo} alt={settings.ipsName} className="cy-logo" />
            <div className="cy-sheet-heading">
              <p className="cy-kicker">Operaciones Generales · Voluntariado</p>
              <h2>Reporte general de voluntarios</h2>
              <p className="ev-formats">{scope} · del {fmt(data.filters.desde)} al {fmt(data.filters.hasta)}</p>
            </div>
            <dl className="cy-meta">
              <div><dt>Voluntarios</dt><dd>{data.kpis.total}</dd></div>
              <div><dt>Horas</dt><dd>{data.kpis.hours}</dd></div>
              <div><dt>Eventos</dt><dd>{data.kpis.events}</dd></div>
            </dl>
          </header>

          <div className="tr-km" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginTop: '4mm' }}>
            <div><span>Activos</span><strong>{data.kpis.active}</strong></div>
            <div><span>Inactivos</span><strong>{data.kpis.inactive}</strong></div>
            <div><span>Base / apoyo</span><strong>{data.kpis.base} / {data.kpis.apoyo}</strong></div>
            <div><span>Participaron</span><strong>{data.kpis.participants}</strong></div>
            <div className={data.kpis.insuranceProblems ? 'hl' : ''}><span>Seguro vencido o sin seguro</span><strong>{data.kpis.insuranceProblems}</strong></div>
            <div className={data.kpis.incomplete ? 'hl' : ''}><span>Datos incompletos</span><strong>{data.kpis.incomplete}</strong></div>
          </div>

          {data.kpis.total === 0 ? <Empty icon={<MdInsights />}>No hay voluntarios con esos filtros.</Empty> : (
            <>
              <section className="cy-section">
                <h3 className="cy-section-title">Indicadores</h3>
                <div className="vr-charts">
                  <ChartBox title="Horas de voluntariado por mes" wide>
                    <ResponsiveContainer><BarChart data={data.byMonth} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="#EEF0F2" vertical={false} /><XAxis dataKey="label" tick={axis} /><YAxis tick={axis} /><Tooltip formatter={(v) => [`${v} h`, 'Horas']} />
                      <Bar dataKey="hours" fill={settings.primaryColor} radius={[5, 5, 0, 0]} isAnimationActive={false} />
                    </BarChart></ResponsiveContainer>
                  </ChartBox>
                  <ChartBox title="Voluntarios por agrupación">
                    <ResponsiveContainer><PieChart>
                      <Pie data={data.byAgrupacion} dataKey="count" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={2} isAnimationActive={false} label={({ value }) => value}>
                        {data.byAgrupacion.map((g, i) => <Cell key={g.name} fill={PALETTE[i % PALETTE.length]} />)}
                      </Pie><Legend wrapperStyle={{ fontSize: 11 }} /><Tooltip />
                    </PieChart></ResponsiveContainer>
                  </ChartBox>
                  <ChartBox title="Estado del seguro">
                    <ResponsiveContainer><PieChart>
                      <Pie data={data.byInsurance} dataKey="count" nameKey="name" innerRadius={42} outerRadius={72} paddingAngle={2} isAnimationActive={false} label={({ value }) => value}>
                        {data.byInsurance.map((g) => <Cell key={g.name} fill={INS_COLOR[g.name] || '#94A3B8'} />)}
                      </Pie><Legend wrapperStyle={{ fontSize: 11 }} /><Tooltip />
                    </PieChart></ResponsiveContainer>
                  </ChartBox>
                  <ChartBox title="Voluntarios y horas por sede" wide>
                    <ResponsiveContainer><BarChart data={data.bySite} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <CartesianGrid stroke="#EEF0F2" vertical={false} /><XAxis dataKey="name" tick={axis} tickFormatter={(n) => n.replace(/^(Grupo de Apoyo|Unidad Municipal)\s+/, '')} interval={0} /><YAxis yAxisId="a" tick={axis} /><YAxis yAxisId="b" orientation="right" tick={axis} />
                      <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar yAxisId="a" dataKey="count" name="Voluntarios" fill={settings.secondaryColor} radius={[5, 5, 0, 0]} isAnimationActive={false} />
                      <Bar yAxisId="b" dataKey="hours" name="Horas" fill="#F59E0B" radius={[5, 5, 0, 0]} isAnimationActive={false} />
                    </BarChart></ResponsiveContainer>
                  </ChartBox>
                  <ChartBox title="Top 10 por horas" wide>
                    {data.top.length === 0 ? <Empty>Sin horas en el periodo.</Empty> : (
                      <ResponsiveContainer><BarChart data={data.top} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
                        <CartesianGrid stroke="#EEF0F2" horizontal={false} /><XAxis type="number" tick={axis} /><YAxis type="category" dataKey="name" tick={axis} width={150} />
                        <Tooltip formatter={(v) => [`${v} h`, 'Horas']} /><Bar dataKey="hours" fill="#0EA5A4" radius={[0, 5, 5, 0]} isAnimationActive={false} />
                      </BarChart></ResponsiveContainer>
                    )}
                  </ChartBox>
                </div>
              </section>

              <section className="cy-section ev-table-section">
                <h3 className="cy-section-title">Resumen por agrupación</h3>
                <table className="ev-table">
                  <thead><tr><th>Agrupación</th><th>Voluntarios</th><th>Activos</th><th>Participaciones</th><th>Horas</th></tr></thead>
                  <tbody>{data.byAgrupacion.map((g) => <tr key={g.name}><td><b>{g.name}</b></td><td>{g.count}</td><td>{g.active}</td><td>{g.events}</td><td>{g.hours}</td></tr>)}</tbody>
                </table>
              </section>

              <section className="cy-section ev-table-section">
                <h3 className="cy-section-title">Detalle de voluntarios ({data.rows.length})</h3>
                <table className="ev-table">
                  <thead><tr><th>Nombre</th><th>Documento · carnet</th><th>Agrupación</th><th>Sede</th><th>Tipo</th><th>Estado</th><th>Seguro</th><th>Eventos</th><th>Horas</th></tr></thead>
                  <tbody>{data.rows.map((r) => {
                    const [il, it] = INS_BADGE[r.insurance]
                    return (
                      <tr key={r.id}>
                        <td><b>{r.fullName}</b>{r.paid && <div className="vs-parts">Remunerado · no suma horas</div>}{r.missingData.length > 0 && <div className="vs-parts" style={{ color: '#B45309' }}>Faltan datos</div>}</td>
                        <td>{r.document}<div className="vs-parts">{r.carnet || 'Sin carnet'}</div></td>
                        <td>{r.agrupacion || '—'}</td>
                        <td>{r.siteName}</td>
                        <td>{r.volunteerType === 'base' ? 'Base' : 'Apoyo'}</td>
                        <td>{r.active ? 'Activo' : 'Inactivo'}</td>
                        <td><span className={`badge ${it}`}>{il}</span>{r.insuranceExpiry && <div className="vs-parts">{fmt(r.insuranceExpiry)}</div>}</td>
                        <td>{r.events}<div className="vs-parts">S {r.socorro} · E {r.educacion}</div></td>
                        <td><b>{r.hours}</b></td>
                      </tr>
                    )
                  })}</tbody>
                </table>
              </section>
            </>
          )}
          <footer className="cy-sheet-footer"><span>{settings.ipsName} · Reporte de voluntarios</span><span>Generado por {user.fullName} el {printedAt}</span></footer>
        </article>
      )}
    </div>
  )
}

export default VolunteerReport
