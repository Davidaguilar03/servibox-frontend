# 2026-11-01: Landing con capturas, ilustraciones y afirmaciones verificadas (tarea extra)

Rama feat/54-landing-real-product desde main en a6f785e (merge PR 55). Sin commit, push ni PR: quedan
para el prompt de cierre. Backend sin cambios de codigo.

## Resumen del paso 0

* Lectura: 00, 06 y la nota anterior completas; de 01, 02, 03 y 05 las partes de la landing. Rutas de
  servitecas leidas en routes.tsx.
* Landing: portada, tres pasos, funciones, franja de reportes, preguntas, cierre y pie. Tenia seis
  imagenes de producto en cinco secciones, generadas, en WebP lossless de 687 a 783 KB. Las tres
  ambientales no cambian.
* Producto: Inicio, facturas de venta y de compra con papelera, abonos y pagos, otros ingresos, gastos
  operativos, clientes, proveedores, inventario, categorias, Tesoreria, Reportes y Configuracion.
* Exportacion: Reportes ofrece PDF y Excel para estado de resultados y movimientos (cuatro descargas
  reales con 200 y su tipo de archivo). Tesoreria solo exporta a Excel.
* Acceso a la demo: David autorizo leer solo DevDataInitializer para la clave. Codigo demo y usuario
  admin coinciden. La clave no se imprimio ni se guardo; los scripts la leian en memoria.
* Playwright no esta en el repo ni en el equipo. Se uso Edge sin ventana por CDP, fuera del repo.

## Afirmaciones

R: respaldada. P: parcial, corregida. Las frases de tono (Tu serviteca bajo control, Menos archivos
sueltos) no afirman una funcion y no se clasifican.

| Afirmacion | Clase | Evidencia |
|-|-|-|
| Actualiza el inventario y la caja al instante (portada, meta) | P | A credito la caja no cambia; ver prueba abajo |
| Ventas, inventario y caja conectados | R | Prueba abajo |
| Elige los productos y registra como te paga | R | Nueva factura: lineas, forma y medio de pago |
| El stock se descuenta automaticamente | R | 10 a 9 y 9 a 8 en la prueba abajo |
| A credito el dinero entra con cada abono | R | 13 creditos sin movimiento de venta; 11 abonos |
| Alertas y unidades disponibles | R | Inventario e Inicio |
| Precio sugerido con costos y margenes | R | inventory/pricing.ts y margen por categoria |
| Efectivo, bancos y billeteras digitales | R | Tipos EFECTIVO, BANCO y DIGITAL |
| Utilidad bruta y neta | R | KPI y estado de resultados |
| Compras con pagos, clientes y proveedores | R | Rutas y pantallas existentes |
| Gastos operativos, otros ingresos, transferencias | R | Rutas y createTransfer |
| Estado de resultados y movimientos en PDF o Excel | R | Cuatro descargas reales |
| Filtra por fechas | R | Periodo y rango personalizado, hasta 366 dias |
| Comparte tus resultados con tu contador | P | No hay envio desde la aplicacion: se descarga el archivo |
| No hay que instalar nada, computador o celular | R | Web adaptable |
| Ventas a credito con abonos | R | Detalle de factura |
| Solo la ve quien tiene acceso a esa cuenta | P | Plataforma ve datos de cuenta; ver abajo |
| No reemplaza la facturacion de la DIAN | R | No existe emision electronica |
| Empieza a usar ServiBox | P | El acceso es por solicitud, aprobacion y activacion |
| Solicitar cuenta, Solicitar mi cuenta | R | Terminologia de /registro; sin cambio |

## Prueba de forma de pago (API de desarrollo)

| Venta | Stock LL-002 | Caja General | Movimientos del dia |
|-|-|-|-|
| FV-0046 contado, $ 328.012,79 | 10 a 9 | 4.406.852,45 a 4.734.865,24 | 22 a 23 |
| FV-0047 credito, $ 328.012,79 | 9 a 8 | sin cambio | sin cambio |

