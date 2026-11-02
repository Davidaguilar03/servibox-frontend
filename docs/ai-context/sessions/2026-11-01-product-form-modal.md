# 2026-11-01: Formulario de producto en modal

Rama feat/56-product-form-modal desde main en a4ee189. Sin commit, push ni PR: quedan para el prompt de cierre,
tras la aprobacion de David.

Lectura previa: 00, 01, 02, 05, 06 y la nota anterior; de 03-DECISIONS solo las entradas mas recientes, con
busqueda del resto, por su tamano.

## Que cambio

* Nuevo producto y Editar producto son un modal sobre el listado de Productos. Mismo `Modal` que Nuevo ingreso,
  con una variante nueva `size="wide"`; los demas modales no cambian.
* `/inventario/nuevo` y `/inventario/:id/editar` siguen existiendo, ahora como rutas hijas de `/inventario`. Un
  enlace directo abre el modal sobre el listado. Id invalido o 404: modal Producto no encontrado.
* Filtros del listado: pasan de `state` a la URL del modal. Ya no existe el tipo `ListState`.
* `UnsavedChangesGuard` acepta `children` y los reemplaza por el aviso mientras la salida esta bloqueada.
* Barra superior: no se monta en esas dos rutas. PricePanel: datos en fila desde sm y relleno de 16 px.

## Sin cambios

Campos, validaciones (`productForm.ts`), llamadas a la API, mensajes de error, regla de Guardar, permisos y
guardas (designSystem, tokens, copy, errorMessages). Sin textos nuevos. Se quitan los titulos de seccion Datos del
producto, Costo e Inventario.

Campos: Codigo, Categoria, Descripcion, Costo de compra sin IVA y Stock inicial, todos obligatorios. Al editar, Stock
es de solo lectura y no se envia. El prompt nombra los campos nombre y precio: no existen. El nombre es Descripcion y
el precio sugerido no se digita, lo calcula PricePanel.

## Verificacion en Edge sin ventana, con backend dev en H2 en memoria

Crear (estado esperado frente a obtenido):

| Dato | Panel | API |
|-|-|-|
| Costo | $ 98.500 | 98500 |
| IVA del costo | $ 18.715 | 18715 |
| Precio sugerido | $ 131.333 | 131333 |
| Stock | 6 digitado | 6 |
| Total de productos | | 27 a 28 |

La fila del listado muestra $ 131.333. Editar cambia la descripcion, conserva stock 6 y la lista se refresca sin
recargar. Sin errores en la consola.

Comprobado: foco inicial en Codigo, Tab y Mayus Tab atrapados, Esc cierra, el foco vuelve a Nuevo producto o a Editar
de la fila, Enter en un campo guarda, 4 errores al guardar vacio con foco en Codigo, 409 de codigo repetido bajo el
campo con el foco ahi, con cambios Esc muestra un solo dialogo, los filtros se conservan al cerrar. El 500 se simulo
en el navegador: el toast queda por encima del modal y lo digitado se conserva.

| Ancho x alto | Modal | Columnas | Cuerpo: contenido / visible | Input | Pie visible | Desborde X |
|-|-|-|-|-|-|-|
| 1440 x 900 | 672 x 723 | 2 | 574 / 574 | 40 | si | no |
| 1366 x 768 | 672 x 691 | 2 | 574 / 542 | 40 | si | no |
| 1024 x 768 | 672 x 691 | 2 | 574 / 542 | 40 | si | no |
| 768 x 1024 | 672 x 747 | 2 | 586 / 586 | 44 | si | no |
| 390 x 844 | 343 x 760 | 1 | 908 / 599 | 44 | si | no |
| 360 x 640 | 328 x 576 (movil) | 1 | se desplaza | 44 | si | no |
| 844 x 390 | 672 x 351 | 2 | 586 / 190 | 44 | si | no |

Capturas de antes (desde main, antes de cambiar codigo) y despues a 1440 y 390 revisadas por el agente. 1024, 768 y
horizontal solo medidos. Scripts y capturas fuera del repo y ya borrados.

## Pruebas

Suite: 73 archivos, 1742/1742 (base 1730 mas 12 nuevas). npm run lint, npm run build y git diff --check sin hallazgos.

Ajustadas:

* AppShell.test, Productos omite la barra: en `/inventario/nuevo` ya no hay barra ni miga; comprueba que sigue el h1
  Productos y el titulo de pestana.
* ProductsPage.test, filtros y enlace Editar: los filtros van en la URL y no en `state`.
* ProductFormPage.test, `fillNew` y edicion: Categoria se busca dentro del modal, porque el filtro del listado usa la
  misma etiqueta.
* ProductFormPage.test, edicion y 409: esperan el campo Stock, porque el titulo ya se ve mientras carga el producto.
* ProductFormPage.test, id inexistente: agrega que Volver a Productos cierra el modal.

Nuevas, en ProductFormPage.test: abre sobre el listado con foco y sin errores, enlace directo, cierre con Esc, X y
Cancelar (3), foco atrapado, descartar con cambios, atras con cambios, guardar y refrescar, 400 en el modal, editar
desde la fila, error al cargar el producto.

