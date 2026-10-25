import { describe, expect, it } from 'vitest'
import { userMessage } from '../api/errorMessages'
import { errorMessage } from './errorMessage'

describe('errorMessage', () => {
  it('es el mismo texto de userMessage (api/errorMessages.ts)', () => {
    expect(errorMessage).toBe(userMessage)
  })
})
