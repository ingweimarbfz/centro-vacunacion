import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdErrorOutline, MdWorkspacePremium, MdCheckCircle, MdCancel, MdPrint, MdBlock } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { formatDate } from '../../utils/format'

// Certificados: requisitos de grado de cada estudiante del programa, emisión (con consecutivo y código de verificación) y anulación.
const CertificatesPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [toast, toastNode] = useToast()
  const [programs, setPrograms] = useState([]); const [programId, setProgramId] = useState('')
  const [rows, setRows] = useState(null); const [error, setError] = useState(''); const [modal, setModal] = useState(null); const [reason, setReason] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { api.get('/academico/programas').then(({ data }) => { setPrograms(data); if (data[0]) setProgramId(String(data[0].id)) }).catch((e) => setError(errorMessage(e))) }, [])
  const load = useCallback(() => { if (!programId) return; setRows(null); api.get('/academico/certificados/candidatos', { params: { programa: programId }, noCache: true }).then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))) }, [programId])
  useEffect(() => { load() }, [load])
  const issue = async (r, force = false) => {
    setBusy(true)
    try { await api.post('/academico/certificados', { studentId: r.studentId, programId, force, reason: force ? reason : undefined }); toast(`Certificado emitido a ${r.fullName}`); setModal(null); setReason(''); load() } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy(false) }
  }
  const voidCert = async () => {
    setBusy(true)
    try { await api.post(`/academico/certificados/${modal.void.certificate.id}/anular`, { reason }); toast('Certificado anulado'); setModal(null); setReason(''); load() } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy(false) }
  }
  const program = programs.find((p) => String(p.id) === String(programId))
  return (
    <>
      <PageHead title="Certificados" subtitle="Requisitos de grado y emisión de certificados con código de verificación pública" />
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
        <select className="input" style={{ width: 'auto', minWidth: 280 }} aria-label="Programa" value={programId} onChange={(e) => setProgramId(e.target.value)}>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select>
        {program && <span className="hint">Otorga: {program.certLabel} · {program.totalHours} h</span>}
      </div>
      {!rows ? (!error && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>) : rows.length === 0 ? <Card><Empty icon={<MdWorkspacePremium />}>No hay estudiantes en este programa.</Empty></Card> : (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Estudiante</th>{rows[0].requirements.map((q) => <th key={q.key}>{q.label}</th>)}<th>Certificado</th><th className="actions" /></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.studentId}>
                  <td style={{ whiteSpace: 'normal' }}><b>{r.fullName}</b><div style={{ fontSize: 12, color: 'var(--muted)' }}>{r.docType} {r.docNumber}</div></td>
                  {r.requirements.map((q) => <td key={q.key} title={q.detail} style={{ whiteSpace: 'normal', fontSize: 12.5 }}>{q.ok ? <MdCheckCircle style={{ color: 'var(--ok)', verticalAlign: -3 }} aria-label="Cumple" /> : <MdCancel style={{ color: 'var(--bad)', verticalAlign: -3 }} aria-label="No cumple" />} <span style={{ color: 'var(--muted)' }}>{q.detail}</span></td>)}
                  <td style={{ whiteSpace: 'nowrap' }}>{r.certificate ? <><b>{r.certificate.numberLabel}</b><div className="hint">{formatDate(r.certificate.issuedAt)}</div></> : r.eligible ? <span className="badge ok">Apto</span> : <span className="badge">No apto</span>}</td>
                  <td className="actions">
                    {r.certificate ? <>
                      <Link className="btn btn-ghost btn-icon" aria-label="Ver e imprimir certificado" title="Ver e imprimir" to={`/educacion/certificados/${r.certificate.id}`}><MdPrint /></Link>
                      {admin && <button type="button" className="btn btn-ghost btn-icon" aria-label="Anular certificado" title="Anular" style={{ color: 'var(--bad)' }} onClick={() => setModal({ void: r })}><MdBlock /></button>}
                    </> : r.eligible ? <button type="button" className="btn btn-primary btn-sm" disabled={busy} onClick={() => issue(r)}><MdWorkspacePremium /> Emitir</button>
                      : admin && <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal({ force: r })}>Emitir con excepción</button>}
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}
      {modal?.force && (
        <Modal title={`Emitir con excepción · ${modal.force.fullName}`} size="sm" onClose={() => setModal(null)} footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-primary" disabled={busy || !reason.trim()} onClick={() => issue(modal.force, true)}>{busy ? <Spinner /> : null} Emitir</button></>}>
          <div className="stack" style={{ gap: 10 }}>
            <p style={{ margin: 0, fontSize: 13.5 }}>No cumple: {modal.force.requirements.filter((q) => !q.ok).map((q) => q.label.toLowerCase()).join(', ')}. La justificación queda registrada en el certificado.</p>
            <div className="field"><label>Justificación</label><input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus placeholder="Ej. Homologación aprobada por el consejo académico" /></div>
          </div>
        </Modal>
      )}
      {modal?.void && (
        <Modal title={`Anular ${modal.void.certificate.numberLabel}`} size="sm" onClose={() => setModal(null)} footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" disabled={busy || !reason.trim()} onClick={voidCert}><MdBlock /> Anular</button></>}>
          <div className="stack" style={{ gap: 10 }}><p style={{ margin: 0, fontSize: 13.5 }}>La verificación pública mostrará que el certificado está anulado. Después puedes emitir uno nuevo.</p><div className="field"><label>Motivo</label><input value={reason} onChange={(e) => setReason(e.target.value)} autoFocus /></div></div>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default CertificatesPage
