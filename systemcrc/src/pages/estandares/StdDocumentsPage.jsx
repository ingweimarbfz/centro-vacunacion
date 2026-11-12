import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  MdAdd, MdSearch, MdEdit, MdDelete, MdDownload, MdVisibility, MdErrorOutline, MdSave, MdFolderOpen,
  MdPictureAsPdf, MdImage, MdDescription, MdTableChart, MdInsertDriveFile, MdViewList, MdGridView, MdArticle, MdPrint, MdEditNote
} from 'react-icons/md'
import RichTextEditor, { htmlPage, printHtml } from '../../components/richtext/RichTextEditor'
import FileDrop from '../../components/FileDrop'
import api, { errorMessage, getSiteFilter } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'

const KIND = {
  pdf: ['PDF', MdPictureAsPdf, '#DC2626'], png: ['Imagen', MdImage, '#0EA5A4'], jpg: ['Imagen', MdImage, '#0EA5A4'], webp: ['Imagen', MdImage, '#0EA5A4'],
  doc: ['Word', MdDescription, '#2563EB'], docx: ['Word', MdDescription, '#2563EB'], xls: ['Excel', MdTableChart, '#16A34A'], xlsx: ['Excel', MdTableChart, '#16A34A'],
  html: ['En línea', MdArticle, '#7C3AED']
}
export const VAL = { vigente: ['Vigente hasta', 'ok'], por_vencer: ['Vence', 'warn'], vencido: ['Vencido', 'bad'] }
export const ACCEPT = '.pdf,.png,.jpg,.jpeg,.webp,.doc,.docx,.xls,.xlsx'
const MIME_BY_EXT = { pdf: 'application/pdf', png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', doc: 'application/msword', docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', xls: 'application/vnd.ms-excel', xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }
export const size = (b) => (b >= 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`)
export const date = (iso) => new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeZone: 'America/Bogota' }).format(new Date(iso))
export const isImage = (d) => ['png', 'jpg', 'webp'].includes(d.fileExt)
// Los documentos en línea se descargan como página HTML; los archivos, desde el almacenamiento.
export const downloadUrl = (d) => (d.isHtml ? `data:text/html;charset=utf-8,${encodeURIComponent(htmlPage(d.name, d.contentHtml))}` : `${d.fileUrl}?download=${encodeURIComponent(d.fileName)}`)
export const FILE_TYPES = [['pdf', 'PDF'], ['imagen', 'Imágenes'], ['word', 'Word'], ['excel', 'Excel'], ['html', 'En línea']]
export const readFile = (file) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(r.result); r.onerror = reject; r.readAsDataURL(file) })

export const FileIcon = ({ ext, big }) => {
  const [, I, color] = KIND[ext] || ['Archivo', MdInsertDriveFile, '#6B7280']
  return <span className={`sd-icon${big ? ' big' : ''}`} style={{ color, background: `${color}14` }}><I /></span>
}

// ---------------------------------------------------------------- Formulario
export const DocForm = ({ standard, cat, initial, sites, preset, html: htmlMode, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const html = editing ? Boolean(initial.isHtml) : Boolean(htmlMode)
  const [content, setContent] = useState(initial?.contentHtml || '')
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [f, setF] = useState(() => editing
    ? { name: initial.name, category: initial.category || '', code: initial.code || '', version: initial.version || '', observations: initial.observations || '', description: initial.description || '', siteId: initial.siteId ? String(initial.siteId) : 'general', requiredId: initial.requiredId ? String(initial.requiredId) : '', validUntil: initial.validUntil || '' }
    : { name: preset ? (cat.required.find((r) => r.id === preset)?.name || '') : '', category: '', code: '', version: '', observations: '', description: '', siteId: admin ? (getSiteFilter() ? String(getSiteFilter()) : 'general') : '', requiredId: preset ? String(preset) : '', validUntil: '' })
  const req = (cat.required || []).find((r) => String(r.id) === f.requiredId)
  const [file, setFile] = useState(null)
  const [error, setError] = useState(''); const [saving, setSaving] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const pick = (x) => {
    if (!x) return
    const ext = x.name.split('.').pop().toLowerCase()
    if (!MIME_BY_EXT[ext]) return setError('Tipo de archivo no permitido. Usa PDF, imágenes (PNG, JPG), Word o Excel.')
    if (x.size > cat.maxSize) return setError('El archivo supera 15 MB.')
    setError(''); setFile(x)
    if (!f.name.trim()) setF((v) => ({ ...v, name: x.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') }))
  }
  const submit = async (e) => {
    e.preventDefault(); setError('')
    if (!f.name.trim()) return setError('Escribe el nombre del documento.')
    if (html && !content.replace(/<[^>]*>|&nbsp;/g, '').trim() && !/<img/i.test(content)) return setError('Escribe el contenido del documento.')
    if (!html && !editing && !file) return setError('Selecciona el archivo.')
    if (req?.expires && !f.validUntil) return setError(`Indica hasta cuándo está vigente (${req.name}).`)
    setSaving(true)
    try {
      let payload = { ...f, ...(html ? { kind: 'html', contentHtml: content } : {}) }
      if (file) {
        const ext = file.name.split('.').pop().toLowerCase()
        const raw = await readFile(file)
        payload.file = { name: file.name, data: raw.replace(/^data:[^;]*;/, `data:${file.type || MIME_BY_EXT[ext]};`) }
      }
      if (!admin) delete payload.siteId
      const { data } = editing ? await api.put(`/estandares/documentos/${standard}/${initial.id}`, payload) : await api.post(`/estandares/documentos/${standard}`, payload)
      onSaved(data, editing)
    } catch (err) { setError(errorMessage(err)); setSaving(false) }
  }
  return (
    <Modal title={editing ? 'Editar documento' : html ? 'Crear documento en línea' : 'Cargar documento'} size={html ? 'lg' : undefined} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="submit" form="sd-form" className="btn btn-primary" disabled={saving}>{saving ? <Spinner /> : <MdSave />} {editing || html ? 'Guardar' : 'Cargar'}</button></>}>
      <form id="sd-form" onSubmit={submit} noValidate className="stack" style={{ gap: 14 }}>
        {!html && <div className="field"><label>Archivo {!editing && <span className="req">*</span>}</label>
          <FileDrop file={file} onPick={pick} accept={ACCEPT} current={editing ? initial.fileName : null} icon={file ? <FileIcon ext={file.name.split('.').pop().toLowerCase().replace('jpeg', 'jpg')} /> : null} placeholder="Arrastra el archivo o haz clic: PDF, imagen, Word o Excel (máx. 15 MB)" />
        </div>}
        <div className="field"><label>{html ? 'Título' : 'Nombre del documento'} <span className="req">*</span></label><input value={f.name} onChange={set('name')} placeholder={html ? 'Ej: Misión y visión' : 'Ej: Protocolo de lavado de manos'} /></div>
        {html && <>
          <div className="field"><label>Descripción</label><input value={f.description} onChange={set('description')} placeholder="Breve descripción del documento" /></div>
          <div className="field"><label>Contenido <span className="req">*</span></label><RichTextEditor value={content} onChange={setContent} /></div>
        </>}
        {(cat.required || []).length > 0 && (
          <div className="form-grid">
            <div className="field"><label>Documento obligatorio de la carpeta</label><select value={f.requiredId} onChange={set('requiredId')}><option value="">No corresponde a uno obligatorio</option>{cat.required.map((r) => <option key={r.id} value={r.id}>{r.code ? `${r.code}. ` : ''}{r.name}</option>)}</select></div>
            <div className="field"><label>Vigente hasta {req?.expires && <span className="req">*</span>}</label><input type="date" value={f.validUntil} onChange={set('validUntil')} /><span className="hint">{req?.expires ? 'Convenios y contratos: fecha de terminación' : 'Opcional'}</span></div>
          </div>
        )}
        <div className="form-grid">
          <div className="field"><label>Tipo de documento</label><select value={f.category} onChange={set('category')}><option value="">Sin clasificar</option>{cat.categories.map((c) => <option key={c} value={c}>{c}</option>)}</select></div>
          <div className="field"><label>Código</label><input value={f.code} onChange={set('code')} placeholder="Ej: SAL-PR-001" /></div>
          <div className="field"><label>Versión</label><input value={f.version} onChange={set('version')} placeholder="Ej: 01" /></div>
          {admin && <div className="field"><label>Aplica a</label><select value={f.siteId} onChange={set('siteId')}><option value="general">Todas las sedes (general)</option>{sites.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select></div>}
        </div>
        <div className="field"><label>Observaciones</label><textarea value={f.observations} onChange={set('observations')} placeholder="Descripción, a qué servicio aplica, fecha de aprobación…" style={{ minHeight: 70 }} /></div>
        {error && <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>}
      </form>
    </Modal>
  )
}

// ---------------------------------------------------------------- Visor
export const Viewer = ({ doc, onClose, onEdit }) => (
  <Modal title={doc.name} size="lg" onClose={onClose}
    footer={doc.isHtml
      ? <><span className="hint" style={{ marginRight: 'auto' }}>Documento en línea{doc.updatedAt ? ` · actualizado ${date(doc.updatedAt)}` : ''}</span>{onEdit && <button type="button" className="btn btn-outline" onClick={onEdit}><MdEditNote /> Editar</button>}<a className="btn btn-outline" download={doc.fileName} href={downloadUrl(doc)}><MdDownload /> Descargar</a><button type="button" className="btn btn-primary" onClick={() => printHtml(doc.name, doc.contentHtml)}><MdPrint /> Imprimir / PDF</button></>
      : <><span className="hint" style={{ marginRight: 'auto' }}>{doc.fileName} · {size(doc.fileSize)}</span><a className="btn btn-outline" href={doc.fileUrl} target="_blank" rel="noreferrer"><MdVisibility /> Abrir en otra pestaña</a><a className="btn btn-primary" download={doc.fileName} href={downloadUrl(doc)}><MdDownload /> Descargar</a></>}>
    {doc.isHtml ? (
      <>
        {doc.description && <p className="hint" style={{ margin: '0 0 10px' }}>{doc.description}</p>}
        {/* El HTML viene limpio del servidor (solo etiquetas y estilos de formato). */}
        <div className="rt-view rt-content" dangerouslySetInnerHTML={{ __html: doc.contentHtml || '' }} />
      </>
    ) : doc.fileExt === 'pdf' ? (
      // <object> muestra el PDF si el navegador tiene visor; si no (algunos celulares), ofrece abrirlo o descargarlo.
      <object data={`${doc.fileUrl}#view=FitH`} type="application/pdf" className="sd-frame" aria-label={doc.name}>
        <div className="sd-noview">
          <FileIcon ext="pdf" big />
          <strong>{doc.fileName}</strong>
          <span>Este navegador no muestra PDF dentro de la página. Ábrelo en otra pestaña o descárgalo.</span>
          <div style={{ display: 'flex', gap: 8 }}><a className="btn btn-outline" href={doc.fileUrl} target="_blank" rel="noreferrer"><MdVisibility /> Abrir</a><a className="btn btn-primary" download={doc.fileName} href={downloadUrl(doc)}><MdDownload /> Descargar</a></div>
        </div>
      </object>
    )
      : isImage(doc) ? <div className="sd-img"><img src={doc.fileUrl} alt={doc.name} /></div>
        : (
          <div className="sd-noview">
            <FileIcon ext={doc.fileExt} big />
            <strong>{KIND[doc.fileExt]?.[0] || 'Archivo'}: {doc.fileName}</strong>
            <span>Los archivos de Word y Excel no se pueden mostrar dentro del navegador. Descárgalo para abrirlo en tu equipo.</span>
            <a className="btn btn-primary" download={doc.fileName} href={downloadUrl(doc)}><MdDownload /> Descargar</a>
          </div>
        )}
    {doc.observations && <p style={{ margin: '12px 0 0', whiteSpace: 'pre-wrap', color: 'var(--ink-2)' }}><b>Observaciones:</b> {doc.observations}</p>}
  </Modal>
)

