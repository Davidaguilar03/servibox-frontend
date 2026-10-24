import '@testing-library/jest-dom/vitest'
import { cleanup, configure } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

// findBy y waitFor esperan 1 s por defecto, aparte de testTimeout; con la maquina cargada no
// alcanzaba. Ver docs/ai-context/03-DECISIONS.md.
configure({ asyncUtilTimeout: 5000 })

afterEach(() => {
  cleanup()
  sessionStorage.clear()
  localStorage.clear()
  vi.unstubAllGlobals()
})
