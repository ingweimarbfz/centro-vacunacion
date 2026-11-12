import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  MdFactCheck, MdCheckCircle, MdWarning, MdCancel, MdUploadFile, MdSettings, MdAdd, MdEdit, MdDelete, MdSave, MdErrorOutline, MdFolderSpecial, MdPrint, MdArrowForward, MdChecklist
} from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { DocForm, FileIcon, date } from './StdDocumentsPage'

const STATUS = { cumple: ['Cumple', 'ok', MdCheckCircle], por_vencer: ['Por vencer', 'warn', MdWarning], vencido: ['Vencido', 'bad', MdCancel], faltante: ['Faltante', 'bad', MdCancel] }
const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Bogota' }).format(new Date())
const fmt = (iso) => (iso ? iso.split('-').reverse().join('/') : '—')

// ---------------------------------------------------------------- Verificación (lista de chequeo de la carpeta)
const CheckForm = ({ standard, onClose, onSaved }) => {
  const [items, setItems] = useState(null)
  const [d, setD] = useState(today()); const [obs, setObs] = useState('')
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  useEffect(() => { api.get(`/estandares/documentos/${standard}/verificaciones/borrador`).then(({ data }) => setItems(data)).catch((e) => setError(errorMessage(e))) }, [standard])
  const setItem = (i, k, v) => setItems(items.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const fails = (items || []).filter((i) => i.value === 'no').length
  const submit = async () => {
    setError('')
    if (items.some((i) => i.value === 'na' && !i.observation.trim())) return setError('Justifica en la observación cada ítem marcado como No aplica.')
    setSaving(true)
    try { const { data } = await api.post(`/estandares/documentos/${standard}/verificaciones`, { date: d, items, observations: obs }); onSaved(data) } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title="Verificar carpeta obligatoria" size="lg" onClose={onClose}
      footer={<><span style={{ marginRight: 'auto' }}>{items && <span className={`badge ${fails ? 'bad' : 'ok'}`}>{fails ? `No cumple · ${fails} ítem${fails === 1 ? '' : 's'}` : 'Cumple'}</span>}</span>
        <button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving || !items?.length}>{saving ? <Spinner /> : <MdSave />} Guardar verificación</button></>}>
      {!items && !error ? <div className="splash" style={{ minHeight: 120 }}><Spinner /></div> : (
        <div className="stack" style={{ gap: 14 }}>
          <div className="alert info" style={{ margin: 0 }}><MdFactCheck /><span>El sistema propone Sí o No según los documentos cargados y su vigencia. Revisa cada uno y ajusta lo necesario; en la observación registra faltantes, vencidos o la justificación del No aplica.</span></div>
          <div className="field" style={{ maxWidth: 220 }}><label>Fecha de verificación</label><input type="date" value={d} max={today()} onChange={(e) => setD(e.target.value)} /></div>
          {items?.length === 0 ? <div className="alert warn"><MdWarning /><span>No hay documentos obligatorios configurados.</span></div> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Documento obligatorio</th><th>En la carpeta</th><th style={{ width: 230 }}>Cumple</th><th>Observación</th></tr></thead>
              <tbody>{(items || []).map((it, i) => (
                <tr key={it.requiredId}>
                  <td style={{ whiteSpace: 'normal', minWidth: 200 }}><strong style={{ color: 'var(--ink)' }}>{it.code ? `${it.code}. ` : ''}{it.name}</strong>{it.documents.length > 0 && <div className="hint">{it.documents.join(' · ')}</div>}</td>
                  <td><span className={`badge ${STATUS[it.status][1]}`}>{STATUS[it.status][0]}</span></td>
                  <td><div className="th-seg">{[['si', 'Sí', 'ok'], ['no', 'No', 'bad'], ['na', 'No aplica', '']].map(([k, l, tone]) => (
                    <button key={k} type="button" className={it.value === k ? `on ${tone}` : ''} onClick={() => setItem(i, 'value', k)}>{l}</button>
                  ))}</div></td>
                  <td><input className="input" value={it.observation} onChange={(e) => setItem(i, 'observation', e.target.value)} /></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
          <div className="field"><label>Observaciones generales</label><textarea value={obs} onChange={(e) => setObs(e.target.value)} style={{ minHeight: 56 }} /></div>
          {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
        </div>
      )}
    </Modal>
  )
}

// ---------------------------------------------------------------- Configuración de la carpeta (administrador)
const ConfigSection = ({ standard, kind, format, onSaved }) => {
  const [rows, setRows] = useState(null)
  const [edit, setEdit] = useState(null)
  const [fm, setFm] = useState({ process: format?.process || '', code: format?.code || '', version: format?.version || '', versionDate: format?.versionDate || '' })
  const q = `?tipo=${kind}`
  const follow = kind === 'seguimiento'
  const [error, setError] = useState(''); const [busy, setBusy] = useState(false)
  const load = useCallback(() => api.get(`/estandares/documentos/${standard}/requeridos${q}`).then(({ data }) => setRows(data)), [standard, q])
  useEffect(() => { load() }, [load])
  const save = async () => {
    setError(''); if (!edit.name?.trim()) return setError('Escribe el nombre del documento obligatorio.')
    setBusy(true)
    try { edit.id ? await api.put(`/estandares/documentos/${standard}/requeridos/${edit.id}${q}`, edit) : await api.post(`/estandares/documentos/${standard}/requeridos${q}`, edit); setEdit(null); load(); onSaved(false) } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) }
  }
  const del = async (r) => { try { await api.delete(`/estandares/documentos/${standard}/requeridos/${r.id}`); load(); onSaved(false) } catch (e) { setError(errorMessage(e)) } }
  const saveFormat = async () => { setBusy(true); try { await api.put(`/estandares/documentos/${standard}/config/formato${q}`, fm); onSaved(true) } catch (e) { setError(errorMessage(e)) } finally { setBusy(false) } }
  return (
      <div className="stack" style={{ gap: 16 }}>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="label">{follow ? 'Actividades de seguimiento (plantilla)' : 'Documentos obligatorios'}</span><button type="button" className="btn btn-outline btn-sm" onClick={() => setEdit({ code: '', name: '', description: '', expires: false, sortOrder: (rows?.length || 0) + 1, active: true })}><MdAdd /> Agregar</button></div>
          {!rows ? <Spinner /> : (
            <ul className="list">{rows.map((r) => (
              <li key={r.id} style={r.active ? undefined : { opacity: 0.55 }}>
                <div className="grow"><strong>{r.code ? `${r.code}. ` : ''}{r.name}</strong><span>{[follow ? null : r.expires ? 'Tiene vigencia' : 'Sin vencimiento', r.active ? null : 'Inactivo', r.description].filter(Boolean).join(' · ')}</span></div>
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setEdit({ ...r, code: r.code || '', description: r.description || '' })}><MdEdit /></button>
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => del(r)}><MdDelete /></button>
              </li>
            ))}</ul>
          )}
          {edit && (
            <div className="card" style={{ padding: 14, marginTop: 10 }}>
              <div className="form-grid">
                <div className="field"><label>Numeral</label><input value={edit.code} onChange={(e) => setEdit({ ...edit, code: e.target.value })} placeholder="5" /></div>
                <div className="field" style={{ gridColumn: 'span 2' }}><label>Nombre <span className="req">*</span></label><input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} autoFocus /></div>
                <div className="field span-all"><label>Descripción</label><input value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></div>
              </div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center', marginTop: 10 }}>
                {!follow && <label className="switch"><input type="checkbox" checked={edit.expires} onChange={(e) => setEdit({ ...edit, expires: e.target.checked })} /> Tiene vigencia (certificados, convenios, contratos)</label>}
                <label className="switch"><input type="checkbox" checked={edit.active} onChange={(e) => setEdit({ ...edit, active: e.target.checked })} /> Activo</label>
                <span style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}><button type="button" className="btn btn-ghost btn-sm" onClick={() => setEdit(null)}>Cancelar</button><button type="button" className="btn btn-primary btn-sm" onClick={save} disabled={busy}><MdSave /> Guardar</button></span>
              </div>
            </div>
          )}
        </div>
        <div>
          <span className="label">Encabezado del formato {follow ? 'de seguimiento' : 'de verificación de la carpeta'}</span>
          <div className="form-grid" style={{ marginTop: 8, alignItems: 'end' }}>
            <div className="field"><label>Proceso</label><input value={fm.process} onChange={(e) => setFm({ ...fm, process: e.target.value })} /></div>
            <div className="field"><label>Código</label><input value={fm.code} onChange={(e) => setFm({ ...fm, code: e.target.value })} placeholder="SAL - FO-0XX" /></div>
            <div className="field"><label>Versión</label><input value={fm.version} onChange={(e) => setFm({ ...fm, version: e.target.value })} /></div>
            <div className="field"><label>Fecha</label><input value={fm.versionDate} onChange={(e) => setFm({ ...fm, versionDate: e.target.value })} placeholder="Marzo 2026" /></div>
            <div><button type="button" className="btn btn-outline" onClick={saveFormat} disabled={busy}><MdSave /> Guardar encabezado</button></div>
          </div>
        </div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
  )
}
const ConfigModal = ({ standard, cat, followUp, onClose, onSaved }) => {
  const [tab, setTab] = useState('carpeta')
  return (
    <Modal title="Configurar" size="lg" onClose={onClose} footer={<button type="button" className="btn btn-outline" onClick={onClose}>Cerrar</button>}>
      {followUp && (
        <div className="th-seg" style={{ marginBottom: 14 }}>
          <button type="button" className={tab === 'carpeta' ? 'on' : ''} onClick={() => setTab('carpeta')}>Carpeta obligatoria</button>
          <button type="button" className={tab === 'seguimiento' ? 'on' : ''} onClick={() => setTab('seguimiento')}>Actividades de seguimiento</button>
        </div>
      )}
      <ConfigSection key={tab} standard={standard} kind={tab} format={tab === 'seguimiento' ? cat.followFormat : cat.format} onSaved={onSaved} />
    </Modal>
  )
}

