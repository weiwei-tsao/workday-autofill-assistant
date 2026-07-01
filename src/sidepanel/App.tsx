import { useEffect, useState } from 'react'
import type { PageStatusMessage } from '../shared/messaging/messages'

type Status = 'loading' | 'workday-detected' | 'not-workday'

export function App() {
  const [status, setStatus] = useState<Status>('loading')

  useEffect(() => {
    let cancelled = false

    async function checkPageStatus() {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
      if (!tab?.id) {
        if (!cancelled) setStatus('not-workday')
        return
      }
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

  return (
    <div className="p-4">
      <h1 className="text-lg font-semibold mb-2">Workday Autofill Assistant</h1>
      {status === 'loading' && <p>Checking current page…</p>}
      {status === 'workday-detected' && <p>Workday page detected.</p>}
      {status === 'not-workday' && <p>No Workday page detected.</p>}
    </div>
  )
}
