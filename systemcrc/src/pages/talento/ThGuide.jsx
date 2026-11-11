import React from 'react'
import { Link } from 'react-router-dom'
import { MdMenuBook, MdPrint } from 'react-icons/md'
import { useSettings } from '../../context/SettingsContext'
import { printedAt } from './common'
import '../../components/cytology.css'

const STEPS = [
  ['Configurar cargos y requisitos', 'En Cargos y requisitos se crean los cargos de la IPS (médico, enfermero jefe, auxiliar de enfermería, bacteriólogo, conductor de ambulancia, etc.) y se marcan los soportes que exige cada uno. Un requisito puede ser obligatorio u opcional, y puede vencer (por ejemplo, soporte vital básico cada 24 meses) o no (por ejemplo, el título profesional).'],
  ['Crear la hoja de vida', 'En Hojas de vida → Nueva hoja de vida se registran los datos personales, el perfil profesional (profesión, tarjeta profesional y ReTHUS), la seguridad social (EPS, ARL, pensiones y cesantías), el contacto de emergencia y el cargo. El cargo define qué se verifica.'],
  ['Cargar los soportes en PDF', 'Desde la hoja de vida, con Agregar curso / soporte, se carga cada certificado en PDF. Se elige el requisito al que corresponde o se registra como curso adicional. Si el certificado vence, se activa “El certificado vence” y se indica la fecha; si el requisito tiene vigencia en meses y no se escribe la fecha, el sistema la calcula desde la expedición.'],
  ['Verificar contra el original', 'Quien revisa compara el PDF con el documento original o con la fuente oficial (ReTHUS, universidad, entidad que expidió el curso) y marca el soporte como Verificado.'],
  ['Registrar el contrato', 'En Contratos se registra la vinculación vigente: tipo (término fijo, indefinido, prestación de servicios, etc.), fechas, horas semanales y el PDF firmado. El sistema avisa 30 días antes de la fecha de terminación.'],
  ['Diligenciar la lista de chequeo', 'Con Lista de chequeo el sistema propone el resultado de cada requisito según los soportes cargados: Cumple (C) si está vigente, No cumple (NC) si falta o está vencido. Quien verifica puede cambiar cada ítem, marcar No aplica (NA) y escribir observaciones. El resultado es “No cumple” si algún requisito obligatorio no cumple.'],
  ['Firmar', 'La lista de chequeo la firman quien verificó, el profesional verificado y la coordinación. La hoja de vida la firman el profesional y talento humano. Cada persona firma con su firma digital (Cuenta → Mi firma digital) y las firmas pendientes aparecen en su dashboard.'],
  ['Hacer seguimiento', 'El Dashboard de talento humano muestra el cumplimiento, los contratos y certificados por vencer, los requisitos faltantes y quién no tiene lista de chequeo en el último año. Se recomienda verificar a cada persona al ingresar, cada vez que renueve un soporte y al menos una vez al año.']
]

const CRITERIA = [
  ['C · Cumple', 'El soporte existe, es legible, corresponde a la persona y está vigente a la fecha de verificación.'],
  ['NC · No cumple', 'No hay soporte, está vencido, no corresponde al cargo o no se pudo verificar con la fuente.'],
  ['NA · No aplica', 'El requisito no aplica al servicio en que se desempeña la persona (se excluye del porcentaje).']
]

// Instructivo de diligenciamiento de la lista de chequeo de talento humano (lectura).
const ThGuide = () => {
  const { logo, settings } = useSettings()
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
          <dl className="cy-meta"><div><dt>Tipo</dt><dd>Instructivo</dd></div><div><dt>Estándar</dt><dd>1. Talento humano</dd></div></dl>
        </header>

        <section className="cy-section">
          <h3 className="cy-section-title"><MdMenuBook style={{ verticalAlign: '-2px' }} /> Objetivo</h3>
          <p>Orientar el registro y la verificación de los requisitos del talento humano de la IPS, de modo que cada profesional cuente con los soportes que exige su cargo (títulos, convalidaciones, tarjeta profesional, ReTHUS, certificados de formación y cursos vigentes) y que la IPS pueda demostrar su cumplimiento en las visitas de verificación del estándar de talento humano de las condiciones de habilitación.</p>
          <p><b>Alcance:</b> todo el personal asistencial y de apoyo vinculado a la IPS, cualquiera que sea su forma de vinculación.</p>
          <p><b>Responsables:</b> el área de talento humano o quien la IPS designe registra y verifica; la coordinación revisa y firma; cada profesional mantiene sus soportes al día.</p>
        </section>

        <section className="cy-section">
          <h3 className="cy-section-title">Paso a paso</h3>
          <ol className="th-steps">{STEPS.map(([t, d]) => <li key={t}><b>{t}.</b> {d}</li>)}</ol>
        </section>

        <section className="cy-section ev-table-section">
          <h3 className="cy-section-title">Criterios de calificación</h3>
          <table className="ev-table"><thead><tr><th style={{ width: '22%' }}>Calificación</th><th>Cuándo se usa</th></tr></thead>
            <tbody>{CRITERIA.map(([a, b]) => <tr key={a}><td><b>{a}</b></td><td>{b}</td></tr>)}</tbody></table>
        </section>

        <section className="cy-section">
          <h3 className="cy-section-title">Recomendaciones</h3>
          <ul className="th-steps">
            <li>Carga cada soporte como un PDF legible y completo (todas las páginas). Un archivo por certificado.</li>
            <li>Para los cursos que se renuevan, carga el nuevo certificado: el más reciente reemplaza al anterior en la verificación y el histórico se conserva.</li>
            <li>Actualiza los requisitos de cada cargo cuando cambie la norma o el portafolio de servicios; las alertas se recalculan solas.</li>
            <li>Marca como inactivo al personal retirado en lugar de eliminarlo, para conservar la trazabilidad.</li>
          </ul>
        </section>
        <footer className="cy-sheet-footer"><span>{settings.ipsName} · Instructivo lista de chequeo de talento humano</span><span>Impreso el {printedAt()}</span></footer>
      </article>
    </div>
  )
}

export default ThGuide
