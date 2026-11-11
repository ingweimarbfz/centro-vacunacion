import React from 'react'

// Datos del traslado asistencial (ambulancias TAB/TAM).
export const DOC_TYPES = { CC: 'Cédula de ciudadanía', TI: 'Tarjeta de identidad', RC: 'Registro civil', CE: 'Cédula de extranjería', PA: 'Pasaporte', PPT: 'Permiso por protección temporal', MS: 'Menor sin identificación', AS: 'Adulto sin identificación' }
export const REGIMES = { contributivo: 'Contributivo', subsidiado: 'Subsidiado', especial: 'Especial / excepción', particular: 'Particular', soat: 'SOAT (accidente de tránsito)', otro: 'Otro' }
export const PRIORITIES = { urgente: ['Urgente', 'bad'], prioritario: ['Prioritario', 'warn'], programado: ['Programado', 'ok'] }
export const TRANSFER_TYPES = { primario: 'Primario (desde el sitio del evento)', secundario: 'Secundario (entre IPS / remisión)' }
export const CONDITIONS = { estable: 'Estable', inestable: 'Inestable', critico: 'Crítico' }
export const SEX = { F: 'Femenino', M: 'Masculino', I: 'Indeterminado' }

export const EMPTY_TRANSFER = {
  patientName: '', documentType: 'CC', document: '', sex: '', ageYears: '', phone: '', eps: '', regime: '', transferType: '', priority: '',
  origin: '', destination: '', diagnosis: '', patientCondition: '', companionName: '', companionPhone: '', authorizationNumber: '', receivingProfessional: '', notes: ''
}
const REQUIRED = [['patientName', 'nombre del paciente'], ['document', 'identificación'], ['eps', 'EPS'], ['regime', 'régimen'], ['transferType', 'tipo de traslado'], ['priority', 'prioridad'], ['origin', 'origen'], ['destination', 'destino'], ['diagnosis', 'diagnóstico o motivo']]
export const missingTransfer = (t) => REQUIRED.filter(([k]) => !String(t[k] || '').trim()).map(([, l]) => l)

const Sel = ({ label, req, value, onChange, options }) => (
  <div className="field"><label>{label} {req && <span className="req">*</span>}</label>
    <select value={value} onChange={onChange}><option value="">Selecciona…</option>{Object.entries(options).map(([k, l]) => <option key={k} value={k}>{Array.isArray(l) ? l[0] : l}</option>)}</select></div>
)

export const TransferFields = ({ value, onChange }) => {
  const set = (k) => (e) => onChange({ ...value, [k]: e.target.value })
  const txt = (k, label, req, props = {}) => <div className={`field${props.wide ? ' span-all' : ''}`}><label>{label} {req && <span className="req">*</span>}</label><input value={value[k]} onChange={set(k)} placeholder={props.placeholder} inputMode={props.inputMode} maxLength={props.maxLength} /></div>
  return (
    <div className="transfer-box">
      <p className="transfer-title">Paciente</p>
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        {txt('patientName', 'Nombre completo', true, { wide: true })}
        <Sel label="Tipo de documento" req value={value.documentType} onChange={set('documentType')} options={DOC_TYPES} />
        {txt('document', 'Número de identificación', true, { inputMode: 'numeric' })}
        <Sel label="Sexo" value={value.sex} onChange={set('sex')} options={SEX} />
        <div className="field"><label>Edad (años)</label><input type="number" min="0" max="120" value={value.ageYears} onChange={set('ageYears')} /></div>
        {txt('eps', 'EPS / aseguradora', true, { placeholder: 'Ej. Nueva EPS' })}
        <Sel label="Régimen" req value={value.regime} onChange={set('regime')} options={REGIMES} />
        {txt('phone', 'Teléfono del paciente', false, { inputMode: 'numeric', maxLength: 10 })}
        <Sel label="Condición del paciente" value={value.patientCondition} onChange={set('patientCondition')} options={CONDITIONS} />
      </div>
      <p className="transfer-title">Traslado</p>
      <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <Sel label="Tipo de traslado" req value={value.transferType} onChange={set('transferType')} options={TRANSFER_TYPES} />
        <Sel label="Prioridad" req value={value.priority} onChange={set('priority')} options={PRIORITIES} />
        {txt('origin', 'Origen (lugar de recogida)', true, { wide: true, placeholder: 'Dirección, vía o IPS remitente' })}
        {txt('destination', 'Destino (IPS receptora)', true, { wide: true })}
        <div className="field span-all"><label>Diagnóstico o motivo del traslado <span className="req">*</span></label><textarea value={value.diagnosis} onChange={set('diagnosis')} style={{ minHeight: 60 }} /></div>
        {txt('authorizationNumber', 'N.º de autorización / remisión')}
        {txt('receivingProfessional', 'Profesional que recibe')}
        {txt('companionName', 'Acompañante')}
        {txt('companionPhone', 'Teléfono del acompañante', false, { inputMode: 'numeric', maxLength: 10 })}
        {txt('notes', 'Observaciones del traslado', false, { wide: true })}
      </div>
    </div>
  )
}