// Documentos de un estándar transversal: listado, búsqueda, carga, vista previa y descarga.
const StdDocumentsPage = ({ standard, title, subtitle, children }) => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [toast, toastNode] = useToast()
  const [cat, setCat] = useState(null)
  const [rows, setRows] = useState(null)
  const [sites, setSites] = useState([])
  const [error, setError] = useState('')
  const [q, setQ] = useState(''); const [category, setCategory] = useState(''); const [type, setType] = useState('')
  const [view, setView] = useState(() => { try { return localStorage.getItem('sd_view') || 'lista' } catch { return 'lista' } })
  const [modal, setModal] = useState(null)
  const load = useCallback(() => api.get(`/estandares/documentos/${standard}`).then(({ data }) => setRows(data)).catch((e) => { setError(errorMessage(e)); setRows([]) }), [standard])
  useEffect(() => { load(); api.get(`/estandares/documentos/${standard}/catalogos`).then(({ data }) => setCat(data)).catch(() => {}) }, [load, standard])
  useEffect(() => { if (admin) api.get('/sedes', { params: { sede: undefined } }).then(({ data }) => setSites(data)).catch(() => {}) }, [admin])
  const changeView = (v) => { setView(v); try { localStorage.setItem('sd_view', v) } catch { /* sin almacenamiento */ } }
  const filtered = useMemo(() => (rows || []).filter((d) => {
    if (category && (d.category || '') !== category) return false
    if (type && !({ pdf: ['pdf'], imagen: ['png', 'jpg', 'webp'], word: ['doc', 'docx'], excel: ['xls', 'xlsx'], html: ['html'] }[type] || []).includes(d.fileExt)) return false
    const t = q.trim().toLowerCase()
    return !t || [d.name, d.code, d.category, d.observations, d.description, d.fileName].some((v) => v && v.toLowerCase().includes(t))
  }), [rows, q, category, type])
  const counts = useMemo(() => (rows || []).reduce((a, d) => { const k = KIND[d.fileExt]?.[0] || 'Otro'; a[k] = (a[k] || 0) + 1; return a }, {}), [rows])
  const canDelete = (d) => admin || d.createdById === user.id
  const remove = async () => {
    try { await api.delete(`/estandares/documentos/${standard}/${modal.del.id}`); setModal(null); toast('Documento eliminado'); load() } catch (e) { setModal(null); toast(errorMessage(e), 'bad') }
  }

  return (
    <>
      <PageHead title={title} subtitle={subtitle}>
        <button type="button" className="btn btn-outline" onClick={() => setModal({ edit: {}, html: true })} disabled={!cat}><MdEditNote /> Crear en línea</button>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ edit: {} })} disabled={!cat}><MdAdd /> Cargar documento</button>
      </PageHead>
      {error && <div className="alert bad" style={{ marginBottom: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      {children}
      {rows && rows.length > 0 && (
        <div className="sd-counts">
          <span><b>{rows.length}</b> documento{rows.length === 1 ? '' : 's'}</span>
          {Object.entries(counts).map(([k, v]) => <span key={k}>{k}: <b>{v}</b></span>)}
        </div>
      )}
      <Card flush>
        <div className="table-toolbar">
          <div className="input-icon"><MdSearch /><input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre, código u observación" /></div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
            <select className="input" style={{ width: 200 }} value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Tipo de documento"><option value="">Todos los tipos</option>{(cat?.categories || []).map((c) => <option key={c} value={c}>{c}</option>)}</select>
            <select className="input" style={{ width: 150 }} value={type} onChange={(e) => setType(e.target.value)} aria-label="Formato"><option value="">Todos los formatos</option><option value="pdf">PDF</option><option value="imagen">Imágenes</option><option value="word">Word</option><option value="excel">Excel</option><option value="html">En línea</option></select>
            <div className="th-seg" role="group" aria-label="Vista">
              <button type="button" className={view === 'lista' ? 'on' : ''} onClick={() => changeView('lista')} aria-label="Lista"><MdViewList /></button>
              <button type="button" className={view === 'tarjetas' ? 'on' : ''} onClick={() => changeView('tarjetas')} aria-label="Tarjetas"><MdGridView /></button>
            </div>
          </div>
        </div>
        {!rows ? <div className="splash" style={{ minHeight: 160 }}><Spinner /></div> : filtered.length === 0 ? (
          <Empty icon={<MdFolderOpen />}>{rows.length ? 'No hay documentos con esos filtros.' : 'Aún no hay documentos. Carga el primero con “Cargar documento”.'}</Empty>
        ) : view === 'tarjetas' ? (
          <div className="sd-grid">{filtered.map((d) => (
            <div key={d.id} className="sd-card">
              <button type="button" className="sd-thumb" onClick={() => setModal({ view: d })} aria-label={`Ver ${d.name}`}>
                {isImage(d) ? <img src={d.fileUrl} alt="" loading="lazy" /> : <FileIcon ext={d.fileExt} big />}
              </button>
              <div className="sd-card-body">
                <strong title={d.name}>{d.name}</strong>
                <span>{[d.requiredName, d.category, d.code, d.version && `v${d.version}`].filter(Boolean).join(' · ') || 'Sin clasificar'}</span>{d.validUntil && <span className={`badge ${VAL[d.validity][1]}`} style={{ marginTop: 4 }}>{VAL[d.validity][0]} {date(d.validUntil + 'T12:00:00')}</span>}
                <small>{d.siteName || 'General'} · {date(d.updatedAt)}</small>
              </div>
              <div className="sd-card-actions">
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal({ view: d })} aria-label="Ver"><MdVisibility /></button>
                <a className="btn btn-ghost btn-icon btn-sm" download={d.fileName} href={downloadUrl(d)} aria-label="Descargar"><MdDownload /></a>
                <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setModal({ edit: d })} aria-label="Editar"><MdEdit /></button>
                {canDelete(d) && <button type="button" className="btn btn-ghost btn-icon btn-sm" style={{ color: 'var(--bad)' }} onClick={() => setModal({ del: d })} aria-label="Eliminar"><MdDelete /></button>}
              </div>
            </div>
          ))}</div>
        ) : (
          <div className="table-wrap"><table className="table">
            <thead><tr><th>Documento</th><th>Tipo</th><th>Código / versión</th><th>Aplica a</th><th>Actualizado</th><th className="actions" /></tr></thead>
            <tbody>{filtered.map((d) => (
              <tr key={d.id}>
                <td style={{ whiteSpace: 'normal', minWidth: 240 }}>
                  <button type="button" className="sd-name" onClick={() => setModal({ view: d })}>
                    <FileIcon ext={d.fileExt} />
                    <span><strong>{d.name}</strong>{d.description && <small>{d.description}</small>}{(d.requiredName || d.validUntil) && <small className="sd-tags">{d.requiredName && <span className="badge brand">{d.requiredName}</span>}{d.validUntil && <span className={`badge ${VAL[d.validity][1]}`}>{VAL[d.validity][0]} {date(d.validUntil + 'T12:00:00')}</span>}</small>}<small>{d.fileName} · {size(d.fileSize)}</small>{d.observations && <small className="sd-obs">{d.observations}</small>}</span>
                  </button>
                </td>
                <td>{d.category || <span className="hint">Sin clasificar</span>}</td>
                <td>{[d.code, d.version && `v${d.version}`].filter(Boolean).join(' · ') || '—'}</td>
                <td>{d.siteName || <span className="badge info">General</span>}</td>
                <td style={{ whiteSpace: 'nowrap' }}>{date(d.updatedAt)}<div className="hint">{d.updatedBy || d.createdBy || ''}</div></td>
                <td className="actions">
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => setModal({ view: d })} aria-label="Ver"><MdVisibility /></button>
                  <a className="btn btn-ghost btn-icon" download={d.fileName} href={downloadUrl(d)} aria-label="Descargar"><MdDownload /></a>
                  <button type="button" className="btn btn-ghost btn-icon" onClick={() => setModal({ edit: d })} aria-label="Editar"><MdEdit /></button>
                  {canDelete(d) && <button type="button" className="btn btn-ghost btn-icon" style={{ color: 'var(--bad)' }} onClick={() => setModal({ del: d })} aria-label="Eliminar"><MdDelete /></button>}
                </td>
              </tr>
            ))}</tbody>
          </table></div>
        )}
      </Card>
      {modal?.edit && cat && <DocForm standard={standard} cat={cat} sites={sites} initial={modal.edit.id ? modal.edit : null} html={modal.html} onClose={() => setModal(null)} onSaved={(d, e) => { setModal(null); toast(e ? 'Documento actualizado' : `“${d.name}” cargado`); load() }} />}
      {modal?.view && <Viewer doc={modal.view} onClose={() => setModal(null)} onEdit={() => setModal({ edit: modal.view })} />}
      {modal?.del && (
        <Modal title="Eliminar documento" size="sm" onClose={() => setModal(null)}
          footer={<><button type="button" className="btn btn-outline" onClick={() => setModal(null)}>Cancelar</button><button type="button" className="btn btn-danger" onClick={remove}><MdDelete /> Eliminar</button></>}>
          <p style={{ margin: 0 }}>¿Eliminar <b>{modal.del.name}</b> y su archivo? No se puede deshacer.</p>
        </Modal>
      )}
      {toastNode}
    </>
  )
}

export default StdDocumentsPage
