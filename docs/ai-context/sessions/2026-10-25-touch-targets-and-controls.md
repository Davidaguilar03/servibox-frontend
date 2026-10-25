# 2026-10-25: Areas tactiles, segmentado unico, foco y codigos

Rama `fix/26-touch-targets-and-controls`. Decision en [03-DECISIONS.md](../03-DECISIONS.md),
reglas en [05-DESIGN-SYSTEM.md](../05-DESIGN-SYSTEM.md) y
[02-CONVENTIONS.md](../02-CONVENTIONS.md). Sin cambios de textos visibles, rutas, logica,
backend ni colores.

## Lectura previa

* Selecciones entre pocas opciones, cada una distinta:
  * Periodo de Cuentas: botones con `aria-pressed` en `role="group"`.
  * Tarjetas de cuenta de Cuentas: botones con `aria-pressed` (comportamiento propio, se
    conserva).
  * Tipo de pago de nueva venta y nueva compra: radios nativos ocultos en rotulos, pista de
    40 con segmentos de 30.
  * Formato de Reportes: radios nativos ocultos, segmentos de 44. Tipo de reporte: tarjetas
    con radio nativo y descripcion (se conservan).
  * Pestanas de Configuracion: `tablist`/`tab` propio con flechas, Inicio y Fin.
  * Pestanas de Productos: botones con `aria-pressed` en `role="group"`.
  * Color de categoria: radios nativos en muestras de 44 (se conservan).
  * Periodo de Ventas, Compras, Papelera y Movimientos manuales, filtros por estado y tipo de
    documento: son `SelectField` (selector nativo), no segmentados; no se migran.
* Foco: botones y enlaces con `focus-visible:outline-2 outline-offset-2 outline-brand`
  repetido en 23 archivos; campos con `outline-none`, borde `brand` y `ring-3 brand/20`.
* `Button`: todas las variantes con `h-control` (40) y `px-button-x` (22); la variante `text`
  recibia `px-2` (o `h-auto px-2 py-1` en Reportes) en 10 lugares.
* `codigo` (IBM Plex Mono) en codigos de producto, numeros de factura y NIT; se partia en el
  guion (`BA-` / `007`) en Inicio y Productos porque la columna se encogia y el codigo
  podia envolver.
* "Saltar al contenido": el de la landing tenia `focus:px-4 focus:py-2`; el del shell perdia
  el relleno al enfocarse (`not-sr-only` lo pone en 0).

## Objetivos por debajo del minimo

Script del scratchpad (Edge sin ventana por CDP): 18 vistas internas (panel, ventas, nueva
venta con 2 lineas, detalle de venta, compras, detalle de compra, productos, nuevo producto,
categorias, cuentas, gastos, clientes, proveedores, reportes, configuracion, modal Nuevo
gasto, menu de usuario y menu lateral movil) a 390 y 1280. Minimo: 44 x 44 a 390; a 1280, 40
de alto en botones y campos y 36 en acciones de fila, iconos y enlaces de texto con
`hit-area`. Casillas y radios se miden por su rotulo; con un modal abierto solo cuenta el
dialogo.

| Vista | 390 antes | 390 despues | 1280 antes | 1280 despues |
|-|-|-|-|-|
| Panel | 4 | 0 | 0 | 0 |
| Ventas | 10 | 0 | 16 | 0 |
| Nueva venta | 21 | 1 | 1 | 0 |
| Detalle de venta | 4 | 0 | 0 | 0 |
| Compras | 10 | 0 | 2 | 0 |
| Detalle de compra | 4 | 0 | 0 | 0 |
| Productos | 12 | 0 | 27 | 0 |
| Nuevo producto | 12 | 0 | 0 | 0 |
| Categorias | 7 | 0 | 3 | 0 |
| Cuentas | 6 | 0 | 0 | 0 |
| Gastos | 7 | 0 | 0 | 0 |
| Clientes | 7 | 0 | 0 | 0 |
| Proveedores | 7 | 0 | 0 | 0 |
| Reportes | 3 | 0 | 0 | 0 |
| Configuracion | 5 | 0 | 0 | 0 |
| Modal Nuevo gasto | 8 | 0 | 0 | 0 |
| Menu de usuario | 4 | 0 | 0 | 0 |
| Menu lateral movil | 0 | 0 | | |
| **Total** | **131 de 269** | **1 de 273** | **49 de 374** | **0 de 378** |

