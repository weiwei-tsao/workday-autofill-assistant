import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChromeRuntimeMock } from '../../tests/chrome-runtime-mock'

describe('content script entry', () => {
  beforeEach(() => {
    vi.resetModules()
    installChromeRuntimeMock()
    document.body.innerHTML = ''
  })

  it('reports isWorkdayPage true when the page has a Workday DOM marker', async () => {
    document.body.innerHTML = '<div data-automation-id="jobPostingHeader"></div>'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'GET_PAGE_STATUS' })

    expect(response).toEqual({ type: 'PAGE_STATUS', isWorkdayPage: true })
  })

  it('reports isWorkdayPage false when the page has no Workday markers', async () => {
    document.body.innerHTML = '<div>Hello</div>'
    await import('./index')

    const response = await chrome.tabs.sendMessage(1, { type: 'GET_PAGE_STATUS' })

    expect(response).toEqual({ type: 'PAGE_STATUS', isWorkdayPage: false })
  })
})
