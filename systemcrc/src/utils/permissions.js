import {
  MdDashboard, MdThermostat, MdNoteAdd, MdManageSearch, MdPeople, MdSettings, MdPerson,
  MdEmergency, MdInventory2, MdBadge, MdLocalHospital, MdLocalShipping, MdDirectionsCar, MdAssignment, MdSpeed,
  MdMedicalServices, MdAccountTree, MdVolunteerActivism, MdFactCheck, MdSchool, MdWarehouse, MdCategory, MdSwapHoriz, MdHealing, MdAirportShuttle, MdDraw, MdTune, MdInsights, MdGroups, MdRule, MdMenuBook, MdFolderShared, MdMedication
} from 'react-icons/md'

export const ROLE_LABELS = {
  administrador: 'Administrador',
  empleado: 'Empleado',
  voluntario: 'Voluntario',
  conductor: 'Conductor'
}

export const ROLE_DESCRIPTIONS = {
  administrador: 'Acceso total a todas las sedes: módulos, usuarios, sedes y configuración.',
  empleado: 'Registra y consulta la información de su sede (IPS y Operaciones Generales) y la bodega de su sede.',
  voluntario: 'Su panel de horas y seguro; registra y coordina actividades de su municipio.',
  conductor: 'Flota vehicular (Operaciones Generales): preoperacional y reportes diarios; y el dashboard de su ambulancia en IPS · Traslado asistencial.'
}

export const SITE_TYPES = { seccional: 'Seccional', unidad_municipal: 'Unidad municipal', grupo_apoyo: 'Grupo de apoyo' }
// Módulos del sistema que un servicio de IPS puede habilitar (los servicios los crea el administrador).
export const IPS_MODULES = { cadena_frio: 'Registro de temperatura (cadena de frío)', citologia: 'Citologías', ambulancias: 'Traslado asistencial (dashboard de ambulancias TAB/TAM)' }
export const EVENT_AREAS = { socorro: 'Socorro', educacion: 'Educación' }

const ADMIN = ['administrador']
const STAFF = ['administrador', 'empleado']
const ALL = ['administrador', 'empleado'] // dashboards generales
const EVERYONE = ['administrador', 'empleado', 'voluntario', 'conductor']
const EVENTS = ['administrador', 'empleado', 'voluntario']
const FLEET_VIEW = ['administrador', 'empleado', 'conductor']
const FLEET_DASH = ['administrador', 'empleado', 'conductor']
const TRIPS = ['administrador', 'conductor'] // el admin consulta; solo el conductor crea

// ¿La sede del usuario tiene IPS y el módulo indicado? (el administrador ve todo)
// service: 'any' (cualquier servicio de IPS) o un módulo: cadena_frio, citologia.
export const siteHas = (user, service) => {
  if (!user) return false
  if (user.role === 'administrador') return true
  const s = user.site
  if (!s?.hasIps) return false
  return service && service !== 'any' ? (s.ipsModules || []).includes(service) : true
}

// ---------------------------------------------------------------- Módulos por usuario
// El administrador puede mostrar u ocultar módulos a cada usuario (Usuarios → Módulos). El administrador ve todo.
export const USER_MODULES = {
  ips: [['ips_dashboard', 'Dashboard de IPS'], ['citologias', 'Citologías'], ['traslado', 'Traslado asistencial (ambulancias)'], ['temperatura', 'Registro de temperatura'], ['equipos', 'Hoja de vida de equipos']],
  socorro: [['og_dashboard', 'Dashboard de Operaciones Generales'], ['socorro', 'Socorro (eventos y emergencias)'], ['educacion', 'Educación'], ['personas', 'Personas / voluntarios'], ['reporte_voluntarios', 'Reporte de voluntarios'], ['inventario', 'Inventario y bodegas'], ['flota', 'Flota vehicular'], ['voluntario', 'Panel de voluntario']],
  estandares: [['talento_humano', 'Talento humano (hojas de vida, contratos y chequeo)'], ['procesos_prioritarios', 'Procesos prioritarios (documentos)'], ['interdependencia', 'Interdependencia (carpeta y documentos)'], ['medicamentos', 'Medicamentos, dispositivos e insumos (documentos)'], ['infraestructura', 'Infraestructura (carpeta, seguimiento y documentos)'], ['historia_clinica', 'Historia clínica y registros (carpeta y documentos)']]
}
export const USER_MODULE_GROUPS = { ips: 'IPS', socorro: 'Operaciones Generales', estandares: 'Estándares transversales' }
// El plan contratado limita los módulos de todos (también del administrador).
export const inPlan = (user, m) => !user?.plan?.modules || user.plan.modules.includes(m)
export const hasModule = (user, mod) => {
  if (!user) return false
  if (!mod) return true
  const list = (Array.isArray(mod) ? mod : [mod]).filter((m) => inPlan(user, m))
  if (!list.length) return false
  if (user.role === 'administrador') return true
  const own = user.modules || []
  return list.some((m) => own.includes(m))
}
// ¿Puede ver una ruta o ítem del menú? roles del ítem + módulo habilitado + servicio de la sede.
// grantable: si el usuario tiene el módulo, lo ve aunque su rol no esté en roles.
export const canSee = (user, { roles, module, grantable = true, service } = {}) => {
  if (!user) return false
  if (module && !hasModule(user, module)) return false
  const roleOk = !roles || roles.includes(user.role) || (Boolean(module) && grantable && hasModule(user, module))
  return roleOk && (!service || siteHas(user, service))
}

