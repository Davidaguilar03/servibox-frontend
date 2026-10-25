# 2026-10-25: Barra superior, panel, Reportes y Configuracion

Rama `feat/24-shell-dashboard-reports-redesign`. Decision en
[03-DECISIONS.md](../03-DECISIONS.md), reglas en [05-DESIGN-SYSTEM.md](../05-DESIGN-SYSTEM.md)
y [02-CONVENTIONS.md](../02-CONVENTIONS.md). Sin cambios de rutas, backend ni colores.

## Lectura previa

* kpis: el panel usaba `totalSales`, `totalPurchases`, `grossProfit` y `netProfit` en sus
  cuatro indicadores; Reportes usaba `totalSales` y `netProfit` en las tarjetas (con
  variacion) y `totalSales`, `totalPurchases`, `grossProfit`, `otherIncome`,
  `operatingExpenses` y `netProfit` en las seis filas; Facturas de venta y de compra usan
  `totalSales` y `totalPurchases` en su indicador del mes. El tipo `Kpis` no tenia `netSales`
  ni `costOfSales`, aunque el backend ya los enviaba y el archivo exportado ya los usaba.
* Periodo del panel: `monthToDate(new Date())`, del primero del mes a hoy, fijo ("Este mes").
* La pildora "ServiBox Demo" era `session.tenantName` en la barra superior desde sm, sin
  logica. El usuario (iniciales, nombre, rol) y Salir estaban al pie de la barra lateral;
  `session.ts` da `displayName`, `initials`, `roleLabel` y `clearSession`.
* Registro: `normalizeNit` quita puntos y espacios; NIT `^\d+(-\d)?$` y telefono
  `^[0-9 +()-]+$`, maximo 25, con mensajes propios del registro. Configuracion reusaba esas
  reglas con NIT y telefono opcionales y mandaba null si estaban vacios.
* `text-title` (20) estaba en 20 `h1`, en 26 `h2` de seccion y de modal, en 10 cifras
  (indicadores, totales, saldos) y en el Wordmark.

## Hecho

* Tokens: `text-title` 24/32/600, `text-section` 15/1.6/600, `--figure-*` y la utilidad
  `text-figure` (24/28 y 28/32 desde md, tabular). Guarda: `role` exige title en `h1` (o
  marca), section en `h2`/`h3` y figure en `FIGURE_FILES`.
* `layout/UserMenu.tsx` en la barra superior; `AppShell` sin pildora ni bloque de usuario.
* `IndicatorCard` con `negative` (tono de error) y `note` (linea pegada al valor).
* Panel con Ventas sin IVA, Costo de lo vendido, Utilidad bruta con margen y Utilidad neta.
* Reportes: filas del archivo y tarjeta Ventas sin IVA con la variacion sobre `netSales`.
* Configuracion: NIT y Telefono obligatorios (sin "(opcional)"), mensajes nuevos y PUT con
  ambos. El registro conserva sus mensajes (lo redisena otra tarea).

## Verificacion

* `npm run build`, `npm run lint` y `npm test`: 770 pruebas (747 base + 23).
* API (backend dev, tenant demo, 01/10/2026 a 24/10/2026): netSales 20.781.907, costOfSales
  14.055.000, grossProfit 6.726.907, otherIncome 0, operatingExpenses 5.192.200, netProfit
  1.534.707. El panel y la vista previa muestran lo mismo, margen "32,4 % de las ventas".
* PDF y XLSX de `GET /api/reporting/export` con el usuario de la siembra: Ventas sin IVA
  20.781.907, Costo de lo vendido -14.055.000, Utilidad bruta 6.726.907, Otros ingresos 0,
  Gastos operativos -5.192.200, Utilidad neta 1.534.707; iguales a la vista previa.
* Chrome a 1280 y 390: h1 24/32, secciones 15/600, cifras 28/32 y 24/28 con tabular, tarjetas
  sin sombra y panel del menu con `0 4px 12px` al 10 %, radio 12 y 200 ms. Menu con teclado y
  clic real: abre, foco al panel, Tab a Cerrar sesion, Esc cierra y devuelve el foco, clic
  fuera cierra. A 390 el boton mide 44 px (solo iniciales) y el panel va de 95 a 351 px; el
  menu lateral sigue inerte cerrado, atrapa el foco y Esc lo cierra.
* Configuracion con NIT y telefono vacios: "Ingresa el NIT de tu serviteca." e "Ingresa el
  teléfono de contacto." y Guardar deshabilitado; con formato malo, los mensajes de formato.
  No se guardo nada en el tenant demo.
* Tenant nuevo registrado (credenciales en el scratchpad): panel en $ 0 y sin margen.
* Script de desbordes de fix/20 y feat/23 (360, 390, 768, 1024, 1280 y 1536; 176 casos con el
  tenant demo y las rutas publicas): 0 desbordes. Aparecio un interno nuevo de +22 px en
  `/inicio` a 1024 (el total disponible en text-figure no cabia junto a su rotulo); la fila
  ahora pasa a dos lineas (`flex-wrap`) y la repeticion de `/inicio` y sus variantes dio 0.
  Quedan los internos previos sin desplazamiento: `-mr-2` del cerrar en 3 modales, NIT
  `nowrap` en tarjetas de Clientes y Proveedores a 360 y el resumen de `/compras/1` a 1024.
* `tokens.test.ts` sin cambios; ningun color cambio.
* Backend y Vite detenidos al terminar.

## Cambios visuales

* Titulo de pantalla 20 a 24; titulos de seccion y de modal 20/600 a 15/600; cifras de
  indicadores y totales 20 a 28 (24 bajo md). Wordmark y "S" de la barra contraida 20 a 24.
* Barra superior: sin pildora; boton de usuario con iniciales y la serviteca desde md. Barra
  lateral sin el bloque de usuario ni Salir.
* Panel: indicadores nuevos con una linea de definicion y el margen; Compras sale del panel.
* Reportes: tarjeta y fila Ventas sin IVA y fila Costo de lo vendido en lugar de Compras.
* Configuracion: rotulos NIT y Teléfono sin "(opcional)".

## Limitaciones

* Guardar sigue deshabilitado hasta que haya cambios y no haya errores: en un tenant sin NIT
  ni telefono los mensajes salen al salir de cada campo, no al pulsar Guardar.
* El panel del menu de usuario tambien se cierra si el foco sale de el (Tab fuera o abrir el
  menu lateral con el teclado).
