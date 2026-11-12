import React from 'react'
import InvoicePicker from './InvoicePicker'
import { MdSave, MdCheckCircle, MdErrorOutline, MdPerson, MdPhone, MdFemale, MdVisibility, MdAssignmentInd, MdReceipt } from 'react-icons/md'
import useRegisterCytology from '../hooks/useRegisterCytology'
import { regimenes, tipoDocumento, solicitudServicio, ocupacion, estadoCivil } from '../utils/dataGeneral'
import { formatDate, formatMoney } from '../utils/format'
import { PageHead, Card, Spinner } from './ui'
import './cytology.css'
import '../pages/facturacion/facturacion.css'

const CERVIX = [
  ['sano', 'Sano'], ['normal', 'Normal'], ['cupula', 'Cúpula'], ['tomaVaginal', 'Toma vaginal'],
  ['endoCerrado', 'Endo cerrado'], ['polipo', 'Pólipo'], ['quistes', 'Quistes'], ['lecorrea', 'Leucorrea'],
  ['sangra', 'Sangra'], ['erosionado', 'Erosionado'], ['sinEspecificar', 'Sin especificar']
]

const icon = (I) => <I style={{ color: 'var(--brand)' }} />

const RegisterCytology = () => {
  const {
    dataCytology: d, handleChange, handleOptionChange, InsertCytology,
    messageSuccess, messageCancel, errors, empleados, defaults, edad, saving, entities, epsList,
    billingOn, invoice, inv
  } = useRegisterCytology()
  const eps = epsList.find((x) => String(x.id) === String(d.epsId))
  const base = Number(defaults.valor) || 0

  // Campo de texto/fecha/número con etiqueta y error
  const F = ({ name, label, type = 'text', req, span, hint, ...rest }) => (
    <div className={`field${span ? ` ${span}` : ''}${errors[name] ? ' invalid' : ''}`}>
      <label htmlFor={name}>{label}{req && <span className="req"> *</span>}</label>
      <input id={name} name={name} type={type} value={d[name]} onChange={handleChange} {...rest} />
      {errors[name] ? <span className="error">{errors[name]}</span> : hint && <span className="hint">{hint}</span>}
    </div>
  )

  const S = ({ name, label, options, optKey, req, placeholder = 'Selecciona…' }) => (
    <div className={`field${errors[name] ? ' invalid' : ''}`}>
      <label htmlFor={name}>{label}{req && <span className="req"> *</span>}</label>
      <select id={name} name={name} value={d[name]} onChange={handleChange}>
        <option value="">{placeholder}</option>
        {options.map((o) => {
          const v = typeof o === 'string' ? o : o[optKey]
          return <option key={v} value={v}>{v}</option>
        })}
      </select>
      {errors[name] && <span className="error">{errors[name]}</span>}
    </div>
  )

  const RO = ({ label, value, hint }) => (
    <div className="field">
      <label>{label}</label>
      <input value={value} readOnly tabIndex={-1} style={{ fontWeight: 600 }} />
      {hint && <span className="hint">{hint}</span>}
    </div>
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    InsertCytology()
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <PageHead title="Registrar citología" subtitle="Toma de muestra de citología cervicouterina">
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <><Spinner /> Guardando…</> : <><MdSave /> Registrar citología</>}</button>
      </PageHead>

      {messageSuccess && <div className="alert ok" style={{ marginBottom: 18 }}><MdCheckCircle /><span>{messageSuccess}</span></div>}
      {messageCancel && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{messageCancel}</span></div>}

      <div className="stack">
        {billingOn && <InvoicePicker inv={inv} serviceLabel="la citología" patientLabel="la paciente" error={errors.invoice} />}
        <Card title="Datos del examen" subtitle="La fecha y la lámina se asignan automáticamente" icon={icon(MdReceipt)}>
          <div className="form-grid">
            <RO label="Fecha del examen" value={formatDate(d.fechaExamen)} hint="Fecha actual" />
            <RO label="N° lámina" value={defaults.siguienteLamina} hint="Se asigna al guardar" />
            <RO label="Factura N°" value={invoice?.numFactura || (billingOn ? 'Elige la factura' : 'Por facturar')} hint={invoice ? 'Factura de la paciente' : 'Se toma de la factura'} />
            <RO label="Valor de la citología" value={invoice ? formatMoney(inv.unitValue) : defaults.valor !== '' ? formatMoney(base) : '—'} hint={invoice ? 'Según la factura' : 'Según el tarifario'} />
            <div className="field">
              <label htmlFor="entityId">Entidad</label>
              <select id="entityId" name="entityId" value={d.entityId} onChange={handleChange}><option value="">Selecciona…</option>{entities.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select>
              {!entities.length && <span className="hint">Créalas en Facturación → Proveedores y convenios</span>}
            </div>
            <div className="field">
              <label htmlFor="epsId">EPS</label>
              <select id="epsId" name="epsId" value={d.epsId} onChange={handleChange} disabled={Boolean(invoice)}><option value="">Particular / sin EPS</option>{epsList.map((x) => <option key={x.id} value={x.id}>{x.name}{x.agreementActive ? ' · convenio' : ''}</option>)}</select>
              {invoice ? <span className="hint">La de la factura {invoice.numFactura}</span> : eps && <span className="hint">{eps.agreementActive ? `Convenio vigente${eps.agreementNumber ? ` N° ${eps.agreementNumber}` : ''}` : 'Sin convenio vigente'}</span>}
            </div>
            {S({ name: 'regimen', label: 'Régimen', options: regimenes, optKey: 'regimen' })}
          </div>
        </Card>

        <Card title="Datos de la paciente" icon={icon(MdPerson)}>
          <div className="form-grid">
            {F({ name: 'nombre', label: 'Nombre(s)', req: true })}
            {F({ name: 'apellidos', label: 'Apellido(s)', req: true })}
            {S({ name: 'tipoDocumento', label: 'Tipo de documento', options: tipoDocumento, optKey: 'tipoDoc' })}
            {F({ name: 'numDocumento', label: 'N° documento', req: true, inputMode: 'numeric' })}
            {F({ name: 'lugarExped', label: 'Lugar de expedición' })}
            {F({ name: 'fechaNacimiento', label: 'Fecha de nacimiento', type: 'date', req: true, max: d.fechaExamen })}
            <RO label="Edad" value={edad === '' ? '' : `${edad} años`} hint="Se calcula con la fecha de nacimiento" />
            {S({ name: 'estadoCivil', label: 'Estado civil', options: estadoCivil, optKey: 'tipoEstadoCivil' })}
            {S({ name: 'ocupacion', label: 'Ocupación', options: ocupacion, optKey: 'tipoOcupacion' })}
            {S({ name: 'solicitudServ', label: 'Solicitud del servicio', options: solicitudServicio, optKey: 'tipoSolicitud' })}
          </div>
        </Card>

        <Card title="Contacto" icon={icon(MdPhone)}>
          <div className="form-grid">
            {F({ name: 'celular', label: 'Celular', type: 'tel', req: true, inputMode: 'numeric', maxLength: 10, placeholder: '10 dígitos' })}
            {F({ name: 'email', label: 'Correo electrónico', type: 'email', placeholder: 'nombre@correo.com' })}
            {F({ name: 'direccion', label: 'Dirección' })}
            {F({ name: 'municipio', label: 'Municipio' })}
            {F({ name: 'contacto', label: 'Contacto de emergencia' })}
            {F({ name: 'direccionContacto', label: 'Dirección del contacto' })}
            {F({ name: 'celularContacto', label: 'Celular del contacto', type: 'tel', inputMode: 'numeric', maxLength: 10, placeholder: '10 dígitos' })}
          </div>
        </Card>

        <Card title="Información gineco-obstétrica" icon={icon(MdFemale)}>
          <div className="form-grid">
            {F({ name: 'ciclosMenstruales', label: 'Ciclos menstruales' })}
            {F({ name: 'fur', label: 'FUR' })}
            {F({ name: 'fup', label: 'FUP' })}
            <div className="field">
              <label>G · P · A</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {['g', 'p', 'a'].map((k) => <input key={k} name={k} value={d[k]} onChange={handleChange} placeholder={k.toUpperCase()} aria-label={k.toUpperCase()} />)}
              </div>
            </div>
            {F({ name: 'anticonceptivoActual', label: 'Anticonceptivo actual' })}
            {F({ name: 'tiempo', label: 'Tiempo' })}
            {F({ name: 'edadPrimerCoito', label: 'Edad 1ª relación sexual' })}
            {F({ name: 'resultUltCitolog', label: 'Resultado última citología' })}
            {F({ name: 'fechaUltCitolog', label: 'Fecha última citología', type: 'date' })}
            {F({ name: 'tomadaEn', label: 'Tomada en' })}
            <div className="field span-all"><label htmlFor="tratamientos">Tratamientos</label><textarea id="tratamientos" name="tratamientos" value={d.tratamientos} onChange={handleChange} /></div>
            <div className="field span-all"><label htmlFor="observaciones">Observaciones</label><textarea id="observaciones" name="observaciones" value={d.observaciones} onChange={handleChange} /></div>
          </div>
        </Card>

        <Card title="Aspecto del cuello" icon={icon(MdVisibility)}>
          <div className="rc-checks">
            {CERVIX.map(([k, label]) => (
              <label key={k} className={`rc-check${d[k] ? ' on' : ''}`}>
                <input type="checkbox" name={k} checked={d[k]} onChange={handleOptionChange} /> {label}
              </label>
            ))}
          </div>
        </Card>

        <Card title="Responsables" icon={icon(MdAssignmentInd)}>
          <div className="form-grid">
            {S({ name: 'elabora', label: 'Elaboró historia', options: empleados.map((e) => e.fullName), req: true, placeholder: 'Selecciona un empleado' })}
            {S({ name: 'tomaMuestra', label: 'Tomó muestra', options: empleados.map((e) => e.fullName), req: true, placeholder: 'Selecciona un empleado' })}
          </div>
        </Card>

        <div className="form-actions" style={{ marginTop: 0 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <><Spinner /> Guardando…</> : <><MdSave /> Registrar citología</>}</button>
        </div>
      </div>
    </form>
  )
}

export default RegisterCytology
