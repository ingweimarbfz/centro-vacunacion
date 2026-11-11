import React from 'react'
import { Link } from 'react-router-dom'
import { MdMenuBook, MdPrint } from 'react-icons/md'
import { useSettings } from '../../context/SettingsContext'
import { printedAt, useCatalogs } from './common'
import '../../components/cytology.css'

const STEPS = [
  ['Configurar cargos y requisitos', 'Los ítems de la lista de chequeo ya están cargados por secciones (documentos, educación, experiencia, certificados y calidad). Los que aplican a todo el personal se exigen siempre; en Cargos y requisitos se crean los cargos y se marcan los adicionales de cada uno (por ejemplo ReTHUS, tarjeta profesional, SVA o COVE).'],
  ['Crear la hoja de vida', 'En Hojas de vida → Nueva hoja de vida se registran los datos del listado de talento humano: identificación, vinculación (cargo, profesión, especialidad, servicio, fecha de ingreso y estado), formación, habilitación legal (tarjeta, ReTHUS y su fecha de verificación) y seguridad social.'],
  ['Cargar los soportes en PDF', 'Desde la hoja de vida, con Agregar curso / soporte, se carga cada certificado en PDF. Se elige el requisito al que corresponde o se registra como curso adicional. Si el certificado vence, se activa “El certificado vence” y se indica la fecha; si el requisito tiene vigencia en meses y no se escribe la fecha, el sistema la calcula desde la expedición.'],
  ['Verificar contra el original', 'Quien revisa compara el PDF con el documento original o con la fuente oficial (ReTHUS, universidad, entidad que expidió el curso) y marca el soporte como Verificado.'],
  ['Registrar el contrato', 'En Contratos se registra la vinculación vigente: tipo (término fijo, indefinido, prestación de servicios, etc.), fechas, horas semanales y el PDF firmado. El sistema avisa 30 días antes de la fecha de terminación.'],
  ['Diligenciar la lista de chequeo', 'Con Lista de chequeo el sistema arma el formato con todos los ítems y propone Sí o No según los soportes cargados (faltantes, vencidos o antecedentes con más de 30 días al ingreso). Los ítems que no aplican al cargo quedan como No aplica con su justificación. Quien verifica revisa y ajusta cada ítem. El resultado es “No cumple” si algún requisito obligatorio quedó en No.'],
  ['Firmar', 'La lista de chequeo la firman quien revisó y quien verificó. La hoja de vida la firman el profesional y talento humano. Cada persona firma con su firma digital (Cuenta → Mi firma digital) y las firmas pendientes aparecen en su dashboard.'],
  ['Hacer seguimiento', 'El Dashboard de talento humano muestra el cumplimiento, los contratos y certificados por vencer, los requisitos faltantes y quién no tiene lista de chequeo en el último año. Se recomienda verificar a cada persona al ingresar, cada vez que renueve un soporte y al menos una vez al año.']
]

