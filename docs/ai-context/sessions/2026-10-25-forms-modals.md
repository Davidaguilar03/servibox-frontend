# 2026-10-25: Formularios, modales, panel de margen y toasts

Rama `feat/28-forms-details-modals-redesign`. Decision en
[03-DECISIONS.md](../03-DECISIONS.md), reglas en [05-DESIGN-SYSTEM.md](../05-DESIGN-SYSTEM.md)
y [02-CONVENTIONS.md](../02-CONVENTIONS.md). Sin cambios de rutas, logica de negocio,
backend ni colores.

## Lectura previa

* (a) Facturas: N.o factura, Fecha, Tercero, Vence, Forma de pago, Estado, Total, Saldo
  pendiente y Ver detalle; menor prioridad Vence, Forma de pago y Fecha. Recuadro de la tabla
  con la barra abierta: 942 px de contenido a 1280 y 686 a 1024 (976 y 720 con el borde).
* (b) `InventoryService.aplicarPrecios`: IVA = costo x suma de las tasas `isVat` de la
  categoria; k = (1 - gastos) x (1 - renta DIAN); divisor = k - ICA - margen de la categoria;
  precio = costo x k / divisor (o el costo si el divisor es menor o igual a 0). BigDecimal
  desde `BigDecimal.valueOf(double)`, division a 34 digitos y un solo redondeo al peso
  entero HALF_UP (`Moneda.aPesosEnteros`). Gastos, renta e ICA salen de la configuracion
  financiera; la comision de tarjeta no entra. El formulario ya consultaba las categorias
  (con margen e impuestos) pero no la configuracion financiera.
* (c) Ver la tabla de Guardar.
* (d) Con guardian: cuenta, transferencia, gasto, ingreso, categoria (propio) y tercero en
  Clientes y Proveedores. Sin guardian: abono, pago y el tercero desde las facturas.
* (e) Toasts: solo de exito, 5 s fijos con un `setTimeout` del modulo, sin cerrar, region
  `role="status"` con `aria-live`.
* (f) El router es de datos (`createBrowserRouter`): `useBlocker` ya se usaba en las facturas,
  el producto y Configuracion.

## Regla de Guardar por formulario

| Formulario | Antes | Despues |
|-|-|-|
| Registro | Deshabilitado hasta ser valido | Habilitado; al enviar, errores y foco |
| Login | Solo al enviar | Igual (validacion nativa) |
| Nueva venta | Deshabilitado hasta ser valido | Habilitado; errores bajo cada campo, foco al primero o a Agregar producto |
| Nueva compra | Deshabilitado hasta ser valido o sin saldo | Habilitado; mismo comportamiento, sin saldo el foco va a la cuenta |
| Producto (nuevo) | Solo al enviar; validaba al salir | Igual mas foco al primer error |
| Producto (editar) | Solo al enviar | Al enviar y sin cambios |
| Categoria (nueva / editar) | Al enviar o sin impuestos cargados | Igual; al editar tambien sin cambios; foco al primer error |
| Tercero (nuevo / editar) | Solo al enviar | Igual; al editar sin cambios; foco al primer error |
| Gasto e ingreso (nuevo / editar) | Solo al enviar | Igual; al editar sin cambios; foco al primer error |
| Cuenta y transferencia | Solo al enviar | Igual mas foco al primer error |
| Abono y pago | Deshabilitado hasta ser valido; errores en vivo | Habilitado; valida al salir del campo; foco al primer error |
| Configuracion datos y financiera | Sin cambios o con errores | Solo sin cambios (edicion) o al enviar |
| Reportes (Generar) | Deshabilitado hasta ser valido | Habilitado; foco al campo con error |

## Guardian y router

Modales con `DiscardableModal`: abono, pago, gasto, ingreso, transferencia, cuenta,
categoria (misma confirmacion) y tercero (ahora tambien desde las facturas). Paginas con
`UnsavedChangesGuard`: nueva venta, nueva compra, producto (nuevo y edicion) y Configuracion.
El router permite `useBlocker`; no hizo falta reestructurar rutas. `beforeunload` sigue para
cerrar o recargar la pestana.

## Campos de dinero que aceptan decimales

Precio de linea de la nueva venta y de la nueva compra (numero libre), valor del abono y del
pago (`type="number"`, `step="any"`), monto del gasto, del ingreso y de la transferencia y
saldo inicial de la cuenta (`parseAmount`, coma decimal). Solo el costo del producto pasa a
pesos enteros.

## Verificacion

* `npm run build`, `npm run lint` y `npm test`: 898 pruebas (base 870).
* Precio: tenant nuevo, LLANTAS (IVA 19 %) con margen 0,30 y configuracion en 0: costo
  12.345, panel $ 2.346 y $ 17.636, API `taxAmount` 2346 y `suggestedPrice` 17636. Con
  gastos 10, renta 5 e ICA 0,0082: costo 30.000, panel $ 5.700 y $ 46.909, API 5700 y 46909.
  El panel es `sticky` desde lg.
* Tabla de facturas (desplazamiento = scrollWidth - clientWidth del recuadro): ventas y
  compras 0 px a 1280 (7 columnas), 1024 y 768 (6 columnas); tarjetas a 390.
* Otras tablas a 1024 con la barra abierta, sin cambios en esta tarea (desplazamiento
  contenido en su recuadro): Productos 207, Categorias 105, Papeleras 88 y 89, Proveedores
  54, Clientes 41, Cuentas 40, Gastos 10. A 1280 ninguna se desplaza.
* Envio vacio en el navegador: cada formulario lleva el foco al primer campo con error
  (nueva venta a Agregar producto) y anuncia el resumen.
* Guardian en abono, pago, gasto y categoria con Esc, clic fuera y la X: confirma con el foco
  en Seguir editando; Descartar cierra. Nueva venta con una linea: el enlace Inicio pide
  confirmar; Seguir editando se queda y Descartar navega.
* Toasts: exito desaparece a los 5 s; error sigue a los 6,5 s y se cierra con Enter en
  "Cerrar aviso"; con el cursor encima sigue a los 7 s y se cierra despues; con 4 avisos
  quedan los 3 ultimos.
* Objetivos tactiles: 1 de 256 a 390 (la miga ya justificada) y 0 de 366 a 1280. Desbordes:
  0 en 176 casos. `tokens.test.ts` sin cambios.

## Pendientes

* Productos, Categorias, Papeleras, Clientes, Proveedores, Cuentas y Gastos se desplazan
  dentro de su recuadro a 1024 con la barra abierta: aplicar la misma tecnica.
* Ninguna pantalla muestra todavia un toast de error (la API existe: `showToast(texto,
  'error')`).
