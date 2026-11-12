import React, { useEffect, useState } from 'react'
import {
  MdCheck, MdArrowForward, MdStarBorder, MdVolunteerActivism, MdRemove, MdLocalHospital, MdRule, MdInventory2, MdDraw, MdApartment, MdReceiptLong, MdFolderShared,
  MdShield, MdCloudDone, MdPhoneIphone, MdNotificationsActive, MdThermostat, MdGroups, MdWarning, MdError, MdTrendingUp
} from 'react-icons/md'
import papi, { cop } from './api'
import { Splash } from './ui'
import './platform.css'
import logoDark from '../assets/integraLogoDark.svg'

const MODULES = [
  [MdLocalHospital, 'Servicios de IPS', 'Vacunación con carnet firmado y recordatorios de próxima dosis, citologías, cadena de frío con 4 lecturas diarias y alertas, hoja de vida de equipos y traslado asistencial.'],
  [MdReceiptLong, 'Facturación y convenios', 'Servicios facturables con tarifario, impuestos colombianos, convenios con EPS y empresas, cuentas de cobro y envío de facturas por correo y WhatsApp.'],
  [MdRule, 'Estándares de habilitación', 'Talento humano, infraestructura, dotación, medicamentos, procesos prioritarios, historia clínica e interdependencia, con carpetas obligatorias y listas de chequeo.'],
  [MdFolderShared, 'Calidad IPS', 'Documentos generales por ítem y carpetas, vigencias, y documentos en línea (misión, visión, políticas) escritos con editor de texto.'],
  [MdInventory2, 'Inventario y flota', 'Bodegas, lotes y fechas de vencimiento, consumo desde vacunación, entregas a servicios, vehículos, preoperacionales y reportes diarios.'],
  [MdVolunteerActivism, 'Socorro y voluntariado', 'Eventos y emergencias, educación, horas y seguro de cada voluntario, y reportes por agrupación y sede.'],
  [MdDraw, 'Firmas digitales', 'Cada documento se firma con la firma digital de quien corresponde; los pendientes aparecen en su dashboard.'],
  [MdApartment, 'Multisede', 'Seccional, unidades y grupos con información separada por sede y una vista consolidada para la dirección.']
]
const WHY = [[MdShield, 'Lista para la visita de verificación'], [MdNotificationsActive, 'Alertas antes de que algo venza'], [MdCloudDone, 'En la nube, sin instalar nada'], [MdPhoneIphone, 'Funciona en computador y celular']]

// Vista de ejemplo del dashboard (ilustración con datos de muestra).
const DashboardMock = () => (
  <div className="pf-mock">
    <div className="pf-mock-bar"><span /><span /><span /><em>Dashboard · Estándares transversales</em></div>
    <div className="pf-mock-body">
      <div className="pf-mock-kpis">
        <div><small>Cumplimiento general</small><b>92%</b><i className="up"><MdTrendingUp /> +8 pts</i></div>
        <div><small>Alertas críticas</small><b>3</b><i className="bad">por atender</i></div>
        <div><small>Certificados por vencer</small><b>7</b><i className="warn">próximos 30 días</i></div>
        <div><small>Firmas pendientes</small><b>4</b><i>de esta semana</i></div>
      </div>
      <div className="pf-mock-grid">
        <div className="pf-mock-card">
          <h4>Cumplimiento por estándar</h4>
          {[['Talento humano', 96], ['Infraestructura', 90], ['Dotación', 88], ['Medicamentos', 100], ['Historia clínica', 86], ['Interdependencia', 75]].map(([n, v]) => (
            <div key={n} className="pf-mock-row"><span>{n}</span><div><i style={{ width: `${v}%`, background: v >= 90 ? '#8B5CF6' : v >= 80 ? '#A78BFA' : '#F59E0B' }} /></div><b>{v}%</b></div>
          ))}
        </div>
        <div className="pf-mock-card">
          <h4>Alertas y notificaciones</h4>
          <ul>
            <li><MdError className="bad" /> Contrato de mantenimiento biomédico vencido</li>
            <li><MdWarning className="warn" /> Curso de soporte vital de 2 profesionales vence en 12 días</li>
            <li><MdWarning className="warn" /> Certificado de bomberos vence el 09/12</li>
            <li><MdError className="bad" /> Falta el acta del comité de historias clínicas</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
)
const ColdChainMock = () => (
  <div className="pf-mock small">
    <div className="pf-mock-bar"><span /><span /><span /><em>Cadena de frío · noviembre</em></div>
    <div className="pf-mock-body">
      <div className="pf-mock-chart">{[4.1, 4.6, 5.2, 4.8, 3.9, 4.4, 6.1, 5.5, 4.7, 4.2, 4.9, 5.8, 5.1, 4.3].map((v, i) => <i key={i} style={{ height: `${(v / 8) * 100}%` }} className={v > 6 ? 'hi' : ''} />)}</div>
      <div className="pf-mock-legend"><span><MdThermostat /> Rango +2 a +8 °C</span><span>28 registros · 0 fuera de rango</span></div>
    </div>
  </div>
)
const PeopleMock = () => (
  <div className="pf-mock small">
    <div className="pf-mock-bar"><span /><span /><span /><em>Talento humano</em></div>
    <div className="pf-mock-body">
      {[['Enfermera jefe', 100], ['Auxiliar · vacunación', 92], ['Bacterióloga', 71], ['Conductor ambulancia', 64]].map(([n, v]) => (
        <div key={n} className="pf-mock-person"><span className="av"><MdGroups /></span><div><b>{n}</b><div className="pf-mock-meter"><i style={{ width: `${v}%`, background: v === 100 ? '#22C55E' : v >= 80 ? '#A78BFA' : '#F59E0B' }} /></div></div><em>{v}%</em></div>
      ))}
    </div>
  </div>
)

