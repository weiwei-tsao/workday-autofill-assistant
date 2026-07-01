import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChromeRuntimeMock } from '../../tests/chrome-runtime-mock'

describe('background service worker', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('enables opening the side panel on toolbar icon click once installed', async () => {
    const mock = installChromeRuntimeMock()
    await import('./service-worker')

    mock.triggerInstalled()

    expect(mock.getSidePanelBehavior()).toEqual({ openPanelOnActionClick: true })
  })
})
