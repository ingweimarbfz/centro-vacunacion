import { useState, useEffect, useCallback } from 'react'
import api, { errorMessage } from '../api/client'
import useServiceInvoice from './useServiceInvoice'
import { sanitize, check } from '../utils/validate'

const PHONE_RE = /^[0-9]{10}$/
const EMAIL_RE = /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i

const EMPTY = {
  fechaExamen: '', numLamina: '', eps: '', valor: '', entidad: '', regimen: '',
  nombre: '', apellidos: '', fechaNacimiento: '', tipoDocumento: '', numDocumento: '', lugarExped: '',
  direccion: '', celular: '', email: '', municipio: '', solicitudServ: '', ocupacion: '', estadoCivil: '',
  contacto: '', direccionContacto: '', celularContacto: '',
  ciclosMenstruales: '', fur: '', fup: '', g: '', p: '', a: '', anticonceptivoActual: '', tiempo: '',
  edadPrimerCoito: '', resultUltCitolog: '', fechaUltCitolog: '', tomadaEn: '', tratamientos: '', observaciones: '',
  sano: false, normal: false, cupula: false, tomaVaginal: false, endoCerrado: false, polipo: false,
  quistes: false, lecorrea: false, sangra: false, erosionado: false, sinEspecificar: false,
  fechaRecibido: '', elabora: '', tomaMuestra: '',
  applyDiscount: false, discountId: '', entityId: '', epsId: '', paymentMode: 'contado'
}

const PHONE_FIELDS = ['celular', 'celularContacto']

// Edad en años cumplidos entre dos fechas YYYY-MM-DD
export const calcAge = (birth, ref) => {
  if (!birth || !ref) return ''
  const [by, bm, bd] = birth.split('-').map(Number)
  const [ry, rm, rd] = ref.split('-').map(Number)
  const age = ry - by - (rm < bm || (rm === bm && rd < bd) ? 1 : 0)
  return age >= 0 && age <= 120 ? age : ''
}

const validate = (d) => {
  const e = {}
  if (!d.nombre.trim()) e.nombre = 'Requerido'
  if (!d.apellidos.trim()) e.apellidos = 'Requerido'
  if (!d.numDocumento.trim()) e.numDocumento = 'Requerido'
  else if (check.doc(d.numDocumento, d.tipoDocumento)) e.numDocumento = check.doc(d.numDocumento, d.tipoDocumento)
  if (!d.fechaNacimiento) e.fechaNacimiento = 'Requerido'
  else if (calcAge(d.fechaNacimiento, d.fechaExamen) === '') e.fechaNacimiento = 'Fecha no válida'
  if (!PHONE_RE.test(d.celular)) e.celular = 'Debe tener 10 dígitos'
  if (d.celularContacto && !PHONE_RE.test(d.celularContacto)) e.celularContacto = 'Debe tener 10 dígitos'
  if (d.email && !EMAIL_RE.test(d.email.trim())) e.email = 'Correo no válido'
  if (!d.elabora) e.elabora = 'Selecciona un empleado'
  if (!d.tomaMuestra) e.tomaMuestra = 'Selecciona un empleado'
  return e
}

