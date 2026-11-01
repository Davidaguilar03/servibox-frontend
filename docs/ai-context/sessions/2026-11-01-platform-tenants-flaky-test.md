# 2026-11-01: Prueba intermitente "401 del listado" de platformTenants

Rama fix/55-platform-tenants-flaky-test desde main en 5794e7c (merge PR 56). Sin commit, push ni PR: quedan
para el prompt de cierre. Solo cambia una prueba y la documentacion; nada de codigo de produccion.

Lectura previa: 00, 01, 02, 05, 06 y la nota anterior completas; de 03-DECISIONS solo las lineas 1 a 660 de
2735, por su tamano, con busqueda de esta prueba en el resto de docs.

## Causa

validToken() (src/test/utils.tsx) calcula exp con Math.floor(Date.now() / 1000) + 3600. La prueba lo llama al
guardar la sesion y otra vez al comparar con getToken(). Si entre las dos llamadas cambia el segundo, los dos
tokens difieren y la comparacion falla, aunque la app se comporte bien.

## Correccion

En esa prueba: vi.useFakeTimers({ toFake: ['Date'] }) y vi.setSystemTime, con vi.useRealTimers al terminar. Es
el patron de reloj de las demas pruebas del repo y solo simula Date, asi que waitFor sigue con temporizadores
reales. Las aserciones no cambian.

Descartado: expiracion fija y lejana en validToken. RequireAuth y PlatformRequireAuth programan el cierre con
setTimeout(expiresAt * 1000 - Date.now()), y Node convierte un retardo mayor a 2^31-1 ms (24,8 dias) en 1 ms.
Medido con una sonda: setTimeout de 2308876931641 ms disparo a los 6 ms. La sesion se cerraria al montar.

## Pruebas que dependen del reloj real

| Sitio | Dependencia | Puede fallar igual | Accion |
|-|-|-|-|
| platformTenants:228 (ahora 232), toBe(validToken()) | Dos llamadas, igualdad | Si | Corregida |
| platformTenants:100 y platformTenantDetail:126, not.toBe(Bearer validToken()) | Dos llamadas, desigualdad | No | Sin cambio, ver limitaciones |
| platform.test:90, 198, 230; platformShell:92; platformRequests:577; platformTenantDetail:531; session.test; api.test; LoginPage.test:97 | Guardan el token en una constante y comparan con ella | No | Sin cambio |
| signIn y exp() de las pruebas de plataforma, session.test:20 y 40, RequireAuth.test:16, platform.test:257, SettingsPage.test:47 | Construyen un token una vez, sin comparar con otro | No | Sin cambio |
| Demas usos de saveToken(validToken()) | Una llamada | No | Sin cambio |

## Evidencia

Bucles de la prueba con reloj real, cada corrida un proceso de vitest:

| Caso | Aprobadas | Fallidas |
|-|-|-|
| Antes del arreglo, 50 corridas | 44 | 6 (mismo AssertionError de igualdad de tokens) |
| Despues del arreglo, 50 corridas | 50 | 0 |
| Archivo completo despues del arreglo, 5 corridas | 5 | 0 |

Cruce de segundo forzado con un modulo fuera del repo, cargado por NODE_OPTIONS, que adelanta Date.now 1 s en
cada llamada: antes falla con el mismo error; despues pasa.

Suite completa: 73 archivos, 1730/1730 (base 1730, sin nuevas). Ninguna otra prueba ajustada. Guardas
designSystem, tokens, copy y errorMessages sin cambios. npm run build, npm run lint y git diff --check: sin
hallazgos. Sin Vite, backend ni navegador. Scripts de la medicion fuera del repo y ya borrados.

## Limitaciones

* platformTenants:100 y platformTenantDetail:126 no fallan de forma intermitente, pero la asercion queda vacia
  si cambia el segundo: comparan contra un token nuevo, no contra el guardado. Si la app enviara por error el
  token de serviteca, esa corrida pasaria. Se dejan por alcance.
* RequireAuth y PlatformRequireAuth cerrarian la sesion de inmediato con un token que venza a mas de 24,8 dias.
  No se reviso la duracion real de los JWT del backend. No se cambio por ser codigo de produccion.
