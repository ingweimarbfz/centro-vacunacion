import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdAdd, MdEdit, MdDelete, MdErrorOutline, MdChevronLeft, MdChevronRight, MdEventNote, MdVideocam, MdMeetingRoom, MdNotificationsActive, MdBlock, MdOpenInNew, MdCheckCircle, MdFactCheck } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { formatDate } from '../../utils/format'

export const PLATFORMS = { meet: 'Google Meet', teams: 'Microsoft Teams', zoom: 'Zoom', otro: 'Otra plataforma' }
const DAYS = [[1, 'Lun'], [2, 'Mar'], [3, 'Mié'], [4, 'Jue'], [5, 'Vie'], [6, 'Sáb'], [7, 'Dom']]
const todayIso = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const addDays = (iso, n) => { const d = new Date(`${iso}T12:00:00Z`); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
const mondayOf = (iso) => { const d = new Date(`${iso}T12:00:00Z`).getUTCDay(); return addDays(iso, d === 0 ? -6 : 1 - d) }
const dayLabel = (iso) => new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' }).format(new Date(`${iso}T12:00:00Z`))

// Campos comunes de un horario o una clase: docente, modalidad, plataforma y enlace, o salón.
const ClassFields = ({ f, set, teachers, rooms = [], siteId }) => {
  const options = rooms.filter((r) => (r.active || r.id === Number(f.classroomId)) && (!r.siteId || !siteId || Number(r.siteId) === Number(siteId)))
  return (
  <>
    <div className="field"><label>Docente</label><select value={f.teacherId} onChange={set('teacherId')}><option value="">Sin asignar</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}{t.role !== 'docente' ? ' (personal)' : ''}</option>)}</select></div>
    <div className="field"><label>Modalidad</label>
      <div className="module-switch inline" style={{ alignSelf: 'flex-start' }}>
        <button type="button" className={f.modality === 'presencial' ? 'on' : ''} onClick={() => set('modality')({ target: { value: 'presencial' } })}><MdMeetingRoom /> Presencial</button>
        <button type="button" className={f.modality === 'virtual' ? 'on' : ''} onClick={() => set('modality')({ target: { value: 'virtual' } })}><MdVideocam /> Virtual</button>
      </div></div>
    {f.modality === 'virtual' ? (
      <>
        <div className="field"><label>Plataforma</label><select value={f.platform} onChange={set('platform')}>{Object.entries(PLATFORMS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="field"><label>Enlace de la clase</label><input value={f.meetingUrl} onChange={set('meetingUrl')} placeholder="https://meet.google.com/…" /></div>
      </>
    ) : options.length ? (
      <div className="field span-all"><label>Aula o salón</label><select value={f.classroomId || ''} onChange={set('classroomId')}><option value="">Selecciona el aula…</option>{options.map((r) => <option key={r.id} value={r.id}>{r.name}{r.capacity ? ` · ${r.capacity} puestos` : ''}{r.siteName ? ` · ${r.siteName}` : ''}</option>)}</select><span className="hint">El sistema no deja programar dos clases a la misma hora en la misma aula.</span></div>
    ) : <div className="field span-all"><label>Salón o lugar</label><input value={f.location} onChange={set('location')} placeholder="Ej. Salón 204, sede principal" /><span className="hint">Crea las aulas en “Aulas y salones” para controlar que no se crucen.</span></div>}
  </>
  )
}

const SCHEDULE_EMPTY = { groupId: '', subjectId: '', teacherId: '', modality: 'presencial', platform: 'meet', meetingUrl: '', location: '', classroomId: '', weekdays: [], startTime: '07:00', endTime: '09:00', startsOn: todayIso(), endsOn: '', notes: '', notify: true }

