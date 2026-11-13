import axios from 'axios'

export const API_BASE = import.meta.env.REACT_APP_API_URL || 'http://localhost:4000'
const TOKEN_KEY = 'cv_token'

export const tokenStore = {
  get: () => { try { return localStorage.getItem(TOKEN_KEY) } catch { return null } },
  set: (t) => { try { localStorage.setItem(TOKEN_KEY, t) } catch { /* sin almacenamiento */ } },
  clear: () => { try { localStorage.removeItem(TOKEN_KEY) } catch { /* sin almacenamiento */ } cache.clear() }
}

// Caché corta de consultas (GET) en el navegador: volver a una pantalla vista hace poco es instantáneo
// y dos componentes que piden lo mismo a la vez comparten una sola petición.
// · Dura 30 s; cualquier cambio (POST, PUT, PATCH, DELETE) la vacía para no mostrar datos viejos.
// · La llave incluye la sesión y la sede, así que nunca se mezclan datos de usuarios o sedes.
// · No se guardan descargas (archivos) ni la sesión (/auth/me).
const CACHE_TTL = 30000
const cache = new Map()
export const clearApiCache = () => cache.clear()
const baseAdapter = axios.defaults.adapter
const cacheKey = (c) => [c.url, JSON.stringify(c.params || {}), c.headers?.Authorization || ''].join('|')
const cachingAdapter = (config) => {
  const method = (config.method || 'get').toLowerCase()
  if (method !== 'get') return baseAdapter(config).then((r) => { cache.clear(); return r })
  if (config.responseType === 'blob' || config.noCache || /\/auth\/me$/.test(config.url || '')) return baseAdapter(config)
  const key = cacheKey(config)
  const hit = cache.get(key)
  if (hit && Date.now() - hit.at < CACHE_TTL) return hit.promise.then((r) => ({ ...r, config }))
  const promise = baseAdapter(config)
  cache.set(key, { at: Date.now(), promise })
  promise.catch(() => cache.delete(key))
  return promise
}

const api = axios.create({ baseURL: API_BASE, adapter: cachingAdapter })

// Filtro de sede del administrador: se envía como ?sede= en todas las peticiones.
const SITE_KEY = 'cv_sede'
let siteFilter = (() => { try { return Number(localStorage.getItem(SITE_KEY)) || null } catch { return null } })()
export const getSiteFilter = () => siteFilter
export const setSiteFilter = (id) => {
  siteFilter = Number(id) || null
  cache.clear()
  try { siteFilter ? localStorage.setItem(SITE_KEY, String(siteFilter)) : localStorage.removeItem(SITE_KEY) } catch { /* sin almacenamiento */ }
}

api.interceptors.request.use((config) => {
  const token = tokenStore.get()
  if (token) config.headers.Authorization = `Bearer ${token}`
  if (siteFilter && !config.url.startsWith('/login') && !(config.params && 'sede' in config.params)) {
    config.params = { ...(config.params || {}), sede: siteFilter }
  }
  return config
})

// Si la sesión expira o el usuario fue desactivado, se avisa a la app para cerrar sesión.
api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/login')) {
      window.dispatchEvent(new CustomEvent('cv:unauthorized'))
    }
    return Promise.reject(error)
  }
)

export const errorMessage = (error, fallback = 'Ocurrió un error. Intenta de nuevo.') =>
  error?.response?.data?.message || (error?.request && !error?.response ? 'No hay conexión con el servidor.' : fallback)

export default api
