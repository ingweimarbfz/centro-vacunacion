import React from 'react'

// Símbolo de Integra IPS en vector. Toma los colores de la configuración de la IPS (--brand y --secondary),
// así se adapta a cada cliente sin perder la forma de la marca.
export const IntegraSymbol = ({ size = 18, title = 'Integra IPS' }) => (
  <svg viewBox="0 0 120 120" width={size} height={size} role="img" aria-label={title} className="integra-symbol">
    <rect x="4" y="4" width="112" height="112" rx="30" fill="var(--brand)" />
    <g fill="#FFFFFF">
      <rect x="48" y="22" width="24" height="30" rx="9" />
      <rect x="48" y="68" width="24" height="30" rx="9" />
      <rect x="22" y="48" width="30" height="24" rx="9" />
      <rect x="68" y="48" width="30" height="24" rx="9" />
    </g>
    <circle cx="60" cy="60" r="9" fill="var(--brand-50)" />
    <circle cx="60" cy="60" r="4" fill="var(--brand)" />
  </svg>
)

// Firma al pie del menú: "Con [símbolo] Integra IPS".
export const IntegraSignature = () => (
  <a className="integra-sign" href="https://integra-web-eta.vercel.app" target="_blank" rel="noreferrer" title="Integra IPS · Sistema de información para IPS">
    <span className="integra-sign-by">Con</span>
    <IntegraSymbol size={18} />
    <span className="integra-sign-word">Integra <b>IPS</b></span>
  </a>
)

export default IntegraSymbol