const ScheduleForm = ({ initial, groups, teachers, rooms, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => ({ ...SCHEDULE_EMPTY, ...(initial ? Object.fromEntries(Object.entries(initial).filter(([k]) => k in SCHEDULE_EMPTY).map(([k, v]) => [k, v ?? ''])) : {}), platform: initial?.platform || 'meet' }))
  const [subjects, setSubjects] = useState([])
  const [error, setError] = useState(''); const [clash, setClash] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value, ...(k === 'groupId' ? { subjectId: '' } : {}) }))
  const group = groups.find((g) => g.id === Number(f.groupId))
  useEffect(() => {
    if (!group) { setSubjects([]); return }
    api.get(`/academico/programas/${group.programId}`).then(({ data }) => setSubjects(data.periods.flatMap((p) => p.subjects.map((s) => ({ ...s, period: p.name }))))).catch(() => {})
    if (!editing && !f.endsOn && group.endDate) setF((x) => ({ ...x, endsOn: group.endDate, startsOn: group.startDate && group.startDate > todayIso() ? group.startDate : x.startsOn }))
  }, [group?.id]) // eslint-disable-line react-hooks/exhaustive-deps
  const toggleDay = (d) => setF((x) => ({ ...x, weekdays: x.weekdays.includes(d) ? x.weekdays.filter((y) => y !== d) : [...x.weekdays, d].sort() }))
  const submit = async (e) => {
    e?.preventDefault(); setError(''); setClash('')
    if (!f.groupId) return setError('Selecciona el grupo.')
    if (!f.weekdays.length) return setError('Elige al menos un día de la semana.')
    if (!f.endsOn) return setError('Indica hasta cuándo va el horario.')
    setSaving(true)
    try {
      const body = { ...f }
      const { data } = editing ? await api.put(`/academico/horarios/${initial.id}`, body) : await api.post('/academico/horarios', body)
      onSaved(data, editing)
    } catch (err) { if (err.response?.status === 409) setClash(errorMessage(err)); else setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar horario' : 'Nuevo horario de clases'} onClose={onClose} size="lg"
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="sch-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} {editing ? 'Guardar y rehacer clases futuras' : 'Crear horario'}</button></>}>
      <form id="sch-form" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="field"><label>Grupo <span className="req">*</span></label><select value={f.groupId} onChange={set('groupId')} disabled={editing}><option value="">Selecciona…</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.code} · {g.program?.name}</option>)}</select></div>
          <div className="field"><label>Asignatura o módulo</label><select value={f.subjectId} onChange={set('subjectId')} disabled={!group}><option value="">Sin asignatura</option>{subjects.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.period}</option>)}</select></div>
          <ClassFields f={f} set={set} teachers={teachers} rooms={rooms} siteId={group?.siteId} />
          <div className="field span-all"><label>Días de clase <span className="req">*</span></label>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>{DAYS.map(([d, l]) => <button key={d} type="button" className={`btn btn-sm ${f.weekdays.includes(d) ? 'btn-primary' : 'btn-outline'}`} onClick={() => toggleDay(d)} aria-pressed={f.weekdays.includes(d)}>{l}</button>)}</div></div>
          <div className="field"><label>Hora de inicio</label><input type="time" value={f.startTime} onChange={set('startTime')} /></div>
          <div className="field"><label>Hora de fin</label><input type="time" value={f.endTime} onChange={set('endTime')} /></div>
          <div className="field"><label>Desde</label><input type="date" value={f.startsOn} onChange={set('startsOn')} /></div>
          <div className="field"><label>Hasta <span className="req">*</span></label><input type="date" value={f.endsOn} onChange={set('endsOn')} /></div>
          <div className="field span-all"><label className="switch"><input type="checkbox" checked={f.notify} onChange={(e) => setF({ ...f, notify: e.target.checked })} /> Avisar por Telegram al grupo</label></div>
        </div>
        {editing && <div className="alert info" style={{ marginTop: 12 }}><span>Al guardar se rehacen las clases futuras que siguen programadas. Las pasadas, realizadas o canceladas no cambian.</span></div>}
        {clash && <div className="alert bad" style={{ marginTop: 12 }}><MdErrorOutline /><span><b>Cruce de horario:</b> {clash}</span></div>}
        {error && <div className="alert bad" style={{ marginTop: 12 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

// Clase concreta: reprogramar, cambiar docente, modalidad, salón o enlace, marcar realizada, avisar o cancelar.
export const SessionModal = ({ session, teachers = [], rooms = [], teacherMode = false, onClose, onSaved }) => {
  const [f, setF] = useState({ date: session.date, startTime: session.startTime, endTime: session.endTime, teacherId: session.teacherId || '', modality: session.modality, platform: session.platform || 'meet', meetingUrl: session.meetingUrl || '', location: session.location || '', classroomId: session.classroomId || '', topic: session.topic || '' })
  const [cancel, setCancel] = useState(null)
  const [error, setError] = useState(''); const [clash, setClash] = useState(''); const [busy, setBusy] = useState('')
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const save = async (extra = {}) => {
    setError(''); setClash(''); setBusy('save')
    try {
      const body = teacherMode ? { meetingUrl: f.meetingUrl, platform: f.platform, topic: f.topic, ...extra } : { ...f, ...extra }
      const { data } = await api.put(`/academico/clases/${session.id}`, body)
      onSaved(data, extra.status === 'realizada' ? 'Clase marcada como realizada' : 'Clase actualizada')
    } catch (err) { if (err.response?.status === 409 && !teacherMode) setClash(errorMessage(err)); else setError(errorMessage(err)); setBusy('') }
  }
  const doCancel = async () => {
    if (!cancel?.trim()) return setError('Escribe el motivo de la cancelación.')
    setBusy('cancel')
    try { const { data } = await api.post(`/academico/clases/${session.id}/cancelar`, { reason: cancel }); onSaved(data, 'Clase cancelada') } catch (err) { setError(errorMessage(err)); setBusy('') }
  }
  const remind = async () => { setBusy('notify'); try { await api.post(`/academico/clases/${session.id}/notificar`); onSaved(null, 'Aviso enviado por Telegram') } catch (err) { setError(errorMessage(err)); setBusy('') } }
  const editable = session.status === 'programada'
  return (
    <Modal title={`${session.subject || 'Clase'} · ${session.group?.code || ''}`} onClose={onClose}
      footer={<>
        {editable && !teacherMode && cancel === null && <button type="button" className="btn btn-ghost" style={{ color: 'var(--bad)', marginRight: 'auto' }} onClick={() => setCancel('')}><MdBlock /> Cancelar clase</button>}
        {editable && !teacherMode && <button type="button" className="btn btn-outline" onClick={remind} disabled={Boolean(busy)}>{busy === 'notify' ? <Spinner /> : <MdNotificationsActive />} Avisar</button>}
        {editable && teacherMode && <button type="button" className="btn btn-outline" onClick={() => save({ status: 'realizada' })} disabled={Boolean(busy)}><MdCheckCircle /> Marcar realizada</button>}
        {editable && <button type="button" className="btn btn-primary" onClick={() => save()} disabled={Boolean(busy)}>{busy === 'save' ? <Spinner /> : null} Guardar</button>}
        {!editable && <button type="button" className="btn btn-outline" onClick={onClose}>Cerrar</button>}
      </>}>
      <div className="stack" style={{ gap: 12 }}>
        <div style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{session.group?.program} · {formatDate(session.date)} {session.startTime}–{session.endTime}{session.teacher ? ` · ${session.teacher}` : ''}
          {session.status !== 'programada' && <span className={`badge ${session.status === 'realizada' ? 'ok' : 'bad'}`} style={{ marginLeft: 8 }}>{session.status === 'realizada' ? 'Realizada' : 'Cancelada'}</span>}
          {session.rescheduledFrom && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Reprogramada (antes {formatDate(session.rescheduledFrom)})</div>}
          {session.cancelReason && <div style={{ fontSize: 12, color: 'var(--bad)' }}>Motivo: {session.cancelReason}</div>}
        </div>
        {session.status !== 'cancelada' && <Link className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} to={`/educacion/clases/${session.id}/asistencia`}><MdFactCheck /> Asistencia y acta</Link>}
        {session.modality === 'virtual' && session.meetingUrl && <a className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-start' }} href={session.meetingUrl} target="_blank" rel="noreferrer"><MdOpenInNew /> Abrir {session.platformLabel || 'la clase'}</a>}
        {editable && (
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            {!teacherMode && <>
              <div className="field"><label>Fecha</label><input type="date" value={f.date} onChange={set('date')} /></div>
              <div className="field"><label>Horario</label><div style={{ display: 'flex', gap: 6 }}><input type="time" value={f.startTime} onChange={set('startTime')} /><input type="time" value={f.endTime} onChange={set('endTime')} /></div></div>
              <ClassFields f={f} set={set} teachers={teachers} rooms={rooms} siteId={session.group?.siteId} />
            </>}
            {teacherMode && f.modality === 'virtual' && <>
              <div className="field"><label>Plataforma</label><select value={f.platform} onChange={set('platform')}>{Object.entries(PLATFORMS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
              <div className="field"><label>Enlace de la clase</label><input value={f.meetingUrl} onChange={set('meetingUrl')} placeholder="https://…" /></div>
            </>}
            <div className="field span-all"><label>Tema de la clase</label><input value={f.topic} onChange={set('topic')} placeholder="Ej. RCP en adultos" /></div>
          </div>
        )}
        {cancel !== null && <div className="field"><label>Motivo de la cancelación</label><div style={{ display: 'flex', gap: 8 }}><input value={cancel} onChange={(e) => setCancel(e.target.value)} autoFocus placeholder="Se avisa al grupo por Telegram" style={{ flex: 1 }} /><button type="button" className="btn btn-danger" onClick={doCancel} disabled={Boolean(busy)}>{busy === 'cancel' ? <Spinner /> : null} Cancelar clase</button></div></div>}
        {clash && <div className="alert bad"><MdErrorOutline /><span><b>Cruce de horario:</b> {clash}</span></div>}
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

const ONE_EMPTY = { groupId: '', subjectId: '', teacherId: '', modality: 'presencial', platform: 'meet', meetingUrl: '', location: '', classroomId: '', date: todayIso(), startTime: '07:00', endTime: '09:00', topic: '' }
const OneClassForm = ({ groups, teachers, rooms, onClose, onSaved }) => {
  const [f, setF] = useState(ONE_EMPTY)
  const [error, setError] = useState(''); const [clash, setClash] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  const submit = async (e) => {
    e?.preventDefault(); setError(''); setClash('')
    if (!f.groupId) return setError('Selecciona el grupo.')
    setSaving(true)
    try { const { data } = await api.post('/academico/clases', f); onSaved(data) } catch (err) { if (err.response?.status === 409) setClash(errorMessage(err)); else setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title="Clase adicional" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="one-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} Programar y avisar</button></>}>
      <form id="one-form" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="field span-all"><label>Grupo <span className="req">*</span></label><select value={f.groupId} onChange={set('groupId')}><option value="">Selecciona…</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.code} · {g.program?.name}</option>)}</select></div>
          <div className="field"><label>Fecha</label><input type="date" value={f.date} onChange={set('date')} /></div>
          <div className="field"><label>Horario</label><div style={{ display: 'flex', gap: 6 }}><input type="time" value={f.startTime} onChange={set('startTime')} /><input type="time" value={f.endTime} onChange={set('endTime')} /></div></div>
          <ClassFields f={f} set={set} teachers={teachers} rooms={rooms} siteId={groups.find((g) => g.id === Number(f.groupId))?.siteId} />
          <div className="field span-all"><label>Tema</label><input value={f.topic} onChange={set('topic')} placeholder="Recuperación, refuerzo, examen…" /></div>
        </div>
        {clash && <div className="alert bad" style={{ marginTop: 12 }}><MdErrorOutline /><span><b>Cruce de horario:</b> {clash}</span></div>}
        {error && <div className="alert bad" style={{ marginTop: 12 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

// Horario semanal de clases (presenciales y virtuales) y horarios recurrentes por grupo.
const SchedulePage = () => {
  const [toast, toastNode] = useToast()
  const [week, setWeek] = useState(() => mondayOf(todayIso()))
  const [groupId, setGroupId] = useState(''); const [teacherId, setTeacherId] = useState('')
  const [sessions, setSessions] = useState(null); const [schedules, setSchedules] = useState([])
  const [groups, setGroups] = useState([]); const [teachers, setTeachers] = useState([]); const [rooms, setRooms] = useState([])
  const [error, setError] = useState(''); const [modal, setModal] = useState(null)
  const load = useCallback(() => {
    api.get('/academico/clases', { params: { desde: week, hasta: addDays(week, 6), grupo: groupId || undefined, docente: teacherId || undefined, canceladas: 1 } }).then(({ data }) => setSessions(data)).catch((e) => setError(errorMessage(e)))
    api.get('/academico/horarios', { params: { grupo: groupId || undefined } }).then(({ data }) => setSchedules(data)).catch(() => {})
  }, [week, groupId, teacherId])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/academico/grupos').then(({ data }) => setGroups(data.filter((g) => ['planeado', 'en_curso'].includes(g.status)))).catch(() => {})
    api.get('/academico/docentes').then(({ data }) => setTeachers(data)).catch(() => {})
    api.get('/academico/aulas').then(({ data }) => setRooms(data)).catch(() => {})
  }, [])
  const days = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(week, i)), [week])
  const today = todayIso()
  const removeSchedule = async (s) => { try { await api.delete(`/academico/horarios/${s.id}`); toast('Horario eliminado (se conservan las clases pasadas)'); setModal(null); load() } catch (e) { toast(errorMessage(e), 'bad') } }

  return (
    <>
      <PageHead title="Horarios y clases" subtitle="Clases presenciales y virtuales de cada grupo, con aviso por Telegram">
        <button type="button" className="btn btn-outline" onClick={() => setModal({ one: true })} disabled={!groups.length}><MdAdd /> Clase adicional</button>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ schedule: {} })} disabled={!groups.length}><MdEventNote /> Nuevo horario</button>
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center', marginBottom: 14 }}>
        <button type="button" className="btn btn-outline btn-icon" aria-label="Semana anterior" onClick={() => setWeek(addDays(week, -7))}><MdChevronLeft /></button>
        <b style={{ minWidth: 220, textAlign: 'center' }}>{dayLabel(week)} – {dayLabel(addDays(week, 6))}</b>
        <button type="button" className="btn btn-outline btn-icon" aria-label="Semana siguiente" onClick={() => setWeek(addDays(week, 7))}><MdChevronRight /></button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setWeek(mondayOf(today))}>Hoy</button>
        <select className="input" style={{ width: 'auto', minWidth: 200 }} aria-label="Grupo" value={groupId} onChange={(e) => setGroupId(e.target.value)}><option value="">Todos los grupos</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.code} · {g.program?.name}</option>)}</select>
        <select className="input" style={{ width: 'auto', minWidth: 200 }} aria-label="Docente" value={teacherId} onChange={(e) => setTeacherId(e.target.value)}><option value="">Todos los docentes</option>{teachers.map((t) => <option key={t.id} value={t.id}>{t.fullName}</option>)}</select>
      </div>
      {!sessions ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : (
        <Card flush>
          <div style={{ overflowX: 'auto' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(150px, 1fr))', minWidth: 1050 }}>
              {days.map((d) => (
                <div key={d} style={{ borderRight: '1px solid var(--line-2)', minHeight: 320 }}>
                  <div style={{ padding: '10px 12px', borderBottom: '1px solid var(--line)', fontSize: 12.5, fontWeight: 600, color: d === today ? 'var(--brand)' : 'var(--muted)', background: d === today ? 'var(--brand-50)' : undefined }}>{dayLabel(d)}</div>
                  <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {sessions.filter((x) => x.date === d).map((x) => (
                      <button key={x.id} type="button" onClick={() => setModal({ session: x })}
                        style={{ textAlign: 'left', border: `1px solid ${x.status === 'cancelada' ? 'var(--line)' : x.modality === 'virtual' ? '#BFDBFE' : '#FECACA'}`, background: x.status === 'cancelada' ? 'var(--line-2)' : x.modality === 'virtual' ? 'var(--info-50)' : 'var(--brand-50)', borderRadius: 8, padding: '6px 8px', cursor: 'pointer', font: 'inherit', fontSize: 12, lineHeight: 1.35, opacity: x.status === 'cancelada' ? 0.6 : 1 }}>
                        <b style={{ textDecoration: x.status === 'cancelada' ? 'line-through' : undefined }}>{x.startTime}–{x.endTime}</b> {x.status === 'realizada' && <MdCheckCircle style={{ color: 'var(--ok)', verticalAlign: -2 }} aria-label="Realizada" />}
                        <div style={{ fontWeight: 600 }}>{x.subject || 'Clase'}</div>
                        <div style={{ color: 'var(--muted)' }}>{x.group?.code} · {x.modality === 'virtual' ? (x.platformLabel || 'Virtual') : (x.location || 'Presencial')}</div>
                        {x.teacher && <div style={{ color: 'var(--muted)' }}>{x.teacher}</div>}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 16, padding: '10px 16px', fontSize: 12, color: 'var(--muted)', borderTop: '1px solid var(--line-2)' }}>
            <span><MdMeetingRoom style={{ color: 'var(--brand)', verticalAlign: -2 }} /> Presencial</span><span><MdVideocam style={{ color: 'var(--info)', verticalAlign: -2 }} /> Virtual</span><span>Clic en una clase para reprogramarla, cambiar el enlace o cancelarla.</span>
          </div>
        </Card>
      )}
      <div style={{ marginTop: 18 }}>
      <Card title="Horarios recurrentes" flush icon={<MdEventNote style={{ color: 'var(--brand)' }} />}>
        {schedules.length === 0 ? <Empty icon={<MdEventNote />}>Aún no hay horarios. Crea uno con “Nuevo horario”.</Empty> : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Grupo · asignatura</th><th>Días y hora</th><th>Modalidad</th><th>Docente</th><th>Vigencia</th><th className="num">Clases</th><th className="actions" /></tr></thead>
              <tbody>{schedules.map((s) => (
                <tr key={s.id}>
                  <td style={{ whiteSpace: 'normal' }}><b>{s.group?.code}</b> · {s.subject || 'Sin asignatura'}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.group?.program}</div></td>
                  <td style={{ textTransform: 'capitalize' }}>{s.weekdaysLabel}<div style={{ fontSize: 12, color: 'var(--muted)', textTransform: 'none' }}>{s.startTime}–{s.endTime}</div></td>
                  <td>{s.modality === 'virtual' ? <span className="badge info">{s.platformLabel}</span> : <span className="badge brand">{s.location || 'Presencial'}</span>}</td>
                  <td>{s.teacher || '—'}</td>
                  <td>{formatDate(s.startsOn)} – {formatDate(s.endsOn)}</td>
                  <td className="num">{s.sessions.upcoming} por dictar<div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.sessions.done} realizadas</div></td>
                  <td className="actions"><button type="button" className="btn btn-ghost btn-icon" aria-label="Editar horario" onClick={() => setModal({ schedule: s })}><MdEdit /></button><button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar horario" style={{ color: 'var(--bad)' }} onClick={() => setModal({ deleteSchedule: s })}><MdDelete /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
      </div>
      {modal?.schedule && <ScheduleForm initial={modal.schedule.id ? modal.schedule : null} groups={groups} teachers={teachers} rooms={rooms} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); load(); toast(e ? `Horario actualizado · ${d.generated} clases futuras` : `Horario creado · ${d.generated} clases programadas`) }} />}
      {modal?.one && <OneClassForm groups={groups} teachers={teachers} rooms={rooms} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); toast('Clase programada') }} />}
      {modal?.session && <SessionModal session={modal.session} teachers={teachers} rooms={rooms} onClose={() => setModal(null)} onSaved={(d, msg) => { setModal(null); load(); toast(msg) }} />}
      {modal?.deleteSchedule && (
        <Modal title="Eliminar horario" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={() => removeSchedule(modal.deleteSchedule)}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar el horario de <b>{modal.deleteSchedule.group?.code}</b>? Se borran sus clases futuras programadas; las pasadas y realizadas se conservan.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default SchedulePage
