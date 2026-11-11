import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'
import { SignBlock, useDocSignatures } from '../../components/signature'
import { fmt, printedAt } from './common'
import FormatHeader from './FormatHeader'
import '../../components/cytology.css'

// Formato de lista de chequeo de gestión de talento humano (estructura del formato de la IPS: Sí / No / Obs).
const ChecklistSheet = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { settings } = useSettings()
  const { user } = useAuth()
  const [c, setC] = useState(null)
  const [error, setError] = useState('')
  const doc = useDocSignatures('th_chequeo', id)
  useEffect(() => { api.get(`/estandares/th/chequeos/${id}`).then(({ data }) => setC(data)).catch((e) => setError(errorMessage(e))) }, [id])
  useEffect(() => { if (c) { const p = document.title; document.title = `Lista_chequeo_${c.staff.document}_${c.code}`; return () => { document.title = p } } return undefined }, [c])
  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!c) return <div className="splash"><Spinner /> Cargando…</div>
  const s = c.staff
  const staffRole = ['administrador', 'empleado'].includes(user.role)
  const obs = (it) => (it.value === 'no_aplica' ? `No aplica${it.observation ? `: ${it.observation}` : ''}` : it.observation || '')
  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={() => navigate(`/estandares/talento-humano/personal/${s.id}`)}>← Hoja de vida</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>
      <article className="cy-sheet ev-sheet th-form">
        <FormatHeader format={c.format} title="Formato Lista de Chequeo de Gestión de Talento Humano" extra={<span>N° {c.code}</span>} />

        <table className="th-form-id">
          <tbody>
            <tr><th>Nombre completo:</th><td>{s.fullName}</td><th>Fecha de diligenciamiento:</th><td>{fmt(c.date)}</td></tr>
            <tr><th>Cédula de ciudadanía No.:</th><td>{s.document}</td><th>Resultado:</th><td><b>{c.result === 'cumple' ? 'CUMPLE' : 'NO CUMPLE'}</b> ({c.compliant} de {c.total} ítems aplicables)</td></tr>
            <tr><th>Denominación del cargo:</th><td colSpan={3}>{s.positionName || '—'}{s.profession ? ` · ${s.profession}` : ''}</td></tr>
          </tbody>
        </table>

        <table className="th-form-table">
          <thead><tr><th rowSpan={2}>Ítem</th><th colSpan={3}>Cumple</th></tr><tr><th className="yn">Sí</th><th className="yn">No</th><th className="obs">Obs *</th></tr></thead>
          <tbody>{Object.entries(c.categories).map(([cat, label]) => {
            const rows = c.items.filter((it) => (it.category || 'otro') === cat)
            if (!rows.length) return null
            return (
              <React.Fragment key={cat}>
                <tr className="sec"><td colSpan={4}>{label.toUpperCase()}</td></tr>
                {rows.map((it, i) => (
                  <tr key={`${cat}-${i}`}>
                    <td>{it.code ? `${it.code}. ` : ''}{it.name}</td>
                    <td className="yn">{it.value === 'cumple' ? 'X' : ''}</td>
                    <td className="yn">{it.value === 'no_cumple' ? 'X' : ''}</td>
                    <td className="obs">{obs(it)}</td>
                  </tr>
                ))}
              </React.Fragment>
            )
          })}</tbody>
        </table>

        <div className="th-form-obs"><b>Observaciones generales*:</b> {c.observations || ''}</div>

        <section className="cy-signatures" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <SignBlock doc={doc} slot="coordinacion" label="Revisó · Nombre y cargo" canSign={staffRole} />
          <SignBlock doc={doc} slot="verifica" label="Verificó · Nombre y cargo" name={c.reviewer} canSign={c.reviewerId === user.id} />
        </section>

        <footer className="cy-sheet-footer">
          <span>{settings.ipsName} · {c.format?.code || 'Lista de chequeo'} · {c.code}</span>
          <span>Impreso el {printedAt()}</span>
        </footer>
      </article>
    </div>
  )
}

export default ChecklistSheet
