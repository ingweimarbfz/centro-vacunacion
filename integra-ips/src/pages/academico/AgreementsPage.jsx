import React, { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdEdit, MdDelete, MdErrorOutline, MdHandshake } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { formatDate } from '../../utils/format'
import { AGREEMENT_KINDS } from './common'

const EMPTY = { name: '', nit: '', kind: 'empresa', contributionPct: '', contactName: '', phone: '', email: '', startsOn: '', endsOn: '', notes: '', active: true }

const AgreementForm = ({ initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => ({ ...EMPTY, ...Object.fromEntries(Object.entries(initial || {}).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])) }))
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.name.trim()) return setError('El nombre del convenio es requerido.')
    setSaving(true)
    try { const { data } = editing ? await api.put(`/academico/convenios/${initial.id}`, f) : await api.post('/academico/convenios', f); onSaved(data, editing) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? `Editar ${initial.name}` : 'Nuevo convenio'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="agr-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} Guardar</button></>}>
      <form id="agr-form" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="field span-all"><label>Entidad <span className="req">*</span></label><input value={f.name} onChange={set('name')} autoFocus placeholder="Empresa, alcaldía, IPS o fundación" /></div>
          <div className="field"><label>NIT</label><input value={f.nit} onChange={set('nit')} /></div>
          <div className="field"><label>Tipo</label><select value={f.kind} onChange={set('kind')}>{Object.entries(AGREEMENT_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Aporte sobre la matrícula (%)</label><input type="number" min="0" max="100" step="0.5" value={f.contributionPct} onChange={set('contributionPct')} placeholder="0" /><span className="hint">Se sugiere al matricular; se puede ajustar.</span></div>
          <div className="field"><label>Contacto</label><input value={f.contactName} onChange={set('contactName')} /></div>
          <div className="field"><label>Teléfono</label><input type="tel" value={f.phone} onChange={set('phone')} /></div>
          <div className="field"><label>Correo</label><input type="email" value={f.email} onChange={set('email')} /></div>
          <div className="field"><label>Vigente desde</label><input type="date" value={f.startsOn} onChange={set('startsOn')} /></div>
          <div className="field"><label>Hasta</label><input type="date" value={f.endsOn} onChange={set('endsOn')} /></div>
          <div className="field span-all"><label>Observaciones</label><input value={f.notes} onChange={set('notes')} placeholder="Condiciones, cupos, escenarios de práctica…" /></div>
          {editing && <div className="field span-all"><label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Convenio activo' : 'Convenio inactivo'}</label></div>}
        </div>
        {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

// Convenios con empresas, entidades públicas e IPS de práctica que aportan a la matrícula de sus beneficiarios.
const AgreementsPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const load = useCallback(() => api.get('/academico/convenios').then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))), [])
  useEffect(() => { load() }, [load])
  const remove = async () => { try { await api.delete(`/academico/convenios/${modal.delete.id}`); toast('Convenio eliminado'); setModal(null); load() } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) } }
  return (
    <>
      <PageHead title="Convenios" subtitle="Entidades que financian total o parcialmente la matrícula de sus beneficiarios">
        {admin && <button type="button" className="btn btn-primary" onClick={() => setModal({ edit: {} })}><MdAdd /> Nuevo convenio</button>}
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? (!error && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>) : rows.length === 0 ? <Card><Empty icon={<MdHandshake />}>Aún no hay convenios registrados.</Empty></Card> : (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Entidad</th><th>Tipo</th><th className="num">Aporte</th><th>Contacto</th><th>Vigencia</th><th className="num">Matrículas activas</th><th>Estado</th>{admin && <th className="actions" />}</tr></thead>
              <tbody>{rows.map((a) => (
                <tr key={a.id} style={a.active ? undefined : { opacity: 0.6 }}>
                  <td><b>{a.name}</b>{a.nit && <div style={{ fontSize: 12, color: 'var(--muted)' }}>NIT {a.nit}</div>}</td>
                  <td>{a.kindLabel}</td>
                  <td className="num">{a.contributionPct ? `${a.contributionPct} %` : '—'}</td>
                  <td style={{ fontSize: 12.5 }}>{a.contactName || '—'}{(a.phone || a.email) && <div style={{ color: 'var(--muted)' }}>{[a.phone, a.email].filter(Boolean).join(' · ')}</div>}</td>
                  <td>{a.startsOn || a.endsOn ? `${formatDate(a.startsOn)} – ${formatDate(a.endsOn)}` : '—'}</td>
                  <td className="num">{a.enrollments}</td>
                  <td>{a.active ? <span className="badge ok"><span className="dot" /> Activo</span> : <span className="badge"><span className="dot" /> Inactivo</span>}</td>
                  {admin && <td className="actions"><button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ edit: a })}><MdEdit /></button><button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delete: a })}><MdDelete /></button></td>}
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}
      {modal?.edit && <AgreementForm initial={modal.edit} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); load(); toast(e ? 'Convenio actualizado' : 'Convenio creado') }} />}
      {modal?.delete && (
        <Modal title="Eliminar convenio" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={remove}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar el convenio <b>{modal.delete.name}</b>? Si tiene matrículas, desactívalo en su lugar.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default AgreementsPage
