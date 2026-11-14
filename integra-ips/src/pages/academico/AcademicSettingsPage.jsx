import React, { useCallback, useEffect, useState } from 'react'
import { MdSave, MdAdd, MdEdit, MdDelete, MdErrorOutline, MdGavel, MdEventRepeat, MdFactCheck } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import DiscountsCard from '../DiscountsCard'
import { KINDS } from './common'

const PLAN_KINDS = { todos: 'Todos los programas', ...KINDS }

const PLAN_EMPTY = { name: '', programKind: 'todos', installments: 1, intervalMonths: 1, description: '', active: true, sortOrder: 0 }
const PlanForm = ({ initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => ({ ...PLAN_EMPTY, ...Object.fromEntries(Object.entries(initial || {}).filter(([k]) => k in PLAN_EMPTY).map(([k, v]) => [k, v ?? ''])) }))
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.name.trim()) return setError('El nombre del plan es requerido.')
    if (!(Number(f.installments) >= 1 && Number(f.installments) <= 36)) return setError('Las cuotas deben estar entre 1 y 36.')
    setSaving(true)
    try { const { data } = editing ? await api.put(`/academico/planes-pago/${initial.id}`, f) : await api.post('/academico/planes-pago', f); onSaved(data) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar plan de pagos' : 'Nuevo plan de pagos'} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="plan-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} {editing ? 'Guardar' : 'Crear'}</button></>}>
      <form id="plan-form" onSubmit={submit} noValidate className="stack" style={{ gap: 12 }}>
        <div className="field"><label>Nombre <span className="req">*</span></label><input value={f.name} onChange={set('name')} autoFocus placeholder="Ej: Carrera técnica · semestre en 4 cuotas" /></div>
        <div className="field"><label>Aplica a</label><select value={f.programKind} onChange={set('programKind')}>{Object.entries(PLAN_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Número de cuotas <span className="req">*</span></label><input type="number" min="1" max="36" value={f.installments} onChange={set('installments')} /></div>
          <div className="field"><label>Cada cuántos meses</label><input type="number" min="1" max="12" value={f.intervalMonths} onChange={set('intervalMonths')} /></div>
        </div>
        <div className="field"><label>Descripción</label><input value={f.description} onChange={set('description')} placeholder="Condiciones del plan" /></div>
        {editing && <label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Activo' : 'Inactivo (no se ofrece al matricular)'}</label>}
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

// Configuración académica: reglamento estudiantil (anexo del contrato), cláusulas adicionales, política de devoluciones,
// descuentos (mismo diseño de IPS) y planes de pago (número de cuotas por tipo de programa).
const AcademicSettingsPage = () => {
  const [toast, toastNode] = useToast()
  const [f, setF] = useState(null)
  const [plans, setPlans] = useState([])
  const [staff, setStaff] = useState([])
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(null)
  const loadPlans = useCallback(() => api.get('/academico/planes-pago').then(({ data }) => setPlans(data)).catch(() => {}), [])
  useEffect(() => { api.get('/academico/configuracion').then(({ data }) => setF(data)).catch((e) => setError(errorMessage(e))); loadPlans(); api.get('/academico/docentes').then(({ data }) => setStaff(data)).catch(() => {}) }, [loadPlans])
  const setFmt = (k) => (e) => setF({ ...f, attendanceFormat: { ...f.attendanceFormat, [k]: e.target.value } })
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const save = async () => {
    setSaving(true); setError('')
    try { const { data } = await api.put('/academico/configuracion', f); setF(data); toast(`Configuración guardada · reglamento versión ${data.rulesVersion}`) } catch (e) { setError(errorMessage(e)) } finally { setSaving(false) }
  }
  const removePlan = async (p) => { try { await api.delete(`/academico/planes-pago/${p.id}`); loadPlans(); toast('Plan eliminado') } catch (e) { toast(errorMessage(e), 'bad') } }
  if (!f) return error ? <div className="alert bad"><MdErrorOutline /><span>{error}</span></div> : <div className="splash"><Spinner /></div>
  return (
    <>
      <PageHead title="Configuración académica" subtitle="Reglamento estudiantil, contrato de matrícula, planes de pago y descuentos">
        <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : <MdSave />} Guardar</button>
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      <div className="grid grid-2" style={{ marginBottom: 18, alignItems: 'start' }}>
          <Card title="Planes de pago" subtitle="Número de cuotas según el tipo de programa. Al matricular se elige uno de estos planes." flush icon={<MdEventRepeat style={{ color: 'var(--brand)' }} />} actions={<button type="button" className="btn btn-primary btn-sm" onClick={() => setModal({})}><MdAdd /> Nuevo plan</button>}>
            {plans.length === 0 ? <Empty icon={<MdEventRepeat />}>Sin planes: las matrículas quedan de contado.</Empty> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Plan</th><th>Aplica a</th><th className="num">Cuotas</th><th className="actions" /></tr></thead>
                  <tbody>{plans.map((p) => (
                    <tr key={p.id} style={p.active ? undefined : { opacity: 0.55 }}>
                      <td style={{ whiteSpace: 'normal' }}><b>{p.name}</b>{p.description && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.description}</div>}</td>
                      <td>{p.programKindLabel}</td>
                      <td className="num">{p.installments}{p.intervalMonths > 1 ? <div style={{ fontSize: 12, color: 'var(--muted)' }}>cada {p.intervalMonths} meses</div> : null}</td>
                      <td className="actions"><button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal(p)}><MdEdit /></button><button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => removePlan(p)}><MdDelete /></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Card>
          <DiscountsCard endpoint="/academico/descuentos" title="Descuentos de educación" subtitle="Se aplican al matricular (pronto pago, becas, voluntarios…)" usedIn="alguna matrícula" />
        </div>
      <div className="stack">
          <Card title="Asistencia y notas" subtitle="Formato institucional del acta, asistencia mínima, nota aprobatoria y quién firma las actas como director de educación" icon={<MdFactCheck style={{ color: 'var(--brand)' }} />}>
            <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
              <div className="field"><label>Código del formato</label><input value={f.attendanceFormat?.code || ''} onChange={setFmt('code')} placeholder="Ej. FO-ACA-05" /></div>
              <div className="field"><label>Nombre del formato</label><input value={f.attendanceFormat?.name || ''} onChange={setFmt('name')} placeholder="Registro de asistencia" /></div>
              <div className="field"><label>Versión</label><input value={f.attendanceFormat?.version || ''} onChange={setFmt('version')} placeholder="Ej. 02" /></div>
              <div className="field"><label>Asistencia mínima (%)</label><input type="number" min="0" max="100" value={f.minAttendancePct ?? 80} onChange={(e) => setF({ ...f, minAttendancePct: e.target.value })} /><span className="hint">Por debajo, el estudiante aparece en riesgo.</span></div>
              <div className="field"><label>Nota mínima aprobatoria</label><input type="number" min="0" max="5" step="0.1" value={f.passingScore ?? 3} onChange={(e) => setF({ ...f, passingScore: e.target.value })} /><span className="hint">Escala de 0,0 a 5,0.</span></div>
              <div className="field" style={{ gridColumn: 'span 1' }}><label>Director(a) de educación</label><select value={f.directorUserId || ''} onChange={(e) => setF({ ...f, directorUserId: e.target.value })}><option value="">Solo el administrador firma</option>{staff.map((u) => <option key={u.id} value={u.id}>{u.fullName}</option>)}</select><span className="hint">Firma las actas que cierran los docentes (con su firma digital o dibujándola).</span></div>
            </div>
          </Card>
          <Card title="Reglamento estudiantil" subtitle={`Versión ${f.rulesVersion} · se anexa al contrato y el estudiante lo acepta al firmar. Si cambias el texto sube la versión.`} icon={<MdGavel style={{ color: 'var(--brand)' }} />}>
            <div className="stack" style={{ gap: 12 }}>
              <div className="field"><label>Título</label><input value={f.rulesTitle} onChange={set('rulesTitle')} /></div>
              <div className="field"><label>Texto del reglamento</label><textarea rows={14} value={f.rulesText || ''} onChange={set('rulesText')} placeholder="Pega aquí el reglamento estudiantil aprobado por la institución." /></div>
            </div>
          </Card>
          <Card title="Contrato de matrícula" subtitle="El contrato ya incluye objeto, valor y plan de pagos, obligaciones, retiro, reglamento, datos personales y vigencia. Aquí agregas lo propio de tu institución." icon={<MdGavel style={{ color: 'var(--brand)' }} />}>
            <div className="stack" style={{ gap: 12 }}>
              <div className="field"><label>Política de retiro y devoluciones</label><textarea rows={4} value={f.refundPolicy || ''} onChange={set('refundPolicy')} placeholder="Ej. Si el estudiante se retira antes de iniciar clases se devuelve el 80 %…" /></div>
              <div className="field"><label>Cláusulas adicionales</label><textarea rows={6} value={f.contractClauses || ''} onChange={set('contractClauses')} placeholder="Separa cada cláusula con una línea en blanco." /></div>
            </div>
          </Card>
      </div>
      {modal && <PlanForm initial={modal.id ? modal : null} onClose={() => setModal(null)} onSaved={() => { setModal(null); loadPlans(); toast('Plan de pagos guardado') }} />}
      {toastNode}
    </>
  )
}

export default AcademicSettingsPage
