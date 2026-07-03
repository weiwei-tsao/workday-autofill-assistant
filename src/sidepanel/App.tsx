import { useEffect, useState } from 'react'
import type {
  ApplicationSavedMessage,
  AutofillResultMessage,
  PageStatusMessage,
} from '../shared/messaging/messages'

type Status = 'loading' | 'workday-detected' | 'not-workday'

const primaryButtonClass =
  'font-sans text-[14px] font-semibold bg-ink text-white rounded-xl px-3.5 py-3.5 hover:bg-[#2E2B26] transition-colors duration-150 w-full'
const secondaryButtonClass =
  'font-sans text-[13px] font-semibold bg-surface text-ink border border-line-strong rounded-xl px-3 py-3 hover:bg-[#FBFAF8] transition-colors duration-150 w-full'
const cardClass = 'bg-surface border border-line rounded-card p-4 flex flex-col gap-2'

function Wordmark() {
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-sans text-[16px] font-bold tracking-[-0.02em]">autofill</span>
      <span className="flex">
        <span className="w-2.5 h-2.5 rounded-full bg-teal" />
        <span className="w-2.5 h-2.5 rounded-full bg-primary -ml-1" />
        <span className="w-2.5 h-2.5 rounded-full bg-amber -ml-1" />
      </span>
    </div>
  )
}

function StatBox({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="border border-line rounded-input px-3 py-2.5 flex flex-col gap-0.5">
      <span className={`text-[20px] font-bold tracking-[-0.02em] ${color}`}>{value}</span>
      <span className="font-mono text-[10px] text-muted">{label}</span>
    </div>
  )
}

export function App() {
  const [status, setStatus] = useState<Status>('loading')
  const [tabId, setTabId] = useState<number | undefined>(undefined)
  const [summary, setSummary] = useState<AutofillResultMessage['summary'] | undefined>(undefined)
  const [savedRecord, setSavedRecord] = useState<ApplicationSavedMessage['record'] | undefined>(
    undefined
  )

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

  async function handleSaveApplication() {
    if (!tabId) return
    try {
      const response = (await chrome.tabs.sendMessage(tabId, {
        type: 'SAVE_APPLICATION',
      })) as ApplicationSavedMessage | undefined
      if (response?.record) {
        setSavedRecord(response.record)
      }
    } catch {
      // Same as handleAutofill: the tab may have navigated away or the
      // content script may no longer be listening.
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex items-center justify-between px-4.5 py-3.5 border-b border-line bg-surface">
        <Wordmark />
        <span className="font-mono text-[10px] text-muted">v1.0.0</span>
      </div>

      <div className="p-4.5 flex flex-col gap-3.5">
        {status === 'loading' && (
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-[#C9C3BA]" />
            <p className="font-mono text-[12px] text-muted m-0">Checking current page…</p>
          </div>
        )}

        {status === 'not-workday' && (
          <>
            <div className={cardClass}>
              <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-[#C9C3BA]" />
                No Workday page detected.
              </span>
            </div>
            <button
              type="button"
              onClick={() => chrome.runtime.openOptionsPage()}
              className={secondaryButtonClass}
            >
              Open profile
            </button>
          </>
        )}

        {status === 'workday-detected' && (
          <>
            <div className={cardClass}>
              <span className="inline-flex items-center gap-2 text-[13px] font-semibold">
                <span className="w-2 h-2 rounded-full bg-success" />
                Workday page detected.
              </span>
            </div>
            <button type="button" onClick={handleAutofill} className={primaryButtonClass}>
              Autofill current page
            </button>
            {summary && (
              <div className={cardClass}>
                <span className="font-mono text-[11px] text-muted uppercase tracking-[0.08em]">
                  Last run
                </span>
                <div className="grid grid-cols-2 gap-2">
                  <StatBox value={summary.detected} label="detected" color="text-ink" />
                  <StatBox value={summary.filled} label="filled" color="text-success" />
                  <StatBox value={summary.needsReview} label="needs review" color="text-warning" />
                  <StatBox value={summary.skipped} label="skipped" color="text-faint" />
                </div>
                {summary.skipped > 0 && (
                  <p className="text-[12px] text-muted m-0">Some fields were skipped.</p>
                )}
                {summary.hasMoreEntries && (
                  <div className="border-t border-hairline pt-2.5 text-[12px] text-muted leading-normal">
                    If Workday has additional entries to fill, click &quot;Add&quot; on the page for
                    the next Work Experience or Education entry, then click Autofill again.
                  </div>
                )}
              </div>
            )}
            <button type="button" onClick={handleSaveApplication} className={secondaryButtonClass}>
              Save application
            </button>
            {savedRecord && (
              <>
                <div className="bg-[#F0F7F4] border border-[#CFE5DB] rounded-card px-3.5 py-3 flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full bg-success flex-shrink-0" />
                  <span className="text-[12px] text-ink">
                    Saved application for {savedRecord.jobTitle} at {savedRecord.companyName}.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => chrome.runtime.openOptionsPage()}
                  className="text-[12px] font-semibold text-primary self-center py-1"
                >
                  Open profile →
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
