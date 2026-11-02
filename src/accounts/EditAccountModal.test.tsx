import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { saveToken } from '../auth/session'
import { Toaster } from '../components/Toaster'
import type { Account } from '../dashboard/dashboardApi'
import { jsonResponse, validToken } from '../test/utils'
import { MESSAGES } from '../api/errorMessages'
import { EditAccountModal } from './AccountModals'
import { validateAccountEdit } from './accountForms'

const account: Account = { id: 2, name: 'Banco prueba', type: 'BANCO', initialBalance: 100000.57, currentBalance: 40000.57, color: '#4B5563' }

function setup(response: () => Response | Promise<Response> = () => jsonResponse(account), selected = account) {
  const fetchMock = vi.fn(response)
  vi.stubGlobal('fetch', fetchMock)
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } })
  const keys = [
    ['treasury', 'accounts'], ['treasury', 'balance'], ['treasury', 'movements', 'periodo', '2026-10-01', '2026-10-25'],
    ['treasury', 'movements', 'sale', 1], ['kpis', '2026-10-01', '2026-10-25'],
  ]
  keys.forEach((key) => client.setQueryData(key, []))
  const onClose = vi.fn()
  render(<QueryClientProvider client={client}><EditAccountModal account={selected} onClose={onClose} /><Toaster /></QueryClientProvider>)
  return { user: userEvent.setup(), fetchMock, client, keys, onClose }
}

const name = () => screen.getByLabelText('Nombre')
const balance = () => screen.getByLabelText('Saldo inicial')
const save = () => screen.getByRole('button', { name: 'Guardar cambios' })

