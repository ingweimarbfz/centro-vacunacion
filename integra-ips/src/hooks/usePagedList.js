import { useCallback, useRef, useState } from 'react'
import api from '../api/client'

// Listado paginado: trae la primera página y "Cargar más" agrega la siguiente.
// El total viene del servidor en la cabecera X-Total-Count.
const usePagedList = (url, pageSize = 50) => {
  const [rows, setRows] = useState(null)
  const [total, setTotal] = useState(0)
  const [loadingMore, setLoadingMore] = useState(false)
  const last = useRef({ params: {}, page: 1 })
  const fetchPage = useCallback(async (params, page) => {
    const res = await api.get(url, { params: { ...params, pagina: page, limite: pageSize } })
    const t = Number(res.headers?.['x-total-count'])
    return { data: res.data, total: Number.isFinite(t) ? t : res.data.length }
  }, [url, pageSize])
  // Primera página (al buscar o cambiar filtros).
  const load = useCallback(async (params = {}) => {
    last.current = { params, page: 1 }
    const r = await fetchPage(params, 1)
    setRows(r.data); setTotal(r.total)
    return r.data
  }, [fetchPage])
  // Página siguiente, agregada al final.
  const more = useCallback(async () => {
    const l = last.current
    setLoadingMore(true)
    try {
      const r = await fetchPage(l.params, l.page + 1)
      l.page += 1
      setRows((x) => [...(x || []), ...r.data]); setTotal(r.total)
    } finally { setLoadingMore(false) }
  }, [fetchPage])
  return { rows, setRows, total, load, more, loadingMore, hasMore: Boolean(rows) && rows.length < total }
}

export default usePagedList
