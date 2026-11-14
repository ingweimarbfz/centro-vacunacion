import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts'
import {
  MdAdd, MdEdit, MdDelete, MdSave, MdCheck, MdErrorOutline, MdApartment, MdPayments, MdTrendingUp, MdWorkspacePremium, MdEventRepeat,
  MdVerified, MdVolunteerActivism, MdStar, MdExtension, MdClose, MdHome, MdGavel, MdRocketLaunch
} from 'react-icons/md'
import { OrgLegalModal } from './legalPages'
import papi, { perror, cop, fdate, WEB_URL } from './api'
import { Head, PCard, PModal, Splash, Spin, Field, useToast } from './ui'
import { PhoneInput, EmailInput, DocInput, NitInput } from '../components/inputs'

const AUD = { ips: 'IPS', esal: 'Sin ánimo de lucro', etdh: 'Institución ETDH' }
const STATUS = { prueba: ['En prueba', 'purple'], activa: ['Activa', 'ok'], suspendida: ['Suspendida', 'warn'], cancelada: ['Cancelada', 'bad'] }
const PURPLES = ['#7C4DDB', '#9B78EA', '#4C2889', '#BBA2F2', '#6233B3', '#2A1650']

// ======================================================================= Resumen
export const DashboardPage = () => {
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { papi.get('/plataforma/resumen').then(({ data }) => setD(data)).catch((e) => setErr(perror(e))) }, [])
  if (err) return <div className="palert bad"><MdErrorOutline /><span>{err}</span></div>
  if (!d) return <Splash />
  const k = d.kpis
  return (
    <>
      <Head title="Resumen" subtitle="Clientes, ingresos recurrentes y el plan de esta instalación" />
      <div className="pf-kpis">
        <div className="pf-card pf-kpi"><span>Organizaciones activas <MdApartment /></span><b>{k.active}</b><small>{k.organizations} en total · {k.trial} en prueba · {k.suspended} suspendidas</small></div>
        <div className="pf-card pf-kpi"><span>Ingreso mensual recurrente <MdPayments /></span><b>{cop(k.mrr)}</b><small>Anuales prorrateados por mes</small></div>
        <div className="pf-card pf-kpi"><span>Ingreso anual proyectado <MdTrendingUp /></span><b>{cop(k.arr)}</b><small>MRR × 12</small></div>
        <div className="pf-card pf-kpi"><span>Renovaciones (30 días) <MdEventRepeat /></span><b>{k.renewals}</b><small>{k.plans} planes activos</small></div>
      </div>
      <div className="pf-two">
        <PCard title="Organizaciones e ingreso por plan" icon={<MdWorkspacePremium style={{ color: 'var(--p-500)' }} />}>
          <div style={{ width: '100%', height: 260 }}><ResponsiveContainer>
            <BarChart data={d.byPlan} margin={{ left: 0, right: 10 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(v, n) => (n === 'MRR' ? cop(v) : v)} />
              <Bar dataKey="organizations" name="Organizaciones" radius={[6, 6, 0, 0]} isAnimationActive={false}>{d.byPlan.map((_, i) => <Cell key={i} fill={PURPLES[i % PURPLES.length]} />)}</Bar>
            </BarChart>
          </ResponsiveContainer></div>
          <table className="pf-table" style={{ marginTop: 8 }}>
            <thead><tr><th>Plan</th><th>Para</th><th>Clientes</th><th>MRR</th></tr></thead>
            <tbody>{d.byPlan.map((p) => <tr key={p.id}><td><b>{p.name}</b></td><td>{AUD[p.audience]}</td><td>{p.organizations}</td><td>{cop(p.mrr)}</td></tr>)}</tbody>
          </table>
        </PCard>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <PCard title="Esta instalación" subtitle="El plan define qué módulos ve el sistema" icon={<MdHome style={{ color: 'var(--p-500)' }} />}>
            {d.current ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div><b style={{ fontSize: 16 }}>{d.current.name}</b> <span className={`pbadge ${STATUS[d.current.status][1]}`}>{STATUS[d.current.status][0]}</span></div>
                <div>Plan <span className="pbadge purple">{d.current.plan?.name}</span> · pago {d.current.billingCycle} · renueva {fdate(d.current.renewalDate)}</div>
                <div className="sub" style={{ color: 'var(--muted)', fontSize: 12.5 }}>{d.current.modules?.length || 0} módulos habilitados en el sistema</div>
              </div>
            ) : <p style={{ margin: 0, color: 'var(--muted)' }}>Ninguna organización está marcada como “esta instalación”: el sistema muestra todos los módulos.</p>}
          </PCard>
          <PCard title="Próximas renovaciones" icon={<MdEventRepeat style={{ color: 'var(--p-500)' }} />} flush>
            {d.renewals.length === 0 ? <p style={{ padding: 20, margin: 0, color: 'var(--muted)' }}>Sin renovaciones en los próximos 30 días.</p> : (
              <table className="pf-table"><tbody>{d.renewals.map((o) => <tr key={o.id}><td><b>{o.name}</b><span className="sub">{o.planName} · {o.billingCycle}</span></td><td>{fdate(o.renewalDate)}</td><td>{cop(o.amount)}</td></tr>)}</tbody></table>
            )}
          </PCard>
          <PCard title="Por ciclo de pago">
            <div style={{ display: 'flex', gap: 10 }}>{d.byCycle.map((c) => <div key={c.name} className="pf-card" style={{ flex: 1, padding: 14 }}><small style={{ color: 'var(--muted)' }}>{c.name}</small><b style={{ display: 'block', fontSize: 22 }}>{c.value}</b></div>)}</div>
          </PCard>
        </div>
      </div>
    </>
  )
}

