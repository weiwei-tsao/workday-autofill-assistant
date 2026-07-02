import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

  it('shows "No Workday page detected." when no content script is listening on the tab (sendMessage rejects)', async () => {
    vi.spyOn(chrome.tabs, 'sendMessage').mockRejectedValueOnce(
      new Error('Could not establish connection. Receiving end does not exist.')
    )

    render(<App />)

    expect(await screen.findByText('No Workday page detected.')).toBeInTheDocument()
  })

  it('shows "Workday page detected." when the content script reports a Workday page', async () => {
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && typeof message === 'object' && 'type' in message) {
        if (message.type === 'GET_PAGE_STATUS') {
          sendResponse({ type: 'PAGE_STATUS', isWorkdayPage: true })
        }
      }
      return true
    })

    render(<App />)

    expect(await screen.findByText('Workday page detected.')).toBeInTheDocument()
  })

  it('runs autofill and displays the result summary when the button is clicked', async () => {
    const user = userEvent.setup()
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && typeof message === 'object' && 'type' in message) {
        if (message.type === 'GET_PAGE_STATUS') {
          sendResponse({ type: 'PAGE_STATUS', isWorkdayPage: true })
        } else if (message.type === 'AUTOFILL_PAGE') {
          sendResponse({
            type: 'AUTOFILL_RESULT',
            summary: { detected: 3, filled: 2, needsReview: 1 },
          })
        }
      }
      return true
    })

    render(<App />)
    await screen.findByText('Workday page detected.')

    await user.click(screen.getByRole('button', { name: 'Autofill current page' }))

    expect(
      await screen.findByText('Detected 3 supported fields. Filled 2 fields. 1 fields require review.')
    ).toBeInTheDocument()
  })

  it('saves the application and displays a confirmation when the button is clicked', async () => {
    const user = userEvent.setup()
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && typeof message === 'object' && 'type' in message) {
        if (message.type === 'GET_PAGE_STATUS') {
          sendResponse({ type: 'PAGE_STATUS', isWorkdayPage: true })
        } else if (message.type === 'SAVE_APPLICATION') {
          sendResponse({
            type: 'APPLICATION_SAVED',
            record: {
              id: '1',
              companyName: 'Acme',
              jobTitle: 'Software Engineer',
              applicationDate: '2026-07-01',
              sourcePlatform: 'Workday',
              status: 'Applied',
            },
          })
        }
      }
      return true
    })

    render(<App />)
    await screen.findByText('Workday page detected.')

    await user.click(screen.getByRole('button', { name: 'Save application' }))

    expect(
      await screen.findByText('Saved application for Software Engineer at Acme.')
    ).toBeInTheDocument()
  })

  it('shows a "some fields were skipped" message when skipped fields exist', async () => {
    const user = userEvent.setup()
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && typeof message === 'object' && 'type' in message) {
        if (message.type === 'GET_PAGE_STATUS') {
          sendResponse({ type: 'PAGE_STATUS', isWorkdayPage: true })
        } else if (message.type === 'AUTOFILL_PAGE') {
          sendResponse({
            type: 'AUTOFILL_RESULT',
            summary: { detected: 1, filled: 1, needsReview: 0, skipped: 2, hasMoreEntries: false },
          })
        }
      }
      return true
    })

    render(<App />)
    await screen.findByText('Workday page detected.')
    await user.click(screen.getByRole('button', { name: 'Autofill current page' }))

    expect(await screen.findByText('Some fields were skipped.')).toBeInTheDocument()
  })

  it('shows a guidance message when more than one work experience or education entry is stored', async () => {
    const user = userEvent.setup()
    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      if (message && typeof message === 'object' && 'type' in message) {
        if (message.type === 'GET_PAGE_STATUS') {
          sendResponse({ type: 'PAGE_STATUS', isWorkdayPage: true })
        } else if (message.type === 'AUTOFILL_PAGE') {
          sendResponse({
            type: 'AUTOFILL_RESULT',
            summary: { detected: 1, filled: 1, needsReview: 0, skipped: 0, hasMoreEntries: true },
          })
        }
      }
      return true
    })

    render(<App />)
    await screen.findByText('Workday page detected.')
    await user.click(screen.getByRole('button', { name: 'Autofill current page' }))

    expect(
      await screen.findByText(
        'If Workday has additional entries to fill, click "Add" on the page for the next Work Experience or Education entry, then click Autofill again.'
      )
    ).toBeInTheDocument()
  })
})
