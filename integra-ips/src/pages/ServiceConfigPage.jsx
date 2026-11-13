import React, { useEffect, useState } from 'react'
import { MdSave, MdErrorOutline, MdTune } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { PageHead, Card, Spinner, useToast } from '../components/ui'
import ColdChainSuppliers from './ColdChainSuppliers'
import ColdChainReminderSettings from './ColdChainReminderSettings'

const TITLES = {
  citologia: ['Configuración de citologías', 'El valor de la citología está en Facturación → Tarifario'],
  cadena_frio: ['Configuración de cadena de frío', 'Rango de temperatura permitido para las neveras; fuera de él se genera alerta']
}

// Configuración propia de un servicio (solo administrador): se abre desde la sección del servicio en el menú.
const ServiceConfigPage = ({ module }) => {
  const [toast, toastNode] = useToast()
  const [service, setService] = useState(null)
  const [f, setF] = useState({})
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => {
    api.get('/servicios-ips').then(({ data }) => {
      const s = data.find((x) => x.module === module)
      if (!s) return setError('No hay un servicio de IPS creado para este módulo.')
      setService(s); setF(Object.fromEntries(s.settingsSchema.map((x) => [x.key, s.settings?.[x.key] ?? x.default ?? ''])))
    }).catch((e) => setError(errorMessage(e)))
  }, [module])
  const save = async (e) => {
    e.preventDefault(); setError(''); setSaving(true)
    try { const { data } = await api.put(`/servicios-ips/${service.id}/configuracion`, { ...f, custom: service.settings?.custom || [] }); setService(data); toast('Configuración guardada') } catch (err) { setError(errorMessage(err)) } finally { setSaving(false) }
  }
  const [title, subtitle] = TITLES[module]
  return (
    <>
      <PageHead title={title} subtitle={subtitle} />
      {!service && !error && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>}
      {service && service.settingsSchema.length > 0 && (
        <form onSubmit={save} noValidate style={{ maxWidth: 640 }}>
          <Card title={service.name} icon={<MdTune style={{ color: 'var(--brand)' }} />}>
            <div className="form-grid" style={{ gridTemplateColumns: `repeat(${Math.min(service.settingsSchema.length, 2)}, minmax(0, 1fr))` }}>
              {service.settingsSchema.map((x) => (
                <div key={x.key} className="field"><label>{x.label}{x.unit ? ` (${x.unit})` : ''} {x.required && <span className="req">*</span>}</label>
                  <input type={x.type === 'number' ? 'number' : 'text'} step={x.step} min={x.min} value={f[x.key]} onChange={(e) => setF({ ...f, [x.key]: e.target.value })} />
                  {x.help && <span className="hint">{x.help}</span>}</div>
              ))}
            </div>
            <div className="form-actions" style={{ marginTop: 16 }}><button type="submit" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <MdSave />} Guardar</button></div>
          </Card>
        </form>
      )}
      {error && <div className="alert bad" style={{ marginTop: 16, maxWidth: 640 }}><MdErrorOutline /><span>{error}</span></div>}
      {module === 'cadena_frio' && <ColdChainReminderSettings />}
      {module === 'cadena_frio' && <ColdChainSuppliers />}
      {toastNode}
    </>
  )
}

export default ServiceConfigPage
