import { useEffect, useState } from 'react'
import type { AutofillResultMessage, PageStatusMessage } from '../shared/messaging/messages'

type Status = 'loading' | 'workday-detected' | 'not-workday'

export function App() {
  const [status, setStatus] = useState<Status>('loading')
  const [tabId, setTabId] = useState<number | undefined>(undefined)
  const [summary, setSummary] = useState<AutofillResultMessage['summary'] | undefined>(undefined)

  useEffect(() => {
    let cancelled = false

    async function checkPageStatus() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        if (!cancelled) setStatus('not-workday')
        return
      }
      if (!cancelled) setTabId(tab.id)
      try {
        const response = (await chrome.tabs.sendMessage(tab.id, {
          type: 'GET_PAGE_STATUS',
        })) as PageStatusMessage | undefined
        if (!cancelled) {
          setStatus(response?.isWorkdayPage ? 'workday-detected' : 'not-workday')
        }
      } catch {
        // No content script is listening on this tab — it only injects on
        // *.myworkdayjobs.com, so any other page rejects here rather than
        // resolving. Treat that the same as "not a Workday page".
        if (!cancelled) setStatus('not-workday')
      }
    }

    checkPageStatus()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleAutofill() {
    if (!tabId) return
    try {
      const response = (await chrome.tabs.sendMessage(tabId, {
        type: 'AUTOFILL_PAGE',
      })) as AutofillResultMessage | undefined
      if (response?.summary) {
        setSummary(response.summary)
      }
    } catch {
      // The tab may have navigated away or the content script may no longer
      // be listening — nothing to update; the button stays clickable so the
      // user can retry.
    }
  }

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-2">Workday Autofill Assistant</h1>
      {status === 'loading' && <p>Checking current page…</p>}
      {status === 'not-workday' && <p>No Workday page detected.</p>}
      {status === 'workday-detected' && (
        <>
          <p>Workday page detected.</p>
          <button type="button" onClick={handleAutofill}>
            Autofill current page
          </button>
          {summary && (
            <p>
              Detected {summary.detected} supported fields. Filled {summary.filled} fields.
              {summary.needsReview > 0 ? ` ${summary.needsReview} fields require review.` : ''}
            </p>
          )}
        </>
      )}
    </div>
  )
}
