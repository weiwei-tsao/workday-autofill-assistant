import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { getPrivacySettings, savePrivacySettings } from './privacy-settings-repository'

beforeEach(() => {
  installChromeStorageMock()
})

describe('privacy settings repository', () => {
  it('returns all-false defaults when nothing has been saved', async () => {
    expect(await getPrivacySettings()).toEqual({
      allowGenderAutoFill: false,
      allowRaceAutoFill: false,
      allowDisabilityAutoFill: false,
      allowVeteranStatusAutoFill: false,
    })
  })

  it('round-trips saved settings', async () => {
    await savePrivacySettings({
      allowGenderAutoFill: true,
      allowRaceAutoFill: false,
      allowDisabilityAutoFill: true,
      allowVeteranStatusAutoFill: false,
    })

    expect(await getPrivacySettings()).toEqual({
      allowGenderAutoFill: true,
      allowRaceAutoFill: false,
      allowDisabilityAutoFill: true,
      allowVeteranStatusAutoFill: false,
    })
  })
})
