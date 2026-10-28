# 2026-10-27: Landing

## Cierre 2026-10-28: tarea 7 de 11, aprobacion visual de David

* David aprueba la revision visual final y autoriza commit, push y PR de
  feat/39-landing-refresh. Esta aprobacion sustituye los pendientes de
  revision visual de las iteraciones historicas siguientes. Sin navegador
  en este cierre; no se atribuye comprobacion visual automatizada.
* Resultado: portada con mecanico y representacion de Inicio, navegacion
  publica con anclas y acciones segun sesion, tres pasos conectados,
  funciones con stock y saldos, franja de Reportes, FAQ con panorama y
  acordeon blanco, cierre rojo con rueda y accion final. Composicion
  responsive, anchos locales y fundidos solo decorativos, sin cambios
  en otras pantallas, backend, AGENTS.md ni configuracion .idea.

### Recursos finales y limpieza

* La referencia a 21 archivos corresponde al inventario anterior al
  panorama: habia 22 al iniciar este cierre. Se revisan nombres, importaciones
  y referencias de ejecucion en el repositorio. Solo nueve se montan en la
  version final, todos WebP decodificables; no se publican PNG fuente.
* Se eliminan 13 obsoletos sin referencias de ejecucion: faq-workshop.webp,
  feature-balances.webp, feature-reports.webp, feature-stock.webp,
  flujo-inventario.webp, flujo-reportes.webp, flujo-venta.webp,
  hero-dashboard.webp, hero-inicio.webp, hero-workshop.webp,
  step-payment.webp, step-sale.webp y step-stock.webp, todos en la raiz
  de src/assets/landing. Cuatro estaban versionados; nueve eran recursos
  sin seguimiento de iteraciones anteriores. No se toca ningun original externo.

| Ruta relativa a src/assets/landing | Dimensiones | Bytes |
|-|-|-|
| hero-workshop-mechanic-v2.webp | 1280x960 | 91990 |
| faq-workshop-panorama-v2.webp | 1942x809 | 170438 |
| cta-tire.webp | 640x960 | 67760 |
| product-visuals-v2/hero-dashboard.webp | 1586x992 | 783494 |
| product-visuals-v2/step-sale.webp | 1448x1086 | 686914 |
| product-visuals-v2/stock-panel.webp | 1448x1086 | 769522 |
| product-visuals-v2/step-payment.webp | 1122x1402 | 737480 |
| product-visuals-v2/feature-balances.webp | 1448x1086 | 702654 |
| product-visuals-v2/feature-reports.webp | 1122x1402 | 760726 |

* Total final: 4770978 bytes, 4,77 MB decimales, aproximadamente 4,55 MiB.
  Producto lossless: 4440790 bytes en seis archivos, de 686914 a 783494
  bytes cada uno. Ambientales: 330188 bytes en tres archivos. Stock se
  reutiliza en pasos y funciones sin duplicar archivo.

### Verificacion de cierre

* Suite completa del cierre: 1380/1380 correctas en 65 archivos, cero
  fallos. Build, lint sin advertencias y diff check correctos. El build
  contiene exactamente nueve WebP con 4770978 bytes, igual al inventario.
  La ultima suite completa anterior fue 1376, ahora reemplazada por este
  resultado real. La escritura externa de la nota actualizo los resultados
  de build, lint y el inventario emitido; se conserva ese contenido valido.
  Codigo, pruebas y recursos no cambiaron desde las verificaciones aprobadas,
  por lo que se reutilizan 1380 pruebas, build y lint en el cierre retomado.
* Balance confirmado contra main: 1371 base + 10 nuevas menos 1 retirada =
  1380. Las diez nuevas son anclas/destinos, navegacion a login y registro
  (dos casos), favicon, dos contrastes, imagenes ambientales, formato/peso
  WebP, controles dibujados sin acciones y guarda automatica del CSS local.
  Se retira la prueba de peso de las cuatro capturas antiguas sin uso.
  Frente a las 1376 anteriores se suman cuatro: ambientales, WebP,
  controles dibujados y CSS local.
* Existentes ajustadas: LandingPage (ocho casos: titular/metadatos,
  encabezados, portada, flujo/credito, funciones, FAQ, cierre/pie y sesion);
  RequireAuth (titular nuevo sin cambiar guard ni destino); designSystem
  (excepcion local autorizada de sombra). Correcciones posteriores actualizan
  nombres/dimensiones de recursos y expectativas de composicion en esos casos.

### Limitaciones conocidas

* Las seis imagenes de producto son generadas, basadas en funciones
  existentes: no son capturas reales ni comprobacion de datos/API. Los
  controles dibujados no ejecutan acciones; no llevan rotulos visibles
  por solicitud de David. Ambientales generadas, sin representar clientes.
* Contactos reales pendientes: se omiten WhatsApp y correo demostrativos.
  /terminos sigue siendo la pagina pendiente existente. No hay precios
  publicados ni facturacion electronica DIAN.
* Recursos de producto pesados pese al formato WebP: se priorizo detalle
  lossless. Rendimiento de carga, red movil, LCP y otras metricas sin medir;
  build y pruebas unitarias no equivalen a medicion de rendimiento.
* No se ejecutan API, exportaciones ni pruebas reales de teclado/navegador
  en este cierre. No se detienen procesos ajenos ni se cambia de rama.
  Siguiente tarea: Login, solo despues de confirmar el merge de este PR.

## Iteracion anterior 2026-10-28: fundido FAQ y orden de capas

* Cambio exclusivo de capas ambientales. Desde lg: imagen plena hasta 27%
  horizontal, transparente al 44%, mostrando la superficie base opaca antes
  del acordeon. Sin maquinaria entre tarjetas; fundido inferior solo en el
  ultimo 10%, conservando las llantas de la zona inferior izquierda.
* En movil: fundido horizontal 28 a 60% de escena y vertical 60 a 82%,
  para limpiar el fondo antes del acordeon apilado sin reservar mas altura.
* El velo sale de la caja del texto y pasa al pseudo-elemento de la escena,
  con gradiente radial amplio y varias paradas hasta transparente. Ya no
  termina en el borde horizontal del bloque del titular. Sin blur ni
  blanqueado uniforme de las llantas. Escena y velo con pointer-events none.
* Orden revisado: foto, mascara y velo juntos dentro de la capa decorativa
  z0, con overflow limitado a ella. Titulo, descripcion y preguntas en z10
  con opacidad completa; no quedan pseudo-elementos de velo en el texto
  capaces de solaparse con los signos iniciales del acordeon.
* Panorama 1942x809, 170438 bytes intacto; sin cambios de imagen, encuadre,
  ancho, alto, alineaciones, espaciado, boton, cierre rojo u otras secciones.
  No se agregan ni modifican pruebas en esta iteracion.
* Pruebas afectadas: 406/406 correctas en cinco archivos (LandingPage,
  RequireAuth, designSystem, copy y tokens), base mas cambios. Cero pruebas
  nuevas, retiradas o ajustadas en esta iteracion. Total esperado de rama
  1380; ultima suite completa ejecutada 1376, sin repetirla ahora.
  Build, lint sin advertencias y diff check correctos.
* Sin navegador, commit ni push. David revisara transicion y lectura del
  acordeon; no se afirma validacion visual de la pagina.

## Iteracion anterior 2026-10-28: FAQ panoramico y velo localizado (capas reemplazadas)

* Recurso inspeccionado: C:/Users/PC/Documents/Codex/2026-10-25/files-pasted-by-the-user-vale/outputs/servibox-redesign/landing-assets/faq-workshop-panorama-v2.png.
  PNG RGB 1942x809, 2443289 bytes. Copia optimizada en
  src/assets/landing/faq-workshop-panorama-v2.webp: RGB 1942x809,
  170438 bytes (166,44 KiB), reduccion aproximada 93,0%. Conversion con
  ImageMagick disponible, calidad 82, metodo WebP 6, sin metadatos,
  sin recorte, sin ampliar y sin dependencias nuevas. WebP reabierto e
  inspeccionado; conserva proporcion y detalle de las pilas y el taller.
* Original externo conservado. SHA256 antes/despues identico:
  68992daff843c34a36115dc0047b1cd466ba226b08e9b91ab9bea3f0dfef7672.
  El recurso anterior queda sin uso; no se modifican las demas imagenes.
* Solo FAQ/cierre cambia de foto. Escena absoluta de ancho completo desde
  lg, eliminando el limite 54%; altura derivada de la proporcion natural,
  independiente de abrir preguntas. En movil minimo visual 840 px con
  recorte izquierdo dentro de la capa decorativa, sin altura de flujo nueva.
* Se retira el velo blanco casi opaco que cubria toda la foto. Sin opacity
  global: la izquierda conserva imagen plena hasta el 35% horizontal y el
  90% vertical. Fundido a derecha hasta el 80% y solo ultimo 10% inferior.
  Proteccion del texto mediante velo radial local, con bordes transparentes,
  sin rectangulo. Titular y descripcion HTML, acordeon blanco, ancho,
  alineaciones, espaciados, cierre rojo, rueda y boton conservados.
* Dos pruebas existentes ajustadas: dimensiones y nombre de imagen
  ambiental, inventario de WebP con el nuevo recurso. Sin casos nuevos ni
  retirados. Pruebas afectadas: 406/406 correctas en cinco archivos
  (LandingPage, RequireAuth, designSystem, copy y tokens), base mas cambios.
  Total esperado de rama 1380 sin casos adicionales; ultima suite completa
  ejecutada 1376. No se repite suite completa en esta correccion puntual.
  Build correcto, incluye el nuevo WebP; lint sin advertencias y diff check
  correctos.
