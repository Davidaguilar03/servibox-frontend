# 2026-10-30: Navegacion agrupada del panel de serviteca

Se puede continuar con el cierre Git autorizado por David el 2026-10-30.
David aprobo visualmente el sidebar, iconos y animaciones. Sin navegador del agente.
La revision manual Docker global sigue aplazada y obligatoria antes de publicar;
la aprobacion visual del sidebar no cumple esa revision.

## Cierre autorizado y verificacion final

* David aprobo sidebar, iconos y animaciones. Autorizo commit, push y PR hacia main
  con titulo y mensaje feat/45-sidebar-navigation. Rama conservada, sin merge.
* Suite frontend completa ejecutada de nuevo tras la correccion: 65 archivos,
  1449/1449 pruebas aprobadas, 0 fallos y 0 pendientes, 79.60 s.
  Los 1448 anteriores y los 372 parciales no sustituyen esta ejecucion final.
* Total real: 1426 base mas 23 nuevas; 46 casos de la base ajustados por etiquetas
  o consultas acotadas al contenido, 0 retirados. La correccion amplio ademas
  16 de los casos nuevos del sidebar y agrego el caso de iconos.
  Se conservan todas las aserciones de negocio; el detalle figura mas abajo.
* npm run build y npm run lint: salida 0, sin advertencias de compilacion o lint.
  Diff de trabajo comprobado sin errores de whitespace.
* Revision completa del diff: rutas y query strings, guard de permisos,
  formulas, contratos, llamadas API y acciones existentes intactos.
  Cambios limitados a navegacion, etiquetas, accesibilidad, pruebas y documentacion.
* Unico archivo nuevo: esta nota. Sin secretos detectados en las lineas agregadas,
  temporales o archivos ajenos en la seleccion propia. AGENTS.md, dependencias,
  Vite, Docker/proxy y contactos intactos. Backend no modificado por esta tarea.
* La revision manual Docker sigue aplazada hasta la regresion del nuevo bloque,
  obligatoria antes de publicar. Sin navegador del agente ni procesos propios activos.
  Superadministrador, solicitudes, activacion y contactos reales pendientes.
  Railway y dominio sin publicar ni probar.

## Git y alcance

Main limpio y actualizado con origin/main en 10922f3, merge del PR 46 verificado
en git log tras fetch. Rama feat/45-sidebar-navigation libre tanto local como remota,
creada desde ese main. Implementacion sin commit, push ni PR hasta el cierre autorizado.
El cierre usa feat/45-sidebar-navigation como mensaje de commit y titulo del PR,
con base main, sin merge ni cambio de rama. AGENTS.md y backend intactos;
sin leer ni ejecutar backend, sin HTTP financiero, Docker/proxy o contactos.
La seccion 7 del informe externo es una propuesta estatica, no evidencia de funciones
de plataforma ya implementadas. No se implementan plataforma, solicitudes ni activacion.

En el cierre se consulta solo el estado Git del backend hermano: tiene cambios ajenos
en .idea/compiler.xml y .idea/servibox-backend.iml. No se modifican ni se incluyen en
este PR. No se ejecuta backend ni se inspeccionan sus archivos de negocio.

## Comportamiento

Orden: Inicio; Ingresos (Facturas de venta /ventas, Otros ingresos /ventas/ingresos,
Clientes /ventas/clientes); Egresos (Facturas de compra /compras, Gastos operativos
/compras/gastos, Proveedores /compras/proveedores); Inventario /inventario;
Tesoreria /cuentas; Reportes /reportes. Configuracion y usuario siguen abajo.
Marca, favicon, tokens, control de ancho y acciones dentro de paginas conservados.

Padres como botones nativos, independientes, con aria-expanded/aria-controls;
hijos en listas anidadas, sin role menu. Pathname determina seleccion unica y padre
activo, incluso cerrado. Alta, detalle y papelera activan Facturas. Entradas directas,
recarga, navegacion e historial abren el grupo correspondiente; query tambien reabre.
El usuario puede cerrarlo hasta la siguiente navegacion. No hay rutas ficticias
ni nuevas preferencias persistidas de grupos.

