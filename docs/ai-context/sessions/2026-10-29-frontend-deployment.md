# 2026-10-29: Frontend y proxy en contenedor, sin publicar

Se puede continuar con el cierre Git autorizado por David el 2026-10-30. La revision
manual del conjunto Docker queda aplazada hasta la regresion del nuevo bloque y es
obligatoria antes del despliegue publico. Sin aprobacion visual ni verificacion de
navegador. Contactos demostrativos bloquean entrega publica; Railway, dominio y
produccion publica permanecen sin verificar.

## Git y alcance

Rama chore/44-frontend-deployment desde main limpio y actualizado,
6e21d5903ec224d5147f8b37d2e214cd5bfae881, PR 45 mergeado. Backend hermano en main
643494a0eee26e0a09588340627be58052faca2a, PR 43 mergeado y ancestro 842190b verificado.
Sin cambios de backend, AGENTS ni .idea ajenos. Cierre autorizado: commit y titulo de
PR chore/44-frontend-deployment, push de la rama y PR hacia main, sin merge ni checkout.
Se conservan los ocho archivos propios, seis nuevos y dos modificados. Solo se actualiza
documentacion para registrar esta decision, sin cambios de codigo o configuracion.
Se reutilizan los resultados aceptados del informe externo, sin repetir suites.

Dockerfile, .dockerignore y deployment/start.sh/nginx.conf.template nuevos. Arquitectura
y decisiones actualizadas; contrato, limites, fuentes y reproduccion en
[DEPLOYMENT](../../DEPLOYMENT.md). Sin cambios de src, dependencias o pruebas existentes.

## Verificacion de esta ejecucion

* Vitest completo: 1426 totales, 1426 aprobadas,
  0 fallos, 0 pendientes. Cero nuevas, ajustadas o retiradas: aplicacion intacta.
* Build host, lint y diff check: salida 0. Ambas imagenes construidas desde fuentes;
  backend package omite tests. No se repitio JUnit: 494 es evidencia anterior.
* HTTP real final: 86/86 comprobaciones y 33 peticiones registradas; no incluye sondeos de espera.
  SPA, JS/CSS/MIME/cache, 404 estaticos/API, salud, 401, registro/login, POST/PUT,
  Bearer, cuerpo UTF-8, filtros y validacion 400 con cuerpo exacto.
* PDF/XLSX descargados y leidos: inicial 1234.56, ingreso 20.25, final 1254.81,
  coinciden con API. openpyxl avisa estilo default ausente del generador backend;
  lectura numerica correcta. Sin revision visual de archivos ni comparacion de pantalla.
* Restart conserva datos/token y misma IP. Recreacion con mismo alias backend:
  172.19.0.3 a 172.19.0.5, lectura autenticada recuperada sin reiniciar proxy.
* /healthz responde 200 con backend detenido y 503 con raiz sin index. API caida
  puede responder 502/504. PORT 9089 y fallback 8080 probados con misma imagen.
* PG16.15 prod sin demo, esquema inicialmente vacio, Flyway V1 a V7. Sin puertos
  host DB/backend; solo proxy loopback. UID 101 frontend y 10001 backend.

## Incidencias y limites

Build inicial intento copiar public inexistente. Dos arranques detectaron regex Nginx
sin comillas y temporales protegidos; corregidos. Dos auxiliares fallaron por esperar
solo 502 (tambien puede haber 504) y simular index ausente sobre configuracion inactiva;
corregidos sin cambios de aplicacion. Intentos fallidos y limpiezas conservados en
evidencia; solo la corrida final se cuenta como aceptada. No hay fallos finales abiertos.

Node 24.15.0/npm 11.12.1, Nginx 1.30.2 y bases por digest. Imagen frontend:
sha256:96eda9caed01d26f374657ead3cb4f02420f07c30bd776ea2036df4aff035886. Backend construido desde codigo mergeado:
sha256:0cd7115a6704d2135650b0b6eb70f683b5083d7e7e030374dbf5f199b02a5e51. Versiones/digests completos en informe externo.

86 comprobaciones externas no son Vitest ni prueban interaccion de navegador. Sin navegador
del agente. IPv6/DNS privado Railway, maximo volumen, carga y operacion publica no probados.
Salud frontend solo Nginx/index, backend health solo HTTP, ninguno consulta DB.

Contenedores/red/volumen propios eliminados; imagenes/cache locales conservados para
review. Sin tocar PG18 ni recursos ajenos o temporales bloqueados anteriores.
Informe y scripts externos: C:/Users/PC/Documents/Codex/2026-10-29/servibox-frontend-deployment/.
No hay URL activa. Comandos para iniciar manual, URL loopback dinamica y limpieza en
DEPLOYMENT. Pendientes contactos reales en terminos/toasts/errores, review David,
Railway, dominio servibox.co, backups, secretos, registro y costos. La revision manual
de David se realizara en la regresion del nuevo bloque, antes de publicar; el cierre
Git queda autorizado sin esa comprobacion. Sin pruebas de carga o duracion prolongada.
Informe academico integral posterior al cierre de tarea 3 completa.
