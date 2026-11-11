import React from 'react'
import { MdSave, MdCheckCircle, MdErrorOutline, MdPerson, MdPhone, MdFemale, MdVisibility, MdAssignmentInd, MdReceipt } from 'react-icons/md'
import useRegisterCytology from '../hooks/useRegisterCytology'
import { entidades, regimenes, tipoDocumento, solicitudServicio, ocupacion, estadoCivil } from '../utils/dataGeneral'
import { formatDate, formatMoney } from '../utils/format'
import { PageHead, Card, Spinner } from './ui'
import './cytology.css'

const CERVIX = [
  ['sano', 'Sano'], ['normal', 'Normal'], ['cupula', 'Cúpula'], ['tomaVaginal', 'Toma vaginal'],
  ['endoCerrado', 'Endo cerrado'], ['polipo', 'Pólipo'], ['quistes', 'Quistes'], ['lecorrea', 'Leucorrea'],
  ['sangra', 'Sangra'], ['erosionado', 'Erosionado'], ['sinEspecificar', 'Sin especificar']
]

const icon = (I) => <I style={{ color: 'var(--brand)' }} />

const RegisterCytology = () => {
  const {
    dataCytology: d, handleChange, handleOptionChange, InsertCytology,
    messageSuccess, messageCancel, errors, empleados, defaults, edad, saving, discounts
  } = useRegisterCytology()
  const base = Number(defaults.valor) || 0
  const disc = d.applyDiscount ? discounts.find((x) => String(x.id) === String(d.discountId)) : null
  const discAmount = disc ? Math.min(base, disc.type === 'porcentaje' ? Math.round(base * disc.value / 100) : disc.value) : 0

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
        <Card title="Datos del examen" subtitle="La fecha, la lámina y la factura se asignan automáticamente" icon={icon(MdReceipt)}>
          <div className="form-grid">
            <RO label="Fecha del examen" value={formatDate(d.fechaExamen)} hint="Fecha actual" />
            <RO label="N° lámina" value={defaults.siguienteLamina} hint="Se asigna al guardar" />
            <RO label="Factura N°" value={defaults.siguienteFactura} hint="Se asigna al guardar" />
            <RO label="Valor de la citología" value={defaults.valor !== '' ? formatMoney(base) : '—'} hint="Se configura en Citologías → Configuración" />
            <div className="field">
              <label className="switch" style={{ marginTop: 22 }}><input type="checkbox" name="applyDiscount" checked={d.applyDiscount} onChange={(e) => { handleOptionChange(e); if (!e.target.checked) handleChange({ target: { name: 'discountId', value: '' } }) }} disabled={!discounts.length} /> Aplicar descuento</label>
              {!discounts.length && <span className="hint">No hay descuentos activos</span>}
            </div>
            {d.applyDiscount && (
              <div className={`field${errors.discountId ? ' invalid' : ''}`}>
                <label htmlFor="discountId">Descuento <span className="req">*</span></label>
                <select id="discountId" name="discountId" value={d.discountId} onChange={handleChange}>
                  <option value="">Selecciona…</option>
                  {discounts.map((x) => <option key={x.id} value={x.id}>{x.name} · {x.type === 'porcentaje' ? `${x.value}%` : formatMoney(x.value)}</option>)}
                </select>
                {errors.discountId ? <span className="error">{errors.discountId}</span> : disc && <span className="hint">Descuento de {formatMoney(discAmount)}</span>}
              </div>
            )}
            {disc && <RO label="Valor a pagar" value={formatMoney(base - discAmount)} hint={`${formatMoney(base)} − ${formatMoney(discAmount)}`} />}
            {S({ name: 'entidad', label: 'Entidad', options: entidades, optKey: 'entidad' })}
            {F({ name: 'eps', label: 'EPS' })}
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
            {F({ name: 'fechaRecibido', label: 'Fecha recibido', type: 'date' })}
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