// ======================================================================= Planes
const EMPTY_PLAN = { code: '', name: '', tagline: '', audience: 'ips', priceMonth: '', annualDiscount: 16.7, maxSites: '', maxUsers: '', storageGb: '', support: '', highlight: false, badge: '', bullets: ['', '', '', ''], features: [], sortOrder: 0, active: true }
const annualOf = (m, d) => Math.round((Number(m) * 12 * (1 - Number(d) / 100)) / 100) * 100

const PlanForm = ({ initial, catalog, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => (editing ? { ...EMPTY_PLAN, ...initial, maxSites: initial.maxSites ?? '', maxUsers: initial.maxUsers ?? '', storageGb: initial.storageGb ?? '', badge: initial.badge || '', support: initial.support || '', tagline: initial.tagline || '', bullets: [...initial.bullets, '', '', '', ''].slice(0, Math.max(4, initial.bullets.length)) } : EMPTY_PLAN))
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const toggle = (key) => setF({ ...f, features: f.features.includes(key) ? f.features.filter((x) => x !== key) : [...f.features, key] })
  const groups = Object.entries(catalog.groups).map(([g, l]) => [g, l, catalog.features.filter((x) => x.group === g)])
  const save = async () => {
    setError('')
    if (!f.name.trim() || (!editing && !f.code.trim())) return setError('Escribe el código y el nombre del plan.')
    if (!(Number(f.priceMonth) >= 0) || f.priceMonth === '') return setError('Escribe el precio mensual.')
    setBusy(true)
    try { editing ? await papi.put(`/plataforma/planes/${initial.id}`, f) : await papi.post('/plataforma/planes', f); onSaved() } catch (e) { setError(perror(e)); setBusy(false) }
  }
  return (
    <PModal title={editing ? `Editar plan · ${initial.name}` : 'Nuevo plan'} onClose={onClose}
      footer={<><button type="button" className="pbtn outline" onClick={onClose}>Cancelar</button><button type="button" className="pbtn primary" onClick={save} disabled={busy}>{busy ? <Spin /> : <MdSave />} Guardar plan</button></>}>
      <div>
        <div className="pf-section-t">Datos del plan</div>
        <div className="pgrid">
          <Field label="Código"><input value={f.code} onChange={set('code')} disabled={editing} placeholder="integral" /></Field>
          <Field label="Nombre"><input value={f.name} onChange={set('name')} placeholder="Integral" /></Field>
          <Field label="Se ofrece a"><select value={f.audience} onChange={set('audience')}><option value="ips">IPS (cualquier prestador)</option><option value="esal">Solo entidades sin ánimo de lucro</option><option value="etdh">Institución educativa (ETDH)</option></select></Field>
          <Field label="Orden"><input type="number" min="0" step="1" value={f.sortOrder} onChange={set('sortOrder')} placeholder="1" /></Field>
          <Field label="Frase" full><input value={f.tagline} onChange={set('tagline')} placeholder="Toda la operación de tu IPS, conectada." /></Field>
        </div>
      </div>
      <div>
        <div className="pf-section-t">Precio</div>
        <div className="pgrid">
          <Field label="Precio mensual (COP)"><input type="number" min="0" step="100" value={f.priceMonth} onChange={set('priceMonth')} /></Field>
          <Field label="Descuento anual (%)" hint="16,7 % = 2 meses gratis"><input type="number" min="0" max="90" step="0.1" value={f.annualDiscount} onChange={set('annualDiscount')} /></Field>
          <Field label="Precio anual (calculado)"><input value={f.priceMonth === '' ? '' : `${cop(annualOf(f.priceMonth, f.annualDiscount))} · ${cop(annualOf(f.priceMonth, f.annualDiscount) / 12)}/mes`} readOnly /></Field>
        </div>
      </div>
      <div>
        <div className="pf-section-t">Límites y soporte</div>
        <div className="pgrid">
          <Field label="Sedes" hint="Vacío = ilimitadas"><input type="number" min="0" value={f.maxSites} onChange={set('maxSites')} /></Field>
          <Field label="Usuarios" hint="Vacío = ilimitados"><input type="number" min="0" value={f.maxUsers} onChange={set('maxUsers')} /></Field>
          <Field label="Almacenamiento (GB)"><input type="number" min="0" value={f.storageGb} onChange={set('storageGb')} /></Field>
          <Field label="Soporte"><input value={f.support} onChange={set('support')} placeholder="Correo y chat" /></Field>
        </div>
      </div>
      <div>
        <div className="pf-section-t">Tarjeta de precios</div>
        <div className="pgrid">
          <Field label="Puntos destacados (máx. 8)" full>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>{f.bullets.map((b, i) => (
              <div key={i} style={{ display: 'flex', gap: 6 }}><input value={b} onChange={(e) => setF({ ...f, bullets: f.bullets.map((x, j) => (j === i ? e.target.value : x)) })} placeholder={i === 1 ? 'Todo lo de …' : 'Punto destacado'} />
                <button type="button" className="pbtn ghost icon" onClick={() => setF({ ...f, bullets: f.bullets.filter((_, j) => j !== i) })} aria-label="Quitar"><MdClose /></button></div>
            ))}{f.bullets.length < 8 && <button type="button" className="pbtn outline sm" style={{ alignSelf: 'flex-start' }} onClick={() => setF({ ...f, bullets: [...f.bullets, ''] })}><MdAdd /> Agregar punto</button>}</div>
          </Field>
          <Field label="Etiqueta"><input value={f.badge} onChange={set('badge')} placeholder="Recomendado para tu IPS" /></Field>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'flex-end' }}>
            <label className="pswitch"><input type="checkbox" checked={f.highlight} onChange={set('highlight')} /> Plan destacado</label>
            <label className="pswitch"><input type="checkbox" checked={f.active} onChange={set('active')} /> Activo (se ofrece)</label>
          </div>
        </div>
      </div>
      <div>
        <div className="pf-section-t" style={{ display: 'flex', justifyContent: 'space-between' }}>Funcionalidades incluidas <span style={{ color: 'var(--muted)', textTransform: 'none', letterSpacing: 0 }}>{f.features.length} seleccionadas</span></div>
        <div className="pf-feat-groups">{groups.map(([g, l, items]) => (
          <div key={g}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <b style={{ fontSize: 13 }}>{l}</b>
              <button type="button" className="pbtn ghost sm" onClick={() => { const all = items.every((x) => f.features.includes(x.key)); setF({ ...f, features: all ? f.features.filter((k) => !items.some((x) => x.key === k)) : [...new Set([...f.features, ...items.map((x) => x.key)])] }) }}>{items.every((x) => f.features.includes(x.key)) ? 'Quitar todas' : 'Marcar todas'}</button>
            </div>
            <div className="pf-feat-grid">{items.map((x) => (
              <label key={x.key} className={`pf-feat${f.features.includes(x.key) ? ' on' : ''}`}><input type="checkbox" checked={f.features.includes(x.key)} onChange={() => toggle(x.key)} /><span>{x.label}{x.description && <small>{x.description}</small>}</span></label>
            ))}</div>
          </div>
        ))}</div>
        {f.audience === 'ips' && f.features.some((k) => catalog.features.find((x) => x.key === k)?.group === 'voluntariado') && <div className="palert info" style={{ marginTop: 10 }}>Este plan es para IPS e incluye funciones de voluntariado. Si deben ser exclusivas de entidades sin ánimo de lucro, quítalas o cambia el público.</div>}
      </div>
      {error && <div className="palert bad"><MdErrorOutline /><span>{error}</span></div>}
    </PModal>
  )
}

