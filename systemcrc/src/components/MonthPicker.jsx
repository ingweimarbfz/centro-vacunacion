import React, { useEffect, useRef, useState } from 'react'
import { MdChevronLeft, MdChevronRight, MdCalendarMonth } from 'react-icons/md'

export const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']
// "2026-11" → "Nov 2026"
export const shortMonth = (ym) => { const [y, m] = String(ym).split('-').map(Number); return `${MONTHS[m - 1]} ${y}` }
const shift = (ym, d) => { const [y, m] = ym.split('-').map(Number); const t = new Date(Date.UTC(y, m - 1 + d, 1)); return `${t.getUTCFullYear()}-${String(t.getUTCMonth() + 1).padStart(2, '0')}` }

// Selector de mes compacto (mes con tres letras), con flechas y calendario de meses.
const MonthPicker = ({ value, onChange, max, min, ariaLabel = 'Mes' }) => {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(Number(value.slice(0, 4)))
  const ref = useRef(null)
  useEffect(() => { setYear(Number(value.slice(0, 4))) }, [value])
  useEffect(() => {
    const close = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false)
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])
  const ok = (ym) => (!max || ym <= max) && (!min || ym >= min)
  const go = (ym) => { if (ok(ym)) { onChange(ym); setOpen(false) } }
  return (
    <div className="mpick" ref={ref}>
      <button type="button" className="mpick-arrow" onClick={() => go(shift(value, -1))} disabled={!ok(shift(value, -1))} aria-label="Mes anterior"><MdChevronLeft /></button>
      <button type="button" className="mpick-value" onClick={() => setOpen((o) => !o)} aria-label={ariaLabel} aria-expanded={open}><MdCalendarMonth /> {shortMonth(value)}</button>
      <button type="button" className="mpick-arrow" onClick={() => go(shift(value, 1))} disabled={!ok(shift(value, 1))} aria-label="Mes siguiente"><MdChevronRight /></button>
      {open && (
        <div className="mpick-pop" role="dialog" aria-label="Elegir mes">
          <div className="mpick-year">
            <button type="button" onClick={() => setYear(year - 1)} aria-label="Año anterior"><MdChevronLeft /></button>
            <b>{year}</b>
            <button type="button" onClick={() => setYear(year + 1)} disabled={max && year + 1 > Number(max.slice(0, 4))} aria-label="Año siguiente"><MdChevronRight /></button>
          </div>
          <div className="mpick-grid">{MONTHS.map((m, i) => {
            const ym = `${year}-${String(i + 1).padStart(2, '0')}`
            return <button key={m} type="button" className={ym === value ? 'on' : ''} disabled={!ok(ym)} onClick={() => go(ym)}>{m}</button>
          })}</div>
        </div>
      )}
    </div>
  )
}

export default MonthPicker
