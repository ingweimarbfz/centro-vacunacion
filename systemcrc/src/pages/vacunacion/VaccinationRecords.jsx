import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { MdSend, MdSearch, MdDownload, MdWarning, MdBadge, MdErrorOutline, MdSave, MdCheckCircle, MdScience, MdBlock, MdVaccines } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import ShareDialog from '../../components/share/ShareDialog'
import './vacunacion.css'

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const fmt = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')
const fmtDT = (iso) => (iso ? new Date(iso).toLocaleString('es-CO', { timeZone: 'America/Bogota', dateStyle: 'short', timeStyle: 'short' }) : '—')
const MOD = { intramural: 'Intramural', extramural: 'Extramural', domiciliaria: 'Domiciliaria' }

// Reporte de evento adverso posterior a la vacunación (ESAVI).
const EsaviForm = ({ record, onClose, onSaved }) => {
  const [f, setF] = useState({ onsetAt: new Date().toISOString().slice(0, 16), symptoms: '', severity: 'leve', actions: '', outcome: '', notified: false })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const save = async () => { setErr(''); setBusy(true); try { await api.post(`/vacunacion/registros/${record.id}/esavi`, f); onSaved() } catch (e) { setErr(errorMessage(e)); setBusy(false) } }
  return (
    <Modal title={`Reportar ESAVI · ${record.patient}`} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        <div className="vac-info"><span><b>{record.vaccine}</b> · {record.dose} · lote {record.lot || '—'} · aplicada el {fmt(record.appliedOn)}</span></div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Inicio de los síntomas</label><input type="datetime-local" value={f.onsetAt} onChange={set('onsetAt')} /></div>
          <div className="field"><label>Gravedad</label><select value={f.severity} onChange={set('severity')}><option value="leve">Leve (local, fiebre baja)</option><option value="grave">Grave (hospitalización, anafilaxia, muerte)</option></select></div>
        </div>
        <div className="field"><label>Síntomas <span className="req">*</span></label><textarea rows={3} value={f.symptoms} onChange={set('symptoms')} /></div>
        <div className="field"><label>Conducta / atención</label><input value={f.actions} onChange={set('actions')} /></div>
        <div className="field"><label>Desenlace</label><input value={f.outcome} onChange={set('outcome')} placeholder="Recuperado, en observación…" /></div>
        <label className="switch"><input type="checkbox" checked={f.notified} onChange={set('notified')} /> Ya se notificó en SIVIGILA</label>
        {f.severity === 'grave' && <div className="alert warn" style={{ margin: 0 }}><MdWarning /><span>Los ESAVI graves se notifican de inmediato en SIVIGILA y a la secretaría de salud.</span></div>}
        {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
      </div>
    </Modal>
  )
}

// Vacunación → Consultar: registros, ESAVI y frascos abiertos; carnet y exportación para PAIWEB.
const VaccinationRecords = () => {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [toast, toastNode] = useToast()
  const [tab, setTab] = useState(params.get('tab') || 'registros')
  const [f, setF] = useState({ desde: `${today().slice(0, 8)}01`, hasta: today(), documento: '', biologico: '' })
  const [rows, setRows] = useState(null); const [esavi, setEsavi] = useState(null); const [vials, setVials] = useState(null); const [vaccines, setVaccines] = useState([])
  const [modal, setModal] = useState(null); const [share, setShare] = useState(null)
  const load = useCallback(() => Promise.all([
    api.get('/vacunacion/registros', { params: f }).then(({ data }) => setRows(data)),
    api.get('/vacunacion/esavi').then(({ data }) => setEsavi(data)),
    api.get('/vacunacion/frascos').then(({ data }) => setVials(data))
  ]).catch((e) => toast(errorMessage(e), 'bad')), [f, toast])
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { load(); api.get('/vacunacion/biologicos').then(({ data }) => setVaccines(data)).catch(() => {}) }, [])
  const exportCsv = async () => {
    try {
      const { data } = await api.get('/vacunacion/exportar', { params: { desde: f.desde, hasta: f.hasta }, responseType: 'blob' })
      const url = URL.createObjectURL(data); const a = document.createElement('a'); a.href = url; a.download = `vacunacion_${f.desde}_${f.hasta}.csv`; a.click(); URL.revokeObjectURL(url)
    } catch (e) { toast(errorMessage(e), 'bad') }
  }
  const notify = async (x) => { try { await api.put(`/vacunacion/esavi/${x.id}/notificado`); toast('ESAVI marcado como notificado'); load() } catch (e) { toast(errorMessage(e), 'bad') } }
  const closeVial = async (x) => { try { await api.post(`/vacunacion/frascos/${x.id}/cerrar`, { reason: x.expired ? 'Vida útil vencida' : 'Descartado' }); toast('Frasco cerrado'); load() } catch (e) { toast(errorMessage(e), 'bad') } }
  const pendingEsavi = (esavi || []).filter((x) => x.severity === 'grave' && !x.notified).length
  return (
    <>
      <PageHead title="Consultar vacunación" subtitle="Registro nominal de dosis, carnet de vacunación, ESAVI y frascos multidosis abiertos">
        <button type="button" className="btn btn-outline" onClick={exportCsv}><MdDownload /> Exportar para PAIWEB (CSV)</button>
      </PageHead>
      <div className="module-switch" style={{ marginBottom: 14 }} role="tablist">
        <button type="button" className={tab === 'registros' ? 'on' : ''} onClick={() => setTab('registros')}>Dosis aplicadas</button>
        <button type="button" className={tab === 'esavi' ? 'on' : ''} onClick={() => setTab('esavi')}>ESAVI {pendingEsavi > 0 && <span className="badge warn">{pendingEsavi}</span>}</button>
        <button type="button" className={tab === 'frascos' ? 'on' : ''} onClick={() => setTab('frascos')}>Frascos abiertos</button>
      </div>
      {tab === 'registros' && (
        <Card flush title={rows ? `${rows.length} dosis` : 'Dosis'}
          actions={<form className="bill-filter" onSubmit={(e) => { e.preventDefault(); load() }}>
            <input className="input" placeholder="Documento" value={f.documento} onChange={(e) => setF({ ...f, documento: e.target.value })} style={{ width: 140 }} aria-label="Documento" />
            <select className="input" value={f.biologico} onChange={(e) => setF({ ...f, biologico: e.target.value })} aria-label="Biológico"><option value="">Todos los biológicos</option>{vaccines.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</select>
            <input type="date" className="input" value={f.desde} onChange={(e) => setF({ ...f, desde: e.target.value })} aria-label="Desde" />
            <input type="date" className="input" value={f.hasta} onChange={(e) => setF({ ...f, hasta: e.target.value })} aria-label="Hasta" />
            <button type="submit" className="btn btn-outline btn-sm"><MdSearch /> Buscar</button>
          </form>}>
          {!rows ? <div className="splash" style={{ minHeight: 100 }}><Spinner /></div> : rows.length === 0 ? <Empty icon={<MdVaccines />}>No hay dosis con esos filtros.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Fecha</th><th>Paciente</th><th>Biológico</th><th>Lote</th><th>Vacunador</th><th>Próxima dosis</th><th className="actions" /></tr></thead>
              <tbody>{rows.map((r) => (
                <tr key={r.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmt(r.appliedOn)}<div className="hint">{r.siteName}</div></td>
                  <td style={{ minWidth: 160 }}><strong style={{ color: 'var(--ink)' }}>{r.patient}</strong><div className="hint">{r.docNumber} · {r.age} años{r.epsName ? ` · ${r.epsName}` : ''}</div></td>
                  <td><strong style={{ color: 'var(--ink)' }}>{r.vaccine}</strong><div className="hint">{r.dose} · {r.pai ? 'PAI' : `Particular${r.invoice ? ` · ${r.invoice}` : ''}`} · {MOD[r.modality]}</div>{r.esavi.length > 0 && <span className={`badge ${r.esavi.some((x) => x.severity === 'grave') ? 'warn' : ''}`}>ESAVI</span>}</td>
                  <td>{r.lot || '—'}<div className="hint">{r.expiry ? `vence ${fmt(r.expiry)}` : ''}</div></td>
                  <td>{r.vaccinator}</td>
                  <td>{r.nextDoseDate ? <>{r.nextDoseLabel}<div className="hint">{fmt(r.nextDoseDate)}</div></> : <span className="hint">Completo</span>}</td>
                  <td className="actions" style={{ whiteSpace: 'nowrap' }}>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => navigate(`/vacunacion/carne/${r.docNumber}`)}><MdBadge /> Carnet</button>
                    <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShare(r.docNumber)}><MdSend /> Enviar</button>
                    <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--warn, #B45309)' }} onClick={() => setModal(r)}><MdWarning /> ESAVI</button>
                  </td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      )}
      {tab === 'esavi' && (
        <Card flush title="Eventos adversos posteriores a la vacunación (ESAVI)" subtitle="Los graves se notifican de inmediato en SIVIGILA">
          {!esavi ? <div className="splash" style={{ minHeight: 100 }}><Spinner /></div> : esavi.length === 0 ? <Empty icon={<MdCheckCircle />}>Sin ESAVI reportados.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Inicio</th><th>Paciente</th><th>Biológico</th><th>Síntomas</th><th>Gravedad</th><th>SIVIGILA</th></tr></thead>
              <tbody>{esavi.map((x) => (
                <tr key={x.id}>
                  <td style={{ whiteSpace: 'nowrap' }}>{fmtDT(x.onsetAt)}</td>
                  <td>{x.patient}<div className="hint">{x.docNumber}</div></td>
                  <td>{x.vaccine}<div className="hint">{x.dose} · lote {x.lot || '—'}</div></td>
                  <td style={{ minWidth: 180 }}>{x.symptoms}{x.actions && <div className="hint">{x.actions}</div>}</td>
                  <td><span className={`badge ${x.severity === 'grave' ? 'warn' : ''}`}>{x.severity === 'grave' ? 'Grave' : 'Leve'}</span></td>
                  <td>{x.notified ? <span className="badge ok">Notificado {fmt(x.notifiedOn)}</span> : <button type="button" className="btn btn-outline btn-sm" onClick={() => notify(x)}>Marcar notificado</button>}</td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      )}
      {tab === 'frascos' && (
        <Card flush title="Frascos multidosis abiertos" subtitle="Cada frasco tiene una vida útil desde que se abre; al vencerse se descarta">
          {!vials ? <div className="splash" style={{ minHeight: 100 }}><Spinner /></div> : vials.length === 0 ? <Empty icon={<MdScience />}>No hay frascos abiertos.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Biológico</th><th>Lote</th><th>Abierto</th><th>Vence</th><th className="num">Dosis usadas</th><th className="actions" /></tr></thead>
              <tbody>{vials.map((x) => (
                <tr key={x.id}>
                  <td><strong style={{ color: 'var(--ink)' }}>{x.vaccine}</strong></td><td>{x.lot}</td><td>{fmtDT(x.openedAt)}</td>
                  <td>{fmtDT(x.expiresAt)} {x.expired && <span className="badge warn">Vencido</span>}</td>
                  <td className="num">{x.dosesUsed} / {x.dosesTotal}</td>
                  <td className="actions"><button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} onClick={() => closeVial(x)}><MdBlock /> Descartar</button></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      )}
      {modal && <EsaviForm record={modal} onClose={() => setModal(null)} onSaved={() => { setModal(null); toast('ESAVI registrado'); load(); setTab('esavi') }} />}
      <p className="hint" style={{ marginTop: 12 }}>¿Falta una persona? <Link to="/vacunacion/registrar">Registrar vacunación</Link></p>
      {share && <ShareDialog kind="carnet" refId={share} onClose={() => setShare(null)} />}
      {toastNode}
    </>
  )
}

export default VaccinationRecords
