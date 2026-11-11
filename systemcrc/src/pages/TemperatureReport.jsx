import React, { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, ReferenceLine, ReferenceArea, Legend } from 'recharts'
import { MdArrowBack, MdPrint, MdErrorOutline } from 'react-icons/md'
import api, { errorMessage, getSiteFilter } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { Spinner } from '../components/ui'
import '../components/cytology.css'
import { TEMP_LINES } from './TemperaturePage'
import { SignBlock, useDocSignatures } from '../components/signature'

const currentMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()).slice(0, 7)
const monthLabel = (ym) => { const [y, m] = ym.split('-').map(Number); return new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(y, m - 1, 15))) }
const daysIn = (ym) => { const [y, m] = ym.split('-').map(Number); return new Date(Date.UTC(y, m, 0)).getUTCDate() }
const f1 = (n) => (n == null ? '—' : `${n.toFixed(1)} °C`)

// Reporte mensual del registro de temperatura (cadena de frío). Se imprime en carta horizontal.
const TemperatureReport = () => {
  const { user } = useAuth()
  const { logo, settings } = useSettings()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const ym = /^\d{4}-\d{2}$/.test(params.get('mes') || '') ? params.get('mes') : currentMonth()
  const [rows, setRows] = useState(null)
  const [th, setTh] = useState(null)
  const [siteName, setSiteName] = useState('')
  const [error, setError] = useState('')
  const sigSite = user.role === 'administrador' ? getSiteFilter() || 'todas' : user.siteId
  const doc = useDocSignatures('temperatura', `${sigSite}:${ym}`)

  useEffect(() => {
    setRows(null)
    const last = `${ym}-${String(daysIn(ym)).padStart(2, '0')}`
    Promise.all([api.get('/reporte-temperatura', { params: { desde: `${ym}-01`, hasta: last } }), api.get('/configuracion')])
      .then(([a, b]) => { setRows(a.data); setTh({ min: b.data.tempMinThreshold, max: b.data.tempMaxThreshold }) })
      .catch((e) => setError(errorMessage(e)))
  }, [ym])
  useEffect(() => {
    if (user.role !== 'administrador') { setSiteName(user.site?.name || ''); return }
    const id = getSiteFilter()
    if (!id) { setSiteName('Todas las sedes'); return }
    api.get('/sedes', { params: { sede: undefined } }).then(({ data }) => setSiteName(data.find((s) => s.id === id)?.name || '')).catch(() => {})
  }, [user])
  // Hoja en carta horizontal mientras esta página esté abierta.
  useEffect(() => {
    const st = document.createElement('style')
    st.textContent = '@media print { @page { size: letter landscape; margin: 9mm; } }'
    document.head.appendChild(st)
    const t = document.title; document.title = `Temperaturas_${ym}`
    return () => { st.remove(); document.title = t }
  }, [ym])

  const stats = useMemo(() => {
    if (!rows || !th) return null
    const out = (r) => r.tempMax > th.max || r.tempMin < th.min
    const days = daysIn(ym)
    const byDay = Array.from({ length: days }, (_, i) => {
      const iso = `${ym}-${String(i + 1).padStart(2, '0')}`
      return { day: i + 1, iso, readings: rows.filter((r) => r.isoDate === iso) }
    })
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
    const elapsed = byDay.filter((d) => d.iso <= today)
    const mins = rows.map((r) => r.tempMin); const maxs = rows.map((r) => r.tempMax)
    const avg = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null)
    return {
      byDay, out,
      readings: rows.length, outCount: rows.filter(out).length,
      recorded: byDay.filter((d) => d.readings.length).length, expected: elapsed.length,
      missing: elapsed.filter((d) => !d.readings.length).map((d) => d.day),
      absMin: mins.length ? Math.min(...mins) : null, absMax: maxs.length ? Math.max(...maxs) : null,
      avgMin: avg(mins), avgMax: avg(maxs),
      chart: byDay.map((d) => {
        const am = d.readings.find((x) => x.shift === 'manana'); const pm = d.readings.find((x) => x.shift === 'tarde')
        return { day: d.day, minAm: am?.tempMin ?? null, maxAm: am?.tempMax ?? null, minPm: pm?.tempMin ?? null, maxPm: pm?.tempMax ?? null }
      }),
      shiftsDone: rows.length, shiftsExpected: elapsed.length * 2
    }
  }, [rows, th, ym])

  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!stats) return <div className="splash"><Spinner /> Cargando…</div>
  const printedAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())
  const half = Math.ceil(stats.byDay.length / 2)
  const Cell = ({ r }) => (r ? (
    <>
      <td>{r.time}</td>
      <td style={r.tempMin < th.min ? { color: '#1D4ED8', fontWeight: 700 } : undefined}>{f1(r.tempMin)}</td>
      <td style={r.tempMax > th.max ? { color: '#B91C1C', fontWeight: 700 } : undefined}>{f1(r.tempMax)}{stats.out(r) && ' ⚠'}</td>
    </>
  ) : <><td colSpan={3} style={{ color: '#9CA3AF' }}>Sin registro</td></>)
  const DayTable = ({ list }) => (
    <table className="ev-table tr-days">
      <thead>
        <tr><th rowSpan={2}>Día</th><th colSpan={3} style={{ textAlign: 'center' }}>Mañana</th><th colSpan={3} style={{ textAlign: 'center' }}>Tarde</th></tr>
        <tr><th>Hora</th><th>Mín.</th><th>Máx.</th><th>Hora</th><th>Mín.</th><th>Máx.</th></tr>
      </thead>
      <tbody>{list.map((d) => {
        const am = d.readings.find((r) => r.shift === 'manana'); const pm = d.readings.find((r) => r.shift === 'tarde')
        return (
          <tr key={d.day} className={(am && stats.out(am)) || (pm && stats.out(pm)) ? 'po-bad' : ''}>
            <td><b>{String(d.day).padStart(2, '0')}</b></td><Cell r={am} /><Cell r={pm} />
          </tr>
        )
      })}</tbody>
    </table>
  )

  return (
    <div className="cy-detail-page tr-report">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={() => navigate('/temperatura')}><MdArrowBack /> Temperatura</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <input type="month" className="input" value={ym} max={currentMonth()} onChange={(e) => e.target.value && setParams({ mes: e.target.value })} aria-label="Mes" style={{ width: 170 }} />
          <button type="button" className="btn btn-primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
        </div>
      </div>
      <article className="cy-sheet ev-sheet">
        <header className="cy-sheet-header">
          <img src={logo} alt={settings.ipsName} className="cy-logo" />
          <div className="cy-sheet-heading">
            <p className="cy-kicker">IPS · Cadena de frío</p>
            <h2>Registro de temperatura · {monthLabel(ym)}</h2>
            <p className="ev-formats">{siteName}{siteName ? ' · ' : ''}Rango permitido {th.min}–{th.max} °C</p>
          </div>
          <dl className="cy-meta">
            <div><dt>Lecturas</dt><dd>{stats.readings}</dd></div>
            <div><dt>Jornadas registradas</dt><dd>{stats.shiftsDone}/{stats.shiftsExpected}</dd></div>
            <div><dt>Fuera de rango</dt><dd>{stats.outCount}</dd></div>
          </dl>
        </header>

        <div className="tr-km" style={{ gridTemplateColumns: 'repeat(6, 1fr)', marginTop: '4mm' }}>
          <div><span>Mínima absoluta</span><strong>{f1(stats.absMin)}</strong></div>
          <div><span>Máxima absoluta</span><strong>{f1(stats.absMax)}</strong></div>
          <div><span>Promedio mínimas</span><strong>{f1(stats.avgMin)}</strong></div>
          <div><span>Promedio máximas</span><strong>{f1(stats.avgMax)}</strong></div>
          <div className={stats.outCount ? 'hl' : ''}><span>Lecturas fuera de rango</span><strong>{stats.outCount}</strong></div>
          <div className={stats.missing.length ? 'hl' : ''}><span>Días sin registro</span><strong>{stats.missing.length}</strong></div>
        </div>

        <section className="cy-section">
          <h3 className="cy-section-title">Comportamiento diario: mínima y máxima de la mañana y de la tarde</h3>
          <div className="tr-chart">
            <LineChart width={960} height={250} data={stats.chart} margin={{ top: 8, right: 16, left: -8, bottom: 0 }}>
              <CartesianGrid stroke="#EEF0F2" vertical={false} />
              <ReferenceArea y1={th.min} y2={th.max} fill="#DCFCE7" fillOpacity={0.5} />
              <XAxis dataKey="day" tick={{ fontSize: 10.5, fill: '#4B5563' }} interval={0} tickLine={false} />
              <YAxis tick={{ fontSize: 10.5, fill: '#4B5563' }} unit="°" tickLine={false} axisLine={false}
                domain={[(d) => Math.floor(Math.min(d, th.min) - 2), (d) => Math.ceil(Math.max(d, th.max) + 2)]} />
              <ReferenceLine y={th.max} stroke="#DC2626" strokeDasharray="5 4" label={{ value: `Máx. ${th.max} °C`, position: 'insideTopRight', fontSize: 10, fill: '#B91C1C' }} />
              <ReferenceLine y={th.min} stroke="#2563EB" strokeDasharray="5 4" label={{ value: `Mín. ${th.min} °C`, position: 'insideBottomRight', fontSize: 10, fill: '#1D4ED8' }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {TEMP_LINES(settings).map((l) => <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={1.8} strokeDasharray={l.dash} dot={{ r: 2.2 }} connectNulls isAnimationActive={false} />)}
            </LineChart>
          </div>
          <p className="ev-complete" style={{ fontSize: 10.5 }}>Líneas continuas: mañana · líneas punteadas: tarde.{stats.missing.length > 0 && <span style={{ color: '#92400E' }}> Días sin ningún registro: {stats.missing.join(', ')}.</span>}</p>
        </section>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Lecturas del mes</h3>
          <div className="tr-days-grid">
            <DayTable list={stats.byDay.slice(0, half)} />
            <DayTable list={stats.byDay.slice(half)} />
          </div>
        </section>

        <section className="cy-signatures" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <SignBlock doc={doc} slot="genero" label="Elaboró el reporte" name={user.fullName} />
          <SignBlock doc={doc} slot="responsable" label="Responsable de cadena de frío" />
        </section>
        <footer className="cy-sheet-footer"><span>{settings.ipsName} · Registro de temperatura {monthLabel(ym)}</span><span>Impreso el {printedAt}</span></footer>
      </article>
    </div>
  )
}

export default TemperatureReport
