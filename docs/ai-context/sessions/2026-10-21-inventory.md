# 2026-10-21: Productos y Categorias

Rama `feat/7-inventory-products`.

## Hecho

* Mensajes de error: `errorMessage` en `src/lib/errorMessage.ts` (backend en 400 y 409,
  generico en lo demas, conexion en errores de red) en Nueva factura, Detalle de factura,
  Reportes, Login y las pantallas nuevas. `apiDownload` ya no pone el codigo HTTP en el texto.
* `ProductsPage` en `/inventario` (reemplaza el placeholder): indicadores, pestanas por
  categoria, filtros, orden y pagina en la URL, tabla y tarjetas bajo `md`.
* `ProductFormPage` en `/inventario/nuevo` y `/inventario/:id/editar`: una columna por
  bloques, barra de acciones fija, validacion al salir del campo, 409 bajo Codigo, aviso de
  cambios sin guardar, "Producto no encontrado".
* `CategoriesPage` en `/inventario/categorias` con el modal de crear y editar: paleta fija,
  umbrales, margen en porcentaje, impuestos, 409 bajo Nombre, Descartar cambios.
* `SelectField` acepta `error`; `TextField` acepta `ref`; nuevo `CategoryDot`.
* Decisiones en [03-DECISIONS.md](../03-DECISIONS.md); estructura en
  [01-ARCHITECTURE.md](../01-ARCHITECTURE.md); regla de errores y excepcion de la paleta en
  [02-CONVENTIONS.md](../02-CONVENTIONS.md).

## Verificado en el backend

* `GET /api/inventory/products`: `id`, `code`, `description`, `purchaseCost` (sin IVA),
  `quantity`, `taxAmount` (costo por tasas con `isVat`), `suggestedPrice` (sin IVA),
  `categoryId`, `categoryName`. `GET /products/{id}` igual, 404 si no es del tenant.
* `POST /products`: `code` y `description` `@NotBlank`, `purchaseCost`, `quantity` y
  `categoryId` `@NotNull`; sin rangos. 201. `PUT /products/{id}`: lo mismo sin `quantity`
  (si llega se ignora). 409 "Ya existe un producto con el codigo X" y "El codigo X no se
  puede cambiar: el producto ya tiene facturas de venta o de compra"; validacion 400
  "Peticion invalida"; categoria inexistente 400 "Categoria no encontrada: id".
* `GET /categories`: `id`, `name`, `color`, `yellowStockMin`, `redStockMin`,
  `targetMargin` (fraccion), `taxTypes`. `POST` y `PUT`: todo `@NotNull` o `@NotBlank`
  salvo `taxTypeIds`; nombre a mayusculas. Solo el PUT rechaza nombre repetido (409 "Ya
  existe una categoria con el nombre X") e impuestos ajenos (400). Ninguno valida rangos ni
  rojo contra amarillo. El PUT rehace los precios de la categoria.
* `GET /tax-types`: `id`, `name`, `rate`, `isVat`, por nombre.

## Prueba real

Backend en perfil dev (siembra demo) en 8080 y frontend con `npm run dev` en 5173; API por
el proxy y pantalla en Chrome.

* Por la API: POST LL-020 (costo 98500, LLANTAS margen 0) da `taxAmount` 18715 y precio
  98500; PUT con costo 100000 y `quantity` 999 deja stock 6 y precio 100000. 409 por codigo
  repetido, 409 por cambiar el codigo de DEMO-001, 400 con cuerpo vacio. POST de categoria
  LUBRICANTES (0.325). Margen de REPUESTOS DEMO a 0.40: DEMO-001 pasa de 42857.14 a 50000.
  PUT con rojo mayor que amarillo: 200 (el backend no lo valida). 24 productos extra.
* En la pantalla, con 28 productos: Total 28, En stock 22, Por debajo del minimo 2, Valor
  $ 6.444.000, iguales al calculo hecho por la API; LLANTAS 13 en su pestana; pagina 2 con
  "26 a 28 de 28 productos"; filtro Sin stock con orden de mayor a menor.
* Formulario: cambiar el codigo de DEMO-001 muestra el 409 bajo Codigo; Cancelar con
  cambios abre "Descartar cambios"; recargar con cambios dispara el aviso del navegador;
  error de red y 500 simulados muestran los textos genericos. Nuevo producto DEMO-010 desde
  `/inventario?estado=BAJO`: toast y vuelta con el filtro.
* Modal de categoria: margen de REPUESTOS DEMO de 40 a 30; los precios vuelven a 42857.14 y
  DEMO-010 queda en 17142.86.
* Nueva factura ofrece LL-020 ("6 disponibles"). DEMO-010 no aparece porque tiene stock 0.
* Al terminar no quedo nada escuchando en 8080 ni en 5173.

## Pendiente

* Mensajes del backend sin tildes.
* Validar en el backend rojo no mayor que amarillo y el nombre de categoria en el POST.
* Stock critico sigue pendiente de validar con el disenador.