// ---------------------------------------------------------------- Actividad de seguimiento (Actividad / Hallazgo / Observación)
const FINDINGS = [['ok', 'Ok', 'ok'], ['parcial', 'Parcial', 'warn'], ['no_evidencia', 'No se evidencia', 'bad'], ['na', 'No aplica', '']]
const FollowForm = ({ standard, template, onClose, onSaved }) => {
  const [rows, setRows] = useState(() => template.map((t) => ({ templateId: t.id, activity: t.name, hint: t.description, finding: 'ok', detail: '', observation: '' })))
  const [d, setD] = useState(today()); const [obs, setObs] = useState('')
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const setRow = (i, k, v) => setRows(rows.map((x, j) => (j === i ? { ...x, [k]: v } : x)))
  const submit = async () => {
    setError('')
    const items = rows.filter((r) => r.activity.trim())
    if (!items.length) return setError('Agrega al menos una actividad.')
    setSaving(true)
    try { const { data } = await api.post(`/estandares/documentos/${standard}/seguimientos`, { date: d, items, observations: obs }); onSaved(data) } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title="Nueva actividad de seguimiento" size="lg" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdSave />} Guardar seguimiento</button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="field" style={{ maxWidth: 220 }}><label>Fecha del seguimiento</label><input type="date" value={d} max={today()} onChange={(e) => setD(e.target.value)} /></div>
        <div className="table-wrap"><table className="table">
          <thead><tr><th>Actividad</th><th style={{ width: 330 }}>Hallazgo</th><th>Observación</th><th /></tr></thead>
          <tbody>{rows.map((r, i) => (
            <tr key={i}>
              <td style={{ minWidth: 200 }}>{r.templateId ? <><strong style={{ color: 'var(--ink)' }}>{r.activity}</strong>{r.hint && <div className="hint">{r.hint}</div>}</> : <input className="input" value={r.activity} onChange={(e) => setRow(i, 'activity', e.target.value)} placeholder="Actividad" />}</td>
              <td><div className="th-seg">{FINDINGS.map(([k, l, tone]) => <button key={k} type="button" className={r.finding === k ? `on ${tone}` : ''} onClick={() => setRow(i, 'finding', k)}>{l}</button>)}</div>
                {r.finding !== 'ok' && r.finding !== 'na' && <input className="input" style={{ marginTop: 6 }} value={r.detail} onChange={(e) => setRow(i, 'detail', e.target.value)} placeholder="Detalle del hallazgo (opcional)" />}</td>
              <td><textarea className="input" rows={2} value={r.observation} onChange={(e) => setRow(i, 'observation', e.target.value)} placeholder="Soportes faltantes, compromisos…" style={{ minHeight: 40 }} /></td>
              <td>{!r.templateId && <button type="button" className="btn btn-ghost btn-icon btn-sm" aria-label="Quitar" onClick={() => setRows(rows.filter((_, j) => j !== i))}><MdDelete /></button>}</td>
            </tr>
          ))}</tbody>
        </table></div>
        <div><button type="button" className="btn btn-outline btn-sm" onClick={() => setRows([...rows, { templateId: null, activity: '', finding: 'ok', detail: '', observation: '' }])}><MdAdd /> Agregar actividad</button></div>
        <div className="field"><label>Observaciones generales</label><textarea value={obs} onChange={(e) => setObs(e.target.value)} style={{ minHeight: 56 }} /></div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

// Carpeta obligatoria de un estándar: estado de cada documento, verificaciones y carga directa.
const StdFolderPage = ({ standard, title, subtitle, docsPath, basePath, followUp = false, bridge = null }) => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const navigate = useNavigate()
  const [toast, toastNode] = useToast()
  const [cat, setCat] = useState(null)
  const [data, setData] = useState(null)
  const [sites, setSites] = useState([])
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const load = useCallback(() => Promise.all([
    api.get(`/estandares/documentos/${standard}/catalogos`).then(({ data: c }) => setCat(c)),
    api.get(`/estandares/documentos/${standard}/carpeta`).then(({ data: d }) => setData(d))
  ]).catch((e) => setError(errorMessage(e))), [standard])
  useEffect(() => { load() }, [load])
  useEffect(() => { if (admin) api.get('/sedes', { params: { sede: undefined } }).then(({ data: d }) => setSites(d)).catch(() => {}) }, [admin])
  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!data || !cat) return <div className="splash"><Spinner /> Cargando carpeta…</div>
  const s = data.summary
  const last = data.checklists.find((c) => (c.siteId || null) === (data.siteId || null))
  const pct = s.total ? Math.round(((s.cumple + s.porVencer) / s.total) * 100) : 0
  const siteName = data.siteId ? sites.find((x) => x.id === data.siteId)?.name || user.site?.name : 'General (documentos de toda la IPS)'

  return (
    <>
      <PageHead title={title} subtitle={subtitle}>
        {admin && <button type="button" className="btn btn-ghost" onClick={() => setModal({ config: true })}><MdSettings /> Configurar</button>}
        <Link to={docsPath} className="btn btn-outline">Todos los documentos <MdArrowForward /></Link>
        {followUp && <button type="button" className="btn btn-outline" onClick={() => setModal({ follow: true })}><MdChecklist /> Seguimiento</button>}
        <button type="button" className="btn btn-primary" onClick={() => setModal({ check: true })}><MdFactCheck /> Verificar carpeta</button>
      </PageHead>
      {bridge}

      <div className="grid grid-kpi">
        <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Cumplimiento de la carpeta</span><span className={`kpi-icon ${pct === 100 ? 'ok' : 'warn'}`}><MdFolderSpecial /></span></div><div className="kpi-value">{pct}%</div><div className="kpi-foot">{s.cumple + s.porVencer} de {s.total} documentos obligatorios · {siteName}</div></div>
        <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Faltantes</span><span className="kpi-icon"><MdCancel /></span></div><div className="kpi-value">{s.faltante}</div><div className="kpi-foot">Sin documento cargado</div></div>
        <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Vencidos / por vencer</span><span className="kpi-icon warn"><MdWarning /></span></div><div className="kpi-value">{s.vencido} <small>/ {s.porVencer}</small></div><div className="kpi-foot">Aviso 30 días antes</div></div>
        <div className="card kpi"><div className="kpi-top"><span className="kpi-label">Última verificación</span><span className="kpi-icon navy"><MdFactCheck /></span></div><div className="kpi-value" style={{ fontSize: 20 }}>{last ? fmt(last.date) : '—'}</div><div className="kpi-foot">{last ? <><span className={`badge ${last.result === 'cumple' ? 'ok' : 'bad'}`}>{last.result === 'cumple' ? 'Cumple' : 'No cumple'}</span> {last.code}</> : 'Sin verificar en esta carpeta'}</div></div>
      </div>

      <div style={{ marginTop: 18 }}>
        <Card flush title="Documentos obligatorios en la carpeta" subtitle={admin ? 'Cambia la sede arriba para ver la carpeta de cada sede; “Todas las sedes” muestra los documentos generales.' : 'Incluye los documentos generales de la IPS y los de tu sede.'} icon={<MdFolderSpecial style={{ color: 'var(--brand)' }} />}>
          {data.items.length === 0 ? <Empty icon={<MdFolderSpecial />}>No hay documentos obligatorios configurados.</Empty> : (
            <div className="sd-folder">{data.items.map((it) => {
              const [label, tone, I] = STATUS[it.status]
              return (
                <div key={it.id} className={`sd-folder-item ${tone}`}>
                  <div className="sd-folder-head">
                    <span className={`sd-folder-st ${tone}`}><I /></span>
                    <div className="grow"><strong>{it.code ? `${it.code}. ` : ''}{it.name}</strong>{it.description && <small>{it.description}</small>}</div>
                    <span className={`badge ${tone}`}>{label}</span>
                  </div>
                  {it.documents.length > 0 && (
                    <ul className="sd-folder-docs">{it.documents.map((d) => (
                      <li key={d.id}><FileIcon ext={d.fileExt} /><a href={d.fileUrl} target="_blank" rel="noreferrer">{d.name}</a>
                        <small>{d.siteName || 'General'}{d.validUntil ? ` · vigente hasta ${date(d.validUntil + 'T12:00:00')}` : ''}</small>
                        {d.validity && d.validity !== 'vigente' && <span className={`badge ${d.validity === 'vencido' ? 'bad' : 'warn'}`}>{d.validity === 'vencido' ? 'Vencido' : `${d.daysLeft} d`}</span>}</li>
                    ))}</ul>
                  )}
                  <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ upload: it.id })}><MdUploadFile /> {it.documents.length ? 'Cargar otro' : 'Cargar documento'}</button>
                </div>
              )
            })}</div>
          )}
        </Card>
      </div>

      <div style={{ marginTop: 18 }}>
        <Card flush title="Verificaciones de la carpeta" subtitle="Formato tipo lista de chequeo, imprimible y firmable" icon={<MdFactCheck style={{ color: 'var(--brand)' }} />}>
          {data.checklists.length === 0 ? <Empty icon={<MdFactCheck />}>Aún no hay verificaciones. Usa “Verificar carpeta”.</Empty> : (
            <div className="table-wrap"><table className="table">
              <thead><tr><th>Código</th><th>Fecha</th><th>Sede</th><th>Resultado</th><th>Verificó</th><th className="actions" /></tr></thead>
              <tbody>{data.checklists.map((c) => (
                <tr key={c.id} className="th-row" onClick={() => navigate(`${basePath}/verificacion/${c.id}`)}>
                  <td><strong style={{ color: 'var(--ink)' }}>{c.code}</strong></td><td>{fmt(c.date)}</td><td>{c.siteName}</td>
                  <td><span className={`badge ${c.result === 'cumple' ? 'ok' : 'bad'}`}>{c.result === 'cumple' ? 'Cumple' : 'No cumple'}</span> <span className="hint">{c.compliant}/{c.total}</span></td>
                  <td>{c.reviewer || '—'}</td>
                  <td className="actions"><span className="btn btn-ghost btn-sm"><MdPrint /> Ver / firmar</span></td>
                </tr>
              ))}</tbody>
            </table></div>
          )}
        </Card>
      </div>

      {followUp && (
        <div style={{ marginTop: 18 }}>
          <Card flush title="Actividades de seguimiento" subtitle="Formato Actividad · Hallazgo · Observación (imprimible y firmable)" icon={<MdChecklist style={{ color: 'var(--brand)' }} />}
            actions={<button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ follow: true })}><MdAdd /> Nuevo seguimiento</button>}>
            {data.followups.length === 0 ? <Empty icon={<MdChecklist />}>Aún no hay seguimientos.</Empty> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Código</th><th>Fecha</th><th>Sede</th><th>Hallazgos</th><th>Realizó</th><th className="actions" /></tr></thead>
                <tbody>{data.followups.map((c) => (
                  <tr key={c.id} className="th-row" onClick={() => navigate(`${basePath}/seguimiento/${c.id}`)}>
                    <td><strong style={{ color: 'var(--ink)' }}>{c.code}</strong></td><td>{fmt(c.date)}</td><td>{c.siteName}</td>
                    <td>{c.total - c.compliant ? <span className="badge warn">{c.total - c.compliant} pendiente{c.total - c.compliant === 1 ? '' : 's'}</span> : <span className="badge ok">Todo Ok</span>} <span className="hint">{c.compliant}/{c.total} Ok</span></td>
                    <td>{c.reviewer || '—'}</td>
                    <td className="actions"><span className="btn btn-ghost btn-sm"><MdPrint /> Ver / firmar</span></td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </Card>
        </div>
      )}

      {modal?.follow && <FollowForm standard={standard} template={cat.followTemplate || []} onClose={() => setModal(null)} onSaved={(d) => navigate(`${basePath}/seguimiento/${d.id}`)} />}
      {modal?.upload && <DocForm standard={standard} cat={cat} sites={sites} preset={modal.upload} onClose={() => setModal(null)} onSaved={(d) => { setModal(null); toast(`“${d.name}” cargado`); load() }} />}
      {modal?.check && <CheckForm standard={standard} onClose={() => setModal(null)} onSaved={(d) => navigate(`${basePath}/verificacion/${d.id}`)} />}
      {modal?.config && <ConfigModal standard={standard} cat={cat} followUp={followUp} onClose={() => { setModal(null); load() }} onSaved={(f) => { if (f) toast('Encabezado guardado') }} />}
      {toastNode}
    </>
  )
}

export default StdFolderPage
