import React, { useEffect, useState } from 'react'
import api from '../../api/client'

export const TZ = 'America/Bogota'
export const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(new Date())
export const fmt = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')
export const printedAt = () => new Intl.DateTimeFormat('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: TZ }).format(new Date())

export const DOC_STATUS = { vigente: ['Vigente', 'ok'], por_vencer: ['Por vencer', 'warn'], vencido: ['Vencido', 'bad'], faltante: ['Faltante', 'bad'] }
export const CONTRACT_STATUS = { vigente: ['Vigente', 'ok'], por_vencer: ['Por vencer', 'warn'], vencido: ['Vencido', 'bad'], sin_contrato: ['Sin contrato', ''] }
export const CHECK_VALUES = { cumple: ['Cumple', 'ok'], no_cumple: ['No cumple', 'bad'], no_aplica: ['No aplica', ''] }
export const DOC_TYPE_LABELS = { CC: 'Cédula de ciudadanía', CE: 'Cédula de extranjería', PA: 'Pasaporte', PPT: 'Permiso por protección temporal', TI: 'Tarjeta de identidad' }
export const SEX = { F: 'Femenino', M: 'Masculino', I: 'Intersexual' }
export const BLOOD = ['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-']

export const StatusBadge = ({ status, map = DOC_STATUS, days }) => {
  const [label, tone] = map[status] || ['—', '']
  return <span className={`badge ${tone}`}>{label}{status === 'por_vencer' && days != null ? ` · ${days} d` : ''}</span>
}

export const Percent = ({ value }) => (
  <div className="th-pct" title={`${value}% de requisitos obligatorios`}>
    <span className="th-pct-track"><span style={{ width: `${value}%`, background: value === 100 ? 'var(--ok)' : value >= 70 ? 'var(--warn)' : 'var(--bad)' }} /></span>
    <b>{value}%</b>
  </div>
)

// Lee un archivo como data URL (PDF o imagen) para enviarlo al backend.
export const readAsDataUrl = (file) => new Promise((resolve, reject) => {
  const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file)
})
export const MAX_FILE = 10 * 1024 * 1024
export const checkFile = (file, { images = true } = {}) => {
  if (!file) return null
  const ok = ['application/pdf', ...(images ? ['image/png', 'image/jpeg'] : [])]
  if (!ok.includes(file.type)) return images ? 'Carga un PDF o una imagen PNG/JPG.' : 'Carga un archivo PDF.'
  if (file.size > MAX_FILE) return 'El archivo supera 10 MB.'
  return null
}

// Catálogos de talento humano (requisitos, cargos, tipos de contrato), compartidos entre pantallas.
let cache = null
export const useCatalogs = (refresh = 0) => {
  const [data, setData] = useState(cache)
  useEffect(() => {
    let alive = true
    api.get('/estandares/th/catalogos').then(({ data: d }) => { cache = d; if (alive) setData(d) }).catch(() => { if (alive) setData((x) => x || { requirements: [], positions: [], categories: {}, contractTypes: {}, documentTypes: [] }) })
    return () => { alive = false }
  }, [refresh])
  return data
}
export const resetCatalogs = () => { cache = null }
