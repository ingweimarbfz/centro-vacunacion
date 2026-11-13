import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  MdArrowBack, MdPrint, MdFlag, MdDelete, MdEdit, MdPersonAdd, MdAdd, MdPlace, MdAccessTime, MdPerson, MdLock,
  MdErrorOutline, MdInventory2, MdMedicalServices, MdPeople, MdNotes, MdSave, MdCheckCircle, MdWarning
, MdSearch } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { Card, Modal, Empty, Spinner, useToast, initials } from '../../components/ui'
import {
  PersonLookup, StatusBadge, fmtDateTime, fmtTime, duration, qty,
  CATEGORY_LABELS, CATEGORY_TONE, STATE_LABELS, STATE_TONE, isConsumable, CONSUMABLE
} from './common'
import EventReport from './EventReport'

// ---------------------------------------------------------------- Finalizar servicio
const FinishModal = ({ event, onClose, onDone }) => {
  const [rows, setRows] = useState(() => event.materials.map((m) => ({ id: m.id, returned: m.quantity, state: m.state, observation: m.observation || '' })))
  const [obs, setObs] = useState(event.generalObservation || '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const complete = rows.every((r, i) => Number(r.returned) === event.materials[i].quantity)
  const setRow = (i, k, v) => setRows((rs) => rs.map((r, j) => (j === i ? { ...r, [k]: v } : r)))

  const submit = async () => {
    setError('')
    for (const [i, r] of rows.entries()) {
      const n = Number(r.returned)
      if (r.returned === '' || Number.isNaN(n) || n < 0 || n > event.materials[i].quantity) return setError(`Revisa la cantidad devuelta de ${event.materials[i].item.name}.`)
    }
    setSaving(true)
    try {
      const { data } = await api.post(`/socorro/eventos/${event.id}/finalizar`, { returns: rows, generalObservation: obs, materialsComplete: complete })
      onDone(data)
    } catch (e) {
      setError(errorMessage(e)); setSaving(false)
    }
  }

  return (
    <Modal title="Finalizar servicio" onClose={onClose} size=""
      footer={<>
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdFlag />} Finalizar ahora</button>
      </>}>
      <div className="stack" style={{ gap: 16 }}>
        <div className="alert info"><MdAccessTime /><span>La hora de terminación se registra automáticamente al confirmar ({fmtTime(new Date().toISOString())} aprox.). Duración: {duration(event.startedAt)}.</span></div>
        {event.materials.length > 0 ? (
          <div>
            <span className="label">Entrada de materiales</span>
            <div className="table-wrap" style={{ marginTop: 8, border: '1px solid var(--line)', borderRadius: 10 }}>
              <table className="table">
                <thead><tr><th>Elemento</th><th className="num">Salió</th><th>Regresa</th><th>Estado</th><th>Observación</th></tr></thead>
                <tbody>
                  {event.materials.map((m, i) => (
                    <tr key={m.id}>
                      <td><strong style={{ color: 'var(--ink)' }}>{m.item.name}</strong></td>
                      <td className="num">{qty(m.quantity)}</td>
                      <td style={{ width: 90 }}><input className="input" type="number" min="0" max={m.quantity} value={rows[i].returned} onChange={(e) => setRow(i, 'returned', e.target.value)} style={{ height: 34 }} /></td>
                      <td style={{ width: 130 }}>
                        <select className="input" value={rows[i].state} onChange={(e) => setRow(i, 'state', e.target.value)} style={{ height: 34 }}>
                          {Object.entries(STATE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select>
                      </td>
                      <td><input className="input" value={rows[i].observation} onChange={(e) => setRow(i, 'observation', e.target.value)} style={{ height: 34 }} placeholder="Opcional" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`alert ${complete ? 'ok' : 'warn'}`} style={{ marginTop: 10 }}>
              {complete ? <MdCheckCircle /> : <MdWarning />}
              <span>Al ingreso los materiales {complete ? <b>SÍ</b> : <b>NO</b>} fueron entregados completos.{!complete && ' Lo que no regresa queda descontado del inventario.'}</span>
            </div>
          </div>
        ) : <p style={{ margin: 0, color: 'var(--muted)' }}>Este evento no tiene materiales por devolver.</p>}
        <div className="field"><label>Observación general</label><textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Novedades, atenciones, traslados…" /></div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------- Editar material
const MaterialModal = ({ event, material, onClose, onSaved }) => {
  const [form, setForm] = useState({ quantity: material.quantity, state: material.state, observation: material.observation || '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const open = event.status === 'en_curso'
  const submit = async () => {
    setSaving(true); setError('')
    try {
      const body = { state: form.state, observation: form.observation }
      if (open) body.quantity = Number(form.quantity)
      const { data } = await api.put(`/socorro/eventos/${event.id}/materiales/${material.id}`, body)
      onSaved(data)
    } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title={`Editar: ${material.item.name}`} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="field"><label>Cantidad</label><input type="number" min="1" value={form.quantity} disabled={!open} onChange={(e) => setForm({ ...form, quantity: e.target.value })} />
          <span className="hint">Disponible en bodega: {qty(material.item.stock)} {material.item.unit}</span></div>
        <div className="field"><label>Estado del elemento</label>
          <select value={form.state} onChange={(e) => setForm({ ...form, state: e.target.value })}>{Object.entries(STATE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></div>
        <div className="field"><label>Observación</label><textarea value={form.observation} onChange={(e) => setForm({ ...form, observation: e.target.value })} /></div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

const Info = ({ icon, label, children }) => (
  <div className="ev-info"><span className="icon-bubble brand">{icon}</span><div><span>{label}</span><strong>{children}</strong></div></div>
)

// Buscar conductores y demás usuarios del sistema (por nombre o documento) para agregarlos al personal.
const UserLookup = ({ onPick }) => {
  const [q, setQ] = useState('')
  const [rows, setRows] = useState(null)
  const [pick, setPick] = useState(null)
  const [loading, setLoading] = useState(false)
  const search = async () => {
    if (q.trim().length < 3) return
    setLoading(true); setPick(null); onPick(null)
    try { const { data } = await api.get('/socorro/usuarios/buscar', { params: { q: q.trim(), sede: undefined } }); setRows(data) } catch { setRows([]) } finally { setLoading(false) }
  }
  const choose = (u) => { setPick(u); onPick(u) }
  return (
    <div className="field">
      <label>Buscar conductor o usuario del sistema</label>
      <div style={{ display: 'flex', gap: 8 }}>
        <div className="input-icon" style={{ flex: 1 }}><MdSearch /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o documento" onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); search() } }} /></div>
        <button type="button" className="btn btn-outline" onClick={search} disabled={loading}>{loading ? <Spinner /> : 'Buscar'}</button>
      </div>
      {rows && rows.length === 0 && <span className="hint">Sin resultados.</span>}
      {rows && rows.length > 0 && (
        <ul className="list user-pick">{rows.map((u) => (
          <li key={u.id} className={pick?.id === u.id ? 'on' : ''} onClick={() => !u.insuranceExpired && choose(u)} style={u.insuranceExpired ? { opacity: 0.55, cursor: 'not-allowed' } : undefined}>
            <div className="grow"><strong>{u.fullName}</strong><span>{u.roleLabel} · CC {u.identification}{u.siteName ? ` · ${u.siteName}` : ''}</span></div>
            {u.insuranceExpired ? <span className="badge bad">Seguro vencido</span> : u.remunerado ? <span className="badge warn">Remunerado · no suma horas</span> : u.isVolunteer ? <span className="badge ok">Suma horas</span> : <span className="badge info" title="Se registrará automáticamente como voluntario de apoyo">Se creará como voluntario</span>}
          </li>
        ))}</ul>
      )}
    </div>
  )
}

const todayISO = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())

const EventDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [toast, toastNode] = useToast()
  const [event, setEvent] = useState(null)
  const [items, setItems] = useState([])
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [modal, setModal] = useState(null) // 'finish' | 'delete' | 'edit' | {material}
  const [printing, setPrinting] = useState(() => new URLSearchParams(window.location.search).get('reporte') === '1')
  const [person, setPerson] = useState(null)
  const [byUser, setByUser] = useState(false)
  const [lookupKey, setLookupKey] = useState(0)
  const [mat, setMat] = useState({ itemId: '', quantity: 1, state: 'bueno', observation: '' })
  const [sup, setSup] = useState({ itemId: '', quantity: 1, observation: '' })
  const [obs, setObs] = useState('')
  const [edit, setEdit] = useState({ name: '', place: '' })
  const [, setTick] = useState(0)

  const load = useCallback(async () => {
    try {
      const [{ data: ev }, { data: inv }] = await Promise.all([api.get(`/socorro/eventos/${id}`), api.get('/socorro/inventario', { params: { evento: id } })])
      setEvent(ev); setItems(inv); setObs(ev.generalObservation || '')
    } catch (e) { setError(errorMessage(e)) }
  }, [id])
  useEffect(() => { load() }, [load])

  // Reloj de duración mientras el servicio está en curso.
  useEffect(() => {
    if (event?.status !== 'en_curso') return undefined
    const t = setInterval(() => setTick((x) => x + 1), 30000)
    return () => clearInterval(t)
  }, [event?.status])

  const refreshInventory = async () => { try { const { data } = await api.get('/socorro/inventario', { params: { evento: id } }); setItems(data) } catch { /* noop */ } }

  const run = async (fn, okMsg) => {
    setBusy(true)
    try {
      const { data } = await fn()
      if (data?.id) { setEvent(data); setObs(data.generalObservation || '') }
      if (okMsg) toast(okMsg)
      refreshInventory()
      return true
    } catch (e) {
      toast(errorMessage(e), 'bad')
      return false
    } finally { setBusy(false) }
  }

  const materialOptions = useMemo(() => items.filter((i) => i.active && !isConsumable(i.category) && !event?.materials.some((m) => m.item.id === i.id)), [items, event])
  const supplyOptions = useMemo(() => items.filter((i) => i.active && isConsumable(i.category) && !(i.expiryDate && i.expiryDate < todayISO())), [items])
  const selectedSupply = supplyOptions.find((i) => i.id === Number(sup.itemId))
  const selectedMaterial = materialOptions.find((i) => i.id === Number(mat.itemId))

  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!event) return <div className="splash"><Spinner /> Cargando evento…</div>
  if (printing) return <EventReport event={event} onBack={() => setPrinting(false)} />

  const p = event.permissions
  const open = event.status === 'en_curso'
  const canEdit = p.manage

  const addPerson = async () => {
    if (!person) return toast('Busca primero a la persona por carnet o documento', 'bad')
    const ok = await run(() => api.post(`/socorro/eventos/${event.id}/personal`, person.userPick ? { userId: person.id } : { volunteerId: person.id }), `${person.fullName} agregado al evento`)
    if (ok) { setPerson(null); setLookupKey((k) => k + 1) }
  }
  const addMaterial = async (e) => {
    e.preventDefault()
    if (!mat.itemId) return toast('Selecciona un elemento', 'bad')
    const ok = await run(() => api.post(`/socorro/eventos/${event.id}/materiales`, mat), 'Material agregado (salida de bodega)')
    if (ok) setMat({ itemId: '', quantity: 1, state: 'bueno', observation: '' })
  }
  const addSupply = async (e) => {
    e.preventDefault()
    if (!sup.itemId) return toast('Selecciona un insumo', 'bad')
    const ok = await run(() => api.post(`/socorro/eventos/${event.id}/insumos`, sup), 'Consumo registrado y descontado del inventario')
    if (ok) setSup({ itemId: '', quantity: 1, observation: '' })
  }
  const saveObs = () => run(() => api.put(`/socorro/eventos/${event.id}`, { name: event.name, place: event.place, generalObservation: obs }), 'Observación guardada')
  const remove = async () => {
    setBusy(true)
    try {
      await api.delete(`/socorro/eventos/${event.id}`)
      navigate(event.area === 'educacion' ? '/socorro/educacion' : '/socorro/eventos')
    } catch (e) { toast(errorMessage(e), 'bad'); setBusy(false) }
  }

  return (
    <>
      <div style={{ marginBottom: 14 }}><Link to={event.area === 'educacion' ? '/socorro/educacion' : '/socorro/eventos'} className="btn btn-ghost btn-sm"><MdArrowBack /> {event.area === 'educacion' ? 'Actividades de educación' : 'Eventos'}</Link></div>

      <section className="card ev-hero">
        <div className="ev-hero-top">
          <div style={{ minWidth: 0 }}>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
              <span className="badge navy">{event.code}</span><StatusBadge status={event.status} />
              {event.status === 'finalizado' && event.materialsComplete === false && <span className="badge bad">Materiales incompletos</span>}
            </div>
            <h1 style={{ fontSize: 22 }}>{event.name} <span className={`badge ${event.area === 'educacion' ? 'info' : 'brand'}`} style={{ verticalAlign: 4 }}>{event.area === 'educacion' ? 'Educación' : 'Socorro'}</span></h1>
            {event.siteName && <span className="site-chip" style={{ marginTop: 6 }}>📍 {event.siteName}</span>}
          </div>
          <div className="page-actions">
            {canEdit && <button type="button" className="btn btn-ghost" onClick={() => { setEdit({ name: event.name, place: event.place }); setModal('edit') }}><MdEdit /> Editar</button>}
            {p.delete && <button type="button" className="btn btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => setModal('delete')}><MdDelete /> Eliminar</button>}
            <button type="button" className="btn btn-outline" onClick={() => setPrinting(true)}><MdPrint /> Reporte PDF</button>
            {open && canEdit && <button type="button" className="btn btn-primary" onClick={() => setModal('finish')}><MdFlag /> Finalizar servicio</button>}
          </div>
        </div>
        <div className="ev-info-grid">
          <Info icon={<MdPlace />} label="Lugar">{event.place}</Info>
          <Info icon={<MdPerson />} label="Coordinador">{event.coordinator.fullName}<small>{event.coordinator.carnet} · CC {event.coordinator.document}</small></Info>
          <Info icon={<MdAccessTime />} label="Inicio">{fmtDateTime(event.startedAt)}</Info>
          <Info icon={<MdFlag />} label={open ? 'Duración (en curso)' : 'Terminación'}>{open ? duration(event.startedAt) : fmtDateTime(event.endedAt)}{!open && <small>Duración: {duration(event.startedAt, event.endedAt)}</small>}</Info>
        </div>
      </section>

      {open && !canEdit && (
        <div className="alert info" style={{ marginTop: 18 }}><MdLock /><span>Solo <b>{event.coordinator.fullName}</b> (coordinador) o un administrador pueden agregar o modificar materiales e insumos. Puedes registrarte como personal del evento con tu carnet o documento.</span></div>
      )}

      <div className="grid grid-2-1" style={{ marginTop: 18, alignItems: 'start' }}>
        <div className="stack">
          {/* ---------------- Materiales */}
          <Card title="Materiales y equipos" subtitle="Salen de bodega al agregarlos y regresan al finalizar el servicio" icon={<MdInventory2 style={{ color: 'var(--brand)' }} />} flush>
            {canEdit && open && (
              <form className="ev-add" onSubmit={addMaterial}>
                <select className="input" value={mat.itemId} onChange={(e) => setMat({ ...mat, itemId: e.target.value })} aria-label="Elemento">
                  <option value="">Agregar elemento…</option>
                  {['operacional', 'no_operacional'].map((c) => (
                    <optgroup key={c} label={CATEGORY_LABELS[c]}>
                      {materialOptions.filter((i) => i.category === c).map((i) => <option key={i.id} value={i.id} disabled={i.stock <= 0}>{i.name}{i.warehouseName ? ` · ${i.warehouseName}` : ''} — disp. {qty(i.stock)}</option>)}
                    </optgroup>
                  ))}
                </select>
                <input className="input" type="number" min="1" max={selectedMaterial?.stock} value={mat.quantity} onChange={(e) => setMat({ ...mat, quantity: e.target.value })} aria-label="Cantidad" style={{ width: 80 }} />
                <select className="input" value={mat.state} onChange={(e) => setMat({ ...mat, state: e.target.value })} aria-label="Estado" style={{ width: 120 }}>
                  {Object.entries(STATE_LABELS).filter(([v]) => v !== 'perdido').map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                <input className="input" value={mat.observation} onChange={(e) => setMat({ ...mat, observation: e.target.value })} placeholder="Observación" aria-label="Observación" />
                <button type="submit" className="btn btn-primary" disabled={busy}><MdAdd /> Agregar</button>
              </form>
            )}
            {event.materials.length === 0 ? <Empty icon={<MdInventory2 />}>Sin materiales registrados.</Empty> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Cant.</th><th>Elemento</th>{!open && <th>Regresó</th>}<th>Estado</th><th>Observación</th>{canEdit && <th className="actions" />}</tr></thead>
                  <tbody>
                    {event.materials.map((m) => (
                      <tr key={m.id}>
                        <td><strong style={{ color: 'var(--ink)' }}>{qty(m.quantity)}</strong></td>
                        <td><strong style={{ color: 'var(--ink)' }}>{m.item.name}</strong><div><span className={`badge ${CATEGORY_TONE[m.item.category]}`} style={{ fontSize: 11 }}>{CATEGORY_LABELS[m.item.category]}</span></div></td>
                        {!open && <td>{m.returned === m.quantity ? <span className="badge ok">{qty(m.returned)}</span> : <span className="badge bad">{qty(m.returned ?? 0)} de {qty(m.quantity)}</span>}</td>}
                        <td><span className={`badge ${STATE_TONE[m.state]}`}>{STATE_LABELS[m.state]}</span></td>
                        <td style={{ maxWidth: 220, whiteSpace: 'normal' }}>{m.observation || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                        {canEdit && (
                          <td className="actions">
                            <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ material: m })}><MdEdit /></button>
                            {open && <button type="button" className="btn btn-ghost btn-icon" aria-label="Quitar" style={{ color: 'var(--bad)' }} disabled={busy}
                              onClick={() => run(() => api.delete(`/socorro/eventos/${event.id}/materiales/${m.id}`), 'Material devuelto a bodega')}><MdDelete /></button>}
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          {/* ---------------- Insumos */}
          <Card title={event.area === 'educacion' ? 'Insumos entregados' : 'Insumos consumidos'} subtitle="Medicamentos, dispositivos médicos y reactivos: se descuentan de la bodega de la sede y no regresan a la bodega general" icon={<MdMedicalServices style={{ color: 'var(--brand)' }} />} flush>
            {canEdit && open && (
              <form className="ev-add" onSubmit={addSupply}>
                <select className="input" value={sup.itemId} onChange={(e) => setSup({ ...sup, itemId: e.target.value })} aria-label="Insumo">
                  <option value="">Registrar consumo de…</option>
                  {CONSUMABLE.map((c) => (
                    <optgroup key={c} label={CATEGORY_LABELS[c]}>
                      {supplyOptions.filter((i) => i.category === c).map((i) => <option key={i.id} value={i.id} disabled={i.stock <= 0}>{i.name}{i.lot ? ` · lote ${i.lot}` : ''}{i.warehouseName ? ` · ${i.warehouseName}` : ''} — disp. {qty(i.stock)} {i.unit}{i.low ? ' ⚠' : ''}</option>)}
                    </optgroup>
                  ))}
                </select>
                <input className="input" type="number" min="1" max={selectedSupply?.stock} value={sup.quantity} onChange={(e) => setSup({ ...sup, quantity: e.target.value })} aria-label="Cantidad" style={{ width: 80 }} />
                <input className="input" value={sup.observation} onChange={(e) => setSup({ ...sup, observation: e.target.value })} placeholder="Observación" aria-label="Observación" />
                <button type="submit" className="btn btn-primary" disabled={busy}><MdAdd /> Registrar</button>
              </form>
            )}
            {selectedSupply?.low && canEdit && <div className="alert warn" style={{ margin: '0 16px 12px' }}><MdWarning /><span>{selectedSupply.name} está en stock bajo ({qty(selectedSupply.stock)} de mínimo {qty(selectedSupply.minStock)}).</span></div>}
            {event.supplies.length === 0 ? <Empty icon={<MdMedicalServices />}>Sin consumos registrados.</Empty> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Cant.</th><th>Insumo</th><th>Observación</th><th>Registró</th><th>Hora</th>{canEdit && open && <th className="actions" />}</tr></thead>
                  <tbody>
                    {event.supplies.map((s) => (
                      <tr key={s.id}>
                        <td><strong style={{ color: 'var(--ink)' }}>{qty(s.quantity)}</strong> <span style={{ color: 'var(--muted)', fontSize: 12 }}>{s.item.unit}</span></td>
                        <td><strong style={{ color: 'var(--ink)' }}>{s.item.name}</strong>{s.item.low && <div><span className="badge warn" style={{ fontSize: 11 }}>Stock bajo: {qty(s.item.stock)}</span></div>}</td>
                        <td style={{ whiteSpace: 'normal' }}>{s.observation || <span style={{ color: 'var(--muted)' }}>—</span>}</td>
                        <td>{s.user || '—'}</td>
                        <td>{fmtTime(s.createdAt)}</td>
                        {canEdit && open && <td className="actions"><button type="button" className="btn btn-ghost btn-icon" aria-label="Anular" style={{ color: 'var(--bad)' }} disabled={busy}
                          onClick={() => run(() => api.delete(`/socorro/eventos/${event.id}/insumos/${s.id}`), 'Consumo anulado y stock restituido')}><MdDelete /></button></td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>

          <Card title="Observación general" icon={<MdNotes style={{ color: 'var(--brand)' }} />}>
            {canEdit ? (
              <>
                <div className="field"><textarea value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Novedades del servicio, atenciones, traslados…" /></div>
                <div className="form-actions" style={{ marginTop: 12 }}><button type="button" className="btn btn-outline" onClick={saveObs} disabled={busy || obs === (event.generalObservation || '')}><MdSave /> Guardar observación</button></div>
              </>
            ) : <p style={{ margin: 0, whiteSpace: 'pre-wrap', color: event.generalObservation ? 'var(--ink-2)' : 'var(--muted)' }}>{event.generalObservation || 'Sin observaciones.'}</p>}
          </Card>
        </div>

        {/* ---------------- Personal */}
        <Card title="Personal del evento" subtitle={`${event.personnel.length} persona${event.personnel.length === 1 ? '' : 's'}`} icon={<MdPeople style={{ color: 'var(--brand)' }} />} flush>
          {open && (
            <div style={{ padding: '4px 20px 16px' }}>
              <label className="switch" style={{ marginBottom: 10 }}><input type="checkbox" checked={byUser} onChange={(e) => { setByUser(e.target.checked); setPerson(null) }} /> Agregar conductor o personal del sistema</label>
              {byUser
                ? <UserLookup key={`u${lookupKey}`} onPick={(u) => setPerson(u ? { ...u, userPick: true } : null)} />
                : <PersonLookup siteId={event.siteId} key={lookupKey} label="Agregar voluntario por carnet o documento" onFound={setPerson} compact excludeEventId={event.id} />}
              <button type="button" className="btn btn-dark btn-block" style={{ marginTop: 10 }} disabled={!person || busy} onClick={addPerson}><MdPersonAdd /> Agregar al evento</button>
            </div>
          )}
          <ul className="list" style={{ padding: '0 20px 8px' }}>
            {event.personnel.map((v, i) => (
              <li key={v.id}>
                <span className="avatar sm">{initials(v.fullName)}</span>
                <div className="grow">
                  <strong>{i + 1}. {v.fullName}{v.personId === event.coordinator.id && <span className="badge brand" style={{ marginLeft: 6, fontSize: 11 }}>Coordinador</span>}{v.siteId && v.siteId !== event.siteId && <span className="badge info" style={{ marginLeft: 6, fontSize: 11 }} title={`Visitante de ${v.siteName}`}>Visitante · {v.siteName}</span>}</strong>
                  <span>{v.carnet || (v.userId ? v.roleLabel : 'Sin carnet')} · CC {v.document}{v.userId ? '' : ` · ${v.bloodType || '—'} · ${v.agrupacion || '—'}`}{v.roleLabel && !v.userId ? ` · ${v.roleLabel}` : ''}</span>
                  {!v.countsHours && <span className="badge warn" style={{ fontSize: 10.5, marginTop: 2 }} title="Personal remunerado o usuario sin registro de voluntario">No suma horas</span>}
                  {v.missingData?.length > 0 && <span className="badge info" style={{ fontSize: 10.5, marginTop: 2 }} title={`Falta: ${v.missingData.join(', ')}`}>Faltan datos de voluntario</span>}
                </div>
                {canEdit && open && v.personId !== event.coordinator.id && (
                  <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label={`Retirar a ${v.fullName}`} disabled={busy}
                    onClick={() => run(() => api.delete(`/socorro/eventos/${event.id}/personal/${v.id}`), 'Persona retirada')}><MdDelete /></button>
                )}
              </li>
            ))}
          </ul>
        </Card>
      </div>

      {modal === 'finish' && <FinishModal event={event} onClose={() => setModal(null)} onDone={(d) => { setEvent(d); setObs(d.generalObservation || ''); setModal(null); refreshInventory(); toast('Servicio finalizado. Hora de terminación registrada.') }} />}
      {modal?.material && <MaterialModal event={event} material={modal.material} onClose={() => setModal(null)} onSaved={(d) => { setEvent(d); setModal(null); refreshInventory(); toast('Material actualizado') }} />}
      {modal === 'edit' && (
        <Modal title="Editar evento" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
            <button type="button" className="btn btn-primary" disabled={busy} onClick={async () => { if (await run(() => api.put(`/socorro/eventos/${event.id}`, { ...edit, generalObservation: event.generalObservation }), 'Evento actualizado')) setModal(null) }}><MdSave /> Guardar</button></>}>
          <div className="stack" style={{ gap: 14 }}>
            <div className="field"><label>{event.area === 'educacion' ? 'Actividad' : 'Evento / emergencia'}</label><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></div>
            <div className="field"><label>Lugar</label><input value={edit.place} onChange={(e) => setEdit({ ...edit, place: e.target.value })} /></div>
          </div>
        </Modal>
      )}
      {modal === 'delete' && (
        <Modal title="Eliminar evento" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>{busy ? <Spinner /> : <MdDelete />} Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar <b>{event.code} · {event.name}</b>? Se devolverán al inventario los materiales que no hayan regresado y los insumos registrados. Esta acción no se puede deshacer.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default EventDetail