## Plataforma y privacidad

src/platform y las paginas de plataforma solo llaman a /platform: auth, metrics, registration-requests,
tenants, usuarios y revocacion. Muestran nombre, codigo, NIT, telefono, usuarios, correos, conteos y
solicitudes. No hay ventas, inventario, caja ni clientes. Se verifico la pantalla y su contrato en el
frontend; los controladores del backend no se leyeron por no estar autorizados.

## Cambios de texto

| Anterior | Nuevo | Razon |
|-|-|-|
| Registra una venta y ServiBox actualiza el inventario y la caja al instante. Para servitecas y talleres. | Registra una venta y ServiBox descuenta el inventario. De contado, el dinero entra a la cuenta que elijas; a crédito, con cada abono. Para servitecas y talleres. | A credito la caja no cambia al vender |
| No. La información de cada serviteca se guarda por separado y solo la ve quien tiene acceso a esa cuenta. | No. Dentro de la aplicación, las ventas, el inventario, la caja y los clientes de tu serviteca solo los ven sus usuarios. El equipo de ServiBox gestiona los datos de la cuenta: nombre, NIT, teléfono, usuarios y correos. | Plataforma ve los datos de cuenta |
| Empieza a usar ServiBox y lleva el control de tu serviteca de forma simple y organizada. | Solicita tu cuenta. Revisamos cada solicitud y, si la aprobamos, te enviamos un correo para activarla y llevar el control de tu serviteca. | El acceso es por solicitud |
| Comparte tus resultados con tu contador. | Comparte el archivo descargado con tu contador. | No hay envio desde la aplicacion |

La descripcion cambia en la landing y en la meta de index.html. Tambien cambia el texto alternativo de
las seis imagenes. Los llamados Solicitar cuenta y Solicitar mi cuenta se conservan.

## Imagenes: reparto final (ronda 2)

Reemplaza los repartos anteriores de esta tarea: seis capturas del agente, luego tres de David con una
ilustracion de hero. Motivo: texto dentado por baja resolucion y un logo de cubo generico.

| Archivo | Tipo | Dimensiones | Proporcion | Bytes | Formato |
|-|-|-|-|-|-|
| product-screens/hero-dashboard | Captura, API simulada | 2074x1297 | 1,60 | 141918 | WebP con perdida, 90 |
| product-screens/feature-reports | Captura, API simulada | 1968x1235 | 1,59 | 110550 | WebP con perdida, 90 |
| product-screens/feature-balances | Captura, API simulada | 1338x832 | 1,61 | 34030 | WebP con perdida, 90 |
| product-screens/step-payment | Captura, API simulada | 780x992 | 0,79 | 35226 | WebP con perdida, 90 |
| product-visuals-v2/step-sale | Ilustracion de main | 1448x1086 | 1,33 | 686914 | WebP VP8L, sin cambios |
| product-visuals-v2/stock-panel | Ilustracion de main | 1448x1086 | 1,33 | 769522 | WebP VP8L, sin cambios |

Ancho mostrado medido a 1440 y 1920: hero 816 y 1037, reportes 763 y 984, saldos 516 y 669, pago 320 y
320. Objetivo 2x: 2074, 1968, 1338 y 640.

Metodo, todo fuera del repo y ya borrado:

* Servidor Node en el puerto 8099 con kpis, cuentas, saldo, ventas, detalle de FV-0003, movimientos,
  productos y categorias. Sin backend ni base de datos.
* Vite con VITE_API_BASE_URL por variable de entorno, en el puerto 5174, porque el 5173 ya estaba
  ocupado por otro proceso que no se toco. No se creo ningun archivo de entorno.
* Sesion: JWT simulado e identidad en sessionStorage, inyectados antes de cargar la pagina.
* Edge sin ventana a escala 2. Ventanas: hero 1586x992 con Ingresos y Egresos abiertos; saldos 669 de
  ancho; reportes 1440, recorte del area principal; pago 414 de ancho.
