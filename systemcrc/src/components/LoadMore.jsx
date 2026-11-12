import React from 'react'
import { MdExpandMore } from 'react-icons/md'
import { Spinner } from './ui'

// Pie de los listados paginados: "Mostrando X de Y" y botón para traer más.
const LoadMore = ({ shown, total, hasMore, loading, onMore }) => (!total ? null : (
  <div className="load-more">
    <span>Mostrando <b>{shown}</b> de <b>{total}</b></span>
    {hasMore && <button type="button" className="btn btn-outline btn-sm" onClick={onMore} disabled={loading}>{loading ? <Spinner /> : <MdExpandMore />} Cargar más</button>}
  </div>
))

export default LoadMore
