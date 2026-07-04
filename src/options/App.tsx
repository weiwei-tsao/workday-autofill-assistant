import { useState } from 'react'
import { AnswerBankPage } from './answer-bank/AnswerBankPage'
import { ApplicationRecordsPage } from './application-records/ApplicationRecordsPage'
import { EducationPage } from './education/EducationPage'
import { ImportExportPage } from './import-export/ImportExportPage'
import { PersonalInfoPage } from './personal-info/PersonalInfoPage'
import { PrivacySettingsPage } from './privacy-settings/PrivacySettingsPage'
import { WorkExperiencePage } from './work-experience/WorkExperiencePage'

const NAV_GROUPS = [
  {
    label: 'PROFILE',
    tabs: [
      { key: 'personal', label: 'Personal info' },
      { key: 'work', label: 'Work experience' },
      { key: 'education', label: 'Education' },
      { key: 'answers', label: 'Answer bank' },
    ],
  },
  {
    label: 'ACTIVITY',
    tabs: [{ key: 'applications', label: 'Application records' }],
  },
  {
    label: 'DATA',
    tabs: [
      { key: 'import-export', label: 'Import / Export' },
      { key: 'privacy', label: 'Privacy settings' },
    ],
  },
] as const

// ponytail: NAV_GROUPS.flatMap((group) => group.tabs) fails tsc 6.0.3 (union-of-tuples
// doesn't distribute through flatMap's inference); derive the key union via indexed
// access instead, same result, no runtime array needed.
type TabKey = (typeof NAV_GROUPS)[number]['tabs'][number]['key']

function Wordmark({ size = 18 }: { size?: number }) {
  const dot = Math.round(size * 0.61)
  return (
    <div className="flex items-center gap-1.5">
      <span className="font-sans font-bold tracking-[-0.02em]" style={{ fontSize: size }}>
        autofill
      </span>
      <span className="flex">
        <span className="rounded-full bg-teal" style={{ width: dot, height: dot }} />
        <span
          className="rounded-full bg-primary"
          style={{ width: dot, height: dot, marginLeft: -dot * 0.35 }}
        />
        <span
          className="rounded-full bg-amber"
          style={{ width: dot, height: dot, marginLeft: -dot * 0.35 }}
        />
      </span>
    </div>
  )
}

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('personal')

  return (
    <div className="flex min-h-screen">
      <nav
        aria-label="Profile sections"
        className="w-[232px] flex-shrink-0 border-r border-line bg-surface px-3.5 py-5 flex flex-col gap-1"
      >
        <div className="px-2.5 pb-4.5 pt-1">
          <Wordmark />
        </div>
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-1">
            <span className="font-mono text-[10px] text-faint tracking-[0.1em] px-2.5 pt-4 pb-1.5">
              {group.label}
            </span>
            {group.tabs.map((tab) => {
              const isActive = activeTab === tab.key
              return (
                <button
                  key={tab.key}
                  type="button"
                  aria-current={isActive ? 'page' : undefined}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] text-left transition-colors ${
                    isActive ? 'bg-hairline font-semibold text-ink' : 'font-medium text-body'
                  }`}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-sm flex-shrink-0 ${
                      isActive ? 'bg-primary' : 'bg-[#C9C3BA]'
                    }`}
                  />
                  {tab.label}
                </button>
              )
            })}
          </div>
        ))}
        <div className="mt-auto border-t border-line pt-3.5 px-2.5 flex flex-col gap-0.5">
          <span className="text-[13px] font-semibold text-ink">Local-only storage</span>
          <span className="font-mono text-[10px] text-muted">nothing leaves this device</span>
        </div>
      </nav>
      <main className="flex-1 px-8 py-7">
        {activeTab === 'personal' && <PersonalInfoPage />}
        {activeTab === 'work' && <WorkExperiencePage />}
        {activeTab === 'education' && <EducationPage />}
        {activeTab === 'answers' && <AnswerBankPage />}
        {activeTab === 'applications' && <ApplicationRecordsPage />}
        {activeTab === 'import-export' && <ImportExportPage />}
        {activeTab === 'privacy' && <PrivacySettingsPage />}
      </main>
    </div>
  )
}
