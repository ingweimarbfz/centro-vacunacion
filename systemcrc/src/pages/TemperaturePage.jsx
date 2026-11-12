import React, { useCallback, useEffect, useMemo, useState } from 'react'
import MonthPicker from '../components/MonthPicker'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ReferenceArea } from 'recharts'
import { Link } from 'react-router-dom'
import { MdSave, MdThermostat, MdSearch, MdWarning, MdErrorOutline, MdPrint, MdEdit, MdDelete, MdWbSunny, MdWbTwilight, MdCheckCircle, MdSchedule } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { useSettings } from '../context/SettingsContext'
import { PageHead, Card, Empty, Spinner, Modal, useToast } from '../components/ui'
import { readingPoints, dayTick, READING_LINES, ReadingTip, shiftDot, TempLegend } from '../components/tempChart'

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const nowBogota = () => new Intl.DateTimeFormat('en-GB', { timeZone: 'America/Bogota', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date())
const firstOfMonth = () => `${today().slice(0, 8)}01`
const diffDays = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000)
const MAX_RANGE = 31
const SHIFTS = { manana: 'Mañana', tarde: 'Tarde' }
const ShiftBadge = ({ shift, slot }) => <span className={`badge ${shift === 'manana' ? 'warn' : 'navy'}`}>{shift === 'manana' ? <MdWbSunny /> : <MdWbTwilight />} {SHIFTS[shift]}{slot ? ` · ${slot}.ª` : ''}</span>
// Lecturas del día por defecto (se ajustan a las horas de recordatorio configuradas).
const DEFAULT_PLAN = [
  { shift: 'manana', slot: 1, time: '08:00', opensAt: '07:30' }, { shift: 'manana', slot: 2, time: '12:00', opensAt: '11:30' },
  { shift: 'tarde', slot: 1, time: '14:00', opensAt: '13:30' }, { shift: 'tarde', slot: 2, time: '18:00', opensAt: '17:30' }
]
const keyOf = (shift, slot) => `${shift}-${slot || 1}`

