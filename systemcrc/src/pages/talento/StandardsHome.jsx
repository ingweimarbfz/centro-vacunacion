import React from 'react'
import { Link } from 'react-router-dom'
import { MdFolderShared, MdGroups, MdApartment, MdMedicalServices, MdMedication, MdAccountTree, MdHistoryEdu, MdHub, MdArrowForward, MdLock } from 'react-icons/md'
import { PageHead } from '../../components/ui'

// Estándares transversales de habilitación. Cada uno se habilita a medida que se construye su módulo.
const STANDARDS = [
  { n: 0, name: 'Documentos generales de talento humano', icon: MdFolderShared, to: '/estandares/talento-humano/instructivo', ready: true, desc: 'Instructivo y formatos generales del estándar.' },
  { n: 1, name: 'Talento humano', icon: MdGroups, to: '/estandares/talento-humano', ready: true, desc: 'Hojas de vida, soportes, contratos, lista de chequeo y alertas.' },
  { n: 2, name: 'Infraestructura', icon: MdApartment, desc: 'Condiciones de las áreas y ambientes de la IPS.' },
  { n: 3, name: 'Dotación', icon: MdMedicalServices, to: '/equipos', ready: 'equipos', desc: 'Equipos biomédicos y su mantenimiento (hoy en IPS → Hoja de vida de equipos).' },
  { n: 4, name: 'Medicamentos, dispositivos médicos e insumos', icon: MdMedication, desc: 'Inventario, cadena de frío y vencimientos.' },
  { n: 5, name: 'Procesos prioritarios', icon: MdAccountTree, desc: 'Guías, protocolos y procesos asistenciales.' },
  { n: 6, name: 'Historia clínica y registros', icon: MdHistoryEdu, desc: 'Gestión de la historia clínica y registros asistenciales.' },
  { n: 7, name: 'Interdependencia', icon: MdHub, desc: 'Servicios de apoyo propios o contratados.' }
]

const StandardsHome = () => (
  <>
    <PageHead title="Estándares transversales" subtitle="Condiciones de habilitación que aplican a todos los servicios de la IPS" />
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
  </>
)

export default StandardsHome
