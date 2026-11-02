import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AmountField } from './AmountField'

function Harness({ initial = '', onChange = () => {} }: { initial?: string; onChange?: (value: string) => void }) {
  const [value, setValue] = useState(initial)
  return (
    <AmountField
      label="Monto"
      hint="En pesos."
      value={value}
      onValueChange={(next) => {
        setValue(next)
        onChange(next)
      }}
    />
  )
}

function setup(initial?: string, onChange?: (value: string) => void) {
  render(<Harness initial={initial} onChange={onChange} />)
  return { user: userEvent.setup(), input: screen.getByLabelText<HTMLInputElement>('Monto') }
}

async function placeCaret(user: ReturnType<typeof userEvent.setup>, input: HTMLInputElement, position: number) {
  await user.click(input)
  input.setSelectionRange(position, position)
}

describe('AmountField', () => {
  it('agrega el punto de miles mientras se escribe y deja el cursor al final', async () => {
    const onChange = vi.fn()
    const { user, input } = setup('', onChange)
    await user.type(input, '1234567')
    expect(input).toHaveValue('1.234.567')
    expect(input.selectionStart).toBe(9)
    expect(onChange).toHaveBeenLastCalledWith('1.234.567')
    expect(onChange.mock.calls.map(([value]) => value)).toEqual(['1', '12', '123', '1.234', '12.345', '123.456', '1.234.567'])
  })

  it('no acepta letras ni simbolos y el cursor no salta', async () => {
    const { user, input } = setup('1.234')
    await placeCaret(user, input, 3)
    await user.keyboard('a')
    expect(input).toHaveValue('1.234')
    expect(input.selectionStart).toBe(3)
  })

  it('escribir en medio deja el cursor detras del digito escrito', async () => {
    const { user, input } = setup('1.234')
    await placeCaret(user, input, 3)
    await user.keyboard('9')
    expect(input).toHaveValue('12.934')
    expect(input.selectionStart).toBe(4)
  })

  it('borrar en medio deja el cursor en el mismo digito', async () => {
    const { user, input } = setup('1.234.567')
    await placeCaret(user, input, 4)
    await user.keyboard('{Backspace}')
    expect(input).toHaveValue('124.567')
    expect(input.selectionStart).toBe(2)
    await user.keyboard('{Delete}')
    expect(input).toHaveValue('12.567')
    expect(input.selectionStart).toBe(2)
  })

  it('Retroceso y Suprimir junto a un punto borran el digito vecino', async () => {
    const { user, input } = setup('1.234.567')
    await placeCaret(user, input, 6)
    await user.keyboard('{Backspace}')
    expect(input).toHaveValue('123.567')
    expect(input.selectionStart).toBe(3)

    await user.keyboard('{Delete}')
    expect(input).toHaveValue('12.367')
    expect(input.selectionStart).toBe(4)
  })

  it('borrar una seleccion deja el cursor donde empezaba', async () => {
    const { user, input } = setup('1.234.567')
    await user.click(input)
    input.setSelectionRange(2, 5)
    await user.keyboard('{Backspace}')
    expect(input).toHaveValue('1.567')
    expect(input.selectionStart).toBe(1)
  })

  it.each([
    ['$ 1.234.567', '1.234.567'],
    ['1,234,567', '1.234.567'],
    ['98.500,50', '98.500,50'],
    ['98500.50', '98.500,50'],
  ])('pegar %s lo normaliza a %s', async (pasted, expected) => {
    const { user, input } = setup()
    await user.click(input)
    await user.paste(pasted)
    expect(input).toHaveValue(expected)
    expect(input.selectionStart).toBe(expected.length)
  })

  it('pegar reemplaza la seleccion y deja el cursor detras de lo pegado', async () => {
    const { user, input } = setup('1.234')
    await user.click(input)
    input.setSelectionRange(2, 3)
    await user.paste('9.000')
    expect(input).toHaveValue('1.900.034')
    expect(input.selectionStart).toBe(7)
  })

  it('con teclado decimal conserva la coma y sus decimales', async () => {
    const user = userEvent.setup()
    function Decimal() {
      const [value, setValue] = useState('')
      return <AmountField label="Monto" inputMode="decimal" value={value} onValueChange={setValue} />
    }
    render(<Decimal />)
    const input = screen.getByLabelText<HTMLInputElement>('Monto')
    expect(input).toHaveAttribute('inputmode', 'decimal')
    await user.type(input, '1500000,50')
    expect(input).toHaveValue('1.500.000,50')
  })

  it('compact deja la etiqueta solo para lectores desde xl y el valor a la derecha', () => {
    render(<AmountField compact label="Precio" value="1.000" onValueChange={() => {}} />)
    const input = screen.getByLabelText('Precio')
    expect(input).toHaveClass('text-right', 'monto')
    expect(screen.getByText('Precio')).toHaveClass('xl:sr-only')
  })

  it('conserva la etiqueta, la ayuda, el teclado numerico y el rol de dinero', () => {
    const { input } = setup('1.000')
    expect(input).toHaveAccessibleDescription('En pesos.')
    expect(input).toHaveAttribute('inputmode', 'numeric')
    expect(input).toHaveAttribute('type', 'text')
    expect(input).toHaveClass('monto')
  })
})
