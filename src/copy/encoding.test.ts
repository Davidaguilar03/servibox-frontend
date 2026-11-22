/// <reference types="node" />
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, expect, it } from 'vitest'

// Guarda de codificacion: un archivo UTF-8 releido como Windows-1252 convierte una vocal con tilde en dos
// caracteres (la e con tilde pasa a A con virgulilla mas el simbolo de copyright). Los patrones van con
// escapes para que este archivo no se detecte a si mismo.
const MOJIBAKE = /\u00c3[\u0080-\u00bf\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc\u2013\u2014\u2018-\u201e\u2020-\u2022\u2026\u2030\u2039\u203a\u20ac\u2122]|\u00c2[\u00a0-\u00bf]|\u00e2\u20ac|\ufffd/

const ROOT = 'src'

function textFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) return textFiles(path)
    return /\.(tsx?|css|json|svg|html|md)$/.test(entry.name) ? [path] : []
  })
}

function mojibakeLines(text: string): number[] {
  return text.split('\n').flatMap((line, index) => (MOJIBAKE.test(line) ? [index + 1] : []))
}

describe('guarda de codificacion', () => {
  it.each(textFiles(ROOT).map((path) => relative(ROOT, path).replaceAll('\\', '/')))('%s no tiene texto mal codificado', (file) => {
    expect(mojibakeLines(readFileSync(join(ROOT, file), 'utf-8'))).toEqual([])
  })

  it('detecta las secuencias tipicas y deja pasar el texto correcto', () => {
    const broken = ['Cr\u00c3\u00a9dito', 'est\u00c3\u00a1', 'Categor\u00c3\u00ada', 'c\u00c3\u00b3digo', 'Men\u00c3\u00ba', 'a\u00c3\u00b1o', 'n\u00c2\u00ba', 'raya \u00e2\u20ac\u201d', 'roto \ufffd']
    for (const text of broken) expect(mojibakeLines(text), text).toEqual([1])
    expect(mojibakeLines('Crédito, está, Categoría, código, Menú, año, ÁÉÍÓÚÑ, ¿Qué? ¡Listo!')).toEqual([])
  })
})