describe('editar cuenta', () => {
  beforeEach(() => saveToken(validToken()))

  it('precarga el color persistido y permite guardar solo color sin redondear el saldo', async () => {
    const { user, fetchMock, onClose } = setup(undefined, { ...account, color: '#123ABC' })
    expect(screen.getByLabelText('Otro color')).toHaveValue('#123abc')
    expect(screen.getByText('Color elegido: #123ABC')).toBeInTheDocument()
    expect(save()).toBeDisabled()
    await user.click(screen.getByRole('button', { name: 'Violeta' }))
    expect(screen.getByRole('button', { name: 'Violeta' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Otro color')).toHaveValue('#7c3aed')
    await user.click(save())
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith('/api/treasury/accounts/2', expect.objectContaining({
      method: 'PUT', body: JSON.stringify({ name: account.name, initialBalance: 100000.57, color: '#7C3AED' }),
    }))
  })

  it('propone el fallback de una cuenta null y lo guarda al confirmar sin otros cambios', async () => {
    const { user, fetchMock, onClose } = setup(undefined, { ...account, color: null })
    expect(screen.getByRole('button', { name: 'Gris' })).toHaveAttribute('aria-pressed', 'true')
    expect(save()).toBeEnabled()
    await user.click(save())
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith('/api/treasury/accounts/2', expect.objectContaining({
      method: 'PUT', body: JSON.stringify({ name: account.name, initialBalance: 100000.57, color: '#4B5563' }),
    }))
  })

  it('cancelar una propuesta heredada intacta no envia ni pide descartar', async () => {
    const { user, fetchMock, onClose } = setup(undefined, { ...account, color: null })
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument()
  })

  it('sincroniza teclado, paleta y selector nativo y recupera el estado sin cambios', async () => {
    const { user, fetchMock } = setup()
    const blue = screen.getByRole('button', { name: 'Azul' })
    blue.focus()
    await user.keyboard(' ')
    expect(blue).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByLabelText('Otro color')).toHaveValue('#2563eb')
    expect(save()).toBeEnabled()
    fireEvent.change(screen.getByLabelText('Otro color'), { target: { value: '#ffffff' } })
    expect(screen.getByText('Color elegido: #FFFFFF')).toBeInTheDocument()
    expect(screen.queryAllByRole('button', { pressed: true })).toHaveLength(0)
    await user.click(screen.getByRole('button', { name: 'Gris' }))
    expect(save()).toBeDisabled()
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('descartar solo el color no persiste y seguir editando conserva la eleccion', async () => {
    const { user, fetchMock, onClose } = setup()
    await user.click(screen.getByRole('button', { name: 'Azul' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(screen.getByRole('button', { name: 'Azul' })).toHaveAttribute('aria-pressed', 'true')
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onClose).toHaveBeenCalledOnce()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(account.color).toBe('#4B5563')
  })

  it('un rechazo de color conserva todos los campos y permite reintentar', async () => {
    let attempts = 0
    const { user, onClose } = setup(() => ++attempts === 1
      ? jsonResponse({ error: 'El color debe tener el formato #RRGGBB', status: 400 }, 400)
      : jsonResponse({ ...account, color: '#FFFFFF' }))
    fireEvent.change(screen.getByLabelText('Otro color'), { target: { value: '#ffffff' } })
    fireEvent.change(name(), { target: { value: 'Banco nuevo' } })
    fireEvent.change(balance(), { target: { value: '100,105' } })
    await user.click(save())
    expect(await screen.findByRole('alert')).toHaveTextContent('El color debe tener el formato #RRGGBB.')
    expect(name()).toHaveValue('Banco nuevo')
    expect(balance()).toHaveValue('100,105')
    expect(screen.getByLabelText('Otro color')).toHaveValue('#ffffff')
    expect(onClose).not.toHaveBeenCalled()
    await user.click(save())
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('precarga nombre, decimales y tipo de solo lectura; volver al original deshabilita guardar', async () => {
    const { user, fetchMock } = setup()
    expect(name()).toHaveValue('Banco prueba')
    expect(balance()).toHaveValue('100.000,57')
    expect(screen.getByLabelText('Tipo')).toHaveValue('Banco')
    expect(screen.getByLabelText('Tipo')).toHaveAttribute('readonly')
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
    expect(save()).toBeDisabled()
    await user.type(name(), ' nuevo')
    expect(save()).toBeEnabled()
    fireEvent.change(name(), { target: { value: account.name } })
    expect(save()).toBeDisabled()
    await user.type(name(), '{Enter}')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['name', '', 'Escribe el nombre de la cuenta.'],
    ['name', 'a'.repeat(101), 'El nombre admite hasta 100 caracteres.'],
    ['initialBalance', '', 'Escribe el saldo inicial.'],
    ['initialBalance', '9'.repeat(310), 'El saldo inicial debe ser un número finito mayor o igual a cero.'],
  ])('valida %s = %s al salir y al enviar, con foco y resumen', async (field, value, message) => {
    const { user, fetchMock } = setup()
    const input = field === 'name' ? name() : balance()
    fireEvent.change(input, { target: { value } })
    fireEvent.blur(input)
    expect(input).toHaveAccessibleDescription(message)
    expect(save()).toBeEnabled()
    await user.click(save())
    expect(input).toHaveFocus()
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa el campo marcado.')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['0', '70000,53', '100000,57'])('envia %s sin redondear ni campos inmutables y refresca tesoreria', async (amount) => {
    const { user, fetchMock, client, keys, onClose } = setup()
    fireEvent.change(name(), { target: { value: 'Banco nuevo' } })
    fireEvent.change(balance(), { target: { value: amount } })
    await user.click(save())
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith('/api/treasury/accounts/2', expect.objectContaining({
      method: 'PUT', body: JSON.stringify({ name: 'Banco nuevo', initialBalance: Number(amount.replace(',', '.')), color: account.color }),
    }))
    expect(await screen.findByText('Cuenta actualizada')).toBeInTheDocument()
    keys.slice(0, 4).forEach((key) => expect(client.getQueryState(key)?.isInvalidated).toBe(true))
    expect(client.getQueryState(keys[4]!)?.isInvalidated).toBe(false)
  })

  it('escribe con punto de miles, envia el numero y al volver al original no hay cambios', async () => {
    const { user, fetchMock, onClose } = setup()
    await user.clear(balance())
    await user.type(balance(), '1500000')
    expect(balance()).toHaveValue('1.500.000')
    expect(save()).toBeEnabled()
    await user.clear(balance())
    await user.type(balance(), '100000,57')
    expect(balance()).toHaveValue('100.000,57')
    expect(save()).toBeDisabled()
    await user.clear(balance())
    await user.type(balance(), '1500000,5')
    await user.click(save())
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledWith('/api/treasury/accounts/2', expect.objectContaining({
      body: JSON.stringify({ name: account.name, initialBalance: 1500000.5, color: account.color }),
    }))
  })

  it('permite renombrar con saldo actual negativo sin cambiar el inicial', async () => {
    const { user, fetchMock, onClose } = setup(undefined, { ...account, currentBalance: -300 })
    await user.type(name(), ' nuevo')
    await user.click(save())
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
    expect(fetchMock).toHaveBeenCalledOnce()
  })

  it('conserva un inicial heredado negativo y muestra la limitacion de validacion', async () => {
    const { user, fetchMock } = setup(undefined, { ...account, initialBalance: -5 })
    expect(balance()).toHaveValue('-5')
    await user.type(name(), ' nuevo')
    await user.click(save())
    expect(balance()).toHaveAttribute('aria-invalid', 'true')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    ['Ya existe una cuenta con el nombre Banco nuevo', 'name', 'Ya existe una cuenta con el nombre Banco nuevo.'],
    ['Saldo insuficiente en Banco prueba: faltan $ 10.000 para cambiar el saldo inicial', 'initialBalance', 'Saldo insuficiente en Banco prueba: faltan $ 10.000 para cambiar el saldo inicial.'],
  ])('distingue %s y permite corregir y reintentar', async (error, field, message) => {
    let attempts = 0
    const { user, onClose } = setup(() => ++attempts === 1 ? jsonResponse({ error, status: 409 }, 409) : jsonResponse(account))
    fireEvent.change(name(), { target: { value: 'Banco nuevo' } })
    fireEvent.change(balance(), { target: { value: '50000,57' } })
    await user.click(save())
    const input = field === 'name' ? name() : balance()
    await waitFor(() => expect(input).toHaveAccessibleDescription(message))
    expect(input).toHaveFocus()
    expect(name()).toHaveValue('Banco nuevo')
    expect(balance()).toHaveValue('50.000,57')
    expect(screen.getByRole('alert')).toHaveTextContent('Revisa el campo marcado.')
    fireEvent.change(input, { target: { value: field === 'name' ? 'Banco unico' : '70000,57' } })
    expect(input).not.toHaveAttribute('aria-invalid')
    await user.click(save())
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('un 409 desconocido queda en alerta con foco, sin marcar Nombre', async () => {
    const { user } = setup(() => jsonResponse({ error: 'Conflicto', status: 409 }, 409))
    await user.type(name(), ' nuevo')
    await user.click(save())
    const alert = await screen.findByRole('alert')
    expect(alert).toHaveTextContent(MESSAGES.conflict)
    expect(alert.parentElement).toHaveFocus()
    expect(name()).not.toHaveAttribute('aria-invalid')
  })

  it.each([0, 500, 403, 404])('error %i en toast persistente y valores conservados', async (status) => {
    const { user, onClose } = setup(() => {
      if (!status) return Promise.reject(new TypeError('Failed to fetch'))
      return jsonResponse({ error: 'Error', status }, status)
    })
    await user.type(name(), ' nuevo')
    await user.click(save())
    const toast = await screen.findByRole('alert')
    expect(toast).toHaveTextContent(status === 403 ? MESSAGES.forbidden : status === 404 ? MESSAGES.notFound : MESSAGES.network)
    expect(within(toast).getByRole('button', { name: 'Cerrar aviso' })).toBeInTheDocument()
    expect(name()).toHaveValue('Banco prueba nuevo')
    expect(save()).toBeEnabled()
    expect(onClose).not.toHaveBeenCalled()
    expect(within(screen.getByRole('dialog')).queryByRole('alert')).not.toBeInTheDocument()
  })

  it.each(['Cancelar', 'Cerrar', 'Escape', 'fondo'])('protege cambios al cerrar por %s, conserva o descarta', async (via) => {
    const { user, onClose } = setup()
    await user.type(name(), ' nuevo')
    const close = async () => {
      if (via === 'Escape') await user.keyboard('{Escape}')
      else if (via === 'fondo') fireEvent.mouseDown(screen.getByRole('dialog').parentElement!)
      else await user.click(screen.getByRole('button', { name: via }))
    }
    await close()
    expect(await screen.findByRole('dialog', { name: '¿Descartar los cambios?' })).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Seguir editando' }))
    expect(name()).toHaveValue('Banco prueba nuevo')
    await close()
    await user.click(screen.getByRole('button', { name: 'Descartar' }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('cierra sin cambios y protege cierre y doble envio por boton o Enter mientras espera', async () => {
    let finish!: (response: Response) => void
    const { user, fetchMock, onClose } = setup(() => new Promise((resolve) => { finish = resolve }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(onClose).toHaveBeenCalledOnce()
    onClose.mockClear()
    await user.type(name(), ' nuevo')
    const button = save()
    act(() => {
      fireEvent.click(button)
      fireEvent.keyDown(name(), { key: 'Enter' })
      fireEvent.click(button)
    })
    await waitFor(() => expect(fetchMock).toHaveBeenCalledOnce())
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await user.keyboard('{Escape}')
    await user.click(screen.getByRole('button', { name: 'Cerrar' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar' }))
    fireEvent.mouseDown(screen.getByRole('dialog').parentElement!)
    expect(onClose).not.toHaveBeenCalled()
    expect(screen.queryByRole('dialog', { name: '¿Descartar los cambios?' })).not.toBeInTheDocument()
    await act(async () => finish(jsonResponse(account)))
    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })
})

it('valida saldo vacio distinto de cero en edicion y conserva decimales admitidos', () => {
  expect(validateAccountEdit({ name: 'Banco', initialBalance: '', color: '#4B5563' })).toHaveProperty('initialBalance')
  expect(validateAccountEdit({ name: 'Banco', initialBalance: '0', color: '#4B5563' })).toEqual({})
  expect(validateAccountEdit({ name: 'Banco', initialBalance: '100.000,57', color: '#4B5563' })).toEqual({})
  // El campo ya no deja escribir letras ni signo, pero la regla sigue: un heredado negativo llega aqui.
  for (const initialBalance of ['abc', '-1']) {
    expect(validateAccountEdit({ name: 'Banco', initialBalance, color: '#4B5563' }).initialBalance).toBe(
      'El saldo inicial debe ser un número finito mayor o igual a cero.',
    )
  }
})
