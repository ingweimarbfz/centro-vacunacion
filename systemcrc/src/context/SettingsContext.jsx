import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import api from '../api/client'
import defaultLogo from '../assets/integraLogo.svg'
import { BRAND } from '../utils/brand'

export const DEFAULT_SETTINGS = {
  ipsName: 'Mi IPS',
  shortName: 'Mi IPS',
  primaryColor: '#E30613',
  secondaryColor: '#1F2A44',
  logoUrl: null,
  loginImageUrl: null,
  loginDescription: null,
  loginFooter: null
}

const SettingsContext = createContext(null)

// Aplica los colores de la IPS como variables CSS: toda la interfaz los toma de aquí.
export const applyTheme = ({ primaryColor, secondaryColor }) => {
  const root = document.documentElement
  root.style.setProperty('--brand', primaryColor)
  root.style.setProperty('--secondary', secondaryColor)
}

export const SettingsProvider = ({ children }) => {
  const [settings, setSettings] = useState(DEFAULT_SETTINGS)

  const refresh = useCallback(async () => {
    try {
      const { data } = await api.get('/configuracion/publica')
      setSettings((prev) => ({ ...prev, ...data }))
    } catch {
      /* Si el servidor no responde se usan los valores por defecto */
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])
  useEffect(() => {
    applyTheme(settings)
    document.title = `${BRAND} · ${settings.shortName}`
  }, [settings])

  const value = useMemo(() => ({
    settings,
    logo: settings.logoUrl || defaultLogo,
    refresh,
    setSettings
  }), [settings, refresh])

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
}

export const useSettings = () => useContext(SettingsContext)
