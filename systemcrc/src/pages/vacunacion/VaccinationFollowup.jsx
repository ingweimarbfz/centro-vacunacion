import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdEventRepeat, MdPhone, MdVaccines, MdErrorOutline, MdNotificationsActive } from 'react-icons/md'
import ReminderPanel, { ReminderPreview } from './ReminderPanel'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Empty, Spinner } from '../../components/ui'
import './vacunacion.css'

const fmt = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')

// Vacunación → Seguimiento: búsqueda de personas con la siguiente dosis atrasada o próxima.
const VaccinationFollowup = () => {
  const navigate = useNavigate()
  const [rows, setRows] = useState(null); const [err, setErr] = useState('')
  const [filter, setFilter] = useState('atrasadas'); const [preview, setPreview] = useState(null)
  useEffect(() => { api.get('/vacunacion/seguimiento').then(({ data }) => setRows(data)).catch((e) => setErr(errorMessage(e))) }, [])
  const list = (rows || []).filter((r) => (filter === 'atrasadas' ? r.daysLate > 0 : filter === 'proximas' ? r.daysLate <= 0 && r.daysLate >= -30 : true))
  const count = (k) => (rows || []).filter((r) => (k === 'atrasadas' ? r.daysLate > 0 : r.daysLate <= 0 && r.daysLate >= -30)).length
  return (
    <>
      <PageHead title="Seguimiento de dosis" subtitle="Personas con esquemas incompletos: dosis atrasadas para contactar y próximas para recordar" />
      {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
      <div className="module-switch" style={{ marginBottom: 14 }} role="tablist">
        <button type="button" className={filter === 'atrasadas' ? 'on' : ''} onClick={() => setFilter('atrasadas')}>Atrasadas {count('atrasadas') > 0 && <span className="badge warn">{count('atrasadas')}</span>}</button>
        <button type="button" className={filter === 'proximas' ? 'on' : ''} onClick={() => setFilter('proximas')}>Próximos 30 días {count('proximas') > 0 && <span className="badge">{count('proximas')}</span>}</button>
        <button type="button" className={filter === 'todas' ? 'on' : ''} onClick={() => setFilter('todas')}>Todas</button>
        <button type="button" className={filter === 'recordatorios' ? 'on' : ''} onClick={() => setFilter('recordatorios')}><MdNotificationsActive /> Recordatorios</button>
      </div>
      {filter === 'recordatorios' ? <ReminderPanel /> : (<>
      <Card flush title={`${list.length} persona${list.length === 1 ? '' : 's'}`} icon={<MdEventRepeat style={{ color: 'var(--brand)' }} />}>
        {!rows ? <div className="splash" style={{ minHeight: 100 }}><Spinner /></div> : list.length === 0 ? <Empty icon={<MdEventRepeat />}>Nadie en este grupo.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Paciente</th><th>Biológico</th><th>Última dosis</th><th>Siguiente</th><th>Estado</th><th className="actions" /></tr></thead>
            <tbody>{list.map((r) => (
              <tr key={r.id}>
                <td><strong style={{ color: 'var(--ink)' }}>{r.patient}</strong><div className="hint">{r.docNumber}{r.siteName ? ` · ${r.siteName}` : ''}</div>{r.phone && <a href={`tel:${r.phone}`} className="hint"><MdPhone style={{ verticalAlign: -2 }} /> {r.phone}</a>}</td>
                <td>{r.vaccine}</td>
                <td>{fmt(r.lastDose)}</td>
                <td>{r.nextDose}<div className="hint">{fmt(r.dueDate)}</div></td>
                <td><span className={`badge ${r.daysLate > 0 ? 'warn' : ''}`}>{r.daysLate > 0 ? `${r.daysLate} días tarde` : r.daysLate === 0 ? 'Hoy' : `En ${-r.daysLate} días`}</span></td>
                <td className="actions" style={{ whiteSpace: 'nowrap' }}><button type="button" className="btn btn-ghost btn-sm" onClick={() => setPreview(r.id)}><MdNotificationsActive /> Recordatorio</button><button type="button" className="btn btn-primary btn-sm" onClick={() => navigate(`/vacunacion/registrar?documento=${r.docNumber}`)}><MdVaccines /> Registrar dosis</button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      </>)}
      {preview && <ReminderPreview recordId={preview} onClose={() => setPreview(null)} />}
    </>
  )
}

export default VaccinationFollowup
