import React, { useEffect, useMemo, useState } from 'react'
import { MdPersonAdd, MdSearch, MdEdit, MdDelete, MdPeople, MdErrorOutline, MdViewModule, MdRestartAlt } from 'react-icons/md'
import api, { errorMessage, getSiteFilter } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS, ROLE_DESCRIPTIONS, SITE_TYPES, USER_MODULES } from '../utils/permissions'
import { PageHead, Card, Modal, Avatar, Empty, Spinner, useToast } from '../components/ui'

const ROLE_TONE = { administrador: 'brand', empleado: 'navy', voluntario: 'ok', conductor: 'info' }
const EMPTY = { identification: '', name: '', lastName: '', nameUser: '', email: '', password: '', role: 'empleado', siteId: '', active: true, modules: null, remunerado: true }

// Módulos que el usuario ve: los de su rol o una selección personalizada.
const ModulesField = ({ role, value, byRole, onChange }) => {
  if (role === 'administrador') return <div className="alert info" style={{ margin: 0 }}><MdViewModule /><span>El administrador ve todos los módulos.</span></div>
  const defaults = byRole?.[role] || []
  const custom = Array.isArray(value)
  const current = custom ? value : defaults
  const toggle = (k) => {
    const next = current.includes(k) ? current.filter((x) => x !== k) : [...current, k]
    onChange(next)
  }
  return (
    <div className="stack" style={{ gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span className={`badge ${custom ? 'warn' : 'ok'}`}>{custom ? 'Personalizado' : `Módulos del rol ${ROLE_LABELS[role]}`}</span>
        {custom && <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(null)}><MdRestartAlt /> Volver a los del rol</button>}
      </div>
      {Object.entries(USER_MODULES).map(([group, items]) => (
        <div key={group}>
          <span className="label">{group === 'ips' ? 'IPS' : 'Operaciones Generales'}</span>
          <div className="rc-checks" style={{ marginTop: 6 }}>
            {items.filter(([k]) => (k !== 'traslado' || role === 'conductor') && (k !== 'voluntario' || role === 'voluntario')).map(([k, l]) => (
              <label key={k} className={`rc-check${current.includes(k) ? ' on' : ''}`}><input type="checkbox" checked={current.includes(k)} onChange={() => toggle(k)} /> {l}</label>
            ))}
          </div>
        </div>
      ))}
      <span className="hint">Los módulos de IPS solo aparecen si la sede tiene ese servicio. Crear reportes diarios y preoperacionales sigue siendo exclusivo del conductor.</span>
    </div>
  )
}

const UserForm = ({ initial, sites, byRole, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [form, setForm] = useState(editing ? { ...EMPTY, ...initial, siteId: initial.siteId || '', password: '', modules: initial.customModules ?? null } : { ...EMPTY, siteId: getSiteFilter() || '', modules: null })
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    for (const [k, label] of [['identification', 'la identificación'], ['name', 'el nombre'], ['lastName', 'los apellidos'], ['nameUser', 'el usuario']]) {
      if (!String(form[k]).trim()) return setError(`Ingresa ${label}.`)
    }
    if (form.role !== 'administrador' && !form.siteId) return setError('Selecciona la sede a la que pertenece.')
    if (!editing && form.password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    if (editing && form.password && form.password.length < 6) return setError('La nueva contraseña debe tener al menos 6 caracteres.')
    setSaving(true)
    try {
      const payload = { ...form }
      if (editing && !payload.password) delete payload.password
      const { data } = editing ? await api.put(`/usuarios/${initial.id}`, payload) : await api.post('/usuarios', payload)
      onSaved(data, editing)
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal title={editing ? 'Editar usuario' : 'Nuevo usuario'} onClose={onClose}
      footer={<>
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" form="user-form" className="btn btn-primary" disabled={saving}>{saving ? <><Spinner /> Guardando…</> : editing ? 'Guardar cambios' : 'Crear usuario'}</button>
      </>}>
      <form id="user-form" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="field"><label>Nombre <span className="req">*</span></label><input value={form.name} onChange={set('name')} maxLength={60} autoFocus /></div>
          <div className="field"><label>Apellidos <span className="req">*</span></label><input value={form.lastName} onChange={set('lastName')} maxLength={60} /></div>
          <div className="field"><label>Identificación <span className="req">*</span></label><input value={form.identification} onChange={set('identification')} maxLength={15} inputMode="numeric" /></div>
          <div className="field"><label>Correo</label><input type="email" value={form.email || ''} onChange={set('email')} placeholder="nombre@correo.com" /></div>
          <div className="field"><label>Usuario <span className="req">*</span></label><input value={form.nameUser} onChange={set('nameUser')} maxLength={30} autoComplete="off" /></div>
          <div className="field">
            <label>{editing ? 'Nueva contraseña' : <>Contraseña <span className="req">*</span></>}</label>
            <input type="password" value={form.password} onChange={set('password')} autoComplete="new-password" placeholder={editing ? 'Dejar vacío para no cambiar' : 'Mínimo 6 caracteres'} />
          </div>
          <div className="field">
            <label>Rol <span className="req">*</span></label>
            <select value={form.role} onChange={set('role')}>
              {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <span className="hint">{ROLE_DESCRIPTIONS[form.role]}</span>
          </div>
          <div className="field">
            <label>Sede {form.role !== 'administrador' && <span className="req">*</span>}</label>
            <select value={form.siteId} onChange={set('siteId')}>
              <option value="">{form.role === 'administrador' ? 'Todas (administrador global)' : 'Selecciona la sede…'}</option>
              {Object.entries(SITE_TYPES).map(([t, l]) => <optgroup key={t} label={l}>{sites.filter((x) => x.type === t).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>)}
            </select>
            {editing && initial.role !== form.role && <span className="hint">Cambio de rol: conserva su sede y su historial.</span>}
          </div>
          <div className="field" style={{ justifyContent: 'center' }}>
            <label className="switch"><input type="checkbox" checked={form.active} onChange={set('active')} /> {form.active ? 'Usuario activo' : 'Usuario inactivo'}</label>
          </div>
          <div className="field span-all">
            <label className="switch"><input type="checkbox" checked={Boolean(form.remunerado)} onChange={set('remunerado')} /> Personal remunerado (empleado de la CRC)</label>
            <span className="hint">El personal remunerado no suma horas de voluntariado cuando participa en eventos o servicios, aunque también esté registrado como voluntario.</span>
          </div>
          <div className="field span-all"><label>Módulos que puede ver</label>
            <ModulesField role={form.role} value={form.modules} byRole={byRole} onChange={(m) => setForm({ ...form, modules: m })} /></div>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

const UsersPage = () => {
  const { user: me } = useAuth()
  const [toast, toastNode] = useToast()
  const [users, setUsers] = useState(null)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [editing, setEditing] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [busy, setBusy] = useState(false)

  const [sites, setSites] = useState([])
  const [byRole, setByRole] = useState(null)
  useEffect(() => {
    api.get('/usuarios/modulos').then(({ data }) => setByRole(data.byRole)).catch(() => {})
    api.get('/usuarios').then(({ data }) => setUsers(data)).catch((e) => setError(errorMessage(e)))
    api.get('/sedes', { params: { sede: undefined } }).then(({ data }) => setSites(data)).catch(() => {})
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (users || []).filter((u) =>
      (!roleFilter || u.role === roleFilter) &&
      (!q || [u.fullName, u.nameUser, u.identification, u.email].some((v) => v && v.toLowerCase().includes(q))))
  }, [users, query, roleFilter])

  const onSaved = (saved, wasEdit) => {
    setUsers((list) => wasEdit ? list.map((u) => (u.id === saved.id ? saved : u)) : [...list, saved].sort((a, b) => a.fullName.localeCompare(b.fullName)))
    setEditing(null)
    toast(wasEdit ? 'Usuario actualizado' : 'Usuario creado')
  }

  const confirmDelete = async () => {
    setBusy(true)
    try {
      await api.delete(`/usuarios/${deleting.id}`)
      setUsers((list) => list.filter((u) => u.id !== deleting.id))
      toast('Usuario eliminado')
      setDeleting(null)
    } catch (e) {
      toast(errorMessage(e), 'bad')
    } finally {
      setBusy(false)
    }
  }

  const counts = (users || []).reduce((acc, u) => ({ ...acc, [u.role]: (acc[u.role] || 0) + 1 }), {})

  return (
    <>
      <PageHead title="Usuarios" subtitle="Crea, edita, desactiva o elimina las cuentas del equipo">
        <button type="button" className="btn btn-primary" onClick={() => setEditing({})}><MdPersonAdd /> Nuevo usuario</button>
      </PageHead>

      <div className="grid grid-kpi" style={{ marginBottom: 18 }}>
        {Object.keys(ROLE_LABELS).map((r) => (
          <div className="card kpi" key={r}>
            <div className="kpi-top"><span className="kpi-label">{{ administrador: 'Administradores', empleado: 'Empleados', voluntario: 'Voluntarios', conductor: 'Conductores' }[r]}</span><span className={`kpi-icon ${r === 'empleado' ? 'navy' : r === 'voluntario' ? 'warn' : r === 'conductor' ? 'ok' : ''}`}><MdPeople /></span></div>
            <div className="kpi-value">{counts[r] || 0}</div>
          </div>
        ))}
      </div>

      {error && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{error}</span></div>}

      <Card flush>
        <div className="table-toolbar">
          <div className="input-icon"><MdSearch /><input className="input" placeholder="Buscar por nombre, usuario, documento o correo" value={query} onChange={(e) => setQuery(e.target.value)} /></div>
          <select className="input" style={{ width: 190 }} value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)} aria-label="Filtrar por rol">
            <option value="">Todos los roles</option>
            {Object.entries(ROLE_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {!users ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : filtered.length === 0 ? <Empty icon={<MdPeople />}>No hay usuarios que coincidan.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Usuario</th><th>Identificación</th><th>Sede</th><th>Rol</th><th>Estado</th><th className="actions">Acciones</th></tr></thead>
              <tbody>
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td><div className="cell-user"><Avatar user={u} /><div><strong>{u.fullName}{u.id === me.id && <span className="badge info" style={{ marginLeft: 6 }}>Tú</span>}</strong><span>@{u.nameUser}</span></div></div></td>
                    <td>{u.identification}</td>
                    <td>{u.site?.name || <span className="badge brand">Todas</span>}</td>
                    <td><span className={`badge ${ROLE_TONE[u.role]}`}>{ROLE_LABELS[u.role]}</span>{u.remunerado && <div><span className="badge" style={{ marginTop: 4, fontSize: 11 }}>Remunerado</span></div>}{u.customModules && <div><span className="badge warn" style={{ marginTop: 4, fontSize: 11 }} title={u.modules.join(', ')}>Módulos personalizados</span></div>}</td>
                    <td>{u.active ? <span className="badge ok"><span className="dot" /> Activo</span> : <span className="badge"><span className="dot" /> Inactivo</span>}</td>
                    <td className="actions">
                      <button type="button" className="btn btn-ghost btn-icon" title="Editar" aria-label={`Editar ${u.fullName}`} onClick={() => setEditing(u)}><MdEdit /></button>
                      <button type="button" className="btn btn-ghost btn-icon" title="Eliminar" aria-label={`Eliminar ${u.fullName}`} disabled={u.id === me.id} onClick={() => setDeleting(u)} style={{ color: 'var(--bad)' }}><MdDelete /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {editing && <UserForm initial={editing} sites={sites} byRole={byRole} onClose={() => setEditing(null)} onSaved={onSaved} />}
      {deleting && (
        <Modal title="Eliminar usuario" size="sm" onClose={() => setDeleting(null)}
          footer={<>
            <button type="button" className="btn btn-outline" onClick={() => setDeleting(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={confirmDelete} disabled={busy}>{busy ? <Spinner /> : <MdDelete />} Eliminar</button>
          </>}>
          <p style={{ margin: 0 }}>¿Seguro que quieres eliminar a <strong>{deleting.fullName}</strong> (@{deleting.nameUser})? Esta acción no se puede deshacer.</p>
          <p style={{ margin: '10px 0 0', color: 'var(--muted)', fontSize: 13 }}>Si solo quieres quitarle el acceso, edítalo y márcalo como inactivo.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default UsersPage
