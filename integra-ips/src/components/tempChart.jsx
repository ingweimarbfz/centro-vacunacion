import React from 'react'

// Gráfica de temperatura: un punto por lectura (4 al día: mañana 1.ª y 2.ª, tarde 1.ª y 2.ª),
// cada uno con su mínima y su máxima → 8 valores por día, en orden de fecha y hora.
const SHIFT_ORDER = { manana: 0, tarde: 1 }
const SHIFT_LABEL = { manana: 'Mañana', tarde: 'Tarde' }
export const readingPoints = (rows) => [...(rows || [])]
  .sort((a, b) => a.isoDate.localeCompare(b.isoDate) || (SHIFT_ORDER[a.shift] - SHIFT_ORDER[b.shift]) || ((a.slot || 1) - (b.slot || 1)) || String(a.recordedAt).localeCompare(String(b.recordedAt)))
  .map((r) => ({
    key: r.id, day: r.date.slice(0, 5), date: r.date, time: r.time, shift: r.shift,
    reading: `${SHIFT_LABEL[r.shift] || ''} · ${r.slot || 1}.ª`,
    x: `${r.date.slice(0, 5)} ${r.time}`,
    tempMin: r.tempMin, tempMax: r.tempMax
  }))

// Eje X: la fecha solo en la primera lectura de cada día.
export const dayTick = (points) => (v, i) => (i === 0 || points[i - 1]?.day !== points[i]?.day ? points[i]?.day || '' : '')

export const READING_LINES = (settings) => [
  { key: 'tempMax', name: 'Máxima', color: settings.primaryColor },
  { key: 'tempMin', name: 'Mínima', color: settings.secondaryColor }
]

export const ReadingTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  const p = payload[0].payload
  return (
    <div className="chart-tip" style={{ background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, padding: '8px 10px', fontSize: 12.5 }}>
      <strong>{p.date} · {p.time}</strong>
      <div style={{ color: '#6B7280' }}>{p.reading} lectura</div>
      {payload.map((x) => <div key={x.dataKey} style={{ color: x.color }}>{x.name}: <b>{x.value} °C</b></div>)}
    </div>
  )
}

// Color de cada punto según la jornada (mismos colores en pantalla, dashboard y PDF).
export const SHIFT_COLORS = { manana: '#F59E0B', tarde: '#7C3AED' }
export const shiftDot = (r = 3.2) => {
  const Dot = ({ cx, cy, payload, stroke, index }) => (cx == null || cy == null ? null
    : <circle key={index} cx={cx} cy={cy} r={r} fill={SHIFT_COLORS[payload?.shift] || '#fff'} stroke={stroke} strokeWidth={Math.max(1, r / 2.6)} />)
  return Dot
}

// Convención: líneas (máxima/mínima) y puntos (mañana/tarde).
export const TempLegend = ({ lines, small }) => {
  const fs = small ? 10.5 : 12
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: small ? 12 : 16, fontSize: fs, color: '#4B5563', marginTop: 6 }}>
      {lines.map((l) => (
        <span key={l.key} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <svg width="22" height="10" aria-hidden="true"><line x1="0" y1="5" x2="22" y2="5" stroke={l.color} strokeWidth="2.5" /></svg>{l.name}
        </span>
      ))}
      {[['manana', 'Mañana'], ['tarde', 'Tarde']].map(([k, n]) => (
        <span key={k} style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <svg width="12" height="12" aria-hidden="true"><circle cx="6" cy="6" r="5" fill={SHIFT_COLORS[k]} /></svg>Lectura de la {n.toLowerCase()}
        </span>
      ))}
    </div>
  )
}
