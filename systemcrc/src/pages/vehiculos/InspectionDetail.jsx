import React, { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MdArrowBack, MdPrint, MdDelete, MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { Modal, Spinner, useToast } from '../../components/ui'
import { km } from './common'
import { fmtDate, fmtTime } from '../socorro/common'
import '../../components/cytology.css'
import { SignBlock, useDocSignatures } from '../../components/signature'

// Preoperacional: vista e impresión en PDF.
const InspectionDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { logo, settings } = useSettings()
  const [toast, toastNode] = useToast()
  const [r, setR] = useState(null)
  const [error, setError] = useState('')
  const [confirm, setConfirm] = useState(false)
  const [zoom, setZoom] = useState(null)
  const doc = useDocSignatures('preoperacional', r?.id)

  useEffect(() => { api.get(`/vehiculos-preoperacional/${id}`).then(({ data }) => setR(data)).catch((e) => setError(errorMessage(e))) }, [id])
  useEffect(() => { if (!r) return undefined; const p = document.title; document.title = `Preoperacional_${r.code}_Movil_${r.vehicle.movil}`; return () => { document.title = p } }, [r])

  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!r) return <div className="splash"><Spinner /> Cargando…</div>
  const apto = r.result === 'apto'
  const printedAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())
  const Yes = ({ ok }) => <span className={`badge ${ok ? 'ok' : 'bad'}`}>{ok ? 'Sí' : 'No'}</span>

  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <Link to="/socorro/vehiculos/preoperacional" className="btn btn-outline"><MdArrowBack /> Preoperacional</Link>
        <div style={{ display: 'flex', gap: 8 }}>
          {user.role === 'administrador' && <button type="button" className="btn btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => setConfirm(true)}><MdDelete /> Eliminar</button>}
          <button type="button" className="btn btn-primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
        </div>
      </div>

      <article className="cy-sheet ev-sheet">
        <header className="cy-sheet-header">
          <img src={logo} alt={settings.ipsName} className="cy-logo" />
          <div className="cy-sheet-heading">
            <p className="cy-kicker">Flota vehicular · Prechequeo operacional</p>
            <h2>Lista de chequeo preoperacional</h2>
            <p className="ev-formats">Basada en el formato SURA para automóvil o pick-up · Plan Estratégico de Seguridad Vial (PESV)</p>
          </div>
          <dl className="cy-meta">
            <div><dt>Registro</dt><dd>{r.code}</dd></div>
            <div><dt>Resultado</dt><dd><span className={`badge ${apto ? 'ok' : 'bad'}`}>{apto ? 'APTO' : 'NO APTO'}</span></dd></div>
            <div><dt>Anomalías</dt><dd>{r.anomalies}</dd></div>
          </dl>
        </header>

        <section className="cy-section">
          <h3 className="cy-section-title">1. Información general</h3>
          <div className="cy-grid">
            <div className="cy-field cy-field-wide"><span className="cy-field-label">Nombre del conductor</span><span className="cy-field-value">{r.driver.name}</span></div>
            <div className="cy-field"><span className="cy-field-label">Documento</span><span className="cy-field-value">{r.driver.identification}</span></div>
            <div className="cy-field"><span className="cy-field-label">Sede</span><span className="cy-field-value">{r.siteName}</span></div>
            <div className="cy-field"><span className="cy-field-label">Fecha</span><span className="cy-field-value">{fmtDate(r.inspectedAt)}</span></div>
            <div className="cy-field"><span className="cy-field-label">Hora</span><span className="cy-field-value">{fmtTime(r.inspectedAt)}</span></div>
            <div className="cy-field"><span className="cy-field-label">Placa · móvil</span><span className="cy-field-value">{r.vehicle.plate} · Móvil {r.vehicle.movil}</span></div>
            <div className="cy-field"><span className="cy-field-label">Kilometraje</span><span className="cy-field-value">{km(r.km)}</span></div>
          </div>
        </section>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">2. Condiciones del conductor</h3>
          <table className="ev-table">
            <thead><tr><th>Pregunta</th><th>Cumple</th><th>Observaciones / hallazgos</th></tr></thead>
            <tbody><tr><td>¿Está en condiciones de salud y descanso para usar el vehículo (sin malestar, mareos, fiebre, sueño u otros síntomas)?</td><td><Yes ok={r.driverFit} /></td><td>{r.driverFitObservation || '—'}</td></tr></tbody>
          </table>
        </section>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">3. Condiciones del vehículo</h3>
          <table className="ev-table">
            <thead><tr><th>Ítem</th><th>Verificación</th><th>Cumple</th><th>Observaciones / hallazgos</th></tr></thead>
            <tbody>{r.items.map((it) => (
              <tr key={it.key} className={it.ok === false ? 'po-bad' : ''}>
                <td><b>{it.label}</b></td><td className="vs-parts" style={{ fontSize: 10 }}>{it.help}</td><td><Yes ok={it.ok} /></td>
                <td>{it.observation || '—'}{it.photos.length > 0 && <div className="po-photos">{it.photos.map((p, i) => <img key={i} src={p} alt={`${it.label} ${i + 1}`} onClick={() => setZoom(p)} />)}</div>}</td>
              </tr>
            ))}</tbody>
          </table>
        </section>

        <section className="cy-section cy-notes" style={{ gridTemplateColumns: '1fr' }}>
          <div><h3 className="cy-section-title">Observación general</h3><p>{r.generalObservation || '—'}</p>
            {r.generalPhotos.length > 0 && <div className="po-photos big">{r.generalPhotos.map((p, i) => <img key={i} src={p} alt={`Foto general ${i + 1}`} onClick={() => setZoom(p)} />)}</div>}</div>
        </section>

        {!apto && <p className="ev-complete" style={{ color: '#991B1B' }}>Se reportaron anomalías: el administrador de la flota debe definir si el vehículo se puede movilizar.</p>}

        <section className="cy-signatures" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <SignBlock doc={doc} slot="conductor" label="Conductor" name={r.driver.name} canSign={r.driver.id === user.id} />
          <SignBlock doc={doc} slot="reviso" label="Revisó · Administrador de flota" canSign={user.role === 'administrador'} />
        </section>
        <footer className="cy-sheet-footer"><span>{settings.ipsName} · Preoperacional {r.code}</span><span>Impreso el {printedAt}</span></footer>
      </article>

      {zoom && <div className="modal-backdrop no-print" onClick={() => setZoom(null)}><img src={zoom} alt="Foto ampliada" style={{ maxWidth: '95vw', maxHeight: '90vh', borderRadius: 10 }} /></div>}
      {confirm && (
        <Modal title="Eliminar preoperacional" size="sm" onClose={() => setConfirm(false)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setConfirm(false)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={async () => { try { await api.delete(`/vehiculos-preoperacional/${r.id}`); navigate('/socorro/vehiculos/preoperacional') } catch (e) { toast(errorMessage(e), 'bad'); setConfirm(false) } }}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar el preoperacional <b>{r.code}</b> y sus fotos? Esta acción no se puede deshacer.</p>
        </Modal>
      )}
      {toastNode}
    </div>
  )
}

export default InspectionDetail
