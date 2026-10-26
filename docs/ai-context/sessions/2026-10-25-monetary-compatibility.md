# 2026-10-25: Compatibilidad monetaria

Se puede continuar con la compatibilidad funcional comprobada en dev/H2. No es una
validacion de PostgreSQL de produccion. El 500 H2 documentado no aparecio en esta sesion;
eso no demuestra que la incidencia anterior este resuelta.

## Git y lectura

Rama fix/31-monetary-compatibility. Arbol limpio antes de crearla; fetch completado,
main, HEAD y origin/main iguales a dffdb3d20f3004fb8eb0f83c8a06e8b361fe7e42.
PR frontend 32 MERGED 2026-10-25T20:37:56Z; backend 41 MERGED
2026-10-26T00:23:04Z. Rama ausente local y remota antes de crearla. Sin commit ni push.

Leidos AGENTS.md, contexto numerado, ultima sesion por fecha de modificacion
(account-edit-modal), funciones, pantallas y pruebas monetarias, mapa de errores y
guardas. Backend solo lectura: backend-polish, Moneda, calculo de ventas/compras,
DTO de precios e inicializador/configuracion dev autorizados. La raiz Maven y la nota
estan dentro de servibox-backend/ de la raiz Git del backend. No se modificaron sus
fuentes ni configuracion. Los dos cambios .idea previos del backend quedan intactos.

## Hallazgos previos

* lineAmounts ya redondeaba el IVA de cada linea, pero invoiceTotals y purchaseTotals
  acumulaban IVA crudo. El resumen podia diferir de la suma de sus propias lineas.
* Compra comparaba currentBalance con exactTotal crudo, bloqueando fondos suficientes.
  Pagos y transferencias tambien comparaban importes antes de normalizarlos.
* Precios solo exigian numero positivo; Number podia perder precision significativa.
* formatCurrency redondeaba al peso y ocultaba centavos en toda la app. Dashboard y
  Reportes clasificaban el signo con Math.round, perdiendo negativos pequenos.
* Detalles/listados usan importes guardados; no necesitan recalcular IVA historico.
* Precio sugerido e IVA del costo siguen en pesos enteros. Costo editado del producto
  conserva su regla de entrada entera y el respeto del costo heredado sin editar.
* Al editar gastos/ingresos, String(amount) precargaba punto decimal aunque parseAmount
  lo interpreta como miles: se corrige la precarga a coma para conservar centavos.

## Implementacion y contrato

lib/decimal.ts extrae el racional existente de inventory/pricing.ts. Comparte conversion
decimal corta, multiplicacion exacta y HALF_UP, sin dependencias. Inventario sigue
redondeando sugerido e IVA del costo al peso entero una sola vez al final.

lib/money.ts concentra producto monetario, normalizacion a centavos, suma decimal y
validacion textual del precio. No agrega EPSILON. Nuevas facturas calculan precio por
cantidad antes de redondear base e IVA de cada linea a dos decimales. invoiceTotals suma
los importes definitivos; purchaseTotals reutiliza esa misma funcion. Se elimina el
exactTotal crudo y se compara el saldo normalizado con total definitivo.

Pagos, abonos y transferencias comparan importes normalizados HALF_UP; un monto que queda
en cero no pasa la regla positiva del backend. Sus cuerpos conservan el importe ingresado
para que el servidor normalice y compruebe el saldo vigente. Iniciales de alta/edicion
conservan su precision de envio, sin aplicarles el rechazo de precio unitario. No hay
calculo local nuevo para garantizar que editar un inicial tiene fondos suficientes.

Se normalizan sumas derivadas de pendientes, terceros, movimientos, inventario y saldos
anticipados, sin reinterpretar documentos. No cambian tolerancia de pendientes, limites
locales de pago/abono, fechas, dominio del gasto con negativos ni proteccion del PUT de
cuenta. No se amplian tolerancias ni se omite la comprobacion del servidor.

