import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'
import { SignBlock, useDocSignatures } from '../../components/signature'
import FormatHeader from '../talento/FormatHeader'
import '../../components/cytology.css'

const FINDING = { ok: 'Ok', parcial: 'Parcial', no_evidencia: 'No se evidencia', na: 'No aplica' }
const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '—')
const printedAt = () => new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())

// Formato de verificación de la carpeta obligatoria de un estándar (Sí / No / Obs), imprimible y firmable.
const StdChecklistSheet = ({ standard, basePath, title, followTitle }) => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { user } = useAuth()
  const [c, setC] = useState(null)
  const [error, setError] = useState('')
  const doc = useDocSignatures('std_chequeo', id)
  useEffect(() => { api.get(`/estandares/documentos/${standard}/verificaciones/${id}`).then(({ data }) => setC(data)).catch((e) => setError(errorMessage(e))) }, [standard, id])
  useEffect(() => { if (c) { const p = document.title; document.title = `${c.kind === 'seguimiento' ? 'Seguimiento' : 'Verificacion'}_${standard}_${c.code}`; return () => { document.title = p } } return undefined }, [c, standard])
  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!c) return <div className="splash"><Spinner /> Cargando…</div>
  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={() => navigate(basePath)}>← Carpeta</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>
      <article className="cy-sheet ev-sheet th-form">
        <FormatHeader format={c.format} title={c.kind === 'seguimiento' ? (followTitle || 'Actividad de seguimiento') : title} extra={<span>N° {c.code}</span>} />
        <table className="th-form-id">
          <tbody>
            <tr><th>Estándar:</th><td>{c.standardLabel}</td><th>{c.kind === 'seguimiento' ? 'Fecha del seguimiento:' : 'Fecha de verificación:'}</th><td>{fmt(c.date)}</td></tr>
            <tr><th>Sede:</th><td>{c.siteName}</td><th>Resultado:</th><td>{c.kind === 'seguimiento' ? <><b>{c.compliant} de {c.total}</b> actividades en Ok</> : <><b>{c.result === 'cumple' ? 'CUMPLE' : 'NO CUMPLE'}</b> ({c.compliant} de {c.total} ítems aplicables)</>}</td></tr>
          </tbody>
        </table>
        {c.kind === 'seguimiento' ? (
          <table className="th-form-table">
            <thead><tr><th style={{ width: '34%' }}>Actividad</th><th style={{ width: '24%' }}>Hallazgo</th><th>Observación</th></tr></thead>
            <tbody>{c.items.map((it, i) => (
              <tr key={i}><td>{it.activity}</td><td><b>{FINDING[it.finding] || it.finding}</b>{it.detail ? <div className="vs-parts">{it.detail}</div> : null}</td><td>{it.observation || ''}</td></tr>
            ))}</tbody>
          </table>
        ) : (
        <table className="th-form-table">
          <thead><tr><th rowSpan={2}>Documento obligatorio en la carpeta</th><th colSpan={3}>Cumple</th></tr><tr><th className="yn">Sí</th><th className="yn">No</th><th className="obs">Obs *</th></tr></thead>
          <tbody>{c.items.map((it, i) => (
            <tr key={i}>
              <td>{it.code ? `${it.code}. ` : ''}{it.name}{it.documents?.length ? <div className="vs-parts">Soportes: {it.documents.join('; ')}</div> : null}</td>
              <td className="yn">{it.value === 'si' ? 'X' : ''}</td>
              <td className="yn">{it.value === 'no' ? 'X' : ''}</td>
              <td className="obs">{it.value === 'na' ? `No aplica${it.observation ? `: ${it.observation}` : ''}` : it.observation || ''}</td>
            </tr>
          ))}</tbody>
        </table>
        )}
        <div className="th-form-obs"><b>Observaciones generales*:</b> {c.observations || ''}</div>
        <section className="cy-signatures" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <SignBlock doc={doc} slot="revisa" label="Revisó · Nombre y cargo" canSign={['administrador', 'empleado'].includes(user.role)} />
          <SignBlock doc={doc} slot="verifica" label={c.kind === 'seguimiento' ? 'Realizó el seguimiento · Nombre y cargo' : 'Verificó · Nombre y cargo'} name={c.reviewer} canSign={c.reviewerId === user.id} />
        </section>
        <footer className="cy-sheet-footer"><span>{settings.ipsName} · {c.format?.code || title} · {c.code}</span><span>Impreso el {printedAt()}</span></footer>
      </article>
    </div>
  )
}

export default StdChecklistSheet
