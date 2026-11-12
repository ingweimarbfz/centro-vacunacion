import React, { useEffect, useState } from 'react'
import MonthPicker, { shortMonth } from '../components/MonthPicker'
import ExpiringSupplies from '../components/ExpiringSupplies'
import PendingSignatures from '../components/PendingSignatures'
import { Link } from 'react-router-dom'
import { MdWarning, MdEventAvailable, MdAdd, MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { can } from '../utils/permissions'
import { PageHead, Spinner } from '../components/ui'
import { WIDGETS } from './dashboard/widgets'
import SitesSummary from '../components/SitesSummary'
import { getSiteFilter } from '../api/client'

const monthLabel = (ym) => shortMonth(ym)
const currentMonth = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date()).slice(0, 7)

const Dashboard = () => {
  const { user } = useAuth()
  const { settings } = useSettings()
  const [month, setMonth] = useState(currentMonth)
  const [data, setData] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    setError('')
    Promise.all([
      api.get('/dashboard', { params: { mes: month } }),
      api.get('/equipos-resumen').catch(() => ({ data: null }))
    ])
      .then(([{ data: d }, { data: eq }]) => alive && setData({ ...d, equipment: eq }))
      .catch((e) => alive && setError(errorMessage(e, 'No se pudo cargar el dashboard')))
    return () => { alive = false }
  }, [month])

  const colors = { primary: settings.primaryColor, secondary: settings.secondaryColor }
  const widgets = WIDGETS.filter((w) => w.roles.includes(user.role))
  const firstName = user.name.split(' ')[0]

  return (
    <>
      <PageHead title={`Hola, ${firstName}`} subtitle={`Este es el resumen de ${monthLabel(month)}.`}>
        <MonthPicker value={month} max={currentMonth()} onChange={setMonth} ariaLabel="Mes del resumen" />
        {can.registerData(user.role) && (
          <Link to="/temperatura" className="btn btn-primary"><MdAdd /> Registrar temperatura</Link>
        )}
      </PageHead>
      <div style={{ marginBottom: 18 }}><PendingSignatures /></div>
      <div style={{ marginBottom: 18 }}><ExpiringSupplies /></div>

      {error && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{error}</span></div>}
      {!data && !error && <div className="splash" style={{ minHeight: 300 }}><Spinner /> Cargando indicadores…</div>}

      {data && (
        <div className="stack">
          {data.equipment && data.equipment.alerts.some((a) => a.level === 'bad') && (
            <div className="alert bad">
              <MdWarning />
              <div>
                <strong>{data.equipment.alerts.filter((a) => a.level === 'bad').length} alerta{data.equipment.alerts.filter((a) => a.level === 'bad').length === 1 ? '' : 's'} críticas en equipos</strong>
                {data.equipment.alerts.filter((a) => a.level === 'bad').slice(0, 3).map((a) => `${a.name}: ${a.message.toLowerCase()}`).join(' · ')}
              </div>
              {can.registerData(user.role) && <Link to="/equipos" className="btn btn-outline btn-sm alert-actions">Ver equipos</Link>}
            </div>
          )}
          {(data.temperature.registeredToday === false || data.temperature.alerts.length > 0) && (
            <div className="stack" style={{ gap: 10 }}>
              {data.temperature.alerts.length > 0 && (
                <div className="alert bad">
                  <MdWarning />
                  <div>
                    <strong>{data.temperature.alerts.length} lectura{data.temperature.alerts.length === 1 ? '' : 's'} de temperatura fuera de rango</strong>
                    La más reciente: {data.temperature.alerts[0].message} ({data.temperature.alerts[0].date}).
                  </div>
                </div>
              )}
              {data.temperature.registeredToday === false && (
                <div className="alert warn">
                  <MdEventAvailable />
                  <div><strong>Aún no se registra la temperatura de hoy</strong>El registro diario mantiene el control de la cadena de frío.</div>
                  {can.registerData(user.role) && <Link to="/temperatura" className="btn btn-outline btn-sm alert-actions">Registrar ahora</Link>}
                </div>
              )}
            </div>
          )}

          {user.role === 'administrador' && !getSiteFilter() && <SitesSummary />}
          <div className="dash-grid">
            {widgets.map((w) => (
              <div key={w.id} className={`span-${w.span}`}>
                {w.render({ data, role: user.role, colors })}
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  )
}

export default Dashboard
