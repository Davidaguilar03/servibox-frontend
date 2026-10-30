# Frontend y proxy en contenedor

Preparacion local sin publicar, tarea 3 parte B. Desde la raiz Git frontend:

```powershell
docker build -t servibox-frontend:task3b .
```

Node 24.15.0 Alpine ejecuta npm ci con package-lock.json y npm run build real.
Nginx 1.30.2 Alpine recibe solo dist de esa etapa y configuracion de servidor.
Ambas bases estan fijadas por digest; no se usa dist del host ni dependencias npm nuevas.
La lista permitida de .dockerignore excluye Git, dependencias locales, entorno,
secretos comunes y temporales. Nunca poner secretos en src ni usar variables VITE
para credenciales: los datos de build del cliente son publicos.
Runtime UID/GID 101:101; configuracion, PID y temporales se escriben en /tmp.

## Variables de arranque

| Variable | Contrato |
|---|---|
| PORT | Entero entre 1024 y 65535. Fallback 8080 al omitir o dejar vacio. Escucha IPv4 e IPv6; EXPOSE 8080 es informativo |
| BACKEND_UPSTREAM | Obligatoria. Exactamente http://hostname:port, sin barra final, ruta /api, usuario, clave, query ni fragmento. Host DNS ASCII o IPv4; puerto entre 1 y 65535. Ejemplo local http://backend:9017 |

Upstream solo se escribe en configuracion Nginx, nunca en JavaScript. Cambiar variables
requiere recrear/reiniciar el contenedor, sin recompilar. HTTP sobre red privada Railway
cifrada por Wireguard; no acepta HTTPS ni necesita exponer backend al publico.
El cliente mantiene /api relativo. proxy_pass agrega request_uri completo al origen,
conservando /api una vez, query, metodos, cuerpos, Authorization y encabezados de descarga.
Sin CORS abierto, cache de proxy, intercepcion de errores ni reintentos de upstream.
API fuerza Cache-Control: no-store, incluso errores. Logs no agregan Authorization ni
cuerpos; las URLs si se registran, no poner credenciales en query strings.

## DNS y Railway pendiente

