import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdPrint, MdErrorOutline, MdSend } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { Spinner } from '../../components/ui'
import { VaccinationCardSheet } from '../../components/share/DocumentSheets'
import ShareDialog from '../../components/share/ShareDialog'

// Carnet de vacunación imprimible (PDF), con envío al paciente por WhatsApp o correo.
const VaccinationCard = () => {
  const { documento } = useParams()
  const navigate = useNavigate()
  const { logo, settings } = useSettings()
  const [c, setC] = useState(null); const [err, setErr] = useState(''); const [share, setShare] = useState(false)
  useEffect(() => { api.get(`/vacunacion/carne/${documento}`).then(({ data }) => setC(data)).catch((e) => setErr(errorMessage(e))) }, [documento])
  useEffect(() => { if (c) { const t = document.title; document.title = `Carnet_vacunacion_${c.patient.docNumber}`; return () => { document.title = t } } return undefined }, [c])
  if (err) return <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>
  if (!c) return <div className="splash"><Spinner /></div>
  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>← Volver</button>
        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" className="btn btn-outline" onClick={() => setShare(true)}><MdSend /> Enviar al paciente</button>
          <button type="button" className="btn btn-primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
        </div>
      </div>
      <VaccinationCardSheet patient={c.patient} records={c.records} institution={{ logo, name: settings.ipsName, shortName: settings.shortName }} />
      {share && <ShareDialog kind="carnet" refId={c.patient.docNumber} onClose={() => setShare(false)} />}
    </div>
  )
}

export default VaccinationCard
