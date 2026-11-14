import React, { useEffect, useRef, useState } from 'react'
import {
  MdFormatBold, MdFormatItalic, MdFormatUnderlined, MdStrikethroughS, MdFormatColorText, MdFormatColorFill,
  MdFormatAlignLeft, MdFormatAlignCenter, MdFormatAlignRight, MdFormatAlignJustify, MdFormatListBulleted, MdFormatListNumbered,
  MdFormatIndentDecrease, MdFormatIndentIncrease, MdLink, MdTableChart, MdHorizontalRule, MdFormatClear, MdUndo, MdRedo, MdImage
} from 'react-icons/md'
import './richtext.css'

const FONTS = ['Inter', 'Arial', 'Georgia', 'Times New Roman', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Courier New']
const SIZES = [['1', '10 px'], ['2', '13 px'], ['3', '16 px'], ['4', '18 px'], ['5', '24 px'], ['6', '32 px'], ['7', '48 px']]
const BLOCKS = [['p', 'Párrafo'], ['h1', 'Título 1'], ['h2', 'Título 2'], ['h3', 'Título 3'], ['blockquote', 'Cita']]
const MAX_IMG = 600 * 1024

// Editor de texto enriquecido (sin dependencias): el contenido se guarda como HTML y el servidor lo limpia.
const RichTextEditor = ({ value, onChange, placeholder = 'Escribe aquí el contenido del documento…', minHeight = 320 }) => {
  const ref = useRef(null)
  const imgRef = useRef(null)
  const saved = useRef(null)
  const [, force] = useState(0)
  // Carga el contenido inicial una sola vez (después el DOM editable es la fuente de verdad).
  useEffect(() => { if (ref.current && ref.current.innerHTML !== (value || '')) ref.current.innerHTML = value || '' }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const emit = () => onChange(ref.current.innerHTML)
  const keep = () => { const s = window.getSelection(); if (s.rangeCount && ref.current.contains(s.anchorNode)) saved.current = s.getRangeAt(0) }
  const restore = () => { ref.current.focus(); const s = window.getSelection(); if (saved.current) { s.removeAllRanges(); s.addRange(saved.current) } }
  const run = (cmd, arg = null) => {
    restore()
    document.execCommand('styleWithCSS', false, cmd !== 'fontSize')
    document.execCommand(cmd, false, arg)
    keep(); emit(); force((n) => n + 1)
  }
  const Btn = ({ cmd, arg, icon, title }) => (
    <button type="button" className={`rt-btn${document.queryCommandState?.(cmd) ? ' on' : ''}`} title={title} aria-label={title}
      onMouseDown={(e) => e.preventDefault()} onClick={() => run(cmd, arg)}>{icon}</button>
  )
  const link = () => {
    keep()
    const url = window.prompt('Dirección del enlace (https://…)')
    if (url) run('createLink', /^(https?:|mailto:|tel:)/i.test(url) ? url : `https://${url}`)
  }
  const table = () => {
    const rows = Number(window.prompt('¿Cuántas filas?', '3')) || 0; const cols = Number(window.prompt('¿Cuántas columnas?', '3')) || 0
    if (!rows || !cols || rows > 30 || cols > 10) return
    const td = '<td style="border: 1px solid #CBD5E1; padding-left: 6px">&nbsp;</td>'
    run('insertHTML', `<table style="border-collapse: collapse; width: 100%">${Array.from({ length: rows }, () => `<tr>${td.repeat(cols)}</tr>`).join('')}</table><p><br></p>`)
  }
  const image = (file) => {
    if (!file) return
    if (!/^image\/(png|jpe?g|webp|gif)$/.test(file.type)) return window.alert('Usa una imagen PNG, JPG o WEBP.')
    if (file.size > MAX_IMG) return window.alert('La imagen supera 600 KB. Redúcela antes de insertarla.')
    const r = new FileReader(); r.onload = () => run('insertImage', r.result); r.readAsDataURL(file)
  }
  const sel = (cmd, list, label) => (
    <select className="rt-select" aria-label={label} title={label} defaultValue="" onMouseDown={keep}
      onChange={(e) => { if (e.target.value) run(cmd, cmd === 'formatBlock' ? `<${e.target.value}>` : e.target.value); e.target.value = '' }}>
      <option value="" disabled>{label}</option>
      {list.map((x) => (Array.isArray(x) ? <option key={x[0]} value={x[0]}>{x[1]}</option> : <option key={x} value={x} style={{ fontFamily: x }}>{x}</option>))}
    </select>
  )
  const color = (cmd, icon, label, def) => (
    <label className="rt-btn rt-color" title={label} onMouseDown={keep}>
      {icon}<input type="color" defaultValue={def} aria-label={label} onChange={(e) => run(cmd, e.target.value)} />
    </label>
  )
  return (
    <div className="rt">
      <div className="rt-toolbar" role="toolbar" aria-label="Formato del texto">
        {sel('formatBlock', BLOCKS, 'Estilo')}
        {sel('fontName', FONTS, 'Fuente')}
        {sel('fontSize', SIZES, 'Tamaño')}
        <span className="rt-sep" />
        <Btn cmd="bold" icon={<MdFormatBold />} title="Negrita" />
        <Btn cmd="italic" icon={<MdFormatItalic />} title="Cursiva" />
        <Btn cmd="underline" icon={<MdFormatUnderlined />} title="Subrayado" />
        <Btn cmd="strikeThrough" icon={<MdStrikethroughS />} title="Tachado" />
        {color('foreColor', <MdFormatColorText />, 'Color del texto', '#E30613')}
        {color('hiliteColor', <MdFormatColorFill />, 'Resaltado', '#FEF08A')}
        <span className="rt-sep" />
        <Btn cmd="justifyLeft" icon={<MdFormatAlignLeft />} title="Alinear a la izquierda" />
        <Btn cmd="justifyCenter" icon={<MdFormatAlignCenter />} title="Centrar" />
        <Btn cmd="justifyRight" icon={<MdFormatAlignRight />} title="Alinear a la derecha" />
        <Btn cmd="justifyFull" icon={<MdFormatAlignJustify />} title="Justificar" />
        <span className="rt-sep" />
        <Btn cmd="insertUnorderedList" icon={<MdFormatListBulleted />} title="Viñetas" />
        <Btn cmd="insertOrderedList" icon={<MdFormatListNumbered />} title="Lista numerada" />
        <Btn cmd="outdent" icon={<MdFormatIndentDecrease />} title="Reducir sangría" />
        <Btn cmd="indent" icon={<MdFormatIndentIncrease />} title="Aumentar sangría" />
        <span className="rt-sep" />
        <button type="button" className="rt-btn" title="Enlace" aria-label="Enlace" onMouseDown={(e) => e.preventDefault()} onClick={link}><MdLink /></button>
        <button type="button" className="rt-btn" title="Tabla" aria-label="Tabla" onMouseDown={(e) => { e.preventDefault(); keep() }} onClick={table}><MdTableChart /></button>
        <button type="button" className="rt-btn" title="Imagen" aria-label="Imagen" onMouseDown={(e) => { e.preventDefault(); keep() }} onClick={() => imgRef.current.click()}><MdImage /></button>
        <Btn cmd="insertHorizontalRule" icon={<MdHorizontalRule />} title="Línea divisoria" />
        <Btn cmd="removeFormat" icon={<MdFormatClear />} title="Quitar formato" />
        <span className="rt-sep" />
        <Btn cmd="undo" icon={<MdUndo />} title="Deshacer" />
        <Btn cmd="redo" icon={<MdRedo />} title="Rehacer" />
        <input ref={imgRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" hidden onChange={(e) => { image(e.target.files?.[0]); e.target.value = '' }} />
      </div>
      <div ref={ref} className="rt-area rt-content" contentEditable suppressContentEditableWarning data-placeholder={placeholder} style={{ minHeight }}
        onInput={emit} onBlur={() => { keep(); emit() }} onKeyUp={() => { keep(); force((n) => n + 1) }} onMouseUp={() => { keep(); force((n) => n + 1) }} />
    </div>
  )
}

// Documento HTML completo (para descargar o imprimir) con el contenido ya limpiado por el servidor.
export const htmlPage = (title, body) => `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${String(title).replace(/</g, '&lt;')}</title>
<style>body{font-family:Inter,Arial,sans-serif;color:#1F2937;line-height:1.6;max-width:820px;margin:32px auto;padding:0 24px}table{border-collapse:collapse}td,th{border:1px solid #CBD5E1;padding:4px 6px}img{max-width:100%}blockquote{border-left:4px solid #CBD5E1;margin-left:0;padding-left:14px;color:#475569}</style>
</head><body>${body || ''}</body></html>`

export const printHtml = (title, body) => {
  const w = window.open('', '_blank')
  if (!w) return
  w.document.write(htmlPage(title, body)); w.document.close()
  // Imprime una sola vez: al cargar (imágenes incluidas) o, si el evento no llega, a los 800 ms.
  let done = false
  const go = () => { if (done) return; done = true; try { w.focus(); w.print() } catch { /* ventana cerrada */ } }
  w.onload = go
  setTimeout(go, 800)
}

export default RichTextEditor
