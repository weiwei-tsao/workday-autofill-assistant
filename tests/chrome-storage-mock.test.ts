import { describe, expect, it } from 'vitest'
import { installChromeStorageMock } from './chrome-storage-mock'

describe('installChromeStorageMock', () => {
  it('provides an in-memory chrome.storage.local that round-trips values', async () => {
    installChromeStorageMock()

    await chrome.storage.local.set({ hello: 'world' })
    const result = await chrome.storage.local.get('hello')

    expect(result).toEqual({ hello: 'world' })
  })

  it('notifies onChanged listeners when a value is set', async () => {
    installChromeStorageMock()
    const received: Array<Record<string, chrome.storage.StorageChange>> = []
    chrome.storage.onChanged.addListener((changes) => received.push(changes))

    await chrome.storage.local.set({ counter: 1 })

    expect(received).toEqual([{ counter: { oldValue: undefined, newValue: 1 } }])
  })
})
