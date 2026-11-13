import React, { useCallback, useEffect, useState } from 'react'
import { MdDraw, MdErrorOutline, MdEdit } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { useAuth } from '../context/AuthContext'
import { ROLE_LABELS } from '../utils/permissions'
import { PageHead, Card, Modal, Spinner, useToast } from '../components/ui'
import { SignatureEditor } from '../components/signature'

// Mi firma digital (todos los usuarios).
export const MySignaturePage = () => {
  const { user, setUser } = useAuth()
  const [toast, toastNode] = useToast()
  const [saving, setSaving] = useState(false)
  const save = async (image) => {
    setSaving(true)
    try { const { data } = await api.put('/firma', { image }); setUser({ ...user, signatureUrl: data.signatureUrl }); toast('Firma guardada') } catch (e) { toast(errorMessage(e), 'bad') } finally { setSaving(false) }
  }
  const remove = async () => {
    try { await api.delete('/firma'); setUser({ ...user, signatureUrl: null }); toast('Firma eliminada') } catch (e) { toast(errorMessage(e), 'bad') }
  }
  return (
    <>
      <PageHead title="Mi firma digital" subtitle="Dibuja tu firma o carga una foto con fondo blanco (PNG/JPG) o un vector (SVG). La usarás para firmar registros y reportes." />
      <Card icon={<MdDraw style={{ color: 'var(--brand)' }} />} title={user.fullName} subtitle={`${ROLE_LABELS[user.role]} · CC ${user.identification}`}>
        <SignatureEditor current={user.signatureUrl} onSave={save} onRemove={user.signatureUrl ? remove : null} saving={saving} />
        <p className="hint" style={{ marginTop: 14 }}>Al firmar un documento se guarda una copia de tu firma, tu nombre y la fecha y hora. Si cambias tu firma, los documentos ya firmados conservan la anterior.</p>
      </Card>
      {toastNode}
    </>
  )
}

// Configuración → Firmas digitales: el administrador gestiona la firma de cada usuario.
export const UsersSignaturesCard = () => {
  const [toast, toastNode] = useToast()
  const [rows, setRows] = useState(null)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)
  const [saving, setSaving] = useState(false)
  const load = useCallback(() => api.get('/firmas/usuarios').then(({ data }) => setRows(data)).catch((e) => setError(errorMessage(e))), [])
  useEffect(() => { load() }, [load])
  const save = async (image) => {
    setSaving(true)
    try { await api.put(`/firmas/usuarios/${editing.id}`, { image }); toast(`Firma de ${editing.fullName} guardada`); setEditing(null); load() } catch (e) { toast(errorMessage(e), 'bad') } finally { setSaving(false) }
  }
  const remove = async () => {
    try { await api.delete(`/firmas/usuarios/${editing.id}`); toast('Firma eliminada'); setEditing(null); load() } catch (e) { toast(errorMessage(e), 'bad') }
  }
  const active = (rows || []).filter((u) => u.active)
  return (
    <Card flush title="Firmas digitales" subtitle={rows ? `${active.filter((u) => u.signatureUrl).length} de ${active.length} usuarios activos tienen firma` : ''} icon={<MdDraw style={{ color: 'var(--brand)' }} />}>
      {error && <div className="alert bad" style={{ margin: 16 }}><MdErrorOutline /><span>{error}</span></div>}
      {!rows ? <div className="splash" style={{ minHeight: 120 }}><Spinner /></div> : (
        <div className="table-wrap" style={{ marginTop: 12 }}>
          <table className="table">
            <thead><tr><th>Usuario</th><th>Rol</th><th>Firma</th><th className="actions" /></tr></thead>
            <tbody>{active.map((u) => (
              <tr key={u.id}>
                <td><strong style={{ color: 'var(--ink)' }}>{u.fullName}</strong><div style={{ fontSize: 12, color: 'var(--muted)' }}>@{u.nameUser}{u.siteName ? ` · ${u.siteName}` : ''}</div></td>
                <td>{ROLE_LABELS[u.role]}</td>
                <td>{u.signatureUrl ? <img className="sig-thumb" src={u.signatureUrl} alt={`Firma de ${u.fullName}`} /> : <span className="badge warn">Sin firma</span>}</td>
                <td className="actions"><button type="button" className="btn btn-outline btn-sm" onClick={() => setEditing(u)}><MdEdit /> {u.signatureUrl ? 'Cambiar' : 'Agregar'}</button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      {editing && (
        <Modal title={`Firma de ${editing.fullName}`} onClose={() => setEditing(null)}>
          <SignatureEditor current={editing.signatureUrl} onSave={save} onRemove={editing.signatureUrl ? remove : null} saving={saving} />
        </Modal>
      )}
      {toastNode}
    </Card>
  )
}