* Sin navegador, commit ni push. La visibilidad, encuadre y contraste de la
  pagina en escritorio y movil quedan pendientes de revision de David;
  inspeccionar el recurso no sustituye esa revision visual de la pagina.

## Iteracion anterior: FAQ con encuadre natural y texto integrado (reemplazada)

Correccion puntual sobre feat/39-landing-refresh. Solo se modifica la escena
ambiental del FAQ y se retira el fondo del bloque de texto; cierre, rueda,
boton final y sus estados, portada, navbar y demas secciones conservados.

### Causa y correccion

* La imagen usaba h-full, w-full y object-cover dentro de un wrapper que
  ocupa toda la altura conjunta de FAQ y cierre. Ese encuadre la ampliaba
  para cubrir el contexto y podia variar al abrir respuestas. El texto
  tenia un background neutral-100 al 96% con limites rectangulares visibles.
* Se conserva el contexto compartido, con una escena absoluta propia
  anclada arriba y a la izquierda: ancho 54% desde 1024, 100% debajo. Su
  img mantiene la proporcion natural 960x640, display block, width 100%
  y height auto; no utiliza cover, repeticion, estiramiento ni escala.
  La altura depende solo del ancho y la proporcion de la foto, no del alto
  del FAQ o cierre. Abrir respuestas no cambia sus dimensiones si no cambia
  el viewport. No se anade altura de flujo ni espacio reservado para hacerla caber.
* Se elimina landing-faq-copy y su background. Titulo y descripcion siguen
  en HTML por encima de la foto, sin blur, opacity ni rectangulo propio.
  El velo es un pseudo-elemento absoluto sobre la escena ambiental, con
  gradiente neutral-100 que aclara la zona superior y se desvanece de forma
  amplia hacia abajo. La parada 280px es solo una coordenada de color del
  gradiente, nunca height, min-height o padding del contenido.
* La escena completa combina mascaras graduales hacia la derecha y el
  borde inferior; el velo comparte esos fundidos, sin un borde rectangular
  independiente. La capa decorativa hereda pointer-events none y aria-hidden.
  El acordeon conserva sus superficies blancas opacas y su flujo natural.
* Movil usa todo el ancho de la escena con la misma proporcion natural;
  el velo superior sigue aclarando el texto y el fundido inferior evita el
  borde de la fotografia. No se modifica la altura del contenedor ni los
  margenes, alineaciones o separacion compacta de las secciones.

### Verificacion y limites

* 406 pruebas afectadas correctas en cinco archivos (LandingPage, RequireAuth,
  designSystem, copy y tokens). Cero casos nuevos, retirados o modificados:
  las pruebas existentes cubren recursos, enlaces, registro desde el cierre,
  sesion y apertura/cierre de las cinco preguntas. Sin tests de clases CSS.
* Ultima suite completa realmente ejecutada sigue siendo 1376; el parcial
  no es una nueva suite completa. Total esperado de rama 1380, sin repetirla.
* SHA256 de los 21 archivos de recursos antes y despues: identicos. No se
  genera ni reexporta ninguna imagen, no se modifican originales externos
  ni se instalan dependencias. Dimensiones, pesos y calidad del inventario
  anterior se conservan.
* Build, lint y git diff check de esta correccion correctos. Sin cambios
  en pruebas o recursos despues de la ejecucion parcial.
* Arquitectura, decisiones y sistema de diseno reflejan el nuevo encuadre y
  la retirada del fondo de texto. No se tocan otras secciones de interfaz,
  pantallas privadas, backend, AGENTS, procesos ajenos o temporales bloqueados.
* Sin navegador, auditoria visual, commit, push ni PR. No se afirma contraste,
  encuadre, nitidez o ausencia de cortes visualmente comprobados. David debe
  revisar mas taller y pilas completas de llantas, texto sin rectangulo,
  fundidos lateral/inferior y estabilidad al abrir respuestas en escritorio
  y movil. Panel rojo, rueda y accion final quedan fuera de esta correccion.
* Pendiente de aprobacion visual de David.

## Iteracion anterior: ambiente FAQ/cierre, accion final y stock compacto

Esta iteracion conserva portada, navbar, Reportes, tipografia, pasos y ancho
general aprobados. Reemplaza el FAQ con foto rectangular, la accion final
aislada y el stock de funciones de max660 de la iteracion siguiente.

### Ambiente compartido y cierre

* FAQ y cierre se agrupan en landing-faq-environment: relativo y aislado,
  con una capa absoluta inset 0, z0, overflow limitado a esa capa y
  pointer-events none. Imagen existente de llantas anclada a la izquierda,
  con object-cover y fundido CSS gradual hacia la derecha (hasta 54% desde
  lg, 80% debajo). Se extiende hasta el final del contexto, no termina en
  un rectangulo insertado antes del CTA y no aporta altura al documento.
* Se retira la ventana fotografica 2:1. FAQ y cierre van en z10 con sus
  alineaciones compartidas, sin margen lateral ni min-height. El titulo y
  descripcion tienen velo localizado neutral-100 al 96%; el texto no usa
  opacity, blur ni filtros. Las preguntas conservan fondo blanco opaco y
  el panel rojo sigue siendo una superficie action solida frente a la foto.
* Se mantiene la separacion compacta FAQ/cierre de 48 px desde lg y 32
  debajo. Las respuestas siguen en flujo y pueden ampliar naturalmente el
  contexto, sin recortarse. No se recupera espacio reservado para una imagen.
* Solo el enlace del cierre usa landing-closing-action: altura 56 px,
  texto Inter semibold de 16 px y 18 desde lg, padding horizontal 24/32,
  radio surface 12 px, blanco con texto oscuro, borde border sutil y
  shadow-raised corto existente. Flecha ArrowRight de Lucide decorativa.
* Conserva estados hover neutral-100, active neutral-200 y foco visible
  inverso, sin cambiar dimensiones al interactuar. Max-width 100% permite
  ajustarse a movil; no se alteran botones de navbar o portada. El enlace
  se agrupa bajo el mensaje, dentro de ocho columnas desde lg, dejando el
  cuarto derecho para la rueda. Va a /registro sin sesion y /inicio con
  sesion como antes, sin nuevos controles, contactos o promesas.

### Separacion de secciones y stock

