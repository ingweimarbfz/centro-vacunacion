import React, { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdEdit, MdDelete, MdErrorOutline, MdHealing, MdCheck, MdClose } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { IPS_MODULES, SITE_TYPES } from '../utils/permissions'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../components/ui'

const EMPTY = { name: '', code: '', description: '', module: '', active: true, siteIds: [] }

const ServiceForm = ({ initial, sites, services, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => (editing ? { ...EMPTY, ...initial, description: initial.description || '', module: initial.module || '' } : EMPTY))
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const toggle = (id) => setF({ ...f, siteIds: f.siteIds.includes(id) ? f.siteIds.filter((x) => x !== id) : [...f.siteIds, id] })
  const taken = Object.fromEntries(services.filter((s) => s.module && s.id !== initial?.id).map((s) => [s.module, s.name]))
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.name.trim()) return setError('El nombre del servicio es requerido.')
    setSaving(true)
    try {
      const { data } = editing ? await api.put(`/servicios-ips/${initial.id}`, f) : await api.post('/servicios-ips', f)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? `Editar ${initial.name}` : 'Nuevo servicio de IPS'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="svc-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} Guardar</button></>}>
      <form id="svc-form" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="field"><label>Nombre <span className="req">*</span></label><input value={f.name} onChange={set('name')} placeholder="Ej. Laboratorio clínico" autoFocus /></div>
          <div className="field"><label>Código</label><input value={f.code} onChange={set('code')} placeholder="Se genera del nombre" disabled={editing} /></div>
          <div className="field span-all"><label>Descripción</label><input value={f.description} onChange={set('description')} placeholder="Qué presta el servicio" /></div>
          <div className="field span-all"><label>Módulo del sistema que habilita</label>
            <select value={f.module} onChange={set('module')}>
              <option value="">Ninguno (solo área / servicio para equipos e inventario)</option>
              {Object.entries(IPS_MODULES).map(([k, l]) => <option key={k} value={k} disabled={Boolean(taken[k])}>{l}{taken[k] ? ` · ya lo usa ${taken[k]}` : ''}</option>)}
            </select>
            <span className="hint">Las sedes con este servicio verán ese módulo en el menú de IPS.</span></div>
          <div className="field span-all"><label>Sedes donde está activo</label>
            <div className="rc-checks" style={{ marginTop: 6 }}>
              {sites.map((s) => <label key={s.id} className={`rc-check${f.siteIds.includes(s.id) ? ' on' : ''}`}><input type="checkbox" checked={f.siteIds.includes(s.id)} onChange={() => toggle(s.id)} /> {s.name}</label>)}
            </div></div>
          <div className="field span-all"><label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Servicio activo' : 'Servicio inactivo en todas las sedes'}</label></div>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

const IpsServicesPage = () => {
  const [toast, toastNode] = useToast()
  const [services, setServices] = useState(null)
  const [sites, setSites] = useState([])
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const [busy, setBusy] = useState('')

  const load = useCallback(async () => {
    try {
      const [{ data: s }, { data: si }] = await Promise.all([api.get('/servicios-ips'), api.get('/sedes', { params: { sede: undefined } })])
      setServices(s); setSites(si.sort((a, b) => (a.type === 'seccional' ? -1 : b.type === 'seccional' ? 1 : a.name.localeCompare(b.name))))
    } catch (e) { setError(errorMessage(e)) }
  }, [])
  useEffect(() => { load() }, [load])

  const toggle = async (svc, site) => {
    const on = !svc.siteIds.includes(site.id)
    setBusy(`${svc.id}-${site.id}`)
    try {
      const { data } = await api.put(`/servicios-ips/${svc.id}/sedes/${site.id}`, { enabled: on })
      setServices((list) => list.map((x) => (x.id === data.id ? data : x)))
      toast(`${svc.name} ${on ? 'activado' : 'desactivado'} en ${site.name}`)
    } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy('') }
  }
  const remove = async () => {
    try { await api.delete(`/servicios-ips/${modal.delete.id}`); toast('Servicio eliminado'); setModal(null); load() } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) }
  }

  return (
    <>
      <PageHead title="Servicios de IPS" subtitle="Crea los servicios habilitados (vacunación, citología, ambulancias, laboratorio clínico…) y actívalos por unidad municipal o grupo de apoyo">
        <button type="button" className="btn btn-primary" onClick={() => setModal({ edit: {} })}><MdAdd /> Nuevo servicio</button>
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{error}</span></div>}
      {!services ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : services.length === 0 ? <Card><Empty icon={<MdHealing />}>Aún no hay servicios.</Empty></Card> : (
        <div className="stack">
          <Card flush title="Servicios" subtitle={`${services.length} servicios · ${services.filter((s) => s.active).length} activos`} icon={<MdHealing style={{ color: 'var(--brand)' }} />}>
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead><tr><th>Servicio</th><th>Módulo que habilita</th><th className="num">Sedes</th><th className="num">Equipos</th><th>Estado</th><th className="actions" /></tr></thead>
                <tbody>{services.map((s) => (
                  <tr key={s.id}>
                    <td style={{ whiteSpace: 'normal' }}><strong style={{ color: 'var(--ink)' }}>{s.name}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.code}{s.description ? ` · ${s.description}` : ''}</div></td>
                    <td>{s.module ? <span className="badge navy">{IPS_MODULES[s.module].split(' (')[0]}</span> : <span className="badge">Área / servicio</span>}</td>
                    <td className="num">{s.siteIds.length}</td>
                    <td className="num">{s.equipment ?? 0}</td>
                    <td>{s.active ? <span className="badge ok"><span className="dot" /> Activo</span> : <span className="badge"><span className="dot" /> Inactivo</span>}</td>
                    <td className="actions">
                      <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ edit: s })}><MdEdit /></button>
                      <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delete: s })}><MdDelete /></button>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>

          <Card flush title="Servicios por sede" subtitle="Toca una casilla para activar o desactivar el servicio en esa sede">
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table svc-matrix">
                <thead><tr><th>Sede</th>{services.map((s) => <th key={s.id} style={{ textAlign: 'center' }}>{s.name}</th>)}</tr></thead>
                <tbody>{sites.map((site) => (
                  <tr key={site.id}>
                    <td><strong style={{ color: 'var(--ink)' }}>{site.name}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{SITE_TYPES[site.type]}</div></td>
                    {services.map((s) => {
                      const on = s.siteIds.includes(site.id)
                      return (
                        <td key={s.id} style={{ textAlign: 'center' }}>
                          <button type="button" className={`svc-toggle${on ? ' on' : ''}`} disabled={busy === `${s.id}-${site.id}` || !s.active} aria-pressed={on}
                            aria-label={`${s.name} en ${site.name}`} title={!s.active ? 'Servicio inactivo' : on ? 'Desactivar' : 'Activar'} onClick={() => toggle(s, site)}>
                            {busy === `${s.id}-${site.id}` ? <Spinner /> : on ? <MdCheck /> : <MdClose />}
                          </button>
                        </td>
                      )
                    })}
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
      {modal?.edit && <ServiceForm initial={modal.edit.id ? modal.edit : null} sites={sites} services={services || []} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); load(); toast(e ? 'Servicio actualizado' : 'Servicio creado') }} />}
      {modal?.delete && (
        <Modal title="Eliminar servicio" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={remove}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar <b>{modal.delete.name}</b>? Si tiene equipos asociados no se podrá eliminar; desactívalo en su lugar.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default IpsServicesPage