// Instructivo de diligenciamiento de la lista de chequeo de talento humano (lectura).
const ThGuide = () => {
  const { logo, settings } = useSettings()
  const cat = useCatalogs()
  return (
    <div className="cy-detail-page">
      <div className="cy-toolbar no-print">
        <Link to="/estandares/talento-humano" className="btn btn-outline">← Talento humano</Link>
        <button type="button" className="btn btn-primary" onClick={() => window.print()}><MdPrint /> Imprimir / Guardar PDF</button>
      </div>
      <article className="cy-sheet ev-sheet th-guide">
        <header className="cy-sheet-header">
          <img src={logo} alt={settings.ipsName} className="cy-logo" />
          <div className="cy-sheet-heading">
            <p className="cy-kicker">{settings.shortName} · Estándar de talento humano</p>
            <h2>Instructivo de diligenciamiento de la lista de chequeo</h2>
          </div>
          <dl className="cy-meta"><div><dt>Tipo</dt><dd>Instructivo</dd></div><div><dt>Formato</dt><dd>{cat?.formats?.chequeo?.code || 'Lista de chequeo'}</dd></div></dl>
        </header>

        <section className="cy-section">
          <h3 className="cy-section-title"><MdMenuBook style={{ verticalAlign: '-2px' }} /> 1. Objetivo</h3>
          <p>Establecer los lineamientos para la verificación, control y registro de los documentos requeridos en la hoja de vida del talento humano en salud, garantizando el cumplimiento de los requisitos legales, técnicos y de calidad exigidos para la prestación de servicios de salud.</p>
          <h3 className="cy-section-title">2. Alcance</h3>
          <p>Aplica para todo el personal asistencial y administrativo vinculado a la IPS, previo a su ingreso y durante su permanencia.</p>
          <h3 className="cy-section-title">3. Responsable</h3>
          <p>El diligenciamiento del formato es responsabilidad del área administrativa, talento humano o quien haga sus veces en la IPS.</p>
          <h3 className="cy-section-title">4. Instrucciones generales</h3>
          <ul className="th-steps">
            <li>El formato debe diligenciarse por cada colaborador.</li>
            <li>Debe ser completado en su totalidad antes del inicio de actividades laborales.</li>
            <li>Se debe verificar que los documentos estén legibles, completos, vigentes y organizados.</li>
            <li>Los documentos pueden estar en medio físico o digital, pero deben estar disponibles para auditoría.</li>
            <li>Toda la información consignada debe ser verificable.</li>
          </ul>
          <h3 className="cy-section-title">5. Diligenciamiento del encabezado</h3>
          <ul className="th-steps">
            <li><b>Nombre completo:</b> registrar nombres y apellidos del colaborador.</li>
            <li><b>Cédula de ciudadanía:</b> número completo sin puntos.</li>
            <li><b>Denominación del cargo:</b> cargo para el cual fue contratado.</li>
          </ul>
          <h3 className="cy-section-title">6. Diligenciamiento de la lista de chequeo</h3>
          <p>Para cada ítem:</p>
          <ul className="th-steps">
            <li>Marcar con una “X” en la columna <b>Sí</b> si el documento cumple.</li>
            <li>Marcar con una “X” en la columna <b>No</b> si el documento no cumple o no se encuentra.</li>
            <li>Registrar en la columna <b>Obs</b>: documentos faltantes, documentos vencidos, inconsistencias y la justificación de “No aplica” cuando corresponda.</li>
          </ul>
          <h3 className="cy-section-title">7. Consideraciones específicas</h3>
          <ul className="th-steps">
            <li><b>Documentos legales y académicos:</b> deben corresponder al perfil del cargo. La inscripción en ReTHUS es obligatoria para el talento humano en salud.</li>
            <li><b>Cursos obligatorios:</b> deben estar vigentes según la normatividad aplicable (2 años) y aplican según el tipo de servicio prestado.</li>
            <li><b>Certificados de experiencia:</b> deben cumplir los requisitos establecidos en el formato y estar organizados cronológicamente (más reciente primero).</li>
            <li><b>Certificados de antecedentes:</b> no deben superar los 30 días de expedición.</li>
            <li><b>Afiliaciones al sistema de seguridad social:</b> deben estar activas al momento del ingreso.</li>
            <li><b>Componente de calidad:</b> debe evidenciarse la inducción institucional, el conocimiento de políticas y la firma de confidencialidad.</li>
          </ul>
          <h3 className="cy-section-title">8. Cierre del formato</h3>
          <p>El formato debe contar con el nombre y la firma del responsable de la verificación y la fecha de diligenciamiento.</p>
        </section>

        <section className="cy-section">
          <h3 className="cy-section-title">Cómo se hace en el sistema</h3>
          <ol className="th-steps">{STEPS.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}</ol>
        </section>

        <footer className="cy-sheet-footer"><span>{settings.ipsName} · Instructivo lista de chequeo de talento humano</span><span>Impreso el {printedAt()}</span></footer>
      </article>
    </div>
  )
}

export default ThGuide
