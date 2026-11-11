import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdDraw, MdVisibility, MdDoneAll, MdWarning } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { Card, Modal, Spinner, useToast } from './ui'

const TZ = 'America/Bogota'
const fmt = (iso) => (iso ? new Intl.DateTimeFormat('es-CO', { timeZone: TZ, day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso.length === 10 ? `${iso}T12:00:00` : iso)) : '')
const TYPE_TONE = { citologia: 'brand', evento: 'warn', reporte_vehiculo: 'navy', preoperacional: 'info' }

// Documentos pendientes por firmar del usuario: previsualizar, firmar uno o firmar todos.
const PendingSignatures = () => {
  const [toast, toastNode] = useToast()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState('')
  const [all, setAll] = useState(false)
  const [confirm, setConfirm] = useState(false)
  const load = useCallback(() => api.get('/firmas/pendientes', { params: { sede: undefined } }).then(({ data: d }) => setData(d)).catch(() => setData({ total: 0, items: [] })), [])
  useEffect(() => { load() }, [load])
  if (!data || data.total === 0) return null
  const key = (it) => `${it.docType}|${it.docKey}|${it.slot}`
  const signOne = async (it) => {
    setBusy(key(it))
    try { await api.post('/firmas', { docType: it.docType, docKey: it.docKey, slot: it.slot }); toast(`${it.title} firmado`); load() } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy('') }
  }
  const signAll = async () => {
    setConfirm(false); setBusy('all')
    try {
      const { data: r } = await api.post('/firmas/lote', {})
      toast(r.errors.length ? `${r.signed} firmados · ${r.errors.length} con error` : `${r.signed} documentos firmados`, r.errors.length ? 'bad' : 'ok'); load()
    } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy('') }
  }
  const shown = all ? data.items : data.items.slice(0, 6)
  return (
    <Card flush className="pending-sign" title={`Pendientes por firmar (${data.total})`} subtitle="Documentos en los que eres el firmante" icon={<MdDraw style={{ color: 'var(--brand)' }} />}
      actions={data.hasSignature && <button type="button" className="btn btn-primary btn-sm" onClick={() => setConfirm(true)} disabled={busy === 'all'}>{busy === 'all' ? <Spinner /> : <MdDoneAll />} Firmar todos</button>}>
      {!data.hasSignature && (
        <div className="alert warn" style={{ margin: '12px 16px 0' }}><MdWarning /><span>Para firmar, primero crea tu firma digital.</span>
          <Link to="/firma" className="btn btn-outline btn-sm alert-actions">Crear mi firma</Link></div>
      )}
      <ul className="list pending-list">
        {shown.map((it) => (
          <li key={key(it)}>
            <div className="grow">
              <strong>{it.title} <span className={`badge ${TYPE_TONE[it.docType] || ''}`} style={{ fontSize: 10.5 }}>{it.slotLabel}</span></strong>
              <span>{it.subtitle}{it.date ? ` · ${fmt(it.date)}` : ''}</span>
            </div>
            <div className="pending-actions">
              <Link to={it.link} className="btn btn-ghost btn-sm" title="Previsualizar el documento y firmarlo"><MdVisibility /> Ver</Link>
              {data.hasSignature && <button type="button" className="btn btn-outline btn-sm" onClick={() => signOne(it)} disabled={!!busy}>{busy === key(it) ? <Spinner /> : <MdDraw />} Firmar</button>}
            </div>
          </li>
        ))}
      </ul>
      {data.items.length > 6 && <div style={{ padding: '0 16px 14px' }}><button type="button" className="btn btn-ghost btn-sm" onClick={() => setAll(!all)}>{all ? 'Ver menos' : `Ver los ${data.items.length}`}</button></div>}
      {confirm && (
        <Modal title="Firmar todos los pendientes" size="sm" onClose={() => setConfirm(false)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setConfirm(false)}>Cancelar</button><button type="button" className="btn btn-primary" onClick={signAll}><MdDoneAll /> Firmar {data.total}</button></>}>
          <p style={{ margin: 0 }}>Se estampará tu firma digital en <b>{data.total} documento{data.total === 1 ? '' : 's'}</b> pendiente{data.total === 1 ? '' : 's'}. Puedes retirar una firma después desde el documento.</p>
        </Modal>
      )}
      {toastNode}
    </Card>
  )
}

export default PendingSignatures
