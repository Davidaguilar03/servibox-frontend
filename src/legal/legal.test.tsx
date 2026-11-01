/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { saveToken } from '../auth/session'
import { renderRoute, validToken } from '../test/utils'
import { POLICY_VERSION, PRIVACY_POLICY, TERMS, type LegalDocument } from './legalContent'

/** La copia de una version en docs/legal: encabezado y secciones "## titulo" con su parrafo. */
function record(kind: string) {
  const text = readFileSync(`docs/legal/${POLICY_VERSION}-${kind}.md`, 'utf-8').replaceAll('\r\n', '\n')
  const [head = '', ...blocks] = text.split(/^## /m)
  return {
    head,
    sections: blocks.map((block) => {
      const [title = '', ...body] = block.split('\n')
      return { title, body: body.join('\n').trim() }
    }),
  }
}

const documents: Array<[string, string, LegalDocument, string, string]> = [
  ['/politica-de-datos', 'politica-datos', PRIVACY_POLICY, 'Términos y condiciones', '/terminos'],
  ['/terminos', 'terminos', TERMS, 'Política de datos', '/politica-de-datos'],
]

describe('version de la politica', () => {
  it('tiene formato AAAA-MM-DD y es una fecha real', () => {
    expect(POLICY_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(`${POLICY_VERSION}T00:00:00Z`).toISOString().slice(0, 10)).toBe(POLICY_VERSION)
  })

  it.each(documents)('%s coincide con su copia en docs/legal: titulo, version, secciones y texto', (_path, kind, document) => {
    const copy = record(kind)
    expect(copy.head).toContain(`# ${document.title}`)
    expect(copy.head).toContain(document.version)
    expect(copy.head).toContain('registro inmutable')
    expect(copy.sections.map((section) => section.title)).toEqual(document.sections.map((section) => section.title))
    expect(copy.sections.map((section) => section.body)).toEqual(document.sections.map((section) => section.body))
  })

  it('la seccion de datos nombra los campos del formulario, los de la activacion y el registro de la aceptacion', () => {
    const data = PRIVACY_POLICY.sections[2]!.body
    expect(data).toContain('nombre comercial, NIT, teléfono y código de tu serviteca, y nombre completo y correo del administrador.')
    expect(data).toContain('Cuando activas tu cuenta, defines un nombre de usuario y una contraseña. También registramos la fecha y la versión de la política que aceptas.')
    expect(data).not.toMatch(/dirección|cédula/i)
  })
})

describe.each(documents)('pagina %s', (path, _kind, document, otherLabel, otherPath) => {
  it('sin sesion muestra un h1, la version, todas las secciones y los enlaces', async () => {
    renderRoute(path)

    const headings = await screen.findAllByRole('heading', { level: 1 })
    expect(headings).toHaveLength(1)
    expect(headings[0]).toHaveTextContent(document.title)
    expect(screen.getAllByRole('main')).toHaveLength(1)
    expect(screen.getByText(document.version)).toBeInTheDocument()
    expect(screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)).toEqual(document.sections.map((section) => section.title))
    for (const section of document.sections) {
      const region = within(screen.getByRole('region', { name: section.title }))
      expect(region.getByText((_, element) => element?.tagName === 'P' && element.textContent === section.body)).toBeInTheDocument()
    }
    expect(screen.getByRole('link', { name: 'Volver a la página principal' })).toHaveAttribute('href', '/')
    expect(screen.getByRole('link', { name: otherLabel })).toHaveAttribute('href', otherPath)
    for (const link of screen.getAllByRole('link', { name: 'hola@servibox.co' })) expect(link).toHaveAttribute('href', 'mailto:hola@servibox.co')
  })

  it('con sesion tambien se puede leer', async () => {
    saveToken(validToken())
    const router = renderRoute(path)

    expect(await screen.findByRole('heading', { level: 1, name: document.title })).toBeInTheDocument()
    expect(router.state.location.pathname).toBe(path)
  })
})

describe('politica de datos', () => {
  it('enlaza el sitio web y cita la Ley 1581', async () => {
    renderRoute('/politica-de-datos')

    expect(await screen.findByRole('link', { name: 'https://servibox.co' })).toHaveAttribute('href', 'https://servibox.co')
    expect(screen.getByText(/Ley 1581 de 2012/)).toBeInTheDocument()
  })
})
