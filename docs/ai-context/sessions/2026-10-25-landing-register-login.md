# 2026-10-25: Landing, login, registro y terminos

Rama `feat/25-landing-register-login-redesign`. Decision en
[03-DECISIONS.md](../03-DECISIONS.md), reglas en [05-DESIGN-SYSTEM.md](../05-DESIGN-SYSTEM.md)
y [02-CONVENTIONS.md](../02-CONVENTIONS.md). Sin cambios de backend, rutas, autenticacion ni
pantallas internas.

## Lectura previa

* Landing: barra con anclas (Producto, Modulos, Como funciona, Contacto) y menu movil;
  portada oscura con mockup interactivo ("Vista de ejemplo con datos ficticios", "Cliente de
  ejemplo 1/2"); "El problema" (3 tarjetas), "Modulos" (5 tarjetas), "Como funciona" (3
  pasos), llamado "Tu negocio en buenas manos" y pie con 4 valores ("Optimiza tu tiempo...").
  Se conserva solo el titular y la idea de los pasos; el resto se reemplaza.
* Tokens de legado (`text-display`, `text-h1` a `text-h3`, `rounded-tag/card/container`,
  `shadow-card/menu/modal`): solo en `LandingPage`, `LoginPage` y `RegisterPage`, excluidas de
  la guarda.
* Registro: pedia nombre comercial, NIT, telefono, identificador, nombre, correo, usuario,
  contrasena y terminos. Tras crear la cuenta: toast "Serviteca creada. Bienvenido a
  ServiBox." y entrada a `/inicio`; antes del boton, aviso "Creamos la Caja General, las
  categorias base (Llantas, Lubricantes y Baterias) y el IVA del 19%".
* Backend (`TenantRegistrationService`): crea tenant, administrador ADMIN, IVA 19 %, categorias
  LLANTAS, LUBRICANTES y BATERIAS (umbrales 10 y 3, margen objetivo 0), Caja General
  (EFECTIVO, saldo 0) y el cliente Consumidor final.
* Titulos: `usePageMeta` en cada pagina publica con el formato `Pagina · ServiBox`;
  `index.html` con `ServiBox`.
* Herramientas de captura: Edge instalado, Node 24 (WebSocket nativo para CDP), Pillow 12.3 e
  ImageMagick. Sin Playwright ni cwebp.

## Hecho

* `src/config/contact.ts` con los contactos demostrativos; landing, login y terminos los
  importan.
* Landing nueva (ver tabla), login y registro en una columna sin lema, `/terminos` con texto.
* `tokens.css` sin legado; `--display-*` y utilidad `text-display` en `index.css`. Guarda:
  sin exclusiones de paginas, `text-display` solo en el `h1` de la landing, `text-title` en
  los `h2` de la landing y `shadow-raised` en su enlace "Saltar al contenido".
* `index.html`: titulo y meta description de la landing.
* Mensaje de terminos del registro: "Acepta los terminos de uso y el tratamiento de datos para
  continuar."

## Copy final

| Pagina | Elemento | Texto |
|-|-|-|
| Landing | Titulo del documento | ServiBox \| Ventas, inventario y caja para servitecas |
| Landing | Barra | Iniciar sesion (texto) · Crear cuenta (primario) |
| Landing | h1 (display) | Una venta. Inventario y caja al dia. |
| Landing | Subtitulo y meta | Registra una venta y ServiBox actualiza el inventario y la caja al instante. Para servitecas y talleres. |
| Landing | Primario de portada y cierre | Crear mi serviteca (con sesion: Ir al panel) |
| Landing | Leyenda | Pantalla real de ServiBox con datos de demostracion. |
| Landing | h2 | Lo que haces con ServiBox |
| Landing | h3 + texto | Registra una venta y todo se actualiza · Sabe que se te acaba · Mira cuanto ganas de verdad (textos del pedido) |
| Landing | h2 + lista | Y tambien: compras a proveedores con sus pagos; cuentas de efectivo, bancos y billeteras digitales; clientes y proveedores; gastos operativos e ingresos ocasionales; transferencias entre cuentas |
| Landing | Piloto | ServiBox se probo en Autollantas A&C S.A.S., un negocio de llantas, lubricantes y servicios automotrices. |
| Landing | h2 | Preguntas frecuentes (5, del pedido) |
| Landing | Cierre (h2) | Registra tu serviteca y empieza a llevar ventas e inventario hoy mismo. |
| Landing | Pie | Terminos y tratamiento de datos · Iniciar sesion · Crear cuenta · WhatsApp · Correo |
| Login | Titulo del documento | Iniciar sesion \| ServiBox |
| Login | h1 / subtitulo | Iniciar sesion / Ventas, inventario y caja en un solo lugar. |
| Login | Campo | Codigo de tu serviteca, ayuda "El nombre corto que elegiste al registrarte." |
| Login | Primario | Iniciar sesion (cargando: Iniciando sesion...) |
| Login | Secundario | ¿Tu serviteca aun no usa ServiBox? Crear cuenta |
| Login | Soporte | ¿No puedes entrar? Escribenos por WhatsApp. |
| Registro | Titulo del documento | Crear cuenta \| ServiBox |
| Registro | h1 / subtitulo | Crea tu serviteca / Llena los datos del negocio y de quien lo administra. La informacion de cada serviteca se guarda por separado. |
| Registro | Campo | Codigo de tu serviteca, ayuda "El nombre corto con el que tu equipo inicia sesion. Solo minusculas, numeros y guiones." |
| Registro | Aviso previo | Al crear la cuenta: Dejamos listas la Caja General, las categorias base (Llantas, Lubricantes y Baterias), el IVA del 19 % y el cliente Consumidor final. |
| Registro | Casilla | Acepto los terminos de uso y el tratamiento de datos. (enlace a /terminos) |
| Registro | Primario | Crear serviteca |
| Registro | Exito (toast) | Serviteca creada. Dejamos listas tu Caja General, las categorias base y el IVA del 19 %. Solo falta configurar tus margenes para el precio sugerido. |
| Terminos | Titulo del documento | Terminos \| ServiBox |
| Terminos | h1 / fecha | Terminos de uso y tratamiento de datos / Ultima actualizacion: 25 de octubre de 2026 |
| Terminos | h2 | Que es ServiBox · Tu cuenta · Que datos tratamos y para que · Tus derechos · Seguridad y cambios |

