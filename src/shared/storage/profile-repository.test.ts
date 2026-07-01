import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import type { Profile } from '../types/profile'
import { getProfile, saveProfile } from './profile-repository'

beforeEach(() => {
  installChromeStorageMock()
})

const sampleProfile: Profile = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '555-0100',
  country: 'Canada',
  addressLine1: '123 Main St',
  city: 'Toronto',
  province: 'ON',
  postalCode: 'M5V 2T6',
  workAuthorizationStatus: 'Citizen',
  sponsorshipRequired: false,
}

describe('profile-repository', () => {
  it('returns undefined when no profile has been saved', async () => {
    expect(await getProfile()).toBeUndefined()
  })

  it('saves and retrieves a profile', async () => {
    await saveProfile(sampleProfile)
    expect(await getProfile()).toEqual(sampleProfile)
  })
})
