import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { MdSave, MdPerson, MdVaccines, MdCheckCircle, MdErrorOutline, MdHistory, MdInfoOutline } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Spinner } from '../../components/ui'
import InvoicePicker from '../../components/InvoicePicker'
import useServiceInvoice from '../../hooks/useServiceInvoice'
import { tipoDocumento } from '../../utils/dataGeneral'
import { formatMoney } from '../../utils/format'
import './vacunacion.css'
import { DocInput, PhoneInput } from '../../components/inputs'

const fmt = (iso) => (iso ? iso.slice(0, 10).split('-').reverse().join('/') : '—')
const EMPTY = { docType: 'Cédula de ciudadanía', docNumber: '', names: '', surnames: '', birthDate: '', sex: '', phone: '', email: '', address: '', municipality: '', epsId: '', regimen: '', populationGroup: 'Población general', ethnicity: '', vaccineId: '', doseLabel: '', itemId: '', vaccinatorId: '', modality: 'intramural', notes: '' }
const age = (birth, ref) => { if (!birth || !ref) return ''; const [by, bm, bd] = birth.split('-').map(Number); const [ry, rm, rd] = ref.split('-').map(Number); return ry - by - (rm < bm || (rm === bm && rd < bd) ? 1 : 0) }

// Vacunación → Registrar: registro nominal de la dosis aplicada (descuenta inventario y programa la siguiente dosis).
const RegisterVaccination = () => {
  const [params] = useSearchParams()
  const [form, setForm] = useState(null); const [eps, setEps] = useState([])
  const [f, setF] = useState({ ...EMPTY, docNumber: params.get('documento') || '' })
  const [historyRecs, setHistory] = useState([])
  const [busy, setBusy] = useState(false); const [err, setErr] = useState(''); const [ok, setOk] = useState(null)
  const load = useCallback(() => api.get('/vacunacion/datos-formulario').then(({ data }) => { setForm(data); setF((x) => ({ ...x, vaccinatorId: x.vaccinatorId || String(data.vaccinators.find((v) => v.hasSignature)?.id || '') })) }).catch((e) => setErr(errorMessage(e))), [])
  useEffect(() => { load(); api.get('/eps').then(({ data }) => setEps(data.filter((x) => x.active))).catch(() => {}) }, [load])
  const set = (k) => (e) => setF((x) => ({ ...x, [k]: e.target.value }))
  // Factura (solo vacunas que se cobran): al elegirla se llenan los datos del paciente.
  const onInvoice = useCallback((inv) => setF((x) => ({ ...x, ...(inv.docNumber ? { docType: inv.docType || x.docType, docNumber: inv.docNumber, names: inv.names || x.names, surnames: inv.surnames || x.surnames } : {}), epsId: inv.epsId ? String(inv.epsId) : x.epsId })), [])
  const inv = useServiceInvoice('cadena_frio', onInvoice)
  // Historial del paciente por documento: llena sus datos y sugiere la dosis siguiente.
  const lookup = useCallback(async (doc) => {
    const d = String(doc || '').replace(/[^\dA-Za-z]/g, '')
    if (d.length < 4) return
    try {
      const { data } = await api.get('/vacunacion/paciente', { params: { documento: d } })
      setHistory(data.records)
      if (data.patient) setF((x) => ({ ...x, ...Object.fromEntries(Object.entries(data.patient).map(([k, v]) => [k, v == null ? '' : String(v)])), docNumber: d }))
    } catch { setHistory([]) }
  }, [])
  useEffect(() => { if (params.get('documento')) lookup(params.get('documento')) }, [params, lookup])
  const vaccine = form?.vaccines.find((v) => String(v.id) === String(f.vaccineId))
  const suggested = useMemo(() => {
    if (!vaccine) return ''
    const mine = historyRecs.filter((r) => r.vaccineId === vaccine.id)
    if (vaccine.doseLabels.length === 1) return vaccine.doseLabels[0]
    return vaccine.doseLabels[Math.min(mine.length, vaccine.doseLabels.length - 1)]
  }, [vaccine, historyRecs])
  const pickVaccine = (e) => {
    const v = form.vaccines.find((x) => String(x.id) === e.target.value)
    setF((x) => ({ ...x, vaccineId: e.target.value, doseLabel: '', itemId: v?.lots[0] ? String(v.lots[0].itemId) : '' }))
  }
  const needsInvoice = vaccine && !vaccine.pai && form?.billingOn
  const save = async (e) => {
    e.preventDefault(); setErr(''); setOk(null)
    if (!f.docNumber || !f.names || !f.birthDate) return setErr('Completa documento, nombres y fecha de nacimiento.')
    if (!vaccine) return setErr('Elige el biológico.')
    if (vaccine.productId && !f.itemId) return setErr('Elige el lote disponible.')
    if (needsInvoice && !inv.invoice) return setErr(`${vaccine.name} se cobra: busca y elige la factura.`)
    setBusy(true)
    try {
      const { data } = await api.post('/vacunacion/registrar', { ...f, doseLabel: f.doseLabel || suggested, invoiceId: needsInvoice ? inv.invoice?.id : undefined })
      setOk(data); setF({ ...EMPTY, vaccinatorId: f.vaccinatorId, modality: f.modality }); setHistory([]); inv.reset(); load()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e2) { setErr(errorMessage(e2)); window.scrollTo({ top: 0, behavior: 'smooth' }) } finally { setBusy(false) }
  }
  if (!form) return err ? <div className="alert bad"><MdErrorOutline /><span>{err}</span></div> : <div className="splash"><Spinner /></div>
  const lot = vaccine?.lots.find((l) => String(l.itemId) === String(f.itemId))
  const openVial = vaccine?.openVials.find((x) => String(x.itemId) === String(f.itemId))
  return (
    <form onSubmit={save} noValidate>
      <PageHead title="Registrar vacunación" subtitle="Registro nominal de la dosis: descuenta el biológico del inventario y programa la siguiente dosis">
        <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? <Spinner /> : <MdSave />} Registrar vacunación</button>
      </PageHead>
      {ok && <div className="alert ok" style={{ marginBottom: 16 }}><MdCheckCircle /><span><b>Vacuna registrada:</b> {ok.vaccine} · {ok.dose} · lote {ok.lot || '—'} a {ok.patient}.{ok.nextDoseDate ? ` Próxima dosis (${ok.nextDoseLabel}): ${fmt(ok.nextDoseDate)}.` : ' Esquema completo para este biológico.'} {ok.billed ? ` Aplicación facturada a ${ok.billed.eps} (${ok.billed.invoice}) para la cuenta de cobro.` : ''} <Link to={`/vacunacion/carne/${ok.docNumber}`}>Ver carnet</Link>{ok.warning ? ` · ${ok.warning}` : ''}</span></div>}
      {err && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{err}</span></div>}
      <div className="stack">
        <Card title="Biológico" icon={<MdVaccines style={{ color: 'var(--brand)' }} />}>
          <div className="form-grid">
            <div className="field"><label>Biológico <span className="req">*</span></label>
              <select value={f.vaccineId} onChange={pickVaccine}>
                <option value="">Selecciona…</option>
                <optgroup label="PAI (gratuitas)">{form.vaccines.filter((v) => v.pai).map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}</optgroup>
                <optgroup label="Particulares (se cobran)">{form.vaccines.filter((v) => !v.pai).map((v) => <option key={v.id} value={v.id}>{v.name}{v.tariffPrice != null ? ` · ${formatMoney(v.tariffPrice)}` : ''}</option>)}</optgroup>
              </select>
            </div>
            <div className="field"><label>Dosis</label>
              <select value={f.doseLabel || suggested} onChange={set('doseLabel')} disabled={!vaccine}>{(vaccine?.doseLabels || []).map((l) => <option key={l} value={l}>{l}{l === suggested ? ' (sugerida)' : ''}</option>)}</select>
            </div>
            <div className="field"><label>Lote {vaccine?.productId && <span className="req">*</span>}</label>
              <select value={f.itemId} onChange={set('itemId')} disabled={!vaccine}>
                {vaccine && vaccine.lots.length === 0 && <option value="">Sin existencias en la sede</option>}
                {(vaccine?.lots || []).map((l) => <option key={l.itemId} value={l.itemId}>{l.lot} · vence {fmt(l.expiry)} · {l.stock} frasco{l.stock === 1 ? '' : 's'}</option>)}
              </select>
            </div>
            <div className="field"><label>Vacunador <span className="req">*</span></label>
              <select value={f.vaccinatorId} onChange={set('vaccinatorId')}><option value="">Selecciona…</option>{form.vaccinators.map((v) => <option key={v.id} value={v.id} disabled={!v.hasSignature}>{v.fullName}{v.hasSignature ? '' : ' (sin firma digital)'}</option>)}</select>
              <span className="hint">El carnet va firmado por el vacunador: debe tener su firma en “Mi firma digital”.</span>
            </div>
            <div className="field"><label>Modalidad</label><select value={f.modality} onChange={set('modality')}>{Object.entries(form.modalities).map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select></div>
            <div className="field"><label>Fecha de aplicación</label><input value={fmt(form.today)} readOnly /></div>
          </div>
          {vaccine && (
            <div className="vac-info" style={{ marginTop: 12 }}>
              <span><b>{vaccine.pai ? 'PAI' : 'Particular'}</b> · {vaccine.route || '—'}{vaccine.applicationSite ? ` · ${vaccine.applicationSite}` : ''} · esquema: {vaccine.doseLabels.join(', ')}</span>
              {vaccine.target && <span>Población objetivo: {vaccine.target}</span>}
              {vaccine.presentation === 'multidosis' && <span>Multidosis de {vaccine.dosesPerVial} dosis · vida útil abierto {vaccine.openVialHours} h. {openVial ? `Frasco abierto del lote ${openVial.lot}: quedan ${openVial.remaining} dosis.` : lot ? 'Se abrirá un frasco nuevo del lote elegido.' : ''}</span>}
            </div>
          )}
        </Card>
        {needsInvoice && <InvoicePicker inv={inv} serviceLabel="la vacuna" patientLabel="el paciente" />}
        {vaccine && vaccine.pai && vaccine.tariffId && form.billingOn && (() => { const e = eps.find((x) => String(x.id) === String(f.epsId)); return e && e.agreementActive && e.paymentMode === 'cuenta_cobro' ? <div className="alert info" style={{ margin: 0 }}><MdInfoOutline /><span>Biológico PAI gratuito. La aplicación se facturará a <b>{e.name}</b> para su cuenta de cobro ({formatMoney(vaccine.tariffPrice)}, sin copago por ser promoción y prevención).</span></div> : null })()}
        {vaccine && !vaccine.pai && !form.billingOn && <div className="alert info" style={{ margin: 0 }}><MdInfoOutline /><span>Tu plan no incluye facturación: cobra esta vacuna en caja.</span></div>}
        <Card title="Paciente" icon={<MdPerson style={{ color: 'var(--brand)' }} />} subtitle="Escribe el documento: si ya se vacunó antes, se cargan sus datos y su historial">
          <div className="form-grid">
            <div className="field"><label>Tipo de documento</label><select value={f.docType} onChange={set('docType')}>{tipoDocumento.map((t) => <option key={t.tipoDoc} value={t.tipoDoc}>{t.tipoDoc}</option>)}</select></div>
            <div className="field"><label>N° documento <span className="req">*</span></label><DocInput value={f.docNumber} onChange={set('docNumber')} docType={f.docType} onBlur={() => lookup(f.docNumber)} /></div>
            <div className="field"><label>Nombres <span className="req">*</span></label><input value={f.names} onChange={set('names')} /></div>
            <div className="field"><label>Apellidos</label><input value={f.surnames} onChange={set('surnames')} /></div>
            <div className="field"><label>Fecha de nacimiento <span className="req">*</span></label><input type="date" value={f.birthDate} max={form.today} onChange={set('birthDate')} />{f.birthDate && <span className="hint">{age(f.birthDate, form.today)} años</span>}</div>
            <div className="field"><label>Sexo</label><select value={f.sex} onChange={set('sex')}><option value="">—</option><option value="F">Femenino</option><option value="M">Masculino</option><option value="I">Intersexual</option></select></div>
            <div className="field"><label>Grupo poblacional</label><select value={f.populationGroup} onChange={set('populationGroup')}>{form.groups.map((g) => <option key={g} value={g}>{g}</option>)}</select></div>
            <div className="field"><label>Pertenencia étnica</label><select value={f.ethnicity} onChange={set('ethnicity')}><option value="">Ninguna</option><option>Indígena</option><option>Afrocolombiano</option><option>Raizal</option><option>Palenquero</option><option>Rrom</option></select></div>
            <div className="field"><label>EPS</label><select value={f.epsId} onChange={set('epsId')}><option value="">Sin EPS</option>{eps.filter((x) => (x.kind || 'eps') === 'eps').map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}</select></div>
            <div className="field"><label>Régimen</label><select value={f.regimen} onChange={set('regimen')}><option value="">—</option><option value="contributivo">Contributivo</option><option value="subsidiado">Subsidiado</option><option value="especial">Especial</option><option value="no_afiliado">No afiliado</option></select></div>
            <div className="field"><label>Celular</label><PhoneInput value={f.phone} onChange={set('phone')} /></div>
            <div className="field"><label>Municipio</label><input value={f.municipality} onChange={set('municipality')} /></div>
            <div className="field span-2"><label>Dirección</label><input value={f.address} onChange={set('address')} /></div>
            <div className="field span-2"><label>Observaciones</label><input value={f.notes} onChange={set('notes')} /></div>
          </div>
          {historyRecs.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <span className="cy-field-label"><MdHistory style={{ verticalAlign: -2 }} /> Vacunas anteriores</span>
              <div className="vac-history" style={{ marginTop: 6 }}>{historyRecs.map((r) => <span key={r.id} className="badge">{r.vaccine} · {r.dose} · {fmt(r.appliedOn)}</span>)}</div>
            </div>
          )}
        </Card>
      </div>
    </form>
  )
}

export default RegisterVaccination