* Hero y reportes se redujeron con Lanczos a su 2x; saldos y pago quedan como salieron.

Datos: Mi serviteca, Administrador, Cliente mostrador; Banco principal, Efectivo, Billetera digital;
Bateria 12V 45Ah, Llanta 205/55 R16, Filtro de aceite, Aceite 20W-50 x galon, Liquido de frenos. Cifras:
ventas 12.500.000, costo 7.500.000, bruta 5.000.000, otros ingresos 500.000, gastos 2.000.000, neta
3.500.000; saldos 8.000.000, 2.500.000 y 1.500.000, total 12.000.000; FV-0003: subtotal 1.000.000, IVA
190.000, total 1.190.000, abonado 500.000, saldo 690.000. Las cuatro imagenes se revisaron una por una:
sin marcas, personas, empresas, correos, telefonos ni elementos del navegador. El hero lleva el logo real.

Secciones:

* Hero: desde xl el texto suma 40 px a la izquierda. Queda 16 px a la derecha del logo de la barra y
  40 px a la derecha de los titulos de las demas secciones.
* Funciones: ver rondas 3 y 4.
* Reportes: franja 2/3 y contenedor con padding 16 y 24, fondo canvas rgb(242, 243, 245), igual al borde
  medido de la captura. El titulo Reportes se ve completo. Mas claridad ya no se parte en dos lineas.

Movil:

| Ancho | Hallazgo | Arreglo |
|-|-|-|
| 360, 390, 414 | Caja clara con bordes duros sobre foto ampliada; texto pegado a su borde | Foto solo detras de la imagen; texto sin caja |
| 360, 390, 414 | Barra de 258 px con un enlace suelto en otra fila | Acciones en una fila, enlaces en tres columnas; 206 px |
| 360 | Solicitar cuenta partido en dos lineas | Ancho segun contenido |
| 360, 390, 414 | Hueco grande sobre la imagen del hero | Margen superior de 144 a 80 px |
| 360, 390, 414 | Cierre con espacio rojo vacio y rueda abajo | Rueda oculta bajo md; reemplazado en las rondas 4 y 5 |
| 768 | Misma caja clara; rueda en flujo | Mismos arreglos; rueda a la derecha desde md |

En 360, 390, 414 y 768: sin desborde horizontal; enlaces y botones de al menos 44 px de alto. Desde lg los
botones de la barra y de la portada miden 40 px, como antes.

dist: 7002798 bytes en main y 4343311 ahora, 91 archivos.

## Ronda 3: Lo que necesitas, en orden

La fila de saldos y las mini tarjetas de esta ronda se reemplazan en la ronda 4. Pedida por David tras revisar
la ronda 2. Sin cambios en imagenes, hero ni demas secciones; el desplazamiento
de 40 px del hero se conserva. Unico cambio de copy: Sabe que se esta acabando pasa a Enterate antes de
quedarte sin stock.

Medidas en px con Edge (fila 1, altura de cada tarjeta; saldos, tarjeta e imagen; mini tarjetas):

| Ancho | Fila 1 | Saldos | Imagen | Mini tarjetas |
|-|-|-|-|-|
| 1920 | 2 x 868x192 | 1760x466 | 669x416 | 4 x 422x55 |
| 1440 | 2 x 677x192 | 1377x466 | 669x416 | 4 x 326x76 |
| 1024 | 2 x 469x253 | 961x313 | 424x263 | 4 x 222x97 |
| 768 | 2 x 349x259 | 721x592 | 669x416 | 2 x 349x55 |
| 390 | apiladas, 228 y 259 | 358x393 | 308x192 | 1 x 358x55 |
| 360 | apiladas, 282 y 259 | 328x374 | 278x173 | 1 x 328x55 o 76 |

