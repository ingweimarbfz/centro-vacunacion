import React, { useEffect, useMemo, useState } from 'react'
import { MdPersonAdd, MdSearch, MdEdit, MdDelete, MdBadge, MdErrorOutline } from 'react-icons/md'
import { Link, useSearchParams } from 'react-router-dom'
import api, { errorMessage, getSiteFilter } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { can } from '../../utils/permissions'
import { PageHead, Card, Modal, Empty, Spinner, useToast, initials } from '../../components/ui'
import { BLOOD_TYPES, AGRUPACIONES } from './common'

const EMPTY = { document: '', carnet: '', firstName: '', lastName: '', bloodType: '', agrupacion: '', phone: '', email: '', active: true, volunteerType: 'base', joinedAt: '', insuranceEntity: '', insurancePolicy: '', insuranceExpiry: '', siteId: '' }
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const insStatus = (iso) => { if (!iso) return ['Sin seguro', 'bad']; const d = Math.round((new Date(`${iso}T12:00:00`) - new Date(`${today()}T12:00:00`)) / 86400000); return d < 0 ? ['Vencido', 'bad'] : d <= 30 ? [`Vence en ${d} d`, 'warn'] : ['Al día', 'ok'] }

const PersonForm = ({ initial, sites, admin, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [form, setForm] = useState(editing ? { ...EMPTY, ...Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v ?? ''])) } : { ...EMPTY, joinedAt: today(), siteId: getSiteFilter() || '' })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => {
    let v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    if (k === 'phone') v = v.replace(/\D/g, '').slice(0, 10)
    setForm({ ...form, [k]: v })
  }
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!form.document.trim() || !form.firstName.trim() || !form.lastName.trim()) return setError('Documento, nombres y apellidos son requeridos.')
    if (!AGRUPACIONES.includes(form.agrupacion)) return setError('Selecciona la agrupación: Socorrismo, Damas Grises o Juventud.')
    if (form.phone && form.phone.length !== 10) return setError('El celular debe tener 10 dígitos.')
    setSaving(true)
    try {
      const { data } = editing ? await api.put(`/socorro/personas/${initial.id}`, form) : await api.post('/socorro/personas', form)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar persona' : 'Registrar persona'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" form="person-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} {editing ? 'Guardar cambios' : 'Registrar'}</button></>}>
      <form id="person-form" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="field"><label>Nombres <span className="req">*</span></label><input value={form.firstName} onChange={set('firstName')} autoFocus /></div>
          <div className="field"><label>Apellidos <span className="req">*</span></label><input value={form.lastName} onChange={set('lastName')} /></div>
          <div className="field"><label>Documento de identidad <span className="req">*</span></label><input value={form.document} onChange={set('document')} inputMode="numeric" /></div>
          <div className="field"><label>No. carnet</label><input value={form.carnet} onChange={set('carnet')} placeholder="Ej. CRC-0210" /></div>
          <div className="field"><label>Grupo sanguíneo</label>
            <select value={form.bloodType} onChange={set('bloodType')}><option value="">Selecciona…</option>{BLOOD_TYPES.map((b) => <option key={b}>{b}</option>)}</select></div>
          <div className="field"><label>Agrupación <span className="req">*</span></label>
            <select value={form.agrupacion} onChange={set('agrupacion')}><option value="">Selecciona…</option>{AGRUPACIONES.map((a) => <option key={a}>{a}</option>)}</select></div>
          <div className="field"><label>Celular</label><input type="tel" value={form.phone} onChange={set('phone')} placeholder="10 dígitos" inputMode="numeric" /></div>
          <div className="field"><label>Correo</label><input type="email" value={form.email} onChange={set('email')} /></div>
          <div className="field"><label>Tipo de voluntario</label>
            <select value={form.volunteerType} onChange={set('volunteerType')}><option value="base">Base (mínimo 12 h al mes)</option><option value="apoyo">Apoyo (sin horas mínimas)</option></select></div>
          <div className="field"><label>Fecha de ingreso</label><input type="date" value={form.joinedAt} onChange={set('joinedAt')} /></div>
          {admin && <div className="field span-all"><label>Sede</label>
            <select value={form.siteId} onChange={set('siteId')}><option value="">{editing ? 'Sin cambio' : 'Sede del filtro o Seccional'}</option>{sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>}
          <div className="field"><label>Seguro del voluntariado: aseguradora</label><input value={form.insuranceEntity} onChange={set('insuranceEntity')} /></div>
          <div className="field"><label>N° de póliza</label><input value={form.insurancePolicy} onChange={set('insurancePolicy')} /></div>
          <div className="field"><label>Vence</label><input type="date" value={form.insuranceExpiry} onChange={set('insuranceExpiry')} /></div>
          <div className="field span-all"><label className="switch"><input type="checkbox" checked={form.active} onChange={set('active')} /> {form.active ? 'Activo (puede asignarse a eventos)' : 'Inactivo'}</label>
            {editing && !initial.active && form.active && <span className="hint">Al reactivarlo, las horas mínimas se vuelven a contar desde hoy.</span>}
            {editing && !form.active && initial.inactiveReason && <span className="hint">Motivo: {initial.inactiveReason}</span>}</div>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

const PeoplePage = () => {
  const { user } = useAuth()
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [params] = useSearchParams()
  const [q, setQ] = useState(params.get('q') || '')
  const [onlyMissing, setOnlyMissing] = useState(() => new URLSearchParams(window.location.search).get('incompletos') === '1')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const admin = user.role === 'administrador'
  const [sites, setSites] = useState([])
  useEffect(() => { if (admin) api.get('/sedes', { params: { sede: undefined } }).then(({ data }) => setSites(data)).catch(() => {}) }, [admin])
  useEffect(() => { api.get('/socorro/personas').then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))) }, [])

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase()
    return (rows || []).filter((r) => (!onlyMissing || r.missingData?.length) && (!s || [r.fullName, r.document, r.carnet, r.agrupacion].some((v) => v && v.toLowerCase().includes(s))))
  }, [rows, q, onlyMissing])
  const incomplete = (rows || []).filter((r) => r.active && r.missingData?.length)

  const onSaved = (p, wasEdit) => {
    setRows((list) => wasEdit ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p].sort((a, b) => a.fullName.localeCompare(b.fullName)))
    setEditing(null); toast(wasEdit ? 'Persona actualizada' : 'Persona registrada')
  }
  const remove = async () => {
    setBusy(true)
    try { await api.delete(`/socorro/personas/${deleting.id}`); setRows((l) => l.filter((x) => x.id !== deleting.id)); toast('Persona eliminada'); setDeleting(null) } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy(false) }
  }

  return (
    <>
      <PageHead title="Personas y voluntarios" subtitle="Registro previo para asignar coordinadores y personal a los eventos">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}><MdPersonAdd /> Registrar persona</button>
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{error}</span></div>}
      {incomplete.length > 0 && (
        <div className="alert warn" style={{ marginBottom: 18 }}><MdErrorOutline />
          <div><strong>{incomplete.length} voluntario{incomplete.length === 1 ? '' : 's'} con datos por completar</strong>
            {incomplete.filter((r) => r.autoCreated).length > 0 && ` · ${incomplete.filter((r) => r.autoCreated).length} creado${incomplete.filter((r) => r.autoCreated).length === 1 ? '' : 's'} automáticamente al agregarlos a un evento`}. Completa carnet, agrupación, grupo sanguíneo, celular y seguro.</div>
          <button type="button" className="btn btn-outline btn-sm alert-actions" onClick={() => setOnlyMissing((x) => !x)}>{onlyMissing ? 'Ver todos' : 'Ver solo esos'}</button>
        </div>
      )}
      <Card flush>
        <div className="table-toolbar">
          <div className="input-icon"><MdSearch /><input className="input" placeholder="Buscar por nombre, documento, carnet o agrupación" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <span style={{ color: 'var(--muted)', fontSize: 13 }}>{rows ? `${rows.filter((r) => r.active).length} activos de ${rows.length}` : ''}</span>
        </div>
        {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : filtered.length === 0 ? <Empty icon={<MdBadge />}>No hay personas que coincidan.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Persona</th><th>Carnet / documento</th>{admin && <th>Sede</th>}<th>Tipo</th><th className="num">Horas del mes</th><th>Seguro</th><th>Estado</th><th className="actions" /></tr></thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id}>
                    <td><div className="cell-user"><span className="avatar sm">{initials(r.fullName)}</span><div><strong>{r.fullName}</strong><span>{r.email || ''}</span>
                      {r.missingData?.length > 0 && <span className="badge warn" style={{ fontSize: 10.5, marginTop: 2 }} title={`Falta: ${r.missingData.join(', ')}`}>{r.autoCreated ? 'Creado automáticamente · ' : ''}Faltan datos</span>}</div></div></td>
                    <td>{r.carnet ? <span className="badge navy">{r.carnet}</span> : '—'}<div style={{ fontSize: 12, color: 'var(--muted)' }}>CC {r.document} · {r.bloodType || '—'}</div></td>
                    {admin && <td>{r.siteName || '—'}</td>}
                    <td>{r.volunteerType === 'base' ? <span className="badge info">Base</span> : <span className="badge">Apoyo</span>}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.agrupacion || ''}</div></td>
                    <td className="num"><strong style={{ color: r.volunteerType === 'base' && r.monthHours < 12 ? 'var(--warn)' : 'var(--ink)' }}>{r.monthHours} h</strong>{r.volunteerType === 'base' && <div style={{ fontSize: 11, color: 'var(--muted)' }}>mín. 12 h</div>}</td>
                    <td><span className={`badge ${insStatus(r.insuranceExpiry)[1]}`}>{insStatus(r.insuranceExpiry)[0]}</span></td>
                    <td>{r.active ? <span className="badge ok"><span className="dot" /> Activo</span> : <span className="badge bad" title={r.inactiveReason || ''}><span className="dot" /> Inactivo</span>}</td>
                    <td className="actions">
                      <Link className="btn btn-ghost btn-sm" to={`/socorro/voluntario?id=${r.id}`}>Panel</Link>
                      <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setEditing(r)}><MdEdit /></button>
                      {can.deletePeople(user.role) && <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setDeleting(r)}><MdDelete /></button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing && <PersonForm initial={editing} sites={sites} admin={admin} onClose={() => setEditing(null)} onSaved={onSaved} />}
      {deleting && (
        <Modal title="Eliminar persona" size="sm" onClose={() => setDeleting(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setDeleting(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={remove} disabled={busy}>{busy ? <Spinner /> : <MdDelete />} Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar a <b>{deleting.fullName}</b>? Si ya participó en eventos no se podrá eliminar; en ese caso márcala como inactiva.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default PeoplePage
