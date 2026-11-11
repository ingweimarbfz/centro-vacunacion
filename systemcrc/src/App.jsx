import React from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './styles/ui.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { ROUTE_ROLES, homeFor, canSee } from './utils/permissions'
import { Spinner } from './components/ui'
import AppLayout from './layout/AppLayout'
import Login from './components/Login'
import Dashboard from './pages/Dashboard'
import TemperaturePage from './pages/TemperaturePage'
import TemperatureReport from './pages/TemperatureReport'
import RegisterCytology from './components/RegisterCytology'
import ConsultCytology from './components/ConsultCytology'
import UsersPage from './pages/UsersPage'
import SettingsPage from './pages/SettingsPage'
import ProfilePage from './pages/ProfilePage'
import SocorroDashboard from './pages/socorro/SocorroDashboard'
import EventsPage from './pages/socorro/EventsPage'
import EventDetail from './pages/socorro/EventDetail'
import PeoplePage from './pages/socorro/PeoplePage'
import InventoryDashboard from './pages/inventario/InventoryDashboard'
import StockPage from './pages/inventario/StockPage'
import MovementsPage from './pages/inventario/MovementsPage'
import ProductsPage from './pages/inventario/ProductsPage'
import InventorySheet from './pages/inventario/InventorySheet'
import IpsServicesPage from './pages/IpsServicesPage'
import WarehousesPage from './pages/inventario/WarehousesPage'
import { MySignaturePage } from './pages/SignaturePage'
import CytologyPage from './pages/CytologyPage'
import ServiceConfigPage from './pages/ServiceConfigPage'
import VolunteerReport from './pages/socorro/VolunteerReport'
import AmbulanceDashboard from './pages/vehiculos/AmbulanceDashboard'
import { MODULE_KEY } from './layout/AppLayout'
import FleetDashboard from './pages/vehiculos/FleetDashboard'
import VehiclesPage from './pages/vehiculos/VehiclesPage'
import VehicleDetail from './pages/vehiculos/VehicleDetail'
import TripsPage from './pages/vehiculos/TripsPage'
import TripDetail from './pages/vehiculos/TripDetail'
import InspectionsPage from './pages/vehiculos/InspectionsPage'
import InspectionForm from './pages/vehiculos/InspectionForm'
import InspectionDetail from './pages/vehiculos/InspectionDetail'
import EquipmentPage from './pages/equipos/EquipmentPage'
import EquipmentDetail from './pages/equipos/EquipmentDetail'
import SitesPage from './pages/SitesPage'
import VolunteerPanel from './pages/socorro/VolunteerPanel'

