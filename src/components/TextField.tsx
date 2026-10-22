import { useId, useState, type InputHTMLAttributes, type Ref } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface TextFieldProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'id'> {
  label: string
  hint?: string
  error?: string
  ref?: Ref<HTMLInputElement>
}

/** Campo con etiqueta. Si es de contrasena, trae el boton de mostrar u ocultar. */
export function TextField({ label, hint, error, type = 'text', disabled, ...props }: TextFieldProps) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const message = error ?? hint
  const messageId = message ? `${id}-message` : undefined

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={`text-small font-medium ${disabled ? 'text-text-subtle' : 'text-text'}`}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={isPassword && revealed ? 'text' : type}
          disabled={disabled}
          aria-invalid={error ? true : undefined}
          aria-describedby={messageId}
          className={`h-control w-full rounded-control border bg-surface px-3 text-body text-text outline-none transition-[border-color,box-shadow] duration-(--duration-fast) placeholder:text-text-subtle focus:ring-3 disabled:border-border disabled:bg-neutral-200 disabled:text-text-subtle read-only:bg-neutral-200 read-only:text-text-muted ${
            error ? 'border-error focus:ring-error/20' : 'border-border focus:border-brand focus:ring-brand/20'
          } ${isPassword ? 'pr-12' : ''}`}
          {...props}
        />
        {isPassword && (
          <button
            type="button"
            onClick={() => setRevealed((value) => !value)}
            disabled={disabled}
            aria-label={revealed ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            className="absolute inset-y-0 right-0 flex w-touch items-center justify-center rounded-control text-text-muted transition-colors duration-(--duration-fast) hover:text-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:text-text-subtle"
          >
            {revealed ? <EyeOff size={18} strokeWidth={1.5} /> : <Eye size={18} strokeWidth={1.5} />}
          </button>
        )}
      </div>
      {message && (
        <p id={messageId} aria-live={error ? 'polite' : undefined} className={`text-small ${error ? 'text-error' : 'text-text-muted'}`}>
          {message}
        </p>
      )}
    </div>
  )
}
