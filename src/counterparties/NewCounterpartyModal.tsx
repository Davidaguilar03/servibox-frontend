import { useRef, useState, type ReactNode } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { DiscardableModal } from '../components/DiscardableModal'
import { Modal } from '../components/Modal'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { ApiError } from '../lib/api'
import { errorMessage } from '../lib/errorMessage'
import { createCounterparty, type Counterparty, type CounterpartyRequest, type DocumentType } from '../sales/salesApi'
import { updateCounterparty } from './counterpartiesApi'
import {
  DOCUMENT_MAX,
  DOCUMENT_TYPE_OPTIONS,
  EMAIL_MAX,
  NAME_MAX,
  PHONE_MAX,
  buildCreateRequest,
  buildUpdateRequest,
  emptyCounterpartyForm,
  formFromCounterparty,
  validateCounterpartyForm,
  type CounterpartyFormValues,
} from './counterpartyForm'

const roleNouns: Record<CounterpartyRequest['role'], string> = { CLIENTE: 'cliente', PROVEEDOR: 'proveedor' }

const fields: Array<keyof CounterpartyFormValues> = ['name', 'documentType', 'documentNumber', 'email', 'phone']

interface NewCounterpartyModalProps {
  role: CounterpartyRequest['role']
  /** El tercero que se edita; sin el, es un alta con el rol pedido. */
  counterparty?: Counterparty
  /** Con datos digitados, cerrar pide "Descartar cambios". Las facturas no lo usan. */
  guardUnsaved?: boolean
  onClose: () => void
  /** Recibe el tercero de la respuesta (201 o 200), no lo escrito en el formulario. */
  onCreated: (counterparty: Counterparty) => void
  /** Recibe el tercero guardado por el PUT. */
  onUpdated?: (counterparty: Counterparty) => void
}

/** 409 de documento repetido: va bajo el campo. Los demas errores quedan en el Alert. */
function isDocumentConflict(error: unknown): error is ApiError {
  return error instanceof ApiError && error.status === 409 && error.message.includes('documento')
}

/**
 * Nuevo cliente o Nuevo proveedor (POST con el rol pedido) y, con `counterparty`, Editar
 * (PUT de los campos editables; el rol no se toca). Los errores del backend quedan en el modal.
 */
export function NewCounterpartyModal({ role, counterparty, guardUnsaved = false, onClose, onCreated, onUpdated }: NewCounterpartyModalProps) {
  const noun = roleNouns[role]
  const editing = counterparty !== undefined
  const [initial] = useState(() => (counterparty ? formFromCounterparty(counterparty) : emptyCounterpartyForm()))
  const [values, setValues] = useState(initial)
  const [touched, setTouched] = useState<Set<keyof CounterpartyFormValues>>(() => new Set())
  // Documento que el backend rechazo con 409: el error se ve mientras el campo no cambie.
  const [conflict, setConflict] = useState<{ documentNumber: string; message: string } | null>(null)
  const sending = useRef(false)

  const errors = validateCounterpartyForm(values)
  const shown = (field: keyof CounterpartyFormValues) => (touched.has(field) ? errors[field] : undefined)
  const dirty = JSON.stringify(values) !== JSON.stringify(initial)
  const documentConflict = conflict?.documentNumber === values.documentNumber.trim() ? conflict.message : undefined

  const save = useMutation({
    mutationFn: () =>
      counterparty
        ? updateCounterparty(counterparty.id, buildUpdateRequest(values))
        : createCounterparty(buildCreateRequest(values, role)),
    onSuccess: (saved) => (editing ? onUpdated?.(saved) : onCreated(saved)),
    onError: (error) => {
      if (isDocumentConflict(error)) setConflict({ documentNumber: values.documentNumber.trim(), message: error.message })
    },
    onSettled: () => {
      sending.current = false
    },
  })

  const change = (field: keyof CounterpartyFormValues) => (value: string) =>
    setValues((current) => ({ ...current, [field]: value }))
  const touch = (field: keyof CounterpartyFormValues) => () => setTouched((current) => new Set(current).add(field))

  function submit() {
    setTouched(new Set(fields))
    if (Object.keys(errors).length > 0 || sending.current) return
    sending.current = true
    save.mutate()
  }

  const failTitle = editing ? 'No pudimos guardar los cambios' : `No pudimos crear el ${noun}`
  const title = editing ? `Editar ${noun}` : `Nuevo ${noun}`
  const footer = (requestClose: () => void) => (
    <>
      <Button variant="secondary" onClick={requestClose}>
        Cancelar
      </Button>
      <Button onClick={submit} disabled={save.isPending} aria-busy={save.isPending || undefined}>
        {save.isPending ? 'Guardando…' : editing ? 'Guardar cambios' : `Guardar ${noun}`}
      </Button>
    </>
  )

  const body: ReactNode = (
    <div
      className="flex flex-col gap-4"
      onKeyDown={(event) => {
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
          event.preventDefault()
          submit()
        }
      }}
    >
      {editing && <p className="text-small text-text-muted">Los cambios también se verán en las facturas ya emitidas.</p>}
      {save.isError && (
        <Alert tone="error" title={failTitle}>
          {isDocumentConflict(save.error) ? 'Revisa el número de documento.' : errorMessage(save.error)}
        </Alert>
      )}
      <TextField
        label="Nombre o razón social"
        value={values.name}
        maxLength={NAME_MAX}
        error={shown('name')}
        onChange={(event) => change('name')(event.target.value)}
        onBlur={touch('name')}
        required
      />
      <div className="flex flex-col gap-4">
        <SelectField
          label="Tipo de documento"
          options={DOCUMENT_TYPE_OPTIONS}
          value={values.documentType}
          onChange={(event) => change('documentType')(event.target.value as DocumentType)}
        />
        <TextField
          label="Número de documento"
          value={values.documentNumber}
          maxLength={DOCUMENT_MAX}
          error={shown('documentNumber') ?? documentConflict}
          onChange={(event) => change('documentNumber')(event.target.value)}
          onBlur={touch('documentNumber')}
          required
        />
      </div>
      <TextField
        label="Correo"
        type="email"
        value={values.email}
        maxLength={EMAIL_MAX}
        error={shown('email')}
        onChange={(event) => change('email')(event.target.value)}
        onBlur={touch('email')}
      />
      <TextField
        label="Celular"
        type="tel"
        value={values.phone}
        maxLength={PHONE_MAX}
        error={shown('phone')}
        onChange={(event) => change('phone')(event.target.value)}
        onBlur={touch('phone')}
      />
    </div>
  )

  if (guardUnsaved) {
    return (
      <DiscardableModal
        title={title}
        dirty={dirty}
        busy={save.isPending}
        onClose={onClose}
        discardMessage={`Si cierras ahora, se pierde lo que digitaste en este ${noun}.`}
        footer={footer}
      >
        {body}
      </DiscardableModal>
    )
  }
  return (
    <Modal title={title} onClose={onClose} footer={footer(onClose)}>
      {body}
    </Modal>
  )
}
