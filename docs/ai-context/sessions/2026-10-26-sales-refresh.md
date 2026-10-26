# 2026-10-26: Acabado de Ventas

Estado: verificacion tecnica automatica completa; revision visual pendiente de David.
Rama feat/35-sales-refresh, sin commit ni push. El arbol inicial estaba limpio;
main, HEAD y origin/main coincidieron en 463f0bd. PR 36 confirmado como mergeado.

## Correccion de importes de lectura

David solicito pesos enteros en toda la app. formatCurrency usa roundInteger
sobre decimal para HALF_UP al peso, conserva el signo y evita cero negativo.
Los mensajes de error que reciben pesos ya formateados del backend vuelven a
pasar por formatCurrency. Todos los importes de lectura encontrados en KPI,
tablas, tarjetas, resumenes, ayudas y detalles ya usaban ese formateador o
formatSignedAmount que lo llama. No se tocaron campos editables ni sus
precargas: el costo heredado 30000,5 sigue en el campo y en el PUT; el
precio unitario 0.01 sigue en el POST; un pago precarga 397938.28 y envia
el valor real. Tampoco cambiaron calculos, datos de API, PDF ni XLSX.

La suite completa paso 1330 de 1330 en 64 archivos: 1328 anteriores mas
dos casos nuevos, mitad HALF_UP negativa y monto ya formateado en mensaje
de error. Se ajustaron expectativas de presentacion en format, errores,
Inicio, Productos, Ventas, detalle de venta, nueva compra, detalle de
compra, Reportes y superficie de indicador. La prueba de purchaseDetail
ajusto solo el texto del limite; las aserciones de calculo, tolerancia y
cuerpos enviados conservan sus centavos. npm run build, npm run lint y
git diff con comprobacion de espacios: correctos.

Ejemplos con API simulada, valor real frente a pantalla: 111111110.19
frente a $ 111.111.110; 123.45 frente a $ 123; -0.1 frente a $ 0 con
tono negativo; 180000.5 frente a $ 180.001; -3500.5 frente a -$ 3.501.
La suma de importes redondeados por separado puede diferir visualmente
del total redondeado; no se ajusto ningun valor para forzar la suma.
David revisara nuevamente los importes. No hubo navegador ni revision
visual del agente.

## Referencias y alcance

Se inspeccionaron ventas.png e inicio.png de la carpeta autorizada. Guiaron la
jerarquia y composicion, sin copiar cifras, controles ni la barra superior de
la maqueta. Prevalece IndicatorCard compact aprobado en Productos. Se leyeron
AGENTS.md, contexto numerado, la ultima nota de Inventario, git log, rutas,
componentes, consultas y pruebas relevantes.

## Cambios por pantalla

* Facturas de venta: sin barra superior. ListHeader lleva el boton movil del
  shell. Tres KPI compactos con iconos y acentos; texto aclara que Ventas y
  Abonos son mensuales y Por cobrar incluye todas las pendientes. FilterBar
  y tabla comparten superficie. PeriodPicker inline deja espacio a Desde y
  Hasta en Personalizado. Tarjetas moviles envuelven nombres e importes largos.
* Nueva factura: regreso visible a Facturas de venta, grupos Cliente y documento
  y Pago y fechas. El resumen pasa debajo antes de comprimir las lineas.
  Seleccion de productos, campos condicionales y calculos siguen iguales.
* Detalle: regreso en contenido aun durante carga y error. Nombres y montos
  largos pueden envolver; el simbolo monetario queda unido al primer digito
  en el resumen. Se conservan importes historicos de API, abonos, anular,
  validacion, errores y descarte.
* Papelera, Clientes y Otros ingresos: ListHeader integra menu movil; filtros
  y tabla comparten superficie. Clientes y Otros ingresos reutilizan
  IndicatorCard compact. Mantienen sus acciones y modales existentes.
* AppShell omite barra solo en /ventas y subrutas. Inicio, Inventario y Compras
  conservan sus contratos previos. ListHeader agrega leading opcional y
  FilterBar agrega composicion sales para el periodo personalizado. Los
  componentes compartidos de Proveedores, Gastos y Papelera de compras usan
  el acabado anterior, salvo envoltura de texto largo compatible.

## Contratos y limites

No se editaron formulas, funciones de filtro, URLs, cuerpos de API,
invalidacion de cache, permisos, reglas de Guardar ni tolerancias monetarias.
Ventas del mes consulta KPIs del primer dia del mes a hoy; Por cobrar suma
pendingBalance de facturas PENDIENTE sin aplicar filtros; Abonos del mes suma
recaudos de ventas a credito del mes. IVA por linea, precio unitario de hasta
dos decimales y documentos historicos mantienen su logica anterior. Los
ejemplos de integracion usan API simulada, no backend real ni exportaciones.
En la prueba del listado, Ventas del mes: esperado y obtenido $ 635.000;
Por cobrar: $ 2.530.000; Abonos del mes: $ 1.200.000. En el caso de
importe largo, Ventas del mes y Por cobrar conservan 111111110.19 en API
y muestran $ 111.111.110 por la correccion posterior. La factura de septiembre no aparece en el listado de
octubre; al pasar a Todas aparece sin alterar los indicadores. Las pruebas
de nueva venta, detalle, abonos y otros ingresos conservan los cuerpos e
importes esperados de la API simulada.
No se abrio navegador ni se hicieron comprobaciones visuales o de desbordes.
David revisara escritorio, movil, teclado, filtros personalizados, importes
largos, modales y el menu.

## Pruebas

npm test completo inicial: 1328 de 1328, 64 archivos, cero fallos u omisiones,
1326 base mas 2 nuevas. La primera pasada encontro un timeout al iniciar
un worker tras aprobar 1318 pruebas; se repitio una sola vez con maxWorkers=2
y paso completa. npm run build y npm run lint: correctos. git diff con
comprobacion de espacios: correcto. Se agregaron dos
casos: importes largos y alcance de KPI al cambiar periodo; acceso movil y
barra de todas las rutas de Ventas frente a Compras. Se ajustaron pruebas
de AppShell, Facturas de venta, Nueva factura, detalle, Papelera y Otros
ingresos para ubicar la navegacion dentro del contenido. El helper de
resumen de detalle normaliza el espacio irrompible entre simbolo y digito,
sin cambiar ninguna cifra esperada. Sin bajas de pruebas de negocio.
