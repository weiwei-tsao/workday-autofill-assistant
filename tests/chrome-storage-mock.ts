type StorageChangeListener = (
  changes: Record<string, chrome.storage.StorageChange>,
  areaName: string
) => void

export function installChromeStorageMock() {
  const store = new Map<string, unknown>()
  const listeners = new Set<StorageChangeListener>()

  const local = {
    async get(key: string) {
      return { [key]: store.get(key) }
    },
    async set(items: Record<string, unknown>) {
      const changes: Record<string, chrome.storage.StorageChange> = {}
      for (const [key, newValue] of Object.entries(items)) {
        changes[key] = { oldValue: store.get(key), newValue }
        store.set(key, newValue)
      }
      listeners.forEach((listener) => listener(changes, 'local'))
    },
  }

  const onChanged = {
    addListener(listener: StorageChangeListener) {
      listeners.add(listener)
    },
    removeListener(listener: StorageChangeListener) {
      listeners.delete(listener)
    },
  }

  // @ts-expect-error partial chrome mock sufficient for these tests
  globalThis.chrome = { ...(globalThis.chrome ?? {}), storage: { local, onChanged } }

  return { store }
}
