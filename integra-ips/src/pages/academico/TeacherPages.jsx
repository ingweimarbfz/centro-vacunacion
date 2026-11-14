import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MdGroups, MdLibraryBooks, MdAssignment, MdGrading, MdErrorOutline, MdRateReview } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { GradesTab, SubmissionsModal } from './CoursePage'

const dt = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'medium', timeStyle: 'short' }) : 'Sin fecha')
const useMyGroups = () => {
  const [d, setD] = useState(null); const [error, setError] = useState('')
  useEffect(() => { api.get('/academico/docente/resumen').then(({ data }) => setD(data)).catch((e) => setError(errorMessage(e))) }, [])
  return [d, error]
}

// Mis grupos: cada grupo con acceso directo a material, talleres y calificaciones.
export const TeacherGroupsPage = () => {
  const [d, error] = useMyGroups()
  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!d) return <div className="splash"><Spinner /></div>
  return (
    <>
      <PageHead title="Mis grupos" subtitle="Los grupos donde tienes clases asignadas: material de estudio, talleres y calificaciones" />
      {d.groups.length === 0 ? <Card><Empty icon={<MdGroups />}>Aún no tienes grupos asignados.</Empty></Card> : (
        <div className="grid grid-3">{d.groups.map((g) => (
          <Card key={g.id} title={g.code} subtitle={[g.program, g.period].filter(Boolean).join(' · ')} icon={<MdGroups style={{ color: 'var(--brand)' }} />} actions={<span className="badge">{g.students} estudiantes</span>}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <Link className="btn btn-outline btn-sm" to={`/educacion/grupos/${g.id}/aula`}><MdLibraryBooks /> Material</Link>
              <Link className="btn btn-outline btn-sm" to={`/educacion/grupos/${g.id}/aula?tab=talleres`}><MdAssignment /> Talleres y entregas</Link>
              <Link className="btn btn-primary btn-sm" to={`/educacion/docente/calificaciones?grupo=${g.id}`}><MdGrading /> Calificaciones</Link>
            </div>
          </Card>
        ))}</div>
      )}
    </>
  )
}

// Calificaciones: elige el grupo y llena la planilla de notas por asignatura.
export const TeacherGradesPage = () => {
  const [d, error] = useMyGroups()
  const [params, setParams] = useSearchParams()
  const groupId = params.get('grupo') || (d?.groups[0] ? String(d.groups[0].id) : '')
  const [aula, setAula] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { if (!groupId) return; setAula(null); setErr(''); api.get(`/academico/grupos/${groupId}/aula`, { noCache: true }).then(({ data }) => setAula(data)).catch((e) => setErr(errorMessage(e))) }, [groupId])
  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!d) return <div className="splash"><Spinner /></div>
  return (
    <>
      <PageHead title="Calificaciones" subtitle="Planilla de notas por grupo y asignatura: crea las evaluaciones con su peso y registra las notas de 0,0 a 5,0" />
      {d.groups.length === 0 ? <Card><Empty icon={<MdGrading />}>Aún no tienes grupos asignados.</Empty></Card> : (
        <div className="stack">
          <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
            <select className="input" style={{ width: 'auto', minWidth: 280 }} aria-label="Grupo" value={groupId} onChange={(e) => setParams({ grupo: e.target.value })}>{d.groups.map((g) => <option key={g.id} value={g.id}>{g.code} · {g.program}</option>)}</select>
            <span className="hint">Las notas de los talleres ligados a una evaluación se pasan solas al calificar la entrega.</span>
          </div>
          {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
          {!aula ? (!err && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>) : aula.subjects.length === 0 ? <Card><Empty icon={<MdGrading />}>El programa de este grupo aún no tiene asignaturas.</Empty></Card> : <GradesTab key={groupId} data={aula} groupId={groupId} />}
        </div>
      )}
    </>
  )
}

// Entregas por revisar: los talleres de todos sus grupos con las entregas pendientes de calificar.
export const TeacherSubmissionsPage = () => {
  const [rows, setRows] = useState(null); const [error, setError] = useState(''); const [open, setOpen] = useState(null); const [all, setAll] = useState(false)
  const load = useCallback(() => api.get('/academico/docente/entregas', { noCache: true }).then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))), [])
  useEffect(() => { load() }, [load])
  const list = (rows || []).filter((r) => all || r.pending > 0)
  const pending = (rows || []).reduce((a, r) => a + r.pending, 0)
  return (
    <>
      <PageHead title="Entregas por revisar" subtitle={rows ? `${pending} entrega${pending === 1 ? '' : 's'} sin calificar en tus talleres` : 'Talleres de tus grupos'} />
      {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? (!error && <div className="splash"><Spinner /></div>) : (
        <Card flush actions={<label className="switch" style={{ fontSize: 13 }}><input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Ver todos los talleres</label>} title="Talleres" icon={<MdRateReview style={{ color: 'var(--brand)' }} />}>
          {list.length === 0 ? <Empty icon={<MdAssignment />}>{all ? 'Aún no has publicado talleres.' : 'No tienes entregas pendientes por calificar.'}</Empty> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Taller</th><th>Grupo</th><th>Entrega hasta</th><th className="num">Entregas</th><th className="num">Por calificar</th><th className="actions" /></tr></thead>
                <tbody>{list.map((r) => (
                  <tr key={r.id}>
                    <td style={{ whiteSpace: 'normal' }}><b>{r.title}</b><div className="hint">{r.subject || 'General del grupo'}</div></td>
                    <td style={{ whiteSpace: 'normal' }}>{r.group}<div className="hint">{r.program}</div></td>
                    <td>{dt(r.dueAt)}</td>
                    <td className="num">{r.total}{r.late ? <div className="hint">{r.late} tarde</div> : null}</td>
                    <td className="num">{r.pending ? <span className="badge warn">{r.pending}</span> : <span className="badge ok">0</span>}</td>
                    <td className="actions"><button type="button" className="btn btn-primary btn-sm" onClick={() => setOpen(r)}><MdRateReview /> Revisar</button></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      )}
      {open && <SubmissionsModal material={open} onClose={() => { setOpen(null); load() }} />}
    </>
  )
}