* Una venta conserva su fondo neutral-100, fuentes, recursos y medidas.
  Funciones usa canvas existente (#f2f3f5), cercano al gris solicitado,
  a ancho completo; dentro mantiene landing-container max1760 y margenes
  aprobados. Separacion por tono y padding 40 px, 48 desde lg, sin lineas,
  ondas ni adornos nuevos. No se modifica paleta ni estilos globales.
* Solo landing-stock-content de funciones baja de max660 a max580 px.
  Imagen, titulo accesible y descripciones comparten ancho; radio de 20 px,
  proporcion natural y texto completo preservados. El stock del paso 2
  conserva su max440 px y el mismo archivo de imagen.
* Desde lg, pistas de recursos minmax(0,580px) y minmax(0,460px), gap32,
  conjunto centrado. Se acota el grupo de recursos, no la seccion general;
  el sobrante no se acumula como hueco entre stock y cuentas. Debajo se
  apilan con gap24. Cuentas y utilidad mantienen max460 y su presentacion,
  sin estirar tarjetas ni cambiar texto financiero. Beneficios conservados.

### Verificacion y alcance

* 406 pruebas afectadas correctas en cinco archivos de LandingPage,
  RequireAuth, designSystem, copy y tokens. Ultima suite completa realmente
  ejecutada: 1376; no se repite ni se presenta el parcial como total.
  Esperadas en la rama: 1380. Cero casos nuevos o retirados en esta iteracion.
* Dos casos existentes ajustados: la imagen ambiental de FAQ se busca en
  su contexto dentro de main en lugar del contenido del acordeon; el caso
  de cierre conserva destinos/footer y ahora pulsa la accion para comprobar
  llegada al registro. No se anaden expectativas de clases CSS o medidas.
* Build, lint y git diff check de esta iteracion correctos; sin advertencias
  de compilacion ni cambios en los archivos de recursos.
* Comprobados SHA256 de los 21 archivos de src/assets/landing antes y
  despues: identicos. No se generan, convierten ni reexportan imagenes.
  No se instalan dependencias ni se modifican originales externos.
* Actualizados arquitectura, decisiones, sistema de diseno y esta nota.
  La guarda de sombra conserva la misma excepcion de Landing y documenta
  el uso autorizado en la accion final; no cambia ninguna regla de negocio.
* Sin navegador ni auditoria visual. No se declara composicion comprobada,
  contraste sobre imagen medido, ausencia de solapamientos ni cortes. David
  revisa el fundido detras de FAQ/cierre, la lectura del velo, el CTA junto
  al mensaje y separado de la rueda, el gris de funciones y el gap compacto.
* Backend, AGENTS, rutas privadas, logo, favicon, contactos omitidos y DIAN
  intactos. Sin commit, push ni PR, sin procesos propios de Vite, backend
  o navegador, sin tocar procesos ajenos o temporales bloqueados.
* Pendiente de aprobacion visual de David.

## Iteracion anterior: fondo compartido y escala equilibrada de recursos

Correccion de composicion y escala en feat/39-landing-refresh. Conserva ancho,
recursos y contenido aprobados. Esta entrada reemplaza los limites de imagen,
fondo separado del navbar y encuadre del FAQ de las iteraciones siguientes.

### Fondo continuo y estructura accesible

* El fondo anterior empezaba en la seccion de portada situada despues del
  header; por eso el navbar quedaba fuera de su contexto ambiental. Ahora
  navbar y portada estan dentro del mismo header exterior landing-hero,
  aislado y a ancho de ventana. La fotografia ocupa inset 0 desde el inicio
  de ese contexto hasta el final de portada, sin un segundo fondo o recorte.
* Barra blanca en grupo accesible Navegacion y acceso, z30, contenido de
  portada z10 y ambiente z0 con pointer-events none. La mascara solo afecta
  al img de fondo, sin opacidad, recorte ni eventos sobre la barra blanca.
  El header no tiene overflow hidden; solo lo tiene el wrapper ambiental.
* Banner incluye introduccion y H1 unico. Main#contenido empieza en el flujo
  de trabajo; SkipLink conserva el destino main y omite el banner. Marca,
  navegacion, login, registro y las cuatro acciones con sesion conservados.
  Los tests distinguen el grupo de barra de todo el banner, que incluye CTA.

### Ancho general conservado y limites propios

* Landing-container sigue con max1760 px, margen minimo 24 px desde 1024 y
  16 debajo. No se cambia el ancho general para reducir imagenes. Limites
  definidos exclusivamente en LandingPage.css bajo #landing, sin raiz,
  tokens globales, zoom ni transform scale. Todos los img mantienen height
  auto y ratio natural; no hay alturas minimas ni espaciadores para igualar filas.

| Ubicacion | Limite de presentacion definido | Texto exterior definido |
|-|-|-|
| Paso venta | 100% de columna, max440 px, centrado | Titulo 22/28, 24/32 desde lg; descripcion 18 px, 20 desde lg, interlineado 1,6 |
| Paso stock | 100% de columna, max440 px, centrado | Misma jerarquia, titulos alineados arriba |
| Paso pago | 100% disponible, max320 px, centrado | Misma jerarquia, sin estirar las otras columnas |
| Inventario en funciones | Contenido max660 px, centrado en su columna | Descripcion 18/20 px, sin titulo visual duplicado |
| Cuentas y utilidad | Contenido max460 px, columna derecha alineada | Descripcion 18/20 px, utilidad proxima en el mismo bloque |
| Reportes | Max520 px centrado; desde lg, min(520px,56svh) | Titulo 32/36, 44/48 desde lg; cuerpo y beneficios 18/20 px |
| Foto FAQ | Ventana max520 px y aspecto 2:1, alineada con texto izquierdo | Titular y preguntas conservados |

* Los maximos no obligan a ampliar en movil; imagenes de pasos van tras su
  texto sin flex-1 ni centrado vertical de un area alta. Se conservan las
  flechas horizontales desde lg y el orden apilado debajo. No se crea nueva
  tarjeta para ocupar el espacio libre que dejan imagenes mas pequenas.
* Funciones conserva la rejilla 60/40 y el titulo Lo que necesitas, en orden.
  Stock, saldos y utilidad tienen alto natural, sin row-span ni estiramiento.
  Se conservan los beneficios y las reglas financieras exactas.
* Reportes vuelve a un limite propio de imagen sin reducir la seccion. El
  limite en svh es un limite responsive de ancho, no una altura fija: por
  ratio de fuente, la imagen ronda como maximo 70% de la altura disponible
  en escritorio. Padding vertical de 48 px, sin recortar las seis filas.
  El texto sigue en flujo, por lo que ventanas bajas o contenido largo pueden
  ampliar naturalmente la seccion; no se certifica una medida renderizada.

### FAQ y espacio hacia el cierre

* Conjunto centrado por el contenedor compartido, columnas con items-start,
  inicio del texto izquierdo alineado con las otras secciones. Se eliminan
  margin-left negativo, ancho calc adicional y el aislamiento anterior de foto.
* Se retira la mascara blanca. La fotografia conserva su img 960x640 natural
  con height auto dentro de ventana responsive 2:1, max520x260 de encuadre,
  sin marco nuevo. Solo se oculta la zona ambiental inferior sobrante; no
  se deforma el archivo ni se corta contenido de las preguntas.
* Antes la imagen llenaba una columna ancha con su altura 3:2 y un margen
  negativo, alargando la fila debajo de preguntas cerradas. El nuevo encuadre
  reduce ese factor; no se reserva espacio vacio ni se asigna min-height al FAQ.
* Padding inferior hacia el cierre 48 px en escritorio y 32 en movil, frente
  a 64/48 anterior. Sin alturas ni overflow sobre acordeon: abrir y cerrar
  respuestas expande el documento naturalmente. Se conserva la aclaracion DIAN.

### Verificacion y pendientes

* 406 pruebas afectadas correctas en cinco archivos de LandingPage,
  RequireAuth, designSystem, copy y tokens. Ultima suite completa comprobada
  sigue siendo 1376; no se ejecuta de nuevo ni se confunde con el parcial.
  Total esperado de rama 1380, sin casos nuevos o retirados en esta correccion.
* Seis casos existentes adaptados (cinco definiciones, una parametrizada en
  dos rutas): barra con un primario, portada con mecanico, dimensiones de
  ambientales, sesion en barra y navegacion a login/registro. Cambian consultas
  de banner por grupo de barra cuando corresponde; se conservan sus contratos.
  No se anaden tests que copien clases, alturas o medidas CSS.
* No se genera, reconvierte ni reexporta ningun recurso. SHA256 antes y
  despues de todos los archivos de src/assets/landing: identicos. Se mantienen
  dimensiones, pesos, calidad lossless y alfa del inventario anterior.
* Build, lint y git diff check de esta iteracion correctos. Comparados los
  21 archivos de recursos, sin diferencias de hash antes y despues.
* Sin navegador, auditoria visual o afirmaciones de ausencia de cortes,
  desbordes o fidelidad comprobada. David revisa continuidad detras del navbar,
  escala de pasos y funciones, balance del reporte y espacio del FAQ cerrado
  o abierto. Los limites anteriores son definiciones de codigo, no mediciones.
* Sin commit, push ni PR; backend, AGENTS, pantallas privadas, recursos
  externos, procesos ajenos y temporales bloqueados intactos. No se arrancaron
  Vite, backend ni navegador.
* Pendiente de aprobacion visual de David.

## Iteracion anterior: ancho 1760, capas aisladas, esquinas y lossless

Esta correccion reemplaza los anchos, capas y calidad de las iteraciones
historicas conservadas mas abajo; no se eliminan sus referencias al piloto.
Rama feat/39-landing-refresh conservada, sin commit, push ni PR.

### Cadena de ancho y restricciones corregidas

* Revision de index.html, main.tsx, App.tsx, routes.tsx, index.css y Landing:
  #root solo monta App con proveedores y router; la ruta publica / monta
  Landing directamente, sin RequireAuth ni AppShell. No hay max-width o
  padding de un wrapper publico adicional ni ajuste del tamano raiz.
* El limite general concreto era landing-container con max-width 1360 px
  y width de ventana menos 96 px desde lg. La imagen de Reportes ademas
  estaba limitada a 560 px dentro de su columna. Ambos limites se retiran.
* Nueva definicion comun: width de ventana menos 32 px debajo de 1024,
  menos 48 px desde 1024, maximo 1760 px, centrado. Margenes minimos por
  lado: movil 16 px, escritorio 24; el sobrante se reparte al alcanzar el
  maximo. Navbar, pasos, funciones, contenido oscuro, FAQ, cierre y footer
  utilizan el mismo landing-container. No se cambian raiz, zoom, escala,
  tokens ni pantallas privadas. No hay ancho minimo de contenido.
* Valores derivados de codigo, no medidos en pantalla: viewport 1280 da
  1232 px utiles; 1440 da 1392; 1920 queda en 1760. Antes el maximo util
  era 1360. Los textos conservan limites de lectura internos y se agrega
  landing-prose de 64ch a parrafos largos, sin limitar imagenes o secciones.

### Portada, navbar y recortes

* Antes, la foto estaba dentro de figure con aislamiento y top negativo
  de hasta 96 px; el header era estatico y no tenia z-index. Ese contexto
  pintado despues del header podia invadir su borde inferior, aunque el
  z-index negativo de la foto pareciera situarla detras de toda la pagina.
* Ahora el header es relativo, aislado y z30, sin overflow que recorte
  botones o foco. Hero es una seccion independiente a ancho de ventana,
  relativa, aislada y z0; contenido interior z10. El fondo ambiental ocupa
  inset 0 de esa seccion, sin offsets negativos ni limite de contenedor.
* La mascara solo se aplica al img ambiental: lateral clara desde lg y
  fundido inferior; en movil el texto tiene superficie clara propia.
  Background y acento usan pointer-events none. El unico recorte ambiental
  pertenece a su wrapper, nunca al navbar ni a la pagina completa.
* Inicio queda delante, sin mascara, filtros, opacidad, transform scale,
  image-rendering pixelated ni srcset. No se cambia el contenido de producto.
* Se elimina de Landing toda la frase del piloto, sus lineas decorativas y
  el div con espacio reservado. La separacion restante sale del padding de
  portada. Las notas historicas se mantienen como solicito David.
* Cada imagen de producto tiene contenedor propio landing-product-frame,
  overflow hidden y radio local de 20 px. Reportes ocupa su columna, sin
  maximo 560 ni marco o fondo nuevo. Solo se recortan las esquinas exteriores
  del bitmap: dimensiones y proporcion intactas, sin cortar titulos o filas.
  La sombra de Inicio pertenece al contenedor, fuera del recorte del contenido.
  Radios y superficies globales no cambian.

### Calidad real y nuevo inventario

* Los imports ya apuntaban a product-visuals-v2/hero-dashboard.webp de
  1586x992, igual que el PNG; no habia una variante pequena ni candidatos
  srcset insuficientes. Se compararon los seis WebP anteriores con sus PNG:
  mismas dimensiones, pero perdida del codec calidad 94 (diferencia RGB media
  de Inicio 0,8388 sobre escala 0 a 255). No es una medicion de nitidez visual.
* Se reconvierten directamente los seis PNG originales a WebP lossless,
  method 6, sin redimensionar ni encadenar conversiones desde WebP previos.
  Imagenes reabiertas: formato correcto y RGB identico pixel a pixel a los
  PNG, diferencia cero. No se recupera detalle que el original no contiene.
  Originales externos conservados, sin nuevas dependencias ni generacion.

| Producto en src/assets/landing/product-visuals-v2/ | PNG original | WebP exportado | Peso anterior | Peso lossless |
|-|-|-|-|-|
| hero-dashboard.webp | 1586x992 | 1586x992 | 118660 | 783494 |
| step-sale.webp | 1448x1086 | 1448x1086 | 81272 | 686914 |
| stock-panel.webp | 1448x1086 | 1448x1086 | 111788 | 769522 |
| step-payment.webp | 1122x1402 | 1122x1402 | 97206 | 737480 |
| feature-balances.webp | 1448x1086 | 1448x1086 | 81924 | 702654 |
| feature-reports.webp | 1122x1402 | 1122x1402 | 92690 | 760726 |

* Pesos en bytes. Producto total: 4440790, frente a 583540 antes. Se acepta
  ese coste para conservar exactamente texto y bordes del original; solo
  Inicio tiene prioridad alta, las cinco imagenes inferiores son diferidas,
  y stock-panel sigue compartido entre dos ubicaciones sin duplicar archivo.
* Ambientales sin reconvertir: hero-workshop-mechanic-v2.png de 1448x1086
  frente a WebP 1280x960 de 91990 bytes; FAQ PNG 1536x1024 frente a WebP
  960x640 de 88068; rueda PNG 1024x1536 frente a WebP RGBA 640x960 de
  67760. Canal alfa conservado. Total actual de nueve archivos: 4688608 bytes.

### Densidad disponible y recursos mayores que pedir si se busca 2x

Son estimaciones del CSS al maximo de 1760 px, no lecturas del navegador
ni afirmaciones sobre el dispositivo de David. Lossless elimina la perdida
de exportacion, pero no aumenta la resolucion nativa ni garantiza lectura.

| Recurso | Presentacion maxima aproximada segun codigo | Resolucion disponible | Si se exige densidad 2x |
|-|-|-|-|
| Inicio | 1037 px de ancho, 60% tras gap 32 | 1586 px, aproximadamente 1,53x | Solicitar nuevo original 2400x1500; no reescalar el existente |
| Stock en funciones | 1042 px de ancho, 60% tras gap 24 | 1448 px, aproximadamente 1,39x | Solicitar 2400x1800 |
| Reportes | 860 px de ancho, mitad tras gap 40 | 1122 px, aproximadamente 1,30x | Solicitar 1800x2250 |
| Saldos | 694 px de ancho | 1448 px, suficiente para aproximadamente 2x | No hace falta aumentar para ese objetivo |
| Venta y stock en pasos | 565 px de ancho | 1448 px, mas de 2x | No hace falta aumentar para ese objetivo |
| Pago | 407 px de ancho, 72% del paso | 1122 px, mas de 2x | No hace falta aumentar para ese objetivo |

* El fondo ambiental abarca el viewport, incluso fuera del maximo de 1760;
  su WebP actual de 1280 px puede interpolarse en ventanas mayores. Si David
  necesita mas detalle ambiental, pedir un original 2560x1920 para escritorio
  convencional, o 3840x2880 para 2x a 1920 px; no se ha fabricado esa resolucion.
* Los tres originales de producto de mayor tamano quedan como solicitud
  concreta si la revision de David exige densidad 2x, no como recursos ya
  generados ni como requisito para probar esta version a densidad normal.

### Pruebas y alcance

* 406 pruebas afectadas correctas en cinco archivos: LandingPage, RequireAuth,
  designSystem, copy y tokens. Ultima suite completa comprobada: 1376, sin
  repetirla ni presentar este parcial como total. Total esperado de rama
  permanece 1380. Cero casos nuevos o retirados en esta correccion.
* Dos casos existentes ajustados: funciones verifica ausencia de cualquier
  mencion al piloto, en vez de exigir la frase; recursos verifica firma WebP
  lossless VP8L en producto y presupuesto menor a 1 MiB por archivo, conservando
  180 KiB para cada ambiental. No se anaden pruebas de clases CSS o medidas falsas.
* Build, lint y git diff check de esta correccion correctos. El build emite
  los seis WebP lossless y conserva un unico stock-panel compartido.
* Sin navegador, capturas nuevas ni auditoria visual automatizada. Pruebas de
  rutas y acciones conservadas, sin afirmar que jsdom compruebe hit-testing,
  esquinas, legibilidad, cortes o ancho renderizado. Eso lo revisa David.
* Documentados cambios en arquitectura, decisiones y sistema de diseno. Sin
  cambios de funciones financieras, contratos, rutas privadas, logo, favicon,
  backend ni AGENTS. Contactos omitidos y FAQ/DIAN conservados. No se consulto
  API ni se verificaron exportaciones financieras en esta correccion.
* Sin commit, push ni PR, sin procesos propios de backend, Vite o navegador,
  sin tocar procesos ajenos ni temporales bloqueados.
* Pendiente de aprobacion visual de David: ancho general, portada a ventana,
  navbar completo, piloto ausente, radios y nitidez de Inicio.

## Iteracion anterior: ancho fluido y product-visuals-v2

Esta iteracion reemplaza el uso de recortes pequenos y los rotulos visibles
de las iteraciones historicas siguientes. Se conserva el trabajo en
feat/39-landing-refresh sin borrar recursos previos ni alterar originales.

### Diagnostico de ancho y escala definida

* Leidos AGENTS, nota, codigo de Landing, CSS base, App y tokens. Inspeccionados
  manifest.txt y los seis PNG de product-visuals-v2 antes de convertirlos.
* El limite anterior era max-w-6xl: el CSS compilado define container-6xl
  como 72rem. Con raiz 16 px equivale a 1152 px; el relleno desde lg quitaba
  otros 64 px al contenido, dejandolo en 1088 px. No se encontro ajuste de
  font-size en html ni wrapper de ancho en App; body usaba text-body 15 px.
  No habia zoom ni transform scale en la estructura de la landing.
* Nuevo landing-container exclusivamente bajo #landing: max-width 1360 px,
  width calc(100% menos 32px) bajo 640, menos 64px desde 640, menos 96px
  desde 1024. Centrado, sin relleno propio ni ancho minimo. Corresponde a
  margenes minimos por lado de 16, 32 y 48 px; al alcanzar el maximo, el
  margen adicional se reparte simetricamente. Raiz y pantallas privadas intactas.
* Ejemplos derivados del codigo, no medidos en navegador: ventana 1280 da
  1184 px utiles; 1440 da 1344; 1920 queda en el maximo 1360. El anterior
  contenido maximo era 1088 bajo la hipotesis de raiz 16. No se certifican
  medidas renderizadas, lectura, desbordes ni configuracion real de zoom.
* Cuerpo y titulos h3 16 px, 18 desde 1024; ayudas y navegacion 14.
  Las variantes de funciones conservan 20/28 y 24/32 por especificidad.
  H1 36/40 y 56/60 desde 1024; titulos principales 28/32 y 36/40.
  No se cambian tokens globales, fuentes, html ni estilos de rutas privadas.

### Inventario actual y procedencia

* Seis representaciones graficas generadas de funciones existentes, autorizadas
  por David, no capturas reales. Directorio fuente externo conservado:
  C:/Users/PC/Documents/Codex/2026-10-25/files-pasted-by-the-user-vale/outputs/servibox-redesign/landing-assets/product-visuals-v2/.
* Cada PNG se convierte a WebP homonimo en
  src/assets/landing/product-visuals-v2/, calidad 94, method 6, sin recortar,
  ampliar, deformar ni modificar texto o importes. Pillow ya disponible,
  sin dependencias nuevas. Los seis archivos se reabren y verifican como WebP.

| Recurso de producto | Dimensiones PNG y WebP | Bytes PNG | Bytes WebP |
|-|-|-|-|
| hero-dashboard | 1586x992 | 1310127 | 118660 |
| step-sale | 1448x1086 | 1195496 | 81272 |
| stock-panel | 1448x1086 | 1277918 | 111788 |
| step-payment | 1122x1402 | 1217499 | 97206 |
| feature-balances | 1448x1086 | 1204007 | 81924 |
| feature-reports | 1122x1402 | 1217265 | 92690 |

* Total: 7422312 bytes PNG frente a 583540 bytes WebP, aproximadamente 92,1
  por ciento menos. Hash SHA256 de cada original antes y despues: identico.
  hero fe15ba56d8b3c1b750e94ff579f8fc65493e5ade6f7dd817526903daa84beed2;
  venta 72840c8d8165781bbb6968a05befeacb5af91d5962cb0ba4508bc34cc5fcc1aa;
  stock b138f0dfaca6472770b9d79139885c8273e58529acaf674fa20970dbb5d66910;
  pago 2c529a82f7a5a241e7463ca03c8069e6d8e317986e0f13d9144ca111da334d53;
  saldos fcfdd15c91e7b7bd7894d6ba772fedd6a204c4b4fc03cf019956930fac8719f2;
  reporte 9c31c0a4592e3a8e50946555dc20abdf6e502cf53f46676d07e7d2adbfffebb0.
* Se conservan ambientales hero-workshop-mechanic-v2.webp (1280x960,
  91990 bytes), faq-workshop.webp (960x640, 88068) y cta-tire.webp
  (640x960 RGBA, 67760), sin reconvertir ni aplanar el alfa. Total actual:
  nueve archivos unicos, 831358 bytes; stock-panel se monta dos veces con
  una sola URL. Los archivos y recortes anteriores quedan sin importar.

### Composicion y espacios

* Portada mantiene foto de mecanico detras y aproximadamente 40/60 desde lg.
  El nuevo panel de Inicio sustituye el recorte reducido, con sombra discreta
  y sin borde adicional. Se retira figcaption que lo llamaba captura real.
  Foto, rueda, controles de acceso y marca compartida permanecen.
* Tres pasos: imagen inmediata tras titulo y texto, sin wrapper flex-1,
  centrado vertical ni tarjeta con altura impuesta. Rejilla con items-start,
  tres columnas desde 1024 y apilada debajo. No se igualan alturas ni se
  dibujan marcos adicionales alrededor de las tarjetas que ya tiene el bitmap.
  Pago ocupa 100% del ancho debajo de lg y 72% desde lg, centrado y con
  altura automatica; su proporcion vertical no estira los dos primeros pasos.
  Flechas horizontales desde lg y verticales debajo, fuera de las acciones.
* Funciones mantiene 60/40 con items-start y una columna derecha independiente
  para saldos y utilidad. Inventario deja de usar row-span y relleno de tarjeta;
  su altura sale de imagen y texto. Stock y cuentas tienen h3 accesibles,
  visualmente ocultos para evitar duplicar los titulos ya dibujados.
* Reportes usa feature-reports v2, sin pie ni rotulo visible de referencia.
  Figura sin fondo, borde ni relleno adicional, imagen unica de ancho maximo
  560 px. Alt breve y descripcion HTML accesible con seis conceptos y
  formatos PDF/Excel mediante aria-describedby. No se cambian Reportes real
  ni contratos de exportacion. Los controles dibujados no son acciones HTML.
* FAQ y cierre conservan mascaras, imagenes y tipografia; su contenedor adopta
  el ancho fluido. Acordeon, foco, aclaracion DIAN, marca, favicon, sesion,
  enlaces publicos y legales permanecen. Contactos no configurados omitidos.

### Pruebas y limites de esta iteracion

* Ejecucion parcial: 406 correctas en cinco archivos de LandingPage,
  RequireAuth, designSystem, copy y tokens. Ultima suite completa ejecutada:
  1376; no se repite ni se confunde con este parcial. Total esperado de la
  rama sigue en 1380, no comprobado mediante suite completa en esta iteracion.
* Cero pruebas nuevas o retiradas. Cinco casos existentes ajustados:
  portada y dimensiones; tres pasos y dimensiones; funciones con stock
  reutilizado y descripcion accesible; ausencia de rotulos y de acciones
  para controles dibujados; validacion de nueve WebP con peso individual
  inferior a 180 KB. Se retiran expectativas obsoletas sobre capturas reales
  y pies ilustrativos. Los casos de comportamiento no copian clases CSS ni alturas.
* La primera ejecucion detecto que la comprobacion de alt incluia Wordmark,
  que expone role img en un span sin atributo alt; se ajusto la expectativa
  al nombre accesible. La segunda ejecucion tuvo 406 correctas, cero fallos.
* Build, lint y git diff check de esta iteracion correctos. El build incluye
  seis WebP de producto y tres ambientales; stock-panel se emite una sola vez.
* Inventario, ancho y escala actualizados tambien en arquitectura,
  convenciones, decisiones y sistema de diseno. Sin cambios de logica,
  datos financieros, backend, AGENTS ni pantallas privadas.
* Sin navegador, auditoria visual, nuevas capturas ni generacion de imagenes.
  No se comprobaron medidas renderizadas, fidelidad visual ni ausencia de
  desbordes. David debe revisar ancho general, lectura de pasos, equilibrio
  del panel vertical y relacion entre fotografia y producto en portada,
  ademas de FAQ, cierre y teclado en escritorio y movil.
* No se consulto API ni se verificaron exportaciones. Las cifras de las
  representaciones no se anuncian como metricas del negocio ni resultados
  reales. El total de saldos puede diferir un peso de la suma de cifras
  redondeadas mostradas, como documenta el manifiesto; no se retocan importes.
* Sin commit, push ni PR, sin procesos propios de navegador, Vite o backend,
  sin detener procesos ajenos ni tocar temporales bloqueados.
* Pendiente de aprobacion visual de David.

## Base y alcance

* Tarea 7 de 11, rama feat/39-landing-refresh, libre local y remotamente.
  Arbol inicial limpio; fetch confirmo main y origin/main en e1a2c99,
  merge del PR frontend 40. Sin commit, push ni PR en esta entrega.
* Orden vigente: 7 Landing, 8 Login, 9 Registro, 10 Reportes,
  11 Configuracion; despues integracion y entrega del MVP. Reemplaza el
  orden de las notas historicas que situaba Reportes tras color de cuentas.
* Se leyeron AGENTS, contexto, historial, rutas publicas, marca, recursos,
  landing y pruebas; tambien las sesiones de Cuentas y color de cuentas.
  Sin modificaciones en AGENTS, backend, .idea ni pantallas fuera de alcance.

## Recursos inspeccionados y pendientes

* Referencias inspeccionadas antes de implementar:
  C:/Users/PC/Documents/Codex/2026-10-25/files-pasted-by-the-user-vale/outputs/servibox-redesign/landing.png
  y logo-reference.png de la misma carpeta. Solo orientan composicion y marca;
  no se usan como capturas reales, contenido financiero ni recursos de producto.
* Marca reutilizada: Wordmark, WordmarkLink, BrandSymbol y symbol.svg.
  Favicon compartido y titulo de pestana conservados. Sin imagenes nuevas,
  dependencias, fuentes, colores ni recursos descargados.
* Inspeccionadas las cuatro imagenes historicas de src/assets/landing:
  hero-inicio.webp (59108 bytes), flujo-venta.webp (45954),
  flujo-inventario.webp (64464), flujo-reportes.webp (40078).
  Inicio conserva KPI, periodo y tabla anteriores; Productos muestra pestanas
  y filtros anteriores; Venta muestra formulario, terminologia y resumen
  anteriores; Reportes muestra selector de fechas y presentacion anteriores
  al PeriodPicker actual. No representan la interfaz vigente y no se montan.
  Se conservan intactas en disco.
* David debe aportar cuatro capturas reales actuales con datos de demostracion:
  Inicio (/inicio), Nueva factura de venta (/ventas/nueva) con productos
  cargados antes de guardar, Productos (/inventario) con sus alertas y
  Estado de resultados (/reportes), esta ultima despues de la tarea 10.
  Preferible contenido legible de escritorio, sin datos personales ni
  notificaciones, indicando ancho y alto para exportarlas a WebP con
  dimensiones explicitas. No se solicitan importes concretos ni se alteran.
* El espacio de producto en portada muestra la marca y las tres areas como
  contenido editorial HTML; no es una captura, tabla, formulario ni pantalla
  simulada. Funciones y Reportes se explican con texto real sin cifras.
  La sustitucion por capturas depende de su entrega y revision de David.
* contact.ts solo tiene WhatsApp y correo demostrativos: omitidos en landing,
  junto con la pregunta de precios que remitia a ellos. Pendiente que David
  confirme numero y correo reales. No se cambiaron contact.ts, Terminos,
  Login, Registro ni mensajes compartidos, que conservan su pendiente previo.
* No se reutilizan las fotos de llantas incrustadas en la propuesta como
  recursos independientes. No hay una fotografia de taller valida disponible.

## Cambios y archivos

* src/pages/LandingPage.tsx: navegacion con anclas existentes, portada clara,
  espacio editorial de producto, flujo de venta, beneficios, reportes oscuros,
  FAQ nativas, cierre rojo y footer oscuro. Se conservan empresa piloto,
  separacion de datos por serviteca, acceso desde navegador, credito y abonos,
  exportaciones PDF/Excel y aclaracion explicita de no emitir facturas DIAN.
* No se anuncian servicios sin stock: el formulario actual vende productos.
  Cobros a credito entran en cuenta al registrar abonos; ventas sin IVA y
  costo de lo vendido determinan utilidad bruta. Compras no se presenta como
  fila del estado de resultados. Sin contratos ni calculos modificados.
* Acciones sin sesion a /login y /registro; con sesion, las cuatro acciones
  de acceso van a /inicio, tambien el footer. Terminos conserva /terminos.
  Anclas a #como-funciona, #funciones y #preguntas; sin controles decorativos.
* Navegacion siempre visible que envuelve en movil, sin menu desplegable.
  Rejillas adaptables, sin alturas rigidas de contenido, h1 unico, jerarquia,
  SkipLink y foco. FAQ con details/summary sin JavaScript adicional.
  El cierre usa boton secundario claro como unica accion y foco inverso.
  Desplazamiento suave existente respeta prefers-reduced-motion.
* src/pages/LandingPage.test.tsx: pruebas de contenido, rutas, anclas,
  sesion, FAQ, capturas antiguas omitidas y contactos ficticios ausentes.
* src/auth/RequireAuth.test.tsx: adapta solo el titular esperado al comprobar
  que la raiz publica con sesion conserva la landing, sin cambiar el guard.
* src/styles/tokens.test.ts: contraste inverso sobre nav y foco inverso
  sobre action, sin cambiar valores de tokens.
* docs/ai-context/01-ARCHITECTURE.md: estructura real de landing.
* docs/ai-context/02-CONVENTIONS.md: capturas vigentes, contactos omitidos
  y accion clara del cierre.
* docs/ai-context/03-DECISIONS.md: decision nueva y orden actualizado,
  con composicion anterior marcada como reemplazada.
* docs/ai-context/05-DESIGN-SYSTEM.md: composicion con tokens existentes.
* Nueva nota: docs/ai-context/sessions/2026-10-27-landing-refresh.md.

## Verificacion

* Base real de main ejecutada antes de modificar codigo: 1371 pruebas
  correctas en 65 archivos. Primer bloque afectado correcto: 394 pruebas
  en cuatro archivos de landing, copy, diseno y contraste.
* Casos nuevos: tres de comportamiento en LandingPage (anclas y destinos
  validos sin afirmaciones o contactos falsos; navegar al login; navegar
  al registro), una guarda del favicon compartido y dos pares de contraste.
  Se retira una prueba de peso/existencia de capturas que ya no se montan.
  Balance: 1371 base + 6 nuevas menos 1 retirada = 1376 esperadas.
* Ocho casos existentes de LandingPage ajustados: titular y metadatos;
  jerarquia y nombre de secciones; portada editorial; flujo y cobro a
  credito; funciones y empresa piloto; FAQ (abrir y cerrar las cinco);
  cierre/footer sin contactos ficticios; sesion en todas las acciones.
  Se retiran expectativas de clases CSS de los dos primeros casos.
  Pruebas de Terminos, metadatos publicos y mapa de contactos conservadas.
* Un noveno caso existente ajustado en RequireAuth: la primera suite final
  detecto que aun esperaba el titular anterior (1375 correctas y ese fallo).
  Se actualiza solo el selector del encabezado, conservando la expectativa
  de ruta raiz con sesion y el comportamiento de autenticacion.
* Suite completa final: 1376 correctas en 65 archivos, cero fallos.
  Coincide con el balance esperado. Build, lint y git diff check correctos;
  la compilacion final incluye el texto definitivo y el foco inverso.
* Sin navegador, capturas nuevas, auditoria visual automatizada, backend,
  API real ni exportaciones reales. No se afirma fidelidad comprobada ni
  ausencia de desbordes. No hay verificacion numerica de pantallas porque
  la landing no presenta importes ni datos operativos.
* No se arrancaron Vite, backend ni Edge, ni se detuvieron procesos ajenos.
  No se crearon temporales de tarea ni se intentaron limpiar los bloqueados.

## Revision manual de David

* Arranque: npm run dev. Revisar http://localhost:5173/ (o el puerto que
  indique Vite), /login, /registro y /terminos mediante los enlaces.
