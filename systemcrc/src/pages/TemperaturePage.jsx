import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Legend } from 'recharts'
import { Link } from 'react-router-dom'
import { MdSave, MdThermostat, MdSearch, MdWarning, MdErrorOutline, MdPrint, MdEdit, MdDelete, MdWbSunny, MdWbTwilight, MdCheckCircle } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { useSettings } from '../context/SettingsContext'
import { PageHead, Card, Empty, Spinner, Modal, useToast } from '../components/ui'

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const firstOfMonth = () => `${today().slice(0, 8)}01`
const diffDays = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)
const MAX_RANGE = 31
// Las 4 series del día: máxima y mínima de la mañana (línea continua) y de la tarde (punteada).
export const TEMP_LINES = (settings) => [
  { key: 'maxAm', name: 'Máx. mañana', color: settings.primaryColor },
  { key: 'minAm', name: 'Mín. mañana', color: settings.secondaryColor },
  { key: 'maxPm', name: 'Máx. tarde', color: '#F59E0B', dash: '6 3' },
  { key: 'minPm', name: 'Mín. tarde', color: '#0EA5E9', dash: '6 3' }
]
const SHIFTS = { manana: 'Mañana', tarde: 'Tarde' }
const ShiftBadge = ({ shift }) => <span className={`badge ${shift === 'manana' ? 'warn' : 'navy'}`}>{shift === 'manana' ? <MdWbSunny /> : <MdWbTwilight />} {SHIFTS[shift]}</span>