Sin desborde horizontal a ningun ancho. Dentro de cada fila las tarjetas miden lo mismo; apiladas en telefono cada una toma su alto.

Reportes en telefono, bajo 640 px: imagen de 640x402 y overflow-x auto en su contenedor, con degradado al
borde derecho. Medido: a 390, marco de 358 con 672 de contenido, desplaza 314; a 360, marco de 328, desplaza
344. La pagina no se mueve (scrollX 0, sin desborde) y al inicio se ve completo el titulo Reportes. Desde 640
px nada cambia. Tamano de letra en la imagen: unos 7,5 px para texto de 14.

Limitaciones de la ronda: el degradado sigue visible al final del desplazamiento; las barras de desplazamiento
de telefono solo aparecen al tocar; a 390 y 360 la imagen de saldos queda con letra pequena; a 768 la tarjeta
de saldos se apila y mide 592 de alto, para que la imagen conserve 669 de ancho.

## Ronda 4: tarjeta unica de cuentas y rueda en telefono

Pedida por David. Fila 1, imagenes, hero y reportes sin cambios. Sin copy nuevo.

Tarjeta unica: dos columnas desde 1024; apilada a 768 con mini tarjetas en 2 columnas; una columna en telefono.
Panel con el token canvas (#f2f3f5), el mismo fondo de las capturas, sobre surface (#ffffff); radio surface. Las
mini tarjetas llevan el icono en un recuadro canvas y a partir de 1280 su texto sube a 20 px, para no quedar
vacias al estirarse.

| Ancho | Tarjeta | Columna izquierda | Panel | Imagen | Mini tarjetas |
|-|-|-|-|-|-|
| 1920 | 1760x591 | 843x541 | 843x541 | 669x416 | 398x246 |
| 1440 | 1377x580 | 652x530 | 652x530 | 652x405 | 302x241 |
| 1024 | 961x499 | 444x449 | 444x449 | 444x276 | 198x200 |
| 768 | 721x904 | 671x534 | 671x297 | 669x416 | 312x137 y 312x112 |
| 414 | 382x1001 | 332x350 | 332x578 | 332x206 | 300x137 o 112 |
| 390 | 358x986 | 308x335 | 308x578 | 308x192 | 276x137 o 112 |
| 360 | 328x993 | 278x316 | 278x603 | 278x173 | 246x137 o 112 |

Desde 1024 el panel y la columna izquierda miden lo mismo. Sin desborde a ningun ancho.

Rueda: el archivo tiene transparencia en los cuatro bordes, asi que se ve completa sin tocarlo. Bajo 768 va
centrada debajo de la accion, ancho min(62vw, 280px).

| Ancho | Rueda | Alto del cierre | Fondo del boton desde el borde de la tarjeta | Alto del boton |
|-|-|-|-|-|
| 414 | 257x385 | 743 | 294 | 56 |
| 390 | 242x363 | 721 | 294 | 56 |
| 360 | 223x335 | 725 | 326 | 56 |

A 768 sigue a la derecha, 180x333. Desde 1024, 358 de alto como antes. El recorte de la rueda a la derecha y abajo
en esos anchos es el que ya tenia. Antes de la ronda el cierre en telefono no mostraba rueda.

## Ronda 5: mini tarjetas mas grandes y rueda recortada

Pedida por David. Reemplaza la rueda completa y los tamanos de mini tarjeta de la ronda 4. Sin copy nuevo. La
cuadricula 2x2 y sus tamanos se reemplazan en la ronda 6; la rueda sigue vigente.

| Ancho | Recuadro | Icono | Texto | Mini tarjeta |
|-|-|-|-|-|
| 1920 | 72 | 40 | 26 | 398x246 |
| 1440 | 64 | 36 | 24 | 302x241 |
| 1280 | 64 | 36 | 24 | 262x224 |
| 1024 | 56 | 32 | 20 | 198x200 |
| 768 | 48 | 28 | 18 | 312x141 |
| 390 | 48 | 28 | 18 | 276x141 |
| 360 | 48 | 28 | 18 | 246x141 |

Las cuatro miden lo mismo a cada ancho, sin desbordes y sin lineas de una sola palabra (medido palabra por
palabra). El token mayor de icono es 24 px, asi que el tamano va por CSS local de esta landing. En telefono el
panel pasa de unos 578 a 643 px de alto.

Rueda bajo 768: debajo del boton, centrada, recortada por el borde inferior de la tarjeta.

| Ancho | Imagen | Ancho sobre tarjeta | Visible de la llanta | Tarjeta | Boton |
|-|-|-|-|-|-|
| 414 | 350x525 | 92 % | 259 px, 62 % | 585 | 56 |
| 390 | 326x489 | 91 % | 241 px, 62 % | 568 | 56 |
| 360 | 296x444 | 90 % | 219 px, 62 % | 577 | 56 |

Separacion boton a rueda: 32 px. Se midio tambien 700 px: 460 de ancho y tarjeta de 657, unico ancho que pasa
de 640. A 768 se conserva la rueda a la derecha, que ya es el recorte de escritorio. Desde 1024 no cambia. Un primer
intento con ancho fijo ensanchaba la columna y quitaba el margen derecho del texto; se detecto al medir y se
corrigio con margenes negativos.

## Ronda 6: panel de una columna con cuatro filas

Pedida por David. Sin copy nuevo ni tokens nuevos. Fila 1, imagen de saldos, rueda y demas secciones sin cambios.

Panel en una columna, con icono a la izquierda y texto a la derecha, centrados en vertical (diferencia medida: 0
px). Desde 1024 las filas reparten la altura de la columna izquierda.

| Ancho | Fila | Recuadro | Icono | Texto | Panel | Tarjeta | Lineas del texto mas largo |
|-|-|-|-|-|-|-|-|
| 1920 | 811x115 | 72 | 40 | 26 | 843x541 | 1760x591 | 1 |
| 1440 | 620x112 | 64 | 36 | 24 | 652x530 | 1377x580 | 1 |
| 1280 | 540x100 | 64 | 36 | 24 | 572x480 | 1217x530 | 2 |
| 1024 | 412x90 | 56 | 32 | 20 | 444x440 | 961x490 | 2 |
| 768 | 639x82 | 48 | 28 | 18 | 671x408 | 721x1016 | 1 |
| 414 | 316x70 | 44 | 24 | 16 | 332x320 | 382x744 | 2 |
| 390 | 292x70 | 44 | 24 | 16 | 308x320 | 358x729 | 2 |
| 360 | 262x66 | 40 | 24 | 15 | 278x304 | 328x694 | 2 |

Las cuatro filas miden lo mismo a cada ancho. Separacion y relleno del panel: 16 px desde 640, 8 px en telefono.
Sin desbordes y sin lineas de una sola palabra. Desde 1024 el panel mide lo mismo que la columna izquierda. A 360 el
texto mas largo daba tres lineas y estiraba las filas a 88 px; bajo 380 px texto y recuadro se reducen a 15 y 40.

## Datos de la serviteca demo

Cambios hechos para el primer reparto, por la API de desarrollo, sin tocar repo ni backend. Desde la
ronda 2 ninguna imagen depende de ellos, y en esa ronda no se toco la demo.

* Cuentas: Bancolombia pasa a Banco principal y Nequi a Billetera digital.
* 13 terceros (todos menos Consumidor final) con nombre generico, documento y telefono ficticios, sin
  correo. Ejemplos: Cliente particular Norte, Taller Aliado Uno SAS, Lubricantes Ejemplo SAS.
* 27 productos sin marca, con linea generica y medida. Ejemplo: Llanta Linea Ruta 205/55 R16 91V.
* Creadas FV-0046 y FV-0047 (LL-002) para la prueba de forma de pago.
* Sin cambio: un movimiento de otros ingresos conserva el concepto semilla Reintegro de Distrillantas
  del Oriente por garantia.

Los valores originales estan en DevDataInitializer. Otras notas que citen esos nombres quedan como
historicas.

## Evidencia

* Suite completa, cierre, dos corridas seguidas: 73 archivos, 1730/1730 y 1730/1730. Base 1715, 16 nuevas, 1 retirada.
* Corridas con fallos, sin ocultar: 6 fallos en 3 archivos en la primera entrega, con backend y Vite
  encendidos (al menos dos por tiempo agotado en ReportsPage). Con todo apagado aparecio de forma
  intermitente 1 fallo en platformTenants, "401 del listado": validToken() calcula el vencimiento en
  segundos y la prueba lo llama dos veces. Es anterior a esta tarea y no se toco.
* Nuevas en LandingPage.test (16): ambientales WebP (reemplaza a la retirada), 4 de captura con formato,
  dimensiones y 300 KB, 2 de ilustracion con VP8L y dimensiones, carpetas solo con archivos en uso,
  franja 2/3 con contenedor de reportes, rueda recortada y foto en telefono, textos alternativos y carga,
  afirmaciones corregidas, tarjetas de Funciones, tarjeta unica de cuentas con panel de cuatro filas, tamanos de las filas, reportes
  desplazable en telefono.
* Ajustadas en LandingPage.test:
  * Titular y meta de index.html: descripcion nueva.
  * Portada: alt, ruta y dimensiones de la captura nueva.
  * Flujo: dimensiones de step-payment.
  * Funciones: stock-panel ya no esta en la seccion y aparece una sola vez en la pagina.
  * Recursos sin rotulos: dimensiones de reportes.
  * Retirada: la que exigia VP8L a las seis; ahora solo la exigen step-sale y stock-panel.
* El logo real del hero no se puede verificar con una prueba porque es parte de la imagen; se reviso a ojo.
* Guardas designSystem, tokens, copy y errorMessages: pasan, sin cambios.
* npm run build, npm run lint y git diff --check: sin hallazgos.
* Landing en Edge a 360, 390, 414, 768, 1024, 1440 y 1920; revisadas a ojo todas menos 1024, que solo se
  midio.

## Limitaciones

* Las capturas salen de la interfaz real, pero con datos de una API simulada: no son de una serviteca real.
* A 390 px el hero no se lee en detalle.
* step-payment es mas alta que antes (320x407 frente a 320x363): el paso 3 sobresale de los otros dos.
* A 1920 el paso 1 tiene una linea menos de texto y su imagen arranca mas arriba; es anterior a esta ronda.
* La privacidad se afirma sobre lo que muestra la aplicacion; no se reviso quien accede a la base de datos.
* Observacion fuera de alcance, sin cambio: Inventario de la demo avisa que el precio sugerido es igual al
  costo, pero los precios mostrados difieren por el margen de categoria.
* En el backend git muestra .idea/compiler.xml y .idea/servibox-backend.iml modificados. Esta tarea no los
  edito; no se reviso su estado antes de arrancar el backend en la primera entrega.
* Ronda 3, sin ocultar: la primera suite dio 1728/1729 por una prueba propia que buscaba 520px en todo el CSS,
  valor que ahora usa la tarjeta de saldos. Se limito al contenedor de reportes y la repeticion dio 1729/1729.

## Cierre

David aprobo la landing tras seis rondas. Ultimo cambio de copy: la respuesta de privacidad suma "Dentro de la
aplicacion". Los textos legales dicen que ServiBox trata la informacion de la serviteca como encargado para prestar el
servicio; no contradicen la frase, que se limita a lo que se ve dentro de la aplicacion. Las capturas se revisaron de
nuevo: sin marcas, personas, empresas, correos ni telefonos reales. step-sale y stock-panel, de main, si muestran marcas
de productos ya publicadas; David las acepto.
