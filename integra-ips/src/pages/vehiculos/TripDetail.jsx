import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MdArrowBack, MdFlag, MdDelete, MdErrorOutline, MdPrint } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { useSettings } from '../../context/SettingsContext'
import { Modal, Spinner, useToast } from '../../components/ui'
import { CloseTripModal } from './TripsPage'
import { km, money } from './common'
import { fmtDate, fmtTime, duration } from '../socorro/common'
import '../../components/cytology.css'
import { SignBlock, useDocSignatures } from '../../components/signature'
import { DOC_TYPES, REGIMES, PRIORITIES, TRANSFER_TYPES, CONDITIONS, SEX } from './transfer'

// Reporte diario del conductor: vista e impresión (PDF).
const TripDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { logo, settings } = useSettings()
  const [toast, toastNode] = useToast()
  const [t, setT] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const doc = useDocSignatures('reporte_vehiculo', t?.id)

  const load = useCallback(async () => {
    try { const { data } = await api.get(`/vehiculos-reportes/${id}`); setT(data) } catch (e) { setError(errorMessage(e)) }
  }, [id])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (!t) return undefined
    const p = document.title; document.title = `Reporte_${t.code}_Movil_${t.vehicle.movil}`
    return () => { document.title = p }
  }, [t])

  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!t) return <div className="splash"><Spinner /> Cargando reporte…</div>

  const open = t.status === 'abierto'
  const canDelete = open || user.role === 'administrador'
  const printedAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())

  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print" style={{ flexWrap: 'wrap' }}>
        <Link to="/socorro/vehiculos/reportes" className="btn btn-outline"><MdArrowBack /> Reportes</Link>
        <div style={{ display: 'flex', gap: 8 }}>
          {canDelete && <button type="button" className="btn btn-ghost" style={{ color: 'var(--bad)' }} onClick={() => setModal('delete')}><MdDelete /> Eliminar</button>}
          {open && <button type="button" className="btn btn-primary" onClick={() => setModal('close')} disabled={!t.canClose}><MdFlag /> Cerrar actividad</button>}
          <button type="button" className={`btn ${open ? 'btn-outline' : 'btn-primary'}`} onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
        </div>
      </div>

      {open && !t.canClose && (
        <div className="alert info no-print" style={{ maxWidth: '216mm', margin: '0 auto 12px' }}>
          <MdFlag /><span>Esta actividad está asociada al servicio <b>{t.event.code} · {t.event.name}</b>, que sigue en curso. Se podrá cerrar cuando el coordinador finalice el servicio.</span>
        </div>
      )}
      <article className="cy-sheet ev-sheet">
        <header className="cy-sheet-header">
          <img src={logo} alt={settings.ipsName} className="cy-logo" />
          <div className="cy-sheet-heading">
            <p className="cy-kicker">{t.transfer ? 'IPS · Traslado asistencial' : 'Operaciones Generales · Flota vehicular institucional'}</p>
            <h2>{t.transfer ? 'Reporte de traslado asistencial' : 'Reporte diario de actividad vehicular'}</h2>
          </div>
          <dl className="cy-meta">
            <div><dt>Reporte</dt><dd>{t.code}</dd></div>
            <div><dt>Fecha</dt><dd>{fmtDate(t.startedAt)}</dd></div>
            <div><dt>Estado</dt><dd>{open ? 'Abierto' : 'Cerrado'}</dd></div>
          </dl>
        </header>

        <div className="cy-patient-band ev-band">
          <div><span className="cy-field-label">Actividad / servicio</span><strong className="cy-patient-name">{t.activity}</strong>{t.event && <span className="ev-sub">Servicio {t.event.code}</span>}</div>
          <div><span className="cy-field-label">Vehículo</span><strong>Móvil {t.vehicle.movil} · {t.vehicle.plate}</strong><span className="ev-sub">{t.vehicle.vehicleType} {t.vehicle.brand} {t.vehicle.line}</span></div>
          <div><span className="cy-field-label">Conductor</span><strong>{t.driver.name}</strong><span className="ev-sub">CC {t.driver.identification}</span></div>
        </div>

        {t.transfer && (() => {
          const x = t.transfer
          const F = ({ l, v, wide }) => <div className={`cy-field${wide ? ' cy-field-wide' : ''}`}><span className="cy-field-label">{l}</span><span className="cy-field-value">{v || '—'}</span></div>
          return (
            <section className="cy-section">
              <h3 className="cy-section-title">Traslado asistencial · ambulancia {/TAM/i.test(t.vehicle.vehicleType) ? 'TAM' : 'TAB'}</h3>
              <div className="cy-grid">
                <F l="Paciente" v={x.patientName} wide />
                <F l="Identificación" v={`${x.documentType} ${x.document}`} />
                <F l="Tipo de documento" v={DOC_TYPES[x.documentType]} />
                <F l="Sexo · edad" v={[SEX[x.sex], x.ageYears != null && `${x.ageYears} años`].filter(Boolean).join(' · ')} />
                <F l="Teléfono" v={x.phone} />
                <F l="EPS / aseguradora" v={x.eps} />
                <F l="Régimen" v={REGIMES[x.regime]} />
                <F l="Tipo de traslado" v={TRANSFER_TYPES[x.transferType]} />
                <F l="Prioridad" v={PRIORITIES[x.priority]?.[0]} />
                <F l="Condición del paciente" v={CONDITIONS[x.patientCondition]} />
                <F l="Origen" v={x.origin} wide />
                <F l="Destino (IPS receptora)" v={x.destination} wide />
                <F l="Diagnóstico / motivo" v={x.diagnosis} wide />
                <F l="Autorización / remisión" v={x.authorizationNumber} />
                <F l="Profesional que recibe" v={x.receivingProfessional} />
                <F l="Acompañante" v={[x.companionName, x.companionPhone].filter(Boolean).join(' · ')} />
                {x.notes && <F l="Observaciones" v={x.notes} wide />}
              </div>
            </section>
          )
        })()}

        <section className="cy-section">
          <h3 className="cy-section-title">Kilometraje</h3>
          <div className="tr-km">
            <div><span>Km de salida</span><strong>{km(t.kmOut)}</strong></div>
            <div><span>Km de llegada</span><strong>{t.kmIn == null ? '—' : km(t.kmIn)}</strong></div>
            <div className="hl"><span>Diferencia (recorrido)</span><strong>{t.kmDiff == null ? '—' : km(t.kmDiff)}</strong></div>
          </div>
          <div className="cy-grid" style={{ marginTop: '4mm' }}>
            <div className="cy-field"><span className="cy-field-label">Hora de salida</span><span className="cy-field-value">{fmtTime(t.startedAt)}</span></div>
            <div className="cy-field"><span className="cy-field-label">Hora de llegada</span><span className="cy-field-value">{t.endedAt ? fmtTime(t.endedAt) : 'En curso'}</span></div>
            <div className="cy-field"><span className="cy-field-label">Duración</span><span className="cy-field-value">{duration(t.startedAt, t.endedAt)}</span></div>
            <div className="cy-field"><span className="cy-field-label">Combustible</span><span className="cy-field-value">{t.fuelValue ? `${money(t.fuelValue)}${t.fuelGallons ? ` · ${t.fuelGallons} gal` : ''}` : 'Sin tanqueo'}</span></div>
          </div>
        </section>

        <section className="cy-section cy-notes" style={{ gridTemplateColumns: '1fr' }}>
          <div><h3 className="cy-section-title">Observación</h3><p>{t.observation || '—'}</p></div>
        </section>

        {(t.tachometerPhoto || t.fuelTicketPhoto) && (
          <section className="cy-section">
            <h3 className="cy-section-title">Evidencias</h3>
            <div className="tr-evidence">
              {t.tachometerPhoto && <figure><figcaption>Tacómetro al llegar</figcaption><img src={t.tachometerPhoto} alt="Tacómetro" /></figure>}
              {t.fuelTicketPhoto && <figure><figcaption>Ticket de combustible</figcaption><img src={t.fuelTicketPhoto} alt="Ticket de combustible" /></figure>}
            </div>
          </section>
        )}

        <section className="cy-signatures" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <SignBlock doc={doc} slot="conductor" label="Conductor" name={t.driver.name} canSign={t.driver.id === user.id} />
          <SignBlock doc={doc} slot="reviso" label="Revisó · Dirección de Socorro y Operaciones" canSign={user.role === 'administrador'} />
        </section>

        <footer className="cy-sheet-footer">
          <span>{settings.ipsName} · Flota vehicular</span>
          <span>Impreso el {printedAt}</span>
        </footer>
      </article>

      {modal === 'close' && <CloseTripModal trip={t} onClose={() => setModal(null)} onClosed={(d) => { setT(d); setModal(null); toast('Actividad cerrada. Km actualizado en la móvil.') }} />}
      {modal === 'delete' && (
        <Modal title="Eliminar reporte" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button>
            <button type="button" className="btn btn-danger" onClick={async () => { try { await api.delete(`/vehiculos-reportes/${t.id}`); navigate('/socorro/vehiculos/reportes') } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) } }}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar el reporte <b>{t.code}</b>?{!open && ' Si es el último cerrado de la móvil, su kilometraje vuelve al km de salida.'}</p>
        </Modal>
      )}
      {toastNode}
    </div>
  )
}

export default TripDetail
