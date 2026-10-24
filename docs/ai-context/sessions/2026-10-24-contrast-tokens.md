# 2026-10-24: Tokens de contraste

Rama `fix/17-contrast-tokens`. Corrige los hallazgos CON-01 a CON-07 y COL-01 de la auditoria
visual del 2026-10-24 (reporte fuera del repo, en el escritorio).

## Hecho

* `tokens.css`: `action` pasa a `brand-ink` con hover y activo por `color-mix` (92 y 86 por
  ciento con negro); tokens nuevos `border-control`, `success-ink`, `warning-ink`, `error-ink` e
  `info-ink`; `text-muted` pasa de #6b7280 a #5f6673. Valores y razones en
  [03-DECISIONS.md](../03-DECISIONS.md); reglas en [02-CONVENTIONS.md](../02-CONVENTIONS.md).
* Componentes base: `buttonStyles` (secundario), `TextField`, `SelectField`, `SearchField`,
  `ComboboxField`, `Pagination`, `StatusBadge`, `Alert` (titulo `-ink`, icono semantico) y
  `AppShell` (item activo con `bg-action` y anillo interior `brand`, separador de la miga).
* Paginas: montos verdes con `success-ink` (Cuentas, Gastos e Ingresos, detalles, Reportes),
  fila de utilidad neta con `-ink`, controles segmentados y pildoras con `border-control`,
  conteo de pestanas de Productos con `text-muted`, eyebrows de la landing y leyendas del
  registro sin rojo, muestras de color de Categorias con `border-control`.
* Prueba nueva `src/styles/tokens.test.ts`: lee `tokens.css` y exige 4.5 a 1 en los pares de
  texto clave y 3 a 1 en los bordes de controles (27 casos). Tres pruebas existentes de
  Reportes y Movimientos manuales comprobaban la clase de color del tono y pasaron a `-ink`.
* Pruebas: 534 a 561.

## Verificacion

* `npm run build`, `npm run lint` y `npm test` sin errores ni advertencias.
* Script de contraste de la auditoria sobre el `tokens.css` nuevo: los 17 pares que fallaban
  cumplen; no queda ningun par que falle (86 pares, los exentos se informan).
* Prueba visual en Chrome con el backend en perfil dev (8080) y Vite (5173): login, panel,
  Facturas de venta, Productos, Cuentas, Gastos operativos, Reportes, Configuracion financiera,
  registro y landing. No se vieron la paginacion ni un Alert de exito: los datos de demostracion
  no llegan a 25 filas y ninguna pantalla usa hoy el tono success del Alert. Al terminar no quedo
  nada escuchando en 8080 ni en 5173.

## Pendiente

* Validar con el disenador el primario en `brand-ink`, el nuevo `text-muted` y el anillo del item
  activo de la barra lateral (el relleno contra el carbon da 2.81 a 1).
