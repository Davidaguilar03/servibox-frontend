# 2026-11-01: Todos los montos con punto de miles automatico

Rama feat/58-amount-field-everywhere desde main en 3594acb. Sin commit, push ni PR: quedan para el prompt de cierre, tras la
aprobacion de David.

Lectura previa: 00, 02, 06 y las dos notas anteriores completas; de 03-DECISIONS las entradas recientes y de 05 y 01 solo
busqueda, por su tamano. Guardas, antes de editar: designSystem.test.ts completa; copy.test.ts, tokens.test.ts y
errorMessages.test.ts solo el inicio, porque no se tocan textos, colores ni mensajes. Ninguna se modifico.

## Inventario

| Campo | Pantalla | Antes | A la API | Decimales | Decision |
|-|-|-|-|-|-|
| Saldo inicial | Nueva cuenta | texto | parseAmount | si | convertido |
| Saldo inicial | Editar cuenta | texto | parseAmount | si | convertido |
| Monto | Nueva transferencia | texto | parseAmount | si | convertido |
| Monto | Nuevo y Editar ingreso | texto | parseAmount | si | convertido |
| Monto | Nuevo y Editar gasto | texto | parseAmount | si | convertido |
| Valor del abono | Detalle de venta | number | Number | si | convertido |
| Valor del pago | Detalle de compra | number | Number | si | convertido |
| Precio | Nueva factura de venta | number | Number | maximo 2 | convertido |
| Precio sin IVA | Nueva factura de compra | number | Number | maximo 2 | convertido |
| Costo de compra sin IVA | Producto | AmountField | parseAmount | no | ya estaba |
| Gastos, Renta, Comision de tarjeta (%) e ICA (por mil) | Configuracion | texto | parseDecimal | si | sin tocar: no es dinero |
| Margen objetivo (%) y umbrales de stock | Categorias | texto | propia | | sin tocar: no es dinero |
| Cantidad, Stock | Facturas, Producto | | | no | sin tocar: no es dinero |

No hay descuentos, monto recibido ni filtros de dinero. Ningun campo quedo como ambiguo.

## Que cambio

* `AmountField` no cambia. `TextField` recibe `compact`, para el precio de linea: etiqueta oculta desde xl, valor a la derecha.
* `lib/amountInput.ts`: `amountTextFromNumber` (precarga) y `amountToDecimalText` (precio de linea).
* Abono, pago y precio de linea leen el texto formateado en vez de `Number`. Reglas, mensajes y cuerpos de la API sin cambios.
* El Monto de ingreso y gasto, el abono y el pago ganan el rol `monto`, que antes no tenian.
* Sin textos nuevos.

## Decimales

Punto de miles y coma decimal en todos. El precio de linea rechaza mas de 2 decimales con su mensaje de siempre. Los demas no
limitan y el servidor normaliza. Solo el costo de producto rechaza centavos.

## Verificacion en Edge sin ventana, backend dev en H2 en memoria, teclas reales

La clave de la demo sale de DevDataInitializer, unica lectura del backend, autorizada en el prompt.

| Paso | Esperado | Obtenido |
|-|-|-|
| Monto tecla a tecla, 1500000 | 1, 15, 150, 1.500, 15.000, 150.000, 1.500.000 | igual |
| Ingreso, POST amount | 1500000 | igual |
| Ingreso, saldo Caja General, de 4406852,45 | 5906852,45 | igual |
| Editar ingreso, precarga y Guardar | 1.500.000, deshabilitado | igual |
| Editar a 1600000,50: campo, PUT amount, saldo | 1.600.000,50, 1600000.5, 6006852,95 | igual |
| Escribir 1.5a | 15 | igual |
| Abono FV-0024, precarga | 3.729.654,92 | igual |
| Abono 1500000: POST amount, saldo de factura, Caja General | 1500000, 2229654,92, 7506852,95 | igual |
| Pago LRB-2210, precarga | 2.645.360 | igual |
| Pago 1500000: POST amount, saldo de factura, Caja General | 1500000, 1145360, 6006852,95 | igual |
| Gasto 250000: POST amount, Caja General | 250000, 5756852,95 | igual |
| Nueva cuenta 1500000,5: campo, POST, saldo | 1.500.000,5, 1500000.5, 1500000.5 | igual |
| Editar cuenta: precarga; a 2000000: PUT, saldo | 1.500.000,5; 2000000, 2000000 | igual |
| Transferencia 1500000: POST, origen, destino | 1500000, 15463933,02, 8307530,08 | igual |
| Venta 1500000,5: campo, POST price | 1.500.000,5, 1500000.5 | igual |
| Compra 150000: campo, POST price | 150.000, 150000 | igual |
| Precio precargado: venta y compra | con formato | 82.857 y 58.000 |
| Precio de linea frente a Cantidad a 1440 | alto igual, a la derecha | 40 y 40, derecha |

