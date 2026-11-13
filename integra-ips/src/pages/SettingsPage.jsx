import React, { useEffect, useRef, useState } from 'react'
import { MdSave, MdUpload, MdRestartAlt, MdPalette, MdBusiness, MdErrorOutline, MdImage, MdLogin, MdGavel } from 'react-icons/md'
import { Link } from 'react-router-dom'
import api, { errorMessage } from '../api/client'
import { useSettings, applyTheme, DEFAULT_SETTINGS } from '../context/SettingsContext'
import { PageHead, Card, Spinner, useToast } from '../components/ui'
import { UsersSignaturesCard } from './SignaturePage'
import DiscountsCard from './DiscountsCard'
import { resizeImage } from '../utils/image'
import defaultLogo from '../assets/integraLogo.svg'
import defaultLoginImage from '../assets/loginHealth.svg'
import { defaultLoginDescription, defaultLoginFooter } from '../components/Login'

const PRESETS = [
  ['Cruz Roja', '#E30613', '#1F2A44'],
  ['Hospitalario', '#0E7490', '#0F172A'],
  ['Salud verde', '#15803D', '#14332A'],
  ['Índigo', '#4F46E5', '#1E1B4B']
]

const ColorField = ({ label, value, onChange }) => (
  <div className="field">
    <label>{label}</label>
    <div style={{ display: 'flex', gap: 8 }}>
      <input type="color" value={value} onChange={(e) => onChange(e.target.value.toUpperCase())}
        style={{ width: 46, height: 40, padding: 3, border: '1px solid var(--line)', borderRadius: 8, background: '#fff', cursor: 'pointer' }} aria-label={label} />
      <input value={value} onChange={(e) => onChange(e.target.value.toUpperCase())} maxLength={7} style={{ fontFamily: 'monospace' }} />
    </div>
  </div>
)

