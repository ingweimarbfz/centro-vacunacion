import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  MdAdd, MdSearch, MdEdit, MdDelete, MdDownload, MdVisibility, MdErrorOutline, MdSave, MdUploadFile, MdFolder, MdFolderOpen,
  MdCreateNewFolder, MdChevronRight, MdExpandMore, MdEditNote
} from 'react-icons/md'
import RichTextEditor from '../../components/richtext/RichTextEditor'
import FileDrop from '../../components/FileDrop'
import api, { errorMessage } from '../../api/client'
import { useAuth } from '../../context/AuthContext'
import { PageHead, Card, Modal, Empty, Spinner, useToast } from '../../components/ui'
import { FileIcon, Viewer, VAL, ACCEPT, readFile, downloadUrl, size, date, FILE_TYPES } from '../estandares/StdDocumentsPage'
import './calidad.css'

const ordered = (folders, parentId = null, depth = 0) => folders.filter((f) => f.parentId === parentId).flatMap((f) => [{ ...f, depth }, ...ordered(folders, f.id, depth + 1)])

// Carpeta: ítem principal (nivel 1, con tipo) o subcarpeta (hasta el 3.er nivel).
const FolderForm = ({ initial, parent, kinds, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const level = editing ? initial.level : parent ? parent.level + 1 : 1
  const [f, setF] = useState({ name: initial?.name || '', code: initial?.code || '', kind: initial?.kind || kinds[0], description: initial?.description || '', sortOrder: initial?.sortOrder ?? 0, active: initial?.active !== false })
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.type === 'checkbox' ? e.target.checked : e.target.value })
  const save = async () => {
    setErr(''); setBusy(true)
    try { editing ? await api.put(`/calidad/carpetas/${initial.id}`, f) : await api.post('/calidad/carpetas', { ...f, parentId: parent?.id }); onSaved() } catch (e) { setErr(errorMessage(e)); setBusy(false) }
  }
  return (
    <Modal title={editing ? `Editar · ${initial.name}` : level === 1 ? 'Nuevo ítem principal' : `Nueva subcarpeta en ${parent.name}`} size="sm" onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Número</label><input value={f.code} onChange={set('code')} placeholder={level === 1 ? '1' : '1.1'} /></div>
          <div className="field"><label>Orden</label><input type="number" value={f.sortOrder} onChange={set('sortOrder')} /></div>
        </div>
        <div className="field"><label>Nombre <span className="req">*</span></label><input value={f.name} onChange={set('name')} autoFocus placeholder={level === 1 ? 'Ej: Direccionamiento estratégico' : 'Ej: Políticas institucionales'} /></div>
        {level === 1 && <div className="field"><label>Tipo de ítem</label><select value={f.kind} onChange={set('kind')}>{kinds.map((k) => <option key={k}>{k}</option>)}</select><span className="hint">Sirve para filtrar los ítems y sus documentos.</span></div>}
        <div className="field"><label>Descripción</label><input value={f.description} onChange={set('description')} placeholder="Qué documentos van aquí" /></div>
        {editing && <label className="switch"><input type="checkbox" checked={f.active} onChange={set('active')} /> {f.active ? 'Activa' : 'Inactiva'}</label>}
        <span className="hint">Nivel {level} de 3.</span>
        {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
      </div>
    </Modal>
  )
}

