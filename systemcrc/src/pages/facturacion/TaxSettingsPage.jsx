import React, { useEffect, useState } from 'react'
import { MdSave, MdErrorOutline, MdPercent, MdPeople, MdVerified, MdInfoOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Spinner, useToast } from '../../components/ui'
import { formatMoney } from '../../utils/format'
import './facturacion.css'

const RANGES = [['A', 'Rango A · IBC menor a 2 SMMLV'], ['B', 'Rango B · de 2 a 5 SMMLV'], ['C', 'Rango C · más de 5 SMMLV']]

// Facturación → Impuestos y numeración: valores que cambian por año o por municipio (UVT, retenciones,
// cuotas moderadoras, copagos) y la resolución de numeración de la DIAN.
const TaxSettingsPage = () => {
  const [toast, toastNode] = useToast()
  const [f, setF] = useState(null); const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  useEffect(() => { api.get('/facturacion/impuestos').then(({ data }) => setF(data)).catch((e) => setErr(errorMessage(e))) }, [])
  if (!f) return err ? <div className="alert bad"><MdErrorOutline /><span>{err}</span></div> : <div className="splash"><Spinner /></div>
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const setR = (k, r) => (e) => setF({ ...f, [k]: { ...f[k], [r]: e.target.value } })
  const save = async () => {
    setErr(''); setBusy(true)
    try { const { data } = await api.put('/facturacion/impuestos', f); setF({ ...f, ...data }); toast('Configuración guardada') } catch (e) { setErr(errorMessage(e)) } finally { setBusy(false) }
  }
  const N = ({ k, label, hint, step = 'any', unit }) => (
    <div className="field"><label>{label}{unit ? ` (${unit})` : ''}</label><input type="number" step={step} min="0" value={f[k] ?? ''} onChange={set(k)} />{hint && <span className="hint">{hint}</span>}</div>
  )
  return (
    <>
      <PageHead title="Impuestos y numeración" subtitle="Reglas tributarias y de pagos compartidos que aplica cada factura. Confirma los valores del año con el contador o revisor fiscal">
        <button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <MdSave />} Guardar</button>
      </PageHead>
      {err && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{err}</span></div>}
      <div className="stack">
        <Card title="IVA y retenciones" icon={<MdPercent style={{ color: 'var(--brand)' }} />} subtitle="Los servicios de salud están excluidos de IVA (ET art. 476-1); las retenciones las practica quien paga y aquí solo se estiman">
          <div className="form-grid">
            {N({ k: "uvt", label: "Valor de la UVT", unit: "COP", hint: `Año ${f.uvtYear}: actualízala cada año (resolución DIAN)` })}
            {N({ k: "uvtYear", label: "Año de la UVT", step: "1" })}
            {N({ k: "ivaRate", label: "IVA general para ítems gravados", unit: "%", hint: "Solo aplica a ítems del tarifario marcados como gravados" })}
            {N({ k: "retefuenteRate", label: "Retención en la fuente servicios de salud", unit: "%", hint: "Referencia: 2 % servicios integrales de salud de IPS" })}
            {N({ k: "retefuenteGeneralRate", label: "Retención servicios no asistenciales", unit: "%", hint: "Ítems gravados con IVA (capacitaciones, alquileres…): referencia 4 %" })}
            {N({ k: "retefuenteMinUvt", label: "Base mínima de retención", unit: "UVT", hint: `= ${formatMoney(Number(f.retefuenteMinUvt) * Number(f.uvt))}` })}
            {N({ k: "reteicaPerMil", label: "ReteICA del municipio", unit: "por mil", hint: "0 si el municipio no la aplica" })}
          </div>
          <div className="stack" style={{ gap: 6, marginTop: 12 }}>
            <label className="switch"><input type="checkbox" checked={f.retefuenteEps} onChange={set('retefuenteEps')} /> Las EPS practican retención en la fuente</label>
            <label className="switch"><input type="checkbox" checked={f.retefuenteEmpresa} onChange={set('retefuenteEmpresa')} /> Las empresas, clínicas, hospitales y entidades con convenio practican retención en la fuente</label>
            <label className="switch"><input type="checkbox" checked={f.reteicaExcludeEps} onChange={set('reteicaExcludeEps')} /> No aplicar ReteICA a pagos de EPS (recursos del SGSSS)</label>
          </div>
        </Card>
        <Card title="Copagos y cuotas moderadoras" icon={<MdPeople style={{ color: 'var(--brand)' }} />} subtitle="Acuerdo 260 de 2004. Se cobran al afiliado cuando la EPS paga el servicio; no aplican en promoción y prevención (citología, vacunación)">
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Rango salarial</th><th className="num">Cuota moderadora (COP)</th><th className="num">Copago beneficiarios (%)</th><th className="num">Tope de copago por evento (COP)</th></tr></thead>
            <tbody>{RANGES.map(([r, l]) => (
              <tr key={r}>
                <td>{l}</td>
                <td className="num"><input className="input" type="number" min="0" step="100" value={f.cuotaModeradora?.[r] ?? 0} onChange={setR('cuotaModeradora', r)} style={{ width: 130 }} /></td>
                <td className="num"><input className="input" type="number" min="0" step="0.1" value={f.copagoPct?.[r] ?? 0} onChange={setR('copagoPct', r)} style={{ width: 100 }} /></td>
                <td className="num"><input className="input" type="number" min="0" step="100" value={f.copagoTopeEvento?.[r] ?? 0} onChange={setR('copagoTopeEvento', r)} style={{ width: 140 }} /></td>
              </tr>
            ))}</tbody>
          </table></div>
          <div className="form-grid" style={{ marginTop: 12 }}>
            {N({ k: "copagoSubsidiadoPct", label: "Copago régimen subsidiado", unit: "%" })}
          </div>
          <div className="alert info" style={{ margin: '12px 0 0' }}><MdInfoOutline /><span>Los porcentajes vienen del Acuerdo 260; los valores de cuota moderadora y los topes cambian cada año con el salario mínimo (circular del Ministerio de Salud). Tope en 0 = sin tope.</span></div>
        </Card>
        <Card title="Numeración de facturación DIAN" icon={<MdVerified style={{ color: 'var(--brand)' }} />} subtitle="Resolución que autoriza el rango de numeración. Al vencerse o agotarse, el sistema no deja facturar">
          <div className="form-grid">
            <div className="field"><label>N° de resolución</label><input value={f.dianResolution || ''} onChange={set('dianResolution')} placeholder="18764000000000" /></div>
            <div className="field"><label>Prefijo</label><input value={f.dianPrefix || ''} onChange={set('dianPrefix')} placeholder="FV" /></div>
            {N({ k: "dianFrom", label: "Desde", step: "1" })}
            {N({ k: "dianTo", label: "Hasta", step: "1", hint: f.rangeLeft != null ? `Quedan ${f.rangeLeft} números (último usado: ${f.lastInvoice})` : `Último usado: ${f.lastInvoice}` })}
            <div className="field"><label>Vigente hasta</label><input type="date" value={f.dianValidUntil || ''} onChange={set('dianValidUntil')} /></div>
          </div>
          <div className="alert warn" style={{ margin: '12px 0 0' }}><MdInfoOutline /><span>Integra IPS lleva el control interno de las facturas; la factura electrónica ante la DIAN y el RIPS (Res. 2275 de 2023) se emiten con un proveedor tecnológico autorizado.</span></div>
        </Card>
      </div>
      {toastNode}
    </>
  )
}

export default TaxSettingsPage
