export async function getLocal<T>(key: string): Promise<T | undefined> {
  const result = await chrome.storage.local.get(key)
  return result[key] as T | undefined
}

export async function setLocal<T>(key: string, value: T): Promise<void> {
  await chrome.storage.local.set({ [key]: value })
}