// Módulos del sistema. Para sumar uno nuevo: agregarlo aquí con su menú y sus rutas en App.jsx.
export const MODULES = [
  { id: 'ips', label: 'IPS', fullLabel: 'Servicios de IPS', icon: MdLocalHospital, home: '/', visible: (u) => ownItems('ips', u).length > 0 },
  { id: 'socorro', label: 'Operaciones Generales', fullLabel: 'Operaciones Generales: Socorro y Educación', icon: MdEmergency, home: '/socorro', visible: (u) => ownItems('socorro', u).length > 0 },
  { id: 'estandares', label: 'Estándares', fullLabel: 'Estándares transversales de habilitación', icon: MdRule, home: '/estandares', visible: (u) => ownItems('estandares', u).length > 0 }
]
export const modulesForUser = (user) => MODULES.filter((m) => m.visible(user))

// Página de inicio según el rol y la sede.
export const homeFor = (user, preferred) => {
  if (!user) return '/'
  const first = (m) => ownItems(m, user)[0]?.to
  if (user.role === 'conductor' && canSee(user, { roles: FLEET_DASH, module: 'flota' })) return '/socorro/vehiculos'
  if (user.role === 'voluntario' && canSee(user, { roles: ['voluntario'], module: 'voluntario', grantable: false })) return '/socorro/voluntario'
  const order = [preferred, 'ips', 'socorro', 'estandares'].filter((m, i, a) => m && NAV[m] && a.indexOf(m) === i)
  return order.map(first).find(Boolean) || '/perfil'
}

export const moduleFromPath = (pathname) => (pathname.startsWith('/socorro') ? 'socorro' : pathname.startsWith('/estandares') ? 'estandares' : 'ips')

const SHARED = [
  {
    title: 'Administración',
    items: [
      { to: '/sedes', label: 'Sedes', icon: MdAccountTree, roles: ADMIN },
      { to: '/bodegas', label: 'Bodegas', icon: MdWarehouse, roles: ADMIN },
      { to: '/servicios-ips', label: 'Servicios de IPS', icon: MdHealing, roles: ADMIN },
      { to: '/usuarios', label: 'Usuarios', icon: MdPeople, roles: ADMIN },
      { to: '/configuracion', label: 'Configuración', icon: MdSettings, roles: ADMIN }
    ]
  },
  {
    title: 'Cuenta',
    items: [{ to: '/perfil', label: 'Mi perfil', icon: MdPerson, roles: EVERYONE }, { to: '/firma', label: 'Mi firma digital', icon: MdDraw, roles: EVERYONE }]
  }
]

