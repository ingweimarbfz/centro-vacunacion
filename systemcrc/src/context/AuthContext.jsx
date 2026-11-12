import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api, { tokenStore, setSiteFilter } from '../api/client'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Al abrir la app se valida el token guardado.
  useEffect(() => {
    if (!tokenStore.get()) { setLoading(false); return }
    api.get('/auth/me')
      .then(({ data }) => setUser(data))
      .catch(() => tokenStore.clear())
      .finally(() => setLoading(false))
  }, [])

  // Los permisos y el plan pueden cambiar mientras la sesión está abierta (módulos nuevos, plan mejorado):
  // se vuelven a leer al regresar a la pestaña y cada 5 minutos, sin recargar la página.
  useEffect(() => {
    let last = Date.now()
    const refresh = () => {
      if (!tokenStore.get() || Date.now() - last < 60000) return
      last = Date.now()
      api.get('/auth/me').then(({ data }) => setUser((u) => (u ? data : u))).catch(() => {})
    }
    const onVisible = () => { if (document.visibilityState === 'visible') refresh() }
    document.addEventListener('visibilitychange', onVisible)
    window.addEventListener('focus', refresh)
    const id = setInterval(refresh, 300000)
    return () => { document.removeEventListener('visibilitychange', onVisible); window.removeEventListener('focus', refresh); clearInterval(id) }
  }, [])

  const logout = useCallback(() => {
    tokenStore.clear()
    setSiteFilter(null)
    setUser(null)
  }, [])

  useEffect(() => {
    window.addEventListener('cv:unauthorized', logout)
    return () => window.removeEventListener('cv:unauthorized', logout)
  }, [logout])

  const login = useCallback(async (userName, password) => {
    const { data } = await api.post('/login', { userName, password })
    tokenStore.set(data.token)
    if (data.user.role !== 'administrador') setSiteFilter(null)
    setUser(data.user)
    return data.user
  }, [])

  const value = useMemo(() => ({ user, loading, login, logout, setUser }), [user, loading, login, logout])
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
