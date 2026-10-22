# 2026-10-22: Detalle de factura de compra

Rama `feat/10-purchase-detail`.

## Hecho

* `/compras/:id` es `PurchaseDetailPage`: encabezado con numero y estado, datos del proveedor,
  productos, pagos, resumen, modal Registrar pago y modal Anular. 404 o id no numerico:
  "Factura no encontrada".
* `src/purchases/purchaseDetail.ts`: botones por estado y validacion del pago con el saldo
  de la cuenta. Se reutilizan de `saleDetail.ts`, sin cambios, el resumen, el id, el total
  de linea, el orden, el rango de fecha y el cuerpo del POST.
* `purchasesApi.ts`: detalle, pagos de la compra, registrar pago y anular.
* Decisiones en [03-DECISIONS.md](../03-DECISIONS.md), entradas del 2026-10-22.

## Comportamiento verificado en el backend

* `GET /api/purchases/{id}`: 404 `{"error": "Compra no encontrada: id", "status": 404}`; un id
  no numerico es 400 "Valor invalido 'abc' en el parametro id".
* `POST /api/purchases/{id}/payments`: `accountId` y `amount` obligatorios, `date` opcional
  (hoy). Orden: estado PENDIENTE, monto mayor que cero, fecha no futura, monto no mayor que
  el saldo mas un peso, cuenta del tenant, saldo de la cuenta (409). Con saldo restante
  menor o igual a un peso pasa a PAGADA.
* `POST /api/purchases/{id}/annul`: PAGADA o PENDIENTE; rechaza si el stock actual es menor
  que lo comprado; revierte saldos sin borrar movimientos; no revierte el costo.

## Prueba real

Backend en perfil dev (8080) y `npm run dev` (5173), con Chrome. Datos creados por la API a
traves del proxy: proveedor, CT-100 (contado 95.200), CR-200 (credito 114.240 con pago de
40.000), CR-300 (credito 618.800 sin pagos), CR-400 (credito 303.450) y una venta de todo
el stock de DEMO-003; una cuenta Caja Menor de 50.000 para probar el saldo insuficiente.

* Detalle de cada compra igual a la API; Pagado menos suma de PAGO_COMPRA: 0 en PROV-1001,
  CR-200, CR-300 y CR-400 (CT-100 anulada: sin movimientos visibles).
* Pago de 200.000 a CR-300 desde Caja General: saldo 418.800 y la caja bajo 200.000 exactos.
* Valor 700.000: "No puede superar el saldo pendiente de $ 618.800". Caja Menor con 200.000:
  Alert de saldo insuficiente y boton deshabilitado.
* Pago del resto: Pagada y sin Registrar pago.
* Anular CT-100: toast, fuera del listado, stock 15 a 10, costo 16.000 sin cambio, caja
  +95.200.
* Anular CR-400 con su stock vendido: el backend lo rechaza y el mensaje queda en el modal;
  stock en 0, sin negativos.
* CT-100 por URL: solo lectura; `/compras/999`: Factura no encontrada.

## Pendientes

* Papelera y recuperar una compra anulada.
* Backend: mensajes con doubles crudos y fechas de pago anteriores a la factura aceptadas.
