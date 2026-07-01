type MessageListener = (
  message: unknown,
  sender: chrome.runtime.MessageSender,
  sendResponse: (response?: unknown) => void
) => void | boolean

export function installChromeRuntimeMock() {
  const messageListeners = new Set<MessageListener>()
  const installedListeners = new Set<() => void>()
  let sidePanelBehavior: { openPanelOnActionClick?: boolean } | undefined

  const runtime = {
    onMessage: {
      addListener(listener: MessageListener) {
        messageListeners.add(listener)
      },
      removeListener(listener: MessageListener) {
        messageListeners.delete(listener)
      },
    },
    onInstalled: {
      addListener(listener: () => void) {
        installedListeners.add(listener)
      },
    },
  }

  const tabs = {
    async query() {
      return [{ id: 1 }]
    },
    async sendMessage(tabId: number, message: unknown) {
      if (messageListeners.size === 0) {
        // Matches real chrome.tabs.sendMessage: when no content script is
        // listening on the target tab at all, the call rejects rather than
        // resolving undefined.
        return Promise.reject(
          new Error('Could not establish connection. Receiving end does not exist.')
        )
      }
      return new Promise((resolve) => {
        let responded = false
        let keepChannelOpenForAsyncResponse = false
        messageListeners.forEach((listener) => {
          const keepOpen = listener(
            message,
            { tab: { id: tabId } } as chrome.runtime.MessageSender,
            (response) => {
              if (!responded) {
                responded = true
                resolve(response)
              }
            }
          )
          if (keepOpen === true) keepChannelOpenForAsyncResponse = true
        })
        if (!responded && !keepChannelOpenForAsyncResponse) {
          resolve(undefined)
        }
      })
    },
  }

  const sidePanel = {
    async setPanelBehavior(options: { openPanelOnActionClick?: boolean }) {
      sidePanelBehavior = options
    },
  }

  // @ts-expect-error partial chrome mock sufficient for these tests
  globalThis.chrome = { ...(globalThis.chrome ?? {}), runtime, tabs, sidePanel }

  return {
    triggerInstalled() {
      installedListeners.forEach((listener) => listener())
    },
    getSidePanelBehavior: () => sidePanelBehavior,
  }
}
