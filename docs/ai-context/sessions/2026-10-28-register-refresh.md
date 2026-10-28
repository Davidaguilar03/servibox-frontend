# 2026-10-28: Registro, tarea 9 de 11

## Cierre 2026-10-28: aprobacion visual de David

* David aprueba visualmente Registro y autoriza commit, push y PR de
  feat/41-register-refresh hacia main. Esta aprobacion reemplaza los pendientes
  visuales historicos de esta nota. Sin navegador en este cierre.
* Codigo, pruebas y fotografia sin cambios desde las comprobaciones aprobadas:
  se reutilizan 1390/1390 pruebas correctas en 65 archivos, build y lint sin
  advertencias. Balance: 1387 base + 3 nuevas, cuatro ajustadas y cero retiradas;
  las ajustadas y sus motivos constan en Contratos y pruebas.
* Git diff check y revision del alcance correctos. Solo se agregan las diez
  rutas explicitas de esta tarea; sin secretos ni temporales en el cambio.
* Limitaciones vigentes: API simulada, sin backend real; fotografia ambiental
  generada, 1122x1402 RGB y 84042 bytes, original externo intacto.
* Login, backend, AGENTS.md y .idea intactos; sin detener procesos ajenos.
  Se conserva la rama, sin merge ni checkout. Siguiente tarea tras confirmar
  merge por David: Reportes.

## Git y alcance

* Main limpio y actualizado tras fetch: HEAD y origin/main remoto en 53b8827,
  merge del PR 42 de Login. Rama feat/41-register-refresh libre local y remota
  antes de crearla. Sin commit, push ni PR; pendiente de aprobacion visual de David.
* Backend no leido ni modificado. AGENTS.md, .idea, Login, componentes de marca,
  favicon, reglas de registro y autenticacion intactos. Sin dependencias nuevas.
  No se arrancan servidores ni navegadores ni se detienen procesos ajenos.

## Presentacion y recurso

* Referencias externas inspeccionadas: register-proposal-v2.png y fotografia
  register-assets/register-workshop-v1.png. Maqueta solo como guia, titulo correcto
  Crea tu serviteca. Logo y textos en HTML mediante WordmarkLink compartido.
* RegisterPage.css bajo #register: desde lg foto izquierda 44%, panel claro 56%,
  formulario integrado max640 px. Foto cover 60%/35%, velo gradual superior e
  inferior, capas 0/1/2 para foto/velo/contenido. Marca 48x48 y palabra 32/40.
  Cobertura solo para el hijo directo register-photo, sin afectar al simbolo img.
* Mensajes ambientales: Tu serviteca empieza aqui. Ventas, inventario y caja
  conectados. Tildes conservadas en interfaz. Foto oculta bajo lg, marca visible
  sobre formulario. Min-height 100svh, altura natural sin max-height ni recortes.
* Ocho campos en Datos de la serviteca y Administrador. Una columna en movil;
  dos desde sm cuando el contenedor tiene al menos 440 px. TextField de 52 px,
  ayudas y errores sin recortar, checkbox sin ampliar a altura de campo.
* Volver al inicio, marca a /, Iniciar sesion a /login, terminos a /terminos
  conservando aceptacion explicita y apertura en pestana nueva desde la casilla.

### Foto optimizada

* Fuente externa conservada bajo
  C:/Users/PC/Documents/Codex/2026-10-25/files-pasted-by-the-user-vale/outputs/servibox-redesign/.
* PNG register-assets/register-workshop-v1.png: 1122x1402 RGB, 2005934 bytes.
  WebP src/assets/register/register-workshop-v1.webp: 1122x1402 RGB,
  84042 bytes, reduccion aproximada del 95,81 por ciento.
