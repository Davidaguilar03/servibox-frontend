# 2026-10-18: Detalle de factura de venta, abonos y anulacion

Objetivo: la pantalla Detalle de factura de venta en `/ventas/:id` segun la captura del
manual, con Registrar abono y Anular, y dos ajustes de Nueva factura
([2026-10-18-new-sale.md](2026-10-18-new-sale.md)). Rama `feat/5-sale-detail`.

## Hallazgos en el backend (verificados en el codigo)

* `GET /api/sales/{id}`: `SaleResponse` (id, invoiceNumber, customer con id, role, name,
  documentType, documentNumber, email, phone; invoiceDate, dueDate, paymentType,
  paymentMethod, status, subtotal, ivaPorPagar, total, pendingBalance, details con id,
  productId, productCode, productDescription, quantity, price, ivaAmount). Inexistente o de
  otro tenant: 404 `{"error":"Factura no encontrada: id","status":404}`. Un id no numerico
  es 400 "Valor invalido".
* `POST /api/sales/{id}/collections` (`CollectionRequest`: accountId y amount obligatorios,
  date opcional). Validaciones en orden, todas 400 con `{error, status}`:
  * factura no PENDIENTE (PAGADA o ANULADA): "Solo se puede abonar a una factura
    PENDIENTE, y esta esta <estado>";
  * monto nulo, cero o negativo: "El monto del abono debe ser mayor a cero";
  * fecha futura: "La fecha del abono (...) no puede ser posterior a hoy (...)"; una fecha
    anterior a la factura no se valida;
  * monto mayor que el saldo mas 1 peso de tolerancia: "El abono de X excede el saldo
    pendiente de Y";
  * cuenta inexistente o de otro tenant: "Cuenta no encontrada: id";
  * sin accountId o amount: "Peticion invalida".
  Responde 201 con el movimiento RECAUDO_VENTA. Si el saldo queda menor a 1 peso, la
  factura pasa a PAGADA.
* `POST /api/sales/{id}/annul`: devuelve el stock de cada linea y deshace en las cuentas
  el efecto de cada movimiento de la venta (contado y abonos), sin borrarlos: quedan
  inactivos. Se puede anular una PAGADA y una PENDIENTE con o sin abonos. Devuelve la
  factura ANULADA con `pendingBalance` 0. Anular una ya anulada: 400 "La factura X ya esta
  anulada".
* `GET /api/treasury/movements?saleId=` de una anulada devuelve una lista vacia.
* `pendingBalance` = total menos la suma de todos los RECAUDO_VENTA de la venta (activos o
  no), y 0 si queda menor a 1 peso; en una ANULADA siempre 0. En contado el recaudo es el
  total y el saldo es 0. En credito, sin abonos el saldo es el total. No se redondea:
  puede llegar con decimales binarios (495999.93999999994).

## Reglas de Autollantas (SaleDetailsController, CollectionFormController)

* El detalle muestra numero, cliente, fecha, cuenta, forma y medio de pago, vencimiento con
  los dias que faltan o de vencida, estado con color, total, saldo, notas, y las lineas con
  costo, precio sugerido, precio, IVA y utilidad.
* Anular esta en el listado (menu y boton), habilitado si no esta ANULADA; confirma con
  "Esta accion es irreversible. Se anulara la venta y las unidades vendidas seran devueltas
  al inventario automaticamente."
* Registrar abono se habilita con saldo mayor que 0 y estado distinto de PAGADA y ANULADA.
* El abono exige cuenta, metodo y valor mayor que 0; rechaza un valor mayor que la deuda
  mas 1 peso; pide confirmar con el saldo restante; la fecha por defecto es hoy y no se
  limita.

## Hecho

* Nueva factura: etiqueta "Metodo de pago" y cuenta EFECTIVO propuesta en contado.
* `SaleDetailPage`: encabezado con numero, estado y botones por estado; datos de la
  factura; productos con total de linea con IVA; abonos o pago recibido; resumen con
  abonado y saldo; modales Registrar abono y Anular; Factura no encontrada; solo lectura
  en una anulada; tarjetas bajo 768 px. Miga de pan con el numero (`useBreadcrumbTail`).
* Variante de boton `dangerSecondary` para Anular.

## Verificacion

* `npm run build` y `npm run lint` sin errores ni advertencias. 135 pruebas (105 de base).
* Prueba real con el backend en perfil dev, por el proxy: FV-0001 contado (645.999,94),
  FV-0002 credito con abono de 150.000 por la API, FV-0003 credito sin abonos
  (209.876,53). Por la interfaz: los tres detalles coinciden con la API; abono parcial de
  100.000 en FV-0003 (saldo 109.876,53), un valor mayor que el saldo bloqueado con el
  mensaje, el resto con el valor por defecto y la factura pasa a Pagada sin el boton;
  FV-0001 anulada desde el detalle (stock y caja revertidos, toast y fuera del listado);
  la anulada por URL en solo lectura; `/ventas/999` y `/ventas/abc` muestran Factura no
  encontrada; la nueva factura propone Caja General (id 2, aunque Bancolombia es id 1) y
  dice Metodo de pago.
* Abonado contra la suma de RECAUDO_VENTA: diferencia 0,00 en todos los casos salvo uno
  provocado a proposito: un abono de 495.999 a un saldo de 495.999,94 deja la factura
  Pagada con saldo 0 por la tolerancia de 1 peso, y el abonado (total menos saldo) da
  645.999,94 contra 645.999 de movimientos: 0,94.

## Pendiente

* Papelera (listar y recuperar anuladas), PDF, edicion de abonos y metodo de pago en
  abonos (requiere migracion V2 en el backend).
