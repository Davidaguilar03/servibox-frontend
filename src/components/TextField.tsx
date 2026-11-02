import { useId, useState, type InputHTMLAttributes, type Ref } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { iconSm } from './icons'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: string
  error?: string
  ref?: Ref<HTMLInputElement>
  /** Rol del valor: `monto` (dinero, numeros tabulares) o `codigo` (IBM Plex Mono). */
  valueRole?: 'monto' | 'codigo'
  /** Campo de una linea de factura: etiqueta solo para lectores desde xl y valor a la derecha. */
  compact?: boolean
}

/** Campo con etiqueta. Si es de contrasena, trae el boton de mostrar u ocultar. */
export function TextField({ label, hint, error, type = 'text', disabled, valueRole, compact, ...props }: TextFieldProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const message = error ?? hint
  const messageId = message ? `${id}-message` : undefined

  return (
    <div className={`flex flex-col ${compact ? 'gap-1' : 'gap-2'}`}>
      <label htmlFor={id} className={`text-label ${disabled ? 'text-text-subtle' : 'text-text'} ${compact ? 'xl:sr-only' : ''}`}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className={`h-control-touch lg:h-control w-full rounded-control border bg-surface px-3 text-body text-text transition-colors duration-(--duration-fast) placeholder:text-text-muted focus-ring-field disabled:border-border disabled:bg-neutral-200 disabled:text-text-subtle read-only:bg-neutral-200 read-only:text-text-muted ${
            error ? 'border-error' : 'border-border-control'
          } ${isPassword ? 'pr-12' : ''} ${compact ? 'text-right' : ''} ${valueRole ?? ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            disabled={disabled}
            aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 flex w-touch items-center justify-center rounded-control text-text-muted transition-colors duration-(--duration-fast) hover:text-text focus-ring disabled:text-text-subtle"
          >
            {revealed ? <EyeOff {...iconSm} /> : <Eye {...iconSm} />}
          </button>
        )}
      </div>
      {message && (
        <p id={messageId} aria-live={error ? 'polite' : undefined} className={`text-small ${error ? 'text-error' : 'text-text-muted'} ${compact ? 'xl:text-right' : ''}`}>
          {message}
        </p>
      )}
    </div>
  )
}
