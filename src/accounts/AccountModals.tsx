import { useRef, useState, type KeyboardEvent } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { userMessage } from '../api/errorMessages'
import { isInlineError, reportError, useReportedError } from '../api/reportError'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { DiscardableModal } from '../components/DiscardableModal'
import { ErrorSummary } from '../components/ErrorSummary'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { showToast } from '../components/toast'
import type { Account, AccountType } from '../dashboard/dashboardApi'
import { ApiError } from '../lib/api'
import { revealErrors } from '../lib/formErrors'
import { formatCurrency } from '../lib/format'
import {
  EMPTY_ACCOUNT_FORM,
  buildAccountRequest,
  buildAccountUpdateRequest,
  buildTransferRequest,
  validateAccount,
  validateAccountEdit,
  validateTransfer,
  type AccountFormValues,
  type AccountEditValues,
  type TransferFormValues,
} from './accountForms'
import { createAccount, createTransfer, updateAccount } from './accountsApi'
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
  const [submitted, setSubmitted] = useState(false)
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
        setNameConflict(userMessage(error))
        nameRef.current?.focus()
      }
    },
  })
  const saveError = useReportedError(save.error)

  const change = (field: keyof AccountFormValues) => (value: string) => {
    if (field === 'name') setNameConflict(null)
    setValues((current) => ({ ...current, [field]: value }))
  }
  const touch = (field: keyof AccountFormValues) => () => setTouched((current) => new Set(current).add(field))

  function submit() {
    if (save.isPending) return
    if (Object.keys(errors).length > 0) {
      // Guardar no se deshabilita por errores: se muestran todos y el foco va al primero.
      revealErrors(() => {
        setSubmitted(true)
        setTouched(new Set<keyof AccountFormValues>(['name', 'type', 'initialBalance']))
      }, document.querySelector<HTMLElement>('[role="dialog"]'))
      return
    }
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
        {saveError && generalError && (
          <Alert tone="error" title="No pudimos crear la cuenta">
            {saveError}
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
      <ErrorSummary count={submitted ? Object.keys(errors).length : 0} />
    </DiscardableModal>
  )
}

export function EditAccountModal({ account, onClose }: { account: Account; onClose: () => void }) {
  const queryClient = useQueryClient()
  const [initial] = useState<AccountEditValues>(() => ({
    name: account.name,
    initialBalance: String(account.initialBalance).replace('.', ','),
  }))
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState<Set<keyof AccountEditValues>>(() => new Set())
  const [submitted, setSubmitted] = useState(false)
  const [serverError, setServerError] = useState<{ field?: keyof AccountEditValues; message: string } | null>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const alertRef = useRef<HTMLDivElement>(null)
  const sending = useRef(false)
  const errors = validateAccountEdit(values)
  const dirty = values.name !== initial.name || values.initialBalance !== initial.initialBalance
  const shown = (field: keyof AccountEditValues) =>
    (serverError?.field === field ? serverError.message : undefined) ?? (touched.has(field) ? errors[field] : undefined)

  const save = useMutation({
    mutationFn: () => updateAccount(account.id, buildAccountUpdateRequest(values)),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['treasury'] })
      showToast('Cuenta actualizada')
      onClose()
    },
    onError: (error) => {
      const message = reportError(error)
      if (!message || !isInlineError(error)) return
      const field = error instanceof ApiError && /^Ya existe una cuenta con el nombre /.test(error.message)
        ? 'name'
        : error instanceof ApiError && /^Saldo insuficiente en .+: faltan .+ para cambiar el saldo inicial$/.test(error.message)
          ? 'initialBalance'
          : undefined
      revealErrors(() => {
        setSubmitted(true)
        setServerError({ field, message })
      }, bodyRef.current, alertRef.current)
    },
    onSettled: () => { sending.current = false },
  })

  function change(field: keyof AccountEditValues, value: string) {
    if (!serverError?.field || serverError.field === field) setServerError(null)
    setValues((current) => ({ ...current, [field]: value }))
  }

  function submit() {
    if (sending.current || !dirty) return
    if (Object.keys(errors).length > 0) {
      revealErrors(() => {
        setSubmitted(true)
        setTouched(new Set<keyof AccountEditValues>(['name', 'initialBalance']))
      }, bodyRef.current)
      return
    }
    sending.current = true
    setServerError(null)
    save.mutate()
  }

  return (
    <DiscardableModal
      title="Editar cuenta"
      dirty={dirty}
      busy={save.isPending}
      onClose={onClose}
      discardMessage="Si cierras ahora, se pierde lo que digitaste en esta cuenta."
      footer={(requestClose) => (
        <>
          <Button variant="secondary" onClick={requestClose}>Cancelar</Button>
          <Button onClick={submit} disabled={save.isPending || !dirty} aria-busy={save.isPending || undefined}>
            {save.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </>
      )}
    >
      <div ref={bodyRef} className="flex flex-col gap-4" onKeyDown={(event) => {
        if (isEnterInInput(event)) {
          event.preventDefault()
          submit()
        }
      }}>
        <ErrorSummary count={submitted ? Object.keys(errors).length + (serverError?.field ? 1 : 0) : 0} />
        <div ref={alertRef} tabIndex={-1}>
          {serverError && !serverError.field && (
            <Alert tone="error" title="No pudimos guardar los cambios">{serverError.message}</Alert>
          )}
        </div>
        <TextField label="Nombre" value={values.name} maxLength={100} required
          onChange={(event) => change('name', event.target.value)}
          onBlur={() => setTouched((current) => new Set(current).add('name'))} error={shown('name')} />
        <TextField label="Tipo" value={ACCOUNT_TYPE_LABELS[account.type]} readOnly />
        <TextField label="Saldo inicial" inputMode="decimal" valueRole="monto" value={values.initialBalance} required
          onChange={(event) => change('initialBalance', event.target.value)}
          onBlur={() => setTouched((current) => new Set(current).add('initialBalance'))} error={shown('initialBalance')}
          hint="Cambiar el saldo inicial ajusta el saldo actual y no registra un ingreso. Usa coma para los decimales." />
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
  const [submitted, setSubmitted] = useState(false)
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
  const saveError = useReportedError(save.error)

  const change = (field: keyof TransferFormValues) => (value: string) =>
    setValues((current) => {
      const next = { ...current, [field]: value }
      // El destino no puede quedar igual al origen nuevo.
      if (field === 'originAccountId' && next.destinationAccountId === value) next.destinationAccountId = ''
      return next
    })
  const touch = (field: keyof TransferFormValues) => () => setTouched((current) => new Set(current).add(field))

  function submit() {
    if (sending.current) return
    if (Object.keys(errors).length > 0) {
      // Guardar no se deshabilita por errores: se muestran todos y el foco va al primero.
      revealErrors(() => {
        setSubmitted(true)
        setTouched(new Set<keyof TransferFormValues>(['originAccountId', 'destinationAccountId', 'amount', 'concept']))
      }, document.querySelector<HTMLElement>('[role="dialog"]'))
      return
    }
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
        {saveError && save.isError && (
          <Alert tone="error" title="No pudimos registrar la transferencia">
            {saveError}
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
      <ErrorSummary count={submitted ? Object.keys(errors).length : 0} />
    </DiscardableModal>
  )
}
