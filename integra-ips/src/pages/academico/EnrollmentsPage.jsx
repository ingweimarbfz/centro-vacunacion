import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MdErrorOutline, MdHowToReg, MdArrowForward } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { ENROLL_STATUS, StatusBadge } from './common'

// Listado de matrículas por programa, grupo y estado. Se matricula desde la ficha del estudiante.
const EnrollmentsPage = () => {
  const [params, setParams] = useSearchParams()
  const filters = { programa: params.get('programa') || '', grupo: params.get('grupo') || '', estado: params.get('estado') || '' }
  const [rows, setRows] = useState(null)
  const [programs, setPrograms] = useState([])
  const [groups, setGroups] = useState([])
  const [error, setError] = useState('')
  const setFilter = (k, v) => { const n = { ...filters, [k]: v }; if (k === 'programa') n.grupo = ''; setParams(Object.fromEntries(Object.entries(n).filter(([, x]) => x))) }
  useEffect(() => {
    setRows(null)
    api.get('/academico/matriculas', { params: { programa: filters.programa || undefined, grupo: filters.grupo || undefined, estado: filters.estado || undefined } })
      .then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e)))
  }, [filters.programa, filters.grupo, filters.estado])
  useEffect(() => { api.get('/academico/programas').then(({ data }) => setPrograms(data)).catch(() => {}); api.get('/academico/grupos').then(({ data }) => setGroups(data)).catch(() => {}) }, [])
  const totals = useMemo(() => (rows || []).filter((e) => e.status === 'matriculado').reduce((a, e) => ({ n: a.n + 1, v: a.v + e.totalValue }), { n: 0, v: 0 }), [rows])

  return (
    <>
      <PageHead title="Matrículas" subtitle="Para matricular, abre la ficha del estudiante en “Estudiantes”" />
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
        <select className="input" style={{ width: 'auto', minWidth: 200 }} aria-label="Programa" value={filters.programa} onChange={(e) => setFilter('programa', e.target.value)}>
          <option value="">Todos los programas</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <select className="input" style={{ width: 'auto', minWidth: 200 }} aria-label="Grupo" value={filters.grupo} onChange={(e) => setFilter('grupo', e.target.value)}>
          <option value="">Todos los grupos</option>{groups.filter((g) => !filters.programa || g.programId === Number(filters.programa)).map((g) => <option key={g.id} value={g.id}>{g.code}</option>)}
        </select>
        <select className="input" style={{ width: 'auto', minWidth: 200 }} aria-label="Estado" value={filters.estado} onChange={(e) => setFilter('estado', e.target.value)}>
          <option value="">Todos los estados</option>{Object.entries(ENROLL_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
        </select>
        {rows && <span style={{ alignSelf: 'center', fontSize: 13, color: 'var(--muted)' }}>{totals.n} matriculados · {formatMoney(totals.v)}</span>}
      </div>
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? (!error && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>) : rows.length === 0 ? (
        <Card><Empty icon={<MdHowToReg />}>No hay matrículas con estos filtros.</Empty></Card>
      ) : (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Fecha</th><th>Estudiante</th><th>Programa</th><th>Grupo · periodo</th><th className="num">Valor</th><th>Cuotas</th><th>Estado</th><th className="actions" /></tr></thead>
              <tbody>{rows.map((e) => (
                <tr key={e.id}>
                  <td>{formatDate(e.enrolledAt)}</td>
                  <td><b>{e.student?.fullName}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{e.student?.docType} {e.student?.docNumber}</div></td>
                  <td style={{ whiteSpace: 'normal' }}>{e.program?.name}</td>
                  <td>{e.group?.code || '—'}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{[e.period?.name, e.academicPeriod].filter(Boolean).join(' · ')}</div></td>
                  <td className="num">{formatMoney(e.totalValue)}</td>
                  <td>{e.installments > 1 ? `${e.installments} × ${formatMoney(e.installmentValue)}` : 'Contado'}</td>
                  <td><StatusBadge status={e.status} /></td>
                  <td className="actions"><Link className="btn btn-ghost btn-icon" aria-label="Abrir ficha del estudiante" title="Abrir ficha" to={`/educacion/estudiantes/${e.studentId}`}><MdArrowForward /></Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  )
}

export default EnrollmentsPage