## Otras pantallas revisadas, sin tocar

* Categorias, `/inventario/categorias`: es la unica que queda con la barra superior antigua y miga; su formulario ya
  es modal.
* Nueva factura de venta y de compra, `/ventas/nueva` y `/compras/nueva`: formulario de pagina con tarjetas apiladas,
  sin barra. La de compra solo se reviso por codigo y por la ausencia de barra, sin mirar su captura.
* Configuracion, `/configuracion`: formulario de pagina, aprobado por David el 2026-10-28.
* Clientes, Proveedores, Tesoreria, Gastos y Otros ingresos: listados con modal, sin el aspecto viejo.

## Limitaciones

* Con npm run dev el campo Codigo muestra su error al abrir, y el primer campo de Nuevo ingreso hace lo mismo: StrictMode
  monta dos veces el efecto de foco de `Modal`, el campo pierde el foco y queda tocado. En un build de produccion hay 0
  errores al abrir, en alta y en edicion. No se corrigio por ser ajeno a la tarea y por afectar a todos los modales.
* La guarda `FLOATING_SHADOWS` y su comentario siguen nombrando la barra fija de `ProductFormPage`, ya sin sombra. Queda
  una entrada sin uso que conviene quitar en una tarea que pueda tocar la guarda.
* A 360 px con barra de desplazamiento de escritorio los botones del pie pasan a dos filas; en emulacion movil, sin esa
  barra, quedan en una. No se probo en un telefono real.
* `Modal` no bloquea el desplazamiento de la pagina de atras, igual que los demas modales.

## Ronda 2: costo con separador de miles

Revision de David: todo aprobado salvo el campo de costo. Sin commit, push ni PR.

No existia un campo de dinero con separador: Nuevo ingreso, Cuentas, abonos y pagos usan `TextField` con texto libre,
y siguen igual. Se crean `components/AmountField.tsx` y `lib/amountInput.ts`. El costo es el unico monto que se digita en
este formulario; Stock es entero y no lleva separador.

Comportamiento: digitos con punto de miles, letras y puntos escritos ignorados, sin ceros a la izquierda. La coma se ve y
da el error de siempre al salir del campo o al guardar. Regla, mensajes y cuerpos de la API sin cambios. `inputMode`
numeric, tipo text, etiqueta y ayuda asociadas.

Pegar, se normaliza a:

| Pegado | Queda |
|-|-|
| $ 1.234.567 o 1,234,567 | 1.234.567 |
| 98,500 | 98.500 |
| 98.500,50 o 98500.50 | 98.500,50, con error de centavos |
| 98.5 | 98,5, con error de centavos |

Prueba en Edge sin ventana, backend dev en H2 en memoria y categoria con margen 25 %, teclas reales:

| Paso | Esperado | Obtenido |
|-|-|-|
| Escribir 1234567 | 1.234.567, cursor 9 | igual |
| Retroceso en 1.23 cursor 4.567 | 124.567, cursor 2 | igual |
| Retroceso tras el punto, 1.234. cursor 567 | 123.567, cursor 3 | igual |
| Suprimir ante el punto, 1.234 cursor .567 | 123.467, cursor 5 | igual |
| Letra y punto con el cursor en 1 | sin cambio, cursor 1 | igual |
| Panel: costo, IVA, precio | $ 1.234.567, $ 234.568, $ 1.646.089 | igual |
| Cuerpo del POST | purchaseCost 1234567 | igual |
| API: costo, IVA, precio guardados | 1234567, 234568, 1646089 | igual |
| Al editar | 1.234.567, Guardar deshabilitado | igual |

Sin errores en la consola. Capturas a 1440 y 390 revisadas por el agente, en alta y en edicion. El pegado en el navegador
se probo con un evento de pegado simulado, no con el portapapeles del sistema.

Suite: 75 archivos, 1797/1797 (base 1742 mas 55 nuevas: 33 de amountInput, 12 de AmountField, 5 de ProductFormPage, 1 de
productForm y 4 de las guardas, que crean una prueba por cada archivo nuevo). npm run lint, npm run build y git diff --check sin hallazgos. Guardas sin cambios.

Ajustadas:

* ProductFormPage.test, costo guardado con decimales: `30000,5` pasa a `30.000,5`, porque al editar llega formateado.
* ProductFormPage.test, pesos enteros: `98.5` escrito ahora da 985, porque el punto escrito se ignora; el error se comprueba
  pegando `98.5`.
* productForm.test, carga con coma decimal: `30000,5` pasa a `30.000,5`, por el mismo motivo.

Limitaciones:

* Ctrl+Z no deshace dentro del campo con fiabilidad, porque el texto se escribe por codigo.
* Pegar `98,500` se toma como miles, aunque en formato colombiano podria leerse como decimal; en pesos es lo probable.
* En teclados virtuales de Android, que no informan la tecla, el Retroceso junto a un punto solo mueve el cursor y el
  siguiente borra el digito. No se probo en un telefono real.