const NAV = {
  ips: [
    { title: 'General', items: [{ to: '/', label: 'Dashboard', icon: MdDashboard, roles: ALL, end: true, module: 'ips_dashboard', service: 'any' }] },
    {
      title: 'Citologías',
      items: [
        { to: '/citologias/registrar', label: 'Registrar citología', icon: MdNoteAdd, roles: STAFF, service: 'citologia', module: 'citologias' },
        { to: '/citologias/consultar', label: 'Consultar citologías', icon: MdManageSearch, roles: STAFF, service: 'citologia', module: 'citologias' },
        { to: '/citologias/configuracion', label: 'Configuración', icon: MdTune, roles: ADMIN, service: 'citologia' }
      ]
    },
    { title: 'Traslado asistencial', items: [{ to: '/traslado-asistencial', label: 'Ambulancias', icon: MdAirportShuttle, roles: ['administrador', 'conductor'], service: 'ambulancias', module: 'traslado', grantable: false }] },
    { title: 'Cadena de frío', items: [{ to: '/temperatura', label: 'Registro de temperatura', icon: MdThermostat, roles: STAFF, service: 'cadena_frio', module: 'temperatura', end: true }, { to: '/temperatura/configuracion', label: 'Configuración', icon: MdTune, roles: ADMIN, service: 'cadena_frio' }] },
    { title: 'Equipos e infraestructura', items: [{ to: '/equipos', label: 'Hoja de vida de equipos', icon: MdMedicalServices, roles: STAFF, service: 'any', module: 'equipos' }] },
    ...SHARED
  ],
  socorro: [
    {
      title: 'General',
      items: [
        { to: '/socorro', label: 'Dashboard', icon: MdDashboard, roles: ALL, end: true, module: 'og_dashboard' },
        { to: '/socorro/voluntario', label: 'Mi panel de voluntario', icon: MdVolunteerActivism, roles: ['voluntario'], module: 'voluntario', grantable: false }
      ]
    },
    { title: 'Socorro', items: [{ to: '/socorro/eventos', label: 'Eventos y emergencias', icon: MdEmergency, roles: EVENTS, module: 'socorro' }] },
    { title: 'Educación', items: [{ to: '/socorro/educacion', label: 'Actividades de educación', icon: MdSchool, roles: EVENTS, module: 'educacion' }] },
    { title: 'Personas', items: [{ to: '/socorro/personas', label: 'Personas / voluntarios', icon: MdBadge, roles: STAFF, module: 'personas', end: true }, { to: '/socorro/personas/reporte', label: 'Reporte de voluntarios', icon: MdInsights, roles: STAFF, module: 'reporte_voluntarios' }] },
    {
      title: 'Inventario y bodegas',
      items: [
        { to: '/socorro/inventario', label: 'Dashboard de inventario', icon: MdInventory2, roles: STAFF, end: true, module: 'inventario' },
        { to: '/socorro/inventario/existencias', label: 'Existencias por bodega', icon: MdWarehouse, roles: STAFF, module: 'inventario' },
        { to: '/socorro/inventario/movimientos', label: 'Movimientos y entregas', icon: MdSwapHoriz, roles: STAFF, module: 'inventario' },
        { to: '/socorro/inventario/productos', label: 'Catálogo de productos', icon: MdCategory, roles: STAFF, module: 'inventario' }
      ]
    },
    {
      title: 'Flota vehicular',
      items: [
        { to: '/socorro/vehiculos', label: 'Dashboard de flota', icon: MdSpeed, roles: FLEET_DASH, end: true, module: 'flota' },
        { to: '/socorro/vehiculos/flota', label: 'Vehículos', icon: MdDirectionsCar, roles: FLEET_VIEW, module: 'flota' },
        { to: '/socorro/vehiculos/preoperacional', label: 'Preoperacional', icon: MdFactCheck, roles: FLEET_VIEW, module: 'flota' },
        { to: '/socorro/vehiculos/reportes', label: 'Reportes diarios', icon: MdAssignment, roles: TRIPS, module: 'flota', grantable: false }
      ]
    },
    ...SHARED
  ],
  // Estándares transversales (Resolución 3100 de 2019). Cada estándar se suma como una sección.
  estandares: [
    { title: 'General', items: [{ to: '/estandares', label: 'Dashboard', icon: MdDashboard, roles: STAFF, end: true, module: ['talento_humano', 'procesos_prioritarios', 'interdependencia', 'medicamentos', 'infraestructura', 'historia_clinica'] }] },
    {
      title: '1. Talento humano',
      items: [
        { to: '/estandares/talento-humano', label: 'Dashboard', icon: MdDashboard, roles: STAFF, end: true, module: 'talento_humano' },
        { to: '/estandares/talento-humano/personal', label: 'Hojas de vida', icon: MdFolderShared, roles: STAFF, module: 'talento_humano' },
        { to: '/estandares/talento-humano/listado', label: 'Listado de talento humano', icon: MdGroups, roles: STAFF, module: 'talento_humano' },
        { to: '/estandares/talento-humano/instructivo', label: 'Instructivo y formatos', icon: MdMenuBook, roles: STAFF, module: 'talento_humano' },
        { to: '/estandares/talento-humano/configuracion', label: 'Cargos y requisitos', icon: MdTune, roles: ADMIN }
      ]
    },
    {
      title: '2. Infraestructura',
      items: [
        { to: '/estandares/infraestructura', label: 'Carpeta y seguimiento', icon: MdFactCheck, roles: STAFF, module: 'infraestructura', end: true },
        { to: '/estandares/infraestructura/documentos', label: 'Documentos', icon: MdFolderShared, roles: STAFF, module: 'infraestructura' }
      ]
    },
    { title: '3. Dotación', items: [{ to: '/equipos', label: 'Hoja de vida de equipos (IPS)', icon: MdMedicalServices, roles: STAFF, service: 'any', module: 'equipos' }] },
    { title: '4. Medicamentos y dispositivos', items: [{ to: '/estandares/medicamentos', label: 'Documentos e inventario', icon: MdMedication, roles: STAFF, module: 'medicamentos' }] },
    { title: '5. Procesos prioritarios', items: [{ to: '/estandares/procesos-prioritarios', label: 'Documentos y formatos', icon: MdAccountTree, roles: STAFF, module: 'procesos_prioritarios' }] },
    {
      title: '6. Historia clínica y registros',
      items: [
        { to: '/estandares/historia-clinica', label: 'Carpeta obligatoria', icon: MdFactCheck, roles: STAFF, module: 'historia_clinica', end: true },
        { to: '/estandares/historia-clinica/documentos', label: 'Documentos', icon: MdFolderShared, roles: STAFF, module: 'historia_clinica' }
      ]
    },
    {
      title: '7. Interdependencia',
      items: [
        { to: '/estandares/interdependencia', label: 'Carpeta obligatoria', icon: MdFactCheck, roles: STAFF, module: 'interdependencia', end: true },
        { to: '/estandares/interdependencia/documentos', label: 'Documentos', icon: MdFolderShared, roles: STAFF, module: 'interdependencia' }
      ]
    },
    ...SHARED
  ]
}