Enter/Espacio alternan grupos; hijos ocultos quedan fuera de Tab. Cerrar recupera
foco en el padre. Compacto: activar padre expande el shell, recuerda expanded en
servibox.sidebar y deja foco en el padre; Tab llega al primer hijo. Contraer, incluso
por cambio de ancho sin preferencia explicita, recupera foco en el control superior.
Movil: padre mantiene panel, hijo navega y cierra. Se corrige perdida de foco al
desmontar pagina de origen: retorno al boton de menu del destino. Escape, foco
contenido, fondo inerte, SkipLink, Configuracion y usuario se conservan.

Tesoreria es etiqueta, titulo principal y miga de modulo. Con una cuenta elegida,
el titulo de pestana sigue su nombre y la miga agrega esa cuenta. Se mantienen
cuenta, Nueva cuenta, nombres y todas las entidades reales. Ingresos/Egresos son
agrupadores, sin cambiar reglas financieras, contratos, filtros, calculos o exportadores.

## Archivos

* src/layout/AppShell.tsx: orden, grupos, seleccion, teclado y foco movil/compacto.
* src/routes.tsx: solo etiquetas de migas y titulo de modulo; rutas intactas.
* src/layout/breadcrumb.ts: ejemplo actualizado en comentario.
* src/copy/glossary.ts: incomeNavigation, expenseNavigation y treasury.
* src/pages/AccountsPage.tsx: titulo principal desde glosario.
* Pruebas: src/layout/AppShell.test.tsx, src/copy/copy.test.ts,
  src/auth/RequireAuth.test.tsx, src/pages/AccountsPage.test.tsx,
  src/components/lists.test.tsx, src/counterparties/CounterpartiesPage.test.tsx,
  src/manualMovements/ManualMovementsPage.test.tsx y src/pages/ReportsPage.test.tsx.
* Contexto: 01-ARCHITECTURE.md, 03-DECISIONS.md, 05-DESIGN-SYSTEM.md,
  06-COPY.md y esta nota.

## Pruebas existentes ajustadas

Validacion de la primera entrega, anterior a la correccion de iconos y movimiento:

* Base real ejecutada: 65 archivos, 1426/1426 pruebas aprobadas.
* Suite completa final: 65 archivos, 1448/1448 aprobadas, 0 fallos y 0 pendientes.
  Total: 1426 base mas 22 nuevas; 46 casos existentes ajustados, 0 retirados.
* Corrida dirigida final de los cinco archivos que habian fallado: 150/150 aprobadas.
* npm run build: salida 0, TypeScript y Vite sin advertencias de compilacion.
* npm run lint: salida 0, sin advertencias.
* git diff: comprobacion de whitespace correcta. Sin cambios en AGENTS.md,
  dependencias, configuracion de Vite o despliegue.
* No se iniciaron servidores ni navegador; no quedan procesos propios activos
  ni carpetas temporales creadas por esta tarea.

46 casos existentes afectados por cambios de etiquetas o alcance de consultas:

* AppShell: titulo de /cuentas, Configuracion separada de operaciones y titulo con
  cuenta elegida, tres casos. El orden plano esperado pasa a enlaces superiores
  visibles; el caso nuevo verifica todo el orden y destinos incluyendo grupos.
* copy: define los terminos oficiales, un caso ampliado con las tres claves.
* RequireAuth: al cerrar sesion vuelve a /login, un caso; espera Tesoreria.
* AccountsPage: helper setup compartido por sus 29 casos espera Tesoreria.
  Sin alterar aserciones de negocio, nombres de cuentas ni grupo Cuentas.
* lists: caso /cuentas del unico primario, un caso, actualiza titulo esperado.
* CounterpartiesPage: Facturas de venta lleva a Clientes y Facturas de compra a
  Proveedores, un caso; busca enlaces dentro de main, conservando accesos internos.
* ManualMovementsPage: los dos accesos desde listados de facturas buscan dentro de
  main, pues ahora tambien existen enlaces del sidebar.
* ReportsPage: ocho casos de precision/orden, paginacion global y por cuenta,
  recarga, carga personalizada, reintento, vacio y error de cuentas. Las consultas de
  Ingresos/Egresos se acotan a main para distinguir totales de botones del sidebar.
  Se mantienen cifras, precision, transferencias, descarga y restantes guardas.

