import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdPrint, MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { Spinner } from '../../components/ui'
import { formatDate } from '../../utils/format'
import { ATT } from './AttendancePage'
import '../../components/cytology.css'

const stamp = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota' }) : '')

// Acta de asistencia imprimible con el formato institucional (código, nombre y versión) y las tres firmas.
const ActaPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { logo } = useSettings()
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api.get(`/academico/clases/${id}/asistencia`).then(({ data }) => setD(data)).catch((e) => setErr(errorMessage(e))) }, [id])
  useEffect(() => { if (d) { const t = document.title; document.title = `Acta_asistencia_${d.session.group?.code}_${d.session.date}`; return () => { document.title = t } } return undefined }, [d])
  if (err) return <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>
  if (!d) return <div className="splash"><Spinner /></div>
  const s = d.session
  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={() => navigate(-1)}>← Volver</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
      </div>
      <article className="cy-sheet">
        <header className="cy-sheet-header">
          <img className="cy-logo" src={d.format.logoUrl || logo} alt={d.format.institution} />
          <div className="cy-sheet-heading"><p className="cy-kicker">{d.format.institution}</p><h2>{d.format.name}</h2></div>
          <dl className="cy-meta">
            {d.format.code && <div><dt>Código</dt><dd>{d.format.code}</dd></div>}
            {d.format.version && <div><dt>Versión</dt><dd>{d.format.version}</dd></div>}
            <div><dt>Fecha</dt><dd>{formatDate(s.date)}</dd></div>
          </dl>
        </header>
        <div className="cy-patient-band">
          <div><span className="cy-field-label">Programa · grupo</span><b className="cy-patient-name">{s.group?.program}</b><span>Grupo {s.group?.code}</span></div>
          <div><span className="cy-field-label">Asignatura</span><b>{s.subject || '—'}</b>{s.topic && <span>Tema: {s.topic}</span>}</div>
          <div><span className="cy-field-label">Horario</span><b>{s.startTime}–{s.endTime}</b><span>{s.modality === 'virtual' ? `Virtual · ${s.platformLabel || ''}` : `Presencial${s.location ? ` · ${s.location}` : ''}`}</span></div>
        </div>
        <section className="cy-section" style={{ breakInside: 'auto' }}>
          <h3 className="cy-section-title">Estudiantes</h3>
          <table className="table" style={{ fontSize: 11.5 }}>
            <thead><tr><th>#</th><th>Estudiante</th><th>Documento</th><th>Asistencia</th><th>Observación</th><th style={{ width: 150 }}>Firma</th></tr></thead>
            <tbody>{d.roster.map((r, i) => (
              <tr key={r.studentId}>
                <td>{i + 1}</td><td style={{ whiteSpace: 'normal' }}>{r.fullName}</td><td>{r.docType} {r.docNumber}</td>
                <td>{r.status ? ATT[r.status][1] : '—'}{r.arrivedAt ? ` (${r.arrivedAt})` : ''}</td>
                <td style={{ whiteSpace: 'normal' }}>{r.note || ''}</td>
                <td>{r.signatureUrl ? <img src={r.signatureUrl} alt={`Firma de ${r.fullName}`} style={{ height: 28, maxWidth: 140, objectFit: 'contain' }} /> : ''}</td>
              </tr>
            ))}</tbody>
          </table>
          <p style={{ margin: '2mm 0 0', fontSize: 11 }}>Presentes: {d.summary.presente} · Tarde: {d.summary.tarde} · Excusa: {d.summary.excusa} · Ausentes: {d.summary.ausente} · Total: {d.summary.total}</p>
        </section>
        <div className="cy-signatures">
          <div>{d.teacher.signatureUrl ? <img src={d.teacher.signatureUrl} alt="Firma del docente" style={{ maxHeight: 55, maxWidth: '100%', objectFit: 'contain', alignSelf: 'flex-start' }} /> : <div style={{ height: 55 }} />}<span className="cy-sign-line" /><b>{d.teacher.name || s.teacher || ''}</b><span>Docente{d.teacher.signedAt ? ` · ${stamp(d.teacher.signedAt)}` : ''}</span></div>
          <div>{d.director.signatureUrl ? <img src={d.director.signatureUrl} alt="Firma del director" style={{ maxHeight: 55, maxWidth: '100%', objectFit: 'contain', alignSelf: 'flex-start' }} /> : <div style={{ height: 55 }} />}<span className="cy-sign-line" /><b>{d.director.name || ''}</b><span>Director(a) de educación{d.director.signedAt ? ` · ${stamp(d.director.signedAt)}` : ''}</span></div>
        </div>
        <footer className="cy-sheet-footer"><span>{d.format.code ? `${d.format.code} · ` : ''}{d.format.name}</span><span>{d.stateLabel}</span></footer>
      </article>
    </div>
  )
}

export default ActaPage
