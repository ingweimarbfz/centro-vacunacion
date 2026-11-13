import React, { useEffect } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { money, dateLabel } from '../vehiculos/common'
import { CATEGORY, STATUS, RESPONSIBLE, RESULT, daysFromToday } from './common'
import '../../components/cytology.css'
import { useAuth } from '../../context/AuthContext'
import { SignBlock, useDocSignatures } from '../../components/signature'

const F = ({ label, value, wide }) => (
  <div className={`cy-field${wide ? ' cy-field-wide' : ''}`}><span className="cy-field-label">{label}</span><span className="cy-field-value">{value || '—'}</span></div>
)

// Hoja de vida imprimible del equipo.
const EquipmentSheet = ({ eq, onBack }) => {
  const { logo, settings } = useSettings()
  const { user } = useAuth()
  const doc = useDocSignatures('equipo', eq.id)
  const printedAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())
  useEffect(() => { const p = document.title; document.title = `Hoja_de_vida_${eq.code}`; return () => { document.title = p } }, [eq.code])
  const [statusLabel, statusTone] = STATUS[eq.status]
  const next = daysFromToday(eq.nextPreventive)
  const warranty = daysFromToday(eq.warrantyUntil)

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
            <p className="cy-kicker">{settings.shortName} · Equipos e infraestructura</p>
            <h2>Hoja de vida del equipo</h2>
          </div>
          <dl className="cy-meta">
            <div><dt>Código</dt><dd>{eq.code}</dd></div>
            <div><dt>Área</dt><dd>{eq.area || '—'}</dd></div>
            <div><dt>Estado</dt><dd><span className={`badge ${statusTone}`}>{statusLabel}</span></dd></div>
          </dl>
        </header>

        <div className="cy-patient-band ev-band">
          <div><span className="cy-field-label">Equipo</span><strong className="cy-patient-name">{eq.name}</strong><span className="ev-sub">{CATEGORY[eq.category][0]}</span></div>
          <div><span className="cy-field-label">Marca / modelo</span><strong>{[eq.brand, eq.model].filter(Boolean).join(' ') || '—'}</strong></div>
          <div><span className="cy-field-label">Serial</span><strong style={{ fontFamily: 'monospace' }}>{eq.serial || '—'}</strong></div>
        </div>

        <section className="cy-section">
          <h3 className="cy-section-title">Identificación y adquisición</h3>
          <div className="cy-grid" style={{ gridTemplateColumns: eq.photo ? 'repeat(3, minmax(0,1fr)) 38mm' : undefined }}>
            <F label="Proveedor" value={eq.supplier} />
            <F label="Fecha de compra" value={dateLabel(eq.purchaseDate)} />
            <F label="Valor de compra" value={eq.purchasePrice != null ? money(eq.purchasePrice) : null} />
            {eq.photo && <img src={eq.photo} alt={eq.name} className="eq-sheet-photo" />}
            {eq.category === 'biomedico' && <><F label="Registro INVIMA" value={eq.invima} /><F label="Clase de riesgo" value={eq.riskClass} /></>}
            <div className="cy-field"><span className="cy-field-label">Garantía hasta</span><span className="cy-field-value">{dateLabel(eq.warrantyUntil)} {eq.warrantyUntil && <span className={`badge ${warranty < 0 ? '' : warranty <= 30 ? 'warn' : 'ok'}`}>{warranty < 0 ? 'Vencida' : warranty <= 30 ? `${warranty} días` : 'Vigente'}</span>}</span></div>
            <F label="Stock" value={`${eq.quantity} unidad${eq.quantity === 1 ? '' : 'es'}${eq.minQuantity ? ` (mín. ${eq.minQuantity})` : ''}`} />
            <F label="Frecuencia preventivo" value={eq.maintenanceMonths ? `Cada ${eq.maintenanceMonths} meses` : 'Sin plan'} />
            <div className="cy-field"><span className="cy-field-label">Próximo preventivo</span><span className="cy-field-value">{dateLabel(eq.nextPreventive)} {eq.nextPreventive && <span className={`badge ${next < 0 ? 'bad' : next <= 15 ? 'warn' : 'ok'}`}>{next < 0 ? 'Vencido' : `${next} días`}</span>}</span></div>
          </div>
        </section>

        <section className="cy-section cy-notes" style={{ gridTemplateColumns: eq.notes ? '1fr 1fr' : '1fr' }}>
          <div><h3 className="cy-section-title">Ficha técnica</h3><p>{eq.technicalSpecs || '—'}</p></div>
          {eq.notes && <div><h3 className="cy-section-title">Observaciones</h3><p>{eq.notes}</p></div>}
        </section>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Historial de mantenimientos</h3>
          {eq.maintenances.length === 0 ? <p className="ev-empty">Sin mantenimientos registrados.</p> : (
            <table className="ev-table">
              <thead><tr><th>Fecha</th><th>Tipo</th><th>Trabajo / repuestos</th><th>Responsable</th><th>Costo</th><th>Resultado</th></tr></thead>
              <tbody>{eq.maintenances.map((m) => (
                <tr key={m.id}>
                  <td>{dateLabel(m.date)}{m.reportNumber && <div className="vs-parts">{m.reportNumber}</div>}</td>
                  <td><span className={`badge ${m.type === 'preventivo' ? 'info' : 'warn'}`}>{m.type === 'preventivo' ? 'Preventivo' : 'Correctivo'}</span></td>
                  <td><b>{m.description}</b>{m.parts.length > 0 && <div className="vs-parts">{m.parts.map((p) => `${p.quantity}× ${p.name} (${money(p.unitPrice)})`).join(' · ')}</div>}</td>
                  <td>{m.responsibleName}<div className="vs-parts">{RESPONSIBLE[m.responsibleType]}{m.company ? ` · ${m.company}` : ''}</div></td>
                  <td><b>{money(m.total)}</b></td>
                  <td><span className={`badge ${RESULT[m.result][1]}`}>{RESULT[m.result][0]}</span></td>
                </tr>
              ))}</tbody>
            </table>
          )}
          <p className="ev-complete">Costo total de mantenimiento: <b style={{ marginLeft: 4 }}>{money(eq.totals.maintenance)}</b></p>
        </section>

        <section className="cy-signatures" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <SignBlock doc={doc} slot="mantenimiento" label="Responsable de mantenimiento / biomédico" canSign={['administrador', 'empleado'].includes(user.role)} />
          <SignBlock doc={doc} slot="coordinacion" label={`Coordinación ${settings.shortName}`} canSign={['administrador', 'empleado'].includes(user.role)} />
        </section>

        <footer className="cy-sheet-footer">
          <span>{settings.ipsName} · Hoja de vida {eq.code}</span>
          <span>Impreso el {printedAt}</span>
        </footer>
      </article>
    </div>
  )
}

export default EquipmentSheet
