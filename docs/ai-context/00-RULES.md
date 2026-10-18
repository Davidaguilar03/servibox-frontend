# Reglas para agentes de IA en este repositorio

Estas reglas aplican a cualquier agente de IA que lea o modifique codigo del frontend de
ServiBox. Son las mismas del backend (`servibox-backend/docs/ai-context/00-RULES.md`),
adaptadas a este repositorio.

## 1. Caracteres prohibidos

Nunca usar el caracter guion largo (em dash) ni el doble guion en codigo, comentarios,
mensajes de commit ni documentacion de esta carpeta. Usar coma, dos puntos o punto y coma.
Unica excepcion: los nombres de variables CSS y de utilidades de Tailwind, que el lenguaje
obliga a escribir con doble guion. En la documentacion se nombran sin el prefijo
(`color-brand`, no la variable completa).

## 2. Leer antes de escribir

Antes de tocar codigo, leer los archivos relevantes de `docs/ai-context/` segun lo que se
vaya a modificar:

* Estructura, rutas, cliente API o autenticacion: `01-ARCHITECTURE.md`
* Nombres, estilo, tokens visuales, textos de la interfaz: `02-CONVENTIONS.md`
* Motivo de una decision existente: `03-DECISIONS.md`

Las reglas de negocio y la terminologia (abono, pago, tercero, movimiento) las define el
backend en `servibox-backend/docs/ai-context/02-CONVENTIONS.md`. El frontend no las
redefine: las enlaza.

## 3. Actualizar el contexto en el mismo commit

Despues de cualquier cambio significativo (pantalla nueva, decision de arquitectura,
convencion nueva, token nuevo) se actualiza el archivo correspondiente de esta carpeta en
el mismo commit que el codigo. Un commit que cambia arquitectura sin actualizar el
contexto esta incompleto.

## 4. No duplicar contexto

Cada archivo tiene un tema unico. Si algo ya esta documentado en otro archivo, se enlaza
en vez de repetirlo. Ejemplo: `[ver cliente API](01-ARCHITECTURE.md)`.

## 5. Consistencia de idioma

Esta carpeta usa espanol o ingles segun convenga al tema, pero cada archivo debe mantener
un solo idioma de principio a fin. No mezclar dentro de un mismo archivo. Los archivos de
docs van sin tildes; los textos de la interfaz si las llevan (ver
[02-CONVENTIONS.md](02-CONVENTIONS.md)).

## 6. Verificar antes de dar por hecho

Un cambio no esta terminado hasta que pasan, sin errores ni advertencias:
`npm run build`, `npm run lint` y `npm test`.

## 7. Bitacora de sesiones

Las sesiones de trabajo relevantes se registran en `sessions/` con el formato
`AAAA-MM-DD-descripcion.md`.