start.sh lee nameserver de /etc/resolv.conf y encierra servidores IPv6 entre corchetes.
Resolver dinamico con cache 10 s, timeout DNS 5 s y A/AAAA activos. Sin IP fija ni DNS
publico. Durante indisponibilidad o cambio de IP puede haber 502 o 504 hasta renovar
o recuperar la conexion; no se reintenta la escritura.
Railway documenta nombres servicio.railway.internal dentro del proyecto/entorno y red
privada solo en runtime: entornos nuevos A y AAAA, anteriores pueden ser solo IPv6.
Ver [red privada](https://docs.railway.com/networking/private-networking/how-it-works),
[resolver Nginx](https://nginx.org/en/docs/http/ngx_http_core_module.html#resolver) y
[proxy_pass con variables](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass).

Configuracion futura sin aplicar: raiz del origen /, Dockerfile de raiz, ENTRYPOINT de
imagen, healthcheck /healthz. PORT lo entrega Railway. BACKEND_UPSTREAM usa el puerto
real del backend, por ejemplo http://api.railway.internal:8080 si api escucha 8080.
PORT del frontend no determina el del backend. Backend debe escuchar interfaces privadas.
Ver [Dockerfiles](https://docs.railway.com/builds/dockerfiles),
[dominios privados](https://docs.railway.com/networking/domains/working-with-domains) y
[healthchecks](https://docs.railway.com/deployments/healthchecks).
Healthcheck de despliegue no sustituye monitoreo continuo. DNS Railway aun no probado.

## Rutas, cache, salud y limites

Rutas sin extension sirven index.html con no-store. Archivos con extension y todo recurso
bajo /assets requieren existir: 404 sin fallback SPA. Rutas SPA con punto en el ultimo
segmento no usan fallback; las rutas actuales no lo necesitan. API precede a extensiones.
Recursos Vite /assets con hash de al menos ocho caracteres: un ano immutable. Resto
no-store; los 404 no reciben cache prolongada.

Cuerpo maximo 1 MiB, default Nginx conservado: formularios JSON actuales sin adjuntos.
Superarlo da 413 del proxy. Conexion upstream 5 s; lectura/envio upstream 120 s de
inactividad, cuerpo entrante 60 s y envio al cliente 120 s. No son tiempo total de
generacion. Descargas sin buffering de respuesta, cache ni transformacion, con MIME y
Content-Disposition del backend. Backend conserva 366 dias y 20000 filas. Maximo volumen,
latencia y limites externos Railway pendientes de verificar.

GET /healthz devuelve 200 frontend up si Nginx responde e index.html existe; 503 si falta.
No ejecuta React ni valida todos los bundles, backend o DB. El smoke comprueba JS/CSS
aparte. /api/health es salud HTTP backend, tampoco consulta DB; lectura/escritura
autenticada demuestra SQL separadamente. Ninguno demuestra interaccion de navegador.

## Reproduccion y revision manual de David

David autoriza el cierre Git el 2026-10-30 sin ejecutar ahora la revision manual del
conjunto Docker. Queda aplazada hasta la regresion del nuevo bloque y es obligatoria
antes del despliegue publico. No hay aprobacion visual ni verificacion de navegador.
Los resultados locales aceptados se reutilizan, sin cambios de codigo/configuracion.

Requisitos existentes: Docker Linux, Node y Python con fitz/openpyxl para leer exportados.
Backend hermano debe contener PR 43, commit 842190b556b605ad90687de7c42d971998376b45.
Desde raiz Git frontend, ejecutar secuencialmente:

```powershell
docker build -t servibox-backend:task3b ../servibox-backend
docker build -t servibox-frontend:task3b .
$evidenceScript = 'C:/Users/PC/Documents/Codex/2026-10-29/servibox-frontend-deployment/smoke.mjs'
$env:EVIDENCE_DIR = Join-Path $env:TEMP ('servibox-review-' + [guid]::NewGuid().ToString('N'))
node $evidenceScript
```

El auxiliar crea red/volumen/PG16 exclusivos y backend prod sin demo con secretos
aleatorios en memoria; solo publica frontend en 127.0.0.1, puerto host libre, interno
9089. Guarda evidencia redactada y limpia recursos propios por etiqueta. No conecta
PostgreSQL 18. Reinicia backend y lo recrea con otra IP y mismo alias para probar DNS.
No ejecuta JUnit ni navegador. Consultar result.json y cleanup.json.

Para dejar un conjunto expresamente disponible para revision manual:

```powershell
$env:EVIDENCE_DIR = Join-Path $env:TEMP ('servibox-manual-' + [guid]::NewGuid().ToString('N'))
$env:REVIEW_PASSWORD = Read-Host 'Clave efimera de revision, entre 8 y 72 caracteres'
node $evidenceScript --manual
Remove-Item Env:REVIEW_PASSWORD
```

Abrir http://127.0.0.1:PUERTO mostrado por el auxiliar y guardado en endpoint.json.
No hay URL activa al entregar. Codigo proxy-check, usuario qaadmin, clave digitada antes.
Revisar landing, login, registro, rutas directas, Configuracion, cuenta Proxy renamed e
ingreso 20,25 de octubre 2026, descargas Cuentas. Inicial 1234,56 y final 1254,81 en
API/exportados; UI redondea visualmente al peso por contrato. Registrar cifras de pantalla
y diferencias por separado. No usar datos reales. Limpiar al terminar:

```powershell
node $evidenceScript --cleanup
Remove-Item Env:EVIDENCE_DIR
```

Mantener EVIDENCE_DIR hasta limpiar. Se conservan archivos de evidencia; se borran solo
contenedores/red/volumen etiquetados, no imagenes ni carpetas ajenas. APP_IMAGE y FRONT_IMAGE
permiten otras etiquetas ya construidas. Scripts externos son evidencia local, no imagen.

## Pendientes antes de entrega publica

Confirmar y sustituir contactos demostrativos de src/config/contact.ts: WhatsApp
+57 300 000 0000 y hola@servibox.example. Aun consumidos por TermsPage, Toaster y
errorMessages; no son soporte real. Landing ya los omite; esta rama no publica contactos.
Pendientes revision manual de David durante la regresion del nuevo bloque, antes de
publicar, QA/configuracion Railway, servibox.co
aun sin comprar, TLS publico, backups/restauracion, secretos, politica de registro y
costos del mes. Sin servicios externos creados ni contratados. Sin pruebas de carga
o duracion prolongada. Healthchecks no demuestran disponibilidad integral de aplicacion
y base de datos.
