import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { MdErrorOutline } from 'react-icons/md'
import api, { errorMessage } from '../api/client'
import { Spinner } from '../components/ui'
import CytologyDetail from '../components/CytologyDetail'

// Citología por enlace directo (por ejemplo, desde "Pendientes por firmar").
const CytologyPage = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [c, setC] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { api.get(`/citologias/${id}`, { params: { sede: undefined } }).then(({ data }) => setC(data)).catch((e) => setError(errorMessage(e))) }, [id])
  if (error) return <div className="alert bad"><MdErrorOutline /><span>{error}</span></div>
  if (!c) return <div className="splash"><Spinner /> Cargando…</div>
  return <CytologyDetail data={c} onBack={() => navigate(-1)} />
}

export default CytologyPage
