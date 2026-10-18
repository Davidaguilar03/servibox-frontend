# ServiBox frontend

Interfaz web de ServiBox. React, TypeScript y Vite.

## Requisitos

* Node.js 24 o superior.
* El backend (`servibox-backend`) corriendo en `http://localhost:8080` para usar la app.

## Correr en local

```
npm install
npm run dev
```

La app queda en `http://localhost:5173`. Las peticiones a `/api` pasan por el proxy de
Vite al backend; para apuntar a otro backend, copiar `.env.example` a `.env.local` y
cambiar `API_PROXY_TARGET`.

Con el perfil `dev` del backend se puede ingresar con serviteca `demo`, usuario `admin`
(la clave esta en `DevDataInitializer` del backend).

## Probar

```
npm test
npm run lint
npm run build
```

## Contexto para agentes

Reglas, arquitectura, convenciones y decisiones en [docs/ai-context](docs/ai-context).
