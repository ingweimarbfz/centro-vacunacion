// Reglas de validación comunes (las mismas del servidor en validate.js del backend).
// Teléfonos de Colombia: celulares (3xx) y fijos (60x) tienen 10 dígitos.
export const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i
const NUMERIC_DOCS = ['CC', 'TI', 'RC', 'NUIP', 'CN', 'NIT', 'Cédula de ciudadanía', 'Tarjeta de identidad', 'Registro civil']
export const isNumericDoc = (type) => NUMERIC_DOCS.includes(type)

// Limpian lo que se escribe o se pega.
export const sanitize = {
  phone: (v) => String(v ?? '').replace(/\D/g, '').slice(0, 10),
  doc: (v, type) => (isNumericDoc(type) ? String(v ?? '').replace(/\D/g, '').slice(0, 11) : String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 16)),
  nit: (v) => { const [base, ...dv] = String(v ?? '').replace(/[^\d-]/g, '').split('-'); return base.slice(0, 10) + (dv.length ? `-${dv.join('').slice(0, 1)}` : '') },
  plate: (v) => String(v ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6),
  email: (v) => String(v ?? '').trim()
}

// Devuelven el mensaje de error o '' si el valor es válido (vacío también es válido: lo obligatorio se revisa aparte).
export const check = {
  phone: (v) => (v && !/^\d{10}$/.test(v) ? 'Debe tener 10 dígitos' : ''),
  email: (v) => (v && !EMAIL_RE.test(v.trim()) ? 'Escribe un correo válido, como nombre@correo.com' : ''),
  doc: (v, type) => (!v ? '' : isNumericDoc(type) ? (/^\d{4,11}$/.test(v) ? '' : 'Solo números, entre 4 y 11') : (/^[A-Z0-9]{4,16}$/.test(v) ? '' : 'Solo letras y números, entre 4 y 16')),
  nit: (v) => (v && !/^\d{6,10}(-\d)?$/.test(v) ? 'Entre 6 y 10 dígitos; el dígito de verificación va después del guion (900123456-7)' : ''),
  plate: (v) => (v && !/^[A-Z]{3}\d{2}[A-Z\d]$/.test(v) ? 'Formato ABC123 (o ABC12D para motos)' : '')
}
