# 2026-11-21: Correcciones de Reportes e Inventario, version 1.1.1 (fix/65-reports-polish)

Rama fix/65-reports-polish desde main en 918f50f (merge del PR #66), al dia con origin/main. Sin commit, push ni PR.
Backend usado: servibox-backend main en b665db5, perfil dev (sin cambios; sigue en 1.1.0). Decision en
[03-DECISIONS](../03-DECISIONS.md); versionado en [02-CONVENTIONS](../02-CONVENTIONS.md); tablas en
[01-ARCHITECTURE](../01-ARCHITECTURE.md), Reportes.

## Causas y correcciones

1. Forma de pago Credito con la e acentuada convertida en dos caracteres (texto UTF-8 releido como
   Windows-1252) en `reports/ReportTable.tsx`. Entro en feat/62 (ed09bbc): el diff de esa linea solo cambia la tilde,
   senal de una edicion que reescribio el archivo con otra codificacion. Unica cadena con ese defecto en src. Guarda
   nueva `copy/encoding.test.ts`.
2. "Mes anterior" (octubre, 31 dias) se comparaba con los 31 dias anteriores (31/08 a 30/09): `previousPeriod` solo
   conocia la regla de igual duracion. Ahora un mes calendario completo se compara con el mes completo anterior.
3. Tabla de Ventas a 1440: 1154 px en un contenedor de 1119 (con la barra lateral abierta). Los anchos venian de los
   encabezados con `whitespace-nowrap` y boton de orden, el `min-w-48` de los textos, `px-3` y fechas dd/mm/aaaa.
   Productos vendidos (1138) e Inventario (1523) tambien desbordaban; las otras siete cabian.
4. "+$ 0": `signedAmount` ponia "+" a todo lo que no era negativo; una Salida de 0 da -0, que no es menor que 0.
   Ahora `formatSignedCurrency` deja sin signo lo que redondea a cero.
5. El pie de Inventario usaba siempre "productos". Ahora "items" con Todos y Servicios y "productos" con Productos.

## Que cambio

* `lib/format.ts`: `formatSignedCurrency` y `formatShortDate`.
* `reports/ReportTable.tsx`: Credito corregido, signo del cero, `px-2`, `text-small`, encabezados sin `whitespace-nowrap`,
  fecha corta y textos con `line-clamp-1 break-all` y `title`.
* `reports/reports.ts`: `previousPeriod` con la regla del mes completo.
* `accounts/accountsView.ts`: `formatSignedAmount` usa `formatSignedCurrency`.
* `pages/ProductsPage.tsx`: rotulo del pie segun el filtro de tipo.
* Version 1.1.1 en `package.json` y `package-lock.json` (paquete raiz), `CHANGELOG.md`, 01, 02 y 03 de esta carpeta.

## Anchos a 1440 (ancho minimo de la tabla frente al contenedor de 1119)

Del 01/09 al 21/11: Ventas 840, Productos vendidos 865, Cartera por cobrar 859, Compras 774, Cartera por pagar 865,
Inventario 1046, Estado de resultados 272, Flujo de caja 386, IVA 607, Movimientos 575. Todas caben. Antes: Ventas
1154, Productos vendidos 1138 e Inventario 1523 desbordaban. Solo Inventario corta descripciones (con el nombre en
`title`); con un tope fijo de 160 px se cortaban nombres en todas las tablas y se descarto.

## Pruebas

Suite: 78 archivos, 2135/2135 (base 1887, mas 248 nuevas). npm run lint y npm run build sin hallazgos; dist borrado.

Nuevas: encoding.test 237 (una por archivo de texto de src, 236, y la de deteccion); reports.test 5 netas (octubre,
marzo con febrero de 28 y de 29 dias y septiembre, enero con cruce de ano, Este mes del 1 al 21, rango personalizado;
"cruza el fin de mes" se reemplazo por un rango de varios meses); format.test 3 (signo con +/-, cero sin signo,
fecha corta); LiveReportsPage.test 2 (Salida de 0 sin signo en Flujo de caja; Ventas con Credito, fecha corta, cliente
en una linea con `title` y encabezado que puede partirse); ProductsPage.test 1 (pie con items o productos y la
tarjeta sin cambios).

Ajustadas:

* reports.test "cruza el fin de mes": esperaba marzo completo contra 29/01 a 28/02 y septiembre contra 02/08 a 31/08,
  la regla anterior. Pasa a un rango de varios meses que no es un mes calendario.
* LiveReportsPage.test, caso "mes anterior": esperaba 31/08/2026 a 30/09/2026 (el defecto); ahora septiembre completo.
* ProductsPage.test "pagina de 25 en 25": con Todos el pie dice "items".

## Verificacion en Edge sin ventana (CDP), contra Vite y el backend dev

Scripts en `%TEMP%\servibox-scratch\fix65`, fuera del repo. La siembra dev no trae servicios: se crearon tres
(SV-01 a SV-03) por la API en el H2 en memoria para probar el filtro.

* Ventas con Credito: texto "Credito" con tilde, sin secuencias mal codificadas; tabla de 1119 en 1119 a 1440, SALDO
  completo. A 390 la tabla se desplaza dentro de su contenedor (840 en 340) y la pagina no desborda.
* Estado de resultados, Mes anterior: "vs. septiembre de 2026"; +15 %, +15 %, +13 %, -1 %, +178 %, igual a la API
  (octubre contra 01/09 a 30/09). Este mes: "vs. 11/10/2026 a 31/10/2026", +71 %, +74 %, +67 %, +26 %, +616 %, igual
  a la API y a la nota de feat/63.
* Flujo de caja: sin "+$ 0" ni "-$ 0". Este mes, Ingresos ocasionales (Entrada, 0 movimientos) muestra "$ 0". La
  siembra no trae una Salida en cero; ese caso lo cubre la prueba.
* Inventario: Servicios "1 a 3 de 3 items", Todos "1 a 25 de 30 items", Productos "1 a 25 de 27 productos"; la tarjeta
  Total de productos sigue en 27.
* Menu lateral: ServiBox v1.1.1 (tras reiniciar Vite, que lee la version al arrancar).

Capturas en `%TEMP%\servibox-scratch\shots-fix65` con `verify-result.txt`. Backend, Vite y Edge detenidos.

## Limitaciones

* Inventario es la tabla mas justa: 73 px de margen a 1440 con la barra lateral abierta.
* El pie no pasa a singular: "1 a 1 de 1 items", igual que "productos" antes.
* Con el filtro Servicios y sin servicios, el listado muestra "Aun no tienes productos. Crea el primero."; no se
  cambio (fuera de esta tarea).
* No se probo contra produccion.
