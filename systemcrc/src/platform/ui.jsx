import React, { useCallback, useEffect, useState } from 'react'
import { MdClose } from 'react-icons/md'

export const Spin = () => <span className="pspin" aria-hidden="true" />
export const Splash = ({ children = 'Cargando…' }) => <div className="psplash"><Spin /> {children}</div>

export const Head = ({ title, subtitle, children }) => (
  <div className="pf-head">
    <div><h1>{title}</h1>{subtitle && <p>{subtitle}</p>}</div>
    {children && <div className="actions">{children}</div>}
  </div>
)

export const PCard = ({ title, subtitle, icon, actions, children, flush, className = '' }) => (
  <section className={`pf-card ${className}`}>
    {(title || actions) && (
      <div className="pf-card-h">
        <div><h3>{icon}{title}</h3>{subtitle && <p>{subtitle}</p>}</div>
        {actions}
      </div>
    )}
    <div className={flush ? '' : 'pf-card-b'}>{children}</div>
  </section>
)

export const PModal = ({ title, onClose, children, footer, size = '' }) => {
  useEffect(() => {
    const k = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', k)
    return () => window.removeEventListener('keydown', k)
  }, [onClose])
  return (
    <div className="pf-modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`pf-modal ${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="pf-modal-h"><h3>{title}</h3><button type="button" className="pbtn ghost icon" onClick={onClose} aria-label="Cerrar"><MdClose /></button></div>
        <div className="pf-modal-b">{children}</div>
        {footer && <div className="pf-modal-f">{footer}</div>}
      </div>
    </div>
  )
}

export const useToast = () => {
  const [t, setT] = useState(null)
  const show = useCallback((message, tone = 'ok') => setT({ message, tone, key: Date.now() }), [])
  useEffect(() => { if (!t) return undefined; const x = setTimeout(() => setT(null), 3200); return () => clearTimeout(x) }, [t])
  return [show, t && <div key={t.key} className={`pf-toast ${t.tone === 'bad' ? 'bad' : ''}`} role="status">{t.message}</div>]
}

export const Field = ({ label, hint, children, full }) => (
  <div className={`pfield${full ? ' full' : ''}`}>{label && <label className="plabel">{label}</label>}{children}{hint && <span className="hint">{hint}</span>}</div>
)
