import React, { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdEdit, MdSave, MdErrorOutline, MdVaccines } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { formatMoney } from '../../utils/format'
import './vacunacion.css'

const VaccineForm = ({ initial, options, onClose, onSaved }) => {
  const [f, setF] = useState(() => ({
    name: initial?.name || '', code: initial?.code || '', pai: initial ? initial.pai : true, doseLabels: (initial?.doseLabels || ['Única']).join(', '), intervalDays: (initial?.intervalDays || []).join(', '),
    route: initial?.route || 'Intramuscular', applicationSite: initial?.applicationSite || 'Deltoides', target: initial?.target || '', presentation: initial?.presentation || 'unidosis',
    dosesPerVial: initial?.dosesPerVial || 10, openVialHours: initial?.openVialHours || 6, productId: initial?.productId ? String(initial.productId) : '', syringeProductId: initial?.syringeProductId ? String(initial.syringeProductId) : '',
    tariffId: initial?.tariffId ? String(initial.tariffId) : '', active: initial?.active !== false
  }))
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const save = async () => {
    setErr(''); setBusy(true)
    const body = { ...f, doseLabels: f.doseLabels.split(',').map((x) => x.trim()).filter(Boolean), intervalDays: f.intervalDays.split(',').map((x) => Number(x.trim())).filter((x) => x > 0) }
    try { initial?.id ? await api.put(`/vacunacion/biologicos/${initial.id}`, body) : await api.post('/vacunacion/biologicos', body); onSaved() } catch (e) { setErr(errorMessage(e)); setBusy(false) }
  }
  const meds = options.products.filter((p) => p.category === 'medicamento'); const devices = options.products.filter((p) => p.category === 'dispositivo_medico')
  return (
    <Modal title={initial?.id ? `Editar · ${initial.name}` : 'Nuevo biológico'} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        <div className="form-grid">
          <div className="field span-2"><label>Nombre <span className="req">*</span></label><input value={f.name} onChange={set('name')} autoFocus /></div>
          <div className="field"><label>Código</label><input value={f.code} onChange={set('code')} placeholder="Ej: INF" /></div>
          <div className="field"><label>Tipo</label><select value={f.pai ? 'pai' : 'particular'} onChange={(e) => setF({ ...f, pai: e.target.value === 'pai' })}><option value="pai">PAI (gratuita, la entrega la secretaría)</option><option value="particular">Particular (se cobra)</option></select></div>
          <div className="field span-2"><label>Dosis del esquema (separadas por coma)</label><input value={f.doseLabels} onChange={set('doseLabels')} placeholder="Primera, Segunda, Refuerzo" /><span className="hint">Usa “Anual” para vacunas de una dosis cada año</span></div>
          <div className="field span-2"><label>Días entre dosis (separados por coma)</label><input value={f.intervalDays} onChange={set('intervalDays')} placeholder="30, 180" /><span className="hint">Uno menos que las dosis: entre la 1.ª y la 2.ª, entre la 2.ª y la 3.ª…</span></div>
          <div className="field"><label>Vía</label><input value={f.route} onChange={set('route')} /></div>
          <div className="field"><label>Sitio de aplicación</label><input value={f.applicationSite} onChange={set('applicationSite')} /></div>
          <div className="field span-2"><label>Población objetivo</label><input value={f.target} onChange={set('target')} /></div>
          <div className="field"><label>Presentación</label><select value={f.presentation} onChange={set('presentation')}><option value="unidosis">Unidosis</option><option value="multidosis">Multidosis</option></select></div>
          {f.presentation === 'multidosis' && <>
            <div className="field"><label>Dosis por frasco</label><input type="number" min="2" value={f.dosesPerVial} onChange={set('dosesPerVial')} /></div>
            <div className="field"><label>Vida útil del frasco abierto (horas)</label><input type="number" min="1" value={f.openVialHours} onChange={set('openVialHours')} /><span className="hint">Ej.: 6 h reconstituidas; 672 h (28 días) según la política de frascos abiertos</span></div>
          </>}
          <div className="field span-2"><label>Producto de inventario (biológico)</label><select value={f.productId} onChange={set('productId')}><option value="">Sin control de inventario</option>{meds.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="field span-2"><label>Jeringa que descuenta</label><select value={f.syringeProductId} onChange={set('syringeProductId')}><option value="">Ninguna (jeringa prellenada)</option>{devices.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}</select></div>
          <div className="field span-2"><label>Ítem del tarifario {!f.pai && <span className="req">*</span>}</label><select value={f.tariffId} onChange={set('tariffId')}><option value="">{f.pai ? 'No facturar la aplicación' : 'Selecciona…'}</option>{options.tariffs.map((t) => <option key={t.id} value={t.id}>{t.name} · {formatMoney(t.price)}</option>)}</select><span className="hint">{f.pai ? 'PAI: el biológico es gratuito; si el paciente tiene EPS con convenio por cuenta de cobro, la aplicación se le factura sola a la EPS.' : 'Se factura primero en Facturación → Servicios facturables.'}</span></div>
        </div>
        {initial?.id && <label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Activo' : 'Inactivo'}</label>}
        {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
      </div>
    </Modal>
  )
}

// Vacunación → Biológicos: catálogo con esquema, presentación, inventario y tarifa.
const VaccinesConfig = () => {
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null); const [options, setOptions] = useState(null); const [modal, setModal] = useState(null)
  const load = useCallback(() => Promise.all([
    api.get('/vacunacion/biologicos').then(({ data }) => setRows(data)),
    api.get('/vacunacion/opciones').then(({ data }) => setOptions(data))
  ]).catch((e) => toast(errorMessage(e), 'bad')), [toast])
  useEffect(() => { load() }, [load])
  return (
    <>
      <PageHead title="Biológicos" subtitle="Vacunas del PAI y particulares: esquema de dosis, presentación, inventario y tarifa">
        <button type="button" className="btn btn-primary" onClick={() => setModal({})} disabled={!options}><MdAdd /> Nuevo biológico</button>
      </PageHead>
      <Card flush icon={<MdVaccines style={{ color: 'var(--brand)' }} />} title={rows ? `${rows.length} biológicos` : 'Biológicos'}>
        {!rows ? <div className="splash" style={{ minHeight: 100 }}><Spinner /></div> : rows.length === 0 ? <Empty icon={<MdVaccines />}>Aún no hay biológicos.</Empty> : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Biológico</th><th>Esquema</th><th>Presentación</th><th>Inventario</th><th>Cobro</th><th className="actions" /></tr></thead>
            <tbody>{rows.map((v) => (
              <tr key={v.id} style={v.active ? undefined : { opacity: 0.55 }}>
                <td><strong style={{ color: 'var(--ink)' }}>{v.name}</strong> {v.code && <span className="hint">{v.code}</span>}<div className="hint">{v.target}</div></td>
                <td>{v.doseLabels.join(' → ')}{v.intervalDays.length > 0 && <div className="hint">cada {v.intervalDays.join(' / ')} días</div>}</td>
                <td>{v.presentation === 'multidosis' ? `Multidosis x${v.dosesPerVial} · ${v.openVialHours} h abierto` : 'Unidosis'}<div className="hint">{v.route}</div></td>
                <td>{v.productName || <span className="hint">Sin inventario</span>}</td>
                <td>{v.pai ? <><span className="badge ok">PAI</span>{v.tariffName && <div className="hint">Aplicación a EPS {formatMoney(v.tariffPrice)}</div>}</> : <span className="badge warn">{v.tariffName ? `${formatMoney(v.tariffPrice)}` : 'Sin tarifa'}</span>}</td>
                <td className="actions"><button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal(v)}><MdEdit /></button></td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      {modal && options && <VaccineForm initial={modal.id ? modal : null} options={options} onClose={() => setModal(null)} onSaved={() => { setModal(null); toast('Biológico guardado'); load() }} />}
      {toastNode}
    </>
  )
}

export default VaccinesConfig
