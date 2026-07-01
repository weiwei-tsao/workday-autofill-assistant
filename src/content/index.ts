import { getProfile } from '../shared/storage/profile-repository'
import type {
  AutofillResultMessage,
  ExtensionMessage,
  PageStatusMessage,
} from '../shared/messaging/messages'
import type { Profile } from '../shared/types/profile'
import { isWorkdayPage } from './detector'
import { autofillFields } from './executor'
import { matchFields } from './matcher'
import { scanFields } from './scanner'

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
      getProfile().then((profile) => {
        const matches = matchFields(scanFields(document))
        // An empty profile has no non-empty string values for any canonical
        // key, so autofillFields naturally reports filled: 0 while still
        // computing detected/needsReview through the same single code path
        // used when a real profile is saved — no divergent counting logic.
        const summary = autofillFields(matches, profile ?? ({} as Profile))
        sendResponse({ type: 'AUTOFILL_RESULT', summary })
      })
      return true
    }

    return undefined
  }
)
