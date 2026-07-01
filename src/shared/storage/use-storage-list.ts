import { useCallback, useEffect, useState } from 'react'

export function useStorageList<T>(storageKey: string, repository: { list: () => Promise<T[]> }) {
  const [items, setItems] = useState<T[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    const next = await repository.list()
    setItems(next)
    setIsLoading(false)
  }, [repository])

  useEffect(() => {
    reload()
    function handleChange(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
      if (areaName === 'local' && storageKey in changes) {
        reload()
      }
    }
    chrome.storage.onChanged.addListener(handleChange)
    return () => chrome.storage.onChanged.removeListener(handleChange)
  }, [storageKey, reload])

  return { items, isLoading, reload }
}