* Logo y favicon; portada frente a referencia; coherencia con la app;
  espacio editorial y futuras capturas actuales; contenido real; anclas,
  login, registro y acceso con sesion; FAQ y footer.
* Escritorio y movil; navegacion y FAQ con Tab, Enter y Espacio;
  foco sobre el cierre rojo y enlace Saltar al contenido; contenido largo.
* Pendiente de aprobacion visual de David.

## Iteracion con composicion, capturas actuales y reporte ilustrativo

Esta entrada describe el estado vigente y reemplaza los pendientes de
capturas y las composiciones provisionales de las entradas posteriores
de esta nota. El historial se conserva; ninguna imagen ambiental queda
visualmente aprobada por el hecho de incorporarla.

### Autorizacion y lectura

* David autoriza tipografia protagonista exclusiva de Landing y la vista
  ilustrativa de Reportes basada en seis filas y formatos existentes.
  Se conserva feat/39-landing-refresh y los cambios anteriores.
* Leidos AGENTS, diagnostico de la conversacion, nota de sesion, codigo,
  sistema de diseno y resource-manifest.txt externo. Inspeccionados referencia,
  mecanico v2, FAQ, rueda, dos capturas fuente y reporte ilustrativo antes
  de integrar. Tambien se inspeccionaron los seis recortes resultantes.
