import { useId } from 'react'
import { Check } from 'lucide-react'
import { GLOSSARY } from '../copy/glossary'
import { iconSm } from '../components/icons'
import { ACCOUNT_COLORS } from './accountColors'

export function AccountColorField({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  const id = useId()
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-label text-text">{GLOSSARY.accountColor}</legend>
      <div className="flex flex-wrap gap-2">
        {ACCOUNT_COLORS.map((color) => (
          <button key={color.value} type="button" aria-pressed={value.toUpperCase() === color.value}
            onClick={() => onChange(color.value)}
            className="focus-ring flex min-h-touch items-center gap-2 rounded-control border border-border-control bg-surface px-3 text-small text-text">
            <span className="size-4 rounded-pill border border-border-control" style={{ backgroundColor: color.value }} aria-hidden />
            {color.label}
            {value.toUpperCase() === color.value && <Check {...iconSm} aria-hidden />}
          </button>
        ))}
      </div>
      <label htmlFor={id} className="flex min-h-touch items-center gap-3 text-small text-text">
        Otro color
        <input id={id} type="color" value={value} onChange={(event) => onChange(event.target.value)}
          className="focus-ring h-touch w-12 cursor-pointer rounded-control border border-border-control bg-surface p-1" />
      </label>
      <p className="text-small text-text-muted">Color elegido: {value.toUpperCase()}</p>
    </fieldset>
  )
}