export const NAV_SECTIONS = NAV.ips
export const navSectionsFor = (moduleId) => NAV[moduleId] || NAV.ips

export const ROUTE_ROLES = { ADMIN, STAFF, ALL, EVERYONE, EVENTS, FLEET_VIEW, FLEET_DASH, TRIPS }
export const FLEET_ICON = MdLocalShipping
export const INVENTORY_ICON = MdInventory2

export const navForUser = (user, moduleId = 'ips') =>
  navSectionsFor(moduleId)
    .map((s) => ({ ...s, items: s.items.filter((i) => canSee(user, i)) }))
    .filter((s) => s.items.length)
// Primera página del módulo que el usuario puede ver (para el selector de módulos).
export const moduleHome = (user, moduleId) => ownItems(moduleId, user)[0]?.to || MODULES.find((m) => m.id === moduleId)?.home || '/'
// Ítems propios del módulo (sin Administración ni Cuenta), para saber si el usuario lo ve.
function ownItems (moduleId, user) { return (NAV[moduleId] || []).filter((s) => !SHARED.includes(s)).flatMap((s) => s.items).filter((i) => canSee(user, i)) }

export const can = {
  registerData: (role) => STAFF.includes(role),
  viewPatients: (role) => STAFF.includes(role),
  manageUsers: (role) => ADMIN.includes(role),
  manageSettings: (role) => ADMIN.includes(role),
  manageInventoryItems: (role) => ADMIN.includes(role),
  deletePeople: (role) => ADMIN.includes(role),
  manageVehicles: (role) => ADMIN.includes(role),
  driverReports: (role) => TRIPS.includes(role),
  createTrips: (role) => role === 'conductor',
  manageInventory: (role) => ADMIN.includes(role),
  manageEquipment: (role) => ADMIN.includes(role),
  events: (role) => EVENTS.includes(role)
}
