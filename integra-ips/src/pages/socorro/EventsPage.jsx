import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MdAdd, MdSearch, MdEmergency, MdSchool, MdErrorOutline, MdArrowForward, MdPlace, MdPeople, MdAccessTime } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Modal, Empty, Spinner } from '../../components/ui'
import usePagedList from '../../hooks/usePagedList'
import LoadMore from '../../components/LoadMore'
import { PersonLookup, StatusBadge, fmtDateTime, duration } from './common'

export const AREA_INFO = {
  socorro: { title: 'Eventos y emergencias', subtitle: 'Socorro: salida de personal y control de materiales por evento (formatos GSO-F002 y GSO-F003)', newLabel: 'Nuevo evento', modal: 'Nuevo evento o emergencia', name: 'Evento / emergencia', placeholder: 'Ej. Concierto en el Parque de la Leyenda', base: '/socorro/eventos', noun: 'eventos' },
  educacion: { title: 'Actividades de educación', subtitle: 'Educación: capacitaciones, talleres y jornadas; personal, materiales e insumos entregados por actividad', newLabel: 'Nueva actividad', modal: 'Nueva actividad de educación', name: 'Actividad', placeholder: 'Ej. Taller de primeros auxilios en el colegio', base: '/socorro/educacion', noun: 'actividades' }
}
export const eventPath = (e) => `${AREA_INFO[e.area || 'socorro'].base}/${e.id}`

const NewEventModal = ({ onClose, area }) => {
  const info = AREA_INFO[area]
  const navigate = useNavigate()
  const [form, setForm] = useState({ name: '', place: '' })
  const [coordinator, setCoordinator] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.name.trim() || !form.place.trim()) return setError('Ingresa el evento y el lugar.')
    if (!coordinator) return setError('Busca y selecciona el coordinador por carnet o documento.')
    setSaving(true)
    try {
      const { data } = await api.post('/socorro/eventos', { ...form, area, coordinatorId: coordinator.id })
      navigate(eventPath(data))
    } catch (err) {
      setError(errorMessage(err))
      setSaving(false)
    }
  }

  return (
    <Modal title={info.modal} onClose={onClose}
      footer={<>
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button>
        <button type="submit" form="event-form" className="btn btn-primary" disabled={saving}>{saving ? <><Spinner /> Iniciando…</> : <>{area === 'educacion' ? <MdSchool /> : <MdEmergency />} Iniciar {area === 'educacion' ? 'actividad' : 'servicio'}</>}</button>
      </>}>
      <form id="event-form" onSubmit={submit} noValidate className="stack" style={{ gap: 16 }}>
        <div className="field"><label>{info.name} <span className="req">*</span></label><input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder={info.placeholder} autoFocus maxLength={150} /></div>
        <div className="field"><label>Lugar <span className="req">*</span></label><input value={form.place} onChange={(e) => setForm({ ...form, place: e.target.value })} placeholder="Dirección o sitio" maxLength={150} /></div>
        <PersonLookup label="Coordinador (carnet o documento) *" onFound={setCoordinator} />
        <div className="alert info"><MdAccessTime /><span>La fecha y la hora de inicio se registran automáticamente. Solo el coordinador podrá agregar o modificar materiales e insumos. Una persona no puede estar en dos eventos en curso a la vez.</span></div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

const EventsPage = ({ area = 'socorro' }) => {
  const info = AREA_INFO[area]
  const [filters, setFilters] = useState({ q: '', estado: '', desde: '', hasta: '' })
  const list = usePagedList('/socorro/eventos'); const rows = list.rows
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)

  const load = useCallback(async (f) => {
    setError('')
    try {
      const params = Object.fromEntries(Object.entries(f).filter(([, v]) => v))
      await list.load({ ...params, area })
    } catch (e) {
      setError(errorMessage(e))
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [area])

  useEffect(() => { load({}) }, [load])

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })
  const open = (rows || []).filter((r) => r.status === 'en_curso').length

  return (
    <>
      <PageHead title={info.title} subtitle={info.subtitle}>
        <button type="button" className="btn btn-primary" onClick={() => setCreating(true)}><MdAdd /> {info.newLabel}</button>
      </PageHead>

      <Card>
        <form className="form-grid" style={{ alignItems: 'end' }} onSubmit={(e) => { e.preventDefault(); load(filters) }}>
          <div className="field span-2"><label>Buscar</label><div className="input-icon"><MdSearch /><input value={filters.q} onChange={set('q')} placeholder="Nombre, lugar o código" /></div></div>
          <div className="field"><label>Estado</label>
            <select value={filters.estado} onChange={set('estado')}><option value="">Todos</option><option value="en_curso">En curso</option><option value="finalizado">Finalizados</option></select>
          </div>
          <div className="field"><label>Desde</label><input type="date" value={filters.desde} onChange={set('desde')} /></div>
          <div className="field"><label>Hasta</label><input type="date" value={filters.hasta} onChange={set('hasta')} /></div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-dark" style={{ flex: 1 }}><MdSearch /> Filtrar</button>
            <button type="button" className="btn btn-outline" onClick={() => { const f = { q: '', estado: '', desde: '', hasta: '' }; setFilters(f); load(f) }}>Limpiar</button>
          </div>
        </form>
      </Card>

      {error && <div className="alert bad" style={{ marginTop: 18 }}><MdErrorOutline /><span>{error}</span></div>}

      <Card flush className="cy-results-card" title={info.title} subtitle={rows ? `${list.total} ${info.noun} · ${open} en curso` : ''}>
        {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : rows.length === 0 ? <Empty icon={area === 'educacion' ? <MdSchool /> : <MdEmergency />}>No hay {info.noun} con esos filtros.</Empty> : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead><tr><th>{info.name.split(' /')[0]}</th><th>Coordinador</th><th>Inicio</th><th>Duración</th><th className="num">Personal</th><th className="num">Insumos</th><th>Estado</th><th className="actions" /></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <td style={{ maxWidth: 320 }}>
                      <Link to={eventPath({ ...r, area })} style={{ color: 'var(--ink)', fontWeight: 600 }}>{r.name}</Link>
                      <div style={{ fontSize: 12, color: 'var(--muted)', display: 'flex', gap: 4, alignItems: 'center' }}><span className="badge" style={{ padding: '0 6px', fontSize: 11 }}>{r.code}</span><MdPlace /> {r.place}</div>
                    </td>
                    <td>{r.coordinator}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.coordinatorCarnet || ''}</div></td>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDateTime(r.startedAt)}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>{duration(r.startedAt, r.endedAt)}</td>
                    <td className="num"><MdPeople style={{ verticalAlign: -2, color: 'var(--muted)' }} /> {r.personnelCount}</td>
                    <td className="num">{r.suppliesCount}</td>
                    <td><StatusBadge status={r.status} /></td>
                    <td className="actions"><Link className="btn btn-outline btn-sm" to={eventPath({ ...r, area })}>Abrir <MdArrowForward /></Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {rows && <LoadMore shown={rows.length} total={list.total} hasMore={list.hasMore} loading={list.loadingMore} onMore={() => list.more().catch((e) => setError(errorMessage(e)))} />}
      </Card>
      {creating && <NewEventModal area={area} onClose={() => setCreating(false)} />}
    </>
  )
}

export default EventsPage
