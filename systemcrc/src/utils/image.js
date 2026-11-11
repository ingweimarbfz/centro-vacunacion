// Reduce una imagen en el navegador antes de subirla (más rápido y liviano).
export const fileToDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })

export const resizeImage = async (file, { max = 400, type = 'image/jpeg', quality = 0.88, square = false } = {}) => {
  if (file.type === 'image/svg+xml') return fileToDataUrl(file)
  const src = await fileToDataUrl(file)
  const img = await new Promise((resolve, reject) => {
    const i = new Image()
    i.onload = () => resolve(i)
    i.onerror = reject
    i.src = src
  })
  let sx = 0; let sy = 0; let sw = img.width; let sh = img.height
  if (square) { // recorte centrado para fotos de perfil
    const side = Math.min(img.width, img.height)
    sx = (img.width - side) / 2; sy = (img.height - side) / 2; sw = side; sh = side
  }
  const scale = Math.min(1, max / Math.max(sw, sh))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(sw * scale)
  canvas.height = Math.round(sh * scale)
  canvas.getContext('2d').drawImage(img, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height)
  return canvas.toDataURL(type, quality)
}

export const ACCEPTED_IMAGES = 'image/png,image/jpeg,image/webp'
