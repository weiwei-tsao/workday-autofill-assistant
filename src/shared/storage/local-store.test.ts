import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { getLocal, setLocal } from './local-store'

beforeEach(() => {
  installChromeStorageMock()
})

describe('local-store', () => {
  it('returns undefined when key has not been set', async () => {
    const result = await getLocal('missingKey')
    expect(result).toBeUndefined()
  })

  it('round-trips a value through setLocal and getLocal', async () => {
    await setLocal('profile', { firstName: 'Ada' })
    const result = await getLocal<{ firstName: string }>('profile')
    expect(result).toEqual({ firstName: 'Ada' })
  })
})
