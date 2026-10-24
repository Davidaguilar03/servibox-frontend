# Log de decisiones tecnicas

Una entrada por decision, en orden cronologico inverso (la mas reciente arriba).

Formato de cada entrada:

```
## AAAA-MM-DD: Titulo corto de la decision

* Decision: que se decidio hacer.
* Alternativas consideradas: opciones que se evaluaron y se descartaron.
* Motivo: por que se eligio esta opcion sobre las demas.
```

## 2026-10-24: Tokens de contraste y boton primario en brand-ink

* Decision: se corrigen los 17 pares que fallaban en la auditoria visual (CON-01 a CON-07 y
  COL-01) solo con tokens y clases, sin cambiar textos, layout ni logica. Valores y razones
  (WCAG 2.1, calculadas con la prueba `src/styles/tokens.test.ts`):
  * `color-action` pasa de `brand` (#ff3b30, blanco encima 3.55 a 1) a `brand-ink` (#d32316,
    5.22 a 1). `action-hover` es `color-mix` al 92 por ciento con negro (#c22014, 5.98) y
    `action-active` al 86 por ciento (#b51e13, 6.65). `brand-hover` del manual daba 4.12 con
    texto blanco y ya no lo usa el primario. Cierra CON-01.
  * El item activo de la barra lateral y la pagina actual de la paginacion usan `bg-action`
    (5.22). El relleno del item activo contra el carbon da 2.81, por eso lleva un anillo
    interior de 1 px `brand` (4.14 contra el carbon, mismo recurso que la tarjeta de cuenta
    activa). Cierra CON-02.
  * `border-control` #808792: borde de campos, selectores, buscador, combobox, lineas de
    factura, botones secundarios, paginacion, controles segmentados, pildoras de periodo y
    muestras de color. 3.62 sobre surface, 3.26 sobre canvas, 3.50 sobre row-alt. Tarjetas,
    divisores y menus siguen con `border`. Cierra CON-03.
  * `success-ink` #15803d (4.57 sobre success-bg, 5.02 sobre blanco, 4.84 sobre row-alt),
    `warning-ink` #b45309 (4.51 sobre warning-bg), `error-ink` #b91c1c (5.30 sobre error-bg) e
    `info-ink` #1d4ed8 (5.49 sobre info-bg): texto de StatusBadge (Stock critico incluido),
    titulos de Alert, fila de utilidad neta de Reportes y montos o textos verdes sobre fondo
    claro. El color semantico original queda para iconos, bordes y puntos. El texto `error`
    sobre blanco ya cumplia (4.83) y no cambia. Cierra CON-04 y CON-05.
  * `text-subtle` deja de usarse como texto informativo (placeholders, conteo de pestanas,
    separador de la miga, puntos de la paginacion pasan a `text-muted`). Queda para iconos
    decorativos, estados deshabilitados y texto sobre el carbon (5.78). Cierra CON-06.
  * `text-muted` pasa de #6b7280 (igual a `neutral-500`) a #5f6673: 5.78 sobre blanco, 5.20
    sobre canvas y `neutral-200`, 4.73 sobre error-bg. Con el valor anterior fallaban, ademas
    de los encabezados de tabla, los badges Anulada e Inactivo, el tag Sistema y los campos de
    solo lectura que cita la auditoria, todos los subtitulos de pagina, que van directo sobre
    canvas. `neutral-500` no cambia. Cierra CON-07.
  * Eyebrows de la landing y leyendas del registro pasan de `brand-ink` a `text-muted`: el
    manual no admite rojo en etiquetas pequenas. Cierra COL-01.
* Alternativas consideradas: oscurecer solo los encabezados y badges con `neutral-600`;
  cambiar el fondo de los encabezados de tabla a surface; mantener `brand` en el primario con
  texto mas grande.
* Motivo: un cambio de token corrige todos los usos a la vez y la prueba de contraste impide
  que vuelvan a fallar. El rojo de marca #ff3b30 queda para superficies grandes sin texto
  pequeno, el wordmark, el anillo de foco (3.55 sobre blanco) y acentos no textuales.
  **La decision de color esta pendiente de validar con el disenador**: el primario se ve mas
  oscuro que en las capturas y `text-muted` ya no coincide con `neutral-500`.

## 2026-10-23: Clientes y Proveedores con un componente compartido

* Decision: `CounterpartiesPage` (`src/counterparties/`) arma las dos pantallas con una
  configuracion (rol, textos, clave y consulta de terceros, clave y consulta de facturas,
  rotulo del saldo, ruta de Nueva factura y toasts). Rutas `/ventas/clientes` (Ventas /
  Clientes) y `/compras/proveedores` (Compras / Proveedores), con un boton secundario
  "Clientes" o "Proveedores" en el encabezado de Facturas de venta y de compra (el grupo de
  botones pasa a `flex-wrap` para bajar de linea en pantallas angostas) y "Volver a" el
  listado. Datos: `GET /api/counterparties?role=CLIENTE` o `PROVEEDOR` (el backend devuelve
  tambien los AMBOS) con las claves de los formularios de factura
  (`['counterparties', 'CLIENTE']` y `['counterparties', 'PROVEEDOR']`), y `GET /api/sales` o
  `GET /api/purchases` con las claves de los listados. Cada bloque carga y falla por separado;
  si fallan solo las facturas, la tabla sigue con el saldo en raya y un aviso con reintento.
* Alternativas consideradas: una pantalla de Terceros con pestanas; dos pantallas copiadas.
* Motivo: las dos pantallas solo cambian el rol, los textos y la fuente del saldo, igual que
  las papeleras y los movimientos manuales.

## 2026-10-23: Saldo por tercero e indicadores de Clientes y Proveedores

* Decision: el saldo de un tercero se calcula en el cliente: suma de `pendingBalance` de sus
  facturas PENDIENTE (las PAGADA no deben nada y las ANULADA quedan en 0) y cuantas son, que
  se muestra como texto secundario. La venta trae el tercero en `customer` y la compra en
  `supplier`. Indicadores sobre la lista completa del rol, sin depender de los filtros:
  "Total de clientes" (o de proveedores) cuenta los terceros sin el Consumidor final; "Con
  saldo pendiente" cuenta los que tienen saldo mayor que cero; "Total por cobrar" (o por
  pagar) suma los saldos de la lista, Consumidor final incluido. Filtros en la URL: `q`
  (nombre, documento o correo, sin mayusculas ni tildes, con `useUrlTextParam`), `saldo`
  (`pendiente`; sin el parametro es Todos), `orden` (`saldo`, de mayor a menor; sin el
  parametro es Nombre ascendente) y `pagina` (25). Sin saldos cargados el filtro de saldo y
  el orden por saldo no se aplican. Vacio: sin terceros (fuera del Consumidor final) invita
  a crear; con filtros, Limpiar filtros. Bajo `md` la tabla pasa a tarjetas.
* Alternativas consideradas: un endpoint de saldos en el backend; contar el Consumidor final
  como cliente.
* Motivo: las facturas ya traen `pendingBalance` y el volumen es bajo (ver Paginacion y
  filtros en el cliente). El Consumidor final siempre existe en el listado de clientes (el
  GET lo crea), asi que contarlo haria imposible el estado vacio de un tenant nuevo.

## 2026-10-23: Consumidor final como tercero del sistema

* Decision: se reconoce por el documento `222222222222` (`CONSUMIDOR_FINAL_DOCUMENT`, el
  `DOCUMENTO_CONSUMIDOR_FINAL` del backend). Sale con la etiqueta "Sistema", sin Editar (el
  PUT responderia 409 "El tercero Consumidor final es del sistema y no se puede editar") y
  con Nueva factura. Un AMBOS lleva la etiqueta "Cliente y proveedor". El formulario rechaza
  ese documento en cualquier otro tercero con "Ese numero es del Consumidor final" (con
  tilde en la interfaz): el backend todavia no lo reserva, y un alta de proveedor con ese
  documento convertiria el Consumidor final en AMBOS.
* Alternativas consideradas: esperar a que el backend lo reserve.
* Motivo: proteger el tercero que usan todas las ventas sin cliente.

## 2026-10-23: Modal de tercero reutilizado con modo edicion

* Decision: `NewCounterpartyModal` suma `counterparty` (editar), `onUpdated` y
  `guardUnsaved`. Campos: nombre o razon social (obligatorio, 150), tipo de documento (los
  cinco del enum con rotulo legible: Cedula de ciudadania, NIT, Cedula de extranjeria, RUT,
  Pasaporte), numero (obligatorio, 25, recortado), correo (opcional, 150, con formato) y
  celular (opcional, 25, digitos, espacios, +, - y parentesis). El rotulo es "Celular", como
  en los detalles de factura y en el backend. El rol no se pide ni se edita. Errores por
  campo al salir del campo o al guardar; sin doble envio. Crear: POST con el rol de la
  pantalla y el cuerpo de siempre (correo y celular solo si tienen algo). Editar: PUT con los
  cinco campos (correo o celular vacios en null), precargado, con el texto fijo "Los cambios
  tambien se veran en las facturas ya emitidas" (el backend arma el tercero de la factura
  desde la fila actual), toast "Cambios guardados". Un 409 con "documento" en el mensaje va
  bajo el campo y se borra al cambiar el numero; el Alert del modal dice "Revisa el numero de
  documento". Los demas 400 y 409 van en el Alert con `errorMessage`. Al guardar en las
  pantallas se invalida `['counterparties']` (la pantalla y los formularios de venta y
  compra) y, al editar, `['sales']` y `['purchases']`, que muestran el nombre del tercero.
  * `guardUnsaved` (aviso "Descartar cambios" con Esc, la X o Cancelar) solo lo activan
    Clientes y Proveedores: en las facturas el modal se cierra con Esc aunque tenga datos,
    como fija una prueba existente de Nueva factura de venta.
  * Las facturas lo usan sin cambios en sus pantallas: el boton Guardar ya no se deshabilita
    con campos vacios (las validaciones se muestran al guardar) y no muestran toast.
* Alternativas consideradas: un modal nuevo para editar; activar el aviso tambien en las
  facturas (rompia su prueba).
* Motivo: un solo formulario de tercero con las mismas reglas en las cuatro pantallas.

## 2026-10-23: 201, 200 y 409 al crear un tercero

* Decision: `apiFetch` no expone el codigo, asi que la pantalla distingue por el rol de la
  respuesta: con el backend actual un 201 devuelve el rol pedido y un 200 solo ocurre al
  promover un tercero del otro rol, que vuelve como AMBOS. Toasts: "Cliente creado" o
  "Proveedor creado"; en la promocion "Ya existia como proveedor: ahora tambien es
  cliente. Se conservan el nombre y los datos que ya tenia registrados." (o el inverso),
  porque el backend ignora el nombre y el tipo de documento enviados y solo completa correo y
  celular vacios. Un 409 (ya tiene ese rol o es AMBOS) va bajo el documento con el mensaje
  del backend.
* Alternativas consideradas: cambiar `apiFetch` para devolver el estado.
* Motivo: el rol de la respuesta da la misma informacion sin tocar el cliente API.

## 2026-10-23: Nueva factura con tercero preseleccionado

* Decision: la accion de fila Nueva factura enlaza a `/ventas/nueva?cliente=<id>` o
  `/compras/nueva?proveedor=<id>`. Al llegar la lista de terceros, la pantalla elige ese id
  una sola vez si esta en la lista (que ya viene filtrada por rol: un id inexistente o de
  otro rol se ignora sin error) y lo toma como valor inicial del formulario, asi que no
  cuenta como cambio para el aviso de salir. Nada mas cambia en esas pantallas.
* Alternativas consideradas: pasar el tercero en `state` de la navegacion.
* Motivo: un enlace con parametro se puede abrir en otra pestana y sobrevive a recargar.

