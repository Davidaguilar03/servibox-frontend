# 2026-10-22: Facturas de compra y Nueva factura de compra

Rama `feat/9-purchases-list-new`.

## Hecho

* Parte A: extraidos `lib/businessDate.ts`, `lib/accountPayment.ts`,
  `counterparties/NewCounterpartyModal.tsx` y `components/UnsavedChangesGuard.tsx` desde
  Nueva factura de venta. Las pruebas de ventas pasan sin cambios salvo rutas de importacion.
* Parte B: `/compras` es `PurchaseInvoicesPage` (indicadores, filtros en la URL, tabla y
  tarjetas). `/compras/papelera` y `/compras/:id` son Proximamente.
* Parte C: `/compras/nueva` es `NewPurchaseInvoicePage` (proveedor, numero, fecha, contado o
  credito, cuenta con saldo, medio del diccionario de compras, lineas, IVA descontable, aviso
  de saldo insuficiente, 409 bajo el numero, aviso de cambios sin guardar).
* Chunk `vendor` en `vite.config.ts` para que el build no advierta por tamano.
* Decisiones en [03-DECISIONS.md](../03-DECISIONS.md), entradas del 2026-10-22.

## Contrato verificado en el backend

* `GET /api/purchases` y `/{id}`: `id`, `invoiceNumber`, `supplier` (tercero completo),
  `invoiceDate`, `dueDate`, `paymentType`, `paymentMethod`, `status`, `subtotal`,
  `ivaTotal`, `total`, `pendingBalance` (0 en ANULADA) y `details` (`productId`,
  `productCode`, `productDescription`, `quantity`, `price` sin IVA, `ivaAmount`).
* `POST /api/purchases`: `invoiceNumber` `@NotBlank`, `paymentType` y `details` no vacios
  son de Bean Validation (400 "Peticion invalida"); `supplierId` lo exige el servicio (400);
  `accountId` obligatorio en contado (400), ignorado en credito; `dueDate` e `invoiceDate`
  opcionales (sin fecha, hoy); `paymentMethod` texto libre; cantidad mayor que cero (400);
  el precio no se valida. 409 por numero repetido en el tenant y por saldo insuficiente.

## Prueba real

Backend en perfil dev (H2 en memoria, puerto 8080) y `npm run dev` en 5173, con Chrome.

* Contado LV-5001 desde Caja General: vista previa y backend 231.333,31 / 43.953,33 /
  275.286,64; IVA por linea 20.393,33 y 23.560. Diferencia cero.
* Credito IA-777 con proveedor nuevo del modal y 60 dias (vence 21/12/2026): 502.469,14 /
  95.469,14 / 597.938,28. Diferencia cero.
* Stock +7, +4 y +2; costos y precios sugeridos recalculados; Caja General de 1.946.250 a
  1.670.963,36; Bancolombia sin cambio con la compra a credito.
* Saldo insuficiente (1.844.500 contra 1.670.963): Alert y Guardar deshabilitado.
* Numero repetido LV-5001: 409 bajo el campo. Cancelar con datos: modal Descartar cambios.
* Indicadores contra la API: Compras del mes 873.224,92; Por pagar 497.938,28 tras un pago
  de 100.000 por la API; Pagos del mes 100.000.
* No se pudo achicar la ventana del navegador: la vista de tarjetas solo esta cubierta por
  las pruebas.

## Pendientes

* Detalle de compra, pagos, anulacion, Papelera, Proveedores (tareas propias).
* Backend: los mensajes de saldo traen doubles crudos (`3250000.0`, `1.0E7`).
