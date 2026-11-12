import React, { useState } from 'react'
import api, { errorMessage } from '../api/client'
import { MdCancel, MdSearch, MdVisibility, MdBiotech } from 'react-icons/md'
import { PageHead, Card, Empty, Spinner, initials } from './ui'
import CytologyDetail from './CytologyDetail'
import { formatDate } from '../utils/format'
import './cytology.css'
import usePagedList from '../hooks/usePagedList'
import LoadMore from './LoadMore'

const EMPTY_FILTERS = { desde: '', hasta: '', documento: '' }

const ConsultCytology = () => {
  const [filters, setFilters] = useState(EMPTY_FILTERS)
  const list = usePagedList('/consultar-citologias')
  const results = list.rows; const setResults = list.setRows
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [detail, setDetail] = useState(null)

  const handleChange = (e) => setFilters({ ...filters, [e.target.name]: e.target.value })

  const handleSearch = async (e) => {
    e.preventDefault()
    setError('')
    if (!filters.desde && !filters.hasta && !filters.documento.trim()) {
      setError('Ingresa un rango de fechas y/o un número de documento.')
      return
    }
    if (filters.desde && filters.hasta && filters.desde > filters.hasta) {
      setError('La fecha inicial no puede ser mayor que la final.')
      return
    }
    setLoading(true)
    try {
      const params = Object.fromEntries(Object.entries(filters).filter(([, v]) => v.trim() !== ''))
      await list.load(params)
    } catch (err) {
      setError(errorMessage(err, 'No se pudo consultar.'))
    } finally {
      setLoading(false)
    }
  }

  const handleClear = () => {
    setFilters(EMPTY_FILTERS)
    setResults(null)
    setError('')
  }

  const openDetail = async (id) => {
    setError('')
    try {
      const { data } = await api.get(`/citologias/${id}`)
      setDetail(data)
      window.scrollTo(0, 0)
    } catch (err) {
      setError(errorMessage(err, 'No se pudo cargar la citología.'))
    }
  }

  if (detail) return <CytologyDetail data={detail} onBack={() => setDetail(null)} />

  return (
    <>
      <PageHead title="Consultar citologías" subtitle="Busca por rango de fechas del examen y/o número de documento" />

      <Card>
        <form className="form-grid" style={{ alignItems: 'end' }} onSubmit={handleSearch}>
          <div className="field"><label htmlFor="desde">Fecha examen desde</label><input id="desde" type="date" name="desde" value={filters.desde} onChange={handleChange} /></div>
          <div className="field"><label htmlFor="hasta">Fecha examen hasta</label><input id="hasta" type="date" name="hasta" value={filters.hasta} onChange={handleChange} /></div>
          <div className="field"><label htmlFor="documento">N° de documento</label>
            <div className="input-icon"><MdSearch /><input id="documento" type="text" name="documento" inputMode="numeric" placeholder="Ej. 1065…" value={filters.documento} onChange={handleChange} /></div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1 }} disabled={loading}>{loading ? <><Spinner /> Buscando…</> : <><MdSearch /> Buscar</>}</button>
            <button type="button" className="btn btn-outline" onClick={handleClear}>Limpiar</button>
          </div>
        </form>
      </Card>

      {error && <div className="alert bad" style={{ marginTop: 18 }}><MdCancel /><span>{error}</span></div>}

      {results && (
        <Card flush className="cy-results-card" title="Resultados"
          subtitle={results.length === 0 ? 'No se encontraron citologías con esos filtros.' : `${list.total} resultado${list.total === 1 ? '' : 's'}`}>
          {results.length === 0 ? <Empty icon={<MdBiotech />}>Prueba con otro rango de fechas o documento.</Empty> : (
            <div className="table-wrap" style={{ marginTop: 12 }}>
              <table className="table">
                <thead>
                  <tr><th>Fecha examen</th><th>Paciente</th><th>Documento</th><th className="num">Edad</th><th>Lámina</th><th>Factura</th><th>Entidad / EPS</th><th className="actions"></th></tr>
                </thead>
                <tbody>
                  {results.map((r) => (
                    <tr key={r.id}>
                      <td>{formatDate(r.fechaExamen)}</td>
                      <td><div className="cell-user"><span className="avatar sm">{initials(`${r.nombre} ${r.apellidos}`)}</span><div><strong>{r.nombre} {r.apellidos}</strong><span>{r.regimen || '—'}</span></div></div></td>
                      <td>{r.numDocumento}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.tipoDocumento || ''}</div></td>
                      <td className="num">{r.edad ?? '—'}</td>
                      <td><span className="badge navy">{r.numLamina || '—'}</span></td>
                      <td>{r.numFactura || <span className="hint">Por facturar</span>}</td>
                      <td>{r.entidad || '—'}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.eps || ''}</div></td>
                      <td className="actions"><button type="button" className="btn btn-outline btn-sm" onClick={() => openDetail(r.id)}><MdVisibility /> Ver detalles</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          <LoadMore shown={results.length} total={list.total} hasMore={list.hasMore} loading={list.loadingMore} onMore={() => list.more().catch((e) => setError(errorMessage(e)))} />
        </Card>
      )}
    </>
  )
}

export default ConsultCytology
