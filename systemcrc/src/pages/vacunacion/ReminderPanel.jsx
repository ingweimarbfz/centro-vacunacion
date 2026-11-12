import React, { useCallback, useEffect, useState } from 'react'
import { MdSave, MdPlayArrow, MdVisibility, MdErrorOutline, MdInfoOutline, MdEmail, MdCheckCircle } from 'react-icons/md'
import { FaWhatsapp } from 'react-icons/fa'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import './vacunacion.css'

const fmt = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')
// Formato de WhatsApp en la vista previa: *negrita* y _cursiva_.
const waFormat = (text) => text.split(/(\*[^*\n]+\*|(?<=^|\s)_[^_\n]+_(?=\s|$))/gm).map((part, i) => (part.startsWith('*') && part.endsWith('*') && part.length > 2 ? <b key={i}>{part.slice(1, -1)}</b> : part.startsWith('_') && part.endsWith('_') && part.length > 2 ? <i key={i}>{part.slice(1, -1)}</i> : part))
const STATUS = { enviado: ['Enviado', 'ok'], manual: ['Listo para enviar', 'warn'], omitido: ['Omitido (modo prueba)', ''], sin_configurar: ['Falta configurar', 'warn'], error: ['Error', 'bad'], sin_contacto: ['Sin dato de contacto', ''] }

// Vista previa de los mensajes (WhatsApp y correo) para un registro con siguiente dosis.
export const ReminderPreview = ({ recordId, onClose }) => {
  const [p, setP] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api.get(`/vacunacion/recordatorios/vista-previa/${recordId}`).then(({ data }) => setP(data)).catch((e) => setErr(errorMessage(e))) }, [recordId])
  return (
    <Modal title={p ? `Recordatorio para ${p.patient}` : 'Vista previa'} size="lg" onClose={onClose} footer={<button type="button" className="btn btn-outline" onClick={onClose}>Cerrar</button>}>
      {!p ? (err ? <div className="alert bad"><MdErrorOutline /><span>{err}</span></div> : <div className="splash" style={{ minHeight: 120 }}><Spinner /></div>) : (
        <div className="grid grid-2" style={{ alignItems: 'start' }}>
          <div className="stack" style={{ gap: 8 }}>
            <b><FaWhatsapp style={{ color: '#25D366', verticalAlign: -2 }} /> WhatsApp · {p.phone || 'sin celular'}</b>
            <div className="wa-preview"><div className="wa-bubble">{waFormat(p.whatsapp)}</div></div>
          </div>
          <div className="stack" style={{ gap: 8 }}>
            <b><MdEmail style={{ verticalAlign: -2 }} /> Correo · {p.email || 'sin correo'}</b>
            <span className="hint">Asunto: {p.subject}</span>
            {/* HTML generado por el servidor con los datos escapados; se muestra tal como llega al correo. */}
            <div className="mail-preview" style={{ overflow: 'auto' }} dangerouslySetInnerHTML={{ __html: (p.emailHtml.match(/<body[^>]*>([\s\S]*)<\/body>/) || [null, p.emailHtml])[1] }} />
          </div>
        </div>
      )}
    </Modal>
  )
}

