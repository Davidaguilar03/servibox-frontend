import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { Alert } from '../components/Alert'
import { Button } from '../components/Button'
import { Modal } from '../components/Modal'
import { SelectField } from '../components/SelectField'
import { TextField } from '../components/TextField'
import { errorMessage } from '../lib/errorMessage'
import { createCounterparty, type Counterparty, type CounterpartyRequest, type DocumentType } from '../sales/salesApi'

const documentTypes: Array<{ value: DocumentType; label: string }> = [
  { value: 'CC', label: 'CC' },
  { value: 'NIT', label: 'NIT' },
  { value: 'CE', label: 'CE' },
  { value: 'RUT', label: 'RUT' },
  { value: 'PASAPORTE', label: 'Pasaporte' },
]

const roleNouns: Record<CounterpartyRequest['role'], string> = { CLIENTE: 'cliente', PROVEEDOR: 'proveedor' }

interface NewCounterpartyModalProps {
  role: CounterpartyRequest['role']
  onClose: () => void
  /** Recibe el tercero de la respuesta (201 o 200), no lo escrito en el formulario. */
  onCreated: (counterparty: Counterparty) => void
}

/** Nuevo cliente o Nuevo proveedor: crea el tercero con el rol pedido. Un 409 o un 400 quedan en el modal. */
export function NewCounterpartyModal({ role, onClose, onCreated }: NewCounterpartyModalProps) {
  const noun = roleNouns[role]
  const [name, setName] = useState('')
  const [documentType, setDocumentType] = useState<DocumentType>('CC')
  const [documentNumber, setDocumentNumber] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const create = useMutation({ mutationFn: createCounterparty, onSuccess: onCreated })
  const ready = name.trim() !== '' && documentNumber.trim() !== ''

  function submit() {
    if (!ready || create.isPending) return
    create.mutate({
      role,
      name: name.trim(),
      documentType,
      documentNumber: documentNumber.trim(),
      ...(email.trim() ? { email: email.trim() } : {}),
      ...(phone.trim() ? { phone: phone.trim() } : {}),
    })
  }

  return (
    <Modal
      title={`Nuevo ${noun}`}
      onClose={onClose}
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!ready || create.isPending}>
            {create.isPending ? 'Guardando…' : `Guardar ${noun}`}
          </Button>
        </>
      }
    >
      <div
        className="flex flex-col gap-4"
        onKeyDown={(event) => {
          if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
            event.preventDefault()
            submit()
          }
        }}
      >
        {create.isError && (
          <Alert tone="error" title={`No pudimos crear el ${noun}`}>
            {errorMessage(create.error)}
          </Alert>
        )}
        <TextField label="Nombre o razón social" value={name} onChange={(event) => setName(event.target.value)} required />
        <div className="grid gap-4 sm:grid-cols-[140px_minmax(0,1fr)]">
          <SelectField
            label="Tipo de documento"
            options={documentTypes}
            value={documentType}
            onChange={(event) => setDocumentType(event.target.value as DocumentType)}
          />
          <TextField
            label="Número de documento"
            value={documentNumber}
            onChange={(event) => setDocumentNumber(event.target.value)}
            required
          />
        </div>
        <TextField label="Correo" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        <TextField label="Celular" type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} />
      </div>
    </Modal>
  )
}
