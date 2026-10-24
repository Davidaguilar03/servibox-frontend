# 2026-10-24: Una accion primaria por pantalla

Rama `fix/18-primary-action-rule`. Corrige los hallazgos BTN-01 y BTN-03 y documenta BTN-02 y
BTN-04 de la auditoria visual del 2026-10-24 (reporte fuera del repo, en el escritorio).

## Hecho

* `EmptyState` (`states.tsx`) recibe la accion como `{ label, to | onClick, variant }` y la pinta
  secundaria por defecto (enlace con `to`, boton con `onClick`). Ninguna pantalla pasa hoy
  `variant: 'primary'`.
* Vacio con la accion en secundario en las 8 rutas de la auditoria: Facturas de venta, Facturas
  de compra, Productos, Categorias, Clientes, Proveedores, Gastos operativos e Ingresos
  ocasionales. Los "Limpiar filtros" y "Cambiar el periodo" pasan al formato nuevo sin cambiar.
  Revisados contra el codigo los demas vacios (panel, papelera, detalles, lineas de factura,
  modales y movimientos de Cuentas): no tienen accion o ya era secundaria, no hay rutas nuevas.
* Cuentas: con dos o mas cuentas el primario es Nueva transferencia; con menos, Nueva cuenta, y
  Nueva transferencia queda secundaria, deshabilitada y con su explicacion. Textos sin cambios.
* `Button` expone `data-variant`; los enlaces con `buttonClasses` lo llevan a mano, salvo la
  landing, que no se toca (excepcion temporal hasta el rediseno).
* Vitest: `testTimeout` y `hookTimeout` en 15 s (`vite.config.ts`) y `asyncUtilTimeout` de
  Testing Library en 5 s (`src/test/setup.ts`), sin cambiar pruebas. Una prueba de Cuentas fallo
  una vez de forma intermitente bajo carga y no se reprodujo en tres suites completas.
* Pruebas: `primaryActions()` y `emptyStateOf()` en `src/test/utils.tsx`; una prueba de vacio por
  ruta (8), Cuentas con 0, 1 y 2 cuentas (3) y `states.test.tsx` con las variantes de
  `EmptyState` (4). Ninguna prueba existente dependia de la variante: las de vacio buscan los
  botones por nombre y siguen igual. Pruebas: 561 a 576.
* Docs: regla en [02-CONVENTIONS.md](../02-CONVENTIONS.md) y dos entradas en
  [03-DECISIONS.md](../03-DECISIONS.md) (regla del primario y limite de tiempo de las pruebas).

## Verificacion

* `npm run build`, `npm run lint` y `npm test` sin errores ni advertencias (576 pruebas, 51 s).
* Prueba visual en Chrome con el backend en perfil dev (8080) y Vite (5173). Tenant recien
  registrado: Facturas de venta, Facturas de compra, Productos, Clientes, Proveedores, Gastos
  operativos e Ingresos ocasionales muestran el vacio con la accion en borde gris y un solo rojo,
  el del encabezado. Categorias no se vio vacia: el registro siembra tres categorias. Cuentas
  tampoco se vio con 0 cuentas: el registro siembra Caja General; con una cuenta, Nueva cuenta es
  el unico rojo y Nueva transferencia esta gris y deshabilitada. Con el tenant demo (datos), las
  9 pantallas siguen con un solo primario y Cuentas (2 cuentas) muestra Nueva transferencia en
  rojo. El item activo de la barra lateral tambien tiene fondo `action`, pero es navegacion, no
  un boton. Al terminar no quedo nada escuchando en 8080 ni en 5173.

## Pendiente

* Landing: dos primarios hasta la fase de rediseno.
* Aligerar las pruebas de formularios largos (`RegisterPage`, factura de compra) si el limite de
  15 s vuelve a quedarse corto.
