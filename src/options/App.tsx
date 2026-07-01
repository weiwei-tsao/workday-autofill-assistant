import { useState } from 'react'
import { AnswerBankPage } from './answer-bank/AnswerBankPage'
import { EducationPage } from './education/EducationPage'
import { PersonalInfoPage } from './personal-info/PersonalInfoPage'
import { WorkExperiencePage } from './work-experience/WorkExperiencePage'

const TABS = [
  { key: 'personal', label: 'Personal info' },
  { key: 'work', label: 'Work experience' },
  { key: 'education', label: 'Education' },
  { key: 'answers', label: 'Answer bank' },
] as const

type TabKey = (typeof TABS)[number]['key']

export function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('personal')

  return (
    <div className="p-6">
      <h1 className="text-xl font-semibold mb-4">Workday Autofill Assistant — Profile</h1>
      <nav aria-label="Profile sections" className="flex gap-2 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            aria-current={activeTab === tab.key ? 'page' : undefined}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </nav>
      {activeTab === 'personal' && <PersonalInfoPage />}
      {activeTab === 'work' && <WorkExperiencePage />}
      {activeTab === 'education' && <EducationPage />}
      {activeTab === 'answers' && <AnswerBankPage />}
    </div>
  )
}
