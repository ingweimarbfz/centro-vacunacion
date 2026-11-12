import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdInventory2, MdArrowForward, MdWarning, MdMedication, MdMedicalServices, MdScience, MdLock } from 'react-icons/md'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { hasModule } from '../../utils/permissions'
import { Card, Spinner } from '../../components/ui'

// Rememora el módulo al que se va (la barra lateral cambia a Operaciones Generales).
const go = (navigate, to) => { try { localStorage.setItem('cv_module', 'socorro') } catch { /* sin almacenamiento */ } navigate(to) }
const CATS = [['medicamento', 'Medicamentos', MdMedication], ['dispositivo_medico', 'Dispositivos médicos', MdMedicalServices], ['reactivo', 'Reactivos in vitro', MdScience]]

// Puente del estándar 4 con el inventario de Operaciones Generales: resumen y accesos directos.
const InventoryBridge = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const allowed = ['administrador', 'empleado'].includes(user.role) && hasModule(user, 'inventario')
  const [d, setD] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => { if (allowed) api.get('/inventario/resumen').then(({ data }) => setD(data)).catch(() => setErr(true)) }, [allowed])
  const cat = (k) => d?.byCategory.find((c) => c.key === k)
  const exp = (k) => (d?.expiring || []).filter((l) => l.product?.category === k)
  return (
    <div style={{ marginBottom: 18 }}>
      <Card title="Inventario de medicamentos, dispositivos e insumos" subtitle="El control de existencias, lotes, vencimientos y entregas se lleva en Operaciones Generales → Inventario y bodegas"
        icon={<MdInventory2 style={{ color: 'var(--brand)' }} />}
        actions={allowed ? <button type="button" className="btn btn-primary btn-sm" onClick={() => go(navigate, '/socorro/inventario')}>Ir al dashboard de inventario <MdArrowForward /></button> : null}>
        {!allowed ? (
          <div className="alert info" style={{ margin: 0 }}><MdLock /><span>No tienes habilitado el módulo de inventario. Pídele al administrador que lo active en Usuarios → Módulos.</span></div>
        ) : err ? <div className="alert warn" style={{ margin: 0 }}><MdWarning /><span>No se pudo cargar el resumen del inventario.</span></div>
          : !d ? <div className="splash" style={{ minHeight: 90 }}><Spinner /></div> : (
            <>
              <div className="ib-grid">{CATS.map(([k, label, I]) => {
                const c = cat(k); const e = exp(k)
                return (
                  <button key={k} type="button" className="ib-cat" onClick={() => go(navigate, `/socorro/inventario/existencias?categoria=${k}`)}>
                    <span className="icon-bubble brand"><I /></span>
                    <div><strong>{label}</strong><span>{c?.products || 0} productos · {c?.lines || 0} lotes · {(c?.units || 0).toLocaleString('es-CO')} unidades</span>
                      {e.length > 0 && <small className={e.some((l) => l.expired) ? 'bad' : 'warn'}><MdWarning /> {e.filter((l) => l.expired).length} vencidos · {e.filter((l) => !l.expired).length} por vencer</small>}</div>
                    <MdArrowForward className="ib-go" />
                  </button>
                )
              })}</div>
              <div className="ib-links">
                <button type="button" className="btn btn-outline btn-sm" onClick={() => go(navigate, '/socorro/inventario/existencias?vencimiento=proximos')}><MdWarning /> Próximos a vencer ({d.kpis.expiringSoon})</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => go(navigate, '/socorro/inventario/existencias?vencimiento=vencidos')}>Vencidos ({d.kpis.expired})</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => go(navigate, '/socorro/inventario/movimientos')}>Movimientos y entregas</button>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => go(navigate, '/socorro/inventario/productos')}>Catálogo de productos</button>
                {d.kpis.low > 0 && <span className="badge warn">{d.kpis.low} producto{d.kpis.low === 1 ? '' : 's'} bajo el mínimo</span>}
              </div>
            </>
          )}
      </Card>
    </div>
  )
}

export default InventoryBridge
