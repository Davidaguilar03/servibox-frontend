# 2026-10-25: Listados, saldo pendiente y selector de periodo unico

Rama `feat/27-lists-redesign`. Decision en [03-DECISIONS.md](../03-DECISIONS.md), reglas en
[05-DESIGN-SYSTEM.md](../05-DESIGN-SYSTEM.md) y [02-CONVENTIONS.md](../02-CONVENTIONS.md).
Sin cambios de backend, rutas, logica de consulta ni colores.

## Lectura previa

* (a) El listado ya trae el saldo: `Sale.pendingBalance` (`dashboard/dashboardApi.ts`, de
  `GET /api/sales`) y `Purchase.pendingBalance` (`purchases/purchasesApi.ts`, de
  `GET /api/purchases`), "lo que falta por cobrar o pagar; 0 en una ANULADA".
* (b) Selectores de periodo: ver el inventario abajo.
* (c) Encabezados: Ventas y Compras 3 secundarias y 1 primaria; Productos 1 y 1; Categorias,
  Gastos, Ingresos, Clientes y Proveedores 1 y 1; Papeleras 1 secundaria sin primaria;
  Cuentas 2 secundarias y 1 primaria que depende del numero de cuentas, con dos ayudas.
* (d) Enlaces en celdas: 5 estilos (Ventas y Compras en body 500; Productos y Categorias en
  small 500 con `whitespace-nowrap`; panel en small 500; papelera con el rol codigo).
* (e) 55 usos de `font-medium` en 24 archivos.
* (f) A 390 las pestanas de Configuracion (body) se desplazaban y la segunda quedaba cortada;
  las de Productos se desplazaban sin indicio de que habia mas.

## Inventario de selectores de periodo

| Pantalla | Antes | Despues |
|-|-|-|
| Facturas de venta | Selector "Periodo": Este mes (defecto), Mes anterior, Este ano, Todas; filtra en el cliente por prefijo de fecha | `PeriodPicker` con las mismas opciones y el rango visible |
| Facturas de compra | Igual que ventas | `PeriodPicker`, igual |
| Papeleras | Selector: mismas opciones, defecto Todas | `PeriodPicker`, defecto Todas |
| Gastos e Ingresos | Selector "Periodo": Este mes (defecto), Mes anterior, Este ano, Todas, Personalizado con Desde y Hasta debajo de la barra | `PeriodPicker` con Personalizado dentro del mismo control |
| Cuentas | Segmentado: Hoy, Esta semana, Este mes (defecto), Mes anterior, Este ano, Personalizado | `PeriodPicker` (selector), mismas opciones y la misma URL |
| Reportes | Desde y Hasta sueltos, del 1 del mes a hoy | `PeriodPicker`: Este mes (defecto, mismo rango), Mes anterior, Ultimos 30 dias, Este ano, Personalizado |

Todos calculan el rango con `businessToday()` (America/Bogota): `lib/period.ts` reemplaza el
`periodRange` de Cuentas. Las consultas y la URL no cambian.

## Saldo pendiente

Hecha en Facturas de venta y de compra (tabla, a la derecha de Total, y tarjetas moviles):
`$ 0` en tono neutro si esta pagada, `—` si esta anulada (en el listado no aparecen) y el
saldo en tono normal si falta. El listado no distingue vencidas, asi que no hay rojo.

## Verificacion

* `npm run build`, `npm run lint` y `npm test`: 870 pruebas (base 833).
* Saldo contra la API: FV-0017 (credito con abonos) lista $ 6.706.376 y saldo $ 3.706.376;
  `GET /api/sales/17` total 6706375.9 y `pendingBalance` 3706375.9. LRB-2210 (compra) lista
  $ 5.645.360 y saldo $ 2.645.360; `GET /api/purchases/{id}` 5645360 y 2645360.
* Periodos contra la API (hoy 25/10/2026): Ventas Este mes 16 y Mes anterior 14 facturas;
  Compras 2 y 3; Papelera de ventas 1 y 1; Gastos Este mes $ 5.192.200, Mes anterior
  $ 7.221.800 y Personalizado 1 a 15 sep. $ 5.191.800; Cuentas (todas) ingresos Este mes
  $ 16.724.657 y Mes anterior $ 28.786.774; Reportes Ventas sin IVA Este mes $ 20.781.907 y Mes
  anterior $ 23.099.898. Todas iguales a la API con los mismos parametros. Rango invertido:
  "Hasta no puede ser anterior a Desde." en Gastos, Cuentas y Reportes (Generar deshabilitado).
* Teclado: "Mas" a 390 abre con Enter, Tab entra al panel, Esc lo cierra y devuelve el foco; a
  1280 no aparece y las secundarias van en linea. El selector de periodo cambia con flecha
  abajo y actualiza la URL y el rango. Pestanas: flechas, Inicio y Fin.
* Configuracion a 390 (167 x 44 cada pestana) y 360 (152 x 57, etiqueta en dos lineas): sin
  desplazamiento. Productos a 390: se desplaza, borde difuminado y la ultima pestana elegida
  con Fin queda a la vista.
* Primarios por pantalla a 1280 y 390: 1 en cada listado, 0 en las papeleras.
* Objetivos tactiles (script de fix/26): 1 de 258 a 390 (la miga "Ventas" de Nueva factura,
  ya justificada) y 0 de 368 a 1280; separacion minima 8 px.
* Script de desbordes (176 casos): 0 desbordes y 0 internos. `tokens.test.ts` sin cambios.

## Cambios visuales

* Encabezados con "Mas" bajo lg en Ventas, Compras y Cuentas.
* Barras de filtros: "Limpiar" pasa a "Limpiar filtros" y solo aparece con filtros activos.
* Cuentas y Reportes eligen el periodo con un selector en vez de pildoras o fechas sueltas.
* Facturas: columnas reordenadas y Saldo pendiente; tarjetas moviles con el saldo.
* Enlaces de celda en small 600; pestanas en small; todo `font-medium` pasa a 600.

## Pendientes

* A 1280 con la barra lateral abierta la tabla de facturas (9 columnas) se desplaza dentro de
  su contenedor y los nombres largos de cliente ocupan varias lineas.
* La etiqueta "Periodo" pasa a "Período" (con tilde) en los listados.
