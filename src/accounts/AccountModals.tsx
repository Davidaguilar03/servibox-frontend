import { useRef, useState, type KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { DiscardableModal } from '../components/DiscardableModal'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { showToast } from '../components/toast'
import type { Account, AccountType } from '../dashboard/dashboardApi'
import { ApiError } from '../lib/api'
import { errorMessage } from '../lib/errorMessage'
import { formatCurrency } from '../lib/format'
import {
  EMPTY_ACCOUNT_FORM,
  buildAccountRequest,
  buildTransferRequest,
  validateAccount,
  validateTransfer,
  type AccountFormValues,
  type TransferFormValues,
} from './accountForms'
import { createAccount, createTransfer } from './accountsApi'
import { ACCOUNT_TYPE_LABELS } from './accountsView'

const typeOptions = (Object.keys(ACCOUNT_TYPE_LABELS) as AccountType[]).map((value) => ({
  value,
  label: ACCOUNT_TYPE_LABELS[value],
}))

/** Enter en un campo de texto envia el formulario del modal. */
function isEnterInInput(event: KeyboardEvent) {
  return event.key === 'Enter' && event.target instanceof HTMLInputElement
}

export function NewAccountModal({ onClose, onCreated }: { onClose: () => void; onCreated: (account: Account) => void }) {
  const queryClient = useQueryClient()
  const [values, setValues] = useState<AccountFormValues>(EMPTY_ACCOUNT_FORM)
  const [touched, setTouched] = useState<Set<keyof AccountFormValues>>(() => new Set())
  const [nameConflict, setNameConflict] = useState<string | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  const errors = validateAccount(values)
  const shown = (field: keyof AccountFormValues) => (touched.has(field) ? errors[field] : undefined)
  const dirty = JSON.stringify(values) !== JSON.stringify(EMPTY_ACCOUNT_FORM)

  const save = useMutation({
    mutationFn: () => createAccount(buildAccountRequest(values)),
    onSuccess: (account) => {
      showToast('Cuenta creada')
      void queryClient.invalidateQueries({ queryKey: ['treasury'] })
      onCreated(account)
    },
    onError: (error) => {
      if (error instanceof ApiError && error.status === 409) {
        setNameConflict(error.message)
        nameRef.current?.focus()
      }
    },
  })

  const change = (field: keyof AccountFormValues) => (value: string) => {
    if (field === 'name') setNameConflict(null)
    setValues((current) => ({ ...current, [field]: value }))
  }
  const touch = (field: keyof AccountFormValues) => () => setTouched((current) => new Set(current).add(field))

  function submit() {
    setTouched(new Set<keyof AccountFormValues>(['name', 'type', 'initialBalance']))
    if (Object.keys(errors).length > 0 || save.isPending) return
    save.mutate()
  }

  const generalError = save.isError && !(save.error instanceof ApiError && save.error.status === 409)

  return (
    <DiscardableModal
      title="Nueva cuenta"
      dirty={dirty}
      busy={save.isPending}
      onClose={onClose}
      discardMessage="Si cierras ahora, se pierde lo que digitaste en esta cuenta."
      footer={(requestClose) => (
        <>
          <Button variant="secondary" onClick={requestClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={save.isPending}>
            {save.isPending ? 'Guardando…' : 'Guardar cuenta'}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4" onKeyDown={(event) => {
          if (isEnterInInput(event)) {
            event.preventDefault()
            submit()
          }
        }}>
        {generalError && (
          <Alert tone="error" title="No pudimos crear la cuenta">
            {errorMessage(save.error)}
          </Alert>
        )}
        <TextField
          ref={nameRef}
          label="Nombre"
          value={values.name}
          onChange={(event) => change('name')(event.target.value)}
          onBlur={touch('name')}
          error={nameConflict ?? shown('name')}
          required
        />
        <SelectField
          label="Tipo"
          options={typeOptions}
          value={values.type}
          onChange={(event) => change('type')(event.target.value)}
        />
        <TextField
          label="Saldo inicial"
          inputMode="decimal"
          value={values.initialBalance}
          onChange={(event) => change('initialBalance')(event.target.value)}
          onBlur={touch('initialBalance')}
          error={shown('initialBalance')}
          hint="El dinero con el que abre la cuenta. Queda como saldo actual y no aparece como movimiento."
        />
      </div>
    </DiscardableModal>
  )
}

interface TransferModalProps {
  accounts: Account[]
  /** Cuenta propuesta como origen (la seleccionada en la pantalla). */
  defaultOriginId: number | null
  onClose: () => void
}

export function TransferModal({ accounts, defaultOriginId, onClose }: TransferModalProps) {
  const queryClient = useQueryClient()
  const sorted = [...accounts].sort((a, b) => a.id - b.id)
  const [initial] = useState<TransferFormValues>(() => ({
    originAccountId: String(defaultOriginId ?? sorted[0]?.id ?? ''),
    destinationAccountId: '',
    amount: '',
    concept: '',
  }))
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState<Set<keyof TransferFormValues>>(() => new Set())
  const sending = useRef(false)

  const errors = validateTransfer(values, accounts)
  const shown = (field: keyof TransferFormValues) => (touched.has(field) ? errors[field] : undefined)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const origin = accounts.find((account) => String(account.id) === values.originAccountId)

  const save = useMutation({
    mutationFn: () => createTransfer(buildTransferRequest(values)),
    onSuccess: () => {
      showToast('Transferencia registrada')
      void queryClient.invalidateQueries({ queryKey: ['treasury'] })
      onClose()
    },
    onSettled: () => {
      sending.current = false
    },
  })

  const change = (field: keyof TransferFormValues) => (value: string) =>
    setValues((current) => {
      const next = { ...current, [field]: value }
      // El destino no puede quedar igual al origen nuevo.
      if (field === 'originAccountId' && next.destinationAccountId === value) next.destinationAccountId = ''
      return next
    })
  const touch = (field: keyof TransferFormValues) => () => setTouched((current) => new Set(current).add(field))

  function submit() {
    setTouched(new Set<keyof TransferFormValues>(['originAccountId', 'destinationAccountId', 'amount', 'concept']))
    if (Object.keys(errors).length > 0 || sending.current) return
    sending.current = true
    save.mutate()
  }

  return (
    <DiscardableModal
      title="Nueva transferencia"
      dirty={dirty}
      busy={save.isPending}
      onClose={onClose}
      discardMessage="Si cierras ahora, se pierde lo que digitaste en esta transferencia."
      footer={(requestClose) => (
        <>
          <Button variant="secondary" onClick={requestClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={save.isPending} aria-busy={save.isPending || undefined}>
            {save.isPending ? 'Registrando…' : 'Registrar transferencia'}
          </Button>
        </>
      )}
    >
      <div className="flex flex-col gap-4" onKeyDown={(event) => {
          if (isEnterInInput(event)) {
            event.preventDefault()
            submit()
          }
        }}>
        <p className="text-small text-text-muted">Se registra con la fecha de hoy.</p>
        {save.isError && (
          <Alert tone="error" title="No pudimos registrar la transferencia">
            {errorMessage(save.error)}
          </Alert>
        )}
        <SelectField
          label="Cuenta de origen"
          options={sorted.map((account) => ({ value: String(account.id), label: account.name }))}
          value={values.originAccountId}
          onChange={(event) => change('originAccountId')(event.target.value)}
          error={shown('originAccountId')}
        />
        <SelectField
          label="Cuenta de destino"
          options={[
            { value: '', label: 'Elige la cuenta de destino' },
            ...sorted
              .filter((account) => String(account.id) !== values.originAccountId)
              .map((account) => ({ value: String(account.id), label: account.name })),
          ]}
          value={values.destinationAccountId}
          onChange={(event) => change('destinationAccountId')(event.target.value)}
          onBlur={touch('destinationAccountId')}
          error={shown('destinationAccountId')}
        />
        <TextField
          label="Monto"
          inputMode="decimal"
          value={values.amount}
          onChange={(event) => change('amount')(event.target.value)}
          onBlur={touch('amount')}
          error={shown('amount')}
          hint={origin ? `Saldo disponible en ${origin.name}: ${formatCurrency(origin.currentBalance)}.` : undefined}
          required
        />
        <TextField
          label="Concepto (opcional)"
          value={values.concept}
          onChange={(event) => change('concept')(event.target.value)}
          hint="Si lo dejas vacío, se usa «Transferencia a» o «desde» la otra cuenta."
        />
      </div>
    </DiscardableModal>
  )
}
