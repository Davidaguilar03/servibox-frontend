import { readFileSync } from 'node:fs'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { describe, expect, it } from 'vitest'
import { Wordmark } from './Wordmark'
import { WordmarkLink } from './WordmarkLink'

describe('marca provisional', () => {
  it('el contorno de la S esta centrado y dentro del margen, sin fuentes ni transformaciones externas', () => {
    const svg = new DOMParser().parseFromString(readFileSync('src/brand/symbol.svg', 'utf8'), 'image/svg+xml')
    expect(svg.documentElement.getAttribute('preserveAspectRatio')).toBe('xMidYMid meet')
    expect(svg.querySelector('text, image, use, [transform], [clip-path]')).toBeNull()
    const path = svg.querySelector('path')!.getAttribute('d')!
    // Coordenadas absolutas: los controles de las curvas tambien quedan dentro del margen.
    expect(path.replace(/[MLQZ\d.\s-]/g, '')).toBe('')
    const coordinates = path.match(/-?\d+(?:\.\d+)?/g)!.map(Number)
    const x = coordinates.filter((_, i) => i % 2 === 0)
    const y = coordinates.filter((_, i) => i % 2 === 1)
    for (const axis of [x, y]) {
      expect(Math.min(...axis)).toBeGreaterThanOrEqual(12)
      expect(Math.max(...axis)).toBeLessThanOrEqual(52)
      expect((Math.min(...axis) + Math.max(...axis)) / 2).toBeCloseTo(32, 1)
    }
  })

  it('la marca completa y la compacta comparten simbolo y nombre accesible', () => {
    const { rerender } = render(<Wordmark />)
    const full = screen.getByRole('img', { name: 'ServiBox' })
    const symbol = full.querySelector('img')?.getAttribute('src')
    expect(symbol).toBeTruthy()
    expect(full).toHaveTextContent('ServiBox')
    rerender(<Wordmark compact onDark />)
    const compact = screen.getByRole('img', { name: 'ServiBox' })
    expect(compact.querySelector('img')).toHaveAttribute('src', symbol)
    expect(compact).toHaveTextContent('')
  })

  it.each([false, true])('el enlace publico conserva destino y nombre, sobre oscuro %s', (onDark) => {
    render(<MemoryRouter><WordmarkLink onDark={onDark} /></MemoryRouter>)
    const link = screen.getByRole('link', { name: 'ServiBox, ir a la página principal' })
    expect(link).toHaveAttribute('href', '/')
    expect(link).toContainElement(screen.getByRole('img', { name: 'ServiBox' }))
  })

  it('declara un unico favicon SVG y usa el mismo recurso vectorial que el simbolo', () => {
    const html = new DOMParser().parseFromString(readFileSync('index.html', 'utf8'), 'text/html')
    const icons = html.querySelectorAll('link[rel~="icon"]')
    expect(icons).toHaveLength(1)
    const icon = icons[0]!
    expect(icon.getAttribute('type')).toBe('image/svg+xml')
    expect(icon.getAttribute('sizes')).toBe('any')
    const path = icon.getAttribute('href')!.slice(1)
    const svg = new DOMParser().parseFromString(readFileSync(path, 'utf8').replace(/>\s+</g, '><'), 'image/svg+xml')
    expect(svg.documentElement.tagName).toBe('svg')
    expect(svg.documentElement.getAttribute('viewBox')).toBe('0 0 64 64')
    expect(svg.querySelector('path')).not.toBeNull()
    expect(svg.querySelector('image, text, parsererror')).toBeNull()
    const brandColor = /--color-brand:\s*([^;]+);/.exec(readFileSync('src/styles/tokens.css', 'utf8'))?.[1]
    expect(svg.querySelector('rect')?.getAttribute('fill')).toBe(brandColor)
    render(<Wordmark compact />)
    const src = screen.getByRole('img', { name: 'ServiBox' }).querySelector('img')!.getAttribute('src')!
    // Vite puede incluir el SVG pequeno como data URI: se compara el vector, no su URL.
    const renderedSource = src.startsWith('data:')
      ? decodeURIComponent(src.slice(src.indexOf(',') + 1))
      : readFileSync(src.slice(1), 'utf8')
    const rendered = new DOMParser().parseFromString(renderedSource.replace(/>\s+</g, '><'), 'image/svg+xml')
    expect(rendered.documentElement.isEqualNode(svg.documentElement)).toBe(true)
  })
})