const SettingsPage = () => {
  const { setSettings: setGlobal, settings: global } = useSettings()
  const [toast, toastNode] = useToast()
  const [form, setForm] = useState(null)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef(null)
  const loginRef = useRef(null)

  useEffect(() => {
    api.get('/configuracion').then(({ data }) => setForm(data)).catch((e) => setError(errorMessage(e)))
  }, [])

  // Vista previa en vivo de los colores; si no se guarda, se restauran al salir.
  useEffect(() => { if (form) applyTheme(form) }, [form])
  useEffect(() => () => applyTheme(global), [global])

  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v?.target ? v.target.value : v }))

  const publish = (data) => setGlobal((g) => ({ ...g, ipsName: data.ipsName, shortName: data.shortName, primaryColor: data.primaryColor, secondaryColor: data.secondaryColor, logoUrl: data.logoUrl, loginImageUrl: data.loginImageUrl, loginDescription: data.loginDescription, loginFooter: data.loginFooter }))

  const save = async (e) => {
    e.preventDefault()
    setError('')
    const hex = /^#[0-9A-F]{6}$/i
    if (!hex.test(form.primaryColor) || !hex.test(form.secondaryColor)) return setError('Los colores deben tener formato #RRGGBB.')
    setSaving(true)
    try {
      const { data } = await api.put('/configuracion', form)
      setForm(data); publish(data)
      toast('Configuración guardada')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const uploadLogo = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const image = await resizeImage(file, { max: 800, type: 'image/png' })
      const { data } = await api.post('/configuracion/logo', { image })
      setForm((f) => ({ ...f, logoUrl: data.logoUrl })); publish(data)
      toast('Logo actualizado')
    } catch (err) {
      toast(errorMessage(err), 'bad')
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const uploadLoginImage = async (file) => {
    if (!file) return
    setUploading(true)
    try {
      const image = await resizeImage(file, { max: 1600, type: 'image/jpeg', quality: 0.82 })
      const { data } = await api.post('/configuracion/login-imagen', { image })
      setForm((f) => ({ ...f, loginImageUrl: data.loginImageUrl })); publish(data)
      toast('Imagen del login actualizada')
    } catch (err) { toast(errorMessage(err), 'bad') } finally { setUploading(false); if (loginRef.current) loginRef.current.value = '' }
  }
  const resetLoginImage = async () => {
    setUploading(true)
    try { const { data } = await api.delete('/configuracion/login-imagen'); setForm((f) => ({ ...f, loginImageUrl: null })); publish(data); toast('Se restauró la imagen por defecto') } catch (err) { toast(errorMessage(err), 'bad') } finally { setUploading(false) }
  }

  const resetLogo = async () => {
    setUploading(true)
    try {
      const { data } = await api.delete('/configuracion/logo')
      setForm((f) => ({ ...f, logoUrl: null })); publish(data)
      toast('Se restauró el logo original')
    } catch (err) {
      toast(errorMessage(err), 'bad')
    } finally {
      setUploading(false)
    }
  }

  if (!form) return error ? <div className="alert bad"><MdErrorOutline /><span>{error}</span></div> : <div className="splash"><Spinner /></div>

  return (
    <>
    <form onSubmit={save} noValidate>
      <PageHead title="Configuración" subtitle="Identidad visual del sistema, nombre, descuentos y firmas digitales">
        <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <><Spinner /> Guardando…</> : <><MdSave /> Guardar cambios</>}</button>
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 18 }}><MdErrorOutline /><span>{error}</span></div>}

      <div className="grid grid-2-1">
        <div className="stack">
          <Card title="Datos de la IPS" icon={<MdBusiness style={{ color: 'var(--brand)' }} />}>
            <div className="form-grid">
              <div className="field span-2"><label>Nombre de la institución</label><input value={form.ipsName} onChange={set('ipsName')} maxLength={90} /></div>
              <div className="field"><label>Nombre corto</label><input value={form.shortName} onChange={set('shortName')} maxLength={40} /><span className="hint">Se usa en los formatos impresos y en la pestaña del navegador.</span></div>
            </div>
          </Card>

          <Card title="Colores" subtitle="Se aplican a menú, botones, gráficas y login" icon={<MdPalette style={{ color: 'var(--brand)' }} />}>
            <div className="form-grid">
              <ColorField label="Color principal" value={form.primaryColor} onChange={set('primaryColor')} />
              <ColorField label="Color secundario" value={form.secondaryColor} onChange={set('secondaryColor')} />
            </div>
            <div style={{ marginTop: 16 }}>
              <span className="label">Combinaciones sugeridas</span>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8 }}>
                {PRESETS.map(([name, p, s]) => (
                  <button key={name} type="button" className="btn btn-outline btn-sm" onClick={() => setForm((f) => ({ ...f, primaryColor: p, secondaryColor: s }))}>
                    <span style={{ width: 14, height: 14, borderRadius: 4, background: p }} /><span style={{ width: 14, height: 14, borderRadius: 4, background: s, marginLeft: -4 }} /> {name}
                  </button>
                ))}
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setForm((f) => ({ ...f, primaryColor: DEFAULT_SETTINGS.primaryColor, secondaryColor: DEFAULT_SETTINGS.secondaryColor }))}><MdRestartAlt /> Restablecer</button>
              </div>
            </div>
          </Card>

          <Card title="Pantalla de inicio de sesión" subtitle="Imagen de fondo, descripción y pie de página del login" icon={<MdLogin style={{ color: 'var(--brand)' }} />}>
            <div className="login-cfg">
              <div className="login-cfg-img" style={{ backgroundImage: `url(${form.loginImageUrl || defaultLoginImage})` }}>
                <span>{form.loginImageUrl ? 'Imagen propia' : 'Imagen por defecto'}</span>
              </div>
              <div className="stack" style={{ gap: 8, flex: 1 }}>
                <input ref={loginRef} type="file" accept="image/png,image/jpeg,image/webp" hidden onChange={(e) => uploadLoginImage(e.target.files[0])} />
                <button type="button" className="btn btn-outline" onClick={() => loginRef.current.click()} disabled={uploading}>{uploading ? <Spinner /> : <MdUpload />} Cargar imagen de fondo</button>
                {form.loginImageUrl && <button type="button" className="btn btn-ghost" onClick={resetLoginImage} disabled={uploading}><MdRestartAlt /> Usar la imagen por defecto</button>}
                <span className="hint">JPG o PNG horizontal; se ajusta a 1600 px. Se muestra con el color secundario encima.</span>
              </div>
            </div>
            <div className="form-grid" style={{ marginTop: 14 }}>
              <div className="field span-all"><label>Descripción</label><textarea value={form.loginDescription || ''} onChange={set('loginDescription')} maxLength={600} style={{ minHeight: 80 }} placeholder={defaultLoginDescription(form.ipsName)} /><span className="hint">Vacío = texto por defecto.</span></div>
              <div className="field span-all"><label>Pie de página</label><input value={form.loginFooter || ''} onChange={set('loginFooter')} maxLength={200} placeholder={defaultLoginFooter()} /></div>
            </div>
          </Card>
        </div>

        <div className="stack">
          <Card title="Logo" subtitle="PNG, JPG, WEBP o SVG · máx. 2 MB" icon={<MdImage style={{ color: 'var(--brand)' }} />}>
            <div style={{ border: '1px dashed var(--line)', borderRadius: 10, padding: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 120, background: '#FAFAFB' }}>
              <img src={form.logoUrl || defaultLogo} alt="Logo actual" style={{ maxWidth: '100%', maxHeight: 90, objectFit: 'contain' }} />
            </div>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" hidden onChange={(e) => uploadLogo(e.target.files[0])} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              <button type="button" className="btn btn-outline" style={{ width: '100%' }} onClick={() => fileRef.current.click()} disabled={uploading}>{uploading ? <Spinner /> : <MdUpload />} Cargar logo</button>
              {form.logoUrl && <button type="button" className="btn btn-ghost" style={{ width: '100%', whiteSpace: 'normal' }} onClick={resetLogo} disabled={uploading}><MdRestartAlt /> Usar logo de Integra IPS</button>}
            </div>
          </Card>

          <Card title="Vista previa">
            <div style={{ border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden' }}>
              <div style={{ background: form.secondaryColor, color: '#fff', padding: '14px 16px', fontWeight: 600 }}>{form.shortName}</div>
              <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div className="nav-link active" style={{ pointerEvents: 'none' }}>Opción activa del menú</div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <span className="btn btn-primary btn-sm" style={{ pointerEvents: 'none' }}>Botón principal</span>
                  <span className="badge brand">Etiqueta</span>
                </div>
              </div>
            </div>
            <p className="hint" style={{ fontSize: 12, color: 'var(--muted)', margin: '10px 0 0' }}>Los colores se ven en vivo; se aplican para todos al guardar.</p>
          </Card>
        </div>
      </div>
      {toastNode}
    </form>
    <div id="descuentos" style={{ marginTop: 18 }}><DiscountsCard /></div>
    <div id="firmas" style={{ marginTop: 18 }}><UsersSignaturesCard /></div>
    <div id="legal" style={{ marginTop: 18 }}>
      <Card title="Documentos legales" subtitle="Contrato del servicio, acuerdo de tratamiento de datos y términos de uso (Integra IPS)" icon={<MdGavel style={{ color: 'var(--brand)' }} />}>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Link className="btn btn-outline" to="/legal/contrato"><MdGavel /> Contrato de servicio</Link>
          <Link className="btn btn-outline" to="/legal/datos"><MdGavel /> Acuerdo de tratamiento de datos</Link>
          <Link className="btn btn-outline" to="/legal/terminos"><MdGavel /> Términos y condiciones</Link>
        </div>
      </Card>
    </div>
    </>
  )
}

export default SettingsPage