* El hero seleccionado es hero-workshop-mechanic-v2.png. No se usa la foto
  anterior ni la variante sin personas. FAQ y rueda se reutilizan como
  candidatos sujetos a la revision visual de David.

### Inventario vigente de recursos

Origen comun externo:
C:/Users/PC/Documents/Codex/2026-10-25/files-pasted-by-the-user-vale/outputs/servibox-redesign/landing-assets/.
Salidas locales en src/assets/landing/. Coordenadas x,y,ancho,alto sobre los
PNG fuente; sin navegador ni barra de tareas en los derivados.

| WebP integrado | Fuente y tipo | Recorte fuente o reduccion | Dimensiones finales | Bytes |
|-|-|-|-|-|
| hero-workshop-mechanic-v2.webp | PNG homonimo, ambiental generado | Completo, Lanczos desde 1448x1086 | 1280x960 RGB | 91990 |
| faq-workshop.webp | PNG homonimo, ambiental generado | Completo, reduccion previa conservada | 960x640 RGB | 88068 |
| cta-tire.webp | PNG homonimo, ambiental generado | Completo, reduccion previa con alfa | 640x960 RGBA | 67760 |
| hero-dashboard.webp | source-dashboard-current.png, captura real 1920x1080 | 0,81,1904,790 | 1904x790 RGB | 100504 |
| step-sale.webp | source-sale-current.png, captura real 1920x1080 | 527,671,1032,255 | 1032x255 RGB | 21052 |
| step-stock.webp | source-dashboard-current.png | 410,540,766,283 | 766x283 RGB | 33890 |
| step-payment.webp | source-sale-current.png | 1319,160,240,314 | 240x314 RGB | 11436 |
| feature-stock.webp | source-dashboard-current.png | 385,439,816,408 | 816x408 RGB | 39106 |
| feature-balances.webp | source-dashboard-current.png | 1225,439,535,408 | 535x408 RGB | 18152 |
| feature-reports.webp | report-preview-illustration.png, ilustracion autorizada | Completa, Lanczos desde 1145x1374 | 900x1080 RGB | 57402 |

