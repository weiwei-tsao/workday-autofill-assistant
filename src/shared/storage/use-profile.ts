import { useCallback, useEffect, useState } from 'react'
import type { Profile } from '../types/profile'
import { getProfile } from './profile-repository'

export function useProfile() {
  const [profile, setProfile] = useState<Profile | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(true)

  const reload = useCallback(async () => {
    const next = await getProfile()
    setProfile(next)
    setIsLoading(false)
  }, [])

  useEffect(() => {
    reload()
    function handleChange(changes: Record<string, chrome.storage.StorageChange>, areaName: string) {
      if (areaName === 'local' && 'profile' in changes) {
        reload()
      }
    }
    chrome.storage.onChanged.addListener(handleChange)
    return () => chrome.storage.onChanged.removeListener(handleChange)
  }, [reload])

  return { profile, isLoading, reload }
}
