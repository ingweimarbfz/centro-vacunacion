import React, { useCallback, useEffect, useState } from 'react'
import { MdAdd, MdEdit, MdDelete, MdSave, MdErrorOutline, MdPriceChange, MdStar } from 'react-icons/md'
import api, { errorMessage } from '../../api/client'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { formatMoney } from '../../utils/format'
import './facturacion.css'

const TariffForm = ({ initial, services, onClose, onSaved }) => {
  const [f, setF] = useState(() => ({ serviceId: String(initial?.serviceId || services[0]?.id || ''), name: initial?.name || '', code: initial?.code || '', price: initial?.price ?? '', active: initial?.active !== false, isDefault: Boolean(initial?.isDefault), ivaRate: String(initial?.ivaRate ?? 0), isPyp: Boolean(initial?.isPyp) }))
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const save = async () => {
    setErr('')
    if (!f.name.trim()) return setErr('Escribe el nombre del ítem.')
    if (f.price === '' || Number(f.price) < 0) return setErr('Escribe el valor.')
    setBusy(true)
    try { initial?.id ? await api.put(`/facturacion/tarifas/${initial.id}`, f) : await api.post('/facturacion/tarifas', f); onSaved() } catch (e) { setErr(errorMessage(e)); setBusy(false) }
  }
  return (
    <Modal title={initial?.id ? 'Editar ítem del tarifario' : 'Nuevo ítem del tarifario'} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        <div className="field"><label>Servicio <span className="req">*</span></label><select value={f.serviceId} onChange={set('serviceId')} disabled={Boolean(initial?.id)}>{services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>
        <div className="field"><label>Nombre del ítem <span className="req">*</span></label><input value={f.name} onChange={set('name')} placeholder="Ej: Cuadro hemático" autoFocus /></div>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Valor (COP) <span className="req">*</span></label><input type="number" min="0" step="500" value={f.price} onChange={set('price')} /></div>
          <div className="field"><label>Código (CUPS u otro)</label><input value={f.code} onChange={set('code')} placeholder="Opcional" /></div>
        </div>
        <div className="field"><label>IVA</label>
          <select value={f.ivaRate} onChange={set('ivaRate')}><option value="0">Excluido de IVA (servicio de salud, ET art. 476-1)</option><option value="19">Gravado 19 %</option><option value="5">Gravado 5 %</option></select>
          <span className="hint">Los servicios de salud humana van excluidos; solo estética u otros ítems no asistenciales se gravan.</span>
        </div>
        <label className="switch"><input type="checkbox" checked={f.isPyp} onChange={set('isPyp')} /> Promoción y prevención: sin copago ni cuota moderadora (Res. 3280 de 2018)</label>
        <label className="switch"><input type="checkbox" checked={f.isDefault} onChange={set('isDefault')} /> Ítem principal del servicio (se usa por defecto, por ejemplo al registrar una citología)</label>
        {initial?.id && <label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Activo' : 'Inactivo'}</label>}
        {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
      </div>
    </Modal>
  )
}

// Facturación → Tarifario: valores de cada ítem por servicio de IPS. Al facturar solo se eligen ítems.
const TariffPage = () => {
  const [toast, toastNode] = useToast()
  const [services, setServices] = useState([]); const [tariffs, setTariffs] = useState(null)
  const [modal, setModal] = useState(null)
  const load = useCallback(() => Promise.all([
    api.get('/servicios-ips').then(({ data }) => setServices(data.filter((s) => s.active !== false))),
    api.get('/facturacion/tarifas').then(({ data }) => setTariffs(data))
  ]).catch((e) => toast(errorMessage(e), 'bad')), [toast])
  useEffect(() => { load() }, [load])
  const remove = async (t) => { try { const { data } = await api.delete(`/facturacion/tarifas/${t.id}`); toast(data.deactivated ? 'El ítem ya se usó en facturas: quedó inactivo' : 'Ítem eliminado'); load() } catch (e) { toast(errorMessage(e), 'bad') } }
  return (
    <>
      <PageHead title="Tarifario" subtitle="Valor de cada ítem por servicio de la IPS. Al facturar se eligen ítems del tarifario; el valor no se escribe a mano">
        <button type="button" className="btn btn-primary" onClick={() => setModal({})} disabled={!services.length}><MdAdd /> Nuevo ítem</button>
      </PageHead>
      {!tariffs ? <div className="splash" style={{ minHeight: 200 }}><Spinner /></div> : (
        <div className="stack">
          {services.map((s) => {
            const list = tariffs.filter((t) => t.serviceId === s.id)
            return (
              <Card key={s.id} flush title={s.name} subtitle={`${list.filter((t) => t.active).length} ítem${list.filter((t) => t.active).length === 1 ? '' : 's'} activo${list.filter((t) => t.active).length === 1 ? '' : 's'}`} icon={<MdPriceChange style={{ color: 'var(--brand)' }} />}
                actions={<button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ serviceId: s.id })}><MdAdd /> Agregar ítem</button>}>
                {list.length === 0 ? <Empty icon={<MdPriceChange />}>Sin ítems: agrega los valores de este servicio.</Empty> : (
                  <div className="table-wrap"><table className="table">
                    <thead><tr><th>Ítem</th><th>Código</th><th>IVA</th><th className="num">Valor</th><th className="actions" /></tr></thead>
                    <tbody>{list.map((t) => (
                      <tr key={t.id} style={t.active ? undefined : { opacity: 0.55 }}>
                        <td><strong style={{ color: 'var(--ink)' }}>{t.name}</strong>{t.isDefault && <span className="badge brand" style={{ marginLeft: 6 }}><MdStar /> Principal</span>}{!t.active && <span className="badge" style={{ marginLeft: 6 }}>Inactivo</span>}{t.isPyp && <div className="hint">Promoción y prevención · sin copago ni cuota moderadora</div>}</td>
                        <td>{t.code || <span className="hint">—</span>}</td>
                        <td>{t.ivaRate ? <span className="badge warn">Gravado {t.ivaRate} %</span> : <span className="hint">Excluido</span>}</td>
                        <td className="num"><strong>{formatMoney(t.price)}</strong></td>
                        <td className="actions">
                          <button type="button" className="btn btn-ghost btn-icon" aria-label="Editar" onClick={() => setModal(t)}><MdEdit /></button>
                          <button type="button" className="btn btn-ghost btn-icon" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => remove(t)}><MdDelete /></button>
                        </td>
                      </tr>
                    ))}</tbody>
                  </table></div>
                )}
              </Card>
            )
          })}
        </div>
      )}
      {modal && <TariffForm initial={modal.id ? modal : { serviceId: modal.serviceId }} services={services} onClose={() => setModal(null)} onSaved={() => { setModal(null); toast('Tarifario actualizado'); load() }} />}
      {toastNode}
    </>
  )
}

export default TariffPage