* Total de diez imagenes integradas: 529360 bytes. Conversion real con Pillow
  ya disponible, WebP method 6; calidad 86 para mecanico, 94 para Inicio,
  96 para recortes de producto y 92 para reporte. FAQ y rueda conservan
  las conversiones anteriores. No se instalan dependencias ni se amplian fuentes.
* Dos ajustes al manifiesto: Inicio termina antes de Ultimas ventas, cuya
  fila inferior aparecia incompleta en la fuente; el recorte de productos
  de venta comienza en el borde real del panel, para no cortar la primera
  letra de Productos y conservar el ancho completo. Los otros limites
  sugeridos muestran paneles completos y se mantienen.
* Se conservan los seis PNG externos y el manifiesto. SHA256 de originales
  antes y despues de preparar recursos: sin diferencias. Fuentes nuevas:
  mecanico 58d44ab41b8c7e9477c30ba2581c148d90a5568f80b152b3d58558795e5a78a4;
  Inicio 4efddd25291098202bacca606858104e07cb5fa6ff58860314fb8dc708e28c36;
  venta 5a15b2e9a976ec1afb15ba69ec4028a234e8eba77c87fa60a132bde5c3d94005;
  reporte 2831231b0b3ad53ac5867563174b4450638dcdce4befa4eda372058c692fb287.
* Alfa de rueda contrastado nuevamente contra el PNG redimensionado:
  diferencia pixel a pixel 0. Se reabren los WebP y se comprueban formato,
  dimensiones y canales. No se reconstruyen controles ni se retocan importes.
* Los cuatro WebP historicos y hero-workshop.webp anterior permanecen en
  disco conservando los cambios previos; no se importan en la landing.

### Cambios por seccion

* Portada: rejilla 40/60 desde lg; foto del mecanico detras de Inicio,
  integrada con mascaras CSS a la superficie clara. Captura delante con
  borde, radio surface, sombra raised discreta y leyenda HTML de captura
  real con datos de demostracion. Acento border-accent tenue detras de
  la captura. No se fabrica un toast de venta registrada.
* Escala: LandingPage.css nuevo, todos los selectores bajo #landing;
  H1 36/40 y 56/60 desde lg, titulos principales 28/32 y 36/40,
  titulos de funciones 20/28 y 24/32. Usa Montserrat y pesos existentes.
  No se cambian tokens globales, fuentes ni pantallas privadas.
* Tres pasos: numero y texto breve, productos reales de Nueva venta,
  tabla real de stock de Inicio y Resumen real de venta. Flechas con
  Lucide, horizontales desde md y verticales debajo. No se simula Ingreso
  en caja. Credito y abonos conservan su aclaracion en HTML y FAQ.
* Funciones: rejilla 60/40 desde lg, stock grande a la izquierda y
  saldos/utilidad a la derecha. Paneles reales en lugar de la lista de
  estados; se conserva explicacion precisa de utilidad bruta y neta.
* Reportes: enfasis rojo grande sobre nav, beneficios e iconos a la
  izquierda y la imagen ilustrativa a la derecha. Rotulo Vista ilustrativa
  visible en el bitmap y en figcaption HTML; alt describe las seis filas
  y PDF/Excel. No se presenta como captura real. Las etiquetas de modulos
  son listas informativas, sin roles de pestana ni controles sin accion.
* FAQ: imagen sin tarjeta ni radio propio, integrada con mascara superior
  y lateral. Conserva details/summary, foco y aclaracion DIAN.
* Cierre: titular con nueva escala, CTA claro agrupado y rueda alfa a la
  derecha; conserva el flujo movil para la rueda y los contactos omitidos.
  Footer mantiene marca compartida, rutas y terminos existentes.
