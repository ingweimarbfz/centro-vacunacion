import React, { useState } from 'react'
import { sanitize, check } from '../utils/validate'

// Campos con validación incorporada: limpian lo que se escribe o se pega y avisan al salir del campo si el dato no es válido.
// onChange recibe un evento con la forma { target: { value } }, así encajan con los set('campo') de los formularios.
const make = (kind, defaults) => {
  const Comp = ({ value, onChange, docType, hint, showCount, className, ...rest }) => {
    const [touched, setTouched] = useState(false)
    const v = value ?? ''
    const err = touched ? check[kind](v, docType) : ''
    return (
      <>
        <input {...defaults} {...rest} className={[className, err ? 'is-invalid' : ''].filter(Boolean).join(' ') || undefined} value={v} aria-invalid={err ? true : undefined}
          onChange={(e) => onChange?.({ target: { value: sanitize[kind](e.target.value, docType), name: rest.name } })}
          onBlur={(e) => { setTouched(true); rest.onBlur?.(e) }} />
        {err ? <small className="error">{err}</small> : showCount ? <small className="hint">{v.length}/10 dígitos</small> : hint ? <small className="hint">{hint}</small> : null}
      </>
    )
  }
  return Comp
}

export const PhoneInput = make('phone', { type: 'tel', inputMode: 'numeric', autoComplete: 'tel', placeholder: '3001234567' })
export const EmailInput = make('email', { type: 'email', inputMode: 'email', autoComplete: 'email', placeholder: 'nombre@correo.com' })
export const DocInput = make('doc', { placeholder: '1065123456' })
export const NitInput = make('nit', { inputMode: 'numeric', placeholder: '900123456-7' })
export const PlateInput = make('plate', { placeholder: 'ABC123', autoCapitalize: 'characters' })
