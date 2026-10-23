# 2026-10-22: Landing, registro de serviteca y nombre completo

Rama `feat/13-landing-register`. Backend con `feat/28-tenant-registration` en main.

## Hecho

* Rutas publicas `/`, `/registro` y `/terminos`; `/` ya no redirige a `/inicio`;
  `/crear-cuenta` redirige a `/registro`. Privadas sin cambios, bajo una ruta de layout.
* `LandingPage` (anclas, menu movil con Esc, vista de ejemplo con componentes reales,
  saltar al contenido, pie con valores de marca), `RegisterPage`, `TermsPage`,
  `WordmarkLink` y `usePageMeta`.
* `auth/registerForm.ts`: reglas, `suggestSlug`, `normalizeSlugInput`, `toRegisterRequest`.
  `authApi.ts`: `register` y `startSession`, que tambien usa el login.
* Sesion con `fullName`; `displayName` e `initials` en `session.ts`; la barra lateral los usa.
* Login: Crea tu cuenta a `/registro`, wordmark a `/` y titulo de documento.
* Pruebas: 366 a 417. Cambio una existente: "la raiz redirige a /inicio" pasa a "con sesion
  la raiz muestra la landing".
* Decisiones en [03-DECISIONS.md](../03-DECISIONS.md) y regla de rutas publicas en
  [02-CONVENTIONS.md](../02-CONVENTIONS.md).

## Prueba real

Backend en perfil dev y Vite en 5173. Sin extension de navegador conectada: el flujo se
replico por la API a traves del proxy. `demo` y `admin` dan 400 reservado; `el-roble` da
201 con `fullName`; el tenant nuevo trae 3 categorias, Caja General en 0, Consumidor final
y KPIs en cero; producto y venta de contado funcionan; el login nuevo devuelve `fullName`;
repetir da 409; demo y el tenant nuevo no se ven entre si.

## Pendiente

* Revisar la landing y el registro en un navegador contra las capturas.
* El NIT de ejemplo de la captura (`901.234.567-8`) lleva puntos y el backend lo rechaza.
