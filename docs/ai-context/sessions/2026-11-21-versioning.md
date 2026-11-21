# 2026-11-21: Versionado semantico y version visible

Rama chore/59-versioning desde main en d30e3e0 (merge del PR #60), al dia con origin/main. Sin commit, push ni PR: quedan
para el prompt de cierre.

## Que cambio

* `package.json` y la raiz de `package-lock.json`: 0.0.0 a 1.1.0. `npm install --package-lock-only` agregaba 66 lineas de
  dependencias opcionales de `@tailwindcss/oxide-wasm32-wasi`; se descarto y solo se cambiaron las dos lineas de version.
* `vite.config.ts` lee `package.json` y define `__APP_VERSION__`. `src/config/version.ts` declara la constante y exporta
  `APP_VERSION` y `APP_VERSION_LABEL`.
* Donde se ve: pie del menu lateral bajo el usuario (`ServiBox v1.1.0`, `text-small text-text-subtle` sobre `nav`; contraido
  solo `v1.1.0`), pie de `LoginLayout` (`ServiBox v1.1.0 · Colombia`, cubre login de serviteca y de plataforma), pie nuevo de
  `PlatformShell` (`text-muted` sobre `canvas`) y pie de la landing bajo el lema (`text-subtle` sobre `nav`). Pares de
  contraste ya existentes en tokens.test.ts; sin tokens nuevos.
* No se consulta `GET /api/version`.
* `CHANGELOG.md` nuevo con [1.1.0] en desarrollo y [1.0.0] del 2026-11-01.

## Pruebas

Suite: 76 archivos, 1814/1814 (base 1809 medida en este main, mas 3 escritas y 2 casos automaticos de las guardas
designSystem y copy por el archivo nuevo `config/version.ts`). Ninguna prueba existente ajustada. npm run lint y npm run
build sin hallazgos. El bundle `index-*.js` contiene `v1.1.0` y no quedan `__APP_VERSION__` sin reemplazar.

Nuevas: version.test.ts (coincide con package.json), AppShell.test (pie del menu lateral), LoginPage.test (pie del acceso).
Ninguna escribe `1.1.0` literal.

## Verificacion en Edge sin ventana, contra Vite

| Pantalla | Esperado | Obtenido |
|-|-|-|
| /login a 1440 | pie `ServiBox v1.1.0 · Colombia`, sin desborde | igual |
| /login a 390 | igual | igual |
| / a 1440 | `ServiBox v1.1.0` en el pie | igual |

Capturas fuera del repo. Script y perfil de Edge borrados; Vite detenido.

## Limitaciones

* Menu lateral y panel de plataforma no se vieron en el navegador: el backend no estaba arrancado y entrar a la demo exige la
  clave de DevDataInitializer, cuya lectura no estaba autorizada. Los cubren las pruebas automaticas.
* La regla de Responsive de 02-CONVENTIONS (el agente no abre navegadores ni toma capturas) contradice este prompt, que las
  pidio; se siguio el prompt, sin modificar esa regla.