* Las capturas tienen alt descriptivo y dimensiones intrinsecas. Imagenes
  inferiores con lazy/async; Inicio tiene prioridad alta. Resumen se limita
  a 240 px de ancho, stock a 816 y saldos a 532, por debajo de sus 535
  naturales. La compresion y el layout no inventan detalle de imagen.

### Verificacion, cambios de pruebas y limites

* Ejecucion parcial: 406 pruebas correctas en cinco archivos (LandingPage,
  RequireAuth, designSystem, copy y tokens). Ultima suite completa ejecutada
  sigue siendo 1376; no se presenta el parcial como una nueva suite completa.
* Frente a la ampliacion ambiental anterior: una nueva prueba de comportamiento
  comprueba el rotulo ilustrativo y que los modulos no simulen pestanas,
  botones o enlaces; una guarda automatica nueva por LandingPage.css.
  Sin bajas adicionales. Total esperado actual 1380, no ejecutado completo:
  1371 de main + 10 nuevas menos una retirada durante toda la tarea.
* Ajustados cinco casos existentes de LandingPage: portada comprueba mecanico
  y captura real por separado; recursos ambientales usan su fuente concreta;
  flujo comprueba tres recortes y dimensiones; funciones comprueba paneles
  reales y contenido accesible del reporte; WebP valida los diez recursos
  integrados y su peso individual inferior a 180 KB. No hay nuevas
  expectativas que copien clases CSS o frases decorativas.
* designSystem permite raised en LandingPage exclusivamente para la captura
  flotante de Inicio, conforme a la autorizacion de esta iteracion. La guarda
  de fuentes, copy, tokens globales y resto de reglas permanece activa.
* Build, lint y git diff check de esta iteracion correctos. Tras la
  interrupcion del servidor se comprobo el estado conservado y se repitieron
  las 406 pruebas afectadas y lint, sin nuevos cambios de codigo ni fallos.
  La compilacion anterior a la interrupcion ya contenia el codigo definitivo.
* Inspeccion de recursos, sin browser: stock conserva cantidades 0,1,2,6,9;
  Resumen conserva subtotal 488571, IVA 92828, total 581399 y Caja General;
  saldos conservan 16963933, 4406852, 6807530 y total 28178316, tal como
  aparecen en la captura fuente. La suma de importes mostrados por cuenta
  es 28178315, un peso menos que el total capturado; se preserva esa
  diferencia de origen sin corregir cifras ni atribuirle causa sin API.
* No hay consultas a backend, comprobacion de API, exportaciones reales,
  navegador ni auditoria visual automatizada. No se declara fidelidad visual
  ni ausencia de desbordes. Se verifica codigo y recursos, no una pagina renderizada.
* Limitacion precisa: el recorte de productos es ancho y bajo (1032x255)
  y el Resumen fuente tiene solo 240 px de ancho; se muestran sin deformar
  ni ampliar detalle. David debe valorar su lectura y protagonismo en movil;
  si necesita mas detalle, debe aportar una captura real de esos paneles
  a mayor escala, sin regenerarlos ni reconstruir sus controles.
* Pendientes concretos: revision visual de mecanico/mano/rueda y sus mascaras,
  proporciones de captura y tipografia, lectura de recortes, reporte rotulado,
  FAQ, cierre, teclado y movil. Contactos reales siguen sin configurar.
  Una captura real de Reportes podra reemplazar la ilustracion despues de
  la tarea 10, pero no bloquea esta variante autorizada.
* Sin commit, push ni PR; no se toca backend, AGENTS, procesos ajenos ni
  temporales bloqueados. No se arrancaron Vite, backend ni navegador.
* Pendiente de aprobacion visual de David.

## Correccion solicitada por David: inventario grafico

### Estado y contraste con la referencia

* Se conserva feat/39-landing-refresh y todo el trabajo anterior. David
  detecto que la ausencia de imagenes impide satisfacer la propuesta.
  La superficie editorial no resuelve ese requisito y no se considera
  composicion aprobada. Esta seccion reemplaza cualquier lectura anterior
  que la presente como solucion suficiente mientras llegan las capturas.
* Se volvio a inspeccionar landing.png: 732x2148 px, RGB. El repositorio
  solo ofrece las cuatro WebP historicas de 1200x836 y el simbolo SVG.
  No hay fotos independientes de taller, llantas ni mecanico.
* Portada: falta la foto de rueda/manos en el extremo superior derecho,
  detras de la captura de Inicio, que debe dominar la mitad derecha.
  El panel con marca e iconos actual no recupera esa superposicion.
* Flujo: faltan las tres vistas reales compactas bajo los pasos; los
  iconos actuales no sustituyen esas imagenes. Los pasos y sus textos
  siguen siendo HTML, con espacio y flechas implementables en CSS/iconos.
* Beneficios: falta el recorte de stock en el bloque grande izquierdo
  y el de saldos en el superior derecho. Utilidad es texto e icono,
  no una imagen que deba generarse.
* Reportes: el resumen de texto actual no sustituye la captura real que
  ocupa la derecha de la franja oscura en la propuesta.
* FAQ: falta la foto de llantas apiladas, taller y herramientas bajo el
  texto izquierdo. Cierre: falta la rueda grande cortada por el borde
  derecho del panel rojo. Son fotografias, no tarjetas ni iconos.
* No se extraen recortes ambientales de la referencia: la foto de portada
  esta cubierta por interfaz y solo deja una banda superior util; la de
  FAQ deja aproximadamente 300x160 px limpios y el neumatico final ocupa
  aproximadamente 140x180 px, con fondo rojo incrustado. Son estimaciones
  sobre la imagen fuente, no mediciones de la pagina. No bastan para las
  dimensiones recomendadas sin ampliar o arrastrar contenido incrustado.

### Fotografias o ilustraciones pendientes, preparacion desde el chat

Rutas relativas al repo. Dimensiones en pixeles de origen, aproximadamente
el doble del espacio previsto en escritorio; no son alturas CSS rigidas.
Las tres imagenes deben seguir el mismo tratamiento fotografico de la
referencia, sin textos, logotipos, interfaz ni controles incrustados.

| Recurso y proposito | Contenido de la referencia y composicion requerida | Proporcion y dimensiones recomendadas | Origen pendiente | Ruta propuesta |
|-|-|-|-|-|
| Portada, identidad de serviteca | Primer plano de llanta con rin y manos enguantadas trabajando; fondo de taller, a la derecha y detras de Inicio; el lado izquierdo debe permitir fundir hacia la superficie clara sin tapar el titular | 4:3, 1600x1200; encuadre util tambien en recorte horizontal | Preparar imagen desde el chat, sin cambiar la direccion fotografica aprobada | src/assets/landing/hero-workshop.webp |
| FAQ, contexto del negocio | Llantas apiladas en primer plano a la izquierda; taller y herramientas rojas desenfocados al fondo; situar debajo del texto izquierdo, sin ocupar las preguntas de la derecha | 3:2, 1200x800; dejar aire superior y derecho para fundido con CSS | Preparar imagen desde el chat | src/assets/landing/faq-workshop.webp |
| Cierre, foco visual final | Rueda con rin en tres cuartos, vertical y grande; entra desde el extremo derecho, recortada por el panel rojo, sin invadir titulo ni CTA | 2:3, 640x960; fondo transparente, rueda completa con margen para ajustar el recorte en CSS | Preparar recorte fotografico desde el chat, con transparencia real | src/assets/landing/cta-tire.webp |

### Capturas reales pendientes, aportadas por David

Las interfaces dibujadas en landing.png no son capturas verificadas y no
pueden extraerse como producto real. Estas filas pertenecen a la categoria
captura real requerida para su reemplazo. No se generaran pantallas ni se
reescribiran importes, filas o controles dentro de ellas.

Solicitar solo las cuatro pantallas ya acordadas: Inicio, Nueva venta,
Productos y Reportes. Para los recortes derivados se usa contenido realmente
visible en esas fuentes; si un panel no cabe, David debe aportar esa misma
pantalla con el panel completo visible. No fabricar un formulario de caja.
Se conserva la proporcion natural si la captura recibida difiere de la guia.

| Seccion y proposito | Que representa la propuesta y que usar realmente | Proporcion y dimensiones recomendadas del recurso final | Fuente de David | Ruta propuesta |
|-|-|-|-|-|
| Portada, mostrar el producto | Inicio con navegacion lateral, indicadores, stock y saldos; captura protagonista, delante de la foto, aproximadamente tres quintos del ancho de la portada | 8:5, 1600x1000, o proporcion natural de la captura completa | /inicio actual con datos de demostracion | src/assets/landing/hero-dashboard.webp |
| Flujo 1, registrar venta | Lista compacta de productos de venta; recorte real del bloque de productos de Nueva factura, debajo del primer paso | 4:3, 800x600; ajustar a los limites naturales del panel sin inventar filas | /ventas/nueva con productos cargados antes de guardar | src/assets/landing/step-sale.webp |
| Flujo 2, inventario | Lista compacta de stock; recorte real de Productos debajo del segundo paso, sin agregar descuentos rojos ni cantidades de la propuesta | 4:3, 800x600, segun contenido real legible | /inventario actual | src/assets/landing/step-stock.webp |
| Flujo 3, pago en caja | La propuesta dibuja un formulario de ingreso y confirmacion; reemplazar por el bloque real de cuenta, medio de pago y resumen de una venta al contado, sin crear esa pantalla o mensaje | 4:3, 800x600, o recorte natural que incluya las etiquetas completas | /ventas/nueva actual, misma fuente del paso 1 | src/assets/landing/step-payment.webp |
| Beneficio de inventario | Tabla de productos y alertas en la tarjeta grande izquierda; recorte real con cabecera y contexto suficiente | 8:5, 1200x750, o proporcion natural del panel | /inventario actual | src/assets/landing/feature-stock.webp |
| Beneficio de cuentas | Saldos por cuenta y total en la tarjeta superior derecha; recortar el bloque real Saldos de cuentas de Inicio, sin redibujar importes | 4:3, 800x600, o proporcion natural del panel | /inicio actual, sin pedir una quinta pantalla | src/assets/landing/feature-balances.webp |
| Franja de reportes | Estado de resultados a la derecha, con filas y exportacion solo si existen en el recorte real; no reproducir los botones de descarga dibujados en la propuesta | 4:5, 960x1200, si el panel real admite ese encuadre; de lo contrario conservar su proporcion natural | /reportes con Estado de resultados, renovar tras tarea 10 | src/assets/landing/feature-reports.webp |

