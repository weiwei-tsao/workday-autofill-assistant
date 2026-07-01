import { getProfile } from '../shared/storage/profile-repository'
import { educationRepository } from '../shared/storage/education-repository'
import { workExperienceRepository } from '../shared/storage/work-experience-repository'
import type {
  AutofillResultMessage,
  AutofillSummary,
  ExtensionMessage,
  PageStatusMessage,
} from '../shared/messaging/messages'
import type { Profile } from '../shared/types/profile'
import { isWorkdayPage } from './detector'
import { autofillFields, autofillSectionFields } from './executor'
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
    sendResponse: (response: PageStatusMessage | AutofillResultMessage) => void
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
      ]).then(([profile, workExperiences, educations]) => {
        const matches = matchFields(scanFields(document))
        const personalInfoMatches = matches.filter((match) => match.section === null)
        const workExperienceMatches = matches.filter(
          (match) => match.section === 'workExperience'
        )
        const educationMatches = matches.filter((match) => match.section === 'education')

        const summary = sumSummaries([
          autofillFields(personalInfoMatches, profile ?? ({} as Profile)),
          autofillSectionFields(workExperienceMatches, 'workExperience', workExperiences[0]),
          autofillSectionFields(educationMatches, 'education', educations[0]),
        ])

        sendResponse({ type: 'AUTOFILL_RESULT', summary })
      })
      return true
    }

    return undefined
  }
)
