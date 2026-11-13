import React, { useState } from 'react'
import { MdAdd, MdEdit, MdDelete, MdErrorOutline, MdSave, MdWork, MdChecklist, MdDescription } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { useCatalogs, resetCatalogs } from './common'
import { Confirm } from './StaffDetail'

const ReqForm = ({ cat, initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(editing
    ? { ...initial, code: initial.code || '', sortOrder: initial.sortOrder ?? '', validityMonths: initial.validityMonths ?? '', maxAgeDays: initial.maxAgeDays ?? '', listadoLabel: initial.listadoLabel || '', description: initial.description || '' }
    : { name: '', code: '', sortOrder: '', category: 'educacion', expires: false, validityMonths: '', maxAgeDays: '', general: false, folder: false, inListado: false, listadoLabel: '', description: '', active: true })
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = async () => {
    setError(''); if (!f.name.trim()) return setError('El nombre es requerido.')
    setSaving(true)
    try { editing ? await api.put(`/estandares/th/requisitos/${initial.id}`, f) : await api.post('/estandares/th/requisitos', f); onSaved() } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar requisito' : 'Nuevo requisito'} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="field"><label>Nombre <span className="req">*</span></label><input value={f.name} onChange={set('name')} placeholder="Ej: Curso de atención a víctimas de violencia sexual" autoFocus /></div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Sección del formato</label><select value={f.category} onChange={set('category')}>{Object.entries(cat.categories).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Numeral / orden</label><div style={{ display: 'flex', gap: 6 }}><input value={f.code} onChange={set('code')} placeholder="2.8" style={{ width: 70 }} /><input type="number" value={f.sortOrder} onChange={set('sortOrder')} placeholder="Orden" /></div></div>
        </div>
        <label className="switch"><input type="checkbox" checked={f.expires} onChange={set('expires')} /> El soporte vence</label>
        {f.expires && <div className="field"><label>Vigencia (meses)</label><input type="number" min="1" max="240" value={f.validityMonths} onChange={set('validityMonths')} placeholder="Ej: 24" /><span className="hint">Calcula el vencimiento desde la fecha de expedición (cursos: 2 años)</span></div>}
        <div className="field"><label>Antigüedad máxima al ingreso (días)</label><input type="number" min="1" value={f.maxAgeDays} onChange={set('maxAgeDays')} placeholder="Ej: 30 para antecedentes" /><span className="hint">Si el soporte se expidió antes, la lista de chequeo lo marca como No cumple</span></div>
        <label className="switch"><input type="checkbox" checked={f.general} onChange={set('general')} /> Aplica a todo el personal (obligatorio sin importar el cargo)</label>
        <label className="switch"><input type="checkbox" checked={f.folder} onChange={set('folder')} /> Hace parte del estándar por cada profesional</label>
        <label className="switch"><input type="checkbox" checked={f.inListado} onChange={set('inListado')} /> Mostrar como columna en el listado de talento humano</label>
        {f.inListado && <div className="field"><label>Título de la columna</label><input value={f.listadoLabel} onChange={set('listadoLabel')} placeholder="Ej: Bioseguridad" /></div>}
        <div className="field"><label>Descripción / aclaración (ej: Según aplique)</label><input value={f.description} onChange={set('description')} /></div>
        {editing && <label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Activo' : 'Inactivo'}</label>}
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

const PositionForm = ({ cat, initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(editing ? { name: initial.name, description: initial.description || '', active: initial.active } : { name: '', description: '', active: true })
  const [reqs, setReqs] = useState(() => Object.fromEntries((initial?.requirements || []).map((r) => [r.requirementTypeId, r.mandatory])))
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const toggle = (id) => setReqs((x) => { const n = { ...x }; if (id in n) delete n[id]; else n[id] = true; return n })
  const submit = async () => {
    setError(''); if (!f.name.trim()) return setError('El nombre del cargo es requerido.')
    setSaving(true)
    const body = { ...f, requirements: Object.entries(reqs).map(([k, m]) => ({ requirementTypeId: Number(k), mandatory: m })) }
    try { editing ? await api.put(`/estandares/th/cargos/${initial.id}`, body) : await api.post('/estandares/th/cargos', body); onSaved() } catch (e) { setError(errorMessage(e)); setSaving(false) }
  }
  return (
    <Modal title={editing ? `Editar cargo · ${initial.name}` : 'Nuevo cargo'} size="lg" onClose={onClose}
      footer={<><span className="hint" style={{ marginRight: 'auto' }}>{Object.keys(reqs).length} requisito{Object.keys(reqs).length === 1 ? '' : 's'}</span><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={submit} disabled={saving}>{saving ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 14 }}>
        <div className="form-grid">
          <div className="field"><label>Nombre del cargo <span className="req">*</span></label><input value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} placeholder="Ej: Auxiliar de enfermería" autoFocus /></div>
          <div className="field"><label>Descripción</label><input value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} /></div>
        </div>
        <div><span className="label">Requisitos que exige el cargo</span><p className="hint" style={{ margin: '2px 0 8px' }}>Los marcados como “todo el personal” ya aplican a todos. Aquí marca los adicionales de este cargo (por ejemplo ReTHUS, tarjeta profesional, SVA o COVE) y si son obligatorios.</p>
          {Object.entries(cat.categories).map(([k, l]) => {
            const rs = cat.requirements.filter((r) => r.category === k && !r.general && (r.active || r.id in reqs))
            if (!rs.length) return null
            return (
              <div key={k} style={{ marginBottom: 10 }}>
                <div className="hint" style={{ fontWeight: 700, marginBottom: 4 }}>{l}</div>
                <div className="th-req-grid">{rs.map((r) => (
                  <div key={r.id} className={`th-req${r.id in reqs ? ' on' : ''}`}>
                    <label><input type="checkbox" checked={r.id in reqs} onChange={() => toggle(r.id)} /> {r.code ? `${r.code} ` : ''}{r.name}</label>
                    {r.id in reqs && <label className="th-req-m"><input type="checkbox" checked={reqs[r.id]} onChange={(e) => setReqs({ ...reqs, [r.id]: e.target.checked })} /> Obligatorio</label>}
                  </div>
                ))}</div>
              </div>
            )
          })}
        </div>
        {editing && <label className="switch"><input type="checkbox" checked={f.active} onChange={(e) => setF({ ...f, active: e.target.checked })} /> {f.active ? 'Activo' : 'Inactivo'}</label>}
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </div>
    </Modal>
  )
}

const FORMAT_NAMES = { chequeo: 'Lista de chequeo de gestión de talento humano', listado: 'Listado / control de talento humano', hoja_vida: 'Hoja de vida del profesional' }
const FormatsCard = ({ formats, onSaved }) => {
  const [rows, setRows] = useState(() => Object.fromEntries(Object.keys(FORMAT_NAMES).map((k) => [k, { process: '', code: '', version: '', versionDate: '', ...Object.fromEntries(Object.entries(formats?.[k] || {}).map(([a, b]) => [a, b || ''])) }])))
  const [busy, setBusy] = useState(''); const [toast, toastNode] = useToast()
  const save = async (k) => { setBusy(k); try { await api.put(`/estandares/th/formatos/${k}`, rows[k]); onSaved() } catch (e) { toast(errorMessage(e), 'bad') } finally { setBusy('') } }
  const set = (k, f) => (e) => setRows({ ...rows, [k]: { ...rows[k], [f]: e.target.value } })
  return (
    <Card flush title="Encabezado de los formatos" subtitle="Proceso, código, versión y fecha que aparecen en cada formato impreso (el logo es el de Configuración)" icon={<MdDescription style={{ color: 'var(--brand)' }} />}>
      <div className="table-wrap"><table className="table">
        <thead><tr><th>Formato</th><th>Proceso</th><th>Código</th><th>Versión</th><th>Fecha</th><th className="actions" /></tr></thead>
        <tbody>{Object.entries(FORMAT_NAMES).map(([k, l]) => (
          <tr key={k}>
            <td style={{ whiteSpace: 'normal' }}><strong style={{ color: 'var(--ink)' }}>{l}</strong></td>
            <td><input className="input" value={rows[k].process} onChange={set(k, 'process')} placeholder="Gestión de Salud" /></td>
            <td><input className="input" value={rows[k].code} onChange={set(k, 'code')} placeholder="SAL - FO-019" style={{ width: 130 }} /></td>
            <td><input className="input" value={rows[k].version} onChange={set(k, 'version')} placeholder="002" style={{ width: 70 }} /></td>
            <td><input className="input" value={rows[k].versionDate} onChange={set(k, 'versionDate')} placeholder="Marzo 2026" style={{ width: 120 }} /></td>
            <td className="actions"><button type="button" className="btn btn-outline btn-sm" disabled={busy === k} onClick={() => save(k)}>{busy === k ? <Spinner /> : <MdSave />} Guardar</button></td>
          </tr>
        ))}</tbody>
      </table></div>
      {toastNode}
    </Card>
  )
}

// Configuración del estándar: cargos de la IPS y los requisitos que exige cada uno.
const ThConfig = () => {
  const [toast, toastNode] = useToast()
  const [v, setV] = useState(0)
  const cat = useCatalogs(v)
  const [modal, setModal] = useState(null)
  const reload = (msg) => { resetCatalogs(); setModal(null); setV((x) => x + 1); if (msg) toast(msg) }
  const del = async (url, msg) => { try { await api.delete(url); reload(msg) } catch (e) { setModal(null); toast(errorMessage(e), 'bad') } }
  if (!cat) return <div className="splash"><Spinner /></div>
  const reqName = (id) => cat.requirements.find((r) => r.id === id)?.name || '—'

  return (
    <>
      <PageHead title="Cargos y requisitos" subtitle="Define qué soportes exige cada cargo. La lista de chequeo y las alertas se calculan con esta configuración." />
      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        <Card flush title="Cargos" icon={<MdWork style={{ color: 'var(--brand)' }} />} actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({ pos: {} })}><MdAdd /> Nuevo cargo</button>}>
          {cat.positions.length === 0 ? <Empty icon={<MdWork />}>Aún no hay cargos. Crea el primero y marca sus requisitos.</Empty> : (
            <ul className="list" style={{ padding: '4px 20px 8px' }}>{cat.positions.map((p) => (
              <li key={p.id} style={p.active ? undefined : { opacity: 0.55 }}>
                <div className="grow"><strong>{p.name} {!p.active && <span className="badge">Inactivo</span>}</strong>
                  <span style={{ whiteSpace: 'normal' }}>{p.requirements.length ? p.requirements.map((r) => `${reqName(r.requirementTypeId)}${r.mandatory ? '' : ' (opc.)'}`).join(' · ') : 'Sin requisitos'}</span></div>
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ pos: p })}><MdEdit /></button>
                <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delPos: p })}><MdDelete /></button>
              </li>
            ))}</ul>
          )}
        </Card>
        <Card flush title="Catálogo de requisitos" icon={<MdChecklist style={{ color: 'var(--brand)' }} />} actions={<button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ req: {} })}><MdAdd /> Requisito</button>}>
          <ul className="list" style={{ padding: '4px 20px 8px' }}>{cat.requirements.map((r, i) => (
            <React.Fragment key={r.id}>
            {(i === 0 || cat.requirements[i - 1].category !== r.category) && <li className="th-list-sec">{r.categoryLabel}</li>}
            <li style={r.active ? undefined : { opacity: 0.55 }}>
              <div className="grow"><strong>{r.code ? `${r.code} ` : ''}{r.name}</strong><span>{[r.general ? 'Todo el personal' : 'Según cargo', r.expires ? `Vence${r.validityMonths ? ` cada ${r.validityMonths} meses` : ''}` : 'No vence', r.maxAgeDays ? `Máx. ${r.maxAgeDays} días al ingreso` : null, r.folder ? 'Estándar por profesional' : null, r.inListado ? 'En listado' : null, r.active ? null : 'Inactivo'].filter(Boolean).join(' · ')}</span></div>
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal({ req: r })}><MdEdit /></button>
              <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => setModal({ delReq: r })}><MdDelete /></button>
            </li>
            </React.Fragment>
          ))}</ul>
        </Card>
      </div>
      <div style={{ marginTop: 18 }}><FormatsCard formats={cat.formats} onSaved={() => reload('Encabezado guardado')} /></div>
      {modal?.pos && <PositionForm cat={cat} initial={modal.pos.id ? modal.pos : null} onClose={() => setModal(null)} onSaved={() => reload('Cargo guardado')} />}
      {modal?.req && <ReqForm cat={cat} initial={modal.req.id ? modal.req : null} onClose={() => setModal(null)} onSaved={() => reload('Requisito guardado')} />}
      {modal?.delPos && <Confirm title="Eliminar cargo" onClose={() => setModal(null)} onOk={() => del(`/estandares/th/cargos/${modal.delPos.id}`, 'Cargo eliminado')}>¿Eliminar el cargo <b>{modal.delPos.name}</b>?</Confirm>}
      {modal?.delReq && <Confirm title="Eliminar requisito" onClose={() => setModal(null)} onOk={() => del(`/estandares/th/requisitos/${modal.delReq.id}`, 'Requisito eliminado')}>¿Eliminar <b>{modal.delReq.name}</b>? Si ya tiene soportes cargados, desactívalo en su lugar.</Confirm>}
      {toastNode}
    </>
  )
}

export default ThConfig
