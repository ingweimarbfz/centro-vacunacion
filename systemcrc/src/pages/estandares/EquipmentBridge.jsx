import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { MdMedicalServices, MdArrowForward, MdWarning, MdBuild, MdLock, MdCheckCircle } from 'react-icons/md'
import api from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { hasModule } from '../../utils/permissions'
import { Card, Spinner } from '../../components/ui'

const go = (navigate, to) => { try { localStorage.setItem('cv_module', 'ips') } catch { /* sin almacenamiento */ } navigate(to) }
const money = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n || 0)

// Puente del estándar de infraestructura con IPS → Equipos e infraestructura (hoja de vida de equipos).
const EquipmentBridge = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const allowed = ['administrador', 'empleado'].includes(user.role) && hasModule(user, 'equipos')
  const [d, setD] = useState(null)
  const [err, setErr] = useState(false)
  useEffect(() => { if (allowed) api.get('/equipos-resumen').then(({ data }) => setD(data)).catch(() => setErr(true)) }, [allowed])
  const bad = (d?.alerts || []).filter((a) => a.level === 'bad').length
  return (
    <div style={{ marginBottom: 18 }}>
      <Card title="Equipos e infraestructura" subtitle="La hoja de vida de cada equipo (biomédicos, refrigeración, planta eléctrica, aires…) y sus mantenimientos se llevan en IPS → Equipos e infraestructura"
        icon={<MdMedicalServices style={{ color: 'var(--brand)' }} />}
        actions={allowed ? <button type="button" className="btn btn-primary btn-sm" onClick={() => go(navigate, '/equipos')}>Ir a hoja de vida de equipos <MdArrowForward /></button> : null}>
        {!allowed ? (
          <div className="alert info" style={{ margin: 0 }}><MdLock /><span>No tienes habilitado el módulo de equipos (o tu sede no tiene servicios de IPS). Pídele acceso al administrador.</span></div>
        ) : err ? <div className="alert warn" style={{ margin: 0 }}><MdWarning /><span>No se pudo cargar el resumen de equipos.</span></div>
          : !d ? <div className="splash" style={{ minHeight: 90 }}><Spinner /></div> : (
            <>
              <div className="ib-grid">
                <button type="button" className="ib-cat" onClick={() => go(navigate, '/equipos')}>
                  <span className="icon-bubble brand"><MdMedicalServices /></span>
                  <div><strong>{d.total} equipos activos</strong><span>{d.byCategory.map((c) => `${c.name}: ${c.value}`).join(' · ') || 'Sin equipos'}</span></div><MdArrowForward className="ib-go" />
                </button>
                <button type="button" className="ib-cat" onClick={() => go(navigate, '/equipos')}>
                  <span className="icon-bubble brand"><MdBuild /></span>
                  <div><strong>{d.yearMaintenance.count} mantenimientos este año</strong><span>{d.yearMaintenance.preventive} preventivos · {d.yearMaintenance.corrective} correctivos · {money(d.yearMaintenance.cost)}</span></div><MdArrowForward className="ib-go" />
                </button>
                <button type="button" className="ib-cat" onClick={() => go(navigate, '/equipos')}>
                  <span className={`icon-bubble ${bad ? 'bad' : d.dueSoon ? 'warn' : 'brand'}`}>{bad || d.dueSoon ? <MdWarning /> : <MdCheckCircle />}</span>
                  <div><strong>{d.alerts.length} alerta{d.alerts.length === 1 ? '' : 's'}</strong><span>{d.dueSoon} preventivo{d.dueSoon === 1 ? '' : 's'} próximo{d.dueSoon === 1 ? '' : 's'} · {bad} crítica{bad === 1 ? '' : 's'}</span></div><MdArrowForward className="ib-go" />
                </button>
              </div>
              {d.alerts.length > 0 && (
                <ul className="ib-alerts">{d.alerts.slice(0, 4).map((a, i) => (
                  <li key={i}><button type="button" onClick={() => go(navigate, `/equipos/${a.equipmentId}`)}><MdWarning className={a.level} /> <b>{a.code}</b> {a.name}: {a.message}</button></li>
                ))}</ul>
              )}
            </>
          )}
      </Card>
    </div>
  )
}

export default EquipmentBridge
