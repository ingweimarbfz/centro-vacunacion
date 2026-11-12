import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MdPerson, MdLock, MdVisibility, MdVisibilityOff, MdErrorOutline, MdLocalHospital, MdRule, MdInventory2, MdInsights } from 'react-icons/md'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { errorMessage } from '../api/client'
import { Spinner } from './ui'
import defaultImage from '../assets/loginHealth.svg'
import { BRAND, BRAND_TAGLINE } from '../utils/brand'

export const defaultLoginDescription = (ipsName) => `Plataforma de ${ipsName} que integra los servicios de salud, la habilitación y la operación de todas sus sedes, con información en tiempo real para decidir mejor.`
export const defaultLoginFooter = () => `© ${new Date().getFullYear()} ${BRAND} · ${BRAND_TAGLINE} · Información protegida (Ley 1581 de 2012)`

const Login = () => {
  const { login } = useAuth()
  const { settings, logo } = useSettings()
  const navigate = useNavigate()
  const location = useLocation()
  const [form, setForm] = useState({ userName: '', pass: '' })
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!form.userName.trim() || !form.pass) {
      setError('Ingresa tu usuario y contraseña.')
      return
    }
    setLoading(true)
    try {
      await login(form.userName.trim(), form.pass)
      navigate(location.state?.from?.pathname || '/', { replace: true })
    } catch (err) {
      setError(errorMessage(err, 'No se pudo iniciar sesión.'))
      setForm((f) => ({ ...f, pass: '' }))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login">
      <section className="login-hero" style={{ '--hero-img': `url(${settings.loginImageUrl || defaultImage})` }}>
        <span className="login-tag">{BRAND_TAGLINE}</span>
        <div>
          <h2>{BRAND}</h2>
          <p>{settings.loginDescription || defaultLoginDescription(settings.ipsName)}</p>
          <div className="login-points">
            <div><MdLocalHospital /><span><b>Servicios de salud</b> · citologías, cadena de frío, hoja de vida de equipos y traslado asistencial.</span></div>
            <div><MdRule /><span><b>Habilitación</b> · estándares transversales con carpetas obligatorias, listas de chequeo y alertas de vencimiento.</span></div>
            <div><MdInventory2 /><span><b>Operación</b> · inventario, bodegas y flota vehicular por sede.</span></div>
            <div><MdInsights /><span><b>Dashboards</b> · indicadores, alertas, formatos en PDF y firmas digitales.</span></div>
          </div>
        </div>
        <div className="login-foot">{settings.loginFooter || defaultLoginFooter()}</div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <div className="login-brand"><img src={logo} alt={settings.ipsName} /></div>
          <h1>Iniciar sesión</h1>
          <p>Ingresa a {BRAND} con el usuario que te asignó el administrador.</p>

          <div className="field">
            <label htmlFor="userName">Usuario</label>
            <div className="input-icon">
              <MdPerson />
              <input id="userName" name="userName" autoComplete="username" autoFocus value={form.userName} onChange={handleChange} placeholder="tu.usuario" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="pass">Contraseña</label>
            <div className="input-icon">
              <MdLock />
              <input id="pass" name="pass" type={showPass ? 'text' : 'password'} autoComplete="current-password" value={form.pass} onChange={handleChange} placeholder="••••••••" />
              <button type="button" className="btn btn-ghost btn-icon addon" onClick={() => setShowPass((s) => !s)} aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                {showPass ? <MdVisibilityOff /> : <MdVisibility />}
              </button>
            </div>
          </div>

          {error && <div className="alert bad" role="alert" style={{ marginBottom: 12 }}><MdErrorOutline /> <span>{error}</span></div>}

          <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
            {loading ? <><Spinner /> Ingresando…</> : 'Ingresar'}
          </button>
        </form>
      </section>
    </div>
  )
}

export default Login
