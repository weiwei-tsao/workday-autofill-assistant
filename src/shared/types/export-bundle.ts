import type { AnswerBankEntry } from './answer-bank'
import type { ApplicationRecord } from './application-record'
import type { Education } from './education'
import type { Profile } from './profile'
import type { WorkExperience } from './work-experience'

export interface ExportBundle {
  exportedAt: string
  profile: Profile | undefined
  workExperiences: WorkExperience[]
  educations: Education[]
  answerBank: AnswerBankEntry[]
  applicationRecords: ApplicationRecord[]
}
