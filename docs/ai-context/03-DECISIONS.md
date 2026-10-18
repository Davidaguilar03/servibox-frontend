# Log de decisiones tecnicas

Una entrada por decision, en orden cronologico inverso (la mas reciente arriba).

Formato de cada entrada:

```
## AAAA-MM-DD: Titulo corto de la decision

* Decision: que se decidio hacer.
* Alternativas consideradas: opciones que se evaluaron y se descartaron.
* Motivo: por que se eligio esta opcion sobre las demas.
```

## 2026-10-18: Medio de pago segun el tipo de cuenta

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
