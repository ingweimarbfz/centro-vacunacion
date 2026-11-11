import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { useSettings } from '../../context/SettingsContext'
import { useAuth } from '../../context/AuthContext'
import { Spinner } from '../../components/ui'
import { SignBlock, useDocSignatures } from '../../components/signature'
import { CHECK_VALUES, fmt, printedAt } from './common'
import { isSelf } from './StaffSheet'
import '../../components/cytology.css'

// Formato de lista de chequeo de gestión del talento humano (imprimible y firmable).
const ChecklistSheet = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { logo, settings } = useSettings()
  const { user } = useAuth()
  const [c, setC] = useState(null)
  const [error, setError] = useState('')
  const doc = useDocSignatures('th_chequeo', id)
  useEffect(() => { api.get(`/estandares/th/chequeos/${id}`).then(({ data }) => setC(data)).catch((e) => setError(errorMessage(e))) }, [id])
  useEffect(() => { if (c) { const p = document.title; document.title = `Lista_chequeo_${c.code}`; return () => { document.title = p } } return undefined }, [c])
  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!c) return <div className="splash"><Spinner /> Cargando…</div>
  const s = c.staff
  const staffRole = ['administrador', 'empleado'].includes(user.role)
  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <button type="button" className="btn btn-outline" onClick={() => navigate(`/estandares/talento-humano/personal/${s.id}`)}>← Hoja de vida</button>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
      </div>
      <article className="cy-sheet ev-sheet">
        <header className="cy-sheet-header">
          <img src={logo} alt={settings.ipsName} className="cy-logo" />
          <div className="cy-sheet-heading">
            <p className="cy-kicker">{settings.shortName} · Estándar de talento humano</p>
            <h2>Lista de chequeo de gestión del talento humano</h2>
          </div>
          <dl className="cy-meta">
            <div><dt>Código</dt><dd>{c.code}</dd></div>
            <div><dt>Fecha</dt><dd>{fmt(c.date)}</dd></div>
            <div><dt>Resultado</dt><dd><span className={`badge ${c.result === 'cumple' ? 'ok' : 'bad'}`}>{c.result === 'cumple' ? 'Cumple' : 'No cumple'}</span></dd></div>
          </dl>
        </header>

        <div className="cy-patient-band ev-band">
          <div><span className="cy-field-label">Profesional verificado</span><strong className="cy-patient-name">{s.fullName}</strong><span className="ev-sub">{s.documentType} {s.document}</span></div>
          <div><span className="cy-field-label">Cargo</span><strong>{s.positionName || '—'}</strong><span className="ev-sub">{s.profession || ''}</span></div>
          <div><span className="cy-field-label">Sede</span><strong>{s.siteName || '—'}</strong></div>
        </div>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Verificación de requisitos</h3>
          <table className="ev-table">
            <thead><tr><th style={{ width: 28 }}>#</th><th>Requisito</th><th>Obligatorio</th><th>C</th><th>NC</th><th>NA</th><th>Observación</th></tr></thead>
            <tbody>{c.items.map((it, i) => (
              <tr key={i}>
                <td>{i + 1}</td><td><b>{it.name}</b></td><td>{it.mandatory ? 'Sí' : 'No'}</td>
                {Object.keys(CHECK_VALUES).map((k) => <td key={k} style={{ textAlign: 'center', fontWeight: 700 }}>{it.value === k ? 'X' : ''}</td>)}
                <td>{it.observation || ''}</td>
              </tr>
            ))}</tbody>
          </table>
          <p className="ev-complete">Ítems que cumplen: <b style={{ margin: '0 4px' }}>{c.compliant} de {c.total}</b> aplicables ({c.total ? Math.round((c.compliant / c.total) * 100) : 0} %). C = cumple · NC = no cumple · NA = no aplica.</p>
        </section>

        {c.observations && <section className="cy-section cy-notes"><div><h3 className="cy-section-title">Observaciones</h3><p>{c.observations}</p></div></section>}

        <section className="cy-signatures" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
          <SignBlock doc={doc} slot="verifica" label="Verificó" name={c.reviewer} canSign={c.reviewerId === user.id} />
          <SignBlock doc={doc} slot="profesional" label="Profesional verificado" name={s.fullName} canSign={isSelf(s, user)} />
          <SignBlock doc={doc} slot="coordinacion" label={`Coordinación ${settings.shortName}`} canSign={staffRole} />
        </section>

        <footer className="cy-sheet-footer">
          <span>{settings.ipsName} · Lista de chequeo {c.code}</span>
          <span>Impreso el {printedAt()}</span>
        </footer>
      </article>
    </div>
  )
}

export default ChecklistSheet
