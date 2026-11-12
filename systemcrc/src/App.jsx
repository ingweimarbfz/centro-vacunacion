import React from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './styles/ui.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { ROUTE_ROLES, homeFor, canSee, moduleFromPath } from './utils/permissions'
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
import StandardsHome from './pages/talento/StandardsHome'
import ThDashboard from './pages/talento/ThDashboard'
import StaffPage from './pages/talento/StaffPage'
import StaffDetail from './pages/talento/StaffDetail'
import ChecklistSheet from './pages/talento/ChecklistSheet'
import ThListado from './pages/talento/ThListado'
import ThGuide from './pages/talento/ThGuide'
import ThConfig from './pages/talento/ThConfig'
import StdDocumentsPage from './pages/estandares/StdDocumentsPage'
import StdFolderPage from './pages/estandares/StdFolderPage'
import StandardsDashboard from './pages/estandares/StandardsDashboard'
import LegalGate, { LegalPage } from './components/legal/LegalGate'
import AutoOrientation from './components/AutoOrientation'
import { BillingPage, BillingSheet, BillingDashboardPage } from './pages/facturacion/BillingPage'
import ProvidersPage from './pages/facturacion/ProvidersPage'
import ServicesBillingPage from './pages/facturacion/ServicesBillingPage'
import TariffPage from './pages/facturacion/TariffPage'
import TaxSettingsPage from './pages/facturacion/TaxSettingsPage'
import VaccinationDashboard from './pages/vacunacion/VaccinationDashboard'
import RegisterVaccination from './pages/vacunacion/RegisterVaccination'
import VaccinationRecords from './pages/vacunacion/VaccinationRecords'
import VaccinationCard from './pages/vacunacion/VaccinationCard'
import VaccinationFollowup from './pages/vacunacion/VaccinationFollowup'
import VaccinesConfig from './pages/vacunacion/VaccinesConfig'
import InvoicePage from './pages/facturacion/InvoicePage'
import PublicDocument from './pages/PublicDocument'
import DocGeneralesPage from './pages/calidad/DocGeneralesPage'
import DocGeneralesDashboard from './pages/calidad/DocGeneralesDashboard'
import StdChecklistSheet from './pages/estandares/StdChecklistSheet'
import InventoryBridge from './pages/estandares/InventoryBridge'
import EquipmentBridge from './pages/estandares/EquipmentBridge'

