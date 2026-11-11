import React, { useCallback, useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MdAdd, MdSearch, MdErrorOutline, MdFactCheck, MdArrowForward, MdWarning } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { km } from './common'
import { fmtDateTime } from '../socorro/common'

export const ResultBadge = ({ result, anomalies }) => result === 'apto'
  ? <span className="badge ok"><span className="dot" /> Apto</span>
  : <span className="badge bad"><MdWarning /> No apto · {anomalies}</span>

const InspectionsPage = () => {
  const { user } = useAuth()
  const driver = user.role === 'conductor'
  const [rows, setRows] = useState(null)
  const [vehicles, setVehicles] = useState([])
  const [params] = useSearchParams()
  const [filters, setFilters] = useState({ vehiculo: '', resultado: params.get('resultado') || '', desde: '', hasta: '' })
  const [error, setError] = useState('')

  const load = useCallback(async (f) => {
    setError('')
    try { const { data } = await api.get('/vehiculos-preoperacional', { params: Object.fromEntries(Object.entries(f).filter(([, v]) => v)) }); setRows(data) } catch (e) { setError(errorMessage(e)) }
  }, [])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(filters); api.get('/vehiculos').then(({ data }) => setVehicles(data)).catch(() => {}) }, [load])
  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value })
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())

  return (
    <>
      <PageHead title="Preoperacional" subtitle={driver ? 'Tu lista de chequeo diaria antes de salir con el vehículo' : 'Listas de chequeo diarias de los conductores'}>
        {driver && <Link to="/socorro/vehiculos/preoperacional/nuevo" className="btn btn-primary"><MdAdd /> Nuevo preoperacional</Link>}
      </PageHead>
      {driver && rows && !rows.some((r) => r.date === today) && (
        <div className="alert warn" style={{ marginBottom: 16 }}><MdFactCheck /><span>Aún no registras el preoperacional de hoy. Hazlo antes de salir con el vehículo.</span>
          <Link to="/socorro/vehiculos/preoperacional/nuevo" className="btn btn-outline btn-sm alert-actions">Registrar</Link></div>
      )}
      <Card>
        <form className="form-grid" style={{ alignItems: 'end' }} onSubmit={(e) => { e.preventDefault(); load(filters) }}>
          <div className="field"><label>Móvil</label><select value={filters.vehiculo} onChange={set('vehiculo')}><option value="">Todas</option>{vehicles.map((v) => <option key={v.id} value={v.id}>Móvil {v.movil} · {v.plate}</option>)}</select></div>
          <div className="field"><label>Resultado</label><select value={filters.resultado} onChange={set('resultado')}><option value="">Todos</option><option value="apto">Apto</option><option value="no_apto">No apto</option></select></div>
          <div className="field"><label>Desde</label><input type="date" value={filters.desde} onChange={set('desde')} /></div>
          <div className="field"><label>Hasta</label><input type="date" value={filters.hasta} onChange={set('hasta')} /></div>
          <button type="submit" className="btn btn-dark"><MdSearch /> Filtrar</button>
        </form>
      </Card>
      {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      <Card flush className="cy-results-card" title="Registros" subtitle={rows ? `${rows.length} preoperacionales · ${rows.filter((r) => r.result === 'no_apto').length} no aptos` : ''}>
        {!rows ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : rows.length === 0 ? <Empty icon={<MdFactCheck />}>Sin preoperacionales.</Empty> : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead><tr><th>Registro</th><th>Móvil</th>{!driver && <th>Conductor</th>}<th className="num">Kilometraje</th><th>Resultado</th><th className="actions" /></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}>
                  <td><Link to={`/socorro/vehiculos/preoperacional/${r.id}`} style={{ fontWeight: 600, color: 'var(--ink)' }}>{r.code}</Link><div style={{ fontSize: 12, color: 'var(--muted)', whiteSpace: 'nowrap' }}>{fmtDateTime(r.inspectedAt)}</div></td>
                  <td><span className="badge navy">Móvil {r.vehicle.movil}</span><div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'monospace' }}>{r.vehicle.plate}</div></td>
                  {!driver && <td>{r.driver.name}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.siteName}</div></td>}
                  <td className="num">{km(r.km)}</td>
                  <td><ResultBadge result={r.result} anomalies={r.anomalies} /></td>
                  <td className="actions"><Link className="btn btn-outline btn-sm" to={`/socorro/vehiculos/preoperacional/${r.id}`}>Ver / PDF <MdArrowForward /></Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </Card>
    </>
  )
}

export default InspectionsPage
