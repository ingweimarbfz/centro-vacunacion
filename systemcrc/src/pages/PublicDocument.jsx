import React, { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { MdPrint, MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { VaccinationCardSheet, InvoiceSheet } from '../components/share/DocumentSheets'
import '../pages/facturacion/facturacion.css'

// Vista pública (sin iniciar sesión) del documento que la IPS compartió con el paciente.
const PublicDocument = () => {
  const { token } = useParams()
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api.get(`/publico/documento/${token}`).then(({ data }) => setD(data)).catch((e) => setErr(errorMessage(e))) }, [token])
  useEffect(() => { if (d) document.title = d.kind === 'carnet' ? `Carnet de vacunación · ${d.institution.name}` : `Factura ${d.data.numFactura} · ${d.institution.name}` }, [d])
  const inst = d ? { logo: d.institution.logoUrl, name: d.institution.name, shortName: d.institution.shortName } : null
  return (
    <div style={{ minHeight: '100vh', background: '#F3F4F6', padding: '20px 12px' }}>
      {err && <div className="alert bad" style={{ maxWidth: 640, margin: '40px auto' }}><MdErrorOutline /><span>{err}</span></div>}
      {!d && !err && <div className="splash"><span className="spinner" /></div>}
      {d && (
        <div className="cy-detail-page">
          <div className="cy-toolbar no-print">
            <span className="hint">Enlace válido hasta {d.expiresAt.slice(0, 10).split('-').reverse().join('/')}</span>
            <button type="button" className="btn btn-primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
          </div>
          {d.kind === 'carnet' ? <VaccinationCardSheet patient={d.data.patient} records={d.data.records} institution={inst} /> : <InvoiceSheet c={d.data} institution={inst} />}
        </div>
      )}
    </div>
  )
}

export default PublicDocument