A 390: los 9 formularios sin desborde horizontal, campo de 44 px. Capturas a 1440 (10) y 390 (9) revisadas por el agente, entre
ellas las dos ediciones. Scripts, capturas y perfil de Edge fuera del repo y ya borrados.

Errores de consola: ninguno en la segunda corrida (cuentas, transferencia y facturas a 390). La primera se corto en el paso de
Nueva cuenta a 390 sin imprimir su lista, asi que para las pantallas de 1440 no hay ese dato.

## Pruebas

Suite: 75 archivos, 1809/1809 (base 1797, menos 2 casos movidos, mas 14 nuevas). npm run lint, npm run build y git diff --check
sin hallazgos. Guardas sin cambios.

Ajustadas:

* EditAccountModal.test, precarga y 409: `100000,57` y `50000,57` llegan con punto de miles.
* EditAccountModal.test, `abc` y `-1` al salir del campo: el campo ya no deja escribirlos. Pasan a comprobar `validateAccountEdit`.
* money.test, abonos y pagos: `0.105` y `0.004` pasan a coma decimal.
* manualMovements.test y ManualMovementsPage.test, edicion: la precarga llega con punto de miles.
* AccountsPage.test, nueva cuenta y transferencia: se escribe sin puntos y se comprueba el formato.
* AccountsPage.test, 409 de transferencia: el valor conservado es `500.000`.
* NewSaleInvoicePage.test y NewPurchaseInvoicePage.test, precision y precarga: coma decimal y texto en vez de numero.
* NewPurchaseInvoicePage.test, total 0.02: los precios se escriben `0,01`.
* SaleDetailPage.test y PurchaseDetailPage.test, precarga y lo conservado: texto formateado en vez de numero.
* newSale.test y newPurchase.test, contrato monetario: los valores pasan a coma decimal. La regla es la misma.
* saleDetail.test y purchaseDetail.test, limite del saldo: `1.880.000,01` y `597.938,28`.

Nuevas: 8 de la conversion en amountInput, 2 de AmountField (teclado decimal, compact), 1 de EditAccountModal, 1 de
manualMovements, 1 de NewSaleInvoicePage y 1 de NewPurchaseInvoicePage. Sin cambios, sigue pasando la del heredado negativo.

## Limitaciones

* Un punto escrito se ignora: quien escribia `1500.5` en un abono o en un precio de linea ahora obtiene `15.005`, sin aviso. El
  abono y el pago tienen el tope del saldo; el precio de linea no tiene tope. Decision de David: se mantiene, sin aviso nuevo.
* El signo menos no se puede escribir y al pegar `-1500` queda `1.500`. Ningun monto admite negativos.
* Un saldo inicial heredado negativo se ve y bloquea Guardar, pero si se edita ese campo pierde el signo. No se probo en el
  navegador: lo cubre la prueba de EditAccountModal.
* Abono, pago y Monto con coma final (`1.000,`) dan el error de monto al salir o guardar, y el precio de linea lo acepta como
  1000. Antes abono y pago no permitian ese texto.
* A 1440, en la columna de precio de 128 px, `12.345.678,50` no cabe entero (133 de 126 px) y se desplaza dentro del campo.
  `1.500.000,50` si cabe.
* A 390 el pie de Nueva transferencia va en dos filas. No se comparo con main; esta tarea no cambia ese pie.
* No se probo en un telefono real: no se sabe si todos los teclados decimales ofrecen la coma.
* Pegar se probo solo en pruebas automaticas, no en el navegador.
* Para arrancar el backend, Maven compila en su carpeta de salida. No se reviso ese repo, por la restriccion de lectura.
