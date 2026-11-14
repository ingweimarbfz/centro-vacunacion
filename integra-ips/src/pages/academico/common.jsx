// Académico ETDH · catálogos y piezas compartidas por las pantallas del módulo de Educación.
import React from 'react'

export const KINDS = { curso: 'Curso', diplomado: 'Diplomado', seminario: 'Seminario', carrera_tecnica: 'Carrera técnica', otro: 'Otro' }
export const CERT_TYPES = { tecnico_laboral: 'Técnico laboral por competencias', conocimientos_academicos: 'Conocimientos académicos', asistencia: 'Constancia de asistencia' }
export const MODALITIES = { presencial: 'Presencial', virtual: 'Virtual', mixta: 'Mixta' }
export const BILLING = { total: 'Valor total del programa', periodo: 'Por periodo (semestre)' }
export const SUBJECT_KINDS = { teorico: 'Teórico', practico: 'Práctico', teorico_practico: 'Teórico-práctico', practica_laboral: 'Práctica laboral' }
export const SHIFTS = { mañana: 'Mañana', tarde: 'Tarde', noche: 'Noche', fin_de_semana: 'Fin de semana', mixta: 'Mixta' }
export const GROUP_STATUS = { planeado: 'Planeado', en_curso: 'En curso', finalizado: 'Finalizado', cancelado: 'Cancelado' }
export const STUDENT_STATUS = { activo: 'Activo', inactivo: 'Inactivo', graduado: 'Graduado', retirado: 'Retirado' }
export const ENROLL_STATUS = { preinscrito: 'Preinscrito', matriculado: 'Matriculado', aplazado: 'Aplazado', retirado: 'Retirado', finalizado: 'Finalizado' }
export const DOC_TYPES = { CC: 'Cédula de ciudadanía', TI: 'Tarjeta de identidad', CE: 'Cédula de extranjería', PPT: 'Permiso por protección temporal', PA: 'Pasaporte', RC: 'Registro civil' }
export const EDUCATION_LEVELS = ['Primaria', 'Básica secundaria (9.º)', 'Bachiller', 'Técnico', 'Tecnólogo', 'Profesional', 'Posgrado']

const TONES = {
  planeado: 'info', en_curso: 'ok', finalizado: 'navy', cancelado: '',
  activo: 'ok', inactivo: '', graduado: 'navy', retirado: 'bad',
  preinscrito: 'info', matriculado: 'ok', aplazado: 'warn',
  vigente: 'ok', por_vencer: 'warn', vencido: 'bad', sin_registro: 'warn'
}
const LABELS = { ...GROUP_STATUS, ...STUDENT_STATUS, ...ENROLL_STATUS, vigente: 'Registro vigente', por_vencer: 'Registro por vencer', vencido: 'Registro vencido', sin_registro: 'Sin registro' }
export const StatusBadge = ({ status, label }) => status ? <span className={`badge ${TONES[status] ?? ''}`}><span className="dot" /> {label || LABELS[status] || status}</span> : null

// Valor de la matrícula: base menos el descuento (%) menos el aporte del convenio (igual que el backend).
export const liquidate = (base, pct, agreement) => Math.max(0, Math.round((Number(base || 0) - (Number(base || 0) * Number(pct || 0)) / 100 - Number(agreement || 0)) * 100) / 100)

// Periodo académico sugerido: año-semestre actual (2026-1 de enero a junio, 2026-2 de julio a diciembre).
export const currentAcademicPeriod = () => { const d = new Date(); return `${d.getFullYear()}-${d.getMonth() < 6 ? 1 : 2}` }

export const hoursLabel = (h) => `${Number(h || 0).toLocaleString('es-CO')} h`

// ---------------------------------------------------------------- Finanzas (fase 2)
export const PAY_METHODS = { efectivo: 'Efectivo', transferencia: 'Transferencia', tarjeta: 'Tarjeta', consignacion: 'Consignación', convenio: 'Pago del convenio', otro: 'Otro' }
export const AGREEMENT_KINDS = { empresa: 'Empresa', entidad_publica: 'Entidad pública', ips_practica: 'IPS de práctica', fundacion: 'Fundación / ONG', otro: 'Otro' }
const ACC = { paz_y_salvo: ['ok', 'Paz y salvo'], al_dia: ['info', 'Al día'], en_mora: ['bad', 'En mora'], pagada: ['ok', 'Pagada'], parcial: ['warn', 'Abono parcial'], vencida: ['bad', 'Vencida'], pendiente: ['', 'Pendiente'] }
export const AccountBadge = ({ state, label }) => state ? <span className={`badge ${ACC[state]?.[0] ?? ''}`}><span className="dot" /> {label || ACC[state]?.[1] || state}</span> : null
export const ContractBadge = ({ contract }) => {
  if (!contract) return null
  if (contract.signedAt) return <span className="badge ok"><span className="dot" /> Contrato firmado</span>
  return contract.required ? <span className="badge warn"><span className="dot" /> Contrato sin firmar</span> : <span className="badge"><span className="dot" /> Contrato opcional</span>
}
