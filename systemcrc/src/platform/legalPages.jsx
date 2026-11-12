import React, { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdSave, MdErrorOutline, MdGavel, MdDescription, MdCheckCircle, MdHourglassTop, MdPrint, MdArrowBack } from 'react-icons/md'
import papi, { perror } from './api'
import { Head, PCard, PModal, Splash, Spin, Field, useToast } from './ui'
import LegalDoc from '../components/legal/LegalDoc'

const FIELDS = [
  ['legal_name', 'Razón social o nombre del proveedor'], ['nit', 'NIT o cédula'], ['legal_rep', 'Representante legal'], ['legal_rep_id', 'Cédula del representante'],
  ['city', 'Ciudad (domicilio)'], ['address', 'Dirección'], ['email', 'Correo de soporte'], ['phone', 'Teléfono'], ['privacy_email', 'Correo para datos personales']
]

// Datos del proveedor que aparecen en el contrato y en el acuerdo de datos.
export const ProviderPage = () => {
  const [f, setF] = useState(null); const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [toast, toastNode] = useToast()
  useEffect(() => { papi.get('/plataforma/proveedor').then(({ data }) => setF(data)) }, [])
  if (!f) return <Splash />
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = async () => { setBusy(true); setErr(''); try { const { data } = await papi.put('/plataforma/proveedor', f); setF(data); toast('Datos del proveedor guardados') } catch (e) { setErr(perror(e)) } finally { setBusy(false) } }
  return (
    <>
      <Head title="Proveedor y documentos legales" subtitle="Estos datos se insertan en el contrato de servicio y en el acuerdo de tratamiento de datos de cada cliente">
        <button type="button" className="pbtn primary" onClick={save} disabled={busy}>{busy ? <Spin /> : <MdSave />} Guardar</button>
      </Head>
      <PCard title="Datos del proveedor" icon={<MdGavel style={{ color: 'var(--p-500)' }} />}>
        <div className="pgrid">{FIELDS.map(([k, l]) => <Field key={k} label={l}><input value={f[k] || ''} onChange={set(k)} /></Field>)}
          <Field label="Horario de soporte" full><input value={f.support_hours || ''} onChange={set('support_hours')} /></Field>
          <Field label="Infraestructura en la nube (subencargados)" hint="Aparece en el acuerdo de datos como transmisión internacional" full><textarea value={f.hosting || ''} onChange={set('hosting')} /></Field>
        </div>
        {err && <div className="palert bad" style={{ marginTop: 12 }}><MdErrorOutline /><span>{err}</span></div>}
      </PCard>
      <div style={{ marginTop: 18 }}>
        <PCard title="Cómo funciona" icon={<MdDescription style={{ color: 'var(--p-500)' }} />}>
          <ul style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7, color: 'var(--ink-2)' }}>
            <li><b>Contrato de servicio (IIPS-LEG-001):</b> se genera con el plan, el valor, el ciclo de pago, las fechas, el soporte y la disponibilidad de cada organización.</li>
            <li><b>Acuerdo de tratamiento de datos (IIPS-LEG-002):</b> la IPS es responsable y el proveedor es encargado del tratamiento (Ley 1581 de 2012 y Decreto 1074 de 2015).</li>
            <li><b>Activación:</b> al entrar al sistema, el administrador de la institución debe firmar ambos documentos; hasta entonces el sistema queda bloqueado para todos.</li>
            <li><b>Términos y condiciones (IIPS-LEG-003):</b> cada usuario los acepta la primera vez que entra.</li>
            <li>El proveedor contrafirma cada documento desde <i>Organizaciones → Documentos</i>. Todo queda en PDF con el formato de Integra IPS.</li>
          </ul>
          <p style={{ margin: '10px 0 0', fontSize: 12.5, color: 'var(--muted)' }}>Los textos son una plantilla basada en la normativa colombiana. Se recomienda que un abogado los revise antes de usarlos comercialmente.</p>
        </PCard>
      </div>
      {toastNode}
    </>
  )
}

// Estado de los documentos de una organización (desde Organizaciones).
export const OrgLegalModal = ({ org, onClose }) => {
  const navigate = useNavigate()
  const [docs, setDocs] = useState(null); const [busy, setBusy] = useState(''); const [toast, toastNode] = useToast()
  const load = useCallback(() => papi.get(`/plataforma/organizaciones/${org.id}/legal`).then(({ data }) => setDocs(data)), [org.id])
  useEffect(() => { load() }, [load])
  const sign = async (kind) => { setBusy(kind); try { await papi.post(`/plataforma/organizaciones/${org.id}/legal/${kind}/firmar`); toast('Firmado por el proveedor'); load() } catch (e) { toast(perror(e), 'bad') } finally { setBusy('') } }
  return (
    <PModal title={`Documentos legales · ${org.name}`} onClose={onClose} footer={<button type="button" className="pbtn outline" onClick={onClose}>Cerrar</button>}>
      {!docs ? <Splash /> : docs.map((d) => {
        const c = d.signatures.find((s) => s.party === 'cliente'); const p = d.signatures.find((s) => s.party === 'proveedor')
        return (
          <div key={d.kind} className="pf-card" style={{ padding: 14, display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 220 }}>
              <b>{d.title}</b><span className="sub" style={{ display: 'block', color: 'var(--muted)', fontSize: 12 }}>{d.code} · versión {d.version}</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
                <span className={`pbadge ${c ? 'ok' : 'warn'}`}>{c ? <MdCheckCircle /> : <MdHourglassTop />} Cliente: {c ? c.signerName : 'pendiente'}</span>
                <span className={`pbadge ${p ? 'ok' : 'warn'}`}>{p ? <MdCheckCircle /> : <MdHourglassTop />} Proveedor: {p ? 'firmado' : 'pendiente'}</span>
              </div>
            </div>
            <button type="button" className="pbtn outline sm" onClick={() => navigate(`/plataforma/legal/${org.id}/${d.kind}`)}><MdDescription /> Ver / PDF</button>
            {!p && <button type="button" className="pbtn primary sm" disabled={busy === d.kind} onClick={() => sign(d.kind)}>{busy === d.kind ? <Spin /> : <MdGavel />} Firmar como proveedor</button>}
          </div>
        )
      })}
      <div className="palert info">La firma del proveedor usa la firma digital de tu usuario del sistema y los datos de <i>Proveedor</i>.</div>
      {toastNode}
    </PModal>
  )
}

// Documento de una organización con el formato de Integra IPS (imprimible).
export const OrgLegalDoc = () => {
  const { orgId, kind } = useParams()
  const navigate = useNavigate()
  const [doc, setDoc] = useState(null); const [err, setErr] = useState('')
  useEffect(() => { papi.get(`/plataforma/organizaciones/${orgId}/legal/${kind}`).then(({ data }) => setDoc(data)).catch((e) => setErr(perror(e))) }, [orgId, kind])
  useEffect(() => { if (doc) { const t = document.title; document.title = `${doc.code}_${doc.organization?.name || ''}`; return () => { document.title = t } } return undefined }, [doc])
  if (err) return <div className="palert bad"><MdErrorOutline /><span>{err}</span></div>
  if (!doc) return <Splash />
  return <LegalDoc doc={doc} toolbar={<><button type="button" onClick={() => navigate('/plataforma/organizaciones')}><MdArrowBack /> Organizaciones</button><button type="button" className="primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button></>} />
}
