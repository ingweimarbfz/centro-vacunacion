import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MdErrorOutline, MdAccountBalanceWallet, MdAttachMoney, MdWarning, MdTrendingUp, MdPayments } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import { formatDate, formatMoney } from '../../utils/format'
import { AccountBadge } from './common'
import { AccountModal } from './EnrollmentAccount'

const Kpi = ({ icon, tone = '', label, value, foot }) => (
  <div className="card kpi"><div className="kpi-top"><span className="kpi-label">{label}</span><span className={`kpi-icon ${tone}`}>{icon}</span></div><div className="kpi-value" style={{ fontSize: 24 }}>{value}</div>{foot && <div className="kpi-foot">{foot}</div>}</div>
)

// Cartera: matrículas con saldo, ordenadas por días de mora; desde aquí se registran pagos.
const CarteraPage = () => {
  const [d, setD] = useState(null)
  const [programs, setPrograms] = useState([])
  const [estado, setEstado] = useState('')
  const [programa, setPrograma] = useState('')
  const [error, setError] = useState('')
  const [open, setOpen] = useState(null)
  const load = useCallback(() => api.get('/academico/cartera', { params: { estado: estado || undefined, programa: programa || undefined } }).then(({ data }) => setD(data)).catch((e) => setError(errorMessage(e))), [estado, programa])
  useEffect(() => { load() }, [load])
  useEffect(() => { api.get('/academico/programas').then(({ data }) => setPrograms(data)).catch(() => {}) }, [])
  const openAccount = async (id) => { try { const { data } = await api.get(`/academico/matriculas/${id}`); setOpen(data) } catch (e) { setError(errorMessage(e)) } }

  return (
    <>
      <PageHead title="Cartera" subtitle="Cuentas por cobrar de las matrículas: saldos, cuotas vencidas y recaudo" />
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      {!d ? (!error && <div className="splash" style={{ minHeight: 200 }}><Spinner /></div>) : (
        <div className="stack">
          <div className="grid grid-kpi">
            <Kpi icon={<MdAccountBalanceWallet />} label="Saldo por cobrar" value={formatMoney(d.totals.balance)} foot={`${d.totals.debtors} matrículas con saldo`} />
            <Kpi icon={<MdWarning />} tone="warn" label="Vencido" value={formatMoney(d.totals.overdue)} foot={`${d.totals.inArrears} en mora`} />
            <Kpi icon={<MdPayments />} tone="ok" label="Recaudado este mes" value={formatMoney(d.totals.collectedMonth)} foot={`${d.totals.paymentsMonth} pagos`} />
            <Kpi icon={<MdTrendingUp />} tone="navy" label="Recaudo total" value={formatMoney(d.totals.collected)} foot={`de ${formatMoney(d.totals.billed)} facturado`} />
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select className="input" style={{ width: 'auto', minWidth: 200 }} aria-label="Estado de la cuenta" value={estado} onChange={(e) => setEstado(e.target.value)}>
              <option value="">Con saldo (todas)</option><option value="en_mora">En mora</option><option value="al_dia">Al día</option>
            </select>
            <select className="input" style={{ width: 'auto', minWidth: 200 }} aria-label="Programa" value={programa} onChange={(e) => setPrograma(e.target.value)}>
              <option value="">Todos los programas</option>{programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <Card flush>
            {d.rows.length === 0 ? <Empty icon={<MdAttachMoney />}>No hay saldos pendientes con estos filtros.</Empty> : (
              <div className="table-wrap">
                <table className="table">
                  <thead><tr><th>Estudiante</th><th>Programa · periodo</th><th className="num">Valor</th><th className="num">Pagado</th><th className="num">Saldo</th><th className="num">Vencido</th><th>Próxima cuota</th><th>Estado</th><th className="actions" /></tr></thead>
                  <tbody>{d.rows.map((e) => (
                    <tr key={e.id}>
                      <td><Link to={`/educacion/estudiantes/${e.studentId}`} style={{ color: 'var(--ink)' }}><b>{e.student?.fullName}</b></Link><div style={{ fontSize: 12, color: 'var(--muted)' }}>{e.student?.docType} {e.student?.docNumber}</div></td>
                      <td style={{ whiteSpace: 'normal' }}>{e.program?.name}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{[e.group?.code, e.period?.name].filter(Boolean).join(' · ')}</div></td>
                      <td className="num">{formatMoney(e.account.total)}</td>
                      <td className="num">{formatMoney(e.account.paid)}</td>
                      <td className="num"><b>{formatMoney(e.account.balance)}</b></td>
                      <td className="num">{e.account.overdue ? <span style={{ color: 'var(--bad)' }}>{formatMoney(e.account.overdue)}</span> : '—'}</td>
                      <td>{e.account.nextDue ? <>{formatDate(e.account.nextDue.dueDate)}<div style={{ fontSize: 12, color: 'var(--muted)' }}>{formatMoney(e.account.nextDue.balance)}</div></> : '—'}</td>
                      <td><AccountBadge state={e.account.state} label={e.account.state === 'en_mora' ? `En mora · ${e.account.maxDaysLate} d` : undefined} /></td>
                      <td className="actions"><button type="button" className="btn btn-ghost btn-icon" aria-label="Ver cuenta y registrar pago" title="Ver cuenta y registrar pago" onClick={() => openAccount(e.id)}><MdAccountBalanceWallet /></button></td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      )}
      {open && <AccountModal enrollment={open} onClose={() => { setOpen(null); load() }} />}
    </>
  )
}

export default CarteraPage
