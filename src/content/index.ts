import type { ExtensionMessage, PageStatusMessage } from '../shared/messaging/messages'
import { isWorkdayPage } from './detector'

chrome.runtime.onMessage.addListener(
  (message: ExtensionMessage, _sender, sendResponse: (response: PageStatusMessage) => void) => {
    if (message.type === 'GET_PAGE_STATUS') {
      sendResponse({
        type: 'PAGE_STATUS',
        isWorkdayPage: isWorkdayPage(location.hostname, document),
      })
      return true
    }
    return undefined
  }
)