// Documento o formato dentro de una carpeta.
// Documento o formato dentro de una carpeta: archivo cargado o documento en línea (texto con formato).
const DocForm = ({ initial, folders, folderId, categories, html: htmlMode, onClose, onSaved }) => {
  const editing = Boolean(initial?.id)
  const html = editing ? Boolean(initial.isHtml) : Boolean(htmlMode)
  const [content, setContent] = useState(initial?.contentHtml || '')
  const [f, setF] = useState({ name: initial?.name || '', folderId: String(initial?.folderId || folderId || ''), category: initial?.category || '', code: initial?.code || '', version: initial?.version || '', validUntil: initial?.validUntil || '', observations: initial?.observations || '', description: initial?.description || '' })
  const [file, setFile] = useState(null)
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false)
  const set = (k) => (e) => setF({ ...f, [k]: e.target.value })
  const pick = (x) => { setFile(x || null); if (x && !f.name) setF((y) => ({ ...y, name: x.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ') })) }
  const save = async () => {
    setErr('')
    if (!f.folderId) return setErr('Elige la carpeta.')
    if (html && !f.name.trim()) return setErr('Escribe el título.')
    if (html && !content.replace(/<[^>]*>|&nbsp;/g, '').trim() && !/<img/i.test(content)) return setErr('Escribe el contenido del documento.')
    if (!html && !editing && !file) return setErr('Elige el archivo.')
    if (file && file.size > 15 * 1024 * 1024) return setErr('El archivo supera 15 MB.')
    setBusy(true)
    try {
      const body = { ...f, ...(html ? { kind: 'html', contentHtml: content } : file ? { file: { name: file.name, data: await readFile(file) } } : {}) }
      editing ? await api.put(`/calidad/documentos/${initial.id}`, body) : await api.post('/calidad/documentos', body)
      onSaved()
    } catch (e) { setErr(errorMessage(e)); setBusy(false) }
  }
  return (
    <Modal title={editing ? 'Editar documento' : html ? 'Crear documento en línea' : 'Cargar documento'} size={html ? 'lg' : undefined} onClose={onClose}
      footer={<><button type="button" className="btn btn-outline" onClick={onClose}>Cancelar</button><button type="button" className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <Spinner /> : <MdSave />} Guardar</button></>}>
      <div className="stack" style={{ gap: 12 }}>
        {!html && <div className="field"><label>Archivo {!editing && <span className="req">*</span>}</label><FileDrop file={file} onPick={pick} accept={ACCEPT} current={editing ? initial.fileName : null} icon={file ? <FileIcon ext={file.name.split('.').pop().toLowerCase().replace('jpeg', 'jpg')} /> : null} placeholder="Arrastra el archivo o haz clic: PDF, imagen, Word o Excel (máx. 15 MB)" /></div>}
        <div className="field"><label>Carpeta <span className="req">*</span></label>
          <select value={f.folderId} onChange={set('folderId')}><option value="">Selecciona…</option>{ordered(folders).map((x) => <option key={x.id} value={x.id}>{'  '.repeat(x.depth * 2)}{x.code ? `${x.code}. ` : ''}{x.name}</option>)}</select>
        </div>
        <div className="field"><label>{html ? 'Título' : 'Nombre'} <span className="req">*</span></label><input value={f.name} onChange={set('name')} placeholder={html ? 'Ej: Misión y visión' : undefined} /></div>
        {html && <>
          <div className="field"><label>Descripción</label><input value={f.description} onChange={set('description')} placeholder="Breve descripción del documento" /></div>
          <div className="field"><label>Contenido <span className="req">*</span></label><RichTextEditor value={content} onChange={setContent} /></div>
        </>}
        <div className="grid grid-2" style={{ gap: 12 }}>
          <div className="field"><label>Tipo de documento</label><select value={f.category} onChange={set('category')}><option value="">—</option>{categories.map((c) => <option key={c}>{c}</option>)}</select></div>
          <div className="field"><label>Código</label><input value={f.code} onChange={set('code')} /></div>
          <div className="field"><label>Versión</label><input value={f.version} onChange={set('version')} /></div>
          <div className="field"><label>Vigente hasta</label><input type="date" value={f.validUntil} onChange={set('validUntil')} /></div>
        </div>
        <div className="field"><label>Observaciones</label><input value={f.observations} onChange={set('observations')} /></div>
        {err && <div className="alert bad"><MdErrorOutline /><span>{err}</span></div>}
      </div>
    </Modal>
  )
}

// Calidad IPS → Doc. Generales: ítems principales y carpetas (hasta 3 niveles) con sus documentos.
const DocGeneralesPage = () => {
  const { user } = useAuth()
  const admin = user.role === 'administrador'
  const [params] = useSearchParams()
  const [toast, toastNode] = useToast()
  const [meta, setMeta] = useState(null); const [docs, setDocs] = useState(null)
  const [sel, setSel] = useState(Number(params.get('carpeta')) || null)
  const [open, setOpen] = useState({})
  const [f, setF] = useState({ q: '', tipoItem: '', tipo: '', subcarpetas: true })
  const [modal, setModal] = useState(null)
  const loadTree = useCallback(() => api.get('/calidad/carpetas').then(({ data }) => setMeta(data)).catch((e) => toast(errorMessage(e), 'bad')), [toast])
  const loadDocs = useCallback(() => api.get('/calidad/documentos', { params: { carpeta: sel || undefined, subcarpetas: f.subcarpetas ? 1 : 0, q: f.q || undefined, tipoItem: f.tipoItem || undefined, tipo: f.tipo || undefined } }).then(({ data }) => setDocs(data)).catch((e) => toast(errorMessage(e), 'bad')), [sel, f, toast])
  useEffect(() => { loadTree() }, [loadTree])
  useEffect(() => { loadDocs() }, [loadDocs])
  const folders = useMemo(() => meta?.folders || [], [meta])
  const current = folders.find((x) => x.id === sel)
  useEffect(() => { if (current) setOpen((o) => ({ ...o, ...Object.fromEntries(current.path.map((p) => [p.id, true])) })) }, [current])
  const roots = folders.filter((x) => !x.parentId && (!f.tipoItem || x.kind === f.tipoItem))
  const reload = (msg) => { setModal(null); if (msg) toast(msg); loadTree(); loadDocs() }
  const removeFolder = async (x) => { try { await api.delete(`/calidad/carpetas/${x.id}`); if (sel === x.id) setSel(x.parentId); reload('Carpeta eliminada') } catch (e) { toast(errorMessage(e), 'bad') } }
  const removeDoc = async (d) => { try { await api.delete(`/calidad/documentos/${d.id}`); reload('Documento eliminado') } catch (e) { toast(errorMessage(e), 'bad') } }
  const Node = ({ x }) => {
    const kids = folders.filter((y) => y.parentId === x.id)
    const isOpen = open[x.id]
    return (
      <li>
        <div className={`qd-node${sel === x.id ? ' on' : ''}${x.active ? '' : ' off'}`}>
          <button type="button" className="qd-toggle" onClick={() => setOpen({ ...open, [x.id]: !isOpen })} disabled={!kids.length} aria-label={isOpen ? 'Contraer' : 'Expandir'}>{kids.length ? (isOpen ? <MdExpandMore /> : <MdChevronRight />) : null}</button>
          <button type="button" className="qd-name" onClick={() => setSel(x.id)}>{sel === x.id ? <MdFolderOpen /> : <MdFolder />}<span>{x.code ? `${x.code}. ` : ''}{x.name}</span><small>{x.totalDocs}</small></button>
        </div>
        {isOpen && kids.length > 0 && <ul>{kids.map((k) => <Node key={k.id} x={k} />)}</ul>}
      </li>
    )
  }
  if (!meta) return <div className="splash"><Spinner /></div>
  return (
    <>
      <PageHead title="Doc. Generales" subtitle="Documentos de calidad organizados por ítem principal y carpetas (hasta 3 niveles)">
        {admin && <button type="button" className="btn btn-outline" onClick={() => setModal({ folder: {} })}><MdAdd /> Ítem principal</button>}
        <button type="button" className="btn btn-outline" onClick={() => setModal({ doc: {}, html: true })} disabled={!folders.length}><MdEditNote /> Crear en línea</button>
        <button type="button" className="btn btn-primary" onClick={() => setModal({ doc: {} })} disabled={!folders.length}><MdUploadFile /> Cargar documento</button>
      </PageHead>
      <div className="qd-layout">
        <Card flush title="Ítems y carpetas" className="qd-tree-card"
          actions={<select className="input" value={f.tipoItem} onChange={(e) => setF({ ...f, tipoItem: e.target.value })} aria-label="Tipo de ítem" style={{ maxWidth: 170 }}><option value="">Todos los tipos</option>{meta.kinds.map((k) => <option key={k}>{k}</option>)}</select>}>
          <div className="qd-tree">
            <button type="button" className={`qd-all${!sel ? ' on' : ''}`} onClick={() => setSel(null)}>Todos los documentos</button>
            {roots.length === 0 ? <Empty icon={<MdFolder />}>{admin ? 'Crea el primer ítem principal.' : 'Aún no hay ítems.'}</Empty> : <ul>{roots.map((x) => <Node key={x.id} x={x} />)}</ul>}
          </div>
        </Card>
        <div className="stack">
          <Card flush
            title={current ? <span className="qd-crumbs">{current.path.map((p, i) => <React.Fragment key={p.id}>{i > 0 && <MdChevronRight />}<button type="button" onClick={() => setSel(p.id)}>{p.code ? `${p.code}. ` : ''}{p.name}</button></React.Fragment>)}</span> : 'Todos los documentos'}
            subtitle={current ? [current.kind && `Tipo: ${current.kind}`, current.description].filter(Boolean).join(' · ') : 'Elige un ítem o carpeta para ver sus documentos'}
            actions={current && admin && <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {current.level < meta.maxLevel && <button type="button" className="btn btn-outline btn-sm" onClick={() => setModal({ folder: {}, parent: current })}><MdCreateNewFolder /> Subcarpeta</button>}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setModal({ folder: current })}><MdEdit /> Editar</button>
              <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--bad)' }} onClick={() => removeFolder(current)}><MdDelete /></button>
            </div>}>
            <div className="qd-filters">
              <div className="qd-search"><MdSearch /><input className="input" placeholder="Buscar por nombre, código o carpeta" value={f.q} onChange={(e) => setF({ ...f, q: e.target.value })} /></div>
              <select className="input" value={f.tipo} onChange={(e) => setF({ ...f, tipo: e.target.value })} aria-label="Tipo de archivo"><option value="">Todos los archivos</option>{FILE_TYPES.map(([k, l]) => <option key={k} value={k}>{l}</option>)}</select>
              {current && <label className="switch" style={{ margin: 0 }}><input type="checkbox" checked={f.subcarpetas} onChange={(e) => setF({ ...f, subcarpetas: e.target.checked })} /> Incluir subcarpetas</label>}
            </div>
            {current && folders.some((x) => x.parentId === current.id) && (
              <div className="qd-subfolders">{folders.filter((x) => x.parentId === current.id).map((x) => (
                <button key={x.id} type="button" className="qd-subfolder" onClick={() => setSel(x.id)}><MdFolder /><span>{x.code ? `${x.code}. ` : ''}{x.name}</span><small>{x.totalDocs} doc.</small></button>
              ))}</div>
            )}
            {!docs ? <div className="splash" style={{ minHeight: 100 }}><Spinner /></div> : docs.length === 0 ? <Empty icon={<MdUploadFile />}>No hay documentos{current ? ' en esta carpeta' : ''}.</Empty> : (
              <div className="table-wrap"><table className="table">
                <thead><tr><th>Documento</th><th>Carpeta</th><th>Vigencia</th><th className="actions" /></tr></thead>
                <tbody>{docs.map((d) => (
                  <tr key={d.id}>
                    <td style={{ minWidth: 260 }}><div style={{ display: 'flex', gap: 10, alignItems: 'center' }}><FileIcon ext={d.fileExt} /><div><strong style={{ color: 'var(--ink)' }}>{d.name}</strong>{d.description && <div style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>{d.description}</div>}<div className="hint">{[d.isHtml ? 'Documento en línea' : null, d.category, d.code, d.version && `v${d.version}`, d.isHtml ? null : size(d.fileSize), date(d.createdAt)].filter(Boolean).join(' · ')}</div></div></div></td>
                    <td style={{ minWidth: 160 }}><span className="hint">{d.folderPath}</span></td>
                    <td>{d.validity ? <span className={`badge ${VAL[d.validity][1]}`}>{VAL[d.validity][0]} {d.validUntil?.split('-').reverse().join('/')}</span> : <span className="hint">—</span>}</td>
                    <td className="actions" style={{ whiteSpace: 'nowrap' }}>
                      <button type="button" className="btn btn-ghost btn-icon" title="Ver" aria-label="Ver" onClick={() => setModal({ view: d })}><MdVisibility /></button>
                      <a className="btn btn-ghost btn-icon" title="Descargar" aria-label="Descargar" download={d.fileName} href={downloadUrl(d)}><MdDownload /></a>
                      {(admin || d.createdById === user.id) && <>
                        <button type="button" className="btn btn-ghost btn-icon" title="Editar" aria-label="Editar" onClick={() => setModal({ doc: d })}><MdEdit /></button>
                        <button type="button" className="btn btn-ghost btn-icon" title="Eliminar" aria-label="Eliminar" style={{ color: 'var(--bad)' }} onClick={() => removeDoc(d)}><MdDelete /></button>
                      </>}
                    </td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </Card>
        </div>
      </div>
      {modal?.folder && <FolderForm initial={modal.folder.id ? modal.folder : null} parent={modal.parent} kinds={meta.kinds} onClose={() => setModal(null)} onSaved={() => reload('Carpeta guardada')} />}
      {modal?.doc && <DocForm initial={modal.doc.id ? modal.doc : null} folders={folders} folderId={sel} categories={meta.categories} html={modal.html} onClose={() => setModal(null)} onSaved={() => reload('Documento guardado')} />}
      {modal?.view && <Viewer doc={modal.view} onClose={() => setModal(null)} onEdit={(admin || modal.view.createdById === user.id) ? () => setModal({ doc: modal.view }) : undefined} />}
      {toastNode}
    </>
  )
}

export default DocGeneralesPage