// Modificar una lectura: valores y jornada.
const EditModal = ({ row, onClose, onSaved }) => {
  const [f, setF] = useState({ tempMin: row.tempMin, tempMax: row.tempMax, shift: row.shift })
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async () => {
    setError('')
    if (f.tempMin === '' || f.tempMax === '') return setError('Ingresa la mínima y la máxima.')
    if (Number(f.tempMin) > Number(f.tempMax)) return setError('La mínima no puede ser mayor que la máxima.')
    setSaving(true)
    try { const { data } = await api.put(`/temperatura/${row.id}`, { ...f, tempMin: Number(f.tempMin), tempMax: Number(f.tempMax) }); onSaved(data) } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title={`Modificar registro del ${row.date}`} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        <div className="field"><label>Jornada</label><select value={f.shift} onChange={(e) => setF({ ...f, shift: e.target.value })}>{Object.entries(SHIFTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Mínima (°C)</label><input type="number" step="0.1" value={f.tempMin} onChange={(e) => setF({ ...f, tempMin: e.target.value })} /></div>
          <div className="field"><label>Máxima (°C)</label><input type="number" step="0.1" value={f.tempMax} onChange={(e) => setF({ ...f, tempMax: e.target.value })} /></div>
        </div>
        <span className="hint">Registrado por {row.createdBy || '—'} a las {row.time}. Queda constancia de quién lo modifica.</span>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

const TemperaturePage = () => {
  const { settings } = useSettings()
  const [toast, toastNode] = useToast()
  const [thresholds, setThresholds] = useState({ min: 15, max: 24 })
  const [form, setForm] = useState({ tempMin: '', tempMax: '', shift: '' })
  const [todayInfo, setTodayInfo] = useState(null)
  const [modal, setModal] = useState(null)
  const [formError, setFormError] = useState('')
  const [saving, setSaving] = useState(false)
  const [range, setRange] = useState({ desde: firstOfMonth(), hasta: today() })
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [reportMonth, setReportMonth] = useState(today().slice(0, 7))

  const rangeError = range.desde > range.hasta
    ? 'La fecha inicial no puede ser mayor que la final.'
    : diffDays(range.desde, range.hasta) > MAX_RANGE ? `El rango máximo es de ${MAX_RANGE} días.` : ''

  const load = useCallback(async (r) => {
    setError('')
    try {
      const { data } = await api.get('/reporte-temperatura', { params: r })
      setRows(data)
    } catch (e) {
      setError(errorMessage(e))
    }
  }, [])

  useEffect(() => {
    api.get('/configuracion').then(({ data }) => setThresholds({ min: data.tempMinThreshold, max: data.tempMaxThreshold })).catch(() => {})
    load({ desde: firstOfMonth(), hasta: today() })
    api.get('/temperatura/jornada').then(({ data }) => { setTodayInfo(data); setForm((x) => ({ ...x, shift: x.shift || data.shift })) }).catch(() => {})
  }, [load])
  // Jornadas ya registradas hoy (según los datos cargados).
  const todayDone = useMemo(() => new Set((rows || []).filter((r) => r.isoDate === (todayInfo?.date || today())).map((r) => r.shift)), [rows, todayInfo])

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    const min = Number(form.tempMin); const max = Number(form.tempMax)
    if (form.tempMin === '' || form.tempMax === '') return setFormError('Ingresa la temperatura mínima y máxima.')
    if (min > max) return setFormError('La mínima no puede ser mayor que la máxima.')
    if (!form.shift) return setFormError('Selecciona la jornada.')
    if (todayDone.has(form.shift)) return setFormError(`Ya registraste la ${SHIFTS[form.shift].toLowerCase()} de hoy. Si necesitas corregirla, modifícala en la tabla.`)
    setSaving(true)
    try {
      const { data } = await api.post('/registrar-temperatura', { tempMin: min, tempMax: max, shift: form.shift })
      const out = data.tempMax > thresholds.max || data.tempMin < thresholds.min
      toast(out ? 'Registrado. Atención: la lectura está fuera de rango.' : 'Temperatura registrada', out ? 'bad' : 'ok')
      setForm({ tempMin: '', tempMax: '', shift: form.shift })
      if (!rangeError) load(range)
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // Un punto por día con las 4 temperaturas: mínima y máxima de la mañana y de la tarde.
  const chart = useMemo(() => {
    const days = {}
    for (const r of rows || []) {
      const d = days[r.isoDate] || (days[r.isoDate] = { label: r.date.slice(0, 5), date: r.date })
      const k = r.shift === 'manana' ? 'Am' : 'Pm'
      d[`min${k}`] = r.tempMin; d[`max${k}`] = r.tempMax
    }
    return Object.keys(days).sort().map((k) => days[k])
  }, [rows])
  const outOfRange = (r) => r.tempMax > thresholds.max || r.tempMin < thresholds.min
  const alerts = (rows || []).filter(outOfRange).length

  return (
    <>
      <PageHead title="Temperatura" subtitle="Registro diario y seguimiento de la cadena de frío">
        <input type="month" className="input" style={{ width: 170 }} value={reportMonth} max={today().slice(0, 7)} onChange={(e) => e.target.value && setReportMonth(e.target.value)} aria-label="Mes del reporte" />
        <Link to={`/temperatura/reporte?mes=${reportMonth}`} className="btn btn-primary"><MdPrint /> Reporte mensual PDF</Link>
      </PageHead>

      <div className="grid grid-2-1" style={{ marginBottom: 18 }}>
        <Card title="Gráfica del periodo" subtitle={`Rango permitido ${thresholds.min}–${thresholds.max} °C`}
          actions={alerts > 0 ? <span className="badge bad"><MdWarning /> {alerts} fuera de rango</span> : rows?.length ? <span className="badge ok">Todo en rango</span> : null}>
          {!rows ? <div className="splash" style={{ minHeight: 260 }}><Spinner /></div> : chart.length === 0 ? <Empty icon={<MdThermostat />}>No hay registros en este periodo.</Empty> : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chart} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#EEF0F2" vertical={false} />
                <ReferenceArea y1={thresholds.min} y2={thresholds.max} fill="#DCFCE7" fillOpacity={0.45} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} minTickGap={24} tickFormatter={(v) => v.slice(0, 5)} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} unit="°"
                  domain={[(d) => Math.floor(Math.min(d, thresholds.min) - 2), (d) => Math.ceil(Math.max(d, thresholds.max) + 2)]} />
                <Legend wrapperStyle={{ fontSize: 11.5 }} />
                <Tooltip labelFormatter={(l, p) => (p?.[0] ? p[0].payload.date : l)} formatter={(v, n) => [`${v} °C`, n]} contentStyle={{ borderRadius: 10, borderColor: '#E5E7EB', fontSize: 12.5 }} />
                <ReferenceLine y={thresholds.max} stroke="#DC2626" strokeDasharray="5 4" />
                <ReferenceLine y={thresholds.min} stroke="#2563EB" strokeDasharray="5 4" />
                {TEMP_LINES(settings).map((l) => <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2.2} strokeDasharray={l.dash} dot={{ r: 3, fill: '#fff', strokeWidth: 2 }} connectNulls />)}
              </LineChart>
            </ResponsiveContainer>
          )}
        </Card>

        <div className="stack">
          <Card title="Nuevo registro" subtitle="Dos lecturas al día: mañana y tarde. La fecha y la hora se toman automáticamente.">
            <form onSubmit={submit} noValidate>
              <div className="module-switch" style={{ marginBottom: 12, width: '100%' }} role="radiogroup" aria-label="Jornada">
                {Object.entries(SHIFTS).map(([k, l]) => (
                  <button key={k} type="button" className={form.shift === k ? 'on' : ''} style={{ flex: 1 }} onClick={() => setForm({ ...form, shift: k })} aria-pressed={form.shift === k}>
                    {k === 'manana' ? <MdWbSunny /> : <MdWbTwilight />} {l} {todayDone.has(k) && <MdCheckCircle style={{ color: 'var(--ok)' }} title="Ya registrada hoy" />}
                  </button>
                ))}
              </div>
              {todayDone.size === 2 && <div className="alert ok" style={{ marginBottom: 12 }}><MdCheckCircle /><span>Hoy ya están las dos lecturas (mañana y tarde).</span></div>}
              <div className="grid grid-2" style={{ gap: 12 }}>
                <div className="field">
                  <label htmlFor="tempMin">Mínima (°C) <span className="req">*</span></label>
                  <input id="tempMin" type="number" step="0.1" value={form.tempMin} onChange={(e) => setForm({ ...form, tempMin: e.target.value })} placeholder="Ej. 18.5" />
                </div>
                <div className="field">
                  <label htmlFor="tempMax">Máxima (°C) <span className="req">*</span></label>
                  <input id="tempMax" type="number" step="0.1" value={form.tempMax} onChange={(e) => setForm({ ...form, tempMax: e.target.value })} placeholder="Ej. 22.0" />
                </div>
              </div>
              {formError && <div className="alert bad" style={{ marginTop: 12 }}><MdErrorOutline /><span>{formError}</span></div>}
              <button type="submit" className="btn btn-primary btn-block" style={{ marginTop: 14 }} disabled={saving}>
                {saving ? <><Spinner /> Guardando…</> : <><MdSave /> Registrar temperatura</>}
              </button>
            </form>
          </Card>
          <Card title="Consultar periodo" subtitle={`Máximo ${MAX_RANGE} días`}>
            <div className="grid grid-2" style={{ gap: 12 }}>
              <div className="field"><label htmlFor="desde">Desde</label><input id="desde" type="date" value={range.desde} max={range.hasta} onChange={(e) => setRange({ ...range, desde: e.target.value })} /></div>
              <div className="field"><label htmlFor="hasta">Hasta</label><input id="hasta" type="date" value={range.hasta} max={today()} onChange={(e) => setRange({ ...range, hasta: e.target.value })} /></div>
            </div>
            {rangeError && <div className="field" style={{ marginTop: 8 }}><span className="error">{rangeError}</span></div>}
            <button type="button" className="btn btn-outline btn-block" style={{ marginTop: 14 }} disabled={!!rangeError} onClick={() => load(range)}>
              <MdSearch /> Consultar
            </button>
          </Card>
        </div>
      </div>

      {error && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{error}</span></div>}

      <Card title="Registros del periodo" subtitle={rows ? `${rows.length} lecturas` : ''} flush>
        {rows && rows.length > 0 ? (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead><tr><th>Fecha</th><th>Jornada</th><th>Hora</th><th className="num">Mínima</th><th className="num">Máxima</th><th>Estado</th><th>Registró</th><th className="actions" /></tr></thead>
              <tbody>
                {[...rows].reverse().map((r) => (
                  <tr key={r.id}>
                    <td><strong style={{ color: 'var(--ink)' }}>{r.date}</strong></td>
                    <td><ShiftBadge shift={r.shift} /></td>
                    <td>{r.time}</td>
                    <td className="num" style={r.tempMin < thresholds.min ? { color: 'var(--info)', fontWeight: 700 } : undefined}>{r.tempMin.toFixed(1)} °C</td>
                    <td className="num" style={r.tempMax > thresholds.max ? { color: 'var(--bad)', fontWeight: 700 } : undefined}>{r.tempMax.toFixed(1)} °C</td>
                    <td>{outOfRange(r) ? <span className="badge bad"><span className="dot" /> Fuera de rango</span> : <span className="badge ok"><span className="dot" /> Normal</span>}</td>
                    <td>{r.createdBy || '—'}{r.updatedBy && <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Modificó: {r.updatedBy}</div>}</td>
                    <td className="actions">
                      <button type="button" className="btn btn-ghost btn-icon" aria-label="Modificar" onClick={() => setModal({ edit: r })}><MdEdit /></button>
                      <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delete: r })}><MdDelete /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : rows && <Empty icon={<MdThermostat />}>Sin registros.</Empty>}
      </Card>
      {modal?.edit && <EditModal row={modal.edit} onClose={() => setModal(null)} onSaved={() => { setModal(null); toast('Registro modificado'); load(range) }} />}
      {modal?.delete && (
        <Modal title="Eliminar registro" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={async () => { try { await api.delete(`/temperatura/${modal.delete.id}`); toast('Registro eliminado'); setModal(null); load(range) } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) } }}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar la lectura de la <b>{SHIFTS[modal.delete.shift].toLowerCase()}</b> del <b>{modal.delete.date}</b> ({modal.delete.tempMin.toFixed(1)} – {modal.delete.tempMax.toFixed(1)} °C)? Esta acción no se puede deshacer.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default TemperaturePage
