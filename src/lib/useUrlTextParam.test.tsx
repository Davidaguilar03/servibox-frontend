import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider, useSearchParams } from 'react-router'
import { typeWithoutPause } from '../test/utils'
import { URL_TEXT_DEBOUNCE_MS, useUrlTextParam } from './useUrlTextParam'

/** Como en los listados: escribir q deja la pagina en 1 y reemplaza la entrada del historial. */
function Harness({ onWrite }: { onWrite: (value: string) => void }) {
  const [params, setParams] = useSearchParams()
  const field = useUrlTextParam(params.get('q') ?? '', (q) => {
    onWrite(q)
    const next = new URLSearchParams()
    if (q) next.set('q', q)
    setParams(next, { replace: true })
  })
  return <input aria-label="Buscar" {...field} />
}

function setup(path = '/') {
  const onWrite = vi.fn()
  const router = createMemoryRouter([{ path: '/', element: <Harness onWrite={onWrite} /> }], { initialEntries: [path] })
  const view = render(<RouterProvider router={router} />)
  const input = screen.getByLabelText<HTMLInputElement>('Buscar')
  return { router, onWrite, input, unmount: view.unmount }
}

const wait = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms))

describe('useUrlTextParam', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('escribir rapido conserva todos los caracteres y la URL recibe una sola escritura tras la espera', async () => {
    const { router, onWrite, input } = setup('/?pagina=3')

    typeWithoutPause(input, 'FV-0001 pap-rj')
    expect(input).toHaveValue('FV-0001 pap-rj')

    await wait(URL_TEXT_DEBOUNCE_MS - 1)
    expect(onWrite).not.toHaveBeenCalled()
    expect(router.state.location.search).toBe('?pagina=3')

    await wait(1)
    expect(onWrite).toHaveBeenCalledTimes(1)
    expect(onWrite).toHaveBeenCalledWith('FV-0001 pap-rj')
    expect(router.state.location.search).toBe('?q=FV-0001+pap-rj')
    expect(router.state.historyAction).toBe('REPLACE')
    expect(input).toHaveValue('FV-0001 pap-rj')
  })

  it('Enter y la salida del campo escriben de inmediato', async () => {
    const { router, onWrite, input } = setup()

    fireEvent.change(input, { target: { value: 'abc' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    await wait(0)
    expect(onWrite).toHaveBeenCalledWith('abc')
    expect(router.state.location.search).toBe('?q=abc')

    fireEvent.change(input, { target: { value: 'abcd' } })
    fireEvent.blur(input)
    await wait(0)
    expect(router.state.location.search).toBe('?q=abcd')

    await wait(URL_TEXT_DEBOUNCE_MS)
    expect(onWrite).toHaveBeenCalledTimes(2)
  })

  it('Enter o salir sin nada pendiente no escribe (no reinicia la pagina)', async () => {
    const { onWrite, input } = setup('/?q=abc&pagina=2')

    fireEvent.keyDown(input, { key: 'Enter' })
    fireEvent.blur(input)
    await wait(URL_TEXT_DEBOUNCE_MS)
    expect(onWrite).not.toHaveBeenCalled()
  })

  it('un cambio externo de la URL (atras, Limpiar, un enlace) actualiza el campo', async () => {
    const { router, input } = setup('/?q=uno')
    expect(input).toHaveValue('uno')

    await act(() => router.navigate('/?q=dos'))
    expect(input).toHaveValue('dos')

    await act(() => router.navigate('/'))
    expect(input).toHaveValue('')

    await act(() => router.navigate(-1))
    expect(input).toHaveValue('dos')
  })

  it('un cambio externo mientras se escribe no pierde lo digitado', async () => {
    const { router, onWrite, input } = setup()

    fireEvent.change(input, { target: { value: 'ab' } })
    await act(() => router.navigate('/?q=zz'))
    expect(input).toHaveValue('ab')

    await wait(URL_TEXT_DEBOUNCE_MS)
    expect(onWrite).toHaveBeenCalledWith('ab')
    expect(router.state.location.search).toBe('?q=ab')
    expect(input).toHaveValue('ab')
  })

  it('desmontar cancela la escritura pendiente', async () => {
    const { onWrite, input, unmount } = setup()

    fireEvent.change(input, { target: { value: 'ab' } })
    unmount()
    await wait(URL_TEXT_DEBOUNCE_MS)
    expect(onWrite).not.toHaveBeenCalled()
  })

  it('no escribe a mitad de una composicion IME, solo al terminarla', async () => {
    const { router, onWrite, input } = setup()

    fireEvent.compositionStart(input)
    fireEvent.change(input, { target: { value: 'ni' } })
    fireEvent.change(input, { target: { value: 'nih' } })
    fireEvent.keyDown(input, { key: 'Enter', isComposing: true })
    await wait(URL_TEXT_DEBOUNCE_MS * 3)
    expect(onWrite).not.toHaveBeenCalled()
    expect(input).toHaveValue('nih')

    fireEvent.change(input, { target: { value: '你好' } })
    fireEvent.compositionEnd(input)
    await wait(URL_TEXT_DEBOUNCE_MS)
    expect(onWrite).toHaveBeenCalledTimes(1)
    expect(onWrite).toHaveBeenCalledWith('你好')
    expect(new URLSearchParams(router.state.location.search).get('q')).toBe('你好')
  })
})
