# Frontend de MoodTune

SPA en React + Vite que consume el API de MoodTune y servicios auxiliares (FER y RAG).

Funciones
- Login vía `POST /sessions/login` y cierre de sesión con `DELETE /sessions/{sessionId}`.
- Guarda `session_id` y usuario tras autenticar y protege rutas.
- Configuración por entorno de URLs para API, FER y RAG.
- Proxy en desarrollo para evitar CORS.
- Dockerfile para build de producción servido con NGINX y `docker-compose` para ejecución.

Requisitos
- Node.js 18+
- npm (o yarn/pnpm)

Desarrollo local
```
cd moodtune_frontend
cp .env.example .env
# Ajusta VITE_API_BASE_URL si es necesario (por defecto http://localhost:8000)
# (Opcional) Levanta `moodtune_fer` y `moodtune_rag` para funciones avanzadas.
npm install
npm run dev
```
- Dev server: http://localhost:5173
- En desarrollo, las llamadas se proxyan:
  - `/api-proxy` -> `VITE_API_BASE_URL` (por defecto http://localhost:8000)
  - `/fer-proxy` -> `VITE_FER_BASE_URL` (por defecto http://localhost:8081)
  - `/rag-proxy` -> `VITE_RAG_BASE_URL` (por defecto http://localhost:8010)

Variables de entorno (Vite)
- `VITE_API_BASE_URL` URL base del API (backend Flask).
- `VITE_FER_ENDPOINT_URL` Endpoint completo del servicio FER (por ejemplo `http://localhost:8081/infer`).
- `VITE_RAG_BASE_URL` URL base del servicio RAG.
- Nota: variables `VITE_` se resuelven en build; si cambias valores, recompila.

Build
```
npm run build
npm run preview # previsualización estática local en :5173
```

Docker
```
cd moodtune_frontend
docker build -t moodtune/frontend \
  --build-arg VITE_API_BASE_URL=http://localhost:8000 \
  --build-arg VITE_FER_ENDPOINT_URL=http://localhost:8081/infer \
  --build-arg VITE_RAG_BASE_URL=http://localhost:8010 .
docker run --rm -p 8080:80 \
  -e VITE_API_BASE_URL=http://localhost:8000 \
  -e VITE_FER_ENDPOINT_URL=http://localhost:8081/infer \
  -e VITE_RAG_BASE_URL=http://localhost:8010 \
  moodtune/frontend
```
O usando Docker Compose:
```
docker compose up --build
# App en http://localhost:8080
```

Página "Explorar" (RAG)
- Ruta protegida: `/explore`.
- Permite seleccionar emoción (Feliz, Triste, Intenso, Relajado) y buscar canciones usando `POST /rag/search`.
- Muestra título/artista, métricas (valence/energy), preview (cuando hay) y enlace a Spotify cuando hay `uri`.

Notas API
- Spec: `moodtune_api/docs/openapi/moodtune.yaml` (OpenAPI 3.0.3).
- `POST /sessions/login` retorna `{ session_id, user }` y es público.
- No invocar `POST /sessions` luego del login: `sessions/login` crea la sesión.

Estructura (resumen)
```
src/
  api/client.ts            # wrappers fetch para sesiones
  context/AuthContext.tsx  # estado de auth, login/logout
  hooks/useAuth.ts         # hook de conveniencia
  pages/Login.tsx          # formulario de login
  pages/Home.tsx           # página protegida tras login
  App.tsx                  # rutas y guardas
```