### Elementos que deben seguir en HTML/CSS e iconos existentes

| Elemento de la referencia | Clasificacion y tratamiento |
|-|-|
| Marca del header y footer, simbolo y favicon | Recurso de marca existente: WordmarkLink, Wordmark, BrandSymbol y symbol.svg; no generar otro logo |
| Navegacion, titulares, textos, CTA y enlaces | HTML accesible; conservar destinos existentes, sin incrustarlos en fotos |
| Numero de cada paso, flechas y divisores | HTML/CSS e iconos Lucide existentes, sin convertirlos en imagen |
| Tabla y controles dentro de una captura real | Parte de la captura aportada por David; no reconstruir una supuesta captura con HTML ni presentar controles de esa imagen como operables |
| Iconos de producto diminutos dentro de las vistas dibujadas | Parte de la UI ficticia de referencia; no generar miniaturas de llantas o botellas para agregarlas a capturas reales que no las tienen |
| Bloque de utilidad, icono de grafico y lista de beneficios | Texto e iconos existentes; no requiere fotografia |
| Etiquetas Ventas, Inventario, Cuentas y Reportes en franja oscura | HTML con iconos, solo enlaces si tienen un destino real coherente; no simular pestanas interactivas sin contenido |
| FAQ, signos de expansion y cierre | details/summary e icono existente; controles nativos y texto HTML |
| Fondos claros, franja oscura, cierre rojo, radios y fundidos de fotos | CSS con tokens existentes; no usar la pagina completa como fondo ni generar decoracion alternativa |
| Aviso flotante Venta registrada de la propuesta | Mensaje representativo de interfaz, no una foto; no mostrar exito real sin una venta. Omitir salvo que forme parte de una captura real coherente y claramente rotulada como demostracion |
| WhatsApp, contacto y terminos | HTML; contactos demostrativos siguen omitidos. Terminos enlaza a /terminos existente |

### Incorporados, pendientes y verificacion de la correccion

* Incorporados antes de esta correccion: marca y simbolo compartidos,
  favicon, iconos y elementos HTML existentes. Imagenes raster nuevas
  incorporadas en esta correccion: ninguna, porque no hay originales aptos.
* Pendientes: tres imagenes ambientales y cuatro capturas fuente reales,
  de las que se derivaran los siete recursos de producto descritos arriba.
  Las dimensiones propuestas son una guia de preparacion, no prueba de
  fidelidad visual ni autorizacion para inventar contenido de aplicacion.
* Sin cambios de codigo, pruebas, dependencias ni assets en esta correccion.
  Se actualizan esta nota, 03-DECISIONS y 05-DESIGN-SYSTEM para dejar claro
  que falta recuperar la composicion con imagenes. No se repiten pruebas,
  build o lint por cambios solo documentales; los ultimos resultados siguen
  siendo 1376 pruebas correctas, build y lint correctos de la entrega previa.
* Se comprueba el diff de espacios. Sin navegador, nuevas capturas,
  generacion, descargas, commit, push ni PR. No se detienen procesos ajenos.
* Pendiente de recursos e integracion grafica; despues, aprobacion visual
  de David. No se declara esta correccion visual completada.

## Integracion de recursos ambientales aportados por David

### Origen y conversion

* David aporto hero-workshop.png, faq-workshop.png y cta-tire.png en
  C:/Users/PC/Documents/Codex/2026-10-25/files-pasted-by-the-user-vale/outputs/servibox-redesign/landing-assets/.
  Se inspeccionaron antes de integrar, junto con generation-notes.txt.
  Son imagenes ambientales generadas, no fotos de clientes, instalaciones
  reales de la empresa piloto ni capturas de la aplicacion.
* Se reemplaza el estado pendiente de las tres imagenes ambientales de la
  seccion anterior. El inventario de capturas de producto sigue pendiente.
* Conversion real con Pillow ya disponible, sin dependencias nuevas:
  reduccion Lanczos, WebP calidad 82, method 6. No se cambia solamente la
  extension. Se incorporan unicamente las versiones optimizadas al repo;
  los PNG originales externos se conservan sin cambios.

| Recurso incorporado en src/assets/landing/ | PNG original | WebP final | Bytes PNG | Bytes WebP |
|-|-|-|-|-|
| hero-workshop.webp | 1448x1086 RGB | 1280x960 RGB | 2291818 | 110404 |
| faq-workshop.webp | 1536x1024 RGB | 960x640 RGB | 2496104 | 88068 |
| cta-tire.webp | 1024x1536 RGBA | 640x960 RGBA | 2045416 | 67760 |

* Total: 6833338 bytes originales frente a 266232 bytes integrados,
  aproximadamente 96,1 por ciento menos. Ningun recurso se amplia.
* Se reabrieron y decodificaron los tres WebP: formato y dimensiones
  coinciden. Se comparo pixel a pixel el alfa de la rueda WebP con el PNG
  redimensionado: diferencia minima y maxima 0, cero perdidas en ese canal.
  WebP conserva RGBA, extremos de alfa 0 y 255 y 246047 pixeles plenamente
  transparentes. No se aplana sobre rojo, blanco ni negro.
* SHA256 externo antes y despues de cada conversion, sin diferencias:
  hero 4e341a3181b984859f3a0d675c3c63d1e9795936c37770235680e2d082a41ced;
  FAQ 5553f27068eb327536d973e5ff87780e1f3679def4bce2f296593b31939ad15b;
  rueda 0a91d48078127e015a84f3813741083db4b7d153624f8bdaef402eaa8a7b3dd4.

### Composicion y alcance

* LandingPage importa los tres WebP. Hero: foto a la derecha, siete de
  doce columnas desde lg, conservando 4:3 y reemplazando el panel de marca
  e iconos que David rechazo como sustituto grafico. No se presenta esta
  imagen ambiental como captura de Inicio; superponer el producto real
  sigue pendiente de la captura de David.
* FAQ: foto de llantas y taller bajo el texto izquierdo, proporcion 3:2,
  con las preguntas en la columna derecha desde lg. En movil se apilan.
* Cierre: rueda transparente en el cuarto derecho desde lg, con recorte
  dentro de la superficie roja; titulo y CTA tienen columnas propias.
  Bajo lg la rueda va despues de la accion y alineada a la derecha, en
  flujo normal para no cubrir texto ni boton. El contenedor no fija la
  altura del contenido. No hay texto ni acciones incrustados en imagenes.
* Las tres imagenes son decorativas con alt vacio. Todas declaran ancho
  y alto reales; portada usa fetchPriority high, FAQ y cierre loading lazy
  y decoding async. No cambian marca, favicon, rutas, sesion, copy comercial
  ni componentes compartidos. Sin fondos de pagina hechos desde la referencia.
* Se actualizan 01-ARCHITECTURE, 02-CONVENTIONS, 03-DECISIONS y
  05-DESIGN-SYSTEM para distinguir imagenes ambientales incorporadas de
  capturas reales pendientes y retirar el estado del panel editorial.

### Verificacion y pendientes

* Pruebas afectadas: 404 correctas en cinco archivos (LandingPage,
  RequireAuth, designSystem, copy y tokens). Dos nuevas: imagenes
  decorativas con dimensiones, carga y acciones HTML conservadas; archivos
  con cabeceras RIFF/WEBP reales y peso individual inferior a 180 KB.
* Dos casos existentes de LandingPage ajustados: portada deja de esperar
  el panel editorial y comprueba la imagen ambiental; navegacion conserva
  la prohibicion de capturas historicas sin prohibir los nuevos recursos.
  No hay bajas adicionales. No se cambia ningun caso de negocio.
* Ultima suite completa anterior: 1376 correctas. No se repite la suite
  completa en esta ampliacion; con las dos nuevas se esperan 1378 casos
  (1371 base + 8 nuevas menos 1 retirada a lo largo de la tarea).
* Build, lint y git diff check de esta integracion correctos. El build
  incluye los tres archivos WebP con sus nombres versionados; la verificacion
  del formato y alfa se realizo sobre los recursos reales del repositorio.
* Siguen pendientes las cuatro capturas actuales de Inicio, Nueva venta,
  Productos y Reportes, los siete recortes indicados en el inventario y
  los contactos reales. No se extraen pantallas ficticias de la propuesta.
* Sin navegador ni capturas nuevas; no se declara fidelidad comprobada,
  ausencia de desbordes ni revision de escritorio o movil del agente.
  David debe comprobar encuadres, proporcion, rueda sobre rojo, lectura,
  foco y acciones en escritorio y movil, ademas de la integracion futura
  de las capturas reales.
* Sin commit, push ni PR, sin procesos propios de Vite, backend o navegador,
  y sin detener procesos ajenos ni tocar temporales bloqueados.
* Pendiente de aprobacion visual de David.
