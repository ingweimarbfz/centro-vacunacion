import React, { useEffect, useState } from 'react'
import { FaTelegramPlane } from 'react-icons/fa'
import { MdErrorOutline, MdNotificationsActive, MdInfoOutline, MdLanguage, MdPhoneIphone, MdHelpOutline } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { PageHead, Card, Empty, Spinner } from '../components/ui'

// Mis notificaciones: los grupos de Telegram que le corresponden al usuario (según sus módulos, su sede y,
// para estudiantes y docentes, sus grupos académicos). Cada botón pide al bot un enlace personal de invitación,
// que se abre en la app de Telegram o en Telegram Web (en el navegador, sin instalar nada).
const webLink = (link) => { const code = String(link).split('/+')[1] || String(link).split('joinchat/')[1] || ''; return `https://web.telegram.org/k/#?tgaddr=${encodeURIComponent(`tg://join?invite=${code}`)}` }
const MyNotificationsPage = () => {
  const [d, setD] = useState(null); const [error, setError] = useState('')
  const [busy, setBusy] = useState(null); const [links, setLinks] = useState({}); const [errs, setErrs] = useState({})
  useEffect(() => { api.get('/mis-notificaciones', { noCache: true }).then(({ data }) => setD(data)).catch((e) => setError(errorMessage(e))) }, [])
  const join = async (it) => {
    setBusy(it.key); setErrs({ ...errs, [it.key]: '' })
    try {
      const { data } = await api.post(`/mis-notificaciones/${it.key}/unirme`)
      setLinks({ ...links, [it.key]: data.link })
    } catch (e) { setErrs({ ...errs, [it.key]: errorMessage(e) }) } finally { setBusy(null) }
  }
  return (
    <>
      <PageHead title="Mis notificaciones" subtitle="Únete a los grupos de Telegram donde llegan los avisos que te corresponden" />
      {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      {!d ? (!error && <div className="splash"><Spinner /></div>) : !d.enabled ? (
        <Card><Empty icon={<FaTelegramPlane />}>Las notificaciones por Telegram aún no están activas en tu organización.</Empty></Card>
      ) : (
        <div className="stack">
          <div className="alert info" style={{ margin: 0 }}><MdInfoOutline /><span>Necesitas una cuenta de Telegram. Al pulsar <b>Unirme al grupo</b> se crea una invitación personal (un solo uso, válida por 24 horas) que puedes abrir en la app o en el navegador con Telegram Web, sin instalar nada{d.bot ? <>. Los avisos los envía el bot <b>{d.bot}</b></> : null}.</span></div>
          <Card title="¿Cómo me uno a un grupo?" icon={<MdHelpOutline style={{ color: 'var(--brand)' }} />}>
            <div className="grid grid-2" style={{ gap: 18, fontSize: 13.5, lineHeight: 1.55 }}>
              <div>
                <b style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><MdPhoneIphone /> Con la app de Telegram (celular o computador)</b>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Pulsa <b>Unirme al grupo</b> en el grupo que quieras.</li>
                  <li>Pulsa <b>Abrir en la app de Telegram</b>.</li>
                  <li>En Telegram, pulsa <b>Unirse al grupo</b>.</li>
                </ol>
                <div className="hint" style={{ marginTop: 6 }}>En el computador, si no tienes la app, el botón no hace nada: usa la opción del navegador.</div>
              </div>
              <div>
                <b style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}><MdLanguage /> En el navegador (Telegram Web)</b>
                <ol style={{ margin: 0, paddingLeft: 18 }}>
                  <li>Pulsa <b>Unirme al grupo</b> y luego <b>Abrir en el navegador</b>.</li>
                  <li>Si Telegram Web te pide iniciar sesión, escanea el código QR <b>desde la app de Telegram de tu celular</b>: <b>Ajustes › Dispositivos › Vincular dispositivo</b> (en Android, Ajustes está en el menú ☰). La cámara del celular no sirve para este código, y el código cambia cada pocos segundos: si no lo toma, espera a que se renueve.</li>
                  <li>¿No lo lee? Elige <b>Iniciar sesión con número de teléfono</b>: escribe tu número y Telegram te envía un código a la app.</li>
                  <li>Cuando aparezca la invitación, pulsa <b>Unirse</b>.</li>
                </ol>
              </div>
            </div>
            <div className="hint" style={{ marginTop: 12 }}>Únete con <b>tu propia cuenta</b> de Telegram: la invitación es personal y sirve una sola vez. Si se venció o ya la usaste, pulsa <b>Unirme al grupo</b> otra vez y se crea una nueva. Si sales del grupo, puedes volver a unirte desde aquí.</div>
          </Card>
          {d.items.length === 0 ? <Card><Empty icon={<MdNotificationsActive />}>Por ahora no hay grupos de Telegram para tus módulos.</Empty></Card> : (
            <div className="grid grid-2">{d.items.map((it) => (
              <Card key={it.key} title={it.title} subtitle={[it.label, it.site].filter(Boolean).join(' · ')} icon={<FaTelegramPlane style={{ color: '#229ED9' }} />}
                actions={<span className={`badge ${it.kind === 'grupo' ? 'info' : ''}`}>{it.kind === 'grupo' ? 'Mi grupo' : 'Sección'}</span>}>
                <div className="stack" style={{ gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 13.5, color: 'var(--muted)' }}>{it.hint}</p>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                    {!links[it.key] ? <button type="button" className="btn btn-primary btn-sm" style={{ background: '#229ED9', borderColor: '#229ED9' }} disabled={busy === it.key || it.canInvite === false} onClick={() => join(it)}>{busy === it.key ? <Spinner /> : <FaTelegramPlane />} Unirme al grupo</button> : <>
                      <a className="btn btn-primary btn-sm" style={{ background: '#229ED9', borderColor: '#229ED9' }} href={webLink(links[it.key])} target="_blank" rel="noreferrer"><MdLanguage /> Abrir en el navegador (Telegram Web)</a>
                      <a className="btn btn-outline btn-sm" href={links[it.key]} target="_blank" rel="noreferrer"><MdPhoneIphone /> Abrir en la app de Telegram</a>
                    </>}
                  </div>
                  {links[it.key] && <span className="hint">Tu invitación está lista: ábrela en el navegador o en la app y pulsa <b>Unirse</b>. Sirve una sola vez y vence en 24 horas.</span>}
                  {it.canInvite === false && <span className="hint">El bot aún no puede invitar a este grupo. Pide al administrador que lo haga administrador del grupo con permiso para invitar.</span>}
                  {errs[it.key] && <div className="alert bad" style={{ margin: 0 }}><MdErrorOutline /><span>{errs[it.key]}</span></div>}
                </div>
              </Card>
            ))}</div>
          )}
        </div>
      )}
    </>
  )
}

export default MyNotificationsPage
