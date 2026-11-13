import React, { useEffect, useState } from 'react'
import { MdWorkspacePremium, MdCheck, MdSend, MdErrorOutline, MdHourglassTop, MdStar } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { Modal, Spinner } from './ui'

const cop = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(Number(n) || 0)
const STATUS = { pendiente: 'Pendiente', contactado: 'En contacto', aplicada: 'Aplicada', rechazada: 'No aplicada' }

// Ventana para ver el plan actual y solicitar una mejora (solo el administrador envía la solicitud).
const UpgradeModal = ({ onClose }) => {
  const { user } = useAuth()
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  const [pick, setPick] = useState(null); const [cycle, setCycle] = useState('mensual')
  const [msg, setMsg] = useState(''); const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false); const [sent, setSent] = useState(false)
  useEffect(() => { api.get('/plan/opciones').then(({ data }) => { setD(data); setCycle(data.organization?.billingCycle || 'mensual') }).catch((e) => setErr(errorMessage(e))) }, [])
  const open = d?.lastRequest && ['pendiente', 'contactado'].includes(d.lastRequest.status)
  const send = async () => {
    setErr(''); if (!pick) return setErr('Elige el plan que quieres.')
    setBusy(true)
    try { await api.post('/plan/solicitud', { planId: pick, billingCycle: cycle, message: msg, contactPhone: phone }); setSent(true) } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }
  const price = (p) => (cycle === 'anual' ? p.priceYearMonthly : p.priceMonth)
  return (
    <Modal title="Tu plan" size="lg" onClose={onClose}
      footer={d && d.canRequest && !open && !sent ? <><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={send} disabled={busy || !pick}>{busy ? <Spinner /> : <MdSend />} Solicitar cambio de plan</button></> : <button type="button" className="btn btn-outline" onClick={onClose}>Cerrar</button>}>
      {!d && !err ? <div className="splash" style={{ minHeight: 140 }}><Spinner /></div> : err && !d ? <div className="alert bad"><MdErrorOutline /><span>{err}</span></div> : (
        <div className="stack" style={{ gap: 16 }}>
          {d.current && (
            <div className="upg-current">
              <span className="upg-badge"><MdWorkspacePremium /></span>
              <div><small>Plan actual</small><b>{d.current.name}</b><span>{d.organization?.name} · pago {d.organization?.billingCycle}{d.organization?.renewalDate ? ` · renueva ${d.organization.renewalDate.split('-').reverse().join('/')}` : ''}</span></div>
            </div>
          )}
          {sent ? <div className="alert ok"><MdCheck /><span>Recibimos tu solicitud. El equipo de Integra IPS te contactará para confirmar el cambio y la forma de pago.</span></div>
            : open ? <div className="alert info"><MdHourglassTop /><span>Tienes una solicitud en curso para el plan <b>{d.lastRequest.toPlan}</b> ({d.lastRequest.billingCycle}) · {STATUS[d.lastRequest.status]}. Te contactaremos pronto.</span></div>
              : !d.canRequest ? <div className="alert info"><MdWorkspacePremium /><span>Solo el administrador de la institución puede solicitar un cambio de plan. Si necesitas más funciones, coméntaselo a {user.role === 'administrador' ? 'tu equipo' : 'tu administrador'}.</span></div> : null}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <span className="label">Planes disponibles</span>
            <div className="th-seg"><button type="button" className={cycle === 'mensual' ? 'on' : ''} onClick={() => setCycle('mensual')}>Mensual</button><button type="button" className={cycle === 'anual' ? 'on' : ''} onClick={() => setCycle('anual')}>Anual (2 meses gratis)</button></div>
          </div>
          <div className="upg-grid">{d.plans.map((p) => {
            const current = d.current?.id === p.id
            return (
              <button key={p.id} type="button" className={`upg-plan${pick === p.id ? ' on' : ''}${current ? ' cur' : ''}`} disabled={current || !d.canRequest || open || sent} onClick={() => setPick(p.id)}>
                <div className="upg-plan-h"><b>{p.name}</b>{current ? <span className="badge">Actual</span> : p.highlight ? <span className="badge brand"><MdStar /> Recomendado</span> : null}</div>
                <div className="upg-price">{cop(price(p))}<small>/mes</small></div>
                <ul>{p.bullets.slice(0, 4).map((b) => <li key={b}><MdCheck /> {b}</li>)}</ul>
              </button>
            )
          })}</div>
          {d.canRequest && !open && !sent && (
            <div className="form-grid">
              <div className="field"><label>Teléfono de contacto</label><input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" /></div>
              <div className="field span-all"><label>Comentario (opcional)</label><textarea value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="Qué necesitas: más sedes, usuarios, un módulo…" style={{ minHeight: 60 }} /></div>
            </div>
          )}
          {err && d && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
        </div>
      )}
    </Modal>
  )
}

// Botón del menú lateral (debajo del usuario).
export const UpgradeButton = ({ compact = false }) => {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)
  if (!user.plan) return null
  return (
    <>
      {compact
        ? (
          <button type="button" className="upg-pill" onClick={() => setOpen(true)} title={user.role === 'administrador' ? 'Mejorar plan' : 'Ver planes'}>
            <MdWorkspacePremium /><b>Plan {user.plan.name}</b><span>· {user.role === 'administrador' ? 'Mejorar plan' : 'Ver planes'}</span>
          </button>
          )
        : (
          <button type="button" className="upg-btn" onClick={() => setOpen(true)}>
            <MdWorkspacePremium /><span><b>Plan {user.plan.name}</b><small>{user.role === 'administrador' ? 'Mejorar plan' : 'Ver planes'}</small></span>
          </button>
          )}
      {open && <UpgradeModal onClose={() => setOpen(false)} />}
    </>
  )
}

export default UpgradeModal