Separacion minima entre objetivos adyacentes a 390: antes 4 px (28 pares por debajo de 8:
acciones de fila, menu lateral, pestanas de Productos); despues 8 px, 0 pares.

Justificado: la miga "Ventas" de Nueva factura a 390 mide 40 x 44 porque la miga se trunca
para caber; esta separada 8 px y un separador de su vecina.

## Hecho

* Tokens `--control-height`, `--control-height-touch`, `--hit-min`, `--hit-row`,
  `--focus-ring`, `--focus-ring-offset` y `--focus-ring-on-tint`; utilidades `focus-ring`,
  `focus-ring-field`, `focus-ring-within` y `hit-area`; `codigo` con `nowrap`.
* Componentes nuevos: `IconButton`/`IconLink`, `SegmentedControl`/`TabList` y `SkipLink`.
* Migrados al componente unico: periodo de Cuentas, tipo de pago de nueva venta y de nueva
  compra, formato de Reportes (SegmentedControl); pestanas de Configuracion y de categorias de
  Productos (TabList).
* `IconButton` en cerrar del modal, editar y eliminar de gastos e ingresos, editar y nueva
  factura de clientes y proveedores, y quitar linea de las nuevas facturas. Paginacion
  `size-touch lg:size-control` con `gap-2`. Boton "Abrir menu" con `shrink-0`; migas con
  `leading-11` bajo lg; menu lateral `gap-2` bajo lg.
* `hit-area` en Ver detalle, Editar, Ver todas, Ver inventario, Ver cuentas, Nuevo
  cliente/proveedor y los enlaces de la papelera.
* Casilla de terminos del registro: el rotulo mide 44 (`min-h-touch py-3`).

## Desbordes internos

Corregidos los 6 que reportaba el script:

* Cerrar de 3 modales (`-mr-2`): `IconButton` sin margen negativo.
* NIT `nowrap` en tarjetas de Clientes y Proveedores a 360: el tipo y el numero pueden ir en
  dos lineas bajo md (el numero no se parte).
* Resumen de `/compras/1` a 1024: las filas envuelven (`flex-wrap`).

Ademas: el saldo pendiente de `/ventas/17` desbordaba 14 px a 1024 (no estaba en el
script); se corrigio igual que el de compras. Script de desbordes (176 casos, 360 a 1536,
tenant demo y rutas publicas): 0 desbordes y 0 internos.

## Verificacion

* `npm run build`, `npm run lint` y `npm test`: 833 pruebas (base 797).
* Teclado (Edge con emulacion de foco): flechas, Inicio y Fin en el periodo de Cuentas y en
  las pestanas de Configuracion, con un solo tabulable por grupo; anillo de 2 px `#ff3b30`
  con separacion 2 en campos, botones, segmentados y "Cerrar sesion"; Saltar al contenido con
  relleno 8/16 y foco en `main`; menu de usuario abre con Enter y cierra con Esc devolviendo
  el foco; menu lateral movil lleva el foco al primer enlace y Esc lo devuelve a "Abrir menu".
* Codigos: 0 partidos en Inicio, Productos, Ventas, Compras, Clientes, Proveedores y los
  detalles a 1440, 1280, 1024, 768, 390 y 360.
* `tokens.test.ts`: pares existentes sin cambio; se agregaron los del anillo de foco.

## Cambios visuales

* Bajo lg botones y campos miden 44 (antes 40); paginacion 44 bajo lg y 40 desde lg (antes
  36); cerrar del modal 44 bajo lg.
* Segmentados como pildoras separadas (antes pista con segmentos en Tipo de pago y Formato).
* Pestanas de Configuracion en `body` (antes `small`); a 390 la segunda se desplaza.
* Campos: anillo de 2 px brand al enfocarse en lugar del borde rojo con halo.
* Botones de texto con el relleno de 22 de los demas.
* Las columnas de codigo ya no se parten; en Productos la descripcion envuelve mas.

## Pendientes

* Los toasts no tienen boton de cerrar (A11Y-13): agregarlo es una funcion nueva.
* Configuracion sigue rotulando "Identificador de la serviteca".
* El anillo usa `transition-colors`: aparece en 120 ms.