const Hero = () => (
  <>
    <section className="pf-hero">
      <div>
        <img src={logoDark} alt="Integra IPS" className="pf-hero-logo" />
        <div className="eyebrow">Sistema de información para IPS</div>
        <h2>Toda la operación de tu IPS y la habilitación de tus servicios, en un solo lugar.</h2>
        <p className="lead">Registra la atención y la vacunación, factura con convenios, controla el inventario y la cadena de frío y mantén al día los estándares de habilitación. El sistema te avisa antes de que algo venza, genera los formatos en PDF con tu logo y deja cada documento firmado digitalmente.</p>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <a className="pf-hero-cta" href="#planes">Ver planes <MdArrowForward /></a>
          <a className="pf-hero-ghost" href="mailto:?subject=Demostración%20Integra%20IPS">Solicitar una demostración</a>
        </div>
        <div className="pf-why">{WHY.map(([I, t]) => <span key={t}><I /> {t}</span>)}</div>
      </div>
      <DashboardMock />
    </section>
    <section className="pf-modules">
      <h3>¿Qué incluye el sistema?</h3>
      <div className="pf-mod-grid">{MODULES.map(([I, t, d]) => <div key={t} className="pf-mod"><span><I /></span><b>{t}</b><p>{d}</p></div>)}</div>
    </section>
    <section className="pf-shots">
      <div><h3>Información clara para decidir</h3><p>Cada módulo tiene su propio dashboard: cumplimiento, alertas y tendencias por sede, listos para presentar a la dirección o en la visita de verificación.</p></div>
      <ColdChainMock />
      <PeopleMock />
    </section>
  </>
)

