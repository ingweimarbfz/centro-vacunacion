import React, { Suspense, useEffect, useRef, useState } from 'react'
import { Link, NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { MdMenu, MdChevronRight, MdLogout, MdPerson, MdKeyboardArrowDown, MdPlace } from 'react-icons/md'
import { useAuth } from '../context/AuthContext'
import { useSettings } from '../context/SettingsContext'
import { navForUser, navSectionsFor, ROLE_LABELS, MODULES, moduleFromPath, modulesForUser, moduleHome, moduleTabFor, canSee, SITE_TYPES } from '../utils/permissions'
import api, { getSiteFilter, setSiteFilter } from '../api/client'
import { Avatar, Spinner } from '../components/ui'
import GlobalSearch from '../components/GlobalSearch'
import TemperatureReminder from '../components/TemperatureReminder'
import { UpgradeButton } from '../components/UpgradePlan'
import { IntegraSignature } from '../components/IntegraLogo'

const NAV_OPEN_KEY = 'cv:nav-open'
const titleFor = (pathname, moduleId) => {
  for (const s of navSectionsFor(moduleId)) {
    for (const i of s.items) {
      if (i.end ? pathname === i.to : pathname.startsWith(i.to)) return { section: s.title, title: i.label }
    }
  }
  // Páginas que no están en el menú (recibos y contratos de Educación).
  const extra = [['/educacion/recibos', 'Finanzas', 'Recibo de caja'], ['/educacion/facturas', 'Finanzas', 'Factura'], ['/educacion/clases', 'Estudiantes', 'Asistencia de la clase'], ['/educacion/certificados/', 'Estudiantes', 'Certificado'], ['/educacion/grupos/', 'Oferta académica', 'Aula del grupo'], ['/educacion/contratos', 'Estudiantes', 'Contrato de matrícula']].find(([p]) => pathname.startsWith(p))
  if (extra) return { section: extra[1], title: extra[2] }
  return { section: '', title: '' }
}

// Recuerda el último módulo usado para volver a él al iniciar sesión.
export const MODULE_KEY = 'cv_module'
const rememberModule = (id) => { try { localStorage.setItem(MODULE_KEY, id) } catch { /* sin almacenamiento */ } }

const ModuleSwitch = ({ current, user }) => {
  const navigate = useNavigate()
  const mods = modulesForUser(user)
  if (mods.length < 2) return null
  return (
    <div className={`module-switch${mods.length > 2 ? ' stacked' : ''}`} role="tablist" aria-label="Módulo del sistema">
      {mods.map((m) => (
        <button key={m.id} type="button" role="tab" aria-selected={current === m.id} title={m.fullLabel}
          className={current === m.id ? 'on' : ''} onClick={() => { rememberModule(m.id); navigate(moduleHome(user, m.id)) }}>
          <m.icon /> {m.label}
        </button>
      ))}
    </div>
  )
}

// Fecha corta: "Mié, 11 Nov 2026" (mes con tres letras).
const todayLabel = (() => {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('es-CO', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'America/Bogota' }).formatToParts(new Date()).map((p) => [p.type, p.value]))
  const cap = (x) => x.replace('.', '').charAt(0).toUpperCase() + x.replace('.', '').slice(1, 3)
  return `${cap(parts.weekday)}, ${parts.day} ${cap(parts.month)} ${parts.year}`
})()

// Selector de sede del administrador: "Todas las sedes" o un municipio en particular.
const SiteSelector = ({ value, onChange }) => {
  const [sites, setSites] = useState([])
  useEffect(() => { api.get('/sedes', { params: { sede: undefined } }).then(({ data }) => setSites(data)).catch(() => {}) }, [])
  return (
    <label className="site-select" title="Filtrar la información por sede">
      <MdPlace />
      <select value={value || ''} onChange={(e) => onChange(Number(e.target.value) || null)} aria-label="Sede">
        <option value="">Todas las sedes</option>
        {Object.entries(SITE_TYPES).map(([t, label]) => {
          const group = sites.filter((s) => s.type === t)
          return group.length ? <optgroup key={t} label={label}>{group.map((s) => <option key={s.id} value={s.id}>{s.name}{s.active ? '' : ' (inactiva)'}</option>)}</optgroup> : null
        })}
      </select>
    </label>
  )
}

const UserMenu = () => {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const onClick = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  return (
    <div className="user-menu" ref={ref}>
      <button type="button" className="user-menu-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <Avatar user={user} />
        <span className="who hide-sm">
          <strong>{user.fullName}</strong>
          <span>{ROLE_LABELS[user.role]}</span>
        </span>
        <MdKeyboardArrowDown />
      </button>
      {open && (
        <div className="dropdown" role="menu">
          <button type="button" onClick={() => { setOpen(false); navigate('/perfil') }}><MdPerson /> Mi perfil</button>
          <hr />
          <button type="button" className="danger" onClick={logout}><MdLogout /> Cerrar sesión</button>
        </div>
      )}
    </div>
  )
}