Precio unitario: precision comprobada desde el texto original del input antes de
convertirlo a Number. Punto decimal/exponente del input numerico conservados; ceros finales
equivalentes aceptados. Se conserva precio positivo. Error accesible bajo el campo con
aria-invalid y aria-describedby; no se redondea ni se envia un documento invalido.
Mensaje HTTP 400 agregado al mapa, exacto del backend:

`El precio unitario admite como maximo dos decimales`

La interfaz lleva tilde en maximo y punto final. Los errores HTTP siguen pasando por
reportError/userMessage. Gastos, ingresos, pagos, abonos, transferencias y saldos no
heredan el rechazo de precision del precio.

formatCurrency conserva enteros sin decimales y centavos con dos, separadores colombianos,
ausentes con EMPTY_VALUE y signo antes del simbolo. HALF_UP evita el cero negativo.
Porcentajes, cantidades y codigos no se convierten en dinero. Se mantienen los importes
guardados en detalles, listados y PendingBalance; resumen historico deriva diferencias
desde los totales de API, sin recalcular su IVA por linea.

## Ejemplos antes y despues

Venta y compra, IVA 19 %, dos productos distintos para mantener dos lineas separadas
(el selector ya impide repetir producto). No se sustituye por cantidad 2 en una linea.

| Caso | Antes | Despues, esperado = obtenido |
|-|-|-|
| Dos lineas, precio 0.03, cantidad 1 | IVA resumen 0.01, total 0.07 | Base 0.06, IVA 0.01 + 0.01 = 0.02, total 0.08 |
| Dos lineas, precio 5.67, cantidad 1 | IVA 2.15, total 13.49 | Base 11.34, IVA 1.08 + 1.08 = 2.16, total 13.50 |
| Una linea, precio 0.01, cantidad 3 | Calculo 0.04, formato $ 0 | Base 0.03, IVA 0.01, total 0.04 visible |
| Una linea, precio 0.03, cantidad 2 | Diferente unidad de redondeo | Base 0.06, IVA 0.01, total 0.07, cubierto en pruebas |
| Compra de dos lineas 0.01, saldo 0.02 | exactTotal 0.0238 bloqueaba | Total 0.02, POST 201, saldo 0.00 |
| Saldo 0.01 contra total 0.02 | Insuficiente | Rechazado en logica y formulario |
| 1500 | $ 1.500 | $ 1.500 |
| 13.50 / 0.08 / 100.01 | Centavos ocultos | $ 13,50 / $ 0,08 / $ 100,01 |
| -0.10 | $ 0, clasificacion no negativa | -$ 0,10 y tono negativo |
| -0.004 | Cero | $ 0, sin signo negativo |

0.005 y 0.0100000000000000000001 rechazados en ambas pantallas, con error de campo y
cero peticiones de creacion; en Edge se comprobo 0.005. 0.01 y 0.0100 aceptados en venta
y compra; en Edge 0.0100 genera cuerpo con price 0.01 y respuesta 201. Las pruebas
incluyen notacion exponencial equivalente y precision significativa, sin depender de
que Number conserve los ultimos digitos del texto.

## Pruebas

Base informada 1179; no se ejecuto main ni una copia para contarla. Suite completa de la
rama: 1233 = 1179 + 54, 63 archivos, sin bajas, omisiones ni fallos. Son 50 casos
funcionales nuevos y 4 comprobaciones adicionales de las guardas al recorrer dos nuevos
archivos de fuente. Guardas de copy, diseno y contraste incluidas.

Cobertura nueva: tres ejemplos en venta/compra y cantidad 2 distinta de dos lineas;
sumas de linea/resumen; fondos exactos y realmente insuficientes; precision textual,
validacion accesible y cuerpos enviados; formato y signo; HALF_UP en pagos/abonos/
transferencias; envio de inicial sin truncarlo; gastos con sobregiro permitido y edicion
con centavos; resumen y dos pantallas historicas con total 0.07 guardado aunque sus IVA
de linea sumen 0.02; perdida de diez centavos en Dashboard/Reportes. Alta, Editar cuenta,
transferencias, reportes y pruebas existentes pasan en la suite completa.

