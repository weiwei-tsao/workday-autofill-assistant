import { describe, expect, it } from 'vitest'
import { installChromeRuntimeMock } from './chrome-runtime-mock'
import { installChromeStorageMock } from './chrome-storage-mock'

describe('chrome mock composition', () => {
  it('lets storage and runtime mocks coexist when storage is installed first', async () => {
    installChromeStorageMock()
    installChromeRuntimeMock()

    await chrome.storage.local.set({ hello: 'world' })
    expect(await chrome.storage.local.get('hello')).toEqual({ hello: 'world' })

    chrome.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
      sendResponse({ ok: true })
      return true
    })
    expect(await chrome.tabs.sendMessage(1, { type: 'PING' })).toEqual({ ok: true })
  })

  it('lets storage and runtime mocks coexist when runtime is installed first', async () => {
    installChromeRuntimeMock()
    installChromeStorageMock()

    await chrome.storage.local.set({ a: 1 })
    expect(await chrome.storage.local.get('a')).toEqual({ a: 1 })

    chrome.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
      sendResponse({ ok: true })
      return true
    })
    expect(await chrome.tabs.sendMessage(1, { type: 'PING' })).toEqual({ ok: true })
  })
})
