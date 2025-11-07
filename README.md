# Frontend de MoodTune

Aplicación de una sola página (SPA) en React + Vite que consume el API de MoodTune (ver `moodtune_api/docs/openapi/moodtune.yaml`).

Incluye flujo mínimo de inicio/cierre de sesión usando `/sessions/login` y `/sessions/{sessionId}`.

## Funcionalidades
- Pantalla de Login que llama `POST /sessions/login` (público) para autenticar.
- Tras iniciar sesión se guarda `session_id` y el usuario; se navega a Inicio.
- El endpoint `POST /sessions/login` ya crea la sesión en backend; no se hace un `POST /sessions` extra.
- Cierre de sesión con `DELETE /sessions/{sessionId}` y limpieza del estado local.
- URL base del API configurable por entorno (`VITE_API_BASE_URL`).
- Detección de emoción desde imagen en `/detect` usando un servicio FER externo (`VITE_FER_ENDPOINT_URL`) con fallback local.
- Proxy de desarrollo en Vite para evitar CORS.
- Dockerfile para build de producción servido con NGINX y `docker-compose` para ejecución sencilla.
  - En producción (Docker), la app usa `VITE_API_BASE_URL` directamente (sin proxy).

## Requisitos
- Node.js 18+
- npm (o yarn/pnpm)

## Desarrollo local
```bash
cd moodtune_frontend
cp .env.example .env
# Ajusta VITE_API_BASE_URL si es necesario (por defecto http://localhost:8000)
# (Opcional) Para FER real, levanta `moodtune_fer`.
# En desarrollo puedes:
#  - Usar el proxy '/fer-proxy' sin configurar nada (apunta a http://localhost:8081 por defecto)
#  - O definir VITE_FER_BASE_URL para cambiar el destino del proxy
#  - O definir VITE_FER_ENDPOINT_URL con el endpoint completo (ej: http://localhost:8081/infer)
npm install
npm run dev
```
- Dev server: http://localhost:5173
- Las llamadas al API en dev se proxyan a través de `/api-proxy` hacia `VITE_API_BASE_URL`.

## Build
```bash
npm run build
npm run preview # previsualización estática local en :5173
```

## Docker
Compilar y ejecutar con Docker directamente:
```bash
cd moodtune_frontend
docker build -t moodtune/frontend --build-arg VITE_API_BASE_URL=http://localhost:8000 --build-arg VITE_FER_ENDPOINT_URL=http://localhost:8081/infer .
# Servir en el puerto 8080
docker run --rm -p 8080:80 -e VITE_API_BASE_URL=http://localhost:8000 -e VITE_FER_ENDPOINT_URL=http://localhost:8081/infer moodtune/frontend
```

O usar Docker Compose:
```bash
cd moodtune_frontend
# Opcional: exportar VITE_API_BASE_URL y VITE_FER_ENDPOINT_URL para el build
# PowerShell: $env:VITE_API_BASE_URL="http://localhost:8000"; $env:VITE_FER_ENDPOINT_URL="http://localhost:8081/infer"
# Bash:      export VITE_API_BASE_URL=http://localhost:8000; export VITE_FER_ENDPOINT_URL=http://localhost:8081/infer

docker compose up --build
# App en http://localhost:8080
```

Nota: las variables `VITE_` de Vite se resuelven en tiempo de compilación. Si cambias `VITE_API_BASE_URL`, recompila la imagen.

### Nota sobre error 405 en Docker
Si ves `405 Not Allowed` al hacer `POST` (p. ej. a `/sessions/login`) cuando sirves la SPA con NGINX:
- Asegúrate de que el frontend esté apuntando al backend real y no al prefijo `/api-proxy`.
- El proxy `/api-proxy` sólo existe en desarrollo (Vite). En producción, el cliente usa `VITE_API_BASE_URL` (por ejemplo `http://host.docker.internal:8000`).
- Usa `VITE_API_BASE_URL` al construir la imagen (`docker compose up --build`) para configurar el destino del API.

## Notas de uso del API
- Spec del API: `moodtune_api/docs/openapi/moodtune.yaml` (OpenAPI 3.0.3).
- `POST /sessions/login` retorna `{ session_id, user }` y es público (security: []).
- No se invoca `POST /sessions` desde el frontend tras el login, ya que `/sessions/login` crea la sesión y devuelve `session_id`.
- `DELETE /sessions/{sessionId}` se llama al cerrar sesión.

## Estructura del proyecto
```
src/
  api/client.ts            # envoltorios fetch para endpoints de sesiones
  context/AuthContext.tsx  # estado de auth, login/logout
  hooks/useAuth.ts         # hook de conveniencia
  pages/Login.tsx          # formulario de login
  pages/Home.tsx           # página protegida tras login
  App.tsx                  # rutas y guardas
```

## Extensión
- Para añadir endpoints, consulta el OpenAPI y extiende `src/api/client.ts` con tipos y funciones.
- Para mayor cobertura, se puede generar un cliente a partir del OpenAPI (p. ej. `openapi-typescript`).

## Licencia
Andamiaje interno para MoodTune; ver términos del repositorio.