Pruebas existentes ajustadas y justificacion comprobada contra Moneda y los servicios:

* format.test.ts: el caso que eliminaba decimales ahora conserva centavos.
* newSale.test.ts: redondeo global reemplazado por suma definitiva de linea, con precio
  valido 1234.56 en lugar del antiguo 1234.565 que el contrato ahora rechaza.
* newPurchase.test.ts: se elimina exactTotal de dos objetos esperados; IVA agregado pasa
  a IVA redondeado por linea; el ejemplo antiguo de precio 0.025 se reemplaza por precio
  valido 0.01 y cantidad 3, conservando la cobertura del momento de redondeo.
* errorMessages.test.ts: dos expectativas con importes crudos ahora muestran 3.706.375,90
  y 397.938,28. El mensaje que ya venia formateado por backend se conserva intacto.
* purchaseDetail.test.ts: el limite pendiente muestra sus 28 centavos.
* PurchaseDetailPage.test.tsx: cinco casos existentes muestran los centavos guardados de
  precio, IVA, base, total y pendiente en lugar del redondeo entero anterior. Fechas,
  acciones, envio del pago y propositos de esas pruebas no cambian.

Los demas archivos de pruebas existentes solo agregan casos. No se cambiaron expectativas
para ocultar discrepancias. Build y lint finales registrados al terminar la verificacion.

## Verificacion real

Backend dev arrancado con mvnw spring-boot:run y perfil dev en 8080; Vite en 5173,
proxy intacto. Edge instalado, sin ventana, perfil aislado y scripts CDP fuera del repo.
No se instalaron dependencias ni navegadores. Las credenciales demo se leyeron del
inicializador solo para autenticarse; no se incluyen en esta nota ni en el repo.

En tenant nuevo se verificaron los tres ejemplos en ambas pantallas: importes de linea,
resumen antes de enviar, cuerpo/resultado POST y detalle GET/pantalla coinciden con la
tabla anterior. Compra exacta comprobada antes de transferir despues a esa cuenta.
Una venta auxiliar adicional de 0.08, creada mientras se corregia la captura de respuesta
del script, esta incluida en los agregados y sus exportados. No se oculta ni resta.

| Operacion real | Esperado | Obtenido API y pantalla |
|-|-|-|
| Inicial solicitado 100.105 | 100.11 | 100.11 |
| Venta credito 20.03 + IVA | Total 23.84 | 23.84 |
| Abono 2.345 | 2.35, pendiente 21.49 | 2.35, 21.49 |
| Compra credito 10.03 + IVA | Total 11.94 | 11.94 |
| Pago 2.335 | 2.34, pendiente 9.60 | 2.34, 9.60 |
| Transferencia 0.105 | 0.11 | 0.11 |
| Editar inicial con 100,105 y renombrar | Inicial 100.11, saldo actual vigente 99.99 | 100.11, 99.99 |
| Gasto previo de 0.10 | Utilidad -0.10 en su dia | -0.10, texto -$ 0,10 y bg-error-bg/text-error-ink |
| Gasto sin fondos en cuenta nueva | Puede quedar negativa | -123456789.12 |

## API, pantalla, PDF y XLSX

Se descargaron seis pares PDF/XLSX desde la API de exportacion: estado de resultados del
tenant nuevo del 25/10, perdida del 24/10, demo del 01/08 al 25/10; movimientos del tenant
nuevo del 25/10, demo del 01/08 al 25/10 y cuenta Banco del 01/10 al 25/10. Se contrastaron
134 celdas monetarias numericas y sus formatos con API y texto PDF, sin diferencias.
Pantallas Reportes y Cuentas consultadas con esos mismos rangos, no con otro periodo.
PDF renderizado e inspeccionado, sin cortes de importes. openpyxl avisa que el archivo
no tiene estilo predeterminado; sus cifras y formatos de centavos son correctos.