export const PlansPage = () => {
  const [plans, setPlans] = useState(null); const [catalog, setCatalog] = useState(null)
  const [modal, setModal] = useState(null); const [toast, toastNode] = useToast()
  const load = useCallback(() => Promise.all([papi.get('/plataforma/planes'), papi.get('/plataforma/funcionalidades')]).then(([a, b]) => { setPlans(a.data); setCatalog(b.data) }), [])
  useEffect(() => { load() }, [load])
  if (!plans || !catalog) return <Splash />
  const del = async () => { try { await papi.delete(`/plataforma/planes/${modal.del.id}`); setModal(null); toast('Plan eliminado'); load() } catch (e) { setModal(null); toast(perror(e), 'bad') } }
  return (
    <>
      <Head title="Planes" subtitle="Precio mensual y anual, límites y funcionalidades de cada plan">
        <a className="pbtn outline" href={`${WEB_URL}/precios`} target="_blank" rel="noreferrer">Ver página de precios</a>
        <button type="button" className="pbtn primary" onClick={() => setModal({ edit: {} })}><MdAdd /> Nuevo plan</button>
      </Head>
      <div className="pf-plans">{plans.map((p) => (
        <div key={p.id} className={`pf-card pf-plan${p.highlight ? ' hl' : ''}`} style={p.active ? undefined : { opacity: 0.6 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
            <h3 style={{ fontSize: 19 }}>{p.name}</h3>
            <span className={`pbadge ${p.audience === 'esal' ? 'ok' : 'purple'}`}>{p.audience === 'esal' ? <MdVolunteerActivism /> : <MdVerified />} {AUD[p.audience]}</span>
            <span className="sub" style={{ color: 'var(--muted)', fontSize: 12.5 }}>{p.tagline}</span>
          </div>
          <div className="price">{cop(p.priceMonth)} <small>/mes</small></div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: -6 }}>Anual: {cop(p.priceYear)} ({cop(p.priceYearMonthly)}/mes · −{p.annualDiscount}%)</div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {p.highlight && <span className="pbadge purple"><MdStar /> Destacado</span>}
            {!p.active && <span className="pbadge">Inactivo</span>}
            <span className="pbadge">{p.maxSites ? `${p.maxSites} sede${p.maxSites === 1 ? '' : 's'}` : 'Sedes ilimitadas'}</span>
            <span className="pbadge">{p.maxUsers ? `${p.maxUsers} usuarios` : 'Usuarios ilimitados'}</span>
            <span className="pbadge"><MdExtension /> {p.features.length} funciones</span>
          </div>
          <ul>{p.bullets.map((b) => <li key={b}><MdCheck /> {b}</li>)}</ul>
          <div style={{ display: 'flex', gap: 6, marginTop: 'auto' }}>
            <button type="button" className="pbtn outline sm" onClick={() => setModal({ edit: p })}><MdEdit /> Editar</button>
            <button type="button" className="pbtn ghost sm" style={{ color: 'var(--bad)' }} onClick={() => setModal({ del: p })}><MdDelete /> Eliminar</button>
          </div>
        </div>
      ))}</div>

      <div style={{ marginTop: 22 }}>
        <PCard title="Matriz de funcionalidades" subtitle="Qué incluye cada plan" flush>
          <div className="pf-tablewrap"><table className="pf-table">
            <thead><tr><th>Funcionalidad</th>{plans.map((p) => <th key={p.id} style={{ textAlign: 'center' }}>{p.name}</th>)}</tr></thead>
            <tbody>{Object.entries(catalog.groups).map(([g, l]) => (
              <React.Fragment key={g}>
                <tr><td colSpan={plans.length + 1} style={{ background: 'var(--p-50)', fontWeight: 700, color: 'var(--p-700)', fontSize: 12, textTransform: 'uppercase', letterSpacing: '.05em' }}>{l}</td></tr>
                {catalog.features.filter((x) => x.group === g).map((x) => (
                  <tr key={x.key}><td>{x.label}</td>{plans.map((p) => <td key={p.id} style={{ textAlign: 'center' }}>{p.features.includes(x.key) ? <MdCheck style={{ color: 'var(--p-600)', fontSize: 19 }} /> : <span style={{ color: 'var(--line)' }}>—</span>}</td>)}</tr>
                ))}
              </React.Fragment>
            ))}</tbody>
          </table></div>
        </PCard>
      </div>
      {modal?.edit && <PlanForm initial={modal.edit.id ? modal.edit : null} catalog={catalog} onClose={() => setModal(null)} onSaved={() => { setModal(null); toast('Plan guardado'); load() }} />}
      {modal?.del && <PModal title="Eliminar plan" size="sm" onClose={() => setModal(null)} footer={<><button type="button" className="pbtn outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="pbtn danger" onClick={del}><MdDelete /> Eliminar</button></>}>
        <p style={{ margin: 0 }}>¿Eliminar el plan <b>{modal.del.name}</b>? Si hay organizaciones con este plan no se podrá; desactívalo en su lugar.</p></PModal>}
      {toastNode}
    </>
  )
}

// ======================================================================= Funcionalidades
export const FeaturesPage = () => {
  const [c, setC] = useState(null); const [modal, setModal] = useState(null); const [toast, toastNode] = useToast()
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const load = useCallback(() => papi.get('/plataforma/funcionalidades').then(({ data }) => setC(data)), [])
  useEffect(() => { load() }, [load])
  if (!c) return <Splash />
  const save = async () => {
    setError(''); setBusy(true)
    const f = modal.edit
    try { f.isNew ? await papi.post('/plataforma/funcionalidades', f) : await papi.put(`/plataforma/funcionalidades/${f.key}`, f); setModal(null); toast('Funcionalidad guardada'); load() } catch (e) { setError(perror(e)) } finally { setBusy(false) }
  }
  const del = async (x) => { try { await papi.delete(`/plataforma/funcionalidades/${x.key}`); toast('Funcionalidad eliminada'); load() } catch (e) { toast(perror(e), 'bad') } }
  const f = modal?.edit; const set = (k) => (e) => setModal({ edit: { ...f, [k]: e.target.value } })
  return (
    <>
      <Head title="Funcionalidades" subtitle="Catálogo de lo que se puede incluir en un plan. Las que tienen módulo del sistema se habilitan o se ocultan según el plan.">
        <button type="button" className="pbtn primary" onClick={() => { setError(''); setModal({ edit: { isNew: true, key: '', label: '', group: 'ips', moduleKey: '', description: '', sortOrder: 0 } }) }}><MdAdd /> Nueva funcionalidad</button>
      </Head>
      <PCard flush>
        <div className="pf-tablewrap"><table className="pf-table">
          <thead><tr><th>Funcionalidad</th><th>Grupo</th><th>Módulo del sistema</th><th /></tr></thead>
          <tbody>{c.features.map((x) => (
            <tr key={x.key}>
              <td><b>{x.label}</b><span className="sub">{x.description}</span></td>
              <td><span className="pbadge purple">{x.groupLabel}</span></td>
              <td>{x.moduleKey ? <code style={{ fontSize: 12 }}>{x.moduleKey}</code> : <span className="sub">Informativa</span>}</td>
              <td className="act"><button type="button" className="pbtn ghost icon" onClick={() => { setError(''); setModal({ edit: { ...x, moduleKey: x.moduleKey || '', description: x.description || '' } }) }} aria-label="Editar"><MdEdit /></button><button type="button" className="pbtn ghost icon" style={{ color: 'var(--bad)' }} onClick={() => del(x)} aria-label="Eliminar"><MdDelete /></button></td>
            </tr>
          ))}</tbody>
        </table></div>
      </PCard>
      {f && (
        <PModal title={f.isNew ? 'Nueva funcionalidad' : `Editar · ${f.label}`} size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="pbtn outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="pbtn primary" onClick={save} disabled={busy}><MdSave /> Guardar</button></>}>
          {f.isNew && <Field label="Clave" hint="Sin espacios, p. ej. telemedicina"><input value={f.key} onChange={set('key')} /></Field>}
          <Field label="Nombre"><input value={f.label} onChange={set('label')} /></Field>
          <Field label="Grupo"><select value={f.group} onChange={set('group')}>{Object.entries(c.groups).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Módulo del sistema que habilita" hint="Vacío = funcionalidad informativa (no oculta nada)"><select value={f.moduleKey} onChange={set('moduleKey')}><option value="">—</option>{c.moduleKeys.map((k) => <option key={k} value={k}>{k}</option>)}</select></Field>
          <Field label="Descripción"><input value={f.description} onChange={set('description')} /></Field>
          <Field label="Orden"><input type="number" min="0" step="1" value={f.sortOrder} onChange={set('sortOrder')} placeholder="1" /></Field>
          {error && <div className="palert bad"><MdErrorOutline /><span>{error}</span></div>}
        </PModal>
      )}
      {toastNode}
    </>
  )
}

// ======================================================================= Organizaciones
const EMPTY_ORG = { name: '', nit: '', orgType: 'ips', city: '', contactName: '', contactEmail: '', contactPhone: '', planId: '', billingCycle: 'mensual', status: 'prueba', startDate: '', renewalDate: '', extraFeatures: [], isCurrent: false, notes: '' }
const OrgForm = ({ initial, plans, catalog, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => (editing ? Object.fromEntries(Object.keys(EMPTY_ORG).map((k) => [k, initial[k] ?? EMPTY_ORG[k]])) : EMPTY_ORG))
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const available = plans.filter((p) => p.active && (p.audience !== 'esal' || f.orgType === 'esal'))
  const plan = plans.find((p) => String(p.id) === String(f.planId))
  const extras = catalog.features.filter((x) => !plan?.features.includes(x.key))
  const save = async () => {
    setError('')
    if (!f.name.trim()) return setError('Escribe el nombre de la organización.')
    setBusy(true)
    try { editing ? await papi.put(`/plataforma/organizaciones/${initial.id}`, f) : await papi.post('/plataforma/organizaciones', f); onSaved() } catch (e) { setError(perror(e)); setBusy(false) }
  }
  return (
    <PModal title={editing ? `Editar · ${initial.name}` : 'Nueva organización'} onClose={onClose}
      footer={<><button type="button" className="pbtn outline" onClick={onClose}>Cancelar</button><button type="button" className="pbtn primary" onClick={save} disabled={busy}>{busy ? <Spin /> : <MdSave />} Guardar</button></>}>
      <div><div className="pf-section-t">Organización</div>
        <div className="pgrid">
          <Field label="Nombre" full><input value={f.name} onChange={set('name')} /></Field>
          <Field label="NIT"><NitInput value={f.nit} onChange={set('nit')} /></Field>
          <Field label="Tipo"><select value={f.orgType} onChange={set('orgType')}><option value="ips">IPS</option><option value="esal">Entidad sin ánimo de lucro</option><option value="etdh">Institución educativa (ETDH)</option></select></Field>
          <Field label="Ciudad"><input value={f.city} onChange={set('city')} /></Field>
          <Field label="Contacto"><input value={f.contactName} onChange={set('contactName')} /></Field>
          <Field label="Correo"><EmailInput value={f.contactEmail} onChange={set('contactEmail')} /></Field>
          <Field label="Teléfono"><PhoneInput value={f.contactPhone} onChange={set('contactPhone')} /></Field>
        </div>
      </div>
      <div><div className="pf-section-t">Suscripción</div>
        <div className="pgrid">
          <Field label="Plan" hint={f.orgType === 'ips' ? 'Los planes para entidades sin ánimo de lucro no se muestran a una IPS' : ''}><select value={f.planId} onChange={set('planId')}><option value="">Sin plan</option>{available.map((p) => <option key={p.id} value={p.id}>{p.name} · {cop(p.priceMonth)}/mes</option>)}</select></Field>
          <Field label="Ciclo de pago"><select value={f.billingCycle} onChange={set('billingCycle')}><option value="mensual">Mensual</option><option value="anual">Anual</option></select></Field>
          <Field label="Valor">{plan ? <input readOnly value={f.billingCycle === 'anual' ? `${cop(plan.priceYear)} al año` : `${cop(plan.priceMonth)} al mes`} /> : <input readOnly value="—" />}</Field>
          <Field label="Estado"><select value={f.status} onChange={set('status')}>{Object.entries(STATUS).map(([k, [l]]) => <option key={k} value={k}>{l}</option>)}</select></Field>
          <Field label="Inicio"><input type="date" value={f.startDate || ''} onChange={set('startDate')} /></Field>
          <Field label="Renovación"><input type="date" value={f.renewalDate || ''} onChange={set('renewalDate')} /></Field>
        </div>
        <label className="pswitch" style={{ marginTop: 12 }}><input type="checkbox" checked={f.isCurrent} onChange={set('isCurrent')} /> Es la organización de esta instalación (su plan define los módulos del sistema)</label>
        {f.isCurrent && ['suspendida', 'cancelada'].includes(f.status) && <div className="palert bad" style={{ marginTop: 10 }}><MdErrorOutline /><span>Con estado {STATUS[f.status][0].toLowerCase()} el sistema queda sin módulos disponibles.</span></div>}
      </div>
      {plan && extras.length > 0 && (
        <div><div className="pf-section-t">Funcionalidades adicionales (fuera del plan)</div>
          <div className="pf-feat-grid">{extras.map((x) => (
            <label key={x.key} className={`pf-feat${f.extraFeatures.includes(x.key) ? ' on' : ''}`}><input type="checkbox" checked={f.extraFeatures.includes(x.key)} onChange={() => setF({ ...f, extraFeatures: f.extraFeatures.includes(x.key) ? f.extraFeatures.filter((k) => k !== x.key) : [...f.extraFeatures, x.key] })} /><span>{x.label}<small>{x.groupLabel}</small></span></label>
          ))}</div>
        </div>
      )}
      <Field label="Notas"><textarea value={f.notes || ''} onChange={set('notes')} /></Field>
      {error && <div className="palert bad"><MdErrorOutline /><span>{error}</span></div>}
    </PModal>
  )
}

// Alta del cliente: configuración inicial, su primera sede y su administrador (una sola vez).
const InitOrgModal = ({ org, onClose, onSaved }) => {
  const [f, setF] = useState({ siteName: org.city ? `Sede ${org.city}` : 'Sede principal', municipality: org.city || '', adminName: '', adminLastName: '', adminIdentification: '', adminUsername: '', adminEmail: org.contactEmail || '', adminPassword: '' })
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = async () => {
    setError(''); setBusy(true)
    try { await papi.post(`/plataforma/organizaciones/${org.id}/inicializar`, f); onSaved() } catch (e) { setError(perror(e)); setBusy(false) }
  }
  return (
    <PModal title={`Inicializar · ${org.name}`} onClose={onClose}
      footer={<><button type="button" className="pbtn outline" onClick={onClose}>Cancelar</button><button type="button" className="pbtn primary" onClick={save} disabled={busy}>{busy ? <Spin /> : <MdRocketLaunch />} Crear cliente</button></>}>
      <p style={{ marginTop: 0, color: 'var(--muted)' }}>Crea la configuración y los catálogos iniciales (servicios de IPS, biológicos, soportes de talento humano y documentos obligatorios), la primera sede con su bodega general y el usuario administrador del cliente. Sus datos quedan separados de los demás clientes.</p>
      <div className="pgrid">
        <Field label="Primera sede"><input className="pinput" value={f.siteName} onChange={set('siteName')} /></Field>
        <Field label="Municipio"><input className="pinput" value={f.municipality} onChange={set('municipality')} /></Field>
        <Field label="Nombre del administrador"><input className="pinput" value={f.adminName} onChange={set('adminName')} /></Field>
        <Field label="Apellidos"><input className="pinput" value={f.adminLastName} onChange={set('adminLastName')} /></Field>
        <Field label="Identificación"><DocInput className="pinput" value={f.adminIdentification} onChange={set('adminIdentification')} /></Field>
        <Field label="Correo"><EmailInput className="pinput" value={f.adminEmail} onChange={set('adminEmail')} /></Field>
        <Field label="Usuario" hint="Único en toda la plataforma"><input className="pinput" value={f.adminUsername} onChange={set('adminUsername')} autoComplete="off" /></Field>
        <Field label="Contraseña inicial" hint="Mínimo 8 caracteres; pídele que la cambie al entrar"><input className="pinput" type="password" value={f.adminPassword} onChange={set('adminPassword')} autoComplete="new-password" /></Field>
      </div>
      {error && <div className="palert bad" style={{ marginTop: 12 }}><MdErrorOutline /> {error}</div>}
    </PModal>
  )
}

export const OrgsPage = () => {
  const [orgs, setOrgs] = useState(null); const [plans, setPlans] = useState([]); const [catalog, setCatalog] = useState(null)
  const [modal, setModal] = useState(null); const [q, setQ] = useState(''); const [toast, toastNode] = useToast()
  const load = useCallback(() => Promise.all([papi.get('/plataforma/organizaciones'), papi.get('/plataforma/planes'), papi.get('/plataforma/funcionalidades')]).then(([a, b, c]) => { setOrgs(a.data); setPlans(b.data); setCatalog(c.data) }), [])
  useEffect(() => { load() }, [load])
  const shown = useMemo(() => (orgs || []).filter((o) => !q || [o.name, o.nit, o.city, o.planName].some((v) => v && v.toLowerCase().includes(q.toLowerCase()))), [orgs, q])
  if (!orgs || !catalog) return <Splash />
  const del = async () => { try { await papi.delete(`/plataforma/organizaciones/${modal.del.id}`); setModal(null); toast('Organización eliminada'); load() } catch (e) { setModal(null); toast(perror(e), 'bad') } }
  return (
    <>
      <Head title="Organizaciones" subtitle="Clientes, su plan, ciclo de pago y estado. Cada cliente tiene sus propios datos, usuarios y sedes; la marcada “por defecto” es la que muestra la pantalla de inicio de sesión.">
        <button type="button" className="pbtn primary" onClick={() => setModal({ edit: {} })}><MdAdd /> Nueva organización</button>
      </Head>
      <PCard flush>
        <div style={{ padding: 14, borderBottom: '1px solid var(--line-2)' }}><input className="pinput" style={{ maxWidth: 340 }} placeholder="Buscar por nombre, NIT, ciudad o plan" value={q} onChange={(e) => setQ(e.target.value)} /></div>
        <div className="pf-tablewrap"><table className="pf-table">
          <thead><tr><th>Organización</th><th>Plan</th><th>Ciclo</th><th>Valor</th><th>Estado</th><th>Renovación</th><th /></tr></thead>
          <tbody>{shown.map((o) => (
            <tr key={o.id}>
              <td><b>{o.name}</b> {o.isCurrent && <span className="pbadge purple"><MdHome /> Por defecto</span>} {!o.initialized && <span className="pbadge warn">Sin inicializar</span>}<span className="sub">{[o.orgType === 'esal' ? 'Sin ánimo de lucro' : o.orgType === 'etdh' ? 'Institución ETDH' : 'IPS', o.nit && `NIT ${o.nit}`, o.city].filter(Boolean).join(' · ')}</span></td>
              <td>{o.planName ? <span className="pbadge purple">{o.planName}</span> : '—'}{o.extraFeatures.length > 0 && <span className="sub">+{o.extraFeatures.length} adicional{o.extraFeatures.length === 1 ? '' : 'es'}</span>}</td>
              <td style={{ textTransform: 'capitalize' }}>{o.billingCycle}</td>
              <td>{cop(o.amount)}<span className="sub">{o.billingCycle === 'anual' ? 'al año' : 'al mes'}</span></td>
              <td><span className={`pbadge ${STATUS[o.status][1]}`}>{STATUS[o.status][0]}</span></td>
              <td>{fdate(o.renewalDate)}</td>
              <td className="act">{!o.initialized && <button type="button" className="pbtn outline sm" onClick={() => setModal({ init: o })}><MdRocketLaunch /> Inicializar</button>}<button type="button" className="pbtn ghost sm" onClick={() => setModal({ legal: o })} title="Contrato y acuerdo de datos"><MdGavel /> Documentos</button><button type="button" className="pbtn ghost icon" onClick={() => setModal({ edit: o })} aria-label="Editar"><MdEdit /></button><button type="button" className="pbtn ghost icon" style={{ color: 'var(--bad)' }} onClick={() => setModal({ del: o })} aria-label="Eliminar"><MdDelete /></button></td>
            </tr>
          ))}</tbody>
        </table></div>
      </PCard>
      {modal?.edit && <OrgForm initial={modal.edit.id ? modal.edit : null} plans={plans} catalog={catalog} onClose={() => setModal(null)} onSaved={() => { setModal(null); toast('Organización guardada'); load() }} />}
      {modal?.init && <InitOrgModal org={modal.init} onClose={() => setModal(null)} onSaved={() => { setModal(null); toast('Cliente creado: ya puede iniciar sesión su administrador'); load() }} />}
      {modal?.legal && <OrgLegalModal org={modal.legal} onClose={() => setModal(null)} />}
      {modal?.del && <PModal title="Eliminar organización" size="sm" onClose={() => setModal(null)} footer={<><button type="button" className="pbtn outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="pbtn danger" onClick={del}><MdDelete /> Eliminar</button></>}>
        <p style={{ margin: 0 }}>¿Eliminar <b>{modal.del.name}</b>?</p></PModal>}
      {toastNode}
    </>
  )
}

// ======================================================================= Solicitudes de mejora de plan
const REQ = { pendiente: ['Pendiente', 'warn'], contactado: ['En contacto', 'purple'], aplicada: ['Aplicada', 'ok'], rechazada: ['No aplicada', 'bad'] }
export const RequestsPage = () => {
  const [rows, setRows] = useState(null); const [toast, toastNode] = useToast(); const [busy, setBusy] = useState(0)
  const load = useCallback(() => papi.get('/plataforma/solicitudes').then(({ data }) => setRows(data)), [])
  useEffect(() => { load() }, [load])
  const set = async (r, status) => {
    setBusy(r.id)
    try { await papi.put(`/plataforma/solicitudes/${r.id}`, { status }); toast(status === 'aplicada' ? `Plan ${r.toPlan} aplicado a ${r.organizationName}` : 'Solicitud actualizada'); load() } catch (e) { toast(perror(e), 'bad') } finally { setBusy(0) }
  }
  if (!rows) return <Splash />
  return (
    <>
      <Head title="Solicitudes de cambio de plan" subtitle="Las envía el administrador de cada institución desde el botón de su plan en el menú lateral" />
      <PCard flush>
        {rows.length === 0 ? <p style={{ padding: 22, margin: 0, color: 'var(--muted)' }}>Aún no hay solicitudes.</p> : (
          <div className="pf-tablewrap"><table className="pf-table">
            <thead><tr><th>Organización</th><th>Cambio</th><th>Solicitó</th><th>Fecha</th><th>Estado</th><th /></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.id}>
                <td><b>{r.organizationName}</b>{r.message && <span className="sub">“{r.message}”</span>}</td>
                <td>{r.fromPlan || '—'} → <span className="pbadge purple">{r.toPlan}</span><span className="sub">Pago {r.billingCycle}</span></td>
                <td>{r.requestedBy || '—'}<span className="sub">{[r.requestedEmail, r.contactPhone].filter(Boolean).join(' · ')}</span></td>
                <td>{fdate(r.createdAt)}</td>
                <td><span className={`pbadge ${REQ[r.status][1]}`}>{REQ[r.status][0]}</span></td>
                <td className="act">{['pendiente', 'contactado'].includes(r.status) && (
                  <>
                    {r.status === 'pendiente' && <button type="button" className="pbtn ghost sm" disabled={busy === r.id} onClick={() => set(r, 'contactado')}>Contactado</button>}
                    <button type="button" className="pbtn primary sm" disabled={busy === r.id} onClick={() => set(r, 'aplicada')}><MdCheck /> Aplicar plan</button>
                    <button type="button" className="pbtn ghost sm" style={{ color: 'var(--bad)' }} disabled={busy === r.id} onClick={() => set(r, 'rechazada')}>Rechazar</button>
                  </>
                )}</td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </PCard>
      <p style={{ color: 'var(--muted)', fontSize: 12.5, marginTop: 12 }}>“Aplicar plan” cambia el plan y el ciclo de pago de la organización de inmediato. Verifica el pago antes de aplicarlo.</p>
      {toastNode}
    </>
  )
}
