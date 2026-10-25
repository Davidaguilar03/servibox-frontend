# 2026-10-25: Glosario, textos y mensajes de error

Rama `fix/29-copy-glossary-and-messages`. Decision en [03-DECISIONS.md](../03-DECISIONS.md),
reglas en [06-COPY.md](../06-COPY.md), [05-DESIGN-SYSTEM.md](../05-DESIGN-SYSTEM.md) y
[02-CONVENTIONS.md](../02-CONVENTIONS.md). Sin cambios de rutas, logica de negocio, backend
ni colores.

## Lectura previa

* (a) El backend responde `ErrorResponse(error, status)` sin codigo propio; el 401 de
  seguridad es `{"error":"No autenticado","status":401}`. Unos 110 mensajes: validacion de
  campos, reglas de negocio (stock, saldo, abono o pago mayor al saldo, ya anulada, restaurar
  una no anulada, anular una compra con stock vendido), no encontrado, conflictos
  (duplicados y bloqueo optimista), permisos y "Error interno del servidor".
* (b) Cifras crudas ("El abono de 50000.0 excede el saldo pendiente de
  3706375.9000000004"), fechas ISO, estados y roles en mayusculas (PENDIENTE, CLIENTE,
  RECAUDO_VENTA), nombres de campos (supplierId, accountId, format) y "Peticion invalida".
  "Saldo insuficiente" ya llegaba en pesos.
* (c) Antes, `errorMessage()` mostraba los 400 y 409 tal cual (sin tildes) y el resto
  generico; cada pantalla lo ponia en su `Alert`. Varias mostraban `error.message` crudo
  (nombre de cuenta y categoria repetidos, codigo de producto, documento de tercero, codigo de
  la serviteca en registro, 403 en Configuracion). `isDuplicatePurchaseNumberError` buscaba
  "con el numero" y el backend manda "Ya existe una factura de compra X del proveedor Y": el
  error nunca se marcaba bajo el campo (corregido). No habia aviso de sesion vencida.
* (d) Sinonimos: "Forma de pago" 10, "Metodo de pago" 4, "Tipo de pago" 2; "Ingresos
  ocasionales" 8, "Otros ingresos" 1; "Identificador de la serviteca" 1, "Codigo de tu
  serviteca" 2; "Umbral amarillo" 3, "Umbral rojo" 4; "Bajo stock" 3, "Stock bajo" 1;
  "Recuperar" 10, "Restaurar" 0.
* (e) La interfaz casi no tenia palabras sin tilde; la guarda solo hallo cadenas de
  comparacion con el backend (no visibles). Sin jerga visible.
* (f) La barra lateral arrancaba siempre expandida. A 1024 con la barra expandida (recuadro
  686) se desplazaban Productos 207, Categorias 105, Papeleras 88 y 89, Proveedores 54,
  Clientes 41, Cuentas 40 y Gastos 10 px; a 1280 ninguna.

## Rotulos cambiados por archivo

| Archivo | Antes | Despues |
|-|-|-|
| `pages/OccasionalIncomePage.tsx` | Ingresos ocasionales | Otros ingresos (`GLOSSARY`) |
| `pages/SalesInvoicesPage.tsx` | boton Ingresos ocasionales | Otros ingresos |
| `routes.tsx` | miga Ventas / Ingresos ocasionales | Ventas / Otros ingresos |
| `pages/LandingPage.tsx` | Gastos operativos e ingresos ocasionales. | Gastos operativos y otros ingresos. |
| `pages/TermsPage.tsx` | ingresos ocasionales | otros ingresos |
| `settings/TenantProfileTab.tsx` | Identificador de la serviteca | Codigo de tu serviteca |
| `pages/CategoriesPage.tsx` | encabezados Umbral amarillo y Umbral rojo | Stock bajo y Stock critico |
| `pages/CategoriesPage.tsx` | campos Umbral amarillo y Umbral rojo | Avisar con stock bajo en (unidades) y Avisar con stock critico en (unidades) |
| `pages/CategoriesPage.tsx` | Bajo stock con estas unidades o menos. | Con estas unidades o menos el producto pasa a Stock bajo. |
| `inventory/categoryForm.ts` | El umbral rojo no puede ser mayor que el amarillo. | El aviso de stock critico no puede ser mayor que el de stock bajo. |
| `components/StatusBadge.tsx` | Bajo stock | Stock bajo |
| `pages/ProductsPage.tsx` | filtro Bajo stock | Stock bajo |
| `pages/NewSaleInvoicePage.tsx`, `NewPurchaseInvoicePage.tsx` | Tipo de pago; Metodo de pago | Forma de pago; Medio de pago |
| `pages/SaleDetailPage.tsx`, `PurchaseDetailPage.tsx` | Metodo de pago; recuperarla | Medio de pago; restaurarla |
| `trash/TrashPage.tsx` | Recuperar, Recuperar factura, Recuperando, No pudimos recuperar | Restaurar, Restaurar factura, Restaurando, No pudimos restaurar |
| `pages/SalesTrashPage.tsx`, `PurchasesTrashPage.tsx` | recuperarlas; no se puede recuperar | restaurarlas; no se puede restaurar |
| `auth/registerForm.ts`, `settings/settingsForms.ts` | mensajes propios de NIT y telefono | los de `lib/validation/contact.ts` |
| `pages/LoginPage.tsx` | (nuevo) | Tu sesion vencio. Inicia sesion de nuevo. |

