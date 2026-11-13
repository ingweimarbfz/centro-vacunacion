import React from 'react'
import { Link } from 'react-router-dom'
import { MdGroups, MdApartment, MdMedicalServices, MdMedication, MdAccountTree, MdHistoryEdu, MdHub, MdArrowForward, MdLock } from 'react-icons/md'
import { PageHead } from '../../components/ui'

// Estándares transversales de habilitación. Cada uno se habilita a medida que se construye su módulo.
const STANDARDS = [
  { n: 1, name: 'Talento humano', icon: MdGroups, to: '/estandares/talento-humano', ready: true, desc: 'Hojas de vida, soportes, contratos, lista de chequeo, alertas e instructivo del formato.' },
  { n: 2, name: 'Infraestructura', icon: MdApartment, to: '/estandares/infraestructura', ready: true, desc: 'Carpeta obligatoria, actividades de seguimiento, documentos y acceso a la hoja de vida de equipos.' },
  { n: 3, name: 'Dotación', icon: MdMedicalServices, to: '/equipos', ready: 'equipos', desc: 'Equipos biomédicos y su mantenimiento (hoy en IPS → Hoja de vida de equipos).' },
  { n: 4, name: 'Medicamentos, dispositivos médicos e insumos', icon: MdMedication, to: '/estandares/medicamentos', ready: true, desc: 'Documentos del estándar y acceso al inventario de Operaciones Generales (existencias, vencimientos y bodegas).' },
  { n: 5, name: 'Procesos prioritarios', icon: MdAccountTree, to: '/estandares/procesos-prioritarios', ready: true, desc: 'Guías, protocolos, procedimientos y formatos (PDF, imágenes, Word y Excel).' },
  { n: 6, name: 'Historia clínica y registros', icon: MdHistoryEdu, to: '/estandares/historia-clinica', ready: true, desc: 'Carpeta obligatoria (manual, formatos, custodia, archivo, consentimiento, auditoría y comité), documentos y verificación.' },
  { n: 7, name: 'Interdependencia', icon: MdHub, to: '/estandares/interdependencia', ready: true, desc: 'Carpeta obligatoria (convenios, contratos, directorio y procedimiento), documentos y verificación.' }
]

// Cuadrícula de accesos a cada estándar (se usa también arriba del dashboard general).
export const StandardsGrid = () => (
    <div className="th-standards">{STANDARDS.map((s) => {
      const body = (
        <>
          <span className="th-std-n">{s.n}</span>
          <span className="icon-bubble brand"><s.icon /></span>
          <div className="grow"><strong>{s.name}</strong><span>{s.desc}</span></div>
          {s.ready ? <MdArrowForward className="th-std-go" /> : <span className="badge"><MdLock /> Próximamente</span>}
        </>
      )
      return s.ready ? <Link key={s.n} to={s.to} className="card th-std">{body}</Link> : <div key={s.n} className="card th-std off">{body}</div>
    })}</div>
)

const StandardsHome = () => (
  <>
    <PageHead title="Estándares transversales" subtitle="Condiciones de habilitación que aplican a todos los servicios de la IPS" />
    <StandardsGrid />
  </>
)

export default StandardsHome