## Capturas

Edge headless por CDP (script en el scratchpad, sin dependencias en el proyecto), tenant demo,
1440x900, escala 1, recorte al area de contenido (sin barra lateral ni superior, 1200x836) y
conversion a WebP con Pillow (calidad 82).

| Archivo | Pantalla | Peso |
|-|-|-|
| `src/assets/landing/hero-inicio.webp` | Inicio | 57,7 KB |
| `src/assets/landing/flujo-venta.webp` | Nueva factura con 2 lineas (LL-007 x4, LU-010 x2), sin guardar | 44,9 KB |
| `src/assets/landing/flujo-inventario.webp` | Productos con alertas | 63,0 KB |
| `src/assets/landing/flujo-reportes.webp` | Reportes, estado de resultados del mes | 39,1 KB |

## Verificacion

* `npm run build`, `npm run lint` y `npm test`: 797 pruebas (base 770).
* Navegador (Edge headless) a 1440, 1024, 768, 390, 360 y 320: 0 desborde en `/`, `/login`,
  `/registro` y `/terminos`. A 320 y 360 la barra de la landing pasa a dos filas.
* Tamanos de texto de contenido: landing 24, 15 y 13 (mas display 40/32, button 14 y la marca);
  login 24 y 13 (mas label y button); registro 24 y 13 (mas label y button); terminos 24, 15
  y 13.
* Imagenes: las cuatro cargan; la de portada sin `loading` y con `fetchpriority="high"`, las
  demas `lazy`; CLS 0,0015 al recorrer la pagina.
* Teclado: "Saltar al contenido" es lo primero y lleva el foco a `main#contenido`; orden
  marca, Iniciar sesion, Crear cuenta, Crear mi serviteca, las 5 preguntas, cierre y pie. Cada
  pregunta abre y cierra con Enter y espacio. La casilla de terminos se marca con espacio.
* Registro real (`prueba-landing-21741`): el toast coincide con lo creado; la API devolvio
  Caja General (EFECTIVO, 0), LLANTAS, LUBRICANTES y BATERIAS (margen 0), IVA 0,19, el cliente
  Consumidor final y la configuracion financiera en 0.
* Script de desbordes de fix/20 y feat/23 (176 casos, 360 a 1536, tenant demo y rutas
  publicas): 0 desbordes; quedan los internos previos sin desplazamiento.
* `tokens.test.ts` sin cambios.

## Pendientes

* Responsable legal del tratamiento: razon social, NIT y direccion (hoy "ServiBox").
* Revision legal de `/terminos`.
* Reemplazar los contactos demostrativos de `src/config/contact.ts`.
* Precio: la pregunta frecuente remite a WhatsApp y correo.
* Configuracion sigue rotulando "Identificador de la serviteca" (pantalla interna, fuera de
  alcance); el login y el registro dicen "Codigo de tu serviteca".
* En Inicio y Productos a 1440 los codigos (`BA-007`) parten en dos lineas; se ve en las
  capturas. Es de las pantallas internas, fuera de alcance.
* El enlace "Saltar al contenido" del shell pierde su relleno al enfocarse (`not-sr-only` lo
  pone en 0); en la landing se corrigio con `focus:px-4 focus:py-2`.
