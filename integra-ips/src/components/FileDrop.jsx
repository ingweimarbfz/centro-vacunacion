import React, { useRef, useState } from 'react'
import { MdUploadFile, MdInsertDriveFile } from 'react-icons/md'

const fmtSize = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)

// Zona estándar para cargar documentos: clic, teclado o arrastrar y soltar.
// `icon` permite mostrar el ícono del tipo de archivo elegido.
const FileDrop = ({ file, onPick, accept, placeholder, current, icon }) => {
  const ref = useRef(null)
  const [over, setOver] = useState(false)
  const open = () => ref.current?.click()
  return (
    <>
      <div className={`th-file${file ? ' on' : ''}${over ? ' over' : ''}`} onClick={open} role="button" tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open() } }}
        onDragOver={(e) => { e.preventDefault(); setOver(true) }} onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); if (e.dataTransfer.files[0]) onPick(e.dataTransfer.files[0]) }}>
        {file ? (icon || <MdInsertDriveFile />) : <MdUploadFile />}
        <span>{file ? `${file.name} · ${fmtSize(file.size)}` : current ? `Actual: ${current}. Clic o arrastra para reemplazarlo (opcional)` : placeholder}</span>
      </div>
      <input ref={ref} type="file" accept={accept} hidden onChange={(e) => { if (e.target.files[0]) onPick(e.target.files[0]); e.target.value = '' }} />
    </>
  )
}

export default FileDrop
