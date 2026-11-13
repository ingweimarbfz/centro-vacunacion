import { useEffect } from 'react'

// Orientación automática de los formatos imprimibles (.cy-sheet):
// si alguna tabla no cabe en una hoja carta vertical, el formato pasa a horizontal;
// y si tampoco cabe en horizontal, se compacta la letra de las tablas.
// La medición se hace sobre una copia oculta con el ancho real de impresión, así
// el resultado es el mismo en computador y en celular.
const MM = 96 / 25.4
const PORTRAIT = 196 * MM // carta vertical (216 mm) menos márgenes de 10 mm
const LANDSCAPE = 259 * MM // carta horizontal (279 mm) menos márgenes de 10 mm
const STYLE_ID = 'auto-landscape-page'

const needsWidth = (table, original) => {
  const host = document.createElement('div')
  host.className = `cy-detail-page ${original.parentElement?.className || ''}`
  host.style.cssText = 'position:absolute;left:-10000px;top:0;visibility:hidden;pointer-events:none;'
  const sheet = document.createElement('article')
  sheet.className = original.className.replace(/sheet-(landscape|compact)/g, '')
  sheet.style.cssText = 'padding:0;max-width:none;box-shadow:none;width:auto;'
  const clone = table.cloneNode(true)
  clone.style.width = 'auto'
  sheet.appendChild(clone)
  host.appendChild(sheet)
  document.body.appendChild(host)
  // Ancho mínimo en el que la tabla se puede mostrar sin desbordarse.
  sheet.style.width = '1px'
  const min = clone.scrollWidth
  host.remove()
  return min
}

const check = () => {
  let landscape = false
  document.querySelectorAll('.cy-sheet').forEach((sheet) => {
    if (sheet.closest('.th-landscape, .tr-report, [data-orientation="fixed"]')) return
    const tables = [...sheet.querySelectorAll('table')]
    const widest = tables.reduce((m, t) => Math.max(m, needsWidth(t, sheet)), 0)
    const land = widest > PORTRAIT + 2
    sheet.classList.toggle('sheet-landscape', land)
    sheet.classList.toggle('sheet-compact', widest > LANDSCAPE + 2)
    if (land) landscape = true
  })
  const existing = document.getElementById(STYLE_ID)
  if (landscape && !existing) {
    const st = document.createElement('style')
    st.id = STYLE_ID
    st.textContent = '@media print { @page { size: letter landscape; margin: 10mm; } }'
    document.head.appendChild(st)
  } else if (!landscape && existing) existing.remove()
}

const AutoOrientation = () => {
  useEffect(() => {
    let timer = null
    const schedule = () => { clearTimeout(timer); timer = setTimeout(check, 250) }
    const obs = new MutationObserver((list) => {
      // Ignora los cambios que provoca la propia medición y los que no tocan formatos.
      if (list.every((m) => [...m.addedNodes, ...m.removedNodes].every((n) => n.nodeType !== 1 || n.style?.left === '-10000px'))) return
      if (!document.querySelector('.cy-sheet') && !document.getElementById(STYLE_ID)) return
      schedule()
    })
    obs.observe(document.body, { childList: true, subtree: true })
    window.addEventListener('beforeprint', check)
    schedule()
    return () => { obs.disconnect(); clearTimeout(timer); window.removeEventListener('beforeprint', check) }
  }, [])
  return null
}

export default AutoOrientation
