import React, { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdEdit, MdDelete, MdErrorOutline, MdMeetingRoom } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { SITE_TYPES } from '../../utils/permissions'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'

export const ROOM_KINDS = { aula: 'Aula', laboratorio: 'Laboratorio', simulacion: 'Sala de simulación', auditorio: 'Auditorio', practica: 'Escenario de práctica', otro: 'Otro' }
const EMPTY = { name: '', siteId: '', kind: 'aula', capacity: '', resources: '', active: true }

const RoomForm = ({ initial, sites, admin, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => ({ ...EMPTY, ...Object.fromEntries(Object.entries(initial || {}).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])) }))
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.name.trim()) return setError('El nombre es requerido.')
    setSaving(true)
    try { const { data } = editing ? await api.put(`/academico/aulas/${initial.id}`, f) : await api.post('/academico/aulas', f); onSaved(data, editing) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? `Editar ${initial.name}` : 'Nueva aula o salón'} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="room-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} Guardar</button></>}>
      <form id="room-form" onSubmit={submit} noValidate className="stack" style={{ gap: 12 }}>
        <div className="field"><label>Nombre <span className="req">*</span></label><input value={f.name} onChange={set('name')} autoFocus placeholder="Ej. Salón 204, Laboratorio de simulación" /></div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Tipo</label><select value={f.kind} onChange={set('kind')}>{Object.entries(ROOM_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Capacidad</label><input type="number" min="1" value={f.capacity} onChange={set('capacity')} placeholder="Estudiantes" /></div>
        </div>
        {admin && <div className="field"><label>Sede</label>
          <select value={f.siteId} onChange={set('siteId')}><option value="">Seccional (por defecto)</option>{Object.entries(SITE_TYPES).map(([t, l]) => <optgroup key={t} label={l}>{sites.filter((x) => x.type === t).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>)}</select></div>}
        <div className="field"><label>Recursos</label><input value={f.resources} onChange={set('resources')} placeholder="Video beam, maniquíes, camillas…" /></div>
        {editing && <label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Activa (se puede asignar)' : 'Inactiva'}</label>}
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

// Aulas y salones de cada sede: se asignan a las clases presenciales y el sistema no deja cruzar dos clases en la misma aula.
const ClassroomsPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null); const [sites, setSites] = useState([])
  const [error, setError] = useState(''); const [modal, setModal] = useState(null)
  const load = useCallback(() => api.get('/academico/aulas').then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))), [])
  useEffect(() => { load(); if (admin) api.get('/sedes', { params: { sede: undefined } }).then(({ data }) => setSites(data)).catch(() => {}) }, [load, admin])
  const remove = async () => { try { await api.delete(`/academico/aulas/${modal.delete.id}`); toast('Aula eliminada'); setModal(null); load() } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) } }
  return (
    <>
      <PageHead title="Aulas y salones" subtitle="Espacios de cada sede para las clases presenciales. Un aula no puede tener dos clases a la misma hora.">
        <button type="button" className="btn btn-primary" onClick={() => setModal({ edit: {} })}><MdAdd /> Nueva aula</button>
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? (!error && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>) : rows.length === 0 ? <Card><Empty icon={<MdMeetingRoom />}>Aún no hay aulas. Crea las de cada sede.</Empty></Card> : (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Aula</th><th>Tipo</th><th>Sede</th><th className="num">Capacidad</th><th>Recursos</th><th className="num">Clases próximas</th><th>Estado</th><th className="actions" /></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id} style={r.active ? undefined : { opacity: 0.6 }}>
                  <td><b>{r.name}</b></td><td>{r.kindLabel}</td><td>{r.siteName || 'Todas'}</td><td className="num">{r.capacity || '—'}</td>
                  <td style={{ whiteSpace: 'normal', fontSize: 12.5 }}>{r.resources || '—'}</td><td className="num">{r.upcoming}</td>
                  <td>{r.active ? <span className="badge ok"><span className="dot" /> Activa</span> : <span className="badge"><span className="dot" /> Inactiva</span>}</td>
                  <td className="actions"><button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ edit: r })}><MdEdit /></button>{admin && <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delete: r })}><MdDelete /></button>}</td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}
      {modal?.edit && <RoomForm initial={modal.edit.id ? modal.edit : null} sites={sites} admin={admin} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); load(); toast(e ? 'Aula actualizada' : `Aula ${d.name} creada`) }} />}
      {modal?.delete && (
        <Modal title="Eliminar aula" size="sm" onClose={() => setModal(null)} footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={remove}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar <b>{modal.delete.name}</b>? Si ya tiene clases, desactívala en su lugar.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default ClassroomsPage
