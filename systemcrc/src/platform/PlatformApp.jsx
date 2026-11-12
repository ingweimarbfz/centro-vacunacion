import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, NavLink, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { MdDashboard, MdWorkspacePremium, MdExtension, MdApartment, MdStorefront, MdLogout, MdMenu, MdLayers, MdErrorOutline, MdOpenInNew, MdGavel, MdUpgrade } from 'react-icons/md'
import papi, { ptoken, perror } from './api'
import { Spin, Splash } from './ui'
import { DashboardPage, PlansPage, FeaturesPage, OrgsPage, RequestsPage } from './pages'
import PricingPage from './PricingPage'
import { ProviderPage, OrgLegalDoc } from './legalPages'
import './platform.css'
import mark from '../assets/integraMark.svg'

const Ctx = createContext(null)
export const usePUser = () => useContext(Ctx)

const Provider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(Boolean(ptoken.get()))
  useEffect(() => {
    if (!ptoken.get()) return
    papi.get('/plataforma/me').then(({ data }) => setUser(data)).catch(() => ptoken.clear()).finally(() => setLoading(false))
  }, [])
  const logout = useCallback(() => { ptoken.clear(); setUser(null) }, [])
  useEffect(() => { const h = () => logout(); window.addEventListener('plt:unauthorized', h); return () => window.removeEventListener('plt:unauthorized', h) }, [logout])
  return <Ctx.Provider value={{ user, setUser, logout, loading }}>{children}</Ctx.Provider>
}

const Login = () => {
  const { setUser } = usePUser()
  const [f, setF] = useState({ userName: '', password: '' })
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setError(''); setBusy(true)
    try { const { data } = await papi.post('/plataforma/login', f); ptoken.set(data.token); setUser(data.user) } catch (err) { setError(perror(err)); setBusy(false) }
  }
  return (
    <div className="pf pf-login">
      <div className="pf-login-art">
        <div className="pf-brand"><img className="pf-logo" src={mark} alt="Integra IPS" /><div><strong>Integra IPS · Plataforma</strong><small>Planes y suscripciones</small></div></div>
        <div>
          <h2 className="serif">Configura tus planes, funcionalidades y clientes en un solo lugar.</h2>
          <p>Define qué incluye cada plan, sus precios mensuales y anuales, y qué módulos quedan disponibles en cada instalación del sistema.</p>
        </div>
        <small style={{ color: 'var(--p-300)' }}>Acceso exclusivo para administradores de la plataforma.</small>
      </div>
      <div className="pf-login-form">
        <form onSubmit={submit} noValidate>
          <div><h1 style={{ fontSize: 26 }}>Iniciar sesión</h1><p style={{ color: 'var(--muted)', margin: '6px 0 0' }}>Usa tu usuario con permiso de plataforma.</p></div>
          <div className="pfield"><label className="plabel">Usuario</label><input value={f.userName} onChange={(e) => setF({ ...f, userName: e.target.value })} autoComplete="username" autoFocus /></div>
          <div className="pfield"><label className="plabel">Contraseña</label><input type="password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} autoComplete="current-password" /></div>
          {error && <div className="palert bad"><MdErrorOutline /><span>{error}</span></div>}
          <button type="submit" className="pbtn primary" disabled={busy}>{busy ? <Spin /> : null} Ingresar</button>
          <a href="/plataforma/precios" style={{ textAlign: 'center', fontSize: 13 }}>Ver la página pública de precios</a>
        </form>
      </div>
    </div>
  )
}

const NAV = [
  ['/plataforma', 'Resumen', MdDashboard, true],
  ['/plataforma/planes', 'Planes', MdWorkspacePremium],
  ['/plataforma/funcionalidades', 'Funcionalidades', MdExtension],
  ['/plataforma/organizaciones', 'Organizaciones', MdApartment],
  ['/plataforma/solicitudes', 'Solicitudes de plan', MdUpgrade],
  ['/plataforma/proveedor', 'Proveedor y legal', MdGavel]
]
const Shell = () => {
  const { user, logout } = usePUser()
  const [open, setOpen] = useState(false)
  const { pathname } = useLocation()
  useEffect(() => setOpen(false), [pathname])
  return (
    <div className="pf pf-shell">
      <aside className={`pf-side${open ? ' open' : ''}`}>
        <div className="pf-brand"><img className="pf-logo" src={mark} alt="Integra IPS" /><div><strong>Integra IPS</strong><small>Plataforma de planes</small></div></div>
        {NAV.map(([to, label, I, end]) => <NavLink key={to} to={to} end={end} className={({ isActive }) => `pf-nav${isActive ? ' active' : ''}`}><I /> {label}</NavLink>)}
        <div className="pf-sep">Vista pública</div>
        <a className="pf-nav" href="/plataforma/precios" target="_blank" rel="noreferrer"><MdStorefront /> Página de precios <MdOpenInNew style={{ marginLeft: 'auto', fontSize: 15 }} /></a>
        <a className="pf-nav" href="/"><MdLayers /> Ir al sistema</a>
        <div className="pf-user"><div><strong>{user.name}</strong><small>{user.username}</small></div><button type="button" onClick={logout} title="Cerrar sesión" aria-label="Cerrar sesión"><MdLogout /></button></div>
      </aside>
      <div style={{ minWidth: 0 }}>
        <div className="pf-mobilebar"><button type="button" onClick={() => setOpen(!open)} aria-label="Menú"><MdMenu /></button><strong>Plataforma de planes</strong></div>
        <main className="pf-main"><Outlet /></main>
      </div>
    </div>
  )
}

const Guard = () => {
  const { user, loading } = usePUser()
  if (loading) return <div className="pf"><Splash /></div>
  return user ? <Shell /> : <Login />
}

const PlatformApp = () => (
  <Provider>
    <BrowserRouter>
      <Routes>
        <Route path="/plataforma/precios" element={<PricingPage />} />
        <Route path="/plataforma" element={<Guard />}>
          <Route index element={<DashboardPage />} />
          <Route path="planes" element={<PlansPage />} />
          <Route path="funcionalidades" element={<FeaturesPage />} />
          <Route path="organizaciones" element={<OrgsPage />} />
          <Route path="proveedor" element={<ProviderPage />} />
          <Route path="solicitudes" element={<RequestsPage />} />
          <Route path="legal/:orgId/:kind" element={<OrgLegalDoc />} />
        </Route>
        <Route path="*" element={<Navigate to="/plataforma" replace />} />
      </Routes>
    </BrowserRouter>
  </Provider>
)

export default PlatformApp
