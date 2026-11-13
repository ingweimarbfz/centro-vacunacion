import React, { useRef, useState } from 'react'
import { MdPhotoCamera, MdDelete, MdSave, MdLock, MdErrorOutline, MdBadge } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS, ROLE_DESCRIPTIONS } from '../utils/permissions'
import { PageHead, Card, Avatar, Spinner, useToast } from '../components/ui'
import { resizeImage, ACCEPTED_IMAGES } from '../utils/image'
import { EmailInput } from '../components/inputs'

const ROLE_DESC = ROLE_DESCRIPTIONS

const ProfilePage = () => {
  const { user, setUser } = useAuth()
  const [toast, toastNode] = useToast()
  const fileRef = useRef(null)
  const [uploading, setUploading] = useState(false)
  const [info, setInfo] = useState({ name: user.name, lastName: user.lastName, email: user.email || '' })
  const [infoError, setInfoError] = useState('')
  const [savingInfo, setSavingInfo] = useState(false)
  const [pw, setPw] = useState({ actual: '', nueva: '', confirmar: '' })
  const [pwError, setPwError] = useState('')
  const [savingPw, setSavingPw] = useState(false)

  const uploadPhoto = async (file) => {
    if (!file) return
    if (!ACCEPTED_IMAGES.split(',').includes(file.type)) return toast('Usa una imagen PNG, JPG o WEBP', 'bad')
    setUploading(true)
    try {
      const image = await resizeImage(file, { max: 400, square: true, type: 'image/jpeg' })
      const { data } = await api.post('/perfil/foto', { image })
      setUser(data)
      toast('Foto actualizada')
    } catch (e) {
      toast(errorMessage(e), 'bad')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const removePhoto = async () => {
    setUploading(true)
    try {
      const { data } = await api.delete('/perfil/foto')
      setUser(data)
      toast('Foto eliminada')
    } catch (e) {
      toast(errorMessage(e), 'bad')
    } finally {
      setUploading(false)
    }
  }

  const saveInfo = async (e) => {
    e.preventDefault()
    setInfoError('')
    if (!info.name.trim() || !info.lastName.trim()) return setInfoError('Nombre y apellidos son requeridos.')
    setSavingInfo(true)
    try {
      const { data } = await api.put('/perfil', info)
      setUser(data)
      toast('Datos actualizados')
    } catch (err) {
      setInfoError(errorMessage(err))
    } finally {
      setSavingInfo(false)
    }
  }

  const savePw = async (e) => {
    e.preventDefault()
    setPwError('')
    if (pw.nueva.length < 6) return setPwError('La nueva contraseña debe tener al menos 6 caracteres.')
    if (pw.nueva !== pw.confirmar) return setPwError('Las contraseñas no coinciden.')
    setSavingPw(true)
    try {
      await api.put('/perfil/password', { actual: pw.actual, nueva: pw.nueva })
      setPw({ actual: '', nueva: '', confirmar: '' })
      toast('Contraseña actualizada')
    } catch (err) {
      setPwError(errorMessage(err))
    } finally {
      setSavingPw(false)
    }
  }

  return (
    <>
      <PageHead title="Mi perfil" subtitle="Tu foto, tus datos y tu contraseña" />
      <div className="grid grid-2-1" style={{ gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 2fr)' }}>
        <Card>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 10, padding: '8px 0' }}>
            <div style={{ position: 'relative' }}>
              <Avatar user={user} size="lg" />
              <button type="button" className="btn btn-primary btn-icon" style={{ position: 'absolute', right: -2, bottom: 2, borderRadius: '50%', border: '3px solid #fff' }}
                onClick={() => fileRef.current.click()} disabled={uploading} aria-label="Cambiar foto">
                {uploading ? <Spinner /> : <MdPhotoCamera />}
              </button>
            </div>
            <input ref={fileRef} type="file" accept={ACCEPTED_IMAGES} hidden onChange={(e) => uploadPhoto(e.target.files[0])} />
            <div>
              <h3 style={{ fontSize: 18 }}>{user.fullName}</h3>
              <span style={{ color: 'var(--muted)' }}>@{user.nameUser}</span>
            </div>
            <span className="badge brand"><MdBadge /> {ROLE_LABELS[user.role]}</span>
            <p style={{ color: 'var(--muted)', fontSize: 13, margin: 0 }}>{ROLE_DESC[user.role]}</p>
            <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
              <button type="button" className="btn btn-outline btn-sm" onClick={() => fileRef.current.click()} disabled={uploading}><MdPhotoCamera /> {user.avatarUrl ? 'Cambiar foto' : 'Cargar foto'}</button>
              {user.avatarUrl && <button type="button" className="btn btn-ghost btn-sm" onClick={removePhoto} disabled={uploading}><MdDelete /> Quitar</button>}
            </div>
          </div>
        </Card>

        <div className="stack">
          <Card title="Datos personales">
            <form onSubmit={saveInfo} noValidate>
              <div className="form-grid">
                <div className="field"><label>Nombre</label><input value={info.name} onChange={(e) => setInfo({ ...info, name: e.target.value })} maxLength={60} /></div>
                <div className="field"><label>Apellidos</label><input value={info.lastName} onChange={(e) => setInfo({ ...info, lastName: e.target.value })} maxLength={60} /></div>
                <div className="field"><label>Correo</label><EmailInput value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} /></div>
                <div className="field"><label>Identificación</label><input value={user.identification} readOnly /></div>
                <div className="field"><label>Usuario</label><input value={user.nameUser} readOnly /></div>
                <div className="field"><label>Rol</label><input value={ROLE_LABELS[user.role]} readOnly /></div>
              </div>
              {infoError && <div className="alert bad" style={{ marginTop: 14 }}><MdErrorOutline /><span>{infoError}</span></div>}
              <div className="form-actions"><button type="submit" className="btn btn-primary" disabled={savingInfo}>{savingInfo ? <Spinner /> : <MdSave />} Guardar datos</button></div>
            </form>
          </Card>

          <Card title="Cambiar contraseña" icon={<MdLock style={{ color: 'var(--brand)' }} />}>
            <form onSubmit={savePw} noValidate>
              <div className="form-grid">
                <div className="field"><label>Contraseña actual</label><input type="password" autoComplete="current-password" value={pw.actual} onChange={(e) => setPw({ ...pw, actual: e.target.value })} /></div>
                <div className="field"><label>Nueva contraseña</label><input type="password" autoComplete="new-password" value={pw.nueva} onChange={(e) => setPw({ ...pw, nueva: e.target.value })} /></div>
                <div className="field"><label>Confirmar</label><input type="password" autoComplete="new-password" value={pw.confirmar} onChange={(e) => setPw({ ...pw, confirmar: e.target.value })} /></div>
              </div>
              {pwError && <div className="alert bad" style={{ marginTop: 14 }}><MdErrorOutline /><span>{pwError}</span></div>}
              <div className="form-actions"><button type="submit" className="btn btn-dark" disabled={savingPw}>{savingPw ? <Spinner /> : <MdLock />} Actualizar contraseña</button></div>
            </form>
          </Card>
        </div>
      </div>
      {toastNode}
    </>
  )
}

export default ProfilePage
