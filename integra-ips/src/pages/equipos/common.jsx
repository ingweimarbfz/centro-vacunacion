import React from 'react'
import { MdMonitorHeart, MdAcUnit, MdAir, MdElectricalServices, MdComputer, MdBed, MdDevicesOther } from 'react-icons/md'

export const CATEGORY = {
  biomedico: ['Biomédico', MdMonitorHeart],
  refrigeracion: ['Refrigeración / cadena de frío', MdAcUnit],
  climatizacion: ['Aire acondicionado', MdAir],
  electrico: ['Eléctrico / planta', MdElectricalServices],
  computo: ['Cómputo', MdComputer],
  mobiliario: ['Mobiliario clínico', MdBed],
  otro: ['Otro', MdDevicesOther]
}
export const STATUS = {
  operativo: ['Operativo', 'ok'],
  en_mantenimiento: ['En mantenimiento', 'warn'],
  fuera_servicio: ['Fuera de servicio', 'bad'],
  dado_de_baja: ['Dado de baja', '']
}
export const RESPONSIBLE = { taller: 'Taller / proveedor externo', biomedico: 'Ingeniero(a) biomédico(a)', interno: 'Personal interno' }
export const RESULT = { operativo: ['Queda operativo', 'ok'], requiere_seguimiento: ['Requiere seguimiento', 'warn'], fuera_servicio: ['Queda fuera de servicio', 'bad'] }

export const CategoryIcon = ({ category, ...rest }) => {
  const I = (CATEGORY[category] || CATEGORY.otro)[1]
  return <I {...rest} />
}
export const StatusBadge = ({ status }) => {
  const [l, t] = STATUS[status] || [status, '']
  return <span className={`badge ${t}`}><span className="dot" /> {l}</span>
}
export const daysFromToday = (iso) => {
  if (!iso) return null
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
  const u = (s) => { const [y, m, d] = s.slice(0, 10).split('-').map(Number); return Date.UTC(y, m - 1, d) }
  return Math.round((u(iso) - u(today)) / 86400000)
}
export const NextBadge = ({ date }) => {
  if (!date) return <span className="badge">Sin plan</span>
  const d = daysFromToday(date)
  if (d < 0) return <span className="badge bad">Vencido hace {-d} d</span>
  if (d <= 15) return <span className="badge warn">En {d} días</span>
  return <span className="badge ok">En {d} días</span>
}
export const WarrantyBadge = ({ date }) => {
  if (!date) return <span className="badge">Sin garantía</span>
  const d = daysFromToday(date)
  if (d < 0) return <span className="badge">Vencida</span>
  if (d <= 30) return <span className="badge warn">Vence en {d} d</span>
  return <span className="badge ok">Vigente</span>
}
