import React, { useEffect, useState } from 'react'
import { MdAccountTree, MdArrowForward, MdLocalHospital } from 'react-icons/md'
import api from '../api/client'
import { SITE_TYPES } from '../utils/permissions'
import { Card } from './ui'

// Resumen por sede para el administrador cuando ve "Todas las sedes".
const SitesSummary = () => {
  const [rows, setRows] = useState(null)
  useEffect(() => { api.get('/sedes-resumen').then(({ data }) => setRows(data)).catch(() => setRows([])) }, [])
  if (!rows?.length) return null
  return (
    <Card title="Información por municipio" subtitle="Elige una sede para ver su dashboard" icon={<MdAccountTree style={{ color: 'var(--brand)' }} />} flush>
      <div className="table-wrap" style={{ marginTop: 12 }}>
        <table className="table">
          <thead><tr><th>Sede</th><th>Tipo</th><th>IPS</th><th className="num">Empleados</th><th className="num">Voluntarios</th><th className="num">Conductores</th><th className="num">Eventos (en curso)</th><th className="num">Vehículos</th><th className="num">Equipos</th><th className="actions" /></tr></thead>
          <tbody>{rows.filter((s) => s.active).map((s) => (
            <tr key={s.id}>
              <td><strong style={{ color: 'var(--ink)' }}>{s.name}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>{s.municipality}</div></td>
              <td><span className="badge">{SITE_TYPES[s.type]}</span></td>
              <td>{s.hasIps ? <span className="badge ok"><MdLocalHospital /> Sí</span> : <span className="badge">No</span>}</td>
              <td className="num">{s.employees}</td><td className="num">{s.volunteers}</td><td className="num">{s.drivers}</td>
              <td className="num">{s.events} {s.openEvents ? <span className="badge warn">{s.openEvents}</span> : null}</td>
              <td className="num">{s.vehicles}</td><td className="num">{s.equipment}</td>
              <td className="actions"><button type="button" className="btn btn-outline btn-sm" onClick={() => window.dispatchEvent(new CustomEvent('cv:set-site', { detail: s.id }))}>Ver <MdArrowForward /></button></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </Card>
  )
}

export default SitesSummary
