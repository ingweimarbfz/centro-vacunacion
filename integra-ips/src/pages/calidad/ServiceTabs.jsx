import React from 'react'
import { MdBusiness, MdMedicalServices } from 'react-icons/md'

export const serviceLabel = (services = [], value) => (value === 'general' ? 'Generales' : services.find((s) => String(s.id) === String(value))?.name || 'Servicio')

// Selector del árbol de documentos: generales de la IPS o el de cada servicio habilitado.
// allValue: opción extra "Todos" (para el dashboard).
const ServiceTabs = ({ services = [], value, onChange, allValue }) => (
  <div className="qd-services" role="tablist" aria-label="Servicio">
    {allValue && <button type="button" role="tab" aria-selected={value === allValue} className={value === allValue ? 'on' : ''} onClick={() => onChange(allValue)}>Todos</button>}
    <button type="button" role="tab" aria-selected={value === 'general'} className={value === 'general' ? 'on' : ''} onClick={() => onChange('general')}><MdBusiness /> Generales</button>
    {services.map((s) => (
      <button key={s.id} type="button" role="tab" aria-selected={String(value) === String(s.id)} className={String(value) === String(s.id) ? 'on' : ''} onClick={() => onChange(String(s.id))}><MdMedicalServices /> {s.name}</button>
    ))}
  </div>
)

export default ServiceTabs
