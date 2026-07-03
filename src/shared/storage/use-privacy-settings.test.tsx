import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { savePrivacySettings } from './privacy-settings-repository'
import { usePrivacySettings } from './use-privacy-settings'

beforeEach(() => {
  installChromeStorageMock()
})

describe('usePrivacySettings', () => {
  it('loads all-false defaults when nothing is saved, then reflects storage updates', async () => {
    const { result } = renderHook(() => usePrivacySettings())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.settings).toEqual({
      allowGenderAutoFill: false,
      allowRaceAutoFill: false,
      allowDisabilityAutoFill: false,
      allowVeteranStatusAutoFill: false,
    })

    await act(async () => {
      await savePrivacySettings({
        allowGenderAutoFill: true,
        allowRaceAutoFill: false,
        allowDisabilityAutoFill: false,
        allowVeteranStatusAutoFill: false,
      })
    })

    await waitFor(() => expect(result.current.settings.allowGenderAutoFill).toBe(true))
  })
})
