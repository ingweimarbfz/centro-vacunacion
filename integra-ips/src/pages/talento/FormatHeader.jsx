import React from 'react'
import { useSettings } from '../../context/SettingsContext'

// Encabezado tipo "control de documentos": logo cargado en el sistema, proceso, título y código / versión / fecha
// (se configuran en Cargos y requisitos → Encabezado de formatos).
const FormatHeader = ({ format, title, extra }) => {
  const { logo, settings } = useSettings()
  return (
    <table className="th-fhead">
      <tbody>
        <tr>
          <td className="logo" rowSpan={3}><img src={logo} alt={settings.ipsName} /></td>
          <td className="proc">{format?.process || settings.ipsName}</td>
          <td className="meta">{format?.code ? <b>{format.code}</b> : extra || ''}</td>
        </tr>
        <tr><td className="title" rowSpan={2}>{title}</td><td className="meta">Versión: {format?.version || '—'}</td></tr>
        <tr><td className="meta">Fecha: {format?.versionDate || '—'}{format?.code && extra ? <div>{extra}</div> : null}</td></tr>
      </tbody>
    </table>
  )
}

export default FormatHeader