22 casos nuevos en AppShell: dos moviles, orden y destinos, doce entradas directas,
dos de teclado y cierre con foco, historial/query, recarga sin persistencia, cambio
de ancho con recuperacion de foco y dos compactos por teclado. Ninguna prueba retirada.

La primera corrida dirigida detecto dos fallos de retorno de foco movil, corregidos.
La primera completa con cambios detecto 24 fallos: doce aserciones nuevas consultaban
handle en el nivel equivocado del router, y doce casos existentes requerian las
actualizaciones de alcance/etiquetas anteriores. Sin cambios de negocio para resolverlos.

## Correccion: iconos y movimiento

Antes de la correccion, David comprobo que los desplegables funcionaban. Se conservaron
los cambios en feat/45-sidebar-navigation, entonces sin commit, push ni PR.
Esa comprobacion inicial no aprobaba aun los nuevos iconos o la animacion;
David los aprobo despues al autorizar el cierre. Docker sigue pendiente.

AppShell usa TrendingUp/TrendingDown en los padres y agrega iconos a todos los hijos:
ShoppingCart, CirclePlus, Users, Truck, Receipt y Truck, en el orden del menu.
Facturas conserva sus iconos previos; todos usan iconMd, trazo 1.5, aria-hidden,
espaciado uniforme y colores existentes. No se cambian rutas ni acciones.

Apertura y cierre por altura natural con rejilla 0fr/1fr, duration-base y ease-standard;
indicador con giro suave. Sin alturas maximas, timers, desmontaje ni estado inicial
oculto para la ruta activa. Movimiento reducido desactiva las transiciones.
Al cerrar, los hijos quedan inert, aria-hidden y con tabIndex negativo inmediatamente,
aunque continue la salida visual; la trampa movil excluye elementos inert.
Se conservan recuperacion de foco, teclado, preferencia de ancho y navegacion movil.

Pruebas de esta correccion: un caso nuevo de iconos decorativos, nombres accesibles,
escala y trazo; 16 casos de AppShell ampliados (12 entradas directas visibles desde
el primer render, dos cierres por teclado y dos cierres/reaperturas moviles).
No se retiran pruebas. Cambios propios: AppShell.tsx, AppShell.test.tsx,
05-DESIGN-SYSTEM.md y esta nota. Sin backend, negocio, dependencias ni navegador.

Verificacion de la correccion:

* Corrida parcial final: AppShell.test.tsx (52 casos), designSystem.test.ts y
  copy.test.ts, 372/372 aprobadas en tres archivos, 0 fallos.
* npm run build y npm run lint: salida 0, sin advertencias.
* Comprobacion de whitespace del diff: correcta; AGENTS.md, dependencias,
  configuracion de Vite y despliegue sin cambios.
* En esa correccion no se repitio la suite completa. Los 1448/1448 de la primera entrega son evidencia
  anterior, no una ejecucion completa de esta correccion; el caso nuevo lleva el
  total definido a 1449, aun sin corrida completa de ese total en ese momento.
* Sin procesos propios activos. Entonces pendiente revision visual de David: iconos,
  apertura/cierre y giro, movimiento reducido, compacto, movil y teclado.

## Revision manual

Desde la raiz del frontend, ejecutar en PowerShell:

```powershell
npm run dev
```

Abrir http://localhost:5173/inicio (usar el puerto indicado por Vite si 5173 esta ocupado)
con la sesion habitual y backend disponible segun
el entorno de David; si no hay sesion, el guard lleva al login. Revisar expandido,
compacto, movil, teclado, orden, sangria, seleccion, cierre deliberado, historial,
Tesoreria, Configuracion y usuario. Revisar tambien los iconos de padres e hijos,
apertura y cierre suaves, giro del indicador y movimiento reducido, tanto en
expandido/compacto como en movil y con teclado. Detener con Ctrl+C.
No se inicia ningun servidor ni navegador para esta tarea. Esta revision del sidebar
no cumple la revision Docker aplazada. No se comparan importes con API/exportaciones,
pues no se cambian ni ejecutan esos contratos; las pruebas existentes los conservan.
