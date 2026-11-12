import React, { useCallback, useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { MdGavel, MdVerified, MdDescription, MdPrint, MdArrowBack, MdLogout, MdHourglassTop, MdDraw, MdCheckCircle } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { SignatureEditor } from '../signature'
import { BRAND } from '../../utils/brand'
import LegalDoc from './LegalDoc'
import './legal.css'

const Spin = () => <span className="spinner" aria-hidden="true" />

// Vista de un documento (para leer, imprimir o guardar en PDF).
const DocViewer = ({ kind, onBack }) => {
  const [doc, setDoc] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { api.get(`/legal/documento/${kind}`).then(({ data }) => setDoc(data)).catch((e) => setErr(errorMessage(e))) }, [kind])
  useEffect(() => { if (doc) { const t = document.title; document.title = `${doc.code}_${doc.title}`; return () => { document.title = t } } return undefined }, [doc])
  if (err) return <div className="lgate-alert">{err}</div>
  if (!doc) return <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
  return <LegalDoc doc={doc} toolbar={<><button type="button" onClick={onBack}><MdArrowBack /> Volver</button><button type="button" className="primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button></>} />
}

// Firma del contrato y del acuerdo de datos por parte del administrador (representante legal o delegado).
const Activation = ({ status, reload }) => {
  const { user, setUser, logout } = useAuth()
  const [view, setView] = useState(null)
  const [f, setF] = useState({ signerName: user.fullName, signerId: user.identification || '', signerRole: 'Representante legal' })
  const [accept, setAccept] = useState({})
  const [busy, setBusy] = useState(''); const [err, setErr] = useState('')
  const [savingSig, setSavingSig] = useState(false)
  if (view) return <div style={{ minHeight: '100vh', background: '#F4F1FA' }}><DocViewer kind={view} onBack={() => setView(null)} /></div>
  const saveSig = async (image) => {
    setSavingSig(true)
    try { const { data } = await api.put('/firma', { image }); setUser({ ...user, signatureUrl: data.signatureUrl }) } catch (e) { setErr(errorMessage(e)) } finally { setSavingSig(false) }
  }
  const sign = async (kind) => {
    setErr('')
    if (!accept[kind]) return setErr('Marca la casilla de aceptación del documento.')
    setBusy(kind)
    try { await api.post(`/legal/firmar/${kind}`, { ...f, accept: true }); await reload() } catch (e) { setErr(errorMessage(e)) } finally { setBusy('') }
  }
  return (
    <div className="lgate">
      <div className="lgate-card">
        <div className="lgate-head"><span className="ldoc-mark">IIPS</span><div><h1>Activación del servicio</h1><p>{status.organization?.name} · Plan {status.organization?.planName || '—'}. Antes de usar {BRAND}, el representante legal (o su delegado) debe leer y firmar estos documentos.</p></div></div>
        <div className="lgate-body">
          <div className="lgate-info">El contrato se genera con los datos de tu plan (funcionalidades, valor, soporte y disponibilidad). El acuerdo de tratamiento de datos cumple la Ley 1581 de 2012, porque el sistema guarda datos de pacientes y del personal. Ambos se firman electrónicamente (Ley 527 de 1999) y quedan disponibles en PDF.</div>
          <div>
            <b style={{ fontSize: 13 }}>Datos de quien firma</b>
            <div className="lgate-form" style={{ marginTop: 8 }}>
              <div><label>Nombre completo</label><input value={f.signerName} onChange={(e) => setF({ ...f, signerName: e.target.value })} /></div>
              <div><label>Cédula</label><input value={f.signerId} onChange={(e) => setF({ ...f, signerId: e.target.value })} /></div>
              <div><label>Cargo</label><input value={f.signerRole} onChange={(e) => setF({ ...f, signerRole: e.target.value })} placeholder="Representante legal" /></div>
            </div>
          </div>
          {!user.signatureUrl && (
            <div style={{ border: '1px dashed #BBA2F2', borderRadius: 12, padding: 14 }}>
              <b style={{ fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}><MdDraw /> Crea tu firma digital para poder firmar</b>
              <div style={{ marginTop: 10 }}><SignatureEditor current={null} onSave={saveSig} saving={savingSig} /></div>
            </div>
          )}
          {status.documents.map((d) => {
            const signed = d.signatures.find((s) => s.party === 'cliente')
            return (
              <div key={d.kind} className={`lgate-doc${signed ? ' ok' : ''}`}>
                {signed ? <MdCheckCircle style={{ color: '#16A34A', fontSize: 26 }} /> : <MdDescription style={{ color: '#6233B3', fontSize: 26 }} />}
                <div className="grow"><b>{d.title}</b><small>{d.code} · versión {d.version}{signed ? ` · firmado por ${signed.signerName}` : ''}</small>
                  {!signed && <label className="lgate-check" style={{ marginTop: 8 }}><input type="checkbox" checked={Boolean(accept[d.kind])} onChange={(e) => setAccept({ ...accept, [d.kind]: e.target.checked })} /> Leí el documento completo y lo acepto en nombre de la institución.</label>}
                </div>
                <button type="button" className="lgate-btn" onClick={() => setView(d.kind)}><MdDescription /> Leer / PDF</button>
                {!signed && <button type="button" className="lgate-btn primary" disabled={!user.signatureUrl || busy === d.kind} onClick={() => sign(d.kind)}>{busy === d.kind ? <Spin /> : <MdGavel />} Firmar</button>}
              </div>
            )
          })}
          {err && <div className="lgate-alert">{err}</div>}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <small style={{ color: '#7A7391' }}>Al firmar quedan registrados el texto, la fecha y hora, tu usuario y la dirección IP.</small>
            <button type="button" className="lgate-btn" onClick={logout}><MdLogout /> Cerrar sesión</button>
          </div>
        </div>
      </div>
    </div>
  )
}

const Waiting = ({ status }) => {
  const { logout } = useAuth()
  return (
    <div className="lgate">
      <div className="lgate-card">
        <div className="lgate-head"><MdHourglassTop style={{ fontSize: 34, color: '#6233B3' }} /><div><h1>Servicio pendiente de activación</h1><p>{status.organization?.name}</p></div></div>
        <div className="lgate-body">
          <p style={{ margin: 0 }}>Para empezar a usar {BRAND}, el administrador de la institución debe firmar el contrato de servicio y el acuerdo de tratamiento de datos personales. Intenta de nuevo cuando te confirme que el servicio está activo.</p>
          <div><button type="button" className="lgate-btn" onClick={logout}><MdLogout /> Cerrar sesión</button></div>
        </div>
      </div>
    </div>
  )
}

// Términos y condiciones: cada usuario los acepta la primera vez (y cuando cambia la versión).
const TermsModal = ({ onAccepted }) => {
  const { logout } = useAuth()
  const [doc, setDoc] = useState(null); const [ok, setOk] = useState(false); const [busy, setBusy] = useState(false); const [err, setErr] = useState('')
  useEffect(() => { api.get('/legal/documento/terminos').then(({ data }) => setDoc(data)).catch((e) => setErr(errorMessage(e))) }, [])
  const accept = async () => { setBusy(true); try { await api.post('/legal/terminos/aceptar', { accept: true }); onAccepted() } catch (e) { setErr(errorMessage(e)); setBusy(false) } }
  return (
    <div className="lterms-bg">
      <div className="lterms" role="dialog" aria-modal="true" aria-label="Términos y condiciones">
        <div className="lterms-scroll">{doc ? <LegalDoc doc={doc} /> : <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>}</div>
        <div className="lterms-foot">
          <label className="lgate-check"><input type="checkbox" checked={ok} onChange={(e) => setOk(e.target.checked)} /> Leí y acepto los términos y condiciones de uso de {BRAND}.</label>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="lgate-btn" onClick={logout}>Salir</button>
            <button type="button" className="lgate-btn primary" disabled={!ok || busy} onClick={accept}>{busy ? <Spin /> : <MdVerified />} Aceptar y continuar</button>
          </div>
          {err && <div className="lgate-alert" style={{ width: '100%' }}>{err}</div>}
        </div>
      </div>
    </div>
  )
}

// Envuelve el sistema: exige la activación (firma del contrato y del acuerdo de datos) y la aceptación de términos.
const LegalGate = ({ children }) => {
  const { user } = useAuth()
  const [status, setStatus] = useState(null)
  const load = useCallback(() => api.get('/legal/estado').then(({ data }) => setStatus(data)).catch(() => setStatus({ activationPending: false, documents: [], terms: { acceptedAt: 'n/a' } })), [])
  useEffect(() => { load() }, [load, user?.id])
  if (!status) return <div className="splash"><Spin /></div>
  if (status.activationPending) return user.role === 'administrador' ? <Activation status={status} reload={load} /> : <Waiting status={status} />
  return (
    <>
      {children}
      {!status.terms.acceptedAt && <TermsModal onAccepted={load} />}
    </>
  )
}

// Página /legal/:kind dentro del sistema (consulta e impresión de los documentos firmados).
export const LegalPage = () => {
  const { kind } = useParams()
  const navigate = useNavigate()
  return <DocViewer key={kind} kind={kind} onBack={() => navigate(-1)} />
}

export default LegalGate
