/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

// Se lee del disco (ruta desde la raiz del proyecto): Vitest no procesa el CSS y un import ?raw
// llega vacio.
const css = readFileSync('src/styles/tokens.css', 'utf-8')

type Rgb = [number, number, number]

const raw = new Map([...css.matchAll(/--color-([\w-]+):\s*([^;]+);/g)].map((match) => [match[1]!, match[2]!.trim()]))

/** Valor de un token de color: hexadecimal, var() a otro token o color-mix con negro. */
function color(name: string): Rgb {
  const value = raw.get(name)
  if (value === undefined) throw new Error(`No existe el token color-${name}`)
  const alias = /^var\(--color-([\w-]+)\)$/.exec(value)
  if (alias) return color(alias[1]!)
  const mix = /^color-mix\(in srgb,\s*var\(--color-([\w-]+)\)\s*(\d+)%,\s*black\)$/.exec(value)
  if (mix) return color(mix[1]!).map((channel) => Math.round((channel * Number(mix[2])) / 100)) as Rgb
  const hex = /^#([0-9a-f]{6})$/i.exec(value)
  if (!hex) throw new Error(`Valor no soportado en color-${name}: ${value}`)
  return [0, 2, 4].map((index) => parseInt(hex[1]!.slice(index, index + 2), 16)) as Rgb
}

function luminance([r, g, b]: Rgb) {
  const linear = (channel: number) => {
    const c = channel / 255
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  return 0.2126 * linear(r) + 0.7152 * linear(g) + 0.0722 * linear(b)
}

/** Razon de contraste WCAG 2.1 entre dos tokens. */
function contrast(foreground: string, background: string) {
  const [light, dark] = [luminance(color(foreground)), luminance(color(background))].sort((a, b) => b - a)
  return (light! + 0.05) / (dark! + 0.05)
}

// Pares texto sobre fondo (4.5 a 1) y bordes de controles (3 a 1) que usa la interfaz.
const TEXT_PAIRS: Array<[string, string]> = [
  ['text-inverse', 'action'],
  ['text-inverse', 'action-hover'],
  ['text-inverse', 'action-active'],
  ['text-inverse', 'danger'],
  ['text-inverse', 'danger-hover'],
  ['text-inverse', 'danger-active'],
  ['success-ink', 'success-bg'],
  ['warning-ink', 'warning-bg'],
  ['error-ink', 'error-bg'],
  ['info-ink', 'info-bg'],
  ['success-ink', 'surface'],
  ['success-ink', 'row-alt'],
  ['success-ink', 'neutral-100'],
  ['error', 'surface'],
  ['text-muted', 'surface'],
  ['text-muted', 'canvas'],
  ['text-muted', 'neutral-200'],
  ['text-muted', 'error-bg'],
  ['brand-ink', 'surface'],
  ['brand-ink', 'canvas'],
  ['text-subtle', 'nav'],
]

const CONTROL_BORDERS: Array<[string, string]> = [
  ['border-control', 'surface'],
  ['border-control', 'canvas'],
  ['border-control', 'row-alt'],
  ['brand', 'surface'],
  ['error', 'surface'],
]

describe('contraste de los tokens', () => {
  it.each(TEXT_PAIRS)('%s sobre %s llega a 4.5 a 1', (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.5)
  })

  it.each(CONTROL_BORDERS)('borde %s sobre %s llega a 3 a 1', (foreground, background) => {
    expect(contrast(foreground, background)).toBeGreaterThanOrEqual(3)
  })

  it('calcula la razon de referencia de WCAG', () => {
    // Negro sobre blanco es 21 a 1; brand con texto blanco es el caso que dejo de usarse.
    expect(contrast('text-inverse', 'overlay')).toBeGreaterThan(17)
    expect(contrast('text-inverse', 'brand')).toBeLessThan(4.5)
  })
})