// Protege rutas por sesión y por rol. Si el rol no tiene acceso, vuelve al dashboard.
const Protected = ({ roles, service, module, grantable, children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="splash"><Spinner /> Cargando…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  const denied = !canSee(user, { roles, service, module, grantable })
  if (denied) {
    const home = homeFor(user, location.pathname.startsWith('/socorro') ? 'socorro' : 'ips')
    return <Navigate to={home === location.pathname ? '/perfil' : home} replace />
  }
  return children
}

const LoginRoute = () => {
  const { user, loading } = useAuth()
  if (loading) return <div className="splash"><Spinner /> Cargando…</div>
  if (!user) return <Login />
  let preferred = 'ips'
  try { preferred = localStorage.getItem(MODULE_KEY) || 'ips' } catch { /* sin almacenamiento */ }
  return <Navigate to={homeFor(user, preferred)} replace />
}

const { ADMIN, STAFF, ALL, EVENTS, FLEET_VIEW, FLEET_DASH, TRIPS } = ROUTE_ROLES

const App = () => (
  <SettingsProvider>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route element={<Protected><AppLayout /></Protected>}>
            <Route index element={<Protected module="ips_dashboard" roles={ALL} service="any"><Dashboard /></Protected>} />
            <Route path="temperatura/reporte" element={<Protected module="temperatura" roles={STAFF} service="cadena_frio"><TemperatureReport /></Protected>} />
            <Route path="temperatura" element={<Protected module="temperatura" roles={STAFF} service="cadena_frio"><TemperaturePage /></Protected>} />
            <Route path="citologias/registrar" element={<Protected module="citologias" roles={STAFF} service="citologia"><RegisterCytology /></Protected>} />
            <Route path="citologias/configuracion" element={<Protected roles={ADMIN} service="citologia"><ServiceConfigPage module="citologia" key="citologia" /></Protected>} />
            <Route path="temperatura/configuracion" element={<Protected roles={ADMIN} service="cadena_frio"><ServiceConfigPage module="cadena_frio" key="cadena_frio" /></Protected>} />
            <Route path="citologias/:id" element={<Protected module="citologias" roles={STAFF} service="citologia"><CytologyPage /></Protected>} />
            <Route path="citologias/consultar" element={<Protected module="citologias" roles={STAFF} service="citologia"><ConsultCytology /></Protected>} />
            <Route path="equipos" element={<Protected module="equipos" roles={STAFF} service="any"><EquipmentPage /></Protected>} />
            <Route path="equipos/:id" element={<Protected module="equipos" roles={STAFF} service="any"><EquipmentDetail /></Protected>} />
            <Route path="sedes" element={<Protected roles={ADMIN}><SitesPage /></Protected>} />
            <Route path="traslado-asistencial" element={<Protected module="traslado" grantable={false} roles={['administrador', 'conductor']} service="ambulancias"><AmbulanceDashboard /></Protected>} />
            <Route path="bodegas" element={<Protected roles={ADMIN}><WarehousesPage /></Protected>} />
            <Route path="servicios-ips" element={<Protected roles={ADMIN}><IpsServicesPage /></Protected>} />
            <Route path="usuarios" element={<Protected roles={ADMIN}><UsersPage /></Protected>} />
            <Route path="configuracion" element={<Protected roles={ADMIN}><SettingsPage /></Protected>} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="firma" element={<MySignaturePage />} />
            <Route path="socorro" element={<Protected module="og_dashboard" roles={ALL}><SocorroDashboard /></Protected>} />
            <Route path="socorro/vehiculos" element={<Protected module="flota" roles={FLEET_DASH}><FleetDashboard /></Protected>} />
            <Route path="socorro/vehiculos/flota" element={<Protected module="flota" roles={FLEET_VIEW}><VehiclesPage /></Protected>} />
            <Route path="socorro/vehiculos/flota/:id" element={<Protected module="flota" roles={FLEET_VIEW}><VehicleDetail /></Protected>} />
            <Route path="socorro/vehiculos/preoperacional" element={<Protected module="flota" roles={FLEET_VIEW}><InspectionsPage /></Protected>} />
            <Route path="socorro/vehiculos/preoperacional/nuevo" element={<Protected module="flota" grantable={false} roles={['conductor']}><InspectionForm /></Protected>} />
            <Route path="socorro/vehiculos/preoperacional/:id" element={<Protected module="flota" roles={FLEET_VIEW}><InspectionDetail /></Protected>} />
            <Route path="socorro/vehiculos/reportes" element={<Protected module="flota" grantable={false} roles={TRIPS}><TripsPage /></Protected>} />
            <Route path="socorro/vehiculos/reportes/:id" element={<Protected module="flota" grantable={false} roles={TRIPS}><TripDetail /></Protected>} />
            <Route path="socorro/voluntario" element={<Protected module="voluntario" grantable={false} roles={['administrador', 'empleado', 'voluntario']}><VolunteerPanel /></Protected>} />
            <Route path="socorro/eventos" element={<Protected module="socorro" roles={EVENTS}><EventsPage area="socorro" key="socorro" /></Protected>} />
            <Route path="socorro/educacion" element={<Protected module="educacion" roles={EVENTS}><EventsPage area="educacion" key="educacion" /></Protected>} />
            <Route path="socorro/educacion/:id" element={<Protected module="educacion" roles={EVENTS}><EventDetail /></Protected>} />
            <Route path="socorro/eventos/:id" element={<Protected module={['socorro', 'educacion']} roles={EVENTS}><EventDetail /></Protected>} />
            <Route path="socorro/personas/reporte" element={<Protected module="reporte_voluntarios" roles={STAFF}><VolunteerReport /></Protected>} />
            <Route path="socorro/personas" element={<Protected module="personas" roles={STAFF}><PeoplePage /></Protected>} />
            <Route path="socorro/inventario" element={<Protected module="inventario" roles={STAFF}><InventoryDashboard /></Protected>} />
            <Route path="socorro/inventario/existencias" element={<Protected module="inventario" roles={STAFF}><StockPage /></Protected>} />
            <Route path="socorro/inventario/movimientos" element={<Protected module="inventario" roles={STAFF}><MovementsPage /></Protected>} />
            <Route path="socorro/inventario/productos" element={<Protected module="inventario" roles={STAFF}><ProductsPage /></Protected>} />
            <Route path="socorro/inventario/reporte" element={<Protected module="inventario" roles={STAFF}><InventorySheet /></Protected>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </SettingsProvider>
)

export default App
