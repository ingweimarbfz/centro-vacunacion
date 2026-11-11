// 'YYYY-MM-DD' -> 'DD/MM/YYYY' sin desfases de zona horaria.
export const formatDate = (value) => {
  if (!value) return '—'
  const [y, m, d] = String(value).slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : String(value)
}

export const formatMoney = (value) =>
  value === null || value === undefined || value === ''
    ? '—'
    : new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(value)

export const orDash = (value) => (value === null || value === undefined || value === '' ? '—' : value)
