import React, { useEffect } from 'react'
import { useSettings } from '../context/SettingsContext'
import { formatDate, formatMoney, orDash } from '../utils/format'
import './cytology.css'
import { useAuth } from '../context/AuthContext'
import { SignBlock, useDocSignatures } from './signature'
const norm = (t) => String(t || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()


const CERVIX_OPTIONS = [
  ['sano', 'Sano'], ['normal', 'Normal'], ['cupula', 'Cúpula'], ['tomaVaginal', 'Toma vaginal'],
  ['endoCerrado', 'Endo cerrado'], ['polipo', 'Pólipo'], ['quistes', 'Quistes'], ['lecorrea', 'Leucorrea'],
  ['sangra', 'Sangra'], ['erosionado', 'Erosionado'], ['sinEspecificar', 'Sin especificar']
]

const Field = ({ label, value, wide }) => (
  <div className={`cy-field${wide ? ' cy-field-wide' : ''}`}>
    <span className="cy-field-label">{label}</span>
    <span className="cy-field-value">{orDash(value)}</span>
  </div>
)

const Section = ({ title, children, className = '' }) => (
  <section className={`cy-section ${className}`}>
    <h3 className="cy-section-title">{title}</h3>
    <div className="cy-grid">{children}</div>
  </section>
)

const CytologyDetail = ({ data: c, onBack }) => {
  const { logo, settings } = useSettings()
  const { user } = useAuth()
  const doc = useDocSignatures('citologia', c.id)
  const patient = `${c.nombre || ''} ${c.apellidos || ''}`.trim()

  // El nombre del archivo PDF sugerido toma el título del documento.
  useEffect(() => {
    const previous = document.title
    document.title = `Citologia_${c.numDocumento || ''}_${c.fechaExamen || ''}`
    return () => { document.title = previous }
  }, [c.numDocumento, c.fechaExamen])

  const printedAt = new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' }).format(new Date())

  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={onBack}>← Volver a resultados</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>

      <article className="cy-sheet">
        <header className="cy-sheet-header">
          <img src={logo} alt={settings.ipsName} className="cy-logo" />
          <div className="cy-sheet-heading">
            <p className="cy-kicker">{settings.shortName}</p>
            <h2>Toma de muestra de citología cervicouterina</h2>
          </div>
          <dl className="cy-meta">
            <div><dt>Fecha examen</dt><dd>{formatDate(c.fechaExamen)}</dd></div>
            <div><dt>N° lámina</dt><dd>{orDash(c.numLamina)}</dd></div>
            <div><dt>Factura N°</dt><dd>{c.numFactura || 'Por facturar'}</dd></div>
          </dl>
        </header>

        <div className="cy-patient-band">
          <div>
            <span className="cy-field-label">Paciente</span>
            <strong className="cy-patient-name">{patient || '—'}</strong>
          </div>
          <div>
            <span className="cy-field-label">{c.tipoDocumento || "Documento"}</span>
            <strong>{orDash(c.numDocumento)}</strong>
          </div>
          <div>
            <span className="cy-field-label">Edad</span>
            <strong>{c.edad != null ? `${c.edad} años` : '—'}</strong>
          </div>
        </div>

        <Section title="Información general">
          <Field label="Fecha de nacimiento" value={formatDate(c.fechaNacimiento)} />
          <Field label="Lugar de expedición" value={c.lugarExped} />
          <Field label="Estado civil" value={c.estadoCivil} />
          <Field label="Ocupación" value={c.ocupacion} />
          <Field label="Dirección" value={c.direccion} />
          <Field label="Municipio" value={c.municipio} />
          <Field label="Celular" value={c.celular} />
          <Field label="Correo electrónico" value={c.email} wide />
          <Field label="Solicitud del servicio" value={c.solicitudServ} />
        </Section>

        <Section title="Afiliación y facturación">
          <Field label="Entidad" value={c.entidad} />
          <Field label="EPS" value={c.eps} />
          <Field label="Régimen" value={c.regimen} />
          {c.discountName
            ? <><Field label="Valor base" value={formatMoney(c.valorBase)} /><Field label={`Descuento · ${c.discountName}`} value={`− ${formatMoney(c.discountAmount)}`} /><Field label="Valor pagado" value={formatMoney(c.valor)} /></>
            : <Field label="Valor" value={formatMoney(c.valor)} />}
        </Section>

        <Section title="Contacto de emergencia">
          <Field label="Nombre" value={c.contacto} />
          <Field label="Dirección" value={c.direccionContacto} />
          <Field label="Celular" value={c.celularContacto} />
        </Section>

        <Section title="Información gineco-obstétrica">
          <Field label="Ciclos menstruales" value={c.ciclosMenstruales} />
          <Field label="FUR" value={c.fur} />
          <Field label="FUP" value={c.fup} />
          <div className="cy-field cy-gpa">
            <span className="cy-field-label">G · P · A</span>
            <span className="cy-field-value">{orDash(c.g)} · {orDash(c.p)} · {orDash(c.a)}</span>
          </div>
          <Field label="Anticonceptivo actual" value={c.anticonceptivoActual} />
          <Field label="Tiempo" value={c.tiempo} />
          <Field label="Edad 1ª relación sexual" value={c.edadPrimerCoito} />
          <Field label="Tomada en" value={c.tomadaEn} />
          <Field label="Resultado última citología" value={c.resultUltCitolog} wide />
          <Field label="Fecha última citología" value={formatDate(c.fechaUltCitolog)} />
        </Section>

        <section className="cy-section">
          <h3 className="cy-section-title">Aspecto del cuello</h3>
          <ul className="cy-checks">
            {CERVIX_OPTIONS.map(([key, label]) => (
              <li key={key} className={c[key] ? 'is-on' : ''}>
                <span className="cy-box" aria-hidden="true">{c[key] ? '✓' : ''}</span>
                {label}
              </li>
            ))}
          </ul>
        </section>

        <section className="cy-section cy-notes">
          <div>
            <h3 className="cy-section-title">Tratamientos</h3>
            <p>{orDash(c.tratamientos)}</p>
          </div>
          <div>
            <h3 className="cy-section-title">Observaciones</h3>
            <p>{orDash(c.observaciones)}</p>
          </div>
        </section>

        <section className="cy-signatures">
          <SignBlock doc={doc} slot="elabora" label="Elaboró historia" name={orDash(c.elabora)} canSign={norm(c.elabora) === norm(user.fullName)} />
          <SignBlock doc={doc} slot="toma_muestra" label="Tomó la muestra" name={orDash(c.tomaMuestra)} canSign={norm(c.tomaMuestra) === norm(user.fullName)} />
          <div className="cy-received">
            <span className="cy-field-label">Fecha recibido</span>
            <strong>{formatDate(c.fechaRecibido)}</strong>
          </div>
        </section>

        <footer className="cy-sheet-footer">
          <span>Documento confidencial con datos de salud (Ley 1581 de 2012).</span>
          <span>Impreso el {printedAt}</span>
        </footer>
      </article>
    </div>
  )
}

export default CytologyDetail
