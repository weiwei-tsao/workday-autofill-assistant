import { describe, expect, it } from 'vitest'
import { installChromeRuntimeMock } from './chrome-runtime-mock'

describe('installChromeRuntimeMock', () => {
  it('delivers chrome.tabs.sendMessage to a chrome.runtime.onMessage listener and returns its response', async () => {
    installChromeRuntimeMock()

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      sendResponse({ echoed: message })
      return true
    })

    const response = await chrome.tabs.sendMessage(1, { hello: 'world' })

    expect(response).toEqual({ echoed: { hello: 'world' } })
  })

  it('rejects when no listener is registered on the tab', async () => {
    installChromeRuntimeMock()

    await expect(chrome.tabs.sendMessage(1, { hello: 'world' })).rejects.toThrow(
      'Could not establish connection. Receiving end does not exist.'
    )
  })

  it('resolves undefined when a listener is registered but never responds', async () => {
    installChromeRuntimeMock()
    chrome.runtime.onMessage.addListener(() => {
      // registered but intentionally does not call sendResponse or return true
    })

    const response = await chrome.tabs.sendMessage(1, { hello: 'world' })

    expect(response).toBeUndefined()
  })

  it('records the side panel behavior set on install, triggered via triggerInstalled', async () => {
    const mock = installChromeRuntimeMock()

    chrome.runtime.onInstalled.addListener(() => {
      chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
    })
    mock.triggerInstalled()

    expect(mock.getSidePanelBehavior()).toEqual({ openPanelOnActionClick: true })
  })

  it('waits for an asynchronous sendResponse when a listener returns true', async () => {
    installChromeRuntimeMock()

    chrome.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
      Promise.resolve().then(() => sendResponse({ async: true }))
      return true
    })

    const response = await chrome.tabs.sendMessage(1, { hello: 'world' })

    expect(response).toEqual({ async: true })
  })
})