## Mensajes del backend y texto final

Origen en negrita (paquete de `servibox-backend/src/main`). Valores de ejemplo en los
parametricos. Misma lista que `BACKEND` en `src/api/errorMessages.test.ts`.

| Mensaje del backend | Texto en la interfaz |
|-|-|
| **auth/TenantRegistrationService, auth/*Exception** | |
| Debe aceptar los terminos y condiciones | Acepta los terminos de uso y el tratamiento de datos para continuar. |
| El NIT solo admite digitos y un guion con el digito de verificacion, por ejemplo 900123456-7 | El NIT solo admite digitos y un guion con el digito de verificacion, por ejemplo 900123456-7. |
| El telefono solo admite digitos, espacios, +, - y parentesis | El telefono solo admite digitos, espacios, +, - y parentesis. |
| El correo del administrador no es valido | El correo del administrador no es valido. |
| El correo del administrador no puede superar 150 caracteres | El correo del administrador no puede superar 150 caracteres. |
| El identificador demo esta reservado | El codigo demo esta reservado. Elige otro. |
| El identificador debe tener de 3 a 30 caracteres con solo minusculas, numeros y guiones | El codigo debe tener de 3 a 30 caracteres: minusculas, numeros y guiones. |
| El identificador no puede empezar ni terminar en guion | El codigo no puede empezar ni terminar en guion. |
| El usuario debe tener de 3 a 50 caracteres con letras, numeros, punto, guion y guion bajo | El usuario debe tener de 3 a 50 caracteres: letras, numeros, punto, guion y guion bajo. |
| La contrasena debe tener al menos 8 caracteres | La contrasena debe tener al menos 8 caracteres. |
| La contrasena no puede superar 72 caracteres | La contrasena no puede superar 72 caracteres. |
| El nombre comercial es obligatorio | Escribe el nombre comercial. |
| El NIT es obligatorio | Ingresa el NIT de tu serviteca. |
| El telefono es obligatorio | Ingresa el telefono de contacto. |
| El nombre completo del administrador es obligatorio | Escribe el nombre completo del administrador. |
| El telefono no puede superar 25 caracteres | El telefono no puede superar 25 caracteres. |
| Ya existe una serviteca con el identificador el-roble | Ya existe una serviteca con el codigo el-roble. Elige otro. |
| El registro de nuevas servitecas esta deshabilitado | Por ahora no estamos creando servitecas nuevas. Intenta de nuevo mas tarde. |
| Credenciales invalidas | Revisa el codigo de tu serviteca, el usuario y la contrasena. |
| No autenticado | Tu sesion vencio. Inicia sesion de nuevo. |
| **tenant/AdminRequiredException, inventory/controller/InventoryController** | |
| Solo un administrador puede editar los datos de la serviteca | Solo un administrador puede editar los datos de la serviteca. |
| Solo un administrador puede editar la configuracion financiera | Solo un administrador puede editar la configuracion financiera. |
| **counterparties/service/CounterpartyService, *Exception** | |
| El celular admite hasta 25 caracteres | El celular admite hasta 25 caracteres. |
| El correo admite hasta 150 caracteres | El correo admite hasta 150 caracteres. |
| El correo no tiene un formato valido | El correo no tiene un formato valido. |
| El nombre o razon social admite hasta 150 caracteres | El nombre o razon social admite hasta 150 caracteres. |
| El numero de documento admite hasta 25 caracteres | El numero de documento admite hasta 25 caracteres. |
| El tercero 900123456 es PROVEEDOR y una venta exige CLIENTE o AMBOS | El tercero con documento 900123456 es proveedor y no se puede usar en una venta. |
| El tercero necesita un nombre o razon social | Escribe el nombre o razon social. |
| El tercero necesita un numero de documento | Escribe el numero de documento. |
| El tercero necesita un tipo de documento | Elige el tipo de documento. |
| El documento 222222222222 es del Consumidor final | El documento 222222222222 es del Consumidor final. Usa otro. |
| Ya existe un tercero con el documento 900123456 como CLIENTE | Ya existe un cliente con el documento 900123456. |
| Ya existe un tercero con el documento 900123456 | Ya existe un tercero con el documento 900123456. |
| El tercero Consumidor final es del sistema y no se puede editar | El Consumidor final es del sistema y no se puede editar. |
| **inventory/service/InventoryService, *Exception** | |
| Ya existe una categoria con el nombre LLANTAS | Ya existe una categoria con el nombre LLANTAS. |
| Ya existe un producto con el codigo LL-001 | Ya existe un producto con el codigo LL-001. |
| El codigo del producto admite hasta 50 caracteres | El codigo del producto admite hasta 50 caracteres. |
| El costo de compra no puede ser negativo | El costo de compra no puede ser negativo. |
| El margen debe estar entre 0 y menos de 100% | El margen debe estar entre 0 y menos de 100 %. |
| El nombre de la categoria admite hasta 100 caracteres | El nombre de la categoria admite hasta 100 caracteres. |
| El umbral amarillo no puede ser negativo | El aviso de stock bajo no puede ser negativo. |
| El umbral rojo no puede ser negativo | El aviso de stock critico no puede ser negativo. |
| El umbral rojo no puede superar al amarillo | El aviso de stock critico no puede ser mayor que el de stock bajo. |
| Impuesto no encontrado: 7 | Uno de los impuestos elegidos ya no existe. Recarga e intentalo de nuevo. |
| La cantidad no puede ser negativa | La cantidad no puede ser negativa. |
| La descripcion del producto admite hasta 255 caracteres | La descripcion del producto admite hasta 255 caracteres. |
| El codigo LL-001 no se puede cambiar: el producto ya tiene facturas de venta o de compra | El codigo LL-001 no se puede cambiar: el producto ya tiene facturas de venta o de compra. |
| El tenant ya tiene una configuracion financiera; edita la existente en vez de crear otra | Esto cambio mientras lo editabas. Recarga e intentalo de nuevo. |
| **sales/service/SalesService, *Exception** | |
| Ya existe una factura con el numero FV-0045 | Ya existe una factura con el numero FV-0045. |
| Stock insuficiente para Llanta Michelin 175/70 R13: hay 4 y se piden 5 | No hay stock suficiente de Llanta Michelin 175/70 R13: hay 4 unidades y se piden 5 unidades. |
| Stock insuficiente para Aceite 20W50: hay 1 y se piden 2 | No hay stock suficiente de Aceite 20W50: hay 1 unidad y se piden 2 unidades. |
| El abono de 50000.0 excede el saldo pendiente de 30000.0 | El abono de $ 50.000 supera el saldo pendiente de $ 30.000. |
| El abono de 4000000.0 excede el saldo pendiente de 3706375.9000000004 | El abono de $ 4.000.000 supera el saldo pendiente de $ 3.706.376. |
| El monto del abono debe ser mayor a cero | El valor del abono debe ser mayor que cero. |
| La factura FV-0045 ya esta anulada | La factura FV-0045 ya esta anulada. |
| La factura necesita un numero | La factura necesita un numero. |
| La fecha del abono (2026-10-26) no puede ser posterior a hoy (2026-10-25) | La fecha del abono (26/10/2026) no puede ser posterior a hoy (25/10/2026). |
| La fecha del abono no puede ser anterior a la fecha de la factura | La fecha del abono no puede ser anterior a la fecha de la factura. |
| Solo se puede abonar a una factura PENDIENTE, y esta esta PAGADA | Esta factura ya esta pagada: no se le pueden registrar abonos. |
| Solo se puede restaurar una factura ANULADA, y la FV-0045 esta PENDIENTE | La factura FV-0045 ya no esta en la papelera: esta pendiente. |
| Una factura de contado necesita la cuenta donde entra el dinero | Elige la cuenta donde entra el dinero. |
| Una factura necesita al menos una linea | Agrega al menos un producto. |
| El precio de Llanta Michelin debe ser mayor a cero | El precio de Llanta Michelin debe ser mayor que cero. |
| La cantidad de Llanta Michelin debe ser mayor a cero | La cantidad de Llanta Michelin debe ser mayor que cero. |
| El vencimiento no puede ser anterior a la fecha de la factura | El vencimiento no puede ser anterior a la fecha de la factura. |
| Una factura a credito necesita fecha de vencimiento | Una factura a credito necesita fecha de vencimiento. |
| **purchases/service/PurchasesService, *Exception** | |
| Ya existe una factura de compra DO-4788 del proveedor Distrillantas del Oriente SAS | Ya existe la factura de compra DO-4788 de Distrillantas del Oriente SAS. |
| Saldo insuficiente en Caja General: hay $ 300.000 y se requieren $ 397.938 | Saldo insuficiente en Caja General: hay $ 300.000 y se necesitan $ 397.938. |
| El monto del pago debe ser mayor a cero | El valor del pago debe ser mayor que cero. |
| El pago de 400000.0 excede el saldo pendiente de 397938.28 | El pago de $ 400.000 supera el saldo pendiente de $ 397.938. |
| La compra DO-4788 ya esta anulada | La compra DO-4788 ya esta anulada. |
| La factura de compra necesita un numero | Escribe el numero de la factura de compra. |
| La fecha del pago (2026-10-26) no puede ser posterior a hoy (2026-10-25) | La fecha del pago (26/10/2026) no puede ser posterior a hoy (25/10/2026). |
| La fecha del pago no puede ser anterior a la fecha de la factura | La fecha del pago no puede ser anterior a la fecha de la factura. |
| Solo se puede pagar una compra PENDIENTE, y esta esta PAGADA | Esta compra ya esta pagada: no se le pueden registrar pagos. |
| Solo se puede restaurar una compra ANULADA, y la DO-4788 esta PAGADA | La compra DO-4788 ya no esta en la papelera: esta pagada. |
| Una compra de contado necesita la cuenta de la que sale el dinero | Elige la cuenta de la que sale el dinero. |
| Una compra necesita un proveedor (supplierId) | Elige el proveedor. |
| Una factura de compra necesita al menos una linea | Agrega al menos un producto. |
| **treasury/service/TreasuryService, treasury/controller/TreasuryController, *Exception** | |
| Ya existe una cuenta con el nombre Bancolombia | Ya existe una cuenta con el nombre Bancolombia. |
| El concepto admite hasta 255 caracteres | El concepto admite hasta 255 caracteres. |
| El monto del movimiento debe ser mayor a cero | El monto debe ser mayor que cero. |
| El movimiento necesita una cuenta | Elige la cuenta. |
| Las notas admiten hasta 255 caracteres | Las observaciones admiten hasta 255 caracteres. |
| El movimiento 12 es de categoria RECAUDO_VENTA y se gestiona desde su operacion | Este movimiento se gestiona desde su factura o su transferencia. |
| La categoria de un movimiento no se puede cambiar: el 12 es GASTO_OPERATIVO | Este movimiento no se puede cambiar de tipo. |
| El monto de la transferencia debe ser mayor a cero | El monto de la transferencia debe ser mayor que cero. |
| La cuenta origen y la cuenta destino no pueden ser la misma | La cuenta de origen y la de destino no pueden ser la misma. |
| La transferencia necesita cuenta origen y cuenta destino | Elige la cuenta de origen y la de destino. |
| **reporting/service/ReportExportService, ReportingService** | |
| El rango de un reporte no puede pasar de 366 dias | El periodo de un reporte no puede pasar de 366 dias. |
| El reporte tiene mas de 20000 movimientos: acota el rango de fechas | El reporte tiene mas de 20.000 movimientos: acorta el periodo. |
| El rango necesita fecha desde y fecha hasta | Elige las fechas Desde y Hasta. |
| La fecha desde no puede ser posterior a la fecha hasta | Hasta no puede ser anterior a Desde. |
| **shared/ResourceNotFoundException (servicios), GlobalExceptionHandler** | |
| Factura no encontrada: 999 | No encontramos esa factura. Puede que ya no exista. |
| Producto no encontrado: 9 | No encontramos ese producto. Puede que ya no exista. |
| Recurso no encontrado | No encontramos lo que buscas. Puede que ya no exista. |
| El recurso esta siendo modificado por otra operacion, intenta de nuevo | Alguien mas esta modificando esto. Intentalo de nuevo en un momento. |

Sin mapa (caen en el texto del estado):

| Mensaje del backend | Estado | Texto |
|-|-|-|
| Peticion invalida | 400 | Revisa los datos e intentalo de nuevo. |
| El rol de un tercero nuevo es CLIENTE o PROVEEDOR | 400 | Revisa los datos e intentalo de nuevo. |
| El tercero necesita un rol | 400 | El tercero necesita un rol. (se lee bien) |
| Falta el parametro format: PDF o XLSX | 400 | Revisa los datos e intentalo de nuevo. |
| accountId solo aplica al reporte MOVIMIENTOS | 400 | Revisa los datos e intentalo de nuevo. |
| Un movimiento necesita tipo y categoria | 400 | Revisa los datos e intentalo de nuevo. |
| Valor invalido 'X' en el campo paymentType. Valores permitidos: CONTADO, CREDITO | 400 | Revisa los datos e intentalo de nuevo. |
| El cuerpo de la peticion no es un JSON valido o un campo tiene un valor del tipo equivocado | 400 | Revisa los datos e intentalo de nuevo. |
| No se puede persistir una entidad sin un tenant activo en el contexto | 400 | Revisa los datos e intentalo de nuevo. |
| Error interno del servidor | 500 | No pudimos completar la accion. Revisa tu conexion e intentalo de nuevo; si sigue pasando, escribenos por WhatsApp al (numero de contacto). |

## Tablas a 1024 (desplazamiento dentro del recuadro, px)

| Tabla | Antes, barra expandida (686) | Despues, por defecto contraida (854) | Despues, expandida (686) | 1280 (942) |
|-|-|-|-|-|
| Productos | 207 | 0 (6 columnas) | 0 (6) | 0 (8) |
| Categorias | 105 | 0 (7) | 0 (6) | 0 (7) |
| Papelera de ventas | 88 | 0 (7) | 0 (5) | 0 (7) |
| Papelera de compras | 89 | 0 (7) | 0 (5) | 0 (7) |
| Proveedores | 54 | 0 (6) | 0 (4) | 0 (6) |
| Clientes | 41 | 0 (6) | 0 (4) | 0 (6) |
| Cuentas (movimientos) | 40 | 0 (6) | 0 (5) | 0 (6) |
| Gastos | 10 | 0 (6) | 0 (5) | 0 (6) |

La pagina no se desplaza en ningun caso.

## Verificacion

* `npm run build`, `npm run lint` y `npm test`: 1149 pruebas (base 898).
* Glosario en el navegador: ninguno de los terminos reemplazados en Ventas, Otros ingresos,
  facturas nuevas, detalles, Papeleras, Productos, Categorias (y su modal) y Configuracion.
* Errores reales provocados contra el backend:
  * Stock insuficiente (otra venta se lleva una unidad con la factura abierta): en linea,
    "No hay stock suficiente de Llanta Michelin Energy XM2+ 175/70 R13 82T: hay 8 unidades y
    se piden 9 unidades.", y la linea pasa a "Solo hay 8 unidades disponibles.".
  * Abono mayor al saldo (otro abono entra por la API con el modal abierto): en el modal, "El
    abono de $ 3.729.655 supera el saldo pendiente de $ 1.000." (el backend mandaba
    3729654.92).
  * NIT "90012-ABC" y telefono "300-abc" en Configuracion: los mensajes del modulo unico bajo
    cada campo, resumen "Revisa los 2 campos marcados." y foco en NIT.
  * Anular una factura ya anulada por la API: en el modal, "La factura FV-0001 ya esta
    anulada."; el detalle se refresca como anulada.
  * Factura inexistente (`/ventas/999999`): estado "Factura no encontrada".
  * Sesion vencida (token borrado y navegar a `/ventas`): `/login` con "Tu sesion vencio.
    Inicia sesion de nuevo.".
  * Backend detenido al guardar Configuracion: toast de error persistente con el texto de red
    y el enlace a WhatsApp; lo digitado se conserva.
* Teclado: el toast se alcanza con Tab (enlace y "Cerrar aviso") y Enter lo cierra. A 1100 px
  la barra arranca contraida; Enter en "Expandir menu" la expande, el foco queda en el boton y
  se guarda `expanded`.
* Objetivos tactiles: 1 pequeno en 35 casos (la miga de Nueva venta a 390, ya justificada), 0
  separaciones menores de 8, igual que la tarea anterior. Desbordes: 176 casos sin desbordes;
  los 2 contenidos son los carruseles con desplazamiento propio (tarjetas de Cuentas y
  pestanas de Productos). `tokens.test.ts` sin cambios.

## Pendientes

* Los mensajes del backend siguen sin tildes: el mapa los corrige en el frontend. Un mensaje
  nuevo sin regla cae en el texto del estado hasta que se agregue (ver 06-COPY.md).
