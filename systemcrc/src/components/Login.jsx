import React, { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { MdPerson, MdLock, MdVisibility, MdVisibilityOff, MdErrorOutline, MdLocalHospital, MdEmergency, MdVolunteerActivism, MdInsights } from 'react-icons/md'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { errorMessage } from '../api/client'
import { Spinner } from './ui'
import imageLogin from '../assets/imageLogin.jpg'

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
      <section className="login-hero" style={{ '--hero-img': `url(${imageLogin})` }}>
        <span className="login-tag">Sistema de información institucional</span>
        <div>
          <h2>{settings.shortName}</h2>
          <p>
            Plataforma de la {settings.ipsName} que integra la operación de la seccional, sus unidades municipales y grupos de apoyo:
            los servicios de salud de la IPS y la gestión de socorro, voluntariado y operaciones, con información en tiempo real para decidir mejor.
          </p>
          <div className="login-points">
            <div><MdLocalHospital /><span><b>IPS</b> · vacunación y cadena de frío, citologías y hoja de vida de equipos biomédicos.</span></div>
            <div><MdEmergency /><span><b>Socorro y operaciones</b> · eventos y emergencias, personal, inventario de insumos y flota vehicular.</span></div>
            <div><MdVolunteerActivism /><span><b>Voluntariado</b> · horas de servicio, seguro y estado de cada voluntario.</span></div>
            <div><MdInsights /><span><b>Dashboards por sede</b> · indicadores, alertas y reportes en PDF.</span></div>
          </div>
        </div>
        <div className="login-foot">Humanidad · Imparcialidad · Neutralidad · Independencia · Voluntariado · Unidad · Universalidad</div>
      </section>

      <section className="login-panel">
        <form className="login-card" onSubmit={handleSubmit} noValidate>
          <div className="login-brand"><img src={logo} alt={settings.ipsName} /></div>
          <h1>Iniciar sesión</h1>
          <p>Ingresa a {settings.shortName} con el usuario que te asignó el administrador.</p>

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
