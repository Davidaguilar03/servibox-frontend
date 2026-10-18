# Arquitectura

## Stack tecnologico

* Vite 8, React 19, TypeScript en modo estricto (`noUncheckedIndexedAccess` incluido).
* Tailwind CSS v4 con el plugin `@tailwindcss/vite`. Los tokens viven en un solo archivo,
  ver Tokens visuales en [02-CONVENTIONS.md](02-CONVENTIONS.md).
* React Router 8 en modo datos (`createBrowserRouter`).
* TanStack Query para las peticiones al backend.
* lucide-react para iconos.
* Fuentes con `@fontsource`: Montserrat 600 y 700, Inter 400 y 500, IBM Plex Mono 400.
* Vitest, jsdom y Testing Library para pruebas; ESLint con typescript-eslint y las reglas
  de React Hooks.
* Sin libreria de componentes ni estado global adicional: la sesion es un store minimo
  sobre `sessionStorage` (ver Autenticacion).

## Estructura de carpetas

```
src/
  main.tsx            entrada: fuentes, estilos y App
  App.tsx             QueryClientProvider y RouterProvider
  routes.tsx          tabla de rutas, la usan App y las pruebas
  index.css           Tailwind, tokens y estilos base
  styles/tokens.css   tokens del manual de estilos (bloque @theme)
  lib/api.ts          cliente API y ApiError
  auth/               sesion, guard de rutas y llamada de login
  components/         Button, TextField, Alert
  layout/AppShell.tsx barra lateral, barra superior y contenido
  brand/Wordmark.tsx  wordmark provisional
  pages/              una pagina por ruta
  test/               setup de Vitest y utilidades de prueba
```

## Rutas

| Ruta | Acceso | Pagina |
|-|-|-|
| `/login` | publica | `LoginPage`. Con sesion activa redirige a la pagina pedida o a `/inicio` |
| `/recuperar-contrasena` | publica | `ComingSoonPage` ("Proximamente") |
| `/crear-cuenta` | publica | `ComingSoonPage` ("Proximamente") |
| `/` | privada | redirige a `/inicio` |
| `/inicio`, `/inventario`, `/ventas`, `/compras`, `/cuentas`, `/reportes`, `/configuracion` | privada | `PlaceholderPage` con el titulo, dentro de `AppShell` |
| cualquier otra | | redirige a `/inicio` (y de ahi a `/login` si no hay sesion) |

Las rutas privadas cuelgan de `RequireAuth`, que sin sesion valida redirige a `/login`
guardando la ruta pedida en `state.from`; tras el login se vuelve a ella.

## Cliente API

`lib/api.ts` expone `apiFetch<T>(path, { method, body, auth })`:

* Base `/api`. En desarrollo el proxy de Vite la envia al backend (ver Proxy).
* Con `auth` (por defecto true) agrega `Authorization: Bearer <token>`.
* Una respuesta no exitosa se convierte en `ApiError` con `message` y `status`, leidos del
  cuerpo que el backend devuelve siempre: `{"error": mensaje, "status": n}`. Si el cuerpo no
  es JSON se usan `statusText` y el codigo HTTP.
* Un 401 con `auth` cierra la sesion; el guard redirige a `/login`. Las rutas publicas
  (login) usan `auth: false`: no envian token y su 401 no cierra nada, solo se muestra.

## Proxy de desarrollo

`vite.config.ts` reenvia `/api` a `API_PROXY_TARGET` (por defecto
`http://localhost:8080`). Se cambia en `.env.local`, ver `.env.example`. El backend no
configura CORS; el motivo esta en [03-DECISIONS.md](03-DECISIONS.md).

## Autenticacion

* `POST /api/auth/login` con `tenantSlug`, `username` y `password`; responde `{token}`.
* El token se guarda en `sessionStorage` (`servibox.token`). El slug de la serviteca se
  recuerda en `localStorage` (`servibox.tenantSlug`) para precargar el campo.
* `auth/session.ts` decodifica el payload del JWT solo para leer `sub`, `role` y `exp`; no
  verifica la firma, eso lo hace el backend en cada peticion. Un token ilegible o vencido
  no es sesion.
* `useSession()` lee el token con `useSyncExternalStore`: `saveToken` y `clearSession`
  notifican a los suscriptores y la interfaz reacciona sin contexto ni store global.
* `RequireAuth` programa el cierre de sesion para el instante de `exp`. No hay refresh:
  sesion vencida es volver a ingresar.
* Roles que llegan en el token: `ADMIN`, `MECANICO`, `CAJERO`. Por ahora solo se muestran
  en la barra superior; no hay permisos por rol.

## Shell de la aplicacion

`AppShell` arma la barra lateral (240 px, 72 contraida, desde `lg`), la barra superior
(64 px, usuario y boton Salir) y el area de contenido (ancho maximo 1440 px). Por debajo de
`lg` la barra lateral se oculta y se abre como menu sobre el contenido desde la barra
superior.
