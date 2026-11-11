import React, { useCallback, useEffect, useState } from 'react'
import { MdClose, MdCheckCircle, MdError } from 'react-icons/md'

export const initials = (name = '') =>
  name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]).join('').toUpperCase() || '?'

export const Avatar = ({ user, size = '' }) =>
  user?.avatarUrl
    ? <img className={`avatar ${size}`} src={user.avatarUrl} alt={user.fullName} />
    : <span className={`avatar ${size}`} aria-hidden="true">{initials(user?.fullName)}</span>

export const PageHead = ({ title, subtitle, children }) => (
  <div className="page-head">
    <div>
      <h1>{title}</h1>
      {subtitle && <p>{subtitle}</p>}
    </div>
    {children && <div className="page-actions">{children}</div>}
  </div>
)

export const Card = ({ title, subtitle, actions, children, flush, className = '', icon }) => (
  <section className={`card ${className}`}>
    {(title || actions) && (
      <div className="card-head">
        <div>
          {title && <h3>{icon}{title}</h3>}
          {subtitle && <p>{subtitle}</p>}
        </div>
        {actions}
      </div>
    )}
    <div className={`card-body${flush ? ' flush' : ''}`}>{children}</div>
  </section>
)

export const Modal = ({ title, onClose, children, footer, size = '' }) => {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])
  return (
    <div className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${size}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head">
          <h3>{title}</h3>
          <button type="button" className="btn btn-ghost btn-icon" onClick={onClose} aria-label="Cerrar"><MdClose /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  )
}

export const useToast = () => {
  const [toast, setToast] = useState(null)
  const show = useCallback((message, type = 'ok') => {
    setToast({ message, type, key: Date.now() })
  }, [])
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => setToast(null), 3500)
    return () => clearTimeout(t)
  }, [toast])
  const node = toast && (
    <div className={`toast ${toast.type}`} role="status" key={toast.key}>
      {toast.type === 'ok' ? <MdCheckCircle /> : <MdError />}
      <span>{toast.message}</span>
    </div>
  )
  return [show, node]
}

export const Spinner = () => <span className="spinner" aria-hidden="true" />

export const Empty = ({ icon, children }) => (
  <div className="empty">{icon}{children}</div>
)
