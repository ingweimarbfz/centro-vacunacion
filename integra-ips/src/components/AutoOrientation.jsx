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
  // Ancho cómodo: cada celda con su contenido en una línea, hasta 55 mm (los textos más largos sí se parten).
  // Si la tabla tiene muchas columnas con datos, este ancho supera la hoja vertical aunque la mínima quepa
  // apretando todo en varias líneas.
  host.classList.add('ao-measure')
  sheet.style.width = 'max-content'
  clone.style.width = 'max-content'
  const natural = clone.scrollWidth
  host.remove()
  return { min, natural }
}

const ensureMeasureStyle = () => {
  if (document.getElementById('auto-orientation-measure')) return
  const st = document.createElement('style')
  st.id = 'auto-orientation-measure'
  st.textContent = '.ao-measure td, .ao-measure th { max-width: 55mm; } .ao-measure table { table-layout: auto; }'
  document.head.appendChild(st)
}

const check = () => {
  let landscape = false
  ensureMeasureStyle()
  document.querySelectorAll('.cy-sheet').forEach((sheet) => {
    if (sheet.closest('.th-landscape, .tr-report, [data-orientation="fixed"]')) return
    const tables = [...sheet.querySelectorAll('table')]
    const sizes = tables.map((t) => needsWidth(t, sheet))
    const min = sizes.reduce((m, s) => Math.max(m, s.min), 0)
    const natural = sizes.reduce((m, s) => Math.max(m, s.natural), 0)
    // Horizontal si la tabla no cabe en vertical, o si sus datos son tan anchos que en vertical
    // quedarían apretados en muchas líneas (más de un 15 % por encima del ancho de la hoja).
    const land = min > PORTRAIT + 2 || natural > PORTRAIT * 1.15
    sheet.classList.toggle('sheet-landscape', land)
    sheet.classList.toggle('sheet-compact', min > LANDSCAPE + 2)
    if (land) landscape = true
  })
  const existing = document.getElementById(STYLE_ID)
  if (landscape && !existing) {
    const st = document.createElement('style')
    st.id = STYLE_ID
    st.textContent = '@media print { @page { size: letter landscape; margin: 10mm; } }'
    document.head.appendChild(st)
  } else if (landscape) document.head.appendChild(existing) // al final, para ganarle al @page de las hojas de estilo cargadas después
  else if (existing) existing.remove()
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
