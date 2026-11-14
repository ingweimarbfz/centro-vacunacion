import React, { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { MdAdd, MdErrorOutline, MdMenuBook, MdArrowForward } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { formatMoney, formatDate } from '../../utils/format'
import { KINDS, CERT_TYPES, MODALITIES, BILLING, StatusBadge, hoursLabel } from './common'

const EMPTY = { code: '', name: '', kind: 'curso', certType: 'asistencia', modality: 'presencial', billingMode: 'total', periodLabel: 'Semestre', price: '', registrationNumber: '', registrationDate: '', registrationExpires: '', occupation: '', description: '', active: true }

// Formulario del programa. La forma de cobro define cómo se liquida la matrícula:
// valor total (cursos y diplomados) o por periodo (carreras técnicas por semestre).
export const ProgramForm = ({ initial, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const [f, setF] = useState(() => (editing ? { ...EMPTY, ...Object.fromEntries(Object.entries(initial).filter(([k]) => k in EMPTY).map(([k, v]) => [k, v ?? ''])) } : EMPTY))
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => {
    const v = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setF((x) => {
      const n = { ...x, [k]: v }
      // Valores sugeridos al cambiar el tipo: la carrera técnica se cobra por semestre y certifica técnico laboral.
      if (k === 'kind' && !editing) {
        if (v === 'carrera_tecnica') Object.assign(n, { billingMode: 'periodo', certType: 'tecnico_laboral' })
        else Object.assign(n, { billingMode: 'total', certType: x.certType === 'tecnico_laboral' ? 'asistencia' : x.certType })
      }
      return n
    })
  }
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.code.trim() || !f.name.trim()) return setError('El código y el nombre son requeridos.')
    setSaving(true)
    try {
      const body = { ...f, price: f.billingMode === 'total' ? Number(f.price || 0) : 0 }
      const { data } = editing ? await api.put(`/academico/programas/${initial.id}`, body) : await api.post('/academico/programas', body)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? `Editar ${initial.code}` : 'Nuevo programa'} onClose={onClose} size="lg"
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="prog-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : null} Guardar</button></>}>
      <form id="prog-form" onSubmit={submit} noValidate>
        <div className="form-grid" style={{ gridTemplateColumns: 'repeat(3, minmax(0, 1fr))' }}>
          <div className="field"><label>Código <span className="req">*</span></label><input value={f.code} onChange={set('code')} placeholder="Ej. APH" maxLength={20} autoFocus /></div>
          <div className="field" style={{ gridColumn: 'span 2' }}><label>Nombre <span className="req">*</span></label><input value={f.name} onChange={set('name')} placeholder="Ej. Técnico laboral en Atención Prehospitalaria" /></div>
          <div className="field"><label>Tipo de programa</label><select value={f.kind} onChange={set('kind')}>{Object.entries(KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Modalidad</label><select value={f.modality} onChange={set('modality')}>{Object.entries(MODALITIES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Certificado que otorga</label><select value={f.certType} onChange={set('certType')}>{Object.entries(CERT_TYPES).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
          <div className="field"><label>Forma de cobro</label><select value={f.billingMode} onChange={set('billingMode')}>{Object.entries(BILLING).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
            <span className="hint">{f.billingMode === 'total' ? 'Se cobra el valor total del programa en la matrícula (de contado o en cuotas).' : 'Cada periodo tiene su propio valor; se define en el pensum.'}</span></div>
          {f.billingMode === 'total'
            ? <div className="field"><label>Valor total del programa</label><input type="number" min="0" step="1000" value={f.price} onChange={set('price')} placeholder="0" /></div>
            : <div className="field"><label>Nombre del periodo</label><input value={f.periodLabel} onChange={set('periodLabel')} placeholder="Semestre" maxLength={30} /></div>}
          <div className="field"><label>Ocupación / perfil de salida</label><input value={f.occupation} onChange={set('occupation')} placeholder="Ej. Auxiliar en enfermería" /></div>
          <div className="field"><label>N.º de registro del programa</label><input value={f.registrationNumber} onChange={set('registrationNumber')} placeholder="Resolución de la Secretaría de Educación" /></div>
          <div className="field"><label>Fecha del registro</label><input type="date" value={f.registrationDate} onChange={set('registrationDate')} /></div>
          <div className="field"><label>Vence el registro</label><input type="date" value={f.registrationExpires} onChange={set('registrationExpires')} /><span className="hint">El dashboard avisa 6 meses antes.</span></div>
          <div className="field span-all"><label>Descripción</label><textarea rows={3} value={f.description} onChange={set('description')} placeholder="Objetivo del programa, requisitos de ingreso, perfil del egresado…" /></div>
          {editing && <div className="field span-all"><label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Programa activo (admite matrículas)' : 'Programa inactivo'}</label></div>}
        </div>
        {error && <div className="alert bad" style={{ marginTop: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

const ProgramsPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const navigate = useNavigate()
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [modal, setModal] = useState(false)
  const load = useCallback(() => api.get('/academico/programas').then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))), [])
  useEffect(() => { load() }, [load])

  return (
    <>
      <PageHead title="Programas y pensum" subtitle="Cursos, diplomados y carreras técnicas: horas, periodos, asignaturas, forma de cobro y registro ante la Secretaría de Educación">
        {admin && <button type="button" className="btn btn-primary" onClick={() => setModal(true)}><MdAdd /> Nuevo programa</button>}
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? (!error && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>) : rows.length === 0 ? (
        <Card><Empty icon={<MdMenuBook />}>Aún no hay programas. {admin ? 'Crea el primero con “Nuevo programa”.' : 'El administrador debe crearlos.'}</Empty></Card>
      ) : (
        <Card flush>
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Programa</th><th>Tipo</th><th className="num">Horas</th><th>Pensum</th><th>Cobro</th><th className="num">Valor</th><th>Registro</th><th>Estado</th><th className="actions" /></tr></thead>
              <tbody>{rows.map((p) => (
                <tr key={p.id} style={p.active ? undefined : { opacity: 0.6 }}>
                  <td style={{ whiteSpace: 'normal' }}><Link to={`/educacion/programas/${p.id}`} style={{ color: 'var(--ink)' }}><b>{p.name}</b></Link><div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.code} · {MODALITIES[p.modality]} · {p.certLabel}</div></td>
                  <td>{p.kindLabel}</td>
                  <td className="num">{hoursLabel(p.totalHours)}</td>
                  <td>{p.periodsCount} {p.billingMode === 'periodo' ? `${p.periodLabel.toLowerCase()}${p.periodsCount === 1 ? '' : 's'}` : `periodo${p.periodsCount === 1 ? '' : 's'}`} · {p.subjectsCount} asignaturas</td>
                  <td>{p.billingMode === 'total' ? 'Total' : `Por ${p.periodLabel.toLowerCase()}`}</td>
                  <td className="num">{formatMoney(p.totalPrice)}</td>
                  <td>{p.registrationNumber ? <><div style={{ fontSize: 12.5 }}>{p.registrationNumber}</div>{p.registrationExpires && <div style={{ fontSize: 12, color: 'var(--muted)' }}>Vence {formatDate(p.registrationExpires)}</div>}</> : '—'}</td>
                  <td>{p.active ? (p.registrationState && p.registrationState !== 'vigente' ? <StatusBadge status={p.registrationState} /> : <span className="badge ok"><span className="dot" /> Activo</span>) : <span className="badge"><span className="dot" /> Inactivo</span>}</td>
                  <td className="actions"><Link className="btn btn-ghost btn-icon" aria-label="Abrir programa" title="Abrir programa y pensum" to={`/educacion/programas/${p.id}`}><MdArrowForward /></Link></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </Card>
      )}
      {modal && <ProgramForm onClose={() => setModal(false)} onSaved={(d) => { setModal(false); toast(`Programa ${d.code} creado`); navigate(`/educacion/programas/${d.id}`) }} />}
      {toastNode}
    </>
  )
}

export default ProgramsPage
