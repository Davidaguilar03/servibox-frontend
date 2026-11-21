import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { APP_VERSION, APP_VERSION_LABEL } from './version'

describe('version', () => {
  it('sale del package.json y se rotula con v', () => {
    const { version } = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string }
    expect(APP_VERSION).toBe(version)
    expect(APP_VERSION_LABEL).toBe(`v${version}`)
  })
})