// Protege rutas por sesión y por rol. Si el rol no tiene acceso, vuelve al dashboard.
const Protected = ({ roles, service, module, grantable, children }) => {
  const { user, loading } = useAuth()
  const location = useLocation()
  if (loading) return <div className="splash"><Spinner /> Cargando…</div>
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  const denied = !canSee(user, { roles, service, module, grantable })
  if (denied) {
    const home = homeFor(user, moduleFromPath(location.pathname))
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
        <AutoOrientation />
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/p/:token" element={<PublicDocument />} />
          <Route element={<Protected><LegalGate><AppLayout /></LegalGate></Protected>}>
            <Route path="legal/:kind" element={<LegalPage />} />
            <Route index element={<Protected module="ips_dashboard" roles={ALL} service="any"><Dashboard /></Protected>} />
            <Route path="temperatura/reporte" element={<Protected module="temperatura" roles={STAFF} service="cadena_frio"><TemperatureReport /></Protected>} />
            <Route path="temperatura" element={<Protected module="temperatura" roles={STAFF} service="cadena_frio"><TemperaturePage /></Protected>} />
            <Route path="citologias/registrar" element={<Protected module="citologias" roles={STAFF} service="citologia"><RegisterCytology /></Protected>} />
            <Route path="citologias/configuracion" element={<Navigate to="/citologias/registrar" replace />} />
            <Route path="temperatura/configuracion" element={<Protected roles={ADMIN} service="cadena_frio"><ServiceConfigPage module="cadena_frio" key="cadena_frio" /></Protected>} />
            <Route path="facturacion" element={<Protected module="facturacion" roles={STAFF} service="any"><BillingDashboardPage /></Protected>} />
            <Route path="facturacion/cuentas-cobro" element={<Protected module="facturacion" roles={STAFF} service="any"><BillingPage /></Protected>} />
            <Route path="facturacion/cuentas-cobro/:id" element={<Protected module="facturacion" roles={STAFF} service="any"><BillingSheet /></Protected>} />
            <Route path="facturacion/servicios" element={<Protected module="facturacion" roles={STAFF} service="any"><ServicesBillingPage /></Protected>} />
            <Route path="vacunacion" element={<Protected module="vacunacion" roles={STAFF} service="cadena_frio"><VaccinationDashboard /></Protected>} />
            <Route path="vacunacion/registrar" element={<Protected module="vacunacion" roles={STAFF} service="cadena_frio"><RegisterVaccination /></Protected>} />
            <Route path="vacunacion/consultar" element={<Protected module="vacunacion" roles={STAFF} service="cadena_frio"><VaccinationRecords /></Protected>} />
            <Route path="vacunacion/carne/:documento" element={<Protected module="vacunacion" roles={STAFF} service="cadena_frio"><VaccinationCard /></Protected>} />
            <Route path="vacunacion/seguimiento" element={<Protected module="vacunacion" roles={STAFF} service="cadena_frio"><VaccinationFollowup /></Protected>} />
            <Route path="vacunacion/biologicos" element={<Protected roles={ADMIN} service="cadena_frio"><VaccinesConfig /></Protected>} />
            <Route path="facturacion/factura/:id" element={<Protected module="facturacion" roles={STAFF} service="any"><InvoicePage /></Protected>} />
            <Route path="estandares/doc-generales" element={<Protected module="doc_generales" roles={STAFF}><DocGeneralesDashboard /></Protected>} />
            <Route path="estandares/doc-generales/documentos" element={<Protected module="doc_generales" roles={STAFF}><DocGeneralesPage /></Protected>} />
            <Route path="facturacion/impuestos" element={<Protected roles={ADMIN} service="any"><TaxSettingsPage /></Protected>} />
            <Route path="facturacion/tarifario" element={<Protected roles={ADMIN} service="any"><TariffPage /></Protected>} />
            <Route path="facturacion/proveedores" element={<Protected roles={ADMIN} service="any"><ProvidersPage /></Protected>} />
            <Route path="citologias/cuentas-cobro" element={<Navigate to="/facturacion/cuentas-cobro" replace />} />
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
            <Route path="estandares" element={<Protected module={['talento_humano', 'procesos_prioritarios', 'interdependencia', 'medicamentos', 'infraestructura', 'historia_clinica']} roles={STAFF}><StandardsDashboard /></Protected>} />
            <Route path="estandares/listado" element={<Protected module={['talento_humano', 'procesos_prioritarios', 'interdependencia', 'medicamentos', 'infraestructura', 'historia_clinica']} roles={STAFF}><StandardsHome /></Protected>} />
            <Route path="estandares/interdependencia" element={<Protected module="interdependencia" roles={STAFF}><StdFolderPage standard="interdependencia" key="int-folder" title="Interdependencia de servicios" subtitle="Estándar transversal 7 · carpeta obligatoria, convenios, contratos y verificación" docsPath="/estandares/interdependencia/documentos" basePath="/estandares/interdependencia" /></Protected>} />
            <Route path="estandares/interdependencia/documentos" element={<Protected module="interdependencia" roles={STAFF}><StdDocumentsPage standard="interdependencia" key="interdependencia" title="Interdependencia · documentos" subtitle="Convenios, contratos, directorio, procedimientos y demás soportes (PDF, imágenes, Word y Excel)" /></Protected>} />
            <Route path="estandares/interdependencia/verificacion/:id" element={<Protected module="interdependencia" roles={STAFF}><StdChecklistSheet standard="interdependencia" basePath="/estandares/interdependencia" title="Lista de chequeo · Documentos obligatorios de interdependencia de servicios" /></Protected>} />
            <Route path="estandares/infraestructura" element={<Protected module="infraestructura" roles={STAFF}><StdFolderPage standard="infraestructura" key="inf-folder" title="Infraestructura" subtitle="Estándar transversal 2 · carpeta obligatoria, actividades de seguimiento y equipos" docsPath="/estandares/infraestructura/documentos" basePath="/estandares/infraestructura" followUp bridge={<EquipmentBridge />} /></Protected>} />
            <Route path="estandares/infraestructura/documentos" element={<Protected module="infraestructura" roles={STAFF}><StdDocumentsPage standard="infraestructura" key="infraestructura" title="Infraestructura · documentos" subtitle="Planos, certificados, licencias, mantenimiento locativo, actas y evidencias (PDF, imágenes, Word y Excel)" /></Protected>} />
            <Route path="estandares/infraestructura/verificacion/:id" element={<Protected module="infraestructura" roles={STAFF}><StdChecklistSheet standard="infraestructura" basePath="/estandares/infraestructura" title="Lista de chequeo · Documentos obligatorios de infraestructura" /></Protected>} />
            <Route path="estandares/infraestructura/seguimiento/:id" element={<Protected module="infraestructura" roles={STAFF}><StdChecklistSheet standard="infraestructura" basePath="/estandares/infraestructura" followTitle="Actividad de seguimiento · Infraestructura" /></Protected>} />
            <Route path="estandares/historia-clinica" element={<Protected module="historia_clinica" roles={STAFF}><StdFolderPage standard="historia_clinica" key="hc-folder" title="Historia clínica y registros" subtitle="Estándar transversal 6 · carpeta obligatoria, documentos y verificación" docsPath="/estandares/historia-clinica/documentos" basePath="/estandares/historia-clinica" /></Protected>} />
            <Route path="estandares/historia-clinica/documentos" element={<Protected module="historia_clinica" roles={STAFF}><StdDocumentsPage standard="historia_clinica" key="historia_clinica" title="Historia clínica · documentos" subtitle="Manual, formatos por servicio, procedimientos, consentimientos, auditorías y actas (PDF, imágenes, Word y Excel)" /></Protected>} />
            <Route path="estandares/historia-clinica/verificacion/:id" element={<Protected module="historia_clinica" roles={STAFF}><StdChecklistSheet standard="historia_clinica" basePath="/estandares/historia-clinica" title="Lista de chequeo · Documentos obligatorios de historia clínica y registros" /></Protected>} />
            <Route path="estandares/medicamentos" element={<Protected module="medicamentos" roles={STAFF}><StdDocumentsPage standard="medicamentos" key="medicamentos" title="Medicamentos, dispositivos médicos e insumos" subtitle="Estándar transversal 4 · documentos del estándar y control del inventario en Operaciones Generales"><InventoryBridge /></StdDocumentsPage></Protected>} />
            <Route path="estandares/procesos-prioritarios" element={<Protected module="procesos_prioritarios" roles={STAFF}><StdDocumentsPage standard="procesos_prioritarios" key="procesos_prioritarios" title="Procesos prioritarios" subtitle="Estándar transversal 5 · guías, protocolos, procedimientos, formatos e imágenes de la IPS" /></Protected>} />
            <Route path="estandares/talento-humano" element={<Protected module="talento_humano" roles={STAFF}><ThDashboard /></Protected>} />
            <Route path="estandares/talento-humano/personal" element={<Protected module="talento_humano" roles={STAFF}><StaffPage /></Protected>} />
            <Route path="estandares/talento-humano/personal/:id" element={<Protected module="talento_humano" roles={STAFF}><StaffDetail /></Protected>} />
            <Route path="estandares/talento-humano/chequeo/:id" element={<Protected module="talento_humano" roles={STAFF}><ChecklistSheet /></Protected>} />
            <Route path="estandares/talento-humano/listado" element={<Protected module="talento_humano" roles={STAFF}><ThListado /></Protected>} />
            <Route path="estandares/talento-humano/instructivo" element={<Protected module="talento_humano" roles={STAFF}><ThGuide /></Protected>} />
            <Route path="estandares/talento-humano/configuracion" element={<Protected roles={ADMIN}><ThConfig /></Protected>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </SettingsProvider>
)

export default App
