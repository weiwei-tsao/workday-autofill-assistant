import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeRuntimeMock } from '../../tests/chrome-runtime-mock'
import { App } from './App'

describe('Side Panel App', () => {
  beforeEach(() => {
    installChromeRuntimeMock()
  })

  it('shows "No Workday page detected." when nothing responds to the status query', async () => {
    render(<App />)

    expect(await screen.findByText('No Workday page detected.')).toBeInTheDocument()
  })

  it('shows "Workday page detected." when the content script reports a Workday page', async () => {
    chrome.runtime.onMessage.addListener((_message, _sender, sendResponse) => {
      sendResponse({ type: 'PAGE_STATUS', isWorkdayPage: true })
      return true
    })

    render(<App />)

    expect(await screen.findByText('Workday page detected.')).toBeInTheDocument()
  })
})
