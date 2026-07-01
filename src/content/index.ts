import { getProfile } from '../shared/storage/profile-repository'
import type {
  AutofillResultMessage,
  ExtensionMessage,
  PageStatusMessage,
} from '../shared/messaging/messages'
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
        const summary = profile
          ? autofillFields(matches, profile)
          : {
              detected: matches.filter((match) => match.canonicalKey !== null).length,
              filled: 0,
              needsReview: 0,
            }
        sendResponse({ type: 'AUTOFILL_RESULT', summary })
      })
      return true
    }

    return undefined
  }
)
