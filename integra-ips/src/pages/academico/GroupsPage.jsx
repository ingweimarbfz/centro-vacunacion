import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MdAdd, MdEdit, MdDelete, MdErrorOutline, MdClass, MdArrowForward, MdLibraryBooks } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { SITE_TYPES } from '../../utils/permissions'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { formatDate } from '../../utils/format'
import { SHIFTS, GROUP_STATUS, StatusBadge } from './common'

const EMPTY = { code: '', programId: '', siteId: '', shift: 'mañana', startDate: '', endDate: '', capacity: '', currentPeriod: 1, status: 'planeado', notes: '', telegramChatId: '', telegramTitle: '' }

const GroupForm = ({ initial, programs, sites, admin, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => ({ ...EMPTY, ...Object.fromEntries(Object.entries(initial || {}).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])), telegramChatId: initial?.telegram?.chatId || '', telegramTitle: initial?.telegram?.title || '' }))
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const [tgGroups, setTgGroups] = useState(null); const [tgMsg, setTgMsg] = useState('')
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const findTg = async () => { setTgMsg(''); try { const { data } = await api.get('/academico/telegram/grupos'); setTgGroups(data.groups); if (!data.groups.length) setTgMsg('El bot no ve grupos todavía: agrégalo al grupo de Telegram y escribe un mensaje allí.') } catch (err) { setTgMsg(errorMessage(err)) } }
  const testTg = async () => { setTgMsg(''); try { await api.post(`/academico/grupos/${initial.id}/telegram/prueba`); setTgMsg('Mensaje de prueba enviado.') } catch (err) { setTgMsg(errorMessage(err)) } }
  const program = programs.find((p) => p.id === Number(f.programId))
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.code.trim() || !f.programId) return setError('El código y el programa son requeridos.')
    setSaving(true)
    try {
      const { data } = editing ? await api.put(`/academico/grupos/${initial.id}`, f) : await api.post('/academico/grupos', f)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? `Editar grupo ${initial.code}` : 'Nuevo grupo'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="grp-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} Guardar</button></>}>
      <form id="grp-form" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
          <div className="field"><label>Código del grupo <span className="req">*</span></label><input value={f.code} onChange={set('code')} placeholder="Ej. APH-26B" maxLength={20} autoFocus /></div>
          <div className="field"><label>Programa <span className="req">*</span></label>
            <select value={f.programId} onChange={set('programId')} disabled={editing}>
              <option value="">Selecciona…</option>
              {programs.filter((p) => p.active || p.id === Number(f.programId)).map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name}</option>)}
            </select></div>
          {admin && <div className="field"><label>Sede</label>
            <select value={f.siteId} onChange={set('siteId')}>
              <option value="">Seccional (por defecto)</option>
              {Object.entries(SITE_TYPES).map(([t, l]) => <optgroup key={t} label={l}>{sites.filter((x) => x.type === t).map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</optgroup>)}
            </select></div>}
          <div className="field"><label>Jornada</label><select value={f.shift} onChange={set('shift')}>{Object.entries(SHIFTS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Fecha de inicio</label><input type="date" value={f.startDate} onChange={set('startDate')} /></div>
          <div className="field"><label>Fecha de finalización</label><input type="date" value={f.endDate} onChange={set('endDate')} /></div>
          <div className="field"><label>Cupo</label><input type="number" min="1" value={f.capacity} onChange={set('capacity')} placeholder="Sin límite" /></div>
          {program?.billingMode === 'periodo' && (
            <div className="field"><label>{program.periodLabel} en curso</label>
              <select value={f.currentPeriod} onChange={set('currentPeriod')}>{program.periods.map((x) => <option key={x.id} value={x.number}>{x.name}</option>)}</select></div>
          )}
          <div className="field"><label>Estado</label><select value={f.status} onChange={set('status')}>{Object.entries(GROUP_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field span-all"><label>Observaciones</label><input value={f.notes} onChange={set('notes')} placeholder="Salón, director de grupo, convenio de práctica…" /></div>
          {admin && (
            <div className="field span-all"><label>Grupo de Telegram del grupo académico</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                {tgGroups ? (
                  <select value={f.telegramChatId} onChange={(e) => { const g = tgGroups.find((x) => x.chatId === e.target.value); setF({ ...f, telegramChatId: e.target.value, telegramTitle: g?.title || '' }) }} style={{ flex: 1 }}>
                    <option value="">Sin grupo de Telegram</option>
                    {f.telegramChatId && !tgGroups.some((x) => x.chatId === f.telegramChatId) && <option value={f.telegramChatId}>{f.telegramTitle || f.telegramChatId}</option>}
                    {tgGroups.map((g) => <option key={g.chatId} value={g.chatId}>{g.title}</option>)}
                  </select>
                ) : <span style={{ flex: 1, fontSize: 13.5 }}>{f.telegramChatId ? (f.telegramTitle || f.telegramChatId) : 'Sin grupo de Telegram'}</span>}
                <button type="button" className="btn btn-outline btn-sm" onClick={findTg}>Buscar grupos</button>
                {editing && initial.telegram?.chatId && <button type="button" className="btn btn-ghost btn-sm" onClick={testTg}>Enviar prueba</button>}
              </div>
              <span className="hint">Los estudiantes reciben en ese grupo los avisos de clases programadas, reprogramadas y canceladas, con el enlace de las virtuales.</span>
              {tgMsg && <span className="hint" style={{ color: 'var(--ink-2)' }}>{tgMsg}</span>}
            </div>
          )}
        </div>
        {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

// Grupos (cohortes) de cada programa por sede, con jornada, fechas, cupo y semestre en curso.
const GroupsPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [params, setParams] = useSearchParams()
  const programFilter = params.get('programa') || ''
  const [status, setStatus] = useState('')
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null)
  const [programs, setPrograms] = useState([])
  const [sites, setSites] = useState([])
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const load = useCallback(() => api.get('/academico/grupos', { params: { programa: programFilter || undefined, estado: status || undefined } }).then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))), [programFilter, status])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    api.get('/academico/programas').then(({ data }) => setPrograms(data)).catch(() => {})
    if (admin) api.get('/sedes', { params: { sede: undefined } }).then(({ data }) => setSites(data)).catch(() => {})
  }, [admin])
  const remove = async () => {
    try { await api.delete(`/academico/grupos/${modal.delete.id}`); toast('Grupo eliminado'); setModal(null); load() } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) }
  }

  return (
    <>
      <PageHead title="Grupos" subtitle="Cohortes de cada programa: sede, jornada, fechas, cupo y periodo en curso">
        <button type="button" className="btn btn-primary" onClick={() => setModal({ edit: { programId: programFilter } })} disabled={!programs.length}><MdAdd /> Nuevo grupo</button>
      </PageHead>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <select className="input" style={{ width: 'auto', minWidth: 200 }} aria-label="Programa" value={programFilter} onChange={(e) => setParams(e.target.value ? { programa: e.target.value } : {})}>
          <option value="">Todos los programas</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ width: 'auto', minWidth: 200 }} aria-label="Estado" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.entries(GROUP_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
      </div>
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? (!error && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>) : rows.length === 0 ? (
        <Card><Empty icon={<MdClass />}>{programs.length ? 'No hay grupos con estos filtros.' : 'Primero crea un programa en “Programas y pensum”.'}</Empty></Card>
      ) : (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Grupo</th><th>Programa</th><th>Sede · jornada</th><th>Fechas</th><th>Periodo</th><th className="num">Matriculados</th><th>Estado</th><th className="actions" /></tr></thead>
              <tbody>{rows.map((g) => (
                <tr key={g.id}>
                  <td><b>{g.code}</b></td>
                  <td style={{ whiteSpace: 'normal' }}><Link to={`/educacion/programas/${g.programId}`} style={{ color: 'var(--ink)' }}>{g.program?.name}</Link></td>
                  <td style={{ whiteSpace: 'normal' }}>{g.siteName || '—'}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{g.shiftLabel}</div></td>
                  <td>{formatDate(g.startDate)} – {formatDate(g.endDate)}</td>
                  <td>{g.program?.kind === 'carrera_tecnica' ? `${g.program.periodLabel} ${g.currentPeriod}` : '—'}</td>
                  <td className="num">{g.enrolled}{g.capacity ? ` / ${g.capacity}` : ''}</td>
                  <td><StatusBadge status={g.status} /></td>
                  <td className="actions">
                    <Link className="btn btn-ghost btn-icon" title="Aula del grupo: material, talleres y notas" aria-label="Aula del grupo" to={`/educacion/grupos/${g.id}/aula`}><MdLibraryBooks /></Link>
                    <Link className="btn btn-ghost btn-icon" title="Ver matrículas del grupo" aria-label="Ver matrículas del grupo" to={`/educacion/matriculas?grupo=${g.id}`}><MdArrowForward /></Link>
                    <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ edit: g })}><MdEdit /></button>
                    {admin && <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delete: g })}><MdDelete /></button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}
      {modal?.edit && <GroupForm initial={modal.edit} programs={programs} sites={sites} admin={admin} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); load(); toast(e ? 'Grupo actualizado' : `Grupo ${d.code} creado`) }} />}
      {modal?.delete && (
        <Modal title="Eliminar grupo" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={remove}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar el grupo <b>{modal.delete.code}</b>? Si tiene matrículas no se podrá; cámbialo a cancelado o finalizado.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default GroupsPage
