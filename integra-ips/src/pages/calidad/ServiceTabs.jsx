import React, { createContext, useContext } from 'react'
import { MdBusiness, MdMedicalServices, MdSchool } from 'react-icons/md'

// Área del árbol de documentos: Calidad IPS (Doc. Generales, por servicio) o Educación (acreditación, por programa).
export const DocAreaContext = createContext({ area: 'calidad', base: '/estandares/doc-generales', generalLabel: 'Generales', scopeLabel: 'servicio', scopePlural: 'servicios', title: 'Doc. Generales', allLabel: 'toda la IPS' })
export const useDocArea = () => useContext(DocAreaContext)

export const serviceLabel = (services = [], value, generalLabel = 'Generales') => (value === 'general' ? generalLabel : services.find((s) => String(s.id) === String(value))?.name || 'Servicio')

// Selector del árbol de documentos: generales de la IPS o el de cada servicio habilitado.
// allValue: opción extra "Todos" (para el dashboard).
const ServiceTabs = ({ services = [], value, onChange, allValue }) => {
  const { generalLabel, area } = useDocArea()
  const Icon = area === 'educacion' ? MdSchool : MdMedicalServices
  return (
  <div className="qd-services" role="tablist" aria-label="Servicio">
    {allValue && <button type="button" role="tab" aria-selected={value === allValue} className={value === allValue ? 'on' : ''} onClick={() => onChange(allValue)}>Todos</button>}
    <button type="button" role="tab" aria-selected={value === 'general'} className={value === 'general' ? 'on' : ''} onClick={() => onChange('general')}><MdBusiness /> {generalLabel}</button>
    {services.map((s) => (
      <button key={s.id} type="button" role="tab" aria-selected={String(value) === String(s.id)} className={String(value) === String(s.id) ? 'on' : ''} onClick={() => onChange(String(s.id))}><Icon /> {s.name}</button>
    ))}
  </div>
  )
}

export default ServiceTabs
