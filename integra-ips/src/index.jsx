import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// /plataforma es una aplicación aparte (planes, funcionalidades y clientes), con su propio estilo y sesión.
const isPlatform = window.location.pathname.startsWith('/plataforma')
// Dos lazy() separados: con un ternario dentro de un solo import(), el empaquetador precarga solo los estilos
// de la aplicación principal y la Plataforma queda sin su hoja de estilos en producción.
const PlatformApp = lazy(() => import('./platform/PlatformApp'))
const MainApp = lazy(() => import('./App'))
const App = isPlatform ? PlatformApp : MainApp

const rootElement = document.getElementById('root');

if (rootElement) {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <Suspense fallback={null}>
        <App />
      </Suspense>
    </React.StrictMode>
  );
} else {
  console.error('Element with id "root" not found.');
}