// Seguimiento → Recordatorios: configuración, ejecución y estado de los avisos de la siguiente dosis.
const ReminderPanel = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [toast, toastNode] = useToast()
  const [d, setD] = useState(null); const [cfg, setCfg] = useState(null); const [busy, setBusy] = useState(false); const [preview, setPreview] = useState(null)
  const load = useCallback(() => api.get('/vacunacion/recordatorios').then(({ data }) => { setD(data); setCfg({ ...data.config, testPhones: data.config.testPhones.join(', '), testEmails: data.config.testEmails.join(', ') }) }).catch((e) => toast(errorMessage(e), 'bad')), [toast])
  useEffect(() => { load() }, [load])
  if (!d || !cfg) return <div className="splash" style={{ minHeight: 160 }}><Spinner /></div>
  if (d.planIncluded === false) return <div className="alert warn"><MdInfoOutline /><span><b>Tu plan no incluye los recordatorios automáticos de próxima dosis.</b> Están disponibles desde el plan Integral; consulta las opciones con el botón de mejorar plan del menú.</span></div>
  const set = (k) => (e) => setCfg({ ...cfg, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const save = async () => {
    setBusy(true)
    try { await api.put('/vacunacion/recordatorios/config', { ...cfg, testPhones: cfg.testPhones.split(','), testEmails: cfg.testEmails.split(',') }); toast('Configuración guardada'); load() } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy(false) }
  }
  // Interruptor general: se guarda de inmediato.
  const toggleGeneral = async (on) => {
    setBusy(true)
    try { await api.put('/vacunacion/recordatorios/envio-general', { enabled: on }); toast(on ? 'Envío de recordatorios activado' : 'Envío de recordatorios desactivado: no saldrá ningún mensaje'); load() } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy(false) }
  }
  const runNow = async () => {
    setBusy(true)
    try { const { data } = await api.post('/vacunacion/recordatorios/ejecutar', {}); toast(data.results.length ? `${data.results.length} recordatorio${data.results.length === 1 ? '' : 's'} procesado${data.results.length === 1 ? '' : 's'}` : 'No hay recordatorios nuevos para hoy'); load() } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy(false) }
  }
  const sendManual = async (x) => { window.open(x.detail, '_blank', 'noopener'); try { await api.post(`/vacunacion/recordatorios/${x.id}/enviado`); load() } catch { /* sin conexión */ } }
  return (
    <div className="stack">
      <Card title="Recordatorios de la siguiente dosis" subtitle={`Se envían ${cfg.daysBefore} días antes por correo y WhatsApp, una vez al día desde las ${cfg.runHour}:00 (hora de Colombia)`}
        actions={admin && <button type="button" className="btn btn-outline btn-sm" onClick={runNow} disabled={busy || !cfg.enabled} title={cfg.enabled ? '' : 'Activa el envío general para ejecutar'}><MdPlayArrow /> Ejecutar ahora</button>}>
        <div className="stack" style={{ gap: 12 }}>
          <div className={`alert ${cfg.enabled ? 'ok' : 'warn'}`} style={{ margin: 0, alignItems: 'center' }}>
            <MdInfoOutline />
            <span style={{ flex: 1 }}><b>Envío general {cfg.enabled ? 'activado' : 'desactivado'}.</b> {cfg.enabled ? `Cada paciente recibe el aviso en su propio celular y correo ${cfg.daysBefore} días antes de su dosis.` : 'No se envía ningún recordatorio, ni automático ni manual desde “Ejecutar ahora”.'}</span>
            {admin && <label className="switch" style={{ margin: 0 }}><input type="checkbox" checked={cfg.enabled} onChange={(e) => toggleGeneral(e.target.checked)} disabled={busy} /> {cfg.enabled ? 'Activado' : 'Desactivado'}</label>}
          </div>
          <div className="vac-split">
            <div><b>{d.channels.email ? 'Listo' : 'Sin configurar'}</b><span>Correo del servidor (SMTP)</span></div>
            <div><b>{d.channels.whatsapp ? 'Automático' : 'Manual'}</b><span>WhatsApp {d.channels.whatsapp ? '(API de WhatsApp Business)' : '(enlace listo para enviar)'}</span></div>
            <div><b>{cfg.testMode ? 'Solo autorizados' : 'Cada paciente'}</b><span>Destinatarios</span></div>
            <div><b>{cfg.lastRunOn ? fmt(cfg.lastRunOn) : '—'}</b><span>Última ejecución</span></div>
          </div>
          {cfg.testMode && <div className="alert warn" style={{ margin: 0 }}><MdInfoOutline /><span><b>Modo prueba:</b> solo se envía a los celulares y correos autorizados abajo; los demás pacientes quedan como “omitido”.</span></div>}
          {admin && (<>
            <div className="form-grid rem-fields">
              <div className="field"><label>Días de anticipación</label><input type="number" min="1" max="60" value={cfg.daysBefore} onChange={set('daysBefore')} /></div>
              <div className="field"><label>Hora de envío</label><input type="number" min="0" max="23" value={cfg.runHour} onChange={set('runHour')} /></div>
              <div className="field"><label>Horario de atención (en el mensaje)</label><input value={cfg.officeHours || ''} onChange={set('officeHours')} /></div>
            </div>
            <div className="rem-toggles">
              <label className={`rem-toggle${cfg.sendEmail ? ' on' : ''}`}><input type="checkbox" checked={cfg.sendEmail} onChange={set('sendEmail')} /><span className="rem-toggle-ui" /><span><b>Correo</b><small>Aviso por correo electrónico</small></span></label>
              <label className={`rem-toggle${cfg.sendWhatsapp ? ' on' : ''}`}><input type="checkbox" checked={cfg.sendWhatsapp} onChange={set('sendWhatsapp')} /><span className="rem-toggle-ui" /><span><b>WhatsApp</b><small>Mensaje al celular</small></span></label>
              <label className={`rem-toggle${cfg.testMode ? ' on' : ''}`}><input type="checkbox" checked={cfg.testMode} onChange={set('testMode')} /><span className="rem-toggle-ui" /><span><b>Modo prueba</b><small>Solo a destinatarios autorizados</small></span></label>
            </div>
            {cfg.testMode && <div className="form-grid">
              <div className="field span-2"><label>Celulares autorizados (modo prueba)</label><input value={cfg.testPhones} onChange={set('testPhones')} placeholder="3001234567, …" /></div>
              <div className="field span-2"><label>Correos autorizados (modo prueba)</label><input value={cfg.testEmails} onChange={set('testEmails')} placeholder="correo@ejemplo.com, …" /></div>
            </div>}
            <div><button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <MdSave />} Guardar</button></div>
          </>)}
        </div>
      </Card>
      <Card flush title="Historial de recordatorios" subtitle="Lo que se envió, lo que quedó listo para enviar por WhatsApp y lo que se omitió">
        {d.items.length === 0 ? <Empty icon={<MdCheckCircle />}>Aún no hay recordatorios.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Paciente</th><th>Dosis</th><th>Canal</th><th>Destinatario</th><th>Estado</th><th className="actions" /></tr></thead>
            <tbody>{d.items.map((x) => (
              <tr key={x.id}>
                <td><strong style={{ color: 'var(--ink)' }}>{x.patient}</strong><div className="hint">{x.docNumber}</div></td>
                <td>{x.vaccine}<div className="hint">{x.dose} · {fmt(x.dueDate)}</div></td>
                <td>{x.channel === 'whatsapp' ? <><FaWhatsapp style={{ color: '#25D366', verticalAlign: -2 }} /> WhatsApp</> : <><MdEmail style={{ verticalAlign: -2 }} /> Correo</>}</td>
                <td>{x.recipient || '—'}</td>
                <td><span className={`badge ${STATUS[x.status]?.[1] || ''}`}>{STATUS[x.status]?.[0] || x.status}</span>{x.status !== 'manual' && x.detail && <div className="hint">{x.detail}</div>}{x.sentAt && <div className="hint">{new Date(x.sentAt).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' })}</div>}</td>
                <td className="actions" style={{ whiteSpace: 'nowrap' }}>
                  <button type="button" className="btn btn-ghost btn-icon" title="Vista previa" aria-label="Vista previa" onClick={() => setPreview(x.recordId)}><MdVisibility /></button>
                  {x.status === 'manual' && <button type="button" className="btn btn-primary btn-sm" style={{ background: '#25D366', borderColor: '#25D366' }} onClick={() => sendManual(x)}><FaWhatsapp /> Enviar</button>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      {preview && <ReminderPreview recordId={preview} onClose={() => setPreview(null)} />}
      {toastNode}
    </div>
  )
}

export default ReminderPanel
