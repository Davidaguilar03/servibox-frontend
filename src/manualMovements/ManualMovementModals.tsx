import { useRef, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import type { TreasuryMovement } from '../accounts/accountsApi'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { DiscardableModal } from '../components/DiscardableModal'
import { Modal } from '../components/Modal'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import type { Account } from '../dashboard/dashboardApi'
import { errorMessage } from '../lib/errorMessage'
import { formatCurrency } from '../lib/format'
import {
  buildManualRequest,
  deleteEffectText,
  emptyManualForm,
  formFromMovement,
  saveShortfalls,
  shortfallMessage,
  validateManualForm,
  type ManualFormValues,
} from './manualMovements'
import { createManualMovement, deleteManualMovement, updateManualMovement } from './manualMovementsApi'
import type { ManualMovementsConfig } from './ManualMovementsPage'

interface FormModalProps {
  config: ManualMovementsConfig
  accounts: Account[] | undefined
  today: string
  /** El movimiento que se edita; sin el, es un alta. */
  movement?: TreasuryMovement
  onClose: () => void
  onSaved: () => void
}

const fields: Array<keyof ManualFormValues> = ['concept', 'date', 'accountId', 'amount', 'notes']

/** Alta y edicion de un gasto o un ingreso. Con datos digitados, cerrar pide descartar. */
export function ManualMovementFormModal({ config, accounts, today, movement, onClose, onSaved }: FormModalProps) {
  const [initial] = useState(() =>
    movement ? formFromMovement(movement) : emptyManualForm(config.category, today, accounts),
  )
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState<Set<keyof ManualFormValues>>(() => new Set())
  const sending = useRef(false)

  const errors = validateManualForm(values, today)
  const shown = (field: keyof ManualFormValues) => (touched.has(field) ? errors[field] : undefined)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const shortfalls = saveShortfalls(config.category, values, accounts, movement)

  const save = useMutation({
    mutationFn: () => {
      const body = buildManualRequest(values, config.category)
      return movement ? updateManualMovement(movement.id, body) : createManualMovement(body)
    },
    onSuccess: onSaved,
    onSettled: () => {
      sending.current = false
    },
  })

  const change = (field: keyof ManualFormValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }))
  const touch = (field: keyof ManualFormValues) => () => setTouched((current) => new Set(current).add(field))

  function submit() {
    setTouched(new Set(fields))
    if (Object.keys(errors).length > 0 || sending.current) return
    sending.current = true
    save.mutate()
  }

  const sorted = [...(accounts ?? [])].sort((a, b) => a.id - b.id)
  const accountOptions = [
    { value: '', label: accounts ? 'Elige la cuenta' : 'Cargando cuentas…' },
    ...sorted.map((account) => ({
      value: String(account.id),
      label: `${account.name} · ${formatCurrency(account.currentBalance)}`,
    })),
  ]
  const noun = config.singular

  return (
    <DiscardableModal
      title={movement ? `Editar ${noun}` : config.newLabel}
      dirty={dirty}
      busy={save.isPending}
      onClose={onClose}
      discardMessage={`Si cierras ahora, se pierde lo que digitaste en este ${noun}.`}
      footer={(requestClose) => (
        <>
          <Button variant="secondary" onClick={requestClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={save.isPending} aria-busy={save.isPending || undefined}>
            {save.isPending ? 'Guardando…' : movement ? 'Guardar cambios' : `Guardar ${noun}`}
          </Button>
        </>
      )}
    >
      <div
        className="flex flex-col gap-4"
        onKeyDown={(event) => {
          // Enter en un campo de texto guarda, como en los modales de Cuentas.
          if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
            event.preventDefault()
            submit()
          }
        }}
      >
        {save.isError && (
          <Alert tone="error" title={movement ? 'No pudimos guardar los cambios' : `No pudimos registrar el ${noun}`}>
            {errorMessage(save.error)}
          </Alert>
        )}
        <TextField
          label="Concepto"
          value={values.concept}
          onChange={(event) => change('concept')(event.target.value)}
          onBlur={touch('concept')}
          error={shown('concept')}
          placeholder={config.conceptPlaceholder}
          required
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Fecha"
            type="date"
            max={today}
            value={values.date}
            onChange={(event) => change('date')(event.target.value)}
            onBlur={touch('date')}
            error={shown('date')}
            required
          />
          <TextField
            label="Monto"
            inputMode="decimal"
            value={values.amount}
            onChange={(event) => change('amount')(event.target.value)}
            onBlur={touch('amount')}
            error={shown('amount')}
            required
          />
        </div>
        <SelectField
          label="Cuenta"
          options={accountOptions}
          value={values.accountId}
          onChange={(event) => change('accountId')(event.target.value)}
          onBlur={touch('accountId')}
          error={shown('accountId')}
          hint={config.accountHint}
        />
        {shortfalls.map((shortfall) => (
          <Alert key={shortfall.account.id} tone="warning" title={shortfallMessage(shortfall)}>
            Puedes guardarlo igual: la cuenta queda en negativo.
          </Alert>
        ))}
        <TextField
          label="Observaciones (opcional)"
          value={values.notes}
          onChange={(event) => change('notes')(event.target.value)}
          onBlur={touch('notes')}
          error={shown('notes')}
        />
      </div>
    </DiscardableModal>
  )
}

interface DeleteModalProps {
  config: ManualMovementsConfig
  movement: TreasuryMovement
  accounts: Account[] | undefined
  onClose: () => void
  onDeleted: () => void
}

/** Confirmacion de eliminar: el foco empieza en Cancelar y el error queda en el modal. */
export function DeleteManualMovementModal({ config, movement, accounts, onClose, onDeleted }: DeleteModalProps) {
  const sending = useRef(false)
  const remove = useMutation({
    mutationFn: () => deleteManualMovement(movement.id),
    onSuccess: onDeleted,
    onSettled: () => {
      sending.current = false
    },
  })

  function confirm() {
    if (sending.current) return
    sending.current = true
    remove.mutate()
  }

  return (
    <Modal
      title={`Eliminar ${config.singular}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={confirm} disabled={remove.isPending}>
            {remove.isPending ? 'Eliminando…' : 'Eliminar'}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <p className="text-body text-text">
          Vas a eliminar el {config.singular} «{movement.concept}» por {formatCurrency(movement.amount)}.{' '}
          {deleteEffectText(movement, accounts)} Esta acción no se puede deshacer.
        </p>
        {remove.isError && (
          <Alert tone="error" title={`No pudimos eliminar el ${config.singular}`}>
            {errorMessage(remove.error)}
          </Alert>
        )}
      </div>
    </Modal>
  )
}