const useRegisterCytology = () => {
  const [dataCytology, setDataCytology] = useState(EMPTY)
  const [defaults, setDefaults] = useState({ valor: '', fechaHoy: '', siguienteFactura: '', siguienteLamina: '' })
  const [empleados, setEmpleados] = useState([])
  const [entities, setEntities] = useState([])
  const [epsList, setEpsList] = useState([])
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const [messageSuccess, setMessageSuccess] = useState('')
  const [messageCancel, setMessageCancel] = useState('')
  // Factura previa (Facturación → Servicios facturables): al elegirla se llenan la paciente (si la factura la tiene) y la EPS.
  const onInvoice = useCallback((inv) => {
    setErrors((prev) => ({ ...prev, invoice: undefined }))
    setDataCytology((prev) => ({
      ...prev,
      ...(inv.docNumber ? { nombre: inv.names || prev.nombre, apellidos: inv.surnames || prev.apellidos, tipoDocumento: inv.docType || prev.tipoDocumento, numDocumento: inv.docNumber } : {}),
      epsId: inv.epsId ? String(inv.epsId) : ''
    }))
  }, [])
  const inv = useServiceInvoice('citologia', onInvoice)
  const { billingOn, invoice } = inv

  const loadDefaults = useCallback(async () => {
    try {
      const { data } = await api.get('/citologias/datos-formulario')
      setDefaults({ valor: data.valor ?? '', fechaHoy: data.fechaHoy, siguienteFactura: data.siguienteFactura, siguienteLamina: data.siguienteLamina })
      setEmpleados(data.empleados)
      api.get('/proveedores', { params: { categoria: 'toma_muestras,laboratorio' } }).then(({ data: es }) => setEntities(es.filter((x) => x.active))).catch(() => setEntities([]))
      api.get('/eps').then(({ data: es }) => setEpsList(es.filter((x) => x.active))).catch(() => setEpsList([]))
      setDataCytology((prev) => ({
        ...prev,
        fechaExamen: prev.fechaExamen || data.fechaHoy,
        valor: prev.valor === '' ? String(data.valor ?? '') : prev.valor
      }))
    } catch (error) {
      setMessageCancel('No se pudieron cargar el precio y los empleados. Revisa que el servidor esté encendido.')
    }
  }, [])

  useEffect(() => { loadDefaults() }, [loadDefaults])

  const handleChange = (e) => {
    const { name } = e.target
    let { value } = e.target
    if (PHONE_FIELDS.includes(name)) value = value.replace(/\D/g, '').slice(0, 10)
    if (name === 'numDocumento') value = sanitize.doc(value, dataCytology.tipoDocumento)
    setDataCytology((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: undefined }))
  }

  // Checkboxes del "Aspecto del cuello"
  const handleOptionChange = (e) => {
    const { name, checked } = e.target
    setDataCytology((prev) => ({ ...prev, [name]: checked }))
  }

  const edad = calcAge(dataCytology.fechaNacimiento, dataCytology.fechaExamen)

  const InsertCytology = async () => {
    setMessageCancel('')
    setMessageSuccess('')
    const found = validate(dataCytology)
    if (billingOn && !invoice) found.invoice = 'Busca y elige la factura de la citología'
    setErrors(found)
    if (Object.keys(found).length) {
      setMessageCancel('Revisa los campos marcados en rojo.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
      return
    }
    setSaving(true)
    try {
      // eslint-disable-next-line no-unused-vars
      const { applyDiscount, discountId, entityId, epsId, paymentMode, ...rest } = dataCytology
      const { data } = await api.post('/registrar-toma-de-muestras-citologicas', { ...rest, email: dataCytology.email.trim(), entityId: Number(entityId) || undefined, epsId: Number(epsId) || undefined, invoiceId: invoice?.id })
      setMessageSuccess(data.numFactura ? `Citología registrada: factura ${data.numFactura}, lámina ${data.numLamina}` : `Citología registrada: lámina ${data.numLamina}. Queda por facturar.`)
      inv.reset()
      setTimeout(() => setMessageSuccess(''), 8000)
      setDataCytology(EMPTY)
      setErrors({})
      window.scrollTo({ top: 0, behavior: 'smooth' })
      loadDefaults()
    } catch (error) {
      setMessageCancel(errorMessage(error, 'Error al enviar los datos'))
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setSaving(false)
    }
  }

  return {
    dataCytology, selectedOptions: dataCytology, handleChange, handleOptionChange, InsertCytology,
    messageSuccess, messageCancel, errors, empleados, defaults, edad, saving, entities, epsList,
    billingOn, invoice, inv
  }
}

export default useRegisterCytology
