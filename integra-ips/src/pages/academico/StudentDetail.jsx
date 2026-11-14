import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MdArrowBack, MdEdit, MdAdd, MdErrorOutline, MdHowToReg, MdPerson, MdKey, MdBlock, MdDelete, MdAccountBalanceWallet } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { DOC_TYPES, ENROLL_STATUS, StatusBadge, currentAcademicPeriod, AccountBadge, ContractBadge } from './common'
import { discountLabel } from '../DiscountsCard'
import { AccountModal } from './EnrollmentAccount'
import { StudentForm } from './StudentsPage'

const ENROLL_EMPTY = { programId: '', groupId: '', periodId: '', academicPeriod: currentAcademicPeriod(), enrolledAt: '', firstDueDate: '', status: 'matriculado', discountId: '', agreementId: '', paymentPlanId: '', notes: '' }
const discountOf = (d, base) => (!d ? 0 : d.type === 'valor' ? Math.min(d.value, base) : Math.round(base * d.value) / 100)

// Matrícula con su liquidación. Cobro total: valor del programa. Cobro por periodo: valor del semestre que se matricula.
// Descuento, convenio y plan de pagos se eligen de los catálogos (Configuración académica y Convenios); los valores se calculan solos.
export const EnrollmentForm = ({ student, initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [programs, setPrograms] = useState([])
  const [groups, setGroups] = useState([])
  const [discounts, setDiscounts] = useState([])
  const [agreements, setAgreements] = useState([])
  const [plans, setPlans] = useState([])
  const [f, setF] = useState(() => (editing
    ? { ...ENROLL_EMPTY, ...Object.fromEntries(Object.entries(initial).filter(([k]) => k in ENROLL_EMPTY).map(([k, v]) => [k, v ?? ''])) }
    : ENROLL_EMPTY))
  useEffect(() => {
    // Activos, más los que ya tenga la matrícula (aunque luego se hayan desactivado).
    api.get('/academico/descuentos').then(({ data }) => setDiscounts(data.filter((d) => d.active || d.id === Number(f.discountId)))).catch(() => {})
    api.get('/academico/convenios').then(({ data }) => setAgreements(data.filter((a) => a.active || a.id === Number(f.agreementId)))).catch(() => {})
    api.get('/academico/planes-pago').then(({ data }) => setPlans(data.filter((p) => p.active || p.id === Number(f.paymentPlanId)))).catch(() => {})
  }, []) // eslint-disable-line react-hooks/exhaustive-deps
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  useEffect(() => { api.get('/academico/programas', { params: { activos: editing ? undefined : 1 } }).then(({ data }) => setPrograms(data)).catch(() => {}) }, [editing])
  useEffect(() => {
    if (!f.programId) { setGroups([]); return }
    api.get('/academico/grupos', { params: { programa: f.programId } }).then(({ data }) => setGroups(data.filter((g) => ['planeado', 'en_curso'].includes(g.status) || g.id === Number(f.groupId)))).catch(() => {})
  }, [f.programId, f.groupId])
  const program = programs.find((p) => p.id === Number(f.programId))
  const byPeriod = program?.billingMode === 'periodo'
  const programPlans = plans.filter((p) => program && ['todos', program.kind].includes(p.programKind))
  const base = useMemo(() => {
    if (!program) return 0
    if (!byPeriod) return program.price
    return program.periods.find((x) => x.id === Number(f.periodId))?.price || 0
  }, [program, byPeriod, f.periodId])
  const disc = discounts.find((d) => d.id === Number(f.discountId))
  const agr = agreements.find((a) => a.id === Number(f.agreementId))
  const plan = plans.find((p) => p.id === Number(f.paymentPlanId))
  const discount = discountOf(disc, base)
  const agreement = agr ? Math.round((base - discount) * agr.contributionPct) / 100 : 0
  const total = Math.max(0, Math.round((base - discount - agreement) * 100) / 100)
  const installments = plan?.installments || 1
  const locked = editing && (initial.account?.payments?.some((p) => !p.voided) || initial.invoice?.number || initial.invoice?.agreementNumber)
  const set = (k) => (e) => {
    const v = e.target.value
    setF((x) => {
      const n = { ...x, [k]: v }
      if (k === 'programId') {
        n.groupId = ''; n.periodId = ''
        // Plan sugerido: el primero que aplica al tipo del programa.
        const p = programs.find((y) => y.id === Number(v))
        const first = p && (plans.find((y) => y.active && y.programKind === p.kind) || plans.find((y) => y.active && y.programKind === 'todos'))
        n.paymentPlanId = first ? String(first.id) : ''
      }
      // Al elegir el grupo de una carrera, se sugiere el semestre que el grupo está cursando.
      if (k === 'groupId' && byPeriod && !x.periodId) {
        const g = groups.find((y) => y.id === Number(v))
        const per = g && program.periods.find((p) => p.number === g.currentPeriod)
        if (per) n.periodId = per.id
      }
      return n
    })
  }
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.programId) return setError('Selecciona el programa.')
    if (byPeriod && !f.periodId) return setError(`Selecciona el ${program.periodLabel.toLowerCase()} que se matricula.`)
    setSaving(true)
    try {
      const body = { ...f, studentId: student.id }
      const { data } = editing ? await api.put(`/academico/matriculas/${initial.id}`, body) : await api.post('/academico/matriculas', body)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  const row = (label, value) => <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}><span>{label}</span><span style={{ whiteSpace: 'nowrap' }}>{value}</span></div>
  return (
    <Modal title={editing ? 'Editar matrícula' : `Matricular a ${student.fullName}`} onClose={onClose} size="lg"
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="enr-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} {editing ? 'Guardar' : 'Matricular'}</button></>}>
      <form id="enr-form" onSubmit={submit} noValidate>
        <div className="grid grid-2-1" style={{ alignItems: 'start' }}>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
            <div className="field span-all"><label>Programa <span className="req">*</span></label>
              <select value={f.programId} onChange={set('programId')} disabled={editing}>
                <option value="">Selecciona…</option>
                {programs.map((p) => <option key={p.id} value={p.id}>{p.code} · {p.name} ({p.kindLabel})</option>)}
              </select>
              {program && <span className="hint">{byPeriod ? `Se cobra por ${program.periodLabel.toLowerCase()}: cada matrícula corresponde a un periodo.` : 'Se cobra el valor total del programa.'}</span>}</div>
            <div className="field"><label>Grupo</label>
              <select value={f.groupId} onChange={set('groupId')} disabled={!program}>
                <option value="">Sin grupo asignado</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.code} · {g.shiftLabel}{g.capacity ? ` (${g.enrolled}/${g.capacity})` : ''}</option>)}
              </select></div>
            {byPeriod
              ? <div className="field"><label>{program.periodLabel} <span className="req">*</span></label>
                  <select value={f.periodId} onChange={set('periodId')} disabled={locked}><option value="">Selecciona…</option>{program.periods.map((x) => <option key={x.id} value={x.id}>{x.name} · {formatMoney(x.price)}</option>)}</select></div>
              : <div className="field"><label>Periodo académico</label><input value={f.academicPeriod} onChange={set('academicPeriod')} placeholder="2026-2" /></div>}
            {byPeriod && <div className="field"><label>Periodo académico</label><input value={f.academicPeriod} onChange={set('academicPeriod')} placeholder="2026-2" /></div>}
            <div className="field"><label>Fecha de matrícula</label><input type="date" value={f.enrolledAt} onChange={set('enrolledAt')} /><span className="hint">Vacía: hoy.</span></div>
            <div className="field"><label>Estado</label><select value={f.status} onChange={set('status')}>{Object.entries(ENROLL_STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              {f.status === 'preinscrito' && <span className="hint">Se factura cuando pase a matriculado.</span>}</div>
            <div className="field"><label>Descuento</label>
              <select value={f.discountId} onChange={set('discountId')} disabled={locked}><option value="">Sin descuento</option>{discounts.map((d) => <option key={d.id} value={d.id}>{d.name} · {discountLabel(d)}</option>)}</select></div>
            <div className="field"><label>Convenio</label>
              <select value={f.agreementId} onChange={set('agreementId')} disabled={locked}><option value="">Sin convenio</option>{agreements.map((a) => <option key={a.id} value={a.id}>{a.name}{a.contributionPct ? ` · aporta ${a.contributionPct} %` : ''}</option>)}</select></div>
            <div className="field"><label>Plan de pagos</label>
              <select value={f.paymentPlanId} onChange={set('paymentPlanId')} disabled={!program || locked}>
                <option value="">De contado</option>
                {programPlans.map((p) => <option key={p.id} value={p.id}>{p.name} · {p.installments} cuota{p.installments === 1 ? '' : 's'}</option>)}
              </select>
              {program && !programPlans.length && <span className="hint">No hay planes para este tipo de programa (Configuración académica).</span>}</div>
            <div className="field"><label>Primera cuota vence</label><input type="date" value={f.firstDueDate} onChange={set('firstDueDate')} disabled={locked} /><span className="hint">Vacía: la fecha de matrícula.</span></div>
            <div className="field span-all"><label>Observaciones</label><input value={f.notes} onChange={set('notes')} /></div>
          </div>
          <div className="card" style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14 }}>
            <b>Liquidación</b>
            {row(byPeriod ? 'Valor del periodo' : 'Valor del programa', formatMoney(base))}
            {disc && row(`Descuento · ${disc.name}`, `− ${formatMoney(discount)}`)}
            {agr && row(`Convenio · ${agr.name} (${agr.contributionPct} %)`, `− ${formatMoney(agreement)}`)}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, borderTop: '1px solid var(--line)', paddingTop: 8 }}><span>A cargo del estudiante</span><span>{formatMoney(total)}</span></div>
            <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>{installments > 1 ? `${installments} cuotas de ${formatMoney(Math.round(total / installments))}${plan?.intervalMonths > 1 ? ` cada ${plan.intervalMonths} meses` : ' mensuales'}` : 'Pago de contado'}</div>
            {agr && agreement > 0 && <div style={{ color: 'var(--muted)', fontSize: 12.5 }}>El aporte del convenio se factura aparte a {agr.name}.</div>}
            {program?.kind === 'carrera_tecnica' && <div className="alert info" style={{ margin: 0, fontSize: 12.5 }}><span>Carrera técnica: el estudiante debe firmar el contrato de matrícula y aceptar el reglamento.</span></div>}
            {locked && <div style={{ color: 'var(--warn)', fontSize: 12 }}>Tiene factura o pagos: el valor y las cuotas no se pueden cambiar.</div>}
          </div>
        </div>
        {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

const AccessForm = ({ student, onClose, onSaved }) => {
  const [username, setUsername] = useState(student.portal?.username || student.docNumber)
  const [password, setPassword] = useState('')
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!student.portal && password.length < 6) return setError('La contraseña debe tener al menos 6 caracteres.')
    setSaving(true)
    try { const { data } = await api.post(`/academico/estudiantes/${student.id}/acceso`, { username, password: password || undefined }); onSaved(data) } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title="Acceso al portal del estudiante" size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="acc-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <MdKey />} {student.portal ? 'Guardar' : 'Crear acceso'}</button></>}>
      <form id="acc-form" onSubmit={submit} noValidate className="stack" style={{ gap: 12 }}>
        <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-2)' }}>El estudiante entra con este usuario y solo ve su programa, su pensum y sus matrículas.</p>
        <div className="field"><label>Usuario</label><input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="off" /></div>
        <div className="field"><label>{student.portal ? 'Nueva contraseña (opcional)' : 'Contraseña'}</label><input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" /></div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

