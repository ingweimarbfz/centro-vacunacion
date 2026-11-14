import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdErrorOutline, MdFactCheck, MdArrowForward } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { formatDate } from '../../utils/format'

const TABS = [['pendiente_director', 'Pendientes de firma del director', 'warn'], ['sin_cerrar', 'Asistencia sin cerrar', 'info'], ['sin_asistencia', 'Sin asistencia', ''], ['firmada', 'Firmadas', 'ok']]

// Actas de asistencia de los últimos 60 días: el director firma las pendientes; el personal revisa las que faltan por cerrar.
const ActasPage = () => {
  const [tab, setTab] = useState('pendiente_director')
  const [groups, setGroups] = useState([]); const [group, setGroup] = useState('')
  const [d, setD] = useState(null); const [error, setError] = useState('')
  const load = useCallback(() => api.get('/academico/actas', { params: { grupo: group || undefined }, noCache: true }).then(({ data }) => setD(data)).catch((e) => setError(errorMessage(e))), [group])
  useEffect(() => { load() }, [load])
  useEffect(() => { api.get('/academico/grupos').then(({ data }) => setGroups(data)).catch(() => {}) }, [])
  const rows = (d?.rows || []).filter((r) => r.acta === tab)
  return (
    <>
      <PageHead title="Asistencia y actas" subtitle={d?.isDirector ? 'Como director de educación firmas las actas que los docentes ya cerraron' : 'Actas de asistencia de las clases de los últimos 60 días'} />
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        {TABS.map(([k, l, tone]) => <button key={k} type="button" className={`btn btn-sm ${tab === k ? 'btn-primary' : 'btn-outline'}`} onClick={() => setTab(k)}>{l} <span className={`badge ${tab === k ? '' : tone}`} style={{ marginLeft: 4 }}>{d?.counts?.[k] ?? 0}</span></button>)}
        <select className="input" style={{ width: 'auto', minWidth: 200, marginLeft: 'auto' }} aria-label="Grupo" value={group} onChange={(e) => setGroup(e.target.value)}><option value="">Todos los grupos</option>{groups.map((g) => <option key={g.id} value={g.id}>{g.code} · {g.program?.name}</option>)}</select>
      </div>
      {!d ? (!error && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>) : (
        <Card flush>
          {rows.length === 0 ? <Empty icon={<MdFactCheck />}>No hay actas en este estado.</Empty> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Fecha</th><th>Grupo · asignatura</th><th>Docente</th><th className="num">Asistieron</th><th className="num">Ausentes</th><th className="num">Firmas</th><th className="actions" /></tr></thead>
                <tbody>{rows.map((r) => (
                  <tr key={r.id}>
                    <td>{formatDate(r.date)}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.startTime}–{r.endTime}</div></td>
                    <td style={{ whiteSpace: 'normal' }}><b>{r.group?.code}</b> · {r.subject || 'Clase'}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.group?.program}</div></td>
                    <td>{r.teacher || '—'}</td>
                    <td className="num">{r.marked ? r.attended : '—'}</td>
                    <td className="num">{r.marked ? r.absent : '—'}</td>
                    <td className="num">{r.marked ? `${r.signatures}/${r.attended}` : '—'}</td>
                    <td className="actions"><Link className="btn btn-ghost btn-icon" aria-label="Abrir asistencia" title="Abrir asistencia" to={`/educacion/clases/${r.id}/asistencia`}><MdArrowForward /></Link></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
      )}
    </>
  )
}

export default ActasPage
