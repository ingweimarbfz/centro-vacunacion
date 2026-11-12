import { useCallback, useState } from 'react'
import api, { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { inPlan } from '../utils/permissions'

// Factura previa de un servicio con formulario (Facturación → Servicios facturables).
// Reutilizable: cada formulario de servicio la usa con su módulo (citologia, …) y recibe la factura elegida en onSelect.
const useServiceInvoice = (module, onSelect) => {
  const { user } = useAuth()
  const billingOn = inPlan(user, 'facturacion')
  const [invoice, setInvoice] = useState(null)
  const [state, setState] = useState({ query: '', loading: false, results: null, error: '' })
  const select = useCallback((inv) => { setInvoice(inv); if (inv && onSelect) onSelect(inv) }, [onSelect])
  const search = useCallback(async (query, preselectId) => {
    const q = String(query || '').trim()
    if (q.length < 3) return setState({ query: q, loading: false, results: null, error: 'Escribe al menos 3 caracteres.' })
    setState({ query: q, loading: true, results: null, error: '' })
    try {
      const { data } = await api.get('/facturacion/facturas-disponibles', { params: { modulo: module, q } })
      setState({ query: q, loading: false, results: data, error: '' })
      // Se elige sola si llega preseleccionada o si hay una sola coincidencia.
      const pre = data.find((x) => String(x.id) === String(preselectId)) || (data.length === 1 ? data[0] : null)
      if (pre) select(pre)
    } catch (e) { setState({ query: q, loading: false, results: [], error: errorMessage(e) }) }
  }, [module, select])
  const reset = useCallback(() => { setInvoice(null); setState({ query: '', loading: false, results: null, error: '' }) }, [])
  // Valor de un cupo (una factura puede cubrir varios servicios).
  const unitValue = invoice ? Math.round(invoice.valor / (invoice.form?.units || 1)) : null
  return { billingOn, invoice, select, clear: () => setInvoice(null), search, reset, state, unitValue }
}

export default useServiceInvoice
