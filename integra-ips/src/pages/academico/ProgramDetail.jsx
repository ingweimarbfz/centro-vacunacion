import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MdArrowBack, MdEdit, MdSave, MdAdd, MdDelete, MdErrorOutline, MdMenuBook, MdClose, MdUndo } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Modal, Spinner, useToast } from '../../components/ui'
import { formatMoney, formatDate } from '../../utils/format'
import { MODALITIES, SUBJECT_KINDS, StatusBadge, hoursLabel } from './common'
import { ProgramForm } from './ProgramsPage'

// Estilo de los campos dentro de la tabla del pensum (en edición).
const CELL = { width: '100%', padding: '6px 8px', border: '1px solid var(--line)', borderRadius: 6, font: 'inherit', fontSize: 13.5, boxSizing: 'border-box', background: 'var(--surface)' }

const newSubject = () => ({ key: Math.random().toString(36).slice(2), code: '', name: '', kind: 'teorico_practico', hours: '' })
const toDraft = (p) => p.periods.map((x) => ({ key: `p${x.id}`, name: x.name, price: x.price || '', subjects: x.subjects.map((s) => ({ key: `s${s.id}`, code: s.code || '', name: s.name, kind: s.kind, hours: s.hours })) }))

// Programa y su pensum: periodos (semestres; un curso tiene uno) con asignaturas o módulos y sus horas.
// En carreras técnicas cada periodo tiene su valor (se cobra por semestre); en cursos el valor es el total del programa.
const ProgramDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [toast, toastNode] = useToast()
  const [p, setP] = useState(null)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState(null)
  const [saving, setSaving] = useState(false)
  const [modal, setModal] = useState(null)
  const load = useCallback(() => api.get(`/academico/programas/${id}`).then(({ data }) => setP(data)).catch((e) => setError(errorMessage(e))), [id])
  useEffect(() => { load() }, [load])

  const byPeriod = p?.billingMode === 'periodo'
  const editing = Boolean(draft)
  const view = editing ? draft : p ? toDraft(p) : []
  const totals = useMemo(() => {
    const hours = view.reduce((a, x) => a + x.subjects.reduce((b, s) => b + Number(s.hours || 0), 0), 0)
    const price = byPeriod ? view.reduce((a, x) => a + Number(x.price || 0), 0) : p?.price || 0
    return { hours, price }
  }, [view, byPeriod, p])

  const upd = (pi, patch) => setDraft((d) => d.map((x, i) => (i === pi ? { ...x, ...patch } : x)))
  const updSub = (pi, si, patch) => setDraft((d) => d.map((x, i) => (i === pi ? { ...x, subjects: x.subjects.map((s, j) => (j === si ? { ...s, ...patch } : s)) } : x)))
  const addPeriod = () => setDraft((d) => [...d, { key: Math.random().toString(36).slice(2), name: `${p.periodLabel} ${d.length + 1}`, price: '', subjects: [newSubject()] }])
  const removePeriod = (pi) => setDraft((d) => d.filter((_, i) => i !== pi))
  const addSub = (pi) => upd(pi, { subjects: [...draft[pi].subjects, newSubject()] })
  const removeSub = (pi, si) => upd(pi, { subjects: draft[pi].subjects.filter((_, j) => j !== si) })

  const save = async () => {
    setSaving(true)
    try {
      const periods = draft.map((x) => ({ name: x.name, price: byPeriod ? Number(x.price || 0) : 0, subjects: x.subjects.filter((s) => s.name.trim()).map((s) => ({ code: s.code, name: s.name, kind: s.kind, hours: Number(s.hours || 0) })) }))
      const { data } = await api.put(`/academico/programas/${id}/pensum`, { periods })
      setP(data); setDraft(null); toast('Pensum guardado')
    } catch (e) { toast(errorMessage(e), 'bad') } finally { setSaving(false) }
  }
  const remove = async () => {
    try { await api.delete(`/academico/programas/${id}`); navigate('/educacion/programas') } catch (e) { toast(errorMessage(e), 'bad'); setModal(null) }
  }

  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!p) return <div className="splash"><Spinner /></div>

  return (
    <>
      <div style={{ marginBottom: 14 }}><Link to="/educacion/programas" className="btn btn-ghost btn-sm"><MdArrowBack /> Programas</Link></div>
      <PageHead title={p.name} subtitle={`${p.code} · ${p.kindLabel} · ${MODALITIES[p.modality]} · ${p.certLabel}`}>
        {admin && !editing && <button type="button" className="btn btn-outline" onClick={() => setModal('edit')}><MdEdit /> Editar datos</button>}
        {admin && !editing && <button type="button" className="btn btn-primary" onClick={() => setDraft(toDraft(p))}><MdMenuBook /> Editar pensum</button>}
        {editing && <button type="button" className="btn btn-outline" onClick={() => setDraft(null)} disabled={saving}><MdUndo /> Descartar</button>}
        {editing && <button type="button" className="btn btn-primary" onClick={save} disabled={saving}>{saving ? <Spinner /> : <MdSave />} Guardar pensum</button>}
      </PageHead>

      <div className="grid grid-kpi" style={{ marginBottom: 18 }}>
        <div className="card kpi"><span className="kpi-label">Intensidad horaria</span><div className="kpi-value">{hoursLabel(totals.hours)}</div><div className="kpi-foot">{view.length} {byPeriod ? p.periodLabel.toLowerCase() + (view.length === 1 ? '' : 's') : `periodo${view.length === 1 ? '' : 's'}`}</div></div>
        <div className="card kpi"><span className="kpi-label">{byPeriod ? 'Valor total (suma de periodos)' : 'Valor total del programa'}</span><div className="kpi-value">{formatMoney(totals.price)}</div><div className="kpi-foot">{byPeriod ? `Se cobra por ${p.periodLabel.toLowerCase()}` : 'Se cobra en la matrícula (contado o cuotas)'}</div></div>
        <div className="card kpi"><span className="kpi-label">Registro del programa</span><div className="kpi-value" style={{ fontSize: 18 }}>{p.registrationNumber || 'Sin registrar'}</div><div className="kpi-foot">{p.registrationExpires ? <>Vence {formatDate(p.registrationExpires)} <StatusBadge status={p.registrationState} /></> : 'Registra el número y la fecha de vencimiento'}</div></div>
        <div className="card kpi"><span className="kpi-label">Grupos activos</span><div className="kpi-value">{p.groupsActive}</div><div className="kpi-foot"><Link to={`/educacion/grupos?programa=${p.id}`}>Ver grupos</Link></div></div>
      </div>

      {p.description && <Card><p style={{ margin: 0, whiteSpace: 'pre-line' }}>{p.description}</p></Card>}

      <div className="stack" style={{ marginTop: 18 }}>
        {view.map((x, pi) => {
          const hours = x.subjects.reduce((a, s) => a + Number(s.hours || 0), 0)
          return (
            <Card key={x.key} flush
              title={editing ? <input aria-label="Nombre del periodo" value={x.name} onChange={(e) => upd(pi, { name: e.target.value })} className="input" style={{ width: 220 }} /> : x.name}
              subtitle={`${x.subjects.length} asignatura${x.subjects.length === 1 ? '' : 's'} · ${hoursLabel(hours)}${byPeriod && !editing ? ` · ${formatMoney(x.price)}` : ''}`}
              actions={editing && (
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                  {byPeriod && <label style={{ display: 'flex', gap: 6, alignItems: 'center', fontSize: 13 }}>Valor <input type="number" min="0" step="1000" value={x.price} onChange={(e) => upd(pi, { price: e.target.value })} className="input" style={{ width: 140 }} /></label>}
                  {view.length > 1 && <button type="button" className="btn btn-ghost btn-icon" aria-label={`Quitar ${x.name}`} style={{ color: 'var(--bad)' }} onClick={() => removePeriod(pi)}><MdDelete /></button>}
                </div>
              )}>
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th style={{ width: 110 }}>Código</th><th>Asignatura / módulo</th><th style={{ width: 190 }}>Tipo</th><th className="num" style={{ width: 110 }}>Horas</th>{editing && <th className="actions" />}</tr></thead>
                  <tbody>
                    {x.subjects.length === 0 && <tr><td colSpan={editing ? 5 : 4} style={{ color: 'var(--muted)' }}>Sin asignaturas.</td></tr>}
                    {x.subjects.map((s, si) => editing ? (
                      <tr key={s.key}>
                        <td><input aria-label="Código" value={s.code} onChange={(e) => updSub(pi, si, { code: e.target.value })} style={CELL} /></td>
                        <td><input aria-label="Nombre de la asignatura" value={s.name} onChange={(e) => updSub(pi, si, { name: e.target.value })} placeholder="Ej. Soporte vital básico" style={CELL} /></td>
                        <td><select aria-label="Tipo" value={s.kind} onChange={(e) => updSub(pi, si, { kind: e.target.value })} style={CELL}>{Object.entries(SUBJECT_KINDS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></td>
                        <td className="num"><input aria-label="Horas" type="number" min="0" value={s.hours} onChange={(e) => updSub(pi, si, { hours: e.target.value })} style={{ ...CELL, width: 90, textAlign: 'right' }} /></td>
                        <td className="actions"><button type="button" className="btn btn-ghost btn-icon" aria-label="Quitar asignatura" onClick={() => removeSub(pi, si)}><MdClose /></button></td>
                      </tr>
                    ) : (
                      <tr key={s.key}><td>{s.code || '—'}</td><td style={{ whiteSpace: 'normal' }}>{s.name}</td><td>{SUBJECT_KINDS[s.kind]}</td><td className="num">{hoursLabel(s.hours)}</td></tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {editing && <div style={{ padding: '10px 16px' }}><button type="button" className="btn btn-ghost btn-sm" onClick={() => addSub(pi)}><MdAdd /> Agregar asignatura</button></div>}
            </Card>
          )
        })}
        {editing && <button type="button" className="btn btn-outline" onClick={addPeriod}><MdAdd /> Agregar {byPeriod ? p.periodLabel.toLowerCase() : 'periodo'}</button>}
        {admin && !editing && (
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}><button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} onClick={() => setModal('delete')}><MdDelete /> Eliminar programa</button></div>
        )}
      </div>

      {modal === 'edit' && <ProgramForm initial={p} onClose={() => setModal(null)} onSaved={(d) => { setModal(null); setP(d); toast('Programa actualizado') }} />}
      {modal === 'delete' && (
        <Modal title="Eliminar programa" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={remove}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar <b>{p.name}</b> y su pensum? Si ya tiene grupos o matrículas no se podrá; desactívalo en su lugar.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default ProgramDetail
