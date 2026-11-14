import React from 'react'
import { DocAreaContext } from '../calidad/ServiceTabs'
import DocGeneralesDashboard from '../calidad/DocGeneralesDashboard'
import DocGeneralesPage from '../calidad/DocGeneralesPage'
import '../calidad/calidad.css'

// Acreditación de la institución ETDH: el mismo árbol de carpetas de Doc. Generales (Calidad IPS),
// con un árbol institucional y uno por programa (licencia, registros, PEI, reglamentos, NTC 5555/5581, docentes, SIET…).
const AREA = { area: 'educacion', base: '/educacion/acreditacion', generalLabel: 'Institucional', scopeLabel: 'programa', scopePlural: 'programas', title: 'Acreditación', allLabel: 'toda la institución' }

export const AccreditationDashboard = () => <DocAreaContext.Provider value={AREA}><DocGeneralesDashboard /></DocAreaContext.Provider>
export const AccreditationDocs = () => <DocAreaContext.Provider value={AREA}><DocGeneralesPage /></DocAreaContext.Provider>
