import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdPrint, MdErrorOutline, MdSend } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { Spinner } from '../../components/ui'
import { InvoiceSheet } from '../../components/share/DocumentSheets'
import ShareDialog from '../../components/share/ShareDialog'
import './facturacion.css'

// Facturación → Ver factura: imprimible (PDF) y envío al cliente por WhatsApp o correo.
const InvoicePage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { logo, settings } = useSettings()
  const [c, setC] = useState(null); const [err, setErr] = useState(''); const [share, setShare] = useState(false)
  useEffect(() => { api.get(`/facturacion/servicios/${id}`).then(({ data }) => setC(data)).catch((e) => setErr(errorMessage(e))) }, [id])
  useEffect(() => { if (c) { const t = document.title; document.title = `Factura_${c.numFactura}`; return () => { document.title = t } } return undefined }, [c])
  if (err) return <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>
  if (!c) return <div className="splash"><Spinner /></div>
  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>← Volver</button>
        <div style={{ display: 'flex', gap: 8 }}>
          {c.numFactura && c.billingStatus !== 'anulada' && <button type="button" className="btn btn-outline" onClick={() => setShare(true)}><MdSend /> Enviar al cliente</button>}
          <button type="button" className="btn btn-primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
        </div>
      </div>
      <InvoiceSheet c={c} institution={{ logo, name: settings.ipsName, shortName: settings.shortName }} />
      {share && <ShareDialog kind="factura" refId={c.id} onClose={() => setShare(false)} />}
    </div>
  )
}

export default InvoicePage
