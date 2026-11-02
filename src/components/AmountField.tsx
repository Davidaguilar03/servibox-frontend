import type { ClipboardEvent, ComponentProps, KeyboardEvent } from 'react'
import { caretAfterFormat, formatAmountText, normalizePastedAmount } from '../lib/amountInput'
import { TextField } from './TextField'

interface AmountFieldProps extends Omit<ComponentProps<typeof TextField>, 'value' | 'onChange' | 'onPaste' | 'onKeyDown' | 'valueRole'> {
  /** Texto ya formateado, por ejemplo `1.234.567`. */
  value: string
  onValueChange: (value: string) => void
}

/** Campo de dinero con punto de miles mientras se escribe, sin mover el cursor del digito donde estaba. */
export function AmountField({ value, onValueChange, ...props }: AmountFieldProps) {
  // El texto se escribe en el campo aqui mismo: si lo hiciera React al renderizar, el cursor saltaria al final.
  function apply(input: HTMLInputElement, raw: string, caret: number) {
    const formatted = formatAmountText(raw)
    const position = caretAfterFormat(raw, caret, formatted)
    input.value = formatted
    input.setSelectionRange(position, position)
    onValueChange(formatted)
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    event.preventDefault()
    const input = event.currentTarget
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? start
    const pasted = normalizePastedAmount(event.clipboardData.getData('text'))
    apply(input, input.value.slice(0, start) + pasted + input.value.slice(end), start + pasted.length)
  }

  // Borrar junto a un punto de miles borra el digito vecino; si no, la tecla solo moveria el cursor.
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget
    const start = input.selectionStart
    if (start === null || start !== input.selectionEnd) return
    if (event.key === 'Backspace' && input.value[start - 1] === '.') input.setSelectionRange(start - 1, start - 1)
    if (event.key === 'Delete' && input.value[start] === '.') input.setSelectionRange(start + 1, start + 1)
  }

  return (
    <TextField
      valueRole="monto"
      inputMode="numeric"
      value={value}
      onChange={(event) => apply(event.currentTarget, event.currentTarget.value, event.currentTarget.selectionStart ?? event.currentTarget.value.length)}
      onPaste={handlePaste}
      onKeyDown={handleKeyDown}
      {...props}
    />
  )
}