// Modificar una lectura: valores y jornada.
const EditModal = ({ row, onClose, onSaved }) => {
  const [f, setF] = useState({ tempMin: row.tempMin, tempMax: row.tempMax, shift: row.shift, slot: row.slot || 1 })
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
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Jornada</label><select value={f.shift} onChange={(e) => setF({ ...f, shift: e.target.value })}>{Object.entries(SHIFTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Lectura</label><select value={f.slot} onChange={(e) => setF({ ...f, slot: Number(e.target.value) })}>{[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n}.ª lectura</option>)}</select></div>
        </div>
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
  const [form, setForm] = useState({ tempMin: '', tempMax: '', key: '' })
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
    api.get('/temperatura/jornada').then(({ data }) => setTodayInfo(data)).catch(() => {})
  }, [load])
  // Lecturas del día (2 en la mañana y 2 en la tarde por defecto) y las ya registradas hoy.
  const plan = todayInfo?.plan?.length ? todayInfo.plan : DEFAULT_PLAN
  const todayDone = useMemo(() => new Set((rows || []).filter((r) => r.isoDate === (todayInfo?.date || today())).map((r) => keyOf(r.shift, r.slot))), [rows, todayInfo])
  const pendingPlan = plan.filter((p) => !todayDone.has(keyOf(p.shift, p.slot)))
  const dayComplete = pendingPlan.length === 0
  // Las lecturas van en orden (mañana 1.ª → 2.ª → tarde 1.ª → 2.ª) y cada una se habilita desde su hora (30 min antes).
  const next = pendingPlan[0]
  const nextKey = next ? keyOf(next.shift, next.slot) : ''
  const [clock, setClock] = useState(nowBogota)
  useEffect(() => { const t = setInterval(() => setClock(nowBogota()), 30000); return () => clearInterval(t) }, [])
  const notYet = next && clock < (next.opensAt || next.time)
  useEffect(() => { if (form.key !== nextKey) setForm((x) => ({ ...x, key: nextKey })) }, [nextKey, form.key])
  const selected = next

  const submit = async (e) => {
    e.preventDefault()
    setFormError('')
    const min = Number(form.tempMin); const max = Number(form.tempMax)
    if (form.tempMin === '' || form.tempMax === '') return setFormError('Ingresa la temperatura mínima y máxima.')
    if (min > max) return setFormError('La mínima no puede ser mayor que la máxima.')
    if (!selected) return setFormError('Selecciona la lectura.')
    if (todayDone.has(form.key)) return setFormError(`Ya registraste la ${selected.slot}.ª lectura de la ${SHIFTS[selected.shift].toLowerCase()} de hoy. Si necesitas corregirla, modifícala en la tabla.`)
    setSaving(true)
    try {
      const { data } = await api.post('/registrar-temperatura', { tempMin: min, tempMax: max, shift: selected.shift, slot: selected.slot })
      const out = data.tempMax > thresholds.max || data.tempMin < thresholds.min
      toast(out ? 'Registrado. Atención: la lectura está fuera de rango.' : 'Temperatura registrada', out ? 'bad' : 'ok')
      setForm({ tempMin: '', tempMax: '', key: '' })
      if (!rangeError) load(range)
    } catch (err) {
      setFormError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  // Un punto por lectura (4 al día) con su hora, mínima y máxima.
  const chart = useMemo(() => readingPoints(rows), [rows])
  const outOfRange = (r) => r.tempMax > thresholds.max || r.tempMin < thresholds.min
  const alerts = (rows || []).filter(outOfRange).length

  return (
    <>
      <PageHead title="Temperatura" subtitle="Registro diario y seguimiento de la cadena de frío">
        <MonthPicker value={reportMonth} max={today().slice(0, 7)} onChange={setReportMonth} ariaLabel="Mes del reporte" />
        <Link to={`/temperatura/reporte?mes=${reportMonth}`} className="btn btn-primary"><MdPrint /> Reporte mensual PDF</Link>
      </PageHead>

      <div className="grid grid-2-1" style={{ marginBottom: 18 }}>
        <Card title="Gráfica del periodo" subtitle={`Cada punto es una lectura (4 al día) con su mínima y máxima · rango permitido ${thresholds.min}–${thresholds.max} °C`}
          actions={alerts > 0 ? <span className="badge bad"><MdWarning /> {alerts} fuera de rango</span> : rows?.length ? <span className="badge ok">Todo en rango</span> : null}>
          {!rows ? <div className="splash" style={{ minHeight: 260 }}><Spinner /></div> : chart.length === 0 ? <Empty icon={<MdThermostat />}>No hay registros en este periodo.</Empty> : (
            <><ResponsiveContainer width="100%" height={280}>
              <LineChart data={chart} margin={{ top: 10, right: 12, left: -18, bottom: 0 }}>
                <CartesianGrid stroke="#EEF0F2" vertical={false} />
                <ReferenceArea y1={thresholds.min} y2={thresholds.max} fill="#DCFCE7" fillOpacity={0.45} />
                <XAxis dataKey="x" tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} interval={0} tickFormatter={dayTick(chart)} />
                <YAxis tick={{ fontSize: 11, fill: '#6B7280' }} tickLine={false} axisLine={false} unit="°"
                  domain={[(d) => Math.floor(Math.min(d, thresholds.min) - 2), (d) => Math.ceil(Math.max(d, thresholds.max) + 2)]} />
                <Tooltip content={<ReadingTip />} />
                <ReferenceLine y={thresholds.max} stroke="#DC2626" strokeDasharray="5 4" />
                <ReferenceLine y={thresholds.min} stroke="#2563EB" strokeDasharray="5 4" />
                {READING_LINES(settings).map((l) => <Line key={l.key} type="monotone" dataKey={l.key} name={l.name} stroke={l.color} strokeWidth={2} dot={shiftDot(3.4)} activeDot={{ r: 5.5 }} />)}
              </LineChart>
            </ResponsiveContainer>
            <TempLegend lines={READING_LINES(settings)} /></>
          )}
        </Card>

        <div className="stack">
          <Card title="Nuevo registro" subtitle={`${plan.length} lecturas al día: ${plan.filter((p) => p.shift === 'manana').length} en la mañana y ${plan.filter((p) => p.shift === 'tarde').length} en la tarde. La fecha y la hora se toman automáticamente.`}>
            <form onSubmit={submit} noValidate>
              <div className="temp-slots" role="radiogroup" aria-label="Lectura">
                {plan.map((p) => {
                  const k = keyOf(p.shift, p.slot); const done = todayDone.has(k)
                  return (
                    <button key={k} type="button" className={`temp-slot ${k === nextKey ? 'on' : ''} ${done ? 'done' : ''}`} aria-pressed={k === nextKey} disabled={k !== nextKey} title={done ? 'Ya registrada hoy' : k === nextKey ? 'Lectura que sigue' : 'Se registra en orden, después de la anterior'}>
                      {p.shift === 'manana' ? <MdWbSunny /> : <MdWbTwilight />}
                      <span><b>{SHIFTS[p.shift]} · {p.slot}.ª</b><small>{p.time}{k === nextKey && notYet ? ` · desde ${p.opensAt}` : ''}</small></span>
                      {done && <MdCheckCircle className="temp-slot-ok" />}
                    </button>
                  )
                })}
              </div>
              {dayComplete ? (
                <div className="alert ok" style={{ margin: 0 }}><MdCheckCircle /><span><b>Hoy ya están las {plan.length} lecturas del día.</b> El próximo registro se habilita mañana. Si necesitas corregir una lectura, modifícala en la tabla.</span></div>
              ) : notYet ? (
                <div className="alert info" style={{ margin: 0 }}><MdSchedule /><span><b>La {next.slot}.ª lectura de la {SHIFTS[next.shift].toLowerCase()} es a las {next.time}.</b> Se habilita a las {next.opensAt}. Las lecturas se registran en orden: no se puede adelantar una lectura de la tarde en la mañana.</span></div>
              ) : (<>
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
              </>)}
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
                    <td><ShiftBadge shift={r.shift} slot={r.slot} /></td>
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
          <p style={{ margin: 0 }}>¿Eliminar la <b>{modal.delete.slot || 1}.ª lectura de la {SHIFTS[modal.delete.shift].toLowerCase()}</b> del <b>{modal.delete.date}</b> ({modal.delete.tempMin.toFixed(1)} – {modal.delete.tempMax.toFixed(1)} °C)? Esta acción no se puede deshacer.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default TemperaturePage
