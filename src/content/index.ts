import { getProfile } from '../shared/storage/profile-repository'
import { answerBankRepository } from '../shared/storage/answer-bank-repository'
import { applicationRecordRepository } from '../shared/storage/application-record-repository'
import { educationRepository } from '../shared/storage/education-repository'
import { workExperienceRepository } from '../shared/storage/work-experience-repository'
import type {
  ApplicationSavedMessage,
  AutofillResultMessage,
  AutofillSummary,
  ExtensionMessage,
  PageStatusMessage,
} from '../shared/messaging/messages'
import type { ApplicationRecord } from '../shared/types/application-record'
import type { Profile } from '../shared/types/profile'
import { extractApplicationInfo } from './application-extractor'
import { COMMON_QUESTION_KEYS } from './field-dictionary'
import { isWorkdayPage } from './detector'
import { autofillAnswerBankFields, autofillFields, autofillSectionFields } from './executor'
import { matchFields } from './matcher'
import { scanFields } from './scanner'

function sumSummaries(summaries: AutofillSummary[]): AutofillSummary {
  return summaries.reduce(
    (total, summary) => ({
      detected: total.detected + summary.detected,
      filled: total.filled + summary.filled,
      needsReview: total.needsReview + summary.needsReview,
    }),
    { detected: 0, filled: 0, needsReview: 0 }
  )
}

chrome.runtime.onMessage.addListener(
  (
    message: ExtensionMessage,
    _sender,
    sendResponse: (
      response: PageStatusMessage | AutofillResultMessage | ApplicationSavedMessage
    ) => void
  ) => {
    if (message.type === 'GET_PAGE_STATUS') {
      sendResponse({
        type: 'PAGE_STATUS',
        isWorkdayPage: isWorkdayPage(location.hostname, document),
      })
      return true
    }

    if (message.type === 'AUTOFILL_PAGE') {
      Promise.all([
        getProfile(),
        workExperienceRepository.list(),
        educationRepository.list(),
        answerBankRepository.list(),
      ]).then(([profile, workExperiences, educations, answerBank]) => {
        const matches = matchFields(scanFields(document))
        const sectionAgnosticMatches = matches.filter((match) => match.section === null)
        const commonQuestionMatches = sectionAgnosticMatches.filter(
          (match) => match.canonicalKey !== null && COMMON_QUESTION_KEYS.has(match.canonicalKey)
        )
        const personalInfoMatches = sectionAgnosticMatches.filter(
          (match) => match.canonicalKey === null || !COMMON_QUESTION_KEYS.has(match.canonicalKey)
        )
        const workExperienceMatches = matches.filter(
          (match) => match.section === 'workExperience'
        )
        const educationMatches = matches.filter((match) => match.section === 'education')

        const summary = sumSummaries([
          autofillFields(personalInfoMatches, profile ?? ({} as Profile)),
          autofillSectionFields(workExperienceMatches, 'workExperience', workExperiences[0]),
          autofillSectionFields(educationMatches, 'education', educations[0]),
          autofillAnswerBankFields(commonQuestionMatches, answerBank),
        ])

        sendResponse({ type: 'AUTOFILL_RESULT', summary })
      })
      return true
    }

    if (message.type === 'SAVE_APPLICATION') {
      const info = extractApplicationInfo(document)
      const record: ApplicationRecord = {
        id: crypto.randomUUID(),
        companyName: info.companyName,
        jobTitle: info.jobTitle,
        jobLocation: info.jobLocation || undefined,
        jobUrl: info.jobUrl,
        applicationDate: info.applicationDate,
        sourcePlatform: 'Workday',
        status: 'Applied',
      }
      applicationRecordRepository.add(record).then(() => {
        sendResponse({ type: 'APPLICATION_SAVED', record })
      })
      return true
    }

    return undefined
  }
)
