import React, { useEffect } from 'react'
import { useSettings } from '../../context/SettingsContext'
import { useAuth } from '../../context/AuthContext'
import { SignBlock, useDocSignatures } from '../../components/signature'
import { CONTRACT_STATUS, DOC_TYPE_LABELS, SEX, StatusBadge, fmt, printedAt, useCatalogs } from './common'
import FormatHeader from './FormatHeader'
import '../../components/cytology.css'

const F = ({ label, value, wide }) => (
  <div className={`cy-field${wide ? ' cy-field-wide' : ''}`}><span className="cy-field-label">{label}</span><span className="cy-field-value">{value || '—'}</span></div>
)
export const isSelf = (staff, user) => (staff.userId && staff.userId === user.id) || (staff.document && staff.document === user.identification)

// Hoja de vida imprimible del profesional (estándar de talento humano). El logo es el que se carga en Configuración.
const StaffSheet = ({ staff: s, onBack }) => {
  const { settings } = useSettings()
  const { user } = useAuth()
  const cat = useCatalogs()
  const doc = useDocSignatures('th_hoja_vida', s.id)
  useEffect(() => { const p = document.title; document.title = `Hoja_de_vida_${s.document}`; return () => { document.title = p } }, [s.document])
  const c = s.compliance
  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={onBack}>← Volver</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>
      <article className="cy-sheet ev-sheet">
        <FormatHeader format={cat?.formats?.hoja_vida} title="Hoja de vida del profesional" extra={<span>{s.documentType} {s.document}</span>} />

        <div className="cy-patient-band ev-band">
          <div><span className="cy-field-label">Nombre</span><strong className="cy-patient-name">{s.fullName}</strong><span className="ev-sub">{s.profession || '—'}</span></div>
          <div><span className="cy-field-label">Cargo</span><strong>{s.positionName || 'Sin cargo'}</strong></div>
          <div><span className="cy-field-label">Estado · cumplimiento</span><strong>{s.statusLabel} · {c.percent}%</strong></div>
        </div>

        <section className="cy-section">
          <h3 className="cy-section-title">Datos personales</h3>
          <div className="cy-grid" style={{ gridTemplateColumns: s.photoUrl ? 'repeat(3, minmax(0,1fr)) 30mm' : undefined }}>
            <F label="Tipo de documento" value={DOC_TYPE_LABELS[s.documentType]} />
            <F label="Fecha de nacimiento" value={fmt(s.birthDate)} />
            <F label="Sexo / RH" value={[SEX[s.sex], s.bloodType].filter(Boolean).join(' · ')} />
            {s.photoUrl && <img src={s.photoUrl} alt={s.fullName} className="eq-sheet-photo" style={{ gridRow: 'span 2' }} />}
            <F label="Teléfono" value={s.phone} />
            <F label="Correo" value={s.email} />
            <F label="Dirección" value={[s.address, s.city].filter(Boolean).join(', ')} />
            <F label="Contacto de emergencia" value={[s.emergencyContact, s.emergencyPhone].filter(Boolean).join(' · ')} />
          </div>
        </section>

        <section className="cy-section">
          <h3 className="cy-section-title">Vinculación, formación y habilitación legal</h3>
          <div className="cy-grid">
            <F label="Servicio asignado" value={s.assignedService} />
            <F label="Especialidad" value={s.specialty} />
            <F label="Fecha de ingreso" value={fmt(s.hireDate)} />
            <F label="Nivel máximo de formación" value={s.educationLevel} />
            <F label="Título obtenido" value={s.degreeTitle} />
            <F label="Institución / año" value={[s.institution, s.graduationYear].filter(Boolean).join(' · ')} />
            <F label="Nº tarjeta profesional" value={s.professionalCard} />
            <F label="ReTHUS" value={s.rethus} />
            <F label="Verificación ReTHUS" value={fmt(s.rethusVerifiedAt)} />
            <F label="EPS" value={s.eps} />
            <F label="ARL" value={s.arl} />
            <F label="Fondo de pensiones" value={s.pensionFund} />
            <F label="Fondo de cesantías" value={s.severanceFund} />
          </div>
        </section>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Estándar por cada profesional</h3>
          <table className="ev-table">
            <thead><tr><th>Documento</th><th>Estado</th><th>Vencimiento</th></tr></thead>
            <tbody>{c.items.filter((i) => i.folder).map((i) => (
              <tr key={i.requirementTypeId}><td><b>{i.name}</b></td><td><StatusBadge status={i.status} /></td><td>{i.expiryDate ? fmt(i.expiryDate) : '—'}</td></tr>
            ))}</tbody>
          </table>
        </section>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Contratos</h3>
          {s.contracts.length === 0 ? <p className="ev-empty">Sin contratos registrados.</p> : (
            <table className="ev-table">
              <thead><tr><th>Tipo</th><th>N°</th><th>Cargo / objeto</th><th>Inicio</th><th>Terminación</th><th>Estado</th></tr></thead>
              <tbody>{s.contracts.map((k) => (
                <tr key={k.id}><td>{k.contractTypeLabel}</td><td>{k.number || '—'}</td><td>{k.positionName || '—'}</td><td>{fmt(k.startDate)}</td><td>{k.endDate ? fmt(k.endDate) : 'Indefinido'}</td><td><StatusBadge status={k.status} map={CONTRACT_STATUS} /></td></tr>
              ))}</tbody>
            </table>
          )}
        </section>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Formación, cursos y soportes</h3>
          {s.documents.length === 0 ? <p className="ev-empty">Sin soportes cargados.</p> : (
            <table className="ev-table">
              <thead><tr><th>Soporte</th><th>Categoría</th><th>Entidad</th><th>Expedición</th><th>Vencimiento</th><th>Estado</th></tr></thead>
              <tbody>{s.documents.map((d) => (
                <tr key={d.id}><td><b>{d.name}</b>{d.hours ? <div className="vs-parts">{d.hours} horas</div> : null}</td><td>{d.categoryLabel}</td><td>{d.issuer || '—'}</td><td>{fmt(d.issueDate)}</td><td>{d.expires ? fmt(d.expiryDate) : 'No vence'}</td><td><StatusBadge status={d.status} /></td></tr>
              ))}</tbody>
            </table>
          )}
          {c.items.some((i) => i.status === 'faltante') && <p className="ev-complete">Requisitos obligatorios sin soporte: <b style={{ marginLeft: 4 }}>{c.items.filter((i) => i.status === 'faltante').map((i) => i.name).join(', ')}</b></p>}
        </section>

        {s.notes && <section className="cy-section cy-notes"><div><h3 className="cy-section-title">Observaciones</h3><p>{s.notes}</p></div></section>}

        <section className="cy-signatures" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <SignBlock doc={doc} slot="profesional" label="Firma del profesional" name={s.fullName} canSign={isSelf(s, user)} />
          <SignBlock doc={doc} slot="talento_humano" label={`Talento humano · ${settings.shortName}`} canSign={['administrador', 'empleado'].includes(user.role)} />
        </section>

        <footer className="cy-sheet-footer">
          <span>{settings.ipsName} · Hoja de vida {s.documentType} {s.document}</span>
          <span>Impreso el {printedAt()}</span>
        </footer>
      </article>
    </div>
  )
}

export default StaffSheet