| Cifra | API esperada = pantalla = PDF = XLSX |
|-|-|
| Nuevo, ventas sin IVA del 25/10 | 31.53 |
| Nuevo, costo de lo vendido | 0.11, fila exportada -0.11 |
| Nuevo, utilidad bruta | 31.42 |
| Nuevo, utilidad neta del 25/10 | -123456757.70 |
| Perdida del 24/10 | -0.10 |
| Banco, apertura / ingresos / egresos / neto / cierre | 100.11 / 16.06 / -16.18 / -0.12 / 99.99 |
| Nuevo, movimientos ingresos / egresos / neto del 25/10 | 16.17 / -123456805.22 / -123456789.05 |
| Demo, utilidad neta 01/08 a 25/10 | 1380969 |
| Demo, movimientos ingresos / egresos / neto | 62181715.55 / -52103400 / 10078315.55 |

La app no tiene PDF/XLSX de factura individual; se verifican sus importes en los reportes
del mismo rango, ademas de POST, GET y detalle, sin inventar exportaciones nuevas.

## Demo e historicos

Demo solo lectura: cuentas, saldo global, KPIs, ventas, compras y los 77 movimientos del
rango son identicos antes y despues de las comprobaciones. Las 16 comparaciones de
pantalla/API de cuentas, Dashboard, pendientes, Reportes e historico coinciden.

* Bancolombia 16963933.02; Caja General 4406852.45; Nequi 6807530.08; global 28178315.55.
* Dashboard de octubre: ventas sin IVA 20781907, costo 14055000, bruta 6726907,
  neta 1534707. Reportes del rango agosto/octubre coincide con sus exportados.
* Por cobrar 18838227.56 y por pagar 4315520, desde pendingBalance de API.
* Historico real id 2 del 03/08/2026: subtotal 1464616, IVA guardado 278277.04,
  total 1742893.04; pantalla identica. Sin recalculo ni escritura del documento.
* El caso historico inconsistente 0.07 con IVA de lineas 0.02 se verifica en pruebas
  de ambos detalles con respuestas de API conservadas, no se fabrica alterando el backend.

## Medidas y cambios visuales

390, 1024 y 1280 px: 57 mediciones de pantallas/modales entre tenant nuevo y demo,
mas 6 de nueva venta/compra con precio 9999999.99 por linea, total 23799999.98 y saldo
anticipado negativo. Desbordes de pagina 0/0/0 e internos visibles 0/0/0 en la repeticion.
Los labels sr-only de 1 px se excluyen del desborde visual, no se ocultan importes.

Incluye indicadores, cuentas, listados, terceros, detalles, Reportes, Editar cuenta y
transferencia con 99999999999.99, ademas de cuenta negativa -123456789.12. Se detectaron
y corrigieron indicadores estrechos y codigos comprimidos por el saldo con centavos de
tarjetas de facturas a 390. Indicadores distribuidos en columnas de minimo 280 px,
limitadas por el ancho disponible; tarjetas moviles envuelven conservando espacio del
codigo. Algunos importes largos pueden llevar el simbolo a otra linea, sin cortar cifras.
Sin cambios de colores, tokens ni capturas de landing.

## Limites y siguiente tarea

No se valida produccion ni PostgreSQL. No aparecio el 500 H2 documentado, sin atribuirle
causa ni modificar configuracion para evitarlo. El backend arranca con sus avisos
existentes de dev/Flyway/open-in-view. La falta de estilo predeterminado del XLSX es
preexistente y no se cambia el backend. No hay garantia local de fondos vigentes.

La tarea 15 de 19, optimizacion de carga, usara perf/32-route-splitting-fonts para
conservar la numeracion consecutiva del frontend. Sin optimizacion de carga en esta rama.

