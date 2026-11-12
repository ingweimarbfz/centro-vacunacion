import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdSearch, MdClose, MdArrowForward, MdHistory, MdSubdirectoryArrowLeft } from 'react-icons/md'
import api from '../api/client'
import { useAuth } from '../context/AuthContext'
import { MODULES, navForUser } from '../utils/permissions'

const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
const RECENT = 'cv_search_recent'
const loadRecent = () => { try { return JSON.parse(localStorage.getItem(RECENT) || '[]') } catch { return [] } }
const saveRecent = (q) => { try { localStorage.setItem(RECENT, JSON.stringify([q, ...loadRecent().filter((x) => x !== q)].slice(0, 5))) } catch { /* sin almacenamiento */ } }

// Búsqueda rápida (Ctrl/⌘ + K): páginas del menú y datos (personas, citologías, equipos, documentos…).
const GlobalSearch = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState('')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)
  const boxRef = useRef(null)

  // Páginas a las que el usuario tiene acceso (de todos los módulos).
  const pages = useMemo(() => {
    const seen = new Set(); const out = []
    for (const m of MODULES) for (const s of navForUser(user, m.id)) for (const i of s.items) {
      if (seen.has(i.to)) continue
      seen.add(i.to); out.push({ title: i.label, subtitle: `${m.label} · ${s.title}`, to: i.to, icon: i.icon, hay: norm(`${i.label} ${s.title} ${m.label}`) })
    }
    return out
  }, [user])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }
      if (e.key === 'Escape') setOpen(false)
    }
    const onClick = (e) => boxRef.current && !boxRef.current.contains(e.target) && setOpen(false)
    window.addEventListener('keydown', onKey); document.addEventListener('mousedown', onClick)
    return () => { window.removeEventListener('keydown', onKey); document.removeEventListener('mousedown', onClick) }
  }, [])

  useEffect(() => {
    const t = q.trim()
    if (t.length < 2) { setData(null); setLoading(false); return undefined }
    setLoading(true)
    const timer = setTimeout(() => {
      api.get('/buscar', { params: { q: t } }).then(({ data: d }) => setData(d)).catch(() => setData({ groups: [] })).finally(() => setLoading(false))
    }, 250)
    return () => clearTimeout(timer)
  }, [q])

  const terms = norm(q).split(/\s+/).filter(Boolean)
  const pageHits = terms.length ? pages.filter((p) => terms.every((t) => p.hay.includes(t))).slice(0, 5) : []
  const groups = [...(pageHits.length ? [{ key: 'paginas', label: 'Ir a', items: pageHits }] : []), ...(data?.groups || [])]
  const flat = groups.flatMap((g) => g.items)
  useEffect(() => setActive(0), [q, data])

  const go = (item) => { if (q.trim()) saveRecent(q.trim()); setOpen(false); setQ(''); navigate(item.to) }
  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(a + 1, flat.length - 1)) }
    if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(a - 1, 0)) }
    if (e.key === 'Enter' && flat[active]) { e.preventDefault(); go(flat[active]) }
  }
  const recent = loadRecent()
  let idx = -1

  return (
    <div className={`gsearch${open ? ' open' : ''}`} ref={boxRef}>
      <button type="button" className="gsearch-icon btn btn-ghost btn-icon" onClick={() => { setOpen(true); setTimeout(() => inputRef.current?.focus(), 0) }} aria-label="Buscar"><MdSearch /></button>
      <div className="gsearch-box">
        <MdSearch className="gsearch-lead" />
        <input ref={inputRef} value={q} onChange={(e) => { setQ(e.target.value); setOpen(true) }} onFocus={() => setOpen(true)} onKeyDown={onKeyDown}
          placeholder="Buscar personas, citologías, equipos, documentos o páginas…" aria-label="Buscar en el sistema" />
        {q ? <button type="button" className="gsearch-clear" onClick={() => { setQ(''); inputRef.current?.focus() }} aria-label="Limpiar"><MdClose /></button> : <kbd className="gsearch-kbd">Ctrl K</kbd>}
        <button type="button" className="gsearch-close" onClick={() => setOpen(false)} aria-label="Cerrar búsqueda"><MdClose /></button>
      </div>
      {open && (
        <div className="gsearch-panel" role="listbox">
          {q.trim().length < 2 ? (
            <div className="gsearch-empty">
              {recent.length > 0 ? (
                <>
                  <div className="gsearch-group">Búsquedas recientes</div>
                  {recent.map((r) => <button key={r} type="button" className="gsearch-item" onClick={() => { setQ(r); inputRef.current?.focus() }}><MdHistory /><span><b>{r}</b></span></button>)}
                </>
              ) : <p>Escribe al menos dos letras. Busca por nombre, documento, código, placa o el nombre de una página. No importan las tildes.</p>}
            </div>
          ) : (
            <>
              {groups.map((g) => (
                <div key={g.key}>
                  <div className="gsearch-group">{g.label}</div>
                  {g.items.map((it) => {
                    idx += 1
                    const i = idx
                    const I = it.icon || MdArrowForward
                    return (
                      <button key={`${g.key}-${it.to}-${it.title}`} type="button" className={`gsearch-item${i === active ? ' on' : ''}`} onMouseEnter={() => setActive(i)} onClick={() => go(it)}>
                        <I /><span><b>{it.title}</b>{it.subtitle && <small>{it.subtitle}</small>}</span>{i === active && <MdSubdirectoryArrowLeft className="gsearch-enter" />}
                      </button>
                    )
                  })}
                </div>
              ))}
              {loading && <div className="gsearch-status"><span className="spinner" /> Buscando…</div>}
              {!loading && flat.length === 0 && <div className="gsearch-status">Sin resultados para “{q.trim()}”.</div>}
            </>
          )}
          <div className="gsearch-foot"><span>↑ ↓ para moverte · Enter para abrir · Esc para cerrar</span></div>
        </div>
      )}
    </div>
  )
}

export default GlobalSearch