* Pillow 12.3.0 existente en Python 3.14, calidad 82 y method 6, sin ampliar.
  Python 3.12 no tenia Pillow; no se instala ninguna dependencia.
  WebP reabierto y decodificado correctamente. SHA256 del PNG antes/despues:
  cd2a3c375046e8ddb37cfa1ba47c4c26632e6381a923d7d6a7971f036e716850.
* Foto decorativa generada aportada por David, sin representar un cliente real.
  Alt vacio, dimensiones naturales declaradas, prioridad alta, decoding async.

## Contratos y pruebas

* registerForm y authApi sin cambios: sugerencia hasta edicion manual, normalizacion,
  validaciones, NIT y telefono obligatorios, payload y contrasena sin normalizar.
  409 ligado al codigo enviado y foco, 403 propio, errores de red y servidor.
* Errores pasan por reportError inlineOnly y mapa existente. Generico local como
  Login, sin invitar al contacto demostrativo. No se publican contactos nuevos.
  Formulario con nombre accesible, aria-busy y status de carga; ref de bloqueo
  y boton pendiente conservados. No se registran datos sensibles.
* Exito intacto: recordar codigo, toast existente, startSession y /inicio con
  replace. Sin wizard ni pantalla de exito intermedia. Foco, etiquetas,
  autocompletado y mostrar/ocultar de TextField conservados.
* Base real confirmada sobre snapshot aislado de HEAD 53b8827 en TEMP:
  1387/1387 correctas en 65 archivos. La primera ejecucion sobre el directorio
  de trabajo alcanzo a incluir RegisterPage.css y conto 1388; no se usa como base.
* Dos nuevas pruebas de comportamiento en RegisterPage: mostrar/ocultar con teclado
  y envio por Enter; 409 tardio ligado al codigo original, que reaparece al volver
  a ese codigo. Una guarda parametrizada adicional por el nuevo RegisterPage.css.
* Cuatro existentes ajustadas en RegisterPage: h1 refuerza dos grupos, ocho campos
  y foto decorativa; terminos verifica regreso y footer; red/500 verifica mensaje
  sin contacto demostrativo; envio pendiente verifica aria-busy, status y bloqueo
  de submit programatico repetido. Cero retiradas.
* API simulada con fetch en Vitest/jsdom; sin HTTP ni registro contra backend real.
  Sin navegador ni auditoria visual automatizada por instruccion de David.
* Suite completa final: 1390/1390 correctas en 65 archivos, cero fallos.
  Balance: 1387 base + 2 de comportamiento + 1 guarda CSS, cuatro ajustadas,
  cero retiradas. La primera suite de la version nueva fallo por consultar
  status sin acotarlo al boton, pues el aviso inicial tambien usa ese rol;
  corregida la consulta, se repite completa y pasa.
* Build correcto sin advertencias, foto emitida como
  register-workshop-v1-CmB4oooG.webp con 84042 bytes, igual al recurso fuente.
  Snapshot temporal de main y su junction eliminados sin tocar node_modules.
* Lint correcto sin advertencias y git diff check correcto. Git en sandbox
  avisa que no puede leer el ignore global externo; status y diff revisados
  muestran solo las diez rutas de esta tarea. Archivos protegidos sin diff.

## Revision y arranque

* Pendiente de aprobacion visual de David: foto/recorte y logo, agrupaciones,
  campos y ayudas, errores, terminos, exito, movil y teclado. No se afirma
  fidelidad visual ni ausencia de desbordes comprobada en navegador.
* Desde frontend: npm run dev. URL habitual http://localhost:5173/registro;
  usar el puerto anunciado por Vite si esta ocupado. API por proxy existente,
  por defecto localhost:8080; el flujo real requiere backend disponible.
* Archivos: RegisterPage.tsx, RegisterPage.css, RegisterPage.test.tsx, WebP de
  Registro; 01-ARCHITECTURE, 02-CONVENTIONS, 03-DECISIONS, 05-DESIGN-SYSTEM,
  06-COPY y esta nota. Login y su presentacion aprobada no cambian.