## Cierre de verificacion

Checks finales tras corregir distribucion y precision textual: npm test 1233/1233,
63 archivos, 0 fallos; duracion 88.99 s. npm run build y npm run lint con salida 0.
Sin repeticion de la suite base de main. git diff sin errores de espacios tras quitar
un espacio sobrante en la prueba nueva. Sin commit, push, merge ni cambio de rama.

Git status: 34 archivos existentes modificados y 4 nuevos, todos de esta tarea.

Modificados:

```text
docs/ai-context/02-CONVENTIONS.md
docs/ai-context/03-DECISIONS.md
docs/ai-context/06-COPY.md
src/accounts/accountForms.ts
src/accounts/accountsView.ts
src/api/errorMessages.test.ts
src/api/errorMessages.ts
src/counterparties/counterpartyList.ts
src/inventory/pricing.ts
src/inventory/productList.ts
src/lib/format.test.ts
src/lib/format.ts
src/manualMovements/manualMovements.test.ts
src/manualMovements/manualMovements.ts
src/pages/DashboardPage.test.tsx
src/pages/DashboardPage.tsx
src/pages/NewPurchaseInvoicePage.test.tsx
src/pages/NewPurchaseInvoicePage.tsx
src/pages/NewSaleInvoicePage.test.tsx
src/pages/PurchaseDetailPage.test.tsx
src/pages/PurchaseInvoicesPage.tsx
src/pages/ReportsPage.test.tsx
src/pages/ReportsPage.tsx
src/pages/SaleDetailPage.test.tsx
src/pages/SalesInvoicesPage.tsx
src/purchases/newPurchase.test.ts
src/purchases/newPurchase.ts
src/purchases/purchaseDetail.test.ts
src/purchases/purchaseDetail.ts
src/purchases/purchasesList.ts
src/sales/newSale.test.ts
src/sales/newSale.ts
src/sales/saleDetail.ts
src/sales/salesList.ts
```

Nuevos:

```text
docs/ai-context/sessions/2026-10-25-monetary-compatibility.md
src/lib/decimal.ts
src/lib/money.test.ts
src/lib/money.ts
```

Edge aislado cerrado y sessionStorage/localStorage limpiados. Backend/Maven y Vite
propios detenidos; PIDs propios 305568 (Java) y 306380 (Edge) ya no existen, sin listeners
en 8080, 5173 ni 9331. Carpeta temporal exclusiva y log del intento inicial de Python
eliminados con rutas absolutas comprobadas, archivos individuales y luego directorios
vacios; Test-Path False para ambos. Incluye tokens, scripts, perfil, exportados,
capturas y resultados temporales. Se uso finalmente el Python ya instalado del runtime,
sin instalar interpretes ni paquetes. Backend conserva solo sus dos cambios .idea previos.
Estado final frontend: misma rama, 34 modificados y 4 nuevos, nada staged, sin commit/push.

## Cierre autorizado

2026-10-25, America/Bogota. Revision aprobada por el usuario; rama confirmada
fix/31-monetary-compatibility. Sin procesos pesados propios antes de los checks.
npm test: 1233 = 1179 base + 54 adicionales, 63 archivos, 0 fallos y 0 omisiones,
64.45 s. npm run build y npm run lint: salida 0, sin reintentos.
Revision de diff, nuevos y status: 34 modificados y 4 nuevos, sin credenciales,
tokens, scripts temporales, capturas, exportados ni perfiles de navegador.
Backend sin cambios de la tarea; conserva solo los dos .idea previos.
Se autoriza commit/push y PR a main con mensaje/titulo fix/31-monetary-compatibility
y cuerpo exacto entregado por el usuario. Sin merge ni cambio de rama.
Los estados sin commit/push anteriores describen la etapa de implementacion;
hash y URL de cierre se reportan fuera de esta nota. Se mantienen los limites descritos.
