import React, { useEffect } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { fmtDate, fmtTime, duration, qty, STATE_LABELS, CATEGORY_LABELS, STATE_TONE, CATEGORY_TONE } from './common'
import '../../components/cytology.css'
import { useAuth } from '../../context/AuthContext'
import { SignBlock, SignCell, useDocSignatures } from '../../components/signature'

const Meta = ({ label, value }) => <div><dt>{label}</dt><dd>{value || '—'}</dd></div>

// Reporte imprimible: une el formato de salida de personal (GSO-F002) y el de control de materiales (GSO-F003).
const EventReport = ({ event: e, onBack }) => {
  const { logo, settings } = useSettings()
  const { user } = useAuth()
  const doc = useDocSignatures('evento', e.id)
  const printedAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())

  useEffect(() => {
    const prev = document.title
    document.title = `Reporte_${e.code}`
    return () => { document.title = prev }
  }, [e.code])

  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={onBack}>← Volver al evento</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>

      <article className="cy-sheet ev-sheet">
        <header className="cy-sheet-header">
          <img src={logo} alt={settings.ipsName} className="cy-logo" />
          <div className="cy-sheet-heading">
            <p className="cy-kicker">Operaciones Generales · {e.area === 'educacion' ? 'Educación' : 'Socorro'}</p>
            <h2>Reporte de evento / emergencia</h2>
            <p className="ev-formats">Salida de personal (CRCSC-GSO-F002) · Control de salida y entrega de materiales (CRCSC-GSO-F003)</p>
          </div>
          <dl className="cy-meta">
            <Meta label="Código" value={e.code} />
            <Meta label="Fecha" value={fmtDate(e.startedAt)} />
            <Meta label="Estado" value={e.status === 'en_curso' ? 'En curso' : 'Finalizado'} />
          </dl>
        </header>

        <div className="cy-patient-band ev-band">
          <div><span className="cy-field-label">{e.area === 'educacion' ? 'Actividad de educación' : 'Evento / emergencia'}</span><strong className="cy-patient-name">{e.name}</strong></div>
          <div><span className="cy-field-label">Lugar</span><strong>{e.place}</strong></div>
          <div><span className="cy-field-label">Coordinador</span><strong>{e.coordinator.fullName}</strong><span className="ev-sub">{e.coordinator.carnet || ''} · CC {e.coordinator.document}</span></div>
        </div>

        <section className="cy-section">
          <div className="cy-grid">
            <div className="cy-field"><span className="cy-field-label">Hora de inicio</span><span className="cy-field-value">{fmtTime(e.startedAt)}</span></div>
            <div className="cy-field"><span className="cy-field-label">Hora de terminación</span><span className="cy-field-value">{e.endedAt ? fmtTime(e.endedAt) : 'En curso'}</span></div>
            <div className="cy-field"><span className="cy-field-label">Duración</span><span className="cy-field-value">{duration(e.startedAt, e.endedAt)}</span></div>
            <div className="cy-field"><span className="cy-field-label">Personal</span><span className="cy-field-value">{e.personnel.length} personas</span></div>
          </div>
        </section>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Salida de personal</h3>
          <table className="ev-table">
            <thead><tr><th>No.</th><th>Nombres y apellidos</th><th>Documento</th><th>No. carnet</th><th>G. sanguíneo</th><th>Agrupación</th><th className="ev-sign">Firma</th></tr></thead>
            <tbody>
              {e.personnel.map((v, i) => (
                <tr key={v.id}><td>{i + 1}</td><td><b>{v.fullName}</b>{v.personId === e.coordinator.id ? ' (Coord.)' : ''}</td><td>{v.document}</td><td>{v.carnet || (v.userId ? v.roleLabel : '—')}</td><td>{v.bloodType || '—'}</td><td>{v.agrupacion || '—'}</td><td className="ev-sign"><SignCell doc={doc} slot={v.userId ? `usuario_${v.userId}` : `persona_${v.personId}`} canSign={v.userId ? v.userId === user.id : v.document === user.identification} who={v.fullName} /></td></tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Control de salida y entrega de materiales</h3>
          {e.materials.length === 0 ? <p className="ev-empty">Sin materiales.</p> : (
            <table className="ev-table">
              <thead><tr><th>Cant.</th><th>Elemento</th><th>Tipo</th><th>Regresó</th><th>Estado</th><th>Observación</th></tr></thead>
              <tbody>
                {e.materials.map((m) => (
                  <tr key={m.id}>
                    <td><b>{qty(m.quantity)}</b></td><td>{m.item.name}</td><td><span className={`badge ${CATEGORY_TONE[m.item.category]}`}>{CATEGORY_LABELS[m.item.category]}</span></td>
                    <td>{m.returned == null ? '—' : <span className={`badge ${m.returned === m.quantity ? 'ok' : 'bad'}`}>{qty(m.returned)} de {qty(m.quantity)}</span>}</td><td><span className={`badge ${STATE_TONE[m.state]}`}>{STATE_LABELS[m.state]}</span></td><td>{m.observation || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <p className="ev-complete">
            Al ingreso los materiales fueron entregados completos:
            <span className={e.materialsComplete === true ? 'on' : ''}>SÍ</span>
            <span className={e.materialsComplete === false ? 'on' : ''}>NO</span>
          </p>
        </section>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Insumos consumidos</h3>
          {e.supplies.length === 0 ? <p className="ev-empty">Sin consumos registrados.</p> : (
            <table className="ev-table">
              <thead><tr><th>Cant.</th><th>Insumo</th><th>Tipo</th><th>Unidad</th><th>Observación</th><th>Hora</th></tr></thead>
              <tbody>
                {e.supplies.map((s) => (
                  <tr key={s.id}><td><b>{qty(s.quantity)}</b></td><td>{s.item.name}</td><td><span className={`badge ${CATEGORY_TONE[s.item.category]}`}>{CATEGORY_LABELS[s.item.category]}</span></td><td>{s.item.unit}</td><td>{s.observation || '—'}</td><td>{fmtTime(s.createdAt)}</td></tr>
                ))}
              </tbody>
            </table>
          )}
        </section>

        <section className="cy-section cy-notes" style={{ gridTemplateColumns: '1fr' }}>
          <div>
            <h3 className="cy-section-title">Observación general</h3>
            <p>{e.generalObservation || '—'}</p>
          </div>
        </section>

        <section className="cy-signatures" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <SignBlock doc={doc} slot="coordinador" label="Coordinador · Entrega / recibe" name={e.coordinator.fullName} canSign={e.coordinator.document === user.identification} />
          <SignBlock doc={doc} slot="direccion" label="Dirección de Socorro y Operaciones" canSign={['administrador', 'empleado'].includes(user.role)} />
        </section>

        <footer className="cy-sheet-footer">
          <span>{settings.ipsName} · Gestión de Socorro y Operaciones</span>
          <span>Impreso el {printedAt}</span>
        </footer>
      </article>
    </div>
  )
}

export default EventReport
