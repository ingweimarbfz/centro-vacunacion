import axios from 'axios'
import { API_BASE } from '../api/client'

const KEY = 'plt_token'
export const ptoken = {
  get: () => { try { return localStorage.getItem(KEY) } catch { return null } },
  set: (t) => { try { localStorage.setItem(KEY, t) } catch { /* sin almacenamiento */ } },
  clear: () => { try { localStorage.removeItem(KEY) } catch { /* sin almacenamiento */ } }
}
const papi = axios.create({ baseURL: API_BASE })
papi.interceptors.request.use((c) => { const t = ptoken.get(); if (t) c.headers.Authorization = `Bearer ${t}`; return c })
papi.interceptors.response.use((r) => r, (e) => {
  if (e.response?.status === 401 && !e.config?.url?.includes('/login')) window.dispatchEvent(new CustomEvent('plt:unauthorized'))
  return Promise.reject(e)
})
export const perror = (e, fb = 'Ocurrió un error. Intenta de nuevo.') => e?.response?.data?.message || (e?.request && !e?.response ? 'No hay conexión con el servidor.' : fb)
export const cop = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0)
export const fdate = (iso) => (iso ? new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(new Date(`${iso.slice(0, 10)}T12:00:00`)) : '—')
export default papi