// Página pública de precios: planes para IPS y plan para entidades sin ánimo de lucro, con pago mensual o anual.
const PricingPage = () => {
  const [d, setD] = useState(null)
  const [cycle, setCycle] = useState('mensual')
  useEffect(() => { papi.get('/plataforma/precios').then(({ data }) => setD(data)).catch(() => setD({ plans: [], groups: {} })) }, [])
  useEffect(() => { const t = document.title; document.title = 'Planes y precios · Integra IPS'; return () => { document.title = t } }, [])
  if (!d) return <div className="pf" style={{ background: '#140A26' }}><Splash /></div>
  const ips = d.plans.filter((p) => p.audience === 'ips')
  const esal = d.plans.filter((p) => p.audience === 'esal')
  const disc = ips[0]?.annualDiscount ?? 16.7
  const price = (p) => (cycle === 'anual' ? p.priceYearMonthly : p.priceMonth)
  const allFeatures = [...new Map(d.plans.flatMap((p) => p.featureLabels).map((f) => [f.key, f])).values()]
  const groups = Object.entries(d.groups || {}).map(([g, l]) => [g, l, allFeatures.filter((f) => f.group === g).sort((a, b) => a.sortOrder - b.sortOrder)]).filter(([, , fs]) => fs.length)
  const limits = (p) => [p.maxSites ? `${p.maxSites} sede${p.maxSites === 1 ? '' : 's'}` : 'Sedes ilimitadas', p.maxUsers ? `${p.maxUsers} usuarios` : 'Usuarios ilimitados'].join(' · ')

  const Tier = ({ p }) => (
    <div className={`pf-tier${p.highlight ? ' hl' : ''}`}>
      {p.highlight && <div className="ribbon"><MdStarBorder style={{ fontSize: 17 }} /> {p.badge || 'Recomendado'}</div>}
      <h3>{p.name}</h3>
      <p className="tag">{p.tagline}</p>
      <div className="amount">{cop(price(p))}<small>/mes</small></div>
      <div className="note">{cycle === 'anual' ? `Pago anual de ${cop(p.priceYear)} · ${limits(p)}` : `Pago mensual · ${limits(p)}`}</div>
      <a className="cta" href={`mailto:?subject=${encodeURIComponent(`Plan ${p.name} (${cycle})`)}`}>Elegir {p.name} <MdArrowForward /></a>
      <hr />
      <ul>{p.bullets.map((b) => <li key={b}><MdCheck /> {b}</li>)}</ul>
      <div className="foot">Soporte: {p.support || 'Correo'}{p.storageGb ? ` · ${p.storageGb} GB de almacenamiento` : ''}</div>
    </div>
  )

  return (
    <div className="pf pf-pricing">
      <div className="wrap">
        <Hero />

        <div className="top" id="planes">
          <div>
            <div className="eyebrow">Planes y precios</div>
            <h1>Un plan para cada etapa de tu IPS</h1>
          </div>
          <div className="pf-cycle" role="tablist" aria-label="Ciclo de pago">
            <button type="button" className={cycle === 'mensual' ? 'on' : ''} onClick={() => setCycle('mensual')}>Mensual</button>
            <button type="button" className={cycle === 'anual' ? 'on' : ''} onClick={() => setCycle('anual')}>Anual <em>−{String(disc).replace('.', ',')} %</em></button>
          </div>
        </div>
        <p className="lead">Servicios de IPS, estándares de habilitación e inventario en una sola plataforma. Elige el plan según el tamaño de tu operación; con pago anual obtienes dos meses gratis.</p>

        <div className="pf-tiers">{ips.map((p) => <Tier key={p.id} p={p} />)}</div>

        {esal.map((p) => (
          <div key={p.id} className="pf-esal">
            <div className="l">
              <span className="pill"><MdVolunteerActivism /> {p.badge || 'Solo entidades sin ánimo de lucro'}</span>
              <h3>Plan {p.name}</h3>
              <p style={{ color: 'var(--p-200)', lineHeight: 1.6, margin: '0 0 20px' }}>{p.tagline} Incluye socorro, eventos y emergencias, educación y la gestión completa del voluntariado, además de todos los módulos de IPS y estándares.</p>
              <div className="amount" style={{ fontSize: 40, fontWeight: 700, color: '#fff' }}>{cop(price(p))}<small style={{ fontSize: 16, color: 'var(--p-200)', fontWeight: 500 }}> /mes</small></div>
              <div style={{ color: 'var(--p-300)', fontSize: 13, margin: '6px 0 20px' }}>{cycle === 'anual' ? `Pago anual de ${cop(p.priceYear)}` : 'Pago mensual'} · {limits(p)}</div>
              <a className="pbtn" style={{ background: '#B9F6CA', color: '#0B3B1E', height: 48, padding: '0 22px', borderRadius: 12 }} href={`mailto:?subject=${encodeURIComponent(`Plan ${p.name} (${cycle})`)}`}>Solicitar plan {p.name} <MdArrowForward /></a>
              <p style={{ color: 'var(--p-300)', fontSize: 12.5, marginTop: 14 }}>Requiere certificado de existencia como entidad sin ánimo de lucro.</p>
            </div>
            <div className="r">
              <ul>{p.bullets.slice(0, 2).map((b) => <li key={b}><MdCheck /> {b}</li>)}
                {p.featureLabels.filter((f) => f.group === 'voluntariado').map((f) => <li key={f.key}><MdCheck /> {f.label}</li>)}</ul>
            </div>
          </div>
        ))}

        <div className="pf-compare">
          <h2>Compara los planes</h2>
          <div style={{ overflowX: 'auto' }}>
            <table>
              <thead><tr><th>Funcionalidad</th>{d.plans.map((p) => <th key={p.id}>{p.name}</th>)}</tr></thead>
              <tbody>
                <tr><td>Precio {cycle === 'anual' ? '(mes, pago anual)' : 'mensual'}</td>{d.plans.map((p) => <td key={p.id}><b>{cop(price(p))}</b></td>)}</tr>
                <tr><td>Sedes</td>{d.plans.map((p) => <td key={p.id}>{p.maxSites || 'Ilimitadas'}</td>)}</tr>
                <tr><td>Usuarios</td>{d.plans.map((p) => <td key={p.id}>{p.maxUsers || 'Ilimitados'}</td>)}</tr>
                {groups.map(([g, l, fs]) => (
                  <React.Fragment key={g}>
                    <tr className="grp"><td colSpan={d.plans.length + 1}>{l}</td></tr>
                    {fs.map((f) => <tr key={f.key}><td>{f.label}</td>{d.plans.map((p) => <td key={p.id}>{p.features.includes(f.key) ? <MdCheck className="yes" /> : <MdRemove className="no" />}</td>)}</tr>)}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <p style={{ color: 'var(--p-300)', fontSize: 12.5, marginTop: 30 }}>Precios en pesos colombianos. El plan Humanitario se ofrece únicamente a entidades sin ánimo de lucro.</p>
      </div>
    </div>
  )
}

export default PricingPage
