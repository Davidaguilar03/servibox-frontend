/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import { GLOSSARY } from './glossary'

// Guarda de copy: extrae con la API de TypeScript los literales de cadena y el texto JSX de
// src y falla con palabras sin tilde o jerga tecnica en texto visible. Ver docs/ai-context/06-COPY.md.

/**
 * Palabras que en la interfaz siempre llevan tilde (se buscan como palabra completa). No estan
 * las que son correctas sin tilde: guion, acciones, opciones, operaciones, aun (incluso).
 */
const UNACCENTED = [
  'telefono', 'informacion', 'numero', 'numeros', 'codigo', 'codigos', 'direccion', 'contrasena', 'facturacion',
  'categoria', 'categorias', 'credito', 'debito', 'periodo', 'periodos', 'tambien', 'ademas', 'sesion', 'razon',
  'valido', 'valida', 'invalido', 'invalida', 'minusculas', 'mayusculas', 'parentesis',
  'digitos', 'digito', 'ultimo', 'ultima', 'ultimos', 'dias', 'aqui', 'despues', 'operacion',
  'transaccion', 'descripcion', 'configuracion', 'anulacion', 'electronica', 'unico', 'unica', 'pagina',
  'busqueda', 'metodo', 'metodos', 'electronico', 'situacion', 'conexion', 'accion',
  'opcion', 'region', 'rapido', 'facil', 'numerico', 'basico', 'automaticamente',
  'todavia', 'manana', 'ano', 'anos', 'senal', 'credito', 'cedula', 'pais', 'telefonos',
]

/** Jerga tecnica que no debe verse. */
const JARGON = ['tenant', 'tenants', 'slug', 'undefined', 'NaN', 'null', 'token', 'endpoint', 'JSON', 'UUID', 'id']

const ROOT = 'src'

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return sourceFiles(path)
    return /\.(tsx?)$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name) ? [path] : []
  })
}

/** Una cadena que no es texto: ruta, clave, clase CSS, color, formato. */
function isCode(text: string): boolean {
  const value = text.trim()
  if (!value) return true
  if (value.startsWith('/') || value.includes('/api')) return true
  // Rutas relativas ('ventas/:id') y valores de enum del API ('TARJETA_CREDITO').
  if (!/\s/.test(value) && value.includes('/')) return true
  if (/^[A-Z0-9_]+$/.test(value)) return true
  // Una sola "palabra" en minusculas, con guiones o guion bajo: claves, parametros, rutas.
  if (/^[a-z0-9_\-.:#[\]%()=,]+$/.test(value)) return true
  // Lista de clases de Tailwind: cada pieza parece una clase.
  const tokens = value.split(/\s+/)
  if (tokens.length > 1 && tokens.every((token) => /^[!a-z0-9:_\-[\]/.()%#,=&>*@]+$/.test(token))) return true
  return false
}

const CLASS_ATTRIBUTES = new Set(['className', 'href', 'to', 'id', 'type', 'name', 'autoComplete', 'inputMode', 'role', 'key', 'htmlFor', 'rel', 'target'])

/** Textos visibles de un archivo: literales de cadena y texto JSX que no son codigo. */
export function visibleTexts(source: string, file = 'archivo.tsx'): string[] {
  const sf = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS)
  const texts: string[] = []
  function visit(node: ts.Node) {
    if (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) return
    if (ts.isJsxAttribute(node) && CLASS_ATTRIBUTES.has(node.name.getText())) return
    if (ts.isJsxText(node)) {
      const text = node.getText().trim()
      if (text) texts.push(text)
    } else if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      if (!isCode(node.text)) texts.push(node.text)
    } else if (ts.isTemplateExpression(node)) {
      const parts = [node.head.text, ...node.templateSpans.map((span) => span.literal.text)].join(' ')
      if (!isCode(parts)) texts.push(parts)
    }
    ts.forEachChild(node, visit)
  }
  visit(sf)
  return texts
}

/** Palabras sin tilde y jerga en los textos visibles de un archivo. */
export function copyViolations(source: string, file = 'archivo.tsx'): string[] {
  const found: string[] = []
  for (const text of visibleTexts(source, file)) {
    for (const word of UNACCENTED) {
      if (new RegExp(`(^|[^\\p{L}])${word}($|[^\\p{L}])`, 'iu').test(text)) found.push(`sin tilde "${word}": ${text}`)
    }
    for (const word of JARGON) {
      if (new RegExp(`(^|[^\\p{L}])${word}($|[^\\p{L}])`, word === word.toLowerCase() ? 'iu' : 'u').test(text)) {
        found.push(`jerga "${word}": ${text}`)
      }
    }
  }
  return found
}

const files = sourceFiles(ROOT)
  .map((path) => relative(ROOT, path).replaceAll('\\', '/'))
  .filter((file) => file !== 'config/contact.ts')

describe('guarda de copy', () => {
  it.each(files)('%s no tiene palabras sin tilde ni jerga visibles', (file) => {
    expect(copyViolations(readFileSync(join(ROOT, file), 'utf-8'), file)).toEqual([])
  })

  it('detecta palabras sin tilde y jerga, e ignora clases, rutas y claves', () => {
    const bad = `
      const a = 'Escribe el numero de telefono.'
      const b = <p className="text-small font-semibold">No hay sesion para este tenant</p>
      const c = \`El periodo \${x} no es valido\``
    expect(copyViolations(bad)).toEqual([
      'sin tilde "telefono": Escribe el numero de telefono.',
      'sin tilde "numero": Escribe el numero de telefono.',
      'sin tilde "sesion": No hay sesion para este tenant',
      'jerga "tenant": No hay sesion para este tenant',
      'sin tilde "periodo": El periodo   no es valido',
      'sin tilde "valido": El periodo   no es valido',
    ])
    const good = `
      const k = params.get('periodo')
      const r = '/api/sales/numero'
      const css = 'rounded-control text-small codigo'
      const t = <p className="codigo">Escribe el número de teléfono.</p>`
    expect(copyViolations(good)).toEqual([])
  })
})

describe('glosario', () => {
  // Solo texto visible: los patrones del backend son expresiones regulares y los comentarios no se extraen.
  const all = files.flatMap((file) => visibleTexts(readFileSync(join(ROOT, file), 'utf-8'), file)).join('\n')

  it('los terminos antiguos ya no aparecen en la interfaz', () => {
    for (const old of ['Ingresos ocasionales', 'Ingreso ocasional', 'Identificador de la serviteca', 'Umbral amarillo', 'Umbral rojo', 'umbral amarillo', 'umbral rojo', 'Método de pago', 'Tipo de pago', 'Bajo stock']) {
      expect(all, old).not.toContain(old)
    }
  })

  it('define los terminos oficiales', () => {
    expect(GLOSSARY.incomeNavigation).toBe('Ingresos')
    expect(GLOSSARY.expenseNavigation).toBe('Egresos')
    expect(GLOSSARY.treasury).toBe('Tesorería')
    expect(GLOSSARY.paymentType).toBe('Forma de pago')
    expect(GLOSSARY.paymentMethod).toBe('Medio de pago')
    expect(GLOSSARY.otherIncome).toBe('Otros ingresos')
    expect(GLOSSARY.tenantCode).toBe('Código de tu serviteca')
    expect(GLOSSARY.lowStockThreshold).toBe('Avisar con stock bajo en (unidades)')
    expect(GLOSSARY.criticalStockThreshold).toBe('Avisar con stock crítico en (unidades)')
  })
})
