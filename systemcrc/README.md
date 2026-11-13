# Integra IPS · Frontend

React 18 + Vite. La API se configura con `REACT_APP_API_URL` y la web comercial con `REACT_APP_WEB_URL` (ver `.env.example`).

```bash
npm install
npm start          # desarrollo en http://localhost:3000
npm run build      # producción en build/
npm run preview    # sirve build/ en local
```

Despliegue en Vercel (`vercel.json`): framework Vite, salida `build/` y todas las rutas a `index.html`.