const AppLayout = () => {
  const { user, logout } = useAuth()
  const { settings, logo } = useSettings()
  const { pathname } = useLocation()
  const [open, setOpen] = useState(false)
  // En escritorio el botón de menú contrae o expande el menú lateral (se recuerda); en celular abre el menú.
  const [collapsed, setCollapsed] = useState(() => { try { return localStorage.getItem('cv_sidebar') === 'off' } catch { return false } })
  const toggleMenu = () => {
    if (window.matchMedia('(max-width: 1024px)').matches) { setOpen(true); return }
    setCollapsed((c) => { try { localStorage.setItem('cv_sidebar', c ? 'on' : 'off') } catch { /* sin almacenamiento */ } return !c })
  }
  // Perfil, usuarios y configuración son compartidos: conservan el módulo en el que se estaba.
  const shared = ['/perfil', '/firma', '/mis-notificaciones', '/usuarios', '/configuracion', '/legal'].some((p) => pathname.startsWith(p))
  const [moduleId, setModuleId] = useState(() => {
    if (!shared) return moduleFromPath(pathname)
    const own = modulesForUser(user).map((m) => m.id)
    let saved = null
    try { saved = localStorage.getItem(MODULE_KEY) } catch { /* sin almacenamiento */ }
    return own.includes(saved) ? saved : own[0] || 'ips'
  })
  useEffect(() => { if (!shared) { const m = moduleFromPath(pathname); setModuleId(m); rememberModule(m) } }, [pathname, shared])
  // Pestañas internas del módulo (Calidad IPS y Estándares → Estándares / Doc. Generales).
  const tab = moduleTabFor(moduleId, pathname)
  const navigate = useNavigate()
  const tabsVisible = (MODULES.find((m) => m.id === moduleId)?.tabs || []).map((t) => ({ ...t, first: navSectionsFor(moduleId).filter((s) => s.tab === t.id).flatMap((s) => s.items).find((i) => canSee(user, i)) })).filter((t) => t.first)
  const sections = navForUser(user, moduleId, tabsVisible.length > 1 ? tab : null)
  const admin = user.role === 'administrador'
  const [site, setSite] = useState(() => (admin ? getSiteFilter() : null))
  const changeSite = (id) => { setSiteFilter(id); setSite(id) }
  // Otros componentes (p. ej. el resumen por sede) pueden pedir cambiar la sede.
  useEffect(() => {
    if (!admin) return undefined
    const onSet = (e) => { setSiteFilter(e.detail); setSite(e.detail) }
    window.addEventListener('cv:set-site', onSet)
    return () => window.removeEventListener('cv:set-site', onSet)
  }, [admin])
  const { section, title } = titleFor(pathname, moduleId)
  // Primera página de la sección actual, para el enlace de la miga de pan.
  const sectionHome = sections.find((s) => s.title === section)?.items[0]?.to
  // Selector de sede: en escritorio va en la barra superior; en celular y tableta, en el menú lateral.
  const siteControl = admin
    ? <SiteSelector value={site} onChange={changeSite} />
    : user.site && <span className="site-chip" title={SITE_TYPES[user.site.type]}><MdPlace /> {user.site.name}</span>
  const currentModule = MODULES.find((m) => m.id === moduleId)

  useEffect(() => setOpen(false), [pathname])

  // Menú desplegable: cada sección (salvo General) se abre o se cierra; solo una abierta a la vez.
  // Al navegar se abre la sección de la página actual.
  const activeSection = sections.find((s) => s.items.some((i) => (i.end ? pathname === i.to : pathname.startsWith(i.to))))?.title || null
  const navKey = `${NAV_OPEN_KEY}:${moduleId}`
  const [openSection, setOpenSection] = useState(() => {
    try { return localStorage.getItem(navKey) || activeSection } catch { return activeSection }
  })
  useEffect(() => { if (activeSection && activeSection !== 'General') setOpenSection(activeSection) }, [activeSection, moduleId])
  useEffect(() => { try { if (openSection) localStorage.setItem(navKey, openSection); else localStorage.removeItem(navKey) } catch { /* sin almacenamiento */ } }, [openSection, navKey])
  const toggleSection = (title) => setOpenSection((cur) => (cur === title ? null : title))

  return (
    <div className={`app${collapsed ? ' sidebar-off' : ''}`}>
      <aside className={`sidebar${open ? ' open' : ''}`}>
        <div className="sidebar-brand">
          {/* En Educación se muestra el logo del área (Configuración); si no hay uno cargado, el de la IPS. */}
          <img src={moduleId === 'educacion' && settings.eduLogoUrl ? settings.eduLogoUrl : logo} alt={settings.ipsName} />
        </div>
        <div className="sidebar-site">
          {siteControl}
        </div>
        <div className="module-wrap">
          <ModuleSwitch current={moduleId} user={user} />
          <span className="module-name">{currentModule.fullLabel}</span>
        </div>
        {tabsVisible.length > 1 && (
          <div className="module-tabs" role="tablist" aria-label="Sección del módulo">
            {tabsVisible.map((t) => <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => navigate(t.first.to)}>{t.label}</button>)}
          </div>
        )}
        <nav className="sidebar-nav" aria-label="Menú principal">
          {sections.filter((s) => s.title !== 'Cuenta').map((s) => {
            const fixed = s.title === 'General'
            const isOpen = fixed || openSection === s.title
            return (
              <div className={`nav-section${fixed ? '' : ' collapsible'}${isOpen ? ' is-open' : ''}${s.title === activeSection ? ' has-active' : ''}`} key={s.title}>
                {fixed
                  ? <div className="nav-section-title">{s.title}</div>
                  : (
                    <button type="button" className="nav-section-title nav-section-toggle" aria-expanded={isOpen} onClick={() => toggleSection(s.title)}>
                      <span>{s.title}</span>
                      {!isOpen && <small className="nav-section-count">{s.items.length}</small>}
                      <MdKeyboardArrowDown className="nav-section-chevron" />
                    </button>
                    )}
                {isOpen && s.items.map((i) => (
                  <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                    <i.icon /> {i.label}
                  </NavLink>
                ))}
              </div>
            )
          })}
        </nav>
        <div className="sidebar-footer">
          {/* Cuenta: fuera del menú, siempre al pie, encima del usuario. */}
          <nav className="sidebar-account" aria-label="Cuenta">
            {(sections.find((s) => s.title === 'Cuenta')?.items || []).map((i) => (
              <NavLink key={i.to} to={i.to} end={i.end} className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}>
                <i.icon /> {i.label}
              </NavLink>
            ))}
          </nav>
          <div className="sidebar-user">
            <Avatar user={user} size="sm" />
            <div className="sidebar-user-info">
              <strong>{user.fullName}</strong>
              <span>{ROLE_LABELS[user.role]}</span>
            </div>
            <button type="button" className="btn btn-ghost btn-icon" title="Cerrar sesión" aria-label="Cerrar sesión" onClick={logout}>
              <MdLogout />
            </button>
          </div>
          <UpgradeButton compact />
          <IntegraSignature />
        </div>
      </aside>
      <div className={`backdrop${open ? ' show' : ''}`} onClick={() => setOpen(false)} />

      <div className="main">
        <div className="topbar-wrap">
          <header className="topbar">
            <button type="button" className="btn btn-ghost btn-icon menu-toggle" onClick={toggleMenu} aria-label={collapsed ? 'Mostrar menú' : 'Menú'} title={collapsed ? 'Mostrar menú lateral' : 'Ocultar menú lateral'}><MdMenu /></button>
            <div className="topbar-title">
              <small>{currentModule.fullLabel}{section ? ` · ${section}` : ''}</small>
              <strong>{title || settings.shortName}</strong>
            </div>
            {user.role !== 'estudiante' && <GlobalSearch />}
            <span className="topbar-spacer" />
            <span className="topbar-date hide-md">{todayLabel}</span>
            <div className="topbar-site">{siteControl}</div>
            <UserMenu />
          </header>
          {/* Escritorio: dónde está el usuario, en una franja fija bajo la barra superior. */}
          <nav className="topbar-crumbs" aria-label="Miga de pan">
            <Link to={moduleHome(user, moduleId)}>{currentModule.fullLabel}</Link>
            {section && section !== 'General' && (
              <>
                <MdChevronRight className="topbar-crumbs-sep" aria-hidden="true" />
                {sectionHome && sectionHome !== pathname ? <Link to={sectionHome}>{section}</Link> : <span>{section}</span>}
              </>
            )}
            <MdChevronRight className="topbar-crumbs-sep" aria-hidden="true" />
            <strong aria-current="page">{title || settings.shortName}</strong>
          </nav>
        </div>
        <main className="content">
          {/* Al cambiar de sede se recargan los datos de la página actual. */}
          <Suspense fallback={<div className="splash" style={{ minHeight: 240 }}><Spinner /></div>}><Outlet key={site || 'all'} /></Suspense>
          <TemperatureReminder key={`rem-${site || 'all'}`} />
        </main>
      </div>
    </div>
  )
}

export default AppLayout