const Row = ({ label, children }) => <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13.5, padding: '6px 0', borderBottom: '1px solid var(--line-2)' }}><span style={{ color: 'var(--muted)' }}>{label}</span><span style={{ textAlign: 'right' }}>{children || '—'}</span></div>

const StudentDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [toast, toastNode] = useToast()
  const [s, setS] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(null)
  const load = useCallback(() => api.get(`/academico/estudiantes/${id}`).then(({ data }) => setS(data)).catch((e) => setError(errorMessage(e))), [id])
  useEffect(() => { load() }, [load])
  const revoke = async () => {
    try { await api.delete(`/academico/estudiantes/${id}/acceso`); toast('Acceso al portal desactivado'); load() } catch (e) { toast(errorMessage(e), 'bad') }
  }
  const removeEnrollment = async () => {
    try { await api.delete(`/academico/matriculas/${modal.deleteEnr.id}`); toast('Matrícula eliminada'); setModal(null); load() } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) }
  }
  const removeStudent = async () => {
    try { await api.delete(`/academico/estudiantes/${id}`); navigate('/educacion/estudiantes') } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) }
  }

  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!s) return <div className="splash"><Spinner /></div>

  return (
    <>
      <div style={{ marginBottom: 14 }}><Link to="/educacion/estudiantes" className="btn btn-ghost btn-sm"><MdArrowBack /> Estudiantes</Link></div>
      <PageHead title={s.fullName} subtitle={`${DOC_TYPES[s.docType] || s.docType} ${s.docNumber}${s.siteName ? ` · ${s.siteName}` : ''}`}>
        <button type="button" className="btn btn-outline" onClick={() => setModal({ edit: true })}><MdEdit /> Editar datos</button>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ enroll: {} })}><MdAdd /> Nueva matrícula</button>
      </PageHead>
      <div className="grid grid-2-1">
        <Card title="Matrículas" flush icon={<MdHowToReg style={{ color: 'var(--brand)' }} />}>
          {s.enrollments.length === 0 ? <Empty icon={<MdHowToReg />}>Aún no tiene matrículas. Usa “Nueva matrícula”.</Empty> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Programa</th><th>Grupo · periodo</th><th>Fecha</th><th className="num">Valor</th><th className="num">Saldo</th><th>Estado</th><th className="actions" /></tr></thead>
                <tbody>{s.enrollments.map((e) => (
                  <tr key={e.id}>
                    <td style={{ whiteSpace: 'normal' }}><b>{e.program?.name}</b>{(e.discountValue > 0 || e.agreementValue > 0) && <div style={{ fontSize: 12, color: 'var(--muted)' }}>{e.discountValue > 0 ? `Desc. ${e.discountReason || ''}` : ''}{e.discountValue > 0 && e.agreementValue > 0 ? ' · ' : ''}{e.agreementValue > 0 ? `Convenio ${e.agreementName}` : ''}</div>}</td>
                    <td>{e.group?.code || '—'}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{[e.period?.name, e.academicPeriod].filter(Boolean).join(' · ') || '—'}</div></td>
                    <td>{formatDate(e.enrolledAt)}</td>
                    <td className="num"><b>{formatMoney(e.totalValue)}</b>{e.totalValue !== e.baseValue && <div style={{ fontSize: 12, color: 'var(--muted)', textDecoration: 'line-through' }}>{formatMoney(e.baseValue)}</div>}</td>
                    <td className="num">{formatMoney(e.account.balance)}<div style={{ marginTop: 2 }}><AccountBadge state={e.account.state} /></div></td>
                    <td><StatusBadge status={e.status} />{e.contract.required && !e.contract.signedAt && <div style={{ marginTop: 4 }}><ContractBadge contract={e.contract} /></div>}</td>
                    <td className="actions">
                      <button type="button" className="btn btn-ghost btn-icon" aria-label="Cuenta, pagos y contrato" title="Cuenta, pagos y contrato" onClick={() => setModal({ account: e })}><MdAccountBalanceWallet /></button>
                      <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar matrícula" onClick={() => setModal({ enroll: e })}><MdEdit /></button>
                      {admin && <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar matrícula" style={{ color: 'var(--bad)' }} onClick={() => setModal({ deleteEnr: e })}><MdDelete /></button>}
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </Card>
        <div className="stack">
          <Card title="Datos del estudiante" icon={<MdPerson style={{ color: 'var(--brand)' }} />} actions={<StatusBadge status={s.status} />}>
            <Row label="Nacimiento">{formatDate(s.birthDate)}</Row>
            <Row label="Celular">{s.phone}</Row>
            <Row label="Correo">{s.email}</Row>
            <Row label="Dirección">{[s.address, s.municipality].filter(Boolean).join(', ')}</Row>
            <Row label="EPS">{s.eps}</Row>
            <Row label="Nivel educativo">{s.educationLevel}</Row>
            {(s.guardianName || s.guardianPhone) && <Row label="Acudiente">{[s.guardianName, s.guardianPhone].filter(Boolean).join(' · ')}</Row>}
            {s.notes && <Row label="Observaciones">{s.notes}</Row>}
          </Card>
          <Card title="Portal del estudiante" icon={<MdKey style={{ color: 'var(--brand)' }} />}>
            {s.portal?.active ? (
              <div className="stack" style={{ gap: 10 }}>
                <div style={{ fontSize: 13.5 }}>Usuario: <b>{s.portal.username}</b> <span className="badge ok">Activo</span></div>
                {admin && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}><button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ access: true })}><MdKey /> Cambiar contraseña</button><button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} onClick={revoke}><MdBlock /> Desactivar</button></div>}
              </div>
            ) : (
              <div className="stack" style={{ gap: 10 }}>
                <p style={{ margin: 0, fontSize: 13.5, color: 'var(--ink-2)' }}>{s.portal ? 'El acceso está desactivado.' : 'El estudiante aún no tiene acceso al portal.'}</p>
                {admin ? <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ access: true })}><MdKey /> {s.portal ? 'Reactivar acceso' : 'Crear acceso'}</button> : <span className="hint">El administrador crea el acceso.</span>}
              </div>
            )}
          </Card>
          {admin && <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} onClick={() => setModal({ deleteStudent: true })}><MdDelete /> Eliminar estudiante</button></div>}
        </div>
      </div>

      {modal?.edit && <StudentForm initial={s} onClose={() => setModal(null)} onSaved={() => { setModal(null); load(); toast('Datos actualizados') }} />}
      {modal?.enroll && <EnrollmentForm student={s} initial={modal.enroll.id ? modal.enroll : null} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); load(); toast(e ? 'Matrícula actualizada' : 'Estudiante matriculado') }} />}
      {modal?.account && <AccountModal enrollment={modal.account} onClose={() => { setModal(null); load() }} />}
      {modal?.access && <AccessForm student={s} onClose={() => setModal(null)} onSaved={(d) => { setModal(null); setS({ ...s, ...d }); toast('Acceso al portal guardado') }} />}
      {modal?.deleteEnr && (
        <Modal title="Eliminar matrícula" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={removeEnrollment}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar la matrícula en <b>{modal.deleteEnr.program?.name}</b>? Si el estudiante se retiró, es mejor cambiar el estado a “Retirado”.</p>
        </Modal>
      )}
      {modal?.deleteStudent && (
        <Modal title="Eliminar estudiante" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={removeStudent}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar a <b>{s.fullName}</b>? Solo es posible si no tiene matrículas.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default StudentDetail
