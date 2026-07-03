import { useCallback, useEffect, useState } from 'react'
import { DEFAULT_PRIVACY_SETTINGS, type PrivacySettings } from '../types/privacy-settings'
import { getPrivacySettings } from './privacy-settings-repository'

export function usePrivacySettings() {
  const [settings, setSettings] = useState<PrivacySettings>(DEFAULT_PRIVACY_SETTINGS)
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    const next = await getPrivacySettings()
    setSettings(next)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    reload()
    function handleChange(
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) {
      if (areaName === 'local' && 'privacySettings' in changes) {
        reload()
      }
    }
    chrome.storage.onChanged.addListener(handleChange)
    return () => chrome.storage.onChanged.removeListener(handleChange)
  }, [reload])

  return { settings, isLoading, reload }
}
