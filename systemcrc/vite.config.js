import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Vite reemplaza a Create React App (más rápido al compilar y en desarrollo).
// · Salida en build/ para no cambiar la configuración de Vercel.
// · Variables REACT_APP_* se siguen usando (import.meta.env.REACT_APP_*).
export default defineConfig({
  plugins: [react()],
  envPrefix: ['VITE_', 'REACT_APP_'],
  server: { port: 3000 },
  preview: { port: 3000 },
  build: { outDir: 'build', sourcemap: false, chunkSizeWarningLimit: 900 }
})
