import React, { useCallback, useEffect, useState } from 'react'
import { FaTelegramPlane as MdTelegram } from 'react-icons/fa'
import { MdSave, MdSearch, MdSend, MdDelete, MdErrorOutline, MdInfoOutline, MdLock, MdAdd } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { PageHead, Card, Spinner, Empty, useToast } from '../components/ui'
import '../pages/vacunacion/vacunacion.css'

// Administración → Notificaciones: bot de Telegram y grupos por sección.
const NotificationsPage = () => {
  const [toast, toastNode] = useToast()
  const [d, setD] = useState(null); const [err, setErr] = useState('')
  const [token, setToken] = useState(''); const [busy, setBusy] = useState('')
  const [found, setFound] = useState(null)
  const [pick, setPick] = useState({}); const [pickSite, setPickSite] = useState({})
  const load = useCallback(() => api.get('/notificaciones', { noCache: true }).then(({ data }) => setD(data)).catch((e) => setErr(errorMessage(e))), [])
  useEffect(() => { load() }, [load])
  const run = async (key, fn, ok) => { setBusy(key); try { await fn(); if (ok) toast(ok); await load() } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy('') } }
  if (err) return <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>
  if (!d) return <div className="splash"><Spinner /></div>
  const saveBot = (enabled) => run('bot', () => api.put('/notificaciones/bot', { token: token.trim() || undefined, enabled }).then(() => setToken('')), token.trim() ? 'Bot guardado y verificado con Telegram' : (enabled ? 'Notificaciones activadas' : 'Notificaciones desactivadas'))
  const search = () => run('search', () => api.post('/notificaciones/buscar-grupos').then(({ data }) => { setFound(data.groups); if (!data.groups.length) toast('No se encontraron grupos. Agrega el bot al grupo, escribe un mensaje y vuelve a buscar.', 'bad') }))
  const assign = (section) => {
    const g = (found || []).find((x) => x.chatId === pick[section])
    if (!g) return toast('Elige un grupo de la lista', 'bad')
    if (!pickSite[section]) return toast('Elige la sede del grupo', 'bad')
    return run(`add-${section}`, () => api.post('/notificaciones/canales', { section, chatId: g.chatId, title: g.title, siteId: pickSite[section] }), `Grupo “${g.title}” asignado`)
  }
  return (
    <>
      <PageHead title="Notificaciones" subtitle="Avisos automáticos en grupos de Telegram, un grupo por sección" />
      <div className="stack">
        <Card title="Bot de Telegram" icon={<MdTelegram style={{ color: '#229ED9' }} />} subtitle="Crea un bot con @BotFather en Telegram y pega aquí su token">
          <div className="stack" style={{ gap: 12 }}>
            {d.bot.configured && <div className="alert ok" style={{ margin: 0 }}><MdTelegram /><span>Bot <b>{d.bot.name}</b> (@{d.bot.username}) · token {d.bot.tokenMasked}</span></div>}
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              <input className="input" style={{ flex: 1, minWidth: 260 }} type="password" autoComplete="off" placeholder={d.bot.configured ? 'Pega un token nuevo solo si quieres cambiar el bot' : '123456789:AA… (token de @BotFather)'} value={token} onChange={(e) => setToken(e.target.value)} />
              <button type="button" className="btn btn-primary" disabled={busy === 'bot' || (!token.trim() && d.bot.configured)} onClick={() => saveBot(d.bot.enabled || !d.bot.configured)}>{busy === 'bot' ? <Spinner /> : <MdSave />} Guardar token</button>
            </div>
            <label className={`rem-toggle${d.bot.enabled ? ' on' : ''}`} style={{ maxWidth: 520 }}>
              <input type="checkbox" checked={d.bot.enabled} disabled={!d.bot.configured || busy === 'bot'} onChange={(e) => saveBot(e.target.checked)} />
              <span className="rem-toggle-ui" />
              <span><b>Envío de notificaciones {d.bot.enabled ? 'activado' : 'desactivado'}</b><small>Interruptor general: apagado, no sale ningún aviso a ningún grupo.</small></span>
            </label>
          </div>
        </Card>

        <Card title="Grupos por sección y sede" subtitle="Cada grupo recibe solo los avisos de su sede, para no saturar a las demás. Un grupo con “Todas las sedes” recibe todo (útil para la dirección). Una sección solo está disponible si su módulo está en tu plan. Para que cada usuario se una desde “Mis notificaciones”, haz al bot administrador de cada grupo con permiso para invitar usuarios."
          actions={<button type="button" className="btn btn-outline btn-sm" onClick={search} disabled={!d.bot.configured || busy === 'search'}>{busy === 'search' ? <Spinner /> : <MdSearch />} Buscar grupos</button>}>
          <div className="stack" style={{ gap: 14 }}>
            {found && found.length > 0 && <div className="alert info" style={{ margin: 0 }}><MdInfoOutline /><span>Se encontraron {found.length} grupo{found.length === 1 ? '' : 's'} con el bot: {found.map((g) => g.title).join(', ')}. Asígnalos abajo a su sección.</span></div>}
            {d.sections.map((s) => {
              const chans = d.channels.filter((c) => c.section === s.key)
              return (
                <div key={s.key} className="notif-section" style={{ border: '1px solid var(--line)', borderRadius: 12, padding: 14, opacity: s.available ? 1 : 0.6 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', flexWrap: 'wrap' }}>
                    <div><b style={{ color: 'var(--ink)' }}>{s.label}</b><div className="hint">{s.hint}</div></div>
                    {!s.available && <span className="badge"><MdLock /> No incluido en tu plan</span>}
                  </div>
                  {s.available && (
                    <div className="stack" style={{ gap: 8, marginTop: 10 }}>
                      {chans.length === 0 && <span className="hint">Sin grupo asignado.</span>}
                      {chans.map((c) => (
                        <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', padding: '8px 10px', background: 'var(--surface-2, #F8FAFC)', borderRadius: 10 }}>
                          <MdTelegram style={{ color: '#229ED9' }} /><div style={{ flex: 1, minWidth: 160 }}><b style={{ color: 'var(--ink)' }}>{c.title || 'Grupo'}</b><div className="hint"><span className="badge" style={{ marginRight: 6 }}>{c.siteName || 'Todas las sedes'}</span>{c.chatId}</div></div>
                          <label className="switch" style={{ margin: 0 }}><input type="checkbox" checked={c.enabled} onChange={(e) => run(`ch-${c.id}`, () => api.put(`/notificaciones/canales/${c.id}`, { enabled: e.target.checked }), e.target.checked ? 'Grupo activado' : 'Grupo desactivado')} /> {c.enabled ? 'Activo' : 'Inactivo'}</label>
                          <button type="button" className="btn btn-outline btn-sm" disabled={busy === `t-${c.id}`} onClick={() => run(`t-${c.id}`, () => api.post(`/notificaciones/canales/${c.id}/prueba`), 'Mensaje de prueba enviado')}>{busy === `t-${c.id}` ? <Spinner /> : <MdSend />} Prueba</button>
                          <button type="button" className="btn btn-ghost btn-icon" style={{ color: 'var(--bad)' }} aria-label="Quitar grupo" onClick={() => run(`d-${c.id}`, () => api.delete(`/notificaciones/canales/${c.id}`), 'Grupo quitado de la sección')}><MdDelete /></button>
                        </div>
                      ))}
                      {found && found.length > 0 && (
                        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                          <select className="input" style={{ flex: 1, minWidth: 200 }} value={pick[s.key] || ''} onChange={(e) => setPick({ ...pick, [s.key]: e.target.value })}>
                            <option value="">Elige el grupo para esta sección…</option>
                            {found.map((g) => <option key={g.chatId} value={g.chatId}>{g.title}</option>)}
                          </select>
                          <select className="input" style={{ width: 200 }} value={pickSite[s.key] || ''} onChange={(e) => setPickSite({ ...pickSite, [s.key]: e.target.value })} aria-label="Sede">
                            <option value="">Sede del grupo…</option>
                            {d.sites.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                            <option value="todas">Todas las sedes (dirección)</option>
                          </select>
                          <button type="button" className="btn btn-outline btn-sm" onClick={() => assign(s.key)} disabled={busy === `add-${s.key}`}><MdAdd /> Asignar</button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </Card>

        <Card title="Cómo configurarlo">
          <ol style={{ margin: 0, paddingLeft: 20, lineHeight: 1.8 }}>
            <li>En Telegram abre <b>@BotFather</b>, envía <code>/newbot</code>, ponle nombre (por ejemplo, <i>Integra IPS Avisos</i>) y copia el token.</li>
            <li>Pega el token arriba y pulsa <b>Guardar token</b>; activa el envío general.</li>
            <li>Crea un grupo de Telegram <b>por sección y por sede</b> (por ejemplo: <i>Temperatura · Aguachica</i>, <i>Ambulancias · Valledupar</i>, <i>Inventario · Seccional</i>) y <b>agrega el bot</b> a cada uno. Si la dirección quiere ver todo, crea además un grupo y asígnalo a “Todas las sedes”.</li>
            <li>Escribe cualquier mensaje en cada grupo y pulsa <b>Buscar grupos</b> aquí.</li>
            <li>En cada sección elige el grupo y su <b>sede</b>, pulsa <b>Asignar</b> y luego <b>Prueba</b> para verificar.</li>
          </ol>
        </Card>

        <Card flush title="Últimos envíos">
          {d.log.length === 0 ? <Empty icon={<MdSend />}>Aún no se han enviado notificaciones.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Fecha</th><th>Sección</th><th>Sede</th><th>Grupo</th><th>Estado</th></tr></thead>
              <tbody>{d.log.map((l) => (
                <tr key={l.id}><td>{new Date(l.createdAt).toLocaleString('es-CO')}</td><td>{d.sections.find((s) => s.key === l.section)?.label || l.section}</td><td>{d.sites.find((x) => x.id === l.siteId)?.name || '—'}</td><td>{d.channels.find((c) => c.chatId === l.chatId)?.title || l.chatId}</td>
                  <td>{l.status === 'enviado' ? <span className="badge ok">Enviado</span> : <span className="badge bad" title={l.detail || ''}>Error</span>}</td></tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      </div>
      {toastNode}
    </>
  )
}

export default NotificationsPage
