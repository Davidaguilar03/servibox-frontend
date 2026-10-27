# Sesion 2026-10-26: Compras y pantallas relacionadas

## Referencia y alcance

* Tarea 5 de 11, rama feat/36-purchases-refresh. Referencia autorizada:
  ventas.png; la implementacion aprobada de Ventas prevalece para encabezados,
  indicadores compactos y formato de lectura en pesos enteros.
* Facturas de compra: encabezado en contenido, tres indicadores compactos,
  aclaracion de alcance mensual, filtros y tabla en una superficie. Se mantienen
  busqueda, estado, forma de pago, periodos disponibles, URL y paginacion.
* Nueva compra: regreso al listado junto al menu movil; resumen lateral solo
  desde 2xl y debajo cuando el ancho no alcanza. Datos, lineas y calculos
  conservan sus condiciones y precision.
* Detalle y pagos: regreso visible, descripcion larga envolvente y resumen
  con espacio para importes. Se leen los importes guardados de API.
* Papelera, Proveedores y Gastos: reutilizan encabezado, indicadores y superficie
  compartida con Ventas. Se conservan los modales, estados y acciones.

## Contratos conservados

* Compras del mes viene de reporting mensual; Por pagar suma todas las compras
  pendientes; Pagos del mes cruza movimientos mensuales con compras a credito.
* Facturas nuevas mantienen precio, IVA y total definitivo por linea. La
  comprobacion de fondos usa ese total y permite saldo exactamente suficiente.
  Datos, cuerpos enviados y campos editables conservan centavos; la lectura usa
  el formateador comun HALF_UP a pesos enteros.
* Los pagos usan el saldo y las tolerancias vigentes. Gastos pueden dejar saldo
  negativo. No se alteraron permisos, rutas, consultas ni invalidacion.
* El contrato vigente valida el numero de factura de compra por tenant, aunque
  el prompt describia unicidad por proveedor. No se cambio el dominio.

## Pruebas y limites

* Base al iniciar: 1330 pruebas en main, sin ejecutarla para contar. Se ajustan
  pruebas de navegacion que esperaban breadcrumbs de Compras y expectativas
  del simbolo monetario unido a la cifra; no se cambian expectativas de negocio.
* Se agrega una prueba de alcance mensual e importes largos en el listado.
  La verificacion de API usa respuestas simuladas en pruebas de integracion.
* Suite completa: 1331/1331 (1330 base y una nueva), 64 archivos de prueba,
  sin bajas. Build, lint y git diff --check correctos.
  No se comprobo backend real ni exportaciones; no se abrio navegador.
* Revision tecnica y visual aprobadas por David, incluida la distribucion en
  escritorio y movil y la lectura de importes largos. No se declara auditoria
  de desbordes propia del agente.
