import React, { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom'
import './styles/ui.css'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SettingsProvider } from './context/SettingsContext'
import { ROUTE_ROLES, homeFor, canSee, moduleFromPath } from './utils/permissions'
import { Spinner } from './components/ui'
import AppLayout from './layout/AppLayout'
import Login from './components/Login'
import { MODULE_KEY } from './layout/AppLayout'
import LegalGate, { LegalPage } from './components/legal/LegalGate'
import AutoOrientation from './components/AutoOrientation'

// Cada pantalla se descarga solo cuando se abre (carga inicial más liviana).
const Dashboard = lazy(() => import('./pages/Dashboard'))
const TemperaturePage = lazy(() => import('./pages/TemperaturePage'))
const TemperatureReport = lazy(() => import('./pages/TemperatureReport'))
const RegisterCytology = lazy(() => import('./components/RegisterCytology'))
const ConsultCytology = lazy(() => import('./components/ConsultCytology'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const NotificationsPage = lazy(() => import('./pages/NotificationsPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const MyNotificationsPage = lazy(() => import('./pages/MyNotificationsPage'))
const SocorroDashboard = lazy(() => import('./pages/socorro/SocorroDashboard'))
const EventsPage = lazy(() => import('./pages/socorro/EventsPage'))
const EventDetail = lazy(() => import('./pages/socorro/EventDetail'))
const PeoplePage = lazy(() => import('./pages/socorro/PeoplePage'))
const InventoryDashboard = lazy(() => import('./pages/inventario/InventoryDashboard'))
const StockPage = lazy(() => import('./pages/inventario/StockPage'))
const MovementsPage = lazy(() => import('./pages/inventario/MovementsPage'))
const ProductsPage = lazy(() => import('./pages/inventario/ProductsPage'))
const InventorySheet = lazy(() => import('./pages/inventario/InventorySheet'))
const IpsServicesPage = lazy(() => import('./pages/IpsServicesPage'))
const WarehousesPage = lazy(() => import('./pages/inventario/WarehousesPage'))
const MySignaturePage = lazy(() => import('./pages/SignaturePage').then((m) => ({ default: m.MySignaturePage })))
const CytologyPage = lazy(() => import('./pages/CytologyPage'))
const ServiceConfigPage = lazy(() => import('./pages/ServiceConfigPage'))
const VolunteerReport = lazy(() => import('./pages/socorro/VolunteerReport'))
const AmbulanceDashboard = lazy(() => import('./pages/vehiculos/AmbulanceDashboard'))
const FleetDashboard = lazy(() => import('./pages/vehiculos/FleetDashboard'))
const VehiclesPage = lazy(() => import('./pages/vehiculos/VehiclesPage'))
const VehicleDetail = lazy(() => import('./pages/vehiculos/VehicleDetail'))
const TripsPage = lazy(() => import('./pages/vehiculos/TripsPage'))
const TripDetail = lazy(() => import('./pages/vehiculos/TripDetail'))
const InspectionsPage = lazy(() => import('./pages/vehiculos/InspectionsPage'))
const InspectionForm = lazy(() => import('./pages/vehiculos/InspectionForm'))
const InspectionDetail = lazy(() => import('./pages/vehiculos/InspectionDetail'))
const EquipmentPage = lazy(() => import('./pages/equipos/EquipmentPage'))
const EquipmentDetail = lazy(() => import('./pages/equipos/EquipmentDetail'))
const SitesPage = lazy(() => import('./pages/SitesPage'))
const VolunteerPanel = lazy(() => import('./pages/socorro/VolunteerPanel'))
const StandardsHome = lazy(() => import('./pages/talento/StandardsHome'))
const ThDashboard = lazy(() => import('./pages/talento/ThDashboard'))
const StaffPage = lazy(() => import('./pages/talento/StaffPage'))
const StaffDetail = lazy(() => import('./pages/talento/StaffDetail'))
const ChecklistSheet = lazy(() => import('./pages/talento/ChecklistSheet'))
const ThListado = lazy(() => import('./pages/talento/ThListado'))
const ThGuide = lazy(() => import('./pages/talento/ThGuide'))
const ThConfig = lazy(() => import('./pages/talento/ThConfig'))
const StdDocumentsPage = lazy(() => import('./pages/estandares/StdDocumentsPage'))
const StdFolderPage = lazy(() => import('./pages/estandares/StdFolderPage'))
const StandardsDashboard = lazy(() => import('./pages/estandares/StandardsDashboard'))
const BillingPage = lazy(() => import('./pages/facturacion/BillingPage').then((m) => ({ default: m.BillingPage })))
const BillingSheet = lazy(() => import('./pages/facturacion/BillingPage').then((m) => ({ default: m.BillingSheet })))
const BillingDashboardPage = lazy(() => import('./pages/facturacion/BillingPage').then((m) => ({ default: m.BillingDashboardPage })))
const ProvidersPage = lazy(() => import('./pages/facturacion/ProvidersPage'))
const ServicesBillingPage = lazy(() => import('./pages/facturacion/ServicesBillingPage'))
const TariffPage = lazy(() => import('./pages/facturacion/TariffPage'))
const TaxSettingsPage = lazy(() => import('./pages/facturacion/TaxSettingsPage'))
const VaccinationDashboard = lazy(() => import('./pages/vacunacion/VaccinationDashboard'))
const RegisterVaccination = lazy(() => import('./pages/vacunacion/RegisterVaccination'))
const VaccinationRecords = lazy(() => import('./pages/vacunacion/VaccinationRecords'))
const VaccinationCard = lazy(() => import('./pages/vacunacion/VaccinationCard'))
const VaccinationFollowup = lazy(() => import('./pages/vacunacion/VaccinationFollowup'))
const VaccinesConfig = lazy(() => import('./pages/vacunacion/VaccinesConfig'))
const InvoicePage = lazy(() => import('./pages/facturacion/InvoicePage'))
const InvoiceRegisterPage = lazy(() => import('./pages/facturacion/InvoiceRegisterPage'))
const EduInvoiceRegisterPage = lazy(() => import('./pages/facturacion/InvoiceRegisterPage').then((m) => ({ default: m.EduInvoiceRegisterPage })))
const PublicDocument = lazy(() => import('./pages/PublicDocument'))
const DocGeneralesPage = lazy(() => import('./pages/calidad/DocGeneralesPage'))
const DocGeneralesDashboard = lazy(() => import('./pages/calidad/DocGeneralesDashboard'))
const StdChecklistSheet = lazy(() => import('./pages/estandares/StdChecklistSheet'))
const InventoryBridge = lazy(() => import('./pages/estandares/InventoryBridge'))
const EquipmentBridge = lazy(() => import('./pages/estandares/EquipmentBridge'))
// Educación · Institución ETDH (IIPS-019)
const EduDashboard = lazy(() => import('./pages/academico/EduDashboard'))
const EduPrograms = lazy(() => import('./pages/academico/ProgramsPage'))
const EduProgramDetail = lazy(() => import('./pages/academico/ProgramDetail'))
const EduGroups = lazy(() => import('./pages/academico/GroupsPage'))
const EduStudents = lazy(() => import('./pages/academico/StudentsPage'))
const EduStudentDetail = lazy(() => import('./pages/academico/StudentDetail'))
const EduEnrollments = lazy(() => import('./pages/academico/EnrollmentsPage'))
const EduMyProgram = lazy(() => import('./pages/academico/MyProgramPage'))
const EduCartera = lazy(() => import('./pages/academico/CarteraPage'))
const EduAgreements = lazy(() => import('./pages/academico/AgreementsPage'))
const EduSettings = lazy(() => import('./pages/academico/AcademicSettingsPage'))
const EduReceipt = lazy(() => import('./pages/academico/ReceiptPage'))
const EduContract = lazy(() => import('./pages/academico/ContractPage'))
const EduInvoice = lazy(() => import('./pages/academico/EduInvoicePage'))
const EduSchedule = lazy(() => import('./pages/academico/SchedulePage'))
const EduTeacher = lazy(() => import('./pages/academico/TeacherDashboard'))
const EduMySchedule = lazy(() => import('./pages/academico/MySchedulePage'))
const EduTeacherGroups = lazy(() => import('./pages/academico/TeacherPages').then((m) => ({ default: m.TeacherGroupsPage })))
const EduTeacherGrades = lazy(() => import('./pages/academico/TeacherPages').then((m) => ({ default: m.TeacherGradesPage })))
const EduTeacherSubs = lazy(() => import('./pages/academico/TeacherPages').then((m) => ({ default: m.TeacherSubmissionsPage })))
const EduMyCourse = lazy(() => import('./pages/academico/MyCourse'))
const EduAttendance = lazy(() => import('./pages/academico/AttendancePage'))
const EduActa = lazy(() => import('./pages/academico/ActaPage'))
const EduActas = lazy(() => import('./pages/academico/ActasPage'))
const EduRooms = lazy(() => import('./pages/academico/ClassroomsPage'))
const EduCourse = lazy(() => import('./pages/academico/CoursePage'))
const EduCertificates = lazy(() => import('./pages/academico/CertificatesPage'))
const EduCertificatePrint = lazy(() => import('./pages/academico/CertificatePrint'))
const EduVerify = lazy(() => import('./pages/academico/VerifyCertificate'))
const EduReports = lazy(() => import('./pages/academico/ReportsPage'))
const EduAccreditation = lazy(() => import('./pages/academico/Accreditation').then((m) => ({ default: m.AccreditationDashboard })))
const EduAccreditationDocs = lazy(() => import('./pages/academico/Accreditation').then((m) => ({ default: m.AccreditationDocs })))

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
        <Suspense fallback={<div className="splash"><Spinner /></div>}>
        <Routes>
          <Route path="/login" element={<LoginRoute />} />
          <Route path="/p/:token" element={<PublicDocument />} />
          <Route path="/verificar" element={<EduVerify />} />
          <Route path="/verificar/:code" element={<EduVerify />} />
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
            <Route path="facturacion/facturas" element={<Protected module="facturacion" roles={STAFF} service="any"><InvoiceRegisterPage /></Protected>} />
            <Route path="educacion/facturas" element={<Protected module="edu_estudiantes" roles={STAFF}><EduInvoiceRegisterPage /></Protected>} />
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
            <Route path="notificaciones" element={<Protected roles={ADMIN}><NotificationsPage /></Protected>} />
            <Route path="perfil" element={<ProfilePage />} />
            <Route path="firma" element={<MySignaturePage />} />
            <Route path="mis-notificaciones" element={<MyNotificationsPage />} />
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
            <Route path="educacion" element={<Protected module="edu_dashboard" roles={STAFF}><EduDashboard /></Protected>} />
            <Route path="educacion/programas" element={<Protected module="edu_programas" roles={STAFF}><EduPrograms /></Protected>} />
            <Route path="educacion/programas/:id" element={<Protected module="edu_programas" roles={STAFF}><EduProgramDetail /></Protected>} />
            <Route path="educacion/grupos" element={<Protected module="edu_programas" roles={STAFF}><EduGroups /></Protected>} />
            <Route path="educacion/estudiantes" element={<Protected module="edu_estudiantes" roles={STAFF}><EduStudents /></Protected>} />
            <Route path="educacion/estudiantes/:id" element={<Protected module="edu_estudiantes" roles={STAFF}><EduStudentDetail /></Protected>} />
            <Route path="educacion/matriculas" element={<Protected module="edu_estudiantes" roles={STAFF}><EduEnrollments /></Protected>} />
            <Route path="educacion/mi-programa" element={<Protected module="edu_portal" grantable={false} roles={['estudiante']}><EduMyProgram /></Protected>} />
            <Route path="educacion/mi-programa/contrato/:id" element={<Protected module="edu_portal" grantable={false} roles={['estudiante']}><EduContract /></Protected>} />
            <Route path="educacion/mi-programa/recibo/:id" element={<Protected module="edu_portal" grantable={false} roles={['estudiante']}><EduReceipt /></Protected>} />
            <Route path="educacion/cartera" element={<Protected module="edu_estudiantes" roles={STAFF}><EduCartera /></Protected>} />
            <Route path="educacion/convenios" element={<Protected module={['edu_estudiantes', 'edu_programas']} roles={STAFF}><EduAgreements /></Protected>} />
            <Route path="educacion/configuracion" element={<Protected roles={ADMIN}><EduSettings /></Protected>} />
            <Route path="educacion/recibos/:id" element={<Protected module="edu_estudiantes" roles={STAFF}><EduReceipt /></Protected>} />
            <Route path="educacion/horarios" element={<Protected module="edu_programas" roles={STAFF}><EduSchedule /></Protected>} />
            <Route path="educacion/grupos/:id/aula" element={<Protected module={['edu_programas', 'edu_docente']} roles={[...STAFF, 'docente']}><EduCourse /></Protected>} />
            <Route path="educacion/certificados" element={<Protected module="edu_estudiantes" roles={STAFF}><EduCertificates /></Protected>} />
            <Route path="educacion/certificados/:id" element={<Protected module="edu_estudiantes" roles={STAFF}><EduCertificatePrint /></Protected>} />
            <Route path="educacion/mi-programa/certificado/:id" element={<Protected module="edu_portal" grantable={false} roles={['estudiante']}><EduCertificatePrint /></Protected>} />
            <Route path="educacion/reportes" element={<Protected module={['edu_dashboard', 'edu_estudiantes', 'edu_programas']} roles={STAFF}><EduReports /></Protected>} />
            <Route path="educacion/acreditacion" element={<Protected module={['edu_dashboard', 'edu_programas']} roles={STAFF}><EduAccreditation /></Protected>} />
            <Route path="educacion/acreditacion/documentos" element={<Protected module={['edu_dashboard', 'edu_programas']} roles={STAFF}><EduAccreditationDocs /></Protected>} />
            <Route path="educacion/aulas" element={<Protected module="edu_programas" roles={STAFF}><EduRooms /></Protected>} />
            <Route path="educacion/actas" element={<Protected module={['edu_programas', 'edu_estudiantes']} roles={STAFF}><EduActas /></Protected>} />
            <Route path="educacion/clases/:id/asistencia" element={<Protected module={['edu_programas', 'edu_docente']} roles={[...STAFF, 'docente']}><EduAttendance /></Protected>} />
            <Route path="educacion/clases/:id/acta" element={<Protected module={['edu_programas', 'edu_docente']} roles={[...STAFF, 'docente']}><EduActa /></Protected>} />
            <Route path="educacion/docente" element={<Protected module="edu_docente" grantable={false} roles={['docente']}><EduTeacher /></Protected>} />
            <Route path="educacion/docente/horario" element={<Protected module="edu_docente" grantable={false} roles={['docente']}><EduMySchedule /></Protected>} />
            <Route path="educacion/docente/grupos" element={<Protected module="edu_docente" grantable={false} roles={['docente']}><EduTeacherGroups /></Protected>} />
            <Route path="educacion/docente/calificaciones" element={<Protected module="edu_docente" grantable={false} roles={['docente']}><EduTeacherGrades /></Protected>} />
            <Route path="educacion/docente/entregas" element={<Protected module="edu_docente" grantable={false} roles={['docente']}><EduTeacherSubs /></Protected>} />
            <Route path="educacion/mi-horario" element={<Protected module="edu_portal" grantable={false} roles={['estudiante']}><EduMySchedule /></Protected>} />
            <Route path="educacion/mi-aula" element={<Protected module="edu_portal" grantable={false} roles={['estudiante']}><EduMyCourse mode="aula" /></Protected>} />
            <Route path="educacion/mis-notas" element={<Protected module="edu_portal" grantable={false} roles={['estudiante']}><EduMyCourse mode="notas" /></Protected>} />
            <Route path="educacion/facturas/:id" element={<Protected module="edu_estudiantes" roles={STAFF}><EduInvoice /></Protected>} />
            <Route path="educacion/mi-programa/factura/:id" element={<Protected module="edu_portal" grantable={false} roles={['estudiante']}><EduInvoice /></Protected>} />
            <Route path="educacion/contratos/:id" element={<Protected module="edu_estudiantes" roles={STAFF}><EduContract /></Protected>} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
    </AuthProvider>
  </SettingsProvider>
)

export default App
