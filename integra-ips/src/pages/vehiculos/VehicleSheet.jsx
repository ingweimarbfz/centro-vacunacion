import React, { useEffect } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { km, money, dateLabel, PHOTO_SLOTS, MAINT_TYPE, DOC_TYPES } from './common'
import '../../components/cytology.css'

const F = ({ label, value }) => (
  <div className="cy-field"><span className="cy-field-label">{label}</span><span className="cy-field-value">{value || '—'}</span></div>
)
const docTone = (d) => (d.daysLeft < 0 ? 'bad' : d.daysLeft <= 30 ? 'warn' : 'ok')

// Hoja de vida imprimible del vehículo.
const VehicleSheet = ({ v, onBack }) => {
  const { logo, settings } = useSettings()
  const printedAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())
  useEffect(() => { const p = document.title; document.title = `Hoja_de_vida_Movil_${v.movil}`; return () => { document.title = p } }, [v.movil])
  const photos = PHOTO_SLOTS.filter(([s]) => v.photos[s])

  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={onBack}>← Volver</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>
      <article className="cy-sheet ev-sheet">
        <header className="cy-sheet-header">
          <img src={logo} alt={settings.ipsName} className="cy-logo" />
          <div className="cy-sheet-heading">
            <p className="cy-kicker">Operaciones Generales · Flota vehicular institucional</p>
            <h2>Hoja de vida del vehículo</h2>
          </div>
          <dl className="cy-meta">
            <div><dt>Móvil</dt><dd>{v.movil}</dd></div>
            <div><dt>Placa</dt><dd>{v.plate}</dd></div>
            <div><dt>Km actual</dt><dd>{km(v.currentKm)}</dd></div>
          </dl>
        </header>

        <div className="cy-patient-band ev-band">
          <div><span className="cy-field-label">Vehículo</span><strong className="cy-patient-name">{v.brand} {v.line}</strong></div>
          <div><span className="cy-field-label">Tipo</span><strong>{v.vehicleType}</strong></div>
          <div><span className="cy-field-label">Estado</span><strong>{v.status === 'activo' ? 'Activo' : v.status === 'mantenimiento' ? 'En mantenimiento' : 'Fuera de servicio'}</strong></div>
        </div>

        <section className="cy-section">
          <h3 className="cy-section-title">Datos generales</h3>
          <div className="cy-grid">
            <F label="Año" value={v.modelYear} /><F label="Color" value={v.color} /><F label="Combustible" value={v.fuelType} /><F label="Condición" value={v.condition === 'nuevo' ? 'Nuevo (0 km)' : 'Usado'} />
            <F label="Serial / VIN" value={v.serial} /><F label="N° de motor" value={v.engineNumber} /><F label="Fecha de compra" value={dateLabel(v.purchaseDate)} /><F label="Km inicial" value={km(v.initialKm)} />
            <div className="cy-field cy-field-wide"><span className="cy-field-label">Propietario</span><span className="cy-field-value">{v.owner || '—'}</span></div>
            <F label="Km recorridos" value={km(v.totals.kmTraveled)} /><F label="Gasto mantenimiento" value={money(v.totals.maintenance)} />
          </div>
        </section>

        {photos.length > 0 && (
          <section className="cy-section">
            <h3 className="cy-section-title">Registro fotográfico</h3>
            <div className="vs-photos">
              {photos.map(([s, label]) => <figure key={s}><img src={v.photos[s]} alt={label} /><figcaption>{label}</figcaption></figure>)}
            </div>
          </section>
        )}

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">SOAT y documentos</h3>
          {v.documents.length === 0 ? <p className="ev-empty">Sin documentos.</p> : (
            <table className="ev-table">
              <thead><tr><th>Documento</th><th>Aseguradora</th><th>N° póliza</th><th>Compra</th><th>Vence</th><th>Precio</th><th>Estado</th></tr></thead>
              <tbody>{v.documents.map((d) => (
                <tr key={d.id}><td><b>{DOC_TYPES[d.docType]}</b></td><td>{d.entity || '—'}</td><td>{d.number || '—'}</td><td>{dateLabel(d.purchaseDate)}</td><td>{dateLabel(d.expiryDate)}</td><td>{money(d.price)}</td>
                  <td><span className={`badge ${docTone(d)}`}>{d.daysLeft < 0 ? 'Vencido' : d.daysLeft <= 30 ? `${d.daysLeft} días` : 'Vigente'}</span></td></tr>
              ))}</tbody>
            </table>
          )}
        </section>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Mantenimientos</h3>
          {v.maintenances.length === 0 ? <p className="ev-empty">Sin mantenimientos.</p> : (
            <table className="ev-table">
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Trabajo / repuestos</th><th>Km</th><th>Realizó / conductor</th><th>Total</th><th>Próximo</th></tr></thead>
              <tbody>{v.maintenances.map((m) => (
                <tr key={m.id}>
                  <td>{dateLabel(m.date)}</td><td><span className={`badge ${MAINT_TYPE[m.type][1]}`}>{MAINT_TYPE[m.type][0]}</span></td>
                  <td><b>{m.description}</b>{m.parts.length > 0 && <div className="vs-parts">{m.parts.map((p) => `${p.quantity}× ${p.name} (${money(p.unitPrice)})`).join(' · ')}</div>}{m.workshop && <div className="vs-parts">Taller: {m.workshop}</div>}</td>
                  <td>{km(m.km)}</td><td>{m.technician || '—'}{m.driver && <div className="vs-parts">Llevó: {m.driver.name}</div>}</td><td><b>{money(m.total)}</b></td>
                  <td>{m.type === 'preventivo' ? `${dateLabel(m.nextDueDate)}${m.nextDueKm ? ` / ${km(m.nextDueKm)}` : ''}` : '—'}</td>
                </tr>
              ))}</tbody>
            </table>
          )}
        </section>

        <footer className="cy-sheet-footer">
          <span>{settings.ipsName} · Hoja de vida Móvil {v.movil}</span>
          <span>Impreso el {printedAt}</span>
        </footer>
      </article>
    </div>
  )
}

export default VehicleSheet
