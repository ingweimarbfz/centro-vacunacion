import React, { Suspense, lazy } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';

// /plataforma es una aplicación aparte (planes, funcionalidades y clientes), con su propio estilo y sesión.
const isPlatform = window.location.pathname.startsWith('/plataforma')
const App = lazy(() => (isPlatform ? import('./platform/PlatformApp') : import('./App')))

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