## 2026-10-23: Lo que queda fuera de Clientes y Proveedores

* Borrar o desactivar terceros, historial de facturas por tercero, estado de cuenta,
  importar o exportar, cambiar el rol y un consecutivo de terceros.

## 2026-10-22: Configuracion con pestanas en la URL

* Decision: `/configuracion` (`src/settings/SettingsPage.tsx`) reemplaza el placeholder con
  tres pestanas: Datos de la serviteca, Usuarios y Configuracion financiera. La activa vive en
  `?tab=datos|usuarios|financiera`; sin parametro o con un valor desconocido es Datos (que se
  escribe sin `tab`). Patron de pestanas de ARIA con activacion automatica: flechas, Inicio y
  Fin. Con cambios sin guardar, cambiar de pestana pide "Descartar cambios"; salir a otra
  pagina lo frena `UnsavedChangesGuard`, que ahora recibe su texto; recargar o cerrar,
  `beforeunload`. Atras o adelante entre pestanas no pregunta. `PlaceholderPage` se elimina:
  era su ultimo uso.
* Alternativas consideradas: una ruta por pestana; estado local sin URL.
* Motivo: la pestana se puede enlazar y sobrevive a recargar.

## 2026-10-22: Permisos de Configuracion en la interfaz y el 403

* Decision: sin rol ADMIN en la identidad de la sesion, Datos y Configuracion financiera se
  ven deshabilitados, sin Guardar y con "Solo un administrador puede editar estos datos."
  `PUT /api/tenant` lo respalda con 403 "Solo un administrador puede editar los datos de la
  serviteca": si llega, el mensaje del backend va en un Alert (no pasa por `errorMessage`,
  que daria el generico) y el formulario queda en solo lectura. **`PUT
  /api/inventory/financial-settings` no revisa el rol en el backend**: el bloqueo de esa
  pestana es solo de la interfaz. No hay usuarios de otro rol para probarlo de verdad; lo
  cubren las pruebas.
* Alternativas consideradas: ocultar la pantalla a quien no es ADMIN.
* Motivo: los demas roles pueden consultar los datos; solo el administrador los cambia.

## 2026-10-22: Datos de la serviteca

* Decision: `GET` y `PUT /api/tenant`. El cuerpo lleva solo `name`, `nit` y `phone`, nunca
  el slug. El identificador se muestra en solo lectura: es lo que el equipo escribe en
  "Serviteca" al iniciar sesion y el backend no lo deja cambiar (cambiarlo romperia el login
  de todos). NIT y telefono son opcionales: en blanco se envian como null, que es lo que el
  backend guarda tambien con cadena vacia. El NIT acepta puntos y espacios; `normalizeNit`
  los quita antes de validar y de enviar (y al salir del campo), y el maximo de 25 cuenta
  sobre el valor normalizado. Las reglas y mensajes de nombre, NIT y telefono salen de
  `auth/registerForm.ts` (`businessNameError`, `nitError`, `phoneError`, `normalizeNit`),
  compartidos con el registro, que no cambia de comportamiento: sigue sin normalizar. Al
  guardar, `updateTenantName` cambia el nombre en la identidad de la sesion y la barra
  superior lo muestra sin recargar.
* Alternativas consideradas: normalizar tambien en el registro (queda para su propia rama).
* Motivo: una sola fuente para las reglas del tenant, igual que en el backend.

## 2026-10-22: Unidades de la configuracion financiera

* Decision: verificado en `FinancialSettings` e `InventoryService.aplicarPrecios`, las cuatro
  tasas del backend son fracciones de 0 a 1, **incluido el ICA**: 0.0082 son 8,2 por mil y
  entra tal cual en la formula. La interfaz muestra Gastos, DIAN y Comision en porcentaje
  (0 a 100, se divide por 100) y el ICA en por mil (0 a 1000, se divide por 1000), como
  Autollantas. Acepta coma o punto; muestra coma. Hasta 4 decimales en los porcentajes y 3
  en el ICA: la columna guarda la fraccion con 6 decimales y 8,2345 por mil quedaria en
  8,235 (comprobado contra el backend dev). La division se redondea a 10 decimales para no
  enviar 0.008199999. `GET` sin configuracion guardada responde todo en cero; la interfaz lo
  muestra con "Aun no has configurado estos valores" (no distingue una configuracion
  guardada en cero). `PUT` responde solo la configuracion, sin el numero de productos
  recalculados; se invalidan productos y categorias.
* Alternativas consideradas: mostrar las fracciones del backend.
* Motivo: el usuario piensa en porcentajes y en por mil.

## 2026-10-22: Aviso de recalculo y advertencia del divisor

* Decision: un texto fijo avisa "Al guardar se recalcula el precio sugerido de todos los
  productos." Con los valores escritos y las categorias cargadas, un Alert de advertencia
  lista las categorias cuyo divisor `k - ICA - margen`, con `k = (1 - gastos) * (1 - DIAN)`,
  es menor o igual a cero: para ellas el backend deja el precio sugerido igual al costo.
  **Solo replica la condicion de validez**, no calcula precios. No bloquea guardar.
* Motivo: avisar antes de un recalculo masivo que deja precios en el costo.

## 2026-10-22: Comision de tarjeta guardada sin uso y Usuarios Proximamente

* Decision: `cardCommissionRate` se guarda (0 si no llega) pero ningun calculo del backend
  lo usa; el campo lo dice en su ayuda. La pestana Usuarios es un "Proximamente" sin tabla
  ni permisos: la captura muestra el diseno futuro y no hay endpoints.

## 2026-10-22: Lo que queda fuera de Configuracion

* Usuarios y roles, cambio del identificador, logo y color del tenant, zona horaria, idioma
  o moneda, comision de tarjeta aplicada a calculos, zona de peligro o eliminar la serviteca
  y normalizar el NIT del registro.

## 2026-10-22: Gastos operativos e Ingresos ocasionales con un componente compartido

* Decision: `ManualMovementsPage` (`src/manualMovements/`) arma las dos pantallas con una
  configuracion (`category`, textos, ruta de regreso). Rutas `/compras/gastos` (Compras /
  Gastos operativos) y `/ventas/ingresos` (Ventas / Ingresos ocasionales), con un boton
  secundario en el encabezado de Facturas de compra y de Facturas de venta y "Volver a" el
  listado. Datos: `GET /api/treasury/movements?category=X&desde&hasta` y las cuentas, cada
  bloque con su carga, error y reintento. Solo salen las dos categorias manuales: cobros,
  pagos y transferencias no aparecen.
* Alternativas consideradas: una sola pantalla con pestanas; dos pantallas copiadas.
* Motivo: las dos pantallas solo cambian la categoria y los textos, igual que las papeleras.

## 2026-10-22: Indicadores y periodos de los movimientos manuales

* Decision: "Total del periodo" es la suma de los montos de los movimientos que quedan tras
  todos los filtros (periodo, cuenta y busqueda) y "Movimientos" su cantidad; cambian con
  los filtros, no solo con el periodo. Periodos Este mes (por defecto), Mes anterior, Este
  ano, Todas y Personalizado, con `periodRange` de Cuentas (Bogota) y `validateRange`
  (Personalizado con las dos fechas, en orden y hasta 366 dias). Todas no manda fechas. El
  periodo filtra en el backend; la cuenta y el concepto (sin mayusculas ni tildes) en el
  cliente. Todo en la URL (`q`, `cuenta`, `periodo`, `desde`, `hasta`, `pagina`), orden por
  fecha y luego id descendentes, paginas de 25. Vacio con los filtros de Limpiar: "No hay
  gastos registrados" con Nuevo gasto; vacio con filtros propios: Limpiar filtros.
* Alternativas consideradas: el promedio y el mayor movimiento de Autollantas (cuatro
  tarjetas); filtrar la cuenta en el backend.
* Motivo: la tarea pide dos indicadores; un solo pedido por periodo alimenta tabla e
  indicadores.

## 2026-10-22: Saldo de la cuenta en gastos, ediciones y borrados

* Decision: verificado en `TreasuryService`, el backend **no valida el saldo** de un
  movimiento manual: un gasto, una edicion o el borrado de un ingreso pueden dejar la cuenta
  en negativo (probado: borrar un ingreso dejo Caja General en -$ 53.750). El cliente no
  bloquea: muestra un Alert de advertencia "Saldo insuficiente en X: disponible $A,
  necesitas $B" con "Puedes guardarlo igual: la cuenta queda en negativo." y deja guardar.
  El calculo sigue lo que hace el backend: editar revierte el efecto anterior en la cuenta
  anterior y aplica el nuevo en la nueva, asi que en un gasto editado en la misma cuenta el
  disponible incluye el monto que ya habia salido, y mover o bajar un ingreso puede dejar
  la cuenta anterior en negativo. Una cuenta a la que la operacion solo le suma no avisa,
  aunque ya este en negativo. Un saldo que queda justo en cero no avisa.
* Alternativas consideradas: bloquear como en Nueva transferencia; no avisar.
* Motivo: Autollantas y el backend permiten el negativo (el backend lo deja como punto
  abierto); bloquear en el cliente seria una regla que el backend no tiene.

## 2026-10-22: Editar y eliminar movimientos manuales

* Decision: editar usa `PUT /api/treasury/movements/{id}` con el movimiento completo
  (cuenta, concepto, monto, fecha y observaciones; la categoria es la de la pantalla y el
  backend no deja cambiarla). La fecha se envia siempre: sin ella el backend pondria la de
  hoy. Eliminar usa `DELETE` (204), que revierte el efecto y borra la fila (borrado fisico).
  La confirmacion dice el saldo exacto que queda: "Vuelven $X a Caja General: su saldo pasa
  de $A a $B" en un gasto y "Se descuentan $X de ..." en un ingreso, con "La cuenta queda
  en negativo." si aplica. Foco inicial en Cancelar; un error del backend queda dentro del
  modal. Formulario: concepto y observaciones hasta 255 (columnas VARCHAR 255; el backend no
  las valida y pasarse daria un 500), fecha por defecto hoy en Bogota y maximo hoy (el
  backend aceptaria una futura), monto mayor que cero, cuenta con su saldo en el selector y,
  solo en gastos, la primera EFECTIVO por id preseleccionada. Acciones de fila: dos iconos
  con etiqueta accesible ("Editar gasto X", "Eliminar gasto X"). `DiscardableModal` pasa a
  `src/components` para compartirlo con Cuentas.
* Alternativas consideradas: menu de tres puntos (mas codigo de foco y teclado para dos
  acciones).
* Motivo: dos iconos son operables con teclado sin un componente nuevo.

## 2026-10-22: Lo que queda fuera de Gastos e Ingresos

* Categorias de gasto, adjuntos, gastos recurrentes, comision de tarjeta, exportar y editar
  movimientos de facturas o de transferencias (el backend responde 400 "se gestiona desde
  su operacion"). Los KPIs no tienen un campo de otros ingresos: un ingreso ocasional cambia
  el saldo de la cuenta pero no las ventas ni la utilidad del panel ni de Reportes.

## 2026-10-22: Rutas publicas y la raiz como landing

* Decision: `/` deja de redirigir a `/inicio` y muestra la landing; se suman `/registro` y
  `/terminos` (Proximamente) a `/login` y `/recuperar-contrasena`. Las privadas cuelgan de
  `RequireAuth` como ruta de layout sin path, asi que ninguna cambia de URL. Con sesion,
  `/login` y `/registro` redirigen a `/inicio`; la landing cambia Iniciar sesion y Crear
  cuenta por "Ir al panel", tambien en la portada y el llamado final (Crear cuenta llevaria
  a `/registro`, que con sesion rebota). `/crear-cuenta` redirige a `/registro`. Cada pagina
  publica fija titulo y meta description con `usePageMeta`.
* Alternativas consideradas: landing en otra ruta (`/inicio-publico`); sitio estatico
  aparte.
* Motivo: la raiz es lo primero que abre quien no conoce el producto.

## 2026-10-22: Textos de la landing sin datos inventados

* Decision: los textos salen de la tarea (propuesta, problema en tres tarjetas, para quien
  es, esencia de marca) y de las capturas 135930 y 140014 (titulo de la portada, titulos de
  seccion, Modulos, los tres pasos y el llamado final), ajustados a la voz del manual. Sin
  cifras, clientes, testimonios, precios, telefonos, correos ni redes. La captura no trae
  datos de contacto: la ancla Contacto lleva al pie. Diferencias con la captura: los dos
  botones del encabezado son secundarios (la captura tiene Crear cuenta en rojo), la
  portada usa "Crea tu cuenta" e "Iniciar sesion" en lugar de "Crear mi serviteca" y "Ver
  como funciona", las tarjetas del problema son las tres de la tarea, Compras no menciona
  gastos operativos (no hay pantalla) y el pie dice "ServiBox · v1.0 · 2026".
* Alternativas consideradas: copiar la captura tal cual.
* Motivo: una sola accion primaria por tramo y nada que el producto no haga hoy.

## 2026-10-22: Vista de ejemplo del panel sin imagenes

* Decision: la portada arma la vista de ejemplo con `IndicatorCard`, `StatusBadge` y
  `DataTable` reales y datos ficticios obvios ("Cliente de ejemplo 1"), con `aria-hidden` e
  `inert`. Sin imagenes, sin archivos en `public` y sin la barra lateral de la captura.
* Alternativas consideradas: una captura en PNG; un SVG dibujado.
* Motivo: sigue a los componentes y los tokens sin mantener un archivo aparte, y no ofrece
  nada al teclado ni al lector de pantalla.

## 2026-10-22: Registro que entra directo con la sesion devuelta

* Decision: `POST /api/auth/register` responde lo mismo que el login; el 201 se guarda con
  `startSession` (la misma funcion del login), se recuerda el slug, se muestra el toast
  "Serviteca creada. Bienvenido a ServiBox." y la redireccion por sesion lleva a `/inicio`
  con replace. El cuerpo lleva los textos recortados, el slug en minusculas, la contrasena
  tal cual y `acceptTerms: true`; el boton Crear serviteca solo se habilita con el
  formulario valido.
* Reglas en el cliente, espejo de `TenantRegistrationService` (`auth/registerForm.ts`):
  nombre comercial y nombre completo obligatorios hasta 150; NIT hasta 25 con `\d+(-\d)?`;
  telefono hasta 25 con digitos, espacios, `+`, `-` y parentesis; identificador de 3 a 30,
  minusculas, numeros y guiones, sin guion a los lados y fuera de la lista reservada (copia
  de `SLUGS_RESERVADOS`); correo `algo@dominio.tld` hasta 150; usuario de 3 a 50 con letras,
  numeros, punto, guion y guion bajo; contrasena de 8 a 72 caracteres y 72 bytes UTF-8.
  Los mensajes son propios, con la voz del manual; los del backend quedan para el Alert.
* Alternativas consideradas: un login automatico despues del registro; validar solo en el
  servidor.
* Motivo: el backend ya devuelve la sesion; validar antes evita un viaje por cada regla. Si
  el backend cambia una regla o la lista reservada, hay que cambiarla aqui.

## 2026-10-22: Sugerencia y normalizacion del identificador

* Decision: mientras el usuario no edite el identificador, se sugiere desde el nombre
  comercial: sin tildes ni enies (NFD), minusculas, cualquier otro caracter a un guion,
  guiones repetidos en uno, sin guion a los lados y maximo 30. Al editarlo a mano deja de
  sugerirse. Lo que se escribe pasa a minusculas y pierde lo no permitido al vuelo.
* Alternativas consideradas: convertir en el servidor (el backend rechaza mayusculas a
  proposito); sugerir siempre.
* Motivo: el usuario ve el identificador que de verdad queda y no pierde lo que escribio.

## 2026-10-22: Errores del registro

* Decision: 409 (identificador repetido) bajo el campo Identificador con el mensaje del
  backend, foco en el campo y boton deshabilitado hasta cambiarlo. 400 en un Alert arriba
  con `errorMessage`. 403 (registro apagado) en un Alert propio: "El registro no esta
  disponible". 5xx y red con el mensaje generico de `errorMessage`. Lo digitado se conserva
  siempre; la contrasena solo vive en el estado del formulario. Un `useRef` evita el doble
  envio antes de que `isPending` llegue al boton.
* Alternativas consideradas: mostrar el 403 con el texto del backend (sin tildes).
* Motivo: cada error queda donde el usuario puede corregirlo.

## 2026-10-22: Nombre completo e iniciales en la barra lateral

* Decision: la identidad guarda `fullName` cuando el login o el registro lo traen; una
  identidad sin el sigue valiendo. La barra lateral muestra el nombre completo y sus
  iniciales (primer nombre y ultimo apellido; una sola palabra, sus dos primeras letras);
  sin nombre completo, el username y sus iniciales como antes.
* Alternativas consideradas: el primer nombre y el primer apellido (falla con dos
  nombres).
* Motivo: es el dato que el usuario reconoce como suyo.

## 2026-10-22: Lo que queda fuera de la landing y el registro

* Recuperar contrasena, verificacion de correo, captcha, el texto de los terminos,
  formulario de contacto, precios, testimonios, blog, internacionalizacion y analitica.
  Las paginas privadas no fijan titulo de documento.

## 2026-10-22: Campos de texto atados a la URL con estado local y espera

* Decision: los buscadores de Facturas de venta, Facturas de compra, Productos y las dos
  papeleras, y las fechas Desde y Hasta de Cuentas, usan `useUrlTextParam`
  (`src/lib/useUrlTextParam.ts`). El campo guarda su propio valor y lo cambia en cada tecla;
  la URL se escribe tras 300 ms sin teclear (`URL_TEXT_DEBOUNCE_MS`), o de inmediato con Enter
  o al salir del campo si hay algo pendiente, con `replace` en el historial y la pagina en 1
  como antes. Durante una composicion IME no se escribe; se escribe al terminarla. Si la URL
  cambia por otra causa (atras o adelante, Limpiar, un enlace) el campo adopta su valor, salvo
  que haya algo digitado sin escribir: lo digitado gana y se escribe tras la espera. Desmontar
  cancela la escritura pendiente. Los listados siguen filtrando con el valor de la URL, y los
  nombres de los parametros no cambian. Las fechas de Cuentas pasan de agregar una entrada al
  historial por cambio a reemplazarla, como el buscador.
* Alternativas consideradas: escribir la URL con `flushSync`; espera sin estado local;
  estado local sin espera.
* Motivo: causa del bug: el `value` del campo salia de la URL y cada tecla navegaba.
  `RouterProvider` aplica la navegacion dentro de `React.startTransition` y despues de una
  promesa, asi que, al teclear rapido, React restauraba el valor viejo del campo controlado
  antes de que la URL cambiara y la siguiente tecla se sumaba a ese valor viejo: se perdian
  letras (con teclas sin pausa el campo quedaba vacio). El estado local se actualiza de forma
  sincrona en el evento; la espera evita una navegacion por letra. En las pruebas `act` aplica
  cada actualizacion antes de la siguiente tecla y ocultaba el bug; `typeWithoutPause`
  (`src/test/utils.tsx`) envia los eventos fuera de `act` para reproducirlo.

## 2026-10-22: Papelera como filtro en el cliente y componente compartido

* Decision: las papeleras de ventas y compras piden el mismo `GET /api/sales` o
  `GET /api/purchases` de los listados (misma clave de TanStack Query) y se quedan con las
  ANULADAS en el cliente. Las dos son `TrashPage` con una configuracion por modulo (tercero,
  API, textos, rutas y recuperar). Filtros en la URL como en los listados: busqueda por numero
  o tercero sin mayusculas ni tildes, forma de pago y periodo por la fecha de la factura en
  Bogota, con Todas por defecto. Orden por fecha descendente y luego id descendente.
  Paginas de 25.
* Alternativas consideradas: un endpoint de anuladas; dos pantallas separadas; Este mes por
  defecto como en los listados.
* Motivo: el backend ya devuelve las anuladas en el listado completo y no tiene filtro por
  estado. Las dos pantallas solo difieren en datos y textos. En la papelera se busca una
  factura concreta, que puede ser de cualquier mes.

## 2026-10-22: Columnas de la papelera, sin fecha de anulacion

* Decision: numero (enlace al detalle de solo lectura), Cliente o Proveedor, fecha de la
  factura, forma de pago, total, estado Anulada y el boton Recuperar como unica accion de la
  fila, en secundario para que no haya varios rojos en la pantalla. Recuperar factura del
  modal es el primario.
* Alternativas consideradas: una columna Anulada el; Recuperar en rojo por fila.
* Motivo: ni `Sale` ni `Purchase` guardan cuando se anularon: las respuestas no traen ningun
  campo de anulacion y el `updatedAt` de la entidad no se expone y cambia con cualquier
  escritura. Autollantas muestra las mismas columnas (numero, tercero, fecha, total, estado).

## 2026-10-22: Texto y errores de Recuperar

* Decision: el modal "Recuperar factura X" (foco en Cancelar) dice, en ventas, que la factura
  vuelve al listado como Pagada o Pendiente segun lo abonado, que se descuentan otra vez del
  inventario las unidades vendidas, que se restablecen en las cuentas el pago y los abonos, y
  que si algun producto no tiene las unidades suficientes no se puede recuperar; en compras,
  lo mismo con lo pagado, las unidades que se suman otra vez, los pagos que se descuentan de
  nuevo de las cuentas, que el costo de los productos queda como esta y que si alguna cuenta
  no tiene saldo no se puede recuperar. Exito: toast "Factura X recuperada" e invalidacion del
  listado, tesoreria, productos y KPIs. Un rechazo queda en un Alert del modal con
  `errorMessage`, sin cerrarlo, y refresca los mismos datos. Un ref evita el doble envio.
* Alternativas consideradas: el texto de Autollantas ("Volvera a su estado anterior a la
  anulacion... Confirmas?").
* Motivo: verificado en `SalesService.restaurarFactura` y `PurchasesService.restaurarCompra`:
  * Ventas: descuenta el stock con `descontarStock`; si una linea no alcanza, 409 "Stock
    insuficiente para P: hay N y se piden M" y la transaccion deshace todo. Vuelve a aplicar
    los ingresos de sus movimientos sin validar.
  * Compras: simula primero todos los egresos sobre el saldo corriente de cada cuenta y, si
    uno no alcanza, 409 "Saldo insuficiente en X: hay A y se requieren B" sin escribir nada;
    despues aplica los egresos y suma el stock. No toca `purchaseCost` ni el precio sugerido.
  * En los dos: los movimientos nunca se borraron y vuelven a estar activos porque el filtro
    de activos depende del estado de la factura; el estado es PAGADA si el saldo pendiente
    (total menos todos sus movimientos) es menor o igual a un peso, si no PENDIENTE.
    Restaurar una que no esta anulada es 400 ("Solo se puede restaurar una factura ANULADA, y
    la X esta Y" o "una compra ANULADA"); una inexistente o de otro tenant es 404. Todo es
    `@Transactional`. Verificado en la prueba real en los dos modulos.

## 2026-10-22: Lo que queda fuera de las papeleras

* Decision: no se implementan eliminar definitivamente, recuperar varias a la vez, la fecha
  de anulacion ni un contador de papelera en el menu.
* Alternativas consideradas: ninguna; son tareas propias.
* Motivo: alcance de la tarea. El backend no tiene borrado de facturas ni fecha de anulacion;
  Autollantas tampoco ofrece eliminar definitivamente.

## 2026-10-22: Detalle de compra: botones por estado y solo lectura de la anulada

* Decision: Registrar pago (primario) solo en PENDIENTE; Anular (secundario neutro) en
  PAGADA o PENDIENTE, con o sin pagos, contado o credito. Una ANULADA no tiene botones,
  muestra un aviso y la raya en Pagado y Saldo pendiente. Sin Descargar PDF ni imprimir.
* Alternativas consideradas: la regla de Autollantas (pagar con saldo mayor que 0 y estado
  distinto de PAGADA y ANULADA; anular todo lo no anulado).
* Motivo: es lo que acepta el backend: `registrarPago` exige PENDIENTE ("Solo se puede pagar
  una compra PENDIENTE, y esta esta X", 400) y `anularFactura` solo rechaza una ya anulada
  ("La compra X ya esta anulada", 400). En la practica coincide con Autollantas. El PDF queda
  fuera por lo mismo que en ventas: no hay endpoint ni formato definido.

## 2026-10-22: Pagado es total menos pendingBalance; pagos sin metodo

* Decision: el resumen usa `saleSummary` del detalle de venta: Pagado = total menos
  `pendingBalance`, Saldo pendiente = `pendingBalance`, IVA = total menos subtotal. Los pagos
  se listan con fecha, cuenta y valor, por fecha descendente; en credito la seccion es "Pagos
  registrados" y en contado "Pago realizado".
* Alternativas consideradas: sumar los PAGO_COMPRA en el cliente; columna de metodo.
* Motivo: el backend calcula el saldo como total menos todos los PAGO_COMPRA de la compra
  (activos o no) y lo deja en 0 si es menor a un peso, asi que Pagado coincide con la suma de
  los movimientos salvo ese resto (verificado en la prueba real: diferencia 0 en las cinco
  compras). En una ANULADA el backend fija el saldo en 0 y `GET /api/treasury/movements` no
  devuelve sus movimientos ni filtrando por `purchaseId`. `PaymentRequest` solo trae
  `accountId`, `amount` y `date`: el backend no guarda metodo de pago en un pago.

## 2026-10-22: Modal Registrar pago con el saldo de la cuenta

* Decision: cuenta (cada opcion con su saldo; se propone la primera EFECTIVO por id), valor
  (por defecto el saldo pendiente) y fecha (por defecto hoy en America/Bogota, minimo la
  fecha de la factura, maximo hoy). El cliente exige valor mayor que cero y no mayor que el
  saldo pendiente, la fecha en el rango y que la cuenta alcance: con saldo menor que el valor
  (la regla `saldo < requerido` de `exigirSaldoSuficiente`) muestra el Alert "Saldo
  insuficiente en X: disponible $A, necesitas $B" y deshabilita el boton; igual al valor se
  permite. Envia `{accountId, amount, date}`. Los 400 y 409 del backend van en un Alert del
  modal con `errorMessage`, sin perder lo digitado; un 409 de saldo refresca las cuentas.
* Alternativas consideradas: dejar la tolerancia de un peso del backend; aceptar fechas
  anteriores a la factura como el backend.
* Motivo: mismas razones que en el abono de ventas. El backend rechaza fechas futuras ("La
  fecha del pago (X) no puede ser posterior a hoy (Y)"), montos no positivos ("El monto del
  pago debe ser mayor a cero") y montos que superan el saldo en mas de un peso ("El pago de
  A excede el saldo pendiente de B"), todos 400; una cuenta inexistente o de otro tenant es
  400 "Cuenta no encontrada: id"; el saldo insuficiente es 409 con montos como double de Java.

## 2026-10-22: Texto de anular una compra

* Decision: el modal dice que la factura pasa a la papelera, que se descuentan del
  inventario las unidades que sumo la compra, que se revierten en las cuentas los pagos
  registrados y que se puede recuperar desde la Papelera; y, en texto secundario, que el
  costo de los productos no vuelve al anterior y que si parte de esas unidades ya se vendio
  no se puede anular. Cancelar tiene el foco inicial; Anular factura es el unico rojo. Un
  rechazo del backend queda en el modal.
* Alternativas consideradas: "Esta accion es irreversible" de Autollantas.
* Motivo: verificado en `PurchasesService.anularFactura`: revisa todo el stock antes de
  escribir y rechaza con 400 "No se puede anular la compra X: de P quedan N unidades y habria
  que quitar M. Parte de ese stock ya se vendio." (nunca deja stock negativo); revierte el
  saldo de cada movimiento sin borrarlo; no toca `purchaseCost` ni el precio sugerido (prueba
  `anularNoRevierteElCostoDelProducto`). En la prueba real: costo 16.000 antes y despues,
  stock de 15 a 10 y la caja de vuelta con +95.200. Restaurar existe en el backend.

## 2026-10-22: Lo que queda fuera del detalle de compra

* Decision: no se implementan descargar PDF, imprimir, editar o eliminar pagos, editar la
  factura, recuperar una anulada, la Papelera ni metodo de pago en los pagos. Los modales de
  pago y anular no se comparten con ventas: difieren en textos, en el saldo de la cuenta y en
  las opciones del selector; compartirlos exigiria parametrizar casi todo.
* Alternativas consideradas: un modal generico para abono y pago.
* Motivo: alcance de la tarea; duplicar dos modales cortos es mas simple que parametrizarlos.

## 2026-10-22: Indicadores de Facturas de compra

* Decision:
  * Compras del mes: `totalPurchases` de `GET /api/reporting/kpis` del primer dia del mes a
    hoy (Bogota).
  * Por pagar: suma de `pendingBalance` de las compras PENDIENTE; el texto secundario es el
    numero de esas facturas ("N facturas pendientes de pago"). No depende del periodo.
  * Pagos del mes: suma de los movimientos de `GET /api/treasury/movements` con
    `category=PAGO_COMPRA` del mes cuya compra es a credito, cruzando `purchaseId` con la
    lista de compras ya cargada.
  * Sin variacion contra el mes anterior.
* Alternativas consideradas: Pagos con todos los PAGO_COMPRA.
* Motivo: el backend registra el contado como un PAGO_COMPRA por el total al crear la
  compra; eso no es un pago a un saldo. Es la misma regla de Abonos del mes en ventas.
  Verificado en la prueba real: con un contado de 275.286,64 y un pago de 100.000 a credito,
  Pagos del mes dio 100.000.

## 2026-10-22: Facturas de compra: filtros en la URL reutilizados de ventas

* Decision: `GET /api/purchases` se pide una vez; busqueda (numero de factura o nombre del
  proveedor, sin mayusculas ni tildes), estado (Todos, Pagada, Pendiente), forma de pago,
  periodo (por `invoiceDate`, en Bogota) y pagina (25) se resuelven en el cliente y viven en
  la query string con `parseFilters`, `filtersToParams` y `periodPrefix` de `salesList.ts`,
  sin copiarlos. Limpiar deja Todas. Orden por fecha descendente y luego id descendente. Las
  ANULADAS no salen: iran a la Papelera.
* Alternativas consideradas: un modulo de filtros propio para compras.
* Motivo: las claves y los valores de la URL son identicos en los dos listados.

## 2026-10-22: Numero de factura del proveedor manual

* Decision: el campo "N.o factura del proveedor" es obligatorio y libre, con maximo 50
  caracteres (`numero_factura_compra` VARCHAR 50; el backend solo exige `@NotBlank`, y uno
  mas largo fallaria en la base). Se envia sin espacios al inicio ni al final. El 409 "Ya
  existe una factura de compra con el numero X" se muestra bajo el campo, con el foco en el,
  y se borra al editarlo. La unicidad es por tenant, no por proveedor, y sin distinguir
  mayusculas (`findByInvoiceNumberIgnoreCaseAndTenantId`).
* Alternativas consideradas: un consecutivo como en ventas.
* Motivo: el numero lo pone el proveedor; el backend no tiene consecutivo de compras.

## 2026-10-22: IVA descontable espejo del backend

* Decision: `purchaseTotals` replica `PurchasesService.crearFactura`: por linea
  `base = precio * cantidad` e `iva = base * tasa`, sumados en doubles en el orden de las
  lineas, y `total = subtotal + iva`. La tasa es la suma de las `rate` con `isVat` de la
  categoria del producto (`getIvaRateForProduct`); sin categoria o sin IVA es 0. El precio de
  la linea es el costo unitario sin IVA. El servicio no redondea; redondean las columnas
  NUMERIC(14,2) de subtotal, IVA, total e IVA de cada linea, cada una por separado, y el
  frontend aplica `round2` a cada valor igual. A diferencia de ventas, el resumen muestra
  `ivaTotal` ("IVA descontable") y no total menos subtotal, porque la compra lo guarda. La
  columna Total de cada linea es precio por cantidad, sin IVA.
* Alternativas consideradas: IVA como total menos subtotal; redondear por linea.
* Motivo: diferencia cero con el backend, verificada en la prueba real con precios con
  decimales (subtotal, IVA, total e IVA por linea iguales al centavo).

## 2026-10-22: Saldo insuficiente validado en el cliente

* Decision: en contado, si el saldo actual de la cuenta es menor que el total sin redondear
  (la comparacion de `exigirSaldoSuficiente`: `saldo < requerido`), se muestra un Alert de
  error no bloqueante "Saldo insuficiente en X" con lo disponible y lo necesario, el saldo en
  rojo bajo la cuenta y en el resumen, y Guardar queda deshabilitado. Igual al total se
  permite. Si el backend aun responde 409 "Saldo insuficiente en X: hay A y se requieren B"
  (el saldo cambio en otra pestana), su mensaje va en un Alert del formulario sin perder
  nada y se refrescan las cuentas. A credito no se valida saldo, como en el backend.
* Alternativas consideradas: dejar que solo el backend lo rechace.
* Motivo: el backend lo evalua siempre en contado, antes de mover stock o dinero; el cliente
  lo anticipa con la misma regla. El mensaje del backend trae los montos como double de Java
  (`3250000.0`, y en notacion cientifica desde 10 millones), por eso el aviso del cliente usa
  su propio texto con `formatCurrency`.

## 2026-10-22: Medio de pago de compra con el diccionario

* Decision: el medio de pago de una compra de contado se deriva del tipo de cuenta con los
  valores de `medio_pago_compra` del diccionario del backend: EFECTIVO fija EFECTIVO y
  bloquea el campo; BANCO o DIGITAL ofrecen TRANSFERENCIA (por defecto) y CHEQUE. En
  pantalla: Efectivo, Transferencia, Cheque. En credito no se envian cuenta ni medio. Se
  propone la primera cuenta EFECTIVO por id, como en ventas.
* Alternativas consideradas: Efectivo, Transferencia y Tarjeta de Autollantas, decididos por
  el nombre de la cuenta.
* Motivo: el backend guarda texto libre y no valida; el diccionario manda.

## 2026-10-22: Costo del producto al comprar

* Decision: el precio de la linea arranca en el `purchaseCost` actual del producto y se
  puede editar. La cantidad es entera mayor que cero, sin tope de stock. Un producto no se
  agrega dos veces. La pantalla avisa que al guardar el costo pasa a ser el precio de la
  compra y se recalcula el precio sugerido.
* Alternativas consideradas: ninguna.
* Motivo: verificado en `PurchasesService.sincronizarCosto` y `PurchasesCostSyncTest`: cada
  linea reescribe `purchaseCost` y llama a `recalculatePrices`, en contado y en credito.
  Comprobado en la prueba real (costo de 30.000 a 31.000, sugerido de 42.857,14 a 44.285,71).

## 2026-10-22: Piezas compartidas entre Nueva factura de venta y de compra

* Decision: se extrajeron, sin cambiar el comportamiento de ventas:
  * `lib/businessDate.ts`: `businessToday` (antes en `salesList.ts`), `addDays`,
    `DEFAULT_CREDIT_DAYS`, `CREDIT_DAY_OPTIONS` y `defaultDueDate` (antes en `newSale.ts`).
  * `lib/accountPayment.ts`: `accountPaymentMethods(tipo, catalogo)` y `defaultCashAccount`.
    Ventas conserva `paymentMethodsFor(tipo)` con su catalogo; compras usa
    `purchasePaymentMethodsFor`.
  * `counterparties/NewCounterpartyModal.tsx`: el modal Nuevo cliente con el rol (CLIENTE o
    PROVEEDOR) como parametro, con el mismo manejo de 201, 200 y 409.
  * `components/UnsavedChangesGuard.tsx`: `useBlocker`, `beforeunload` y el modal
    "Descartar cambios".
  * Las pruebas de ventas solo cambiaron rutas de importacion. Las de login y guard usaban
    `/compras` como ejemplo de pagina placeholder; ahora usan `/configuracion`.
  * Las dependencias salen en un chunk `vendor` (`build.rolldownOptions.output.codeSplitting`
    en `vite.config.ts`): el chunk unico paso de 500 kB y el build debe salir sin
    advertencias.
* Alternativas consideradas: copiar las piezas en compras; subir el limite de advertencia.
* Motivo: un solo lugar para reglas que deben coincidir en las dos facturas.

## 2026-10-22: Lo que queda fuera de Compras

* Decision: no se implementan el detalle de la compra, pagos, anulacion, la Papelera real,
  la pantalla de Proveedores, gastos operativos, edicion de compras ni adjuntos.
  `/compras/:id` y `/compras/papelera` son paginas Proximamente con su titulo.
* Alternativas consideradas: ninguna; son tareas propias.
* Motivo: alcance de la tarea.

## 2026-10-21: Cuentas: una carga de movimientos por periodo y estado en la URL

* Decision: `GET /api/treasury/movements?desde&hasta` se pide una vez por periodo para
  todas las cuentas; la cuenta seleccionada se filtra en el cliente, asi que cambiar de
  cuenta no hace otra peticion. Cuenta, periodo, fechas personalizadas y pagina viven en la
  query string, como en Facturas de venta y Productos. Sin `cuenta` en la URL se selecciona
  la primera EFECTIVO por id (`defaultCashAccount`, la misma de Nueva factura) o, si no
  hay, la primera por id. Orden: fecha descendente y luego id descendente (el del backend).
  Paginas de 25.
* Alternativas consideradas: `accountId` en la peticion (una peticion por cuenta); estado
  en React.
* Motivo: Todas las cuentas necesita la lista completa, y la otra pata de una
  transferencia esta en otra cuenta: con una sola carga se resuelven las dos cosas.

## 2026-10-21: Periodos de Cuentas en Bogota, semana desde el lunes

* Decision: Hoy, Esta semana (del lunes a hoy; un domingo cubre los seis dias
  anteriores), Este mes, Mes anterior (mes completo), Este ano (del 1 de enero a hoy) y
  Personalizado. Hoy sale de `businessToday` (America/Bogota con `Intl`), el mismo reloj de
  negocio del backend; las fechas se calculan sobre el texto `yyyy-MM-dd` con `addDays`, sin
  la zona del navegador. Personalizado parte del rango que se veia y valida con
  `validateRange` de Reportes (las dos fechas, desde no posterior a hasta, a lo sumo 366
  dias); mientras sea invalido no se consulta ni se exporta. `desde` y `hasta` del backend
  son inclusivos.
* Alternativas consideradas: semana de domingo a sabado; Mes anterior hasta el mismo dia.
* Motivo: la semana laboral del taller empieza el lunes. Reutilizar la validacion de
  Reportes mantiene un solo limite, que es tambien el de la exportacion.

## 2026-10-21: Ingresos y egresos del periodo incluyen transferencias

* Decision: Ingresos del periodo y Egresos del periodo son la suma de los movimientos
  INGRESO y EGRESO de la cuenta en el periodo, transferencias incluidas. Con Todas las
  cuentas suman todas, asi que una transferencia aparece en los dos lados.
* Alternativas consideradas: excluir las transferencias (o solo en Todas).
* Motivo: es la misma definicion del reporte de Movimientos (verificado en la prueba real
  contra el xlsx) y, por cuenta, explica la variacion de su saldo. En Todas, ingresos menos
  egresos sigue siendo la variacion del total, porque las dos patas se cancelan.

## 2026-10-21: Origen sin codigos inventados

* Decision: la columna Origen muestra `VENTA <numero>` y `COMPRA <numero>` cruzando
  `saleId` y `purchaseId` con `GET /api/sales` y `GET /api/purchases`, que se piden solo si
  el periodo tiene esos movimientos; si fallan, queda `VENTA` o `COMPRA` sin numero con un
  aviso y reintentar, sin bloquear la pantalla. `GASTO OPERATIVO` e `INGRESO OCASIONAL` van
  sin codigo. La transferencia dice `TRANSFERENCIA a <cuenta>` en la pata EGRESO y
  `TRANSFERENCIA desde <cuenta>` en la INGRESO: el INGRESO trae `relatedMovementId` con el id
  del EGRESO, y para el EGRESO se busca el INGRESO que lo apunta. Si la otra pata no esta
  cargada, solo `TRANSFERENCIA`.
* Alternativas consideradas: los `G-`, `IO-` y `T-` de la captura.
* Motivo: el backend no tiene consecutivo para gastos, ingresos ocasionales ni
  transferencias (03-DECISIONS del backend); un codigo inventado no se podria buscar en
  ningun lado. El xlsx del backend dice solo `TRANSFERENCIA`; la pantalla agrega la cuenta.

## 2026-10-21: Nueva cuenta y nueva transferencia

* Decision:
  * Nueva cuenta: nombre obligatorio (el 409 "Ya existe una cuenta con el nombre X" va
    bajo el campo), tipo EFECTIVO, BANCO o DIGITAL, y saldo inicial opcional, mayor o igual
    a 0 (vacio es 0). La ayuda dice que queda como saldo actual y no aparece como
    movimiento: `saveAccount` solo fija `initialBalance` y `currentBalance`. Al guardar,
    toast "Cuenta creada" y la cuenta nueva queda seleccionada.
  * Nueva transferencia: origen (la cuenta seleccionada o la primera por id), destino (el
    selector excluye el origen), monto y concepto opcional (vacio no se envia y el backend
    usa "Transferencia a/desde X"). **El backend no recibe fecha** (`registrarTransferencia`
    se llama con null y usa el hoy de negocio) y **no revisa el saldo del origen**: acepta
    dejar una cuenta en negativo (verificado: 201 y saldo -900000). El cliente exige monto
    mayor que cero y no mayor que el saldo actual del origen ("Fondos insuficientes en X").
    Los errores del backend (400 cuentas iguales, monto, cuenta ajena) van en un Alert del
    modal con `errorMessage`. Un ref y el boton deshabilitado evitan el doble envio. Sin dos
    cuentas, el boton queda deshabilitado con la explicacion.
  * Los dos modales piden confirmar al cerrar con datos digitados, como el de categoria.
* Alternativas consideradas: pedir fecha en la transferencia (el backend la ignoraria);
  dejar pasar el sobregiro como el backend.
* Motivo: las compras si exigen saldo (`exigirSaldoSuficiente`); sobregirar una caja con
  una transferencia es casi siempre un error de digitacion. Pendiente del backend: validar
  el saldo tambien en las transferencias.

## 2026-10-21: Exportar movimientos a Excel desde Cuentas

* Decision: Exportar a Excel usa `apiDownload` y `exportPath` de Reportes con
  `type=MOVIMIENTOS`, `format=XLSX`, el rango activo y `accountId` solo con una cuenta
  concreta. Con un rango invalido o de mas de 366 dias (`REPORT_MAX_DAYS`) el boton queda
  deshabilitado con la ayuda. Un ref evita el doble click; exito con toast "Reporte
  generado: <archivo>" y error con `errorMessage`. Va en el encabezado, no como enlace en la
  tarjeta de movimientos de la captura.
* Alternativas consideradas: generar el xlsx en el navegador.
* Motivo: el archivo del backend trae saldos inicial y final que la pantalla no calcula.

## 2026-10-21: Lo que queda fuera de Cuentas

* Decision: no se implementan crear gastos operativos ni ingresos ocasionales, editar o
  eliminar movimientos o cuentas, saldos inicial y final del periodo en la pantalla ni
  graficos.
* Alternativas consideradas: ninguna; son tareas propias.
* Motivo: alcance de la tarea; el backend ya tiene los endpoints de movimientos manuales
  para cuando lleguen.

## 2026-10-21: Mensajes de error segun el estado HTTP

* Decision: un solo helper, `errorMessage(error)` en `src/lib/errorMessage.ts`, decide el
  texto de error de toda la interfaz: el mensaje del backend solo en 400 y 409; el generico
  "Algo salio mal de nuestro lado. Intenta de nuevo en unos minutos." en cualquier otro
  estado (5xx, 404 y los demas); "Revisa tu conexion e intenta de nuevo." si no hubo
  respuesta. El 401 sigue en la sesion. `apiDownload` deja de poner el codigo HTTP en el
  texto de un error que no es JSON. Reemplaza los `error.message` de Nueva factura (y su
  modal de cliente), Detalle de factura (abono y anular), Reportes y Login (salvo el 401).
* Alternativas consideradas: mostrar siempre el mensaje del backend (version anterior); un
  mapa de mensajes por endpoint.
* Motivo: 400 y 409 son validaciones y conflictos de negocio escritos para el usuario; un
  500 dice "Error interno del servidor", que no le sirve. Resuelve los dos pendientes de
  feat/6 (5xx con el mensaje del backend y el codigo en el texto de la descarga). Queda
  pendiente que los mensajes del backend no llevan tildes.

## 2026-10-21: Indicadores de Productos

* Decision: sobre todo el inventario, sin pestana ni filtros:
  * Total de productos: numero de productos de `GET /api/inventory/products`.
  * En stock: productos con `quantity` mayor que 0, cualquiera sea su estado.
  * Por debajo del minimo: productos en Bajo stock o Stock critico con `stockStatus` y los
    umbrales de su categoria. Sin stock (0) no cuenta: ya no esta "en stock".
  * Valor en inventario: suma de `quantity` por `purchaseCost` (costo sin IVA); una
    cantidad nula o negativa suma 0. Es el criterio de `actualizarKpis` de Autollantas.
  * Sin variacion contra el mes anterior (la captura la muestra): no hay historico de stock.
* Alternativas consideradas: valorizar al precio sugerido; contar Sin stock dentro de Por
  debajo del minimo.
* Motivo: el costo es lo que el taller pago por lo que tiene en bodega. Con Sin stock
  dentro, un producto contaria a la vez en "por debajo" y fuera de "en stock".

## 2026-10-21: Productos: filtros en la URL y formulario sin formulas

* Decision:
  * `GET /api/inventory/products` y `/categories` se piden una vez; pestana de categoria,
    busqueda (codigo o descripcion, sin mayusculas ni tildes), estado de stock, orden y
    pagina (25) se resuelven en el cliente y viven en la query string, como en Facturas de
    venta. Limpiar vuelve todo a lo de por defecto, pestana y orden incluidos.
  * Orden por defecto Codigo (comparacion numerica, sin mayusculas); Descripcion; Stock de
    menor a mayor y de mayor a menor; Precio sugerido de menor a mayor. A igualdad, codigo.
  * Pestanas: Todas y una por categoria, por nombre, con su conteo; desplazables en
    horizontal. Una `categoria` de la URL que no existe cuenta como Todas.
  * El formulario no replica las formulas de IVA ni de precio sugerido: al crear dice "Se
    calcula al guardar" y al editar muestra los valores guardados, de solo lectura. El
    backend los recalcula en cada guardado.
  * Costo con punto de miles y coma decimal (`98.500` o `150000,50`), como Autollantas.
  * Stock: al crear, stock inicial entero mayor o igual a 0; al editar, solo lectura con la
    explicacion de que cambia con ventas y compras. El PUT no lleva `quantity`.
  * Un 409 del producto (codigo repetido o codigo bloqueado por facturas) va bajo el campo
    Codigo con el mensaje del backend, con el foco en el campo; el resto en un Alert con
    `errorMessage`. Al guardar: toast "Producto guardado" y vuelta al listado con sus
    filtros.
* Alternativas consideradas: calcular el precio sugerido en vivo en el cliente; dejar
  editar el stock como Autollantas.
* Motivo: el precio sugerido depende de la configuracion financiera (gastos, DIAN, ICA),
  que el frontend no carga; una copia de la formula se desincronizaria. El stock es el
  resultado de las facturas (decision del backend del 2026-10-21).

## 2026-10-21: Precio sugerido y costo rotulados sin IVA

* Decision: la tabla rotula "Costo sin IVA" y "Precio sugerido sin IVA", y el subtitulo
  dice "Costos y precios sin IVA". `taxAmount` se muestra en el formulario como "IVA del
  costo".
* Alternativas consideradas: "Costo" y "Precio sugerido" como la captura.
* Motivo: verificado en `InventoryService.aplicarPrecios`: `suggestedPrice = costo * k /
  (k - ica - margen)` sobre el costo sin IVA, sin sumar IVA (con configuracion en ceros es
  costo / (1 - margen)); `taxAmount` es costo por la suma de tasas con `isVat`, el IVA del
  costo, no del precio. Nueva factura ya suma el IVA aparte sobre ese precio.

## 2026-10-21: Categorias: paleta fija, umbrales y nombre

* Decision:
  * Color de una paleta fija de 8 (`CATEGORY_COLORS`): rojo, naranja, ambar, verde,
    turquesa, azul, violeta y gris, todos con contraste de al menos 4.5 a 1 sobre blanco.
    Se guarda el hexadecimal que espera el backend. Es la unica excepcion a la regla de no
    escribir hexadecimales fuera de `tokens.css`. Un color guardado fuera de la paleta (las
    categorias sembradas) se ofrece como "Color actual" para no cambiarlo sin querer.
  * Umbrales enteros mayores o iguales a 0, con el rojo no mayor que el amarillo (iguales
    se aceptan, como el 0 y 0 de la siembra). **El backend no valida esta regla** (acepta
    rojo mayor que amarillo); el cliente la exige porque con rojo mayor el estado Bajo stock
    no puede darse.
  * Margen como porcentaje de 0 a 100 (coma decimal), enviado como fraccion con 6
    decimales, la escala de la columna. Ayuda: cambiar el margen actualiza el precio
    sugerido de los productos de la categoria.
  * Impuestos como casillas desde `GET /api/inventory/tax-types`; al crear va marcado el
    IVA (`isVat`). Solo lectura: crear o editar impuestos queda fuera.
  * Nombre repetido: el PUT responde 409 y se muestra bajo Nombre; el POST no lo valida, asi
    que el cliente compara contra las categorias cargadas (sin mayusculas ni tildes) tanto
    al crear como al editar. El backend guarda el nombre en mayusculas.
  * Al guardar: toast "Categoria guardada" e invalidacion de `['inventory']` (el backend
    rehace los precios de los productos de la categoria).
* Alternativas consideradas: selector libre de color (contraste sin control); un rango de
  umbrales en el backend (tarea del backend).
* Motivo: la paleta garantiza contraste y un solo lugar de cambio. Revisar el nombre en el
  cliente evita duplicados que el POST dejaria pasar.

## 2026-10-21: Lo que queda fuera de Inventario

* Decision: no se implementan borrar productos o categorias, importar o exportar Excel,
  servicios, crear o editar impuestos, configuracion financiera, la pantalla de alertas de
  stock ni editar el stock.
* Alternativas consideradas: ninguna; son tareas propias.
* Motivo: el backend no tiene DELETE (FK y facturas), servicios ni alta de impuestos; la
  configuracion financiera y las alertas son pantallas propias; el stock solo cambia con
  ventas y compras.

## 2026-10-19: Descarga de archivos con apiDownload

* Decision: `lib/api.ts` agrega `apiDownload(path)` junto a `apiFetch`, sin cambiar este:
  GET con el mismo Bearer y `Accept: */*`; un 401 cierra la sesion; un error se lee como el
  JSON del backend (`{"error", "status"}`) y se lanza como `ApiError`, y si el cuerpo no es
  JSON el mensaje es generico con el codigo. En exito descarga el blob con
  `URL.createObjectURL` y un enlace temporal con `download`, con el nombre de
  `Content-Disposition` (respaldo `archivo`), libera la URL en la siguiente vuelta y
  devuelve el nombre. Sin librerias.
* Alternativas consideradas: `window.open` de la URL (no lleva el token, que vive en
  `sessionStorage`); una libreria de descargas.
* Motivo: el token va en la cabecera, asi que la descarga tiene que pasar por `fetch`. La
  usaran tambien Cuentas (Exportar a Excel) y los reportes que vengan. Liberar la URL tras
  el click en la misma vuelta puede cortar la descarga en algunos navegadores.

## 2026-10-19: Reportes: tipos, periodo y limite

* Decision: la pantalla ofrece Estado de resultados y Movimientos de cuentas, los dos
  tipos que exporta el backend (`ReportType`: `ESTADO_RESULTADOS`, `MOVIMIENTOS`). Ventas y
  Compras se muestran deshabilitadas con "Proximamente" y no se pueden elegir. El periodo
  por defecto va del primer dia del mes en curso a hoy, en America/Bogota
  (`businessToday` y `monthRange`). El cliente valida lo mismo que el backend: las dos
  fechas, desde no posterior a hasta y a lo sumo 366 dias contando los dos extremos
  (`ReportExportService.MAX_DIAS`); con un error el boton queda deshabilitado y no se
  llama al backend. `accountId` solo viaja en Movimientos con una cuenta concreta; "Todas
  las cuentas" no lo envia. Los errores que solo sabe el backend (cuenta inexistente, mas
  de 20000 movimientos) se muestran con su mensaje en un Alert de la pantalla.
* Alternativas consideradas: ocultar Ventas y Compras; dejar que el backend valide el
  rango.
* Motivo: la captura muestra los cuatro tipos, y mostrarlos deshabilitados dice que vienen
  sin prometer un archivo que no existe. Validar en el cliente evita una peticion que
  seguro falla; el mensaje del backend se muestra tal cual porque es el unico que conoce
  el tope de filas y la cuenta.

## 2026-10-19: Vista previa del Estado de resultados desde /kpis

* Decision: la vista previa (solo con Estado de resultados y un rango valido) pide
  `GET /api/reporting/kpis` del rango con una espera de 400 ms al cambiar las fechas, y
  muestra Ventas totales y Utilidad neta como indicadores y una tabla Concepto y Valor con
  las cinco filas del archivo: compras y gastos con signo menos y en rojo, utilidad neta
  con fondo verde o de error segun su signo. El titulo es el mes ("Octubre de 2026") si el
  rango es un mes calendario completo y, si no, "dd/MM/aaaa a dd/MM/aaaa".
* Alternativas consideradas: calcular la vista previa en el cliente; mostrar el PDF dentro
  de la pagina.
* Motivo: `ReportExportService.estadoDeResultados` arma el archivo con
  `ReportingService.getPeriodKpis` del mismo rango, asi que la vista previa y el archivo
  muestran las mismas cifras sin una formula propia (verificado en la prueba real con el
  PDF y el xlsx).

## 2026-10-19: Variacion contra el periodo anterior de igual duracion

* Decision: la variacion de Ventas totales y Utilidad neta compara con el periodo de igual
  duracion que termina el dia anterior a desde (del 01/10 al 18/10 se compara con el 13/09
  al 30/09), pedido con una segunda llamada a `/kpis`. Es (actual menos anterior) sobre el
  valor absoluto del anterior, redondeado al entero, con flecha de Lucide, texto ("12% vs.
  periodo anterior") y una palabra para lectores de pantalla (Subio, Bajo); verde si sube,
  rojo si baja. Con anterior 0 no hay porcentaje: "Sin datos del periodo anterior". Si esa
  llamada falla, la vista previa sale sin variacion, con un aviso discreto y reintentar.
* Alternativas consideradas: el "vs. mes anterior" de la captura.
* Motivo: el rango es libre; comparar un mes en curso de 19 dias con un mes completo
  siempre daria una caida falsa. Con igual duracion la comparacion es justa para cualquier
  rango, y en un mes completo el anterior cubre la misma cantidad de dias. El valor
  absoluto evita que una utilidad negativa invierta el signo de la variacion.

## 2026-10-19: Total de linea sin IVA y Anular como boton secundario

* Decision: en el Detalle de factura el total de cada linea es precio por cantidad, sin
  IVA, con el IVA en su propia columna, como en la captura (8 x 200.000 es 1.600.000). Nueva
  factura ya usaba esa definicion (`lineAmounts().base`). El resumen no cambia: subtotal,
  IVA (total menos subtotal) y total. El boton Anular del detalle es un secundario neutro;
  el rojo queda solo en Anular factura del modal de confirmacion. Se elimina la variante
  `dangerSecondary`, que no tenia otro uso.
* Alternativas consideradas: mantener precio por cantidad mas IVA en la linea; Anular en
  rojo secundario.
* Motivo: con IVA en la linea, la suma de los totales no daba el subtotal del resumen y
  el IVA se veia dos veces. Un solo rojo por pantalla deja el peligro en la confirmacion,
  donde se decide.

## 2026-10-18: Nueva factura: etiqueta Metodo de pago y cuenta de efectivo propuesta

* Decision: el campo del medio de pago se rotula "Metodo de pago", como en la captura (los
  valores siguen siendo los del diccionario). En contado se propone la primera cuenta de
  tipo EFECTIVO por id ascendente, con su metodo Efectivo bloqueado, hasta que el usuario
  elija otra; si no hay cuenta de efectivo no se propone ninguna. La propuesta no cuenta
  como cambio sin guardar.
* Alternativas consideradas: proponer la primera cuenta de la lista sin importar el tipo.
* Motivo: el contado en caja es el caso diario del taller y la captura lo muestra asi.
  Elegir por tipo y no por nombre sigue la regla del medio de pago.

## 2026-10-18: Detalle de factura sin PDF ni otras acciones

* Decision: el detalle no tiene Descargar PDF ni imprimir, y no edita ni elimina abonos,
  no edita la factura, no recupera una anulada ni envia la factura por correo.
* Alternativas consideradas: generar el PDF en el navegador.
* Motivo: el backend no tiene un endpoint de PDF ni el formato de factura definido
  (numeracion, resolucion de facturacion, datos del taller); un PDF hecho en el cliente
  podria pasar por documento fiscal sin serlo. El resto son tareas propias (la recuperacion
  va con la Papelera).

## 2026-10-18: Anular factura y factura anulada en solo lectura

* Decision: Anular abre un modal de confirmacion: la factura pasa a la papelera, el stock
  vuelve al inventario, se revierten el saldo de las cuentas y los pagos registrados, y se
  puede recuperar desde la Papelera. Botones Cancelar (con el foco inicial) y Anular
  factura. En exito: toast "Factura FV-xxxx anulada" y vuelta a `/ventas`, donde ya no
  aparece. Un error del backend queda en el modal. Una factura ANULADA se abre en solo
  lectura, sin botones y con un aviso; abonado y saldo se muestran con la raya y la
  seccion de abonos dice que sus pagos se revirtieron.
* Alternativas consideradas: el texto de Autollantas ("Esta accion es irreversible").
* Motivo: en ServiBox anular no es irreversible: el backend tiene restaurar. En una
  ANULADA el backend fija `pendingBalance` en 0 y oculta sus movimientos, asi que mostrar
  "Abonado = total" seria falso.

## 2026-10-18: Abonos: rango de fecha y sin metodo de pago

* Decision: el modal Registrar abono pide cuenta (se propone la primera EFECTIVO), valor
  (por defecto el saldo pendiente) y fecha (por defecto hoy en America/Bogota). Valida en
  el cliente: valor mayor que cero y no mayor que el saldo pendiente, fecha entre la fecha
  de la factura y hoy. Envia `{accountId, amount, date}`. Los abonos se listan con fecha,
  cuenta y valor, sin metodo de pago.
* Alternativas consideradas: aceptar la tolerancia de un peso del backend en el cliente;
  una columna de metodo como en la captura.
* Motivo: el backend rechaza fechas futuras pero no las anteriores a la factura; un abono
  antes de facturar no tiene sentido, asi que el cliente lo impide. La tolerancia de un
  peso existe en el backend para los centavos; el cliente no la ofrece para no invitar a
  abonar de mas. El backend no guarda metodo de pago en un abono (`CollectionRequest` solo
  trae cuenta, monto y fecha): guardarlo exige una columna nueva en movimientos, es decir
  una migracion V2.

## 2026-10-18: Abonado es total menos pendingBalance

* Decision: el resumen muestra Abonado = total menos `pendingBalance` y Saldo pendiente =
  `pendingBalance`, los dos del backend.
* Alternativas consideradas: sumar los movimientos RECAUDO_VENTA en el cliente.
* Motivo: el backend calcula el saldo como total menos la suma de los recaudos de la
  venta (contado o abonos) y lo pone en 0 si queda menor a un peso. Por eso abonado y suma
  de movimientos coinciden salvo en dos casos: un saldo menor a un peso (el abonado
  muestra el total aunque falten esos centavos) y una ANULADA (ver "Anular factura y
  factura anulada en solo lectura").

## 2026-10-18: Botones del detalle segun el estado

* Decision: Registrar abono solo en PENDIENTE; Anular en PAGADA o PENDIENTE (con o sin
  abonos, contado o credito); una ANULADA no tiene botones.
* Alternativas consideradas: anular solo facturas sin abonos.
* Motivo: es lo que acepta el backend: `registrarAbono` exige PENDIENTE y `anularFactura`
  solo rechaza una ya anulada, y revierte el contado y los abonos. Autollantas habilita
  Registrar abono con saldo mayor que 0 y estado distinto de PAGADA y ANULADA, y Anular en
  todo lo que no este anulado: la misma regla.

## 2026-10-18: Lo que queda fuera de Nueva factura de venta

* Decision: no se implementan utilidad por linea ni total, comision del pago con tarjeta
  como gasto operativo, detalle de factura, abonos, anular, Papelera real, pantalla de
  Clientes, edicion de terceros ni envio de la factura por correo.
* Alternativas consideradas: mostrar la utilidad como en la captura; registrar la
  comision de tarjeta al guardar.
* Motivo: la utilidad exige el costo de cada producto y una regla de costo (ultimo o
  promedio) que el frontend no debe inventar; la comision es un GASTO_OPERATIVO aparte
  con su propia tarifa por cuenta, que el backend no modela en la venta. El resto son
  pantallas propias con tareas propias.

## 2026-10-18: Cambios sin guardar en Nueva factura

* Decision: con datos digitados, Cancelar y cualquier navegacion interna muestran el modal
  "Descartar cambios" (Seguir editando, Descartar cambios) con `useBlocker`, que existe
  porque la app usa el router de datos (`createBrowserRouter`). Recargar o cerrar la
  pestana avisa con `beforeunload`. Tras un guardado correcto se deja salir sin preguntar.
  "Datos digitados" es cualquier diferencia con el formulario inicial; el Consumidor final
  por defecto no cuenta.
* Alternativas consideradas: el patron de Autollantas.
* Motivo: en Autollantas `NavigationGuard` existe pero SaleForm no lo implementa: guarda
  el formulario en cache al salir y Cancelar descarta sin preguntar. En la web no hay
  cache de vistas, asi que perder lo digitado sin aviso seria peor.

## 2026-10-18: Toast de exito

* Decision: un aviso minimo (`showToast` y `Toaster` montado en `AppShell`): entra en 200
  ms (`duration-base`), se cierra solo a los 5 segundos y se anuncia con `aria-live`. Hoy
  solo lo usa "Factura FV-xxxx guardada".
* Alternativas consideradas: un Alert en el listado leido de `state` de la navegacion.
* Motivo: el aviso tiene que sobrevivir a la navegacion a `/ventas`; un store minimo
  fuera de las paginas lo resuelve sin libreria.

## 2026-10-18: Modal de nuevo cliente

* Decision: el modal pide nombre, tipo de documento (CC, NIT, CE, RUT, PASAPORTE, los del
  enum del backend), numero, correo y celular, y hace `POST /api/counterparties` con role
  CLIENTE. Un 201 (nuevo) o un 200 (era proveedor y pasa a AMBOS) selecciona el tercero
  de la respuesta, no lo escrito. Un 409 (ya es cliente) o un 400 muestran el mensaje del
  backend dentro del modal.
* Alternativas consideradas: crear el tercero al guardar la factura, como Autollantas.
* Motivo: con el 200 el backend devuelve el tercero existente con sus datos, que pueden
  diferir de lo escrito; mostrar el de la respuesta evita facturar a un nombre que no es
  el guardado.

## 2026-10-18: Numero sugerido y POST sin invoiceNumber

* Decision: el campo Numero muestra `GET /api/sales/next-invoice-number` con "Se confirma
  al guardar" y el POST va sin `invoiceNumber`. Si el backend responde 409 "Ya existe una
  factura con el numero" (otra factura tomo el consecutivo al tiempo) se reintenta una sola
  vez; si falla de nuevo se muestra el mensaje.
* Alternativas consideradas: enviar el numero sugerido.
* Motivo: el endpoint no reserva el numero; el backend asigna el consecutivo dentro de la
  transaccion. El toast muestra el numero que devolvio el POST.

## 2026-10-18: Fecha, vencimiento y tipo de pago de una factura nueva

* Decision: la fecha por defecto es hoy en America/Bogota, calculada con `Intl` y esa zona
  (`businessToday`), no con la del navegador; es editable. En Contado el vencimiento es la
  fecha y no se edita, y no se envia `dueDate`. En Credito el vencimiento por defecto es la
  fecha mas 30 dias, los botones 30, 60 y 90 dias lo recalculan desde la fecha, no puede
  ser anterior a ella, y cambiar la fecha vuelve a proponer 30 dias.
* Alternativas consideradas: un mes calendario como Autollantas (`plusMonths(1)`).
* Motivo: 30 dias es lo que piden los botones y coincide con el primero. Bogota es la zona
  de negocio del backend.

## 2026-10-18: Medio de pago con los valores del diccionario

* Decision: el medio de pago de una venta de contado se deriva del tipo de la cuenta, no de
  su nombre: EFECTIVO fija EFECTIVO y bloquea el campo; BANCO o DIGITAL ofrecen
  TRANSFERENCIA (por defecto), TARJETA_DEBITO y TARJETA_CREDITO. Se envian esos valores,
  que son los que lista el diccionario de datos del backend para `medio_pago_venta`
  (EFECTIVO, TARJETA_DEBITO, TARJETA_CREDITO, TRANSFERENCIA); en pantalla se muestran como
  Efectivo, Transferencia, Tarjeta debito y Tarjeta credito. En credito no se envian ni
  cuenta ni medio.
* Alternativas consideradas: Efectivo, Transferencia y Tarjeta como en Autollantas, que
  ademas decide por el nombre de la cuenta (si contiene "caja").
* Motivo: el backend guarda texto libre y aun no valida, pero el diccionario manda; el
  tipo de cuenta es un dato, el nombre no. Reemplaza a "Medio de pago segun el tipo de
  cuenta".

## 2026-10-18: Calculo del IVA espejo del backend y etiqueta IVA

* Decision: `invoiceTotals` replica `SalesService.crearFactura`: por linea `base = precio *
  cantidad` e `iva = base * tasa`, sumados en doubles en el orden de las lineas;
  `total = subtotal + iva generado`. La tasa es la suma de las `rate` (fraccion, 0.19) de
  los impuestos con `isVat` de la categoria del producto. El backend no redondea en el
  servicio: redondean las columnas NUMERIC(14,2) al guardar, mitad hacia arriba sobre el
  valor decimal; el frontend aplica ese mismo `round2` al subtotal, al total y al IVA de
  cada linea. El resumen dice "IVA" y muestra total menos subtotal; la pantalla formatea
  sin decimales.
* Alternativas consideradas: redondear cada linea y sumar; mostrar `ivaPorPagar`.
* Motivo: diferencia cero con lo que devuelve el backend (verificado en la prueba real).
  `ivaPorPagar` es IVA generado menos descontable, otro concepto, y no es lo que paga el
  cliente.

## 2026-10-18: Aviso de stock al facturar

* Decision: despues de agregar o cambiar una linea, si lo que quedaria del producto da
  bajo, critico o sin stock con `stockStatus` (umbrales de su categoria, por defecto
  amarillo 5 y rojo 2), se muestra un Alert no bloqueante de advertencia (bajo) o de error
  (critico o sin stock) con el codigo y las unidades que quedarian. La cantidad no puede
  superar el stock (`max` del campo y mensaje), y un producto ya agregado no se ofrece de
  nuevo; tampoco los que tienen stock 0.
* Alternativas consideradas: el aviso de Autollantas, que llega como toast despues de
  guardar y toma 0 como umbral por defecto.
* Motivo: avisar antes de guardar deja corregir la cantidad; la regla es la misma del
  panel, sin duplicarla.

## 2026-10-18: Facturas anuladas fuera del listado

* Decision: el listado de Facturas de venta deja fuera las ANULADAS y el filtro de estado
  queda en Todos, Pagada y Pendiente. La Papelera las listara filtrando el mismo
  `GET /api/sales` en el cliente. Los indicadores no cambian.
* Alternativas consideradas: mantenerlas con el filtro Anulada (version anterior).
* Motivo: el diseno manda las anuladas a la Papelera y el subtitulo del listado lo dice.

## 2026-10-18: Rutas placeholder de Ventas

* Estado: `/ventas/nueva` ya no es placeholder, ver "Nueva factura de venta" en
  [01-ARCHITECTURE.md](01-ARCHITECTURE.md).

* Decision: `/ventas/nueva` (Nueva factura), `/ventas/papelera` (Papelera) y `/ventas/:id`
  (Detalle de factura) existen como paginas "Proximamente" con su titulo y su miga de pan.
  El listado ya enlaza a ellas.
* Alternativas consideradas: no enlazar hasta tenerlas; deshabilitar los botones.
* Motivo: los enlaces del listado y del panel quedan en su sitio definitivo y la ruta no
  cambia cuando llegue cada pantalla. Nueva factura, detalle, abonos, anular, papelera real,
  exportar y ordenar por columnas quedan fuera de esta tarea.

## 2026-10-18: Facturas de venta: filtros en el cliente con estado en la URL

* Decision:
  * `GET /api/sales` se pide una sola vez; busqueda, estado, forma de pago, periodo, orden
    y paginacion se resuelven en el cliente (ver "Paginacion y filtros en el cliente").
  * Los filtros y la pagina viven en la query string (`q`, `estado`, `pago`, `periodo`,
    `pagina`), asi que se conservan al volver desde el detalle y al recargar. Escribir en
    el buscador reemplaza la entrada del historial; cambiar un filtro vuelve a la pagina 1.
  * Busqueda por numero de factura o nombre del cliente, sin distinguir mayusculas ni
    tildes. Una venta sin tercero se muestra y se busca como "Consumidor final".
  * Periodos por `invoiceDate`, con hoy calculado en America/Bogota (la zona de negocio
    del backend): Este mes (por defecto), Mes anterior, Este ano y Todas.
  * Limpiar deja todo en Todos o Todas, periodo incluido, para que el vacio por filtros
    siempre tenga salida.
  * Orden por fecha de factura descendente y luego numero descendente (comparacion
    numerica). Paginas de 25 filas.
  * Vence muestra la raya en contado o sin `dueDate`.
* Alternativas consideradas: filtros en estado de React; paginacion en el servidor;
  Limpiar volviendo a Este mes.
* Motivo: la URL es la unica fuente que sobrevive a recargar y a la navegacion atras sin
  otro almacenamiento. Bogota y no la zona del navegador para que el mes coincida con las
  fechas que asigna el backend. Si Limpiar volviera a Este mes, un mes sin ventas dejaria
  al usuario en el mismo vacio.

## 2026-10-18: Indicadores de Facturas de venta

* Decision:
  * Ventas del mes: `totalSales` de `GET /api/reporting/kpis` del primer dia del mes a hoy
    (Bogota).
  * Por cobrar: suma de `pendingBalance` de las ventas en estado PENDIENTE; el texto
    secundario es el numero de esas facturas. No depende del periodo.
  * Abonos del mes: suma de los movimientos de `GET /api/treasury/movements` con
    `category=RECAUDO_VENTA` del mes cuya venta es a credito. Movimiento y venta se cruzan
    por `saleId` en el cliente con la lista de ventas ya cargada.
  * Ninguno muestra variacion contra el mes anterior (fuera de alcance).
* Alternativas consideradas: Abonos con todos los RECAUDO_VENTA; filtrar por venta con un
  `saleId` por peticion.
* Motivo: el recaudo de una venta de contado es su pago completo al emitirla, no un abono
  (terminologia en `servibox-backend/docs/ai-context/02-CONVENTIONS.md`). El backend ya
  excluye los movimientos de facturas anuladas, asi que el cliente no los filtra. Un solo
  listado de movimientos del mes evita una peticion por factura.

## 2026-10-18: Identidad de sesion guardada junto al token

* Decision: el login devuelve `user` (`username`, `role`) y `tenant` (`name`, `slug`), y
  `session.ts` los guarda en `sessionStorage` (`servibox.identity`) junto al token. La
  barra lateral muestra username y rol; la barra superior y el panel, el nombre del tenant.
  Una sesion guardada sin identidad, o con una ilegible, usa el `sub` y el `role` del JWT y
  el slug recordado, sin romper.
* Alternativas consideradas: seguir mostrando el slug; pedir la identidad a otro endpoint.
* Motivo: el backend ya la entrega en el login, sin peticiones extra. `sessionStorage`
  porque vive y muere con el token. Reemplaza a "La barra superior muestra el slug de la
  serviteca".

## 2026-10-18: Estado de stock: Sin stock solo en cero y variante Stock critico

* Decision: `src/lib/stock.ts` separa el cero del critico:
  * stock 0 (o nulo): "Sin stock";
  * mayor que 0 y menor o igual al umbral rojo: "Stock critico", tono de error;
  * mayor que el rojo y menor o igual al amarillo: "Bajo stock", advertencia;
  * si no, normal. Umbral nulo: amarillo 5 y rojo 2 (Autollantas).
  * El panel lista los tres primeros estados de menor a mayor stock, hasta 5.
* Alternativas consideradas: la regla de Autollantas tal cual, con "Sin stock" para todo
  lo critico.
* Motivo: "Sin stock" con unidades en bodega confunde. **Stock critico es una variante de
  `StatusBadge` que el manual no define: debe validarla el disenador.** Reemplaza las
  etiquetas de "Estado de stock replicado de Autollantas"; los umbrales siguen iguales.

## 2026-10-18: La barra superior muestra el slug de la serviteca, no su nombre

* Estado: reemplazada por "Identidad de sesion guardada junto al token".

* Decision: la barra superior y el subtitulo del panel muestran el slug guardado en
  `localStorage` al ingresar (`servibox.tenantSlug`) junto al usuario (`sub` del JWT).
* Alternativas consideradas: pedir el nombre del tenant a un endpoint; leerlo del JWT.
* Motivo: el backend aun no devuelve el nombre del tenant: el login responde solo
  `{token}` y el JWT trae `sub`, `role` y el id del tenant, no su nombre. Cuando exista un
  endpoint o un claim con el nombre, se reemplaza el slug.

## 2026-10-18: Lo que queda fuera del panel de control

* Decision: el panel no tiene variacion contra el mes anterior, buscador global, campana
  de notificaciones ni selector de periodo, aunque la captura del manual los muestra.
* Alternativas consideradas: implementarlos con lo que hay en la API.
* Motivo: no hay endpoint de busqueda ni modelo de notificaciones en el backend; la
  variacion exige definir como se compara un mes en curso contra uno completo, y el
  selector de periodo depende de esa misma definicion. Se dejan para tareas propias en vez
  de inventar comportamiento.

## 2026-10-18: Periodo del panel fijo en "Este mes"

* Decision: los indicadores del panel cubren del primer dia del mes en curso a hoy, en
  fechas locales del navegador, pedidos a `GET /api/reporting/kpis?desde=AAAA-MM-DD&hasta=AAAA-MM-DD`.
  "Este mes" se muestra como etiqueta fija, sin selector.
* Alternativas consideradas: KPIs globales (sin desde ni hasta); un selector de periodo.
* Motivo: el mes en curso es la pregunta diaria del taller y la captura del manual lo
  usa. El selector queda fuera, ver la entrada anterior.

## 2026-10-18: Estado de stock replicado de Autollantas

* Estado: las etiquetas cambiaron en "Estado de stock: Sin stock solo en cero y variante
  Stock critico"; los umbrales siguen vigentes.

* Decision: `src/lib/stock.ts` decide el estado de un producto con la regla de Autollantas
  (`StockAlertsController.analizarProducto` y `InventoryService.getStockAlertBreakdown`),
  con los umbrales de su categoria (`yellowStockMin`, `redStockMin`):
  * stock menor o igual al umbral rojo: critico;
  * si no, stock menor o igual al umbral amarillo: bajo;
  * si no, normal.
  * Umbral nulo: amarillo 5 y rojo 2, los valores por defecto de Autollantas. Stock nulo
    cuenta como 0, como en la tabla de alertas de Autollantas.
  * En la interfaz, critico es la etiqueta "Sin stock", bajo es "Bajo stock" y normal es
    "Disponible". Ojo: un critico puede tener stock mayor que 0 si el umbral rojo lo es.
  * El panel lista los bajos y criticos de menor a mayor stock, hasta 5.
* Alternativas consideradas: una regla propia (por ejemplo, "Sin stock" solo con stock 0);
  pedir el estado al backend.
* Motivo: mismas alertas que ya conocen los usuarios de Autollantas, y el backend no
  expone el estado. No se replica el respaldo de Autollantas para un producto sin
  categoria conocida (usar la categoria "General" o la primera de la lista): en ServiBox la
  categoria es obligatoria y viene en la misma respuesta. Las categorias sembradas por el
  perfil dev tienen umbrales 0 y 0, asi que ahi solo el stock 0 es critico.

## 2026-10-18: Medio de pago segun el tipo de cuenta

* Estado: reemplazada por "Medio de pago con los valores del diccionario".

* Decision: el medio de pago que se muestra en ventas y compras se deriva del tipo de la
  cuenta: `EFECTIVO` es "Efectivo"; `BANCO` o `DIGITAL` es "Transferencia" o "Tarjeta"; una
  factura a credito sin cuenta deja el medio vacio.
* Alternativas consideradas: un campo propio de medio de pago en la factura.
* Motivo: el backend no guarda un medio de pago; lo que existe es la cuenta que recibe o
  entrega el dinero, con su tipo (ver Treasury en
  `servibox-backend/docs/ai-context/02-CONVENTIONS.md`). Derivarlo evita un dato que podria
  contradecir a la cuenta.

## 2026-10-18: IVA mostrado como total menos subtotal

* Decision: en las vistas de factura el IVA se muestra como `total - subtotal`, con la
  etiqueta "IVA".
* Alternativas consideradas: sumar el `ivaAmount` de las lineas en el cliente; mostrar
  `ivaPorPagar`.
* Motivo: `total` y `subtotal` vienen del backend y la diferencia es exactamente el IVA de
  la factura, sin recalcular nada en el cliente. `ivaPorPagar` es otro concepto (IVA
  generado menos descontable) y no debe rotularse como IVA.

## 2026-10-18: Paginacion y filtros en el cliente

* Decision: los listados se paginan y filtran en el navegador sobre la lista completa que
  devuelve el backend.
* Alternativas consideradas: paginacion y filtros en el servidor con parametros de
  consulta.
* Motivo: la API actual devuelve listas completas por tenant y el volumen de una serviteca
  es bajo. Si un listado crece, se pasa ese listado al servidor sin cambiar los demas.

## 2026-10-18: Clientes dentro de Ventas y Proveedores dentro de Compras

* Decision: el menu lateral tiene Inicio, Inventario, Ventas, Compras, Cuentas, Reportes y
  Configuracion. Clientes es una seccion de Ventas y Proveedores una de Compras; no hay
  item de Terceros.
* Alternativas consideradas: un item Terceros; items separados Clientes y Proveedores.
* Motivo: el usuario piensa en clientes cuando vende y en proveedores cuando compra. En el
  backend los dos son roles de un mismo tercero (`Counterparty`), pero esa unificacion es
  del modelo de datos, no de la navegacion.

## 2026-10-18: Tokens como unica fuente visual

* Decision: `src/styles/tokens.css` define los tokens del manual de estilos ServiBox v1.0
  en el bloque `@theme` de Tailwind y vacia las escalas por defecto de color, radio, sombra
  y puntos de corte. Los componentes nunca usan hexadecimales literales.
* Alternativas consideradas: la paleta por defecto de Tailwind con colores de marca
  agregados; constantes de color en TypeScript.
* Motivo: un solo lugar para cambiar la identidad visual, y una utilidad fuera del manual
  ni siquiera se genera. `color-action` separa el fondo del boton primario de la marca para
  poder ajustarlo sin tocar el resto.

## 2026-10-18: Token en sessionStorage

* Decision: el JWT se guarda en `sessionStorage`; el slug de la serviteca, que no es
  secreto, en `localStorage`.
* Alternativas consideradas: `localStorage`; cookie `HttpOnly` emitida por el backend;
  solo memoria.
* Motivo: `sessionStorage` se borra al cerrar la pestana, asi que una sesion olvidada en un
  equipo compartido del taller no queda abierta, y sobrevive a recargar la pagina, cosa que
  la memoria no. La cookie `HttpOnly` protege mejor ante XSS pero exige cambios en el
  backend (emitir la cookie, CSRF), que hoy entrega el token en el cuerpo. Sin refresh: al
  vencer `exp` se cierra la sesion.

## 2026-10-18: Proxy de Vite en desarrollo, sin CORS

* Decision: en desarrollo el navegador llama a `/api` en el mismo origen y el proxy de Vite
  lo reenvia al backend (`API_PROXY_TARGET`, por defecto `http://localhost:8080`). En
  produccion un proxy inverso sirve el frontend y el backend en el mismo origen. El backend
  no configura CORS.
* Alternativas consideradas: habilitar CORS en Spring Security para el origen del
  frontend.
* Motivo: con un solo origen no hay peticiones de origen cruzado, ni preflight, ni una
  lista de origenes que mantener por entorno. El frontend usa rutas relativas y no necesita
  conocer la URL del backend.
