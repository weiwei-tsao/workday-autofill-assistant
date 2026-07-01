import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { saveProfile } from './profile-repository'
import { useProfile } from './use-profile'

beforeEach(() => {
  installChromeStorageMock()
})

describe('useProfile', () => {
  it('loads undefined when no profile is saved, then reflects storage updates', async () => {
    const { result } = renderHook(() => useProfile())

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.profile).toBeUndefined()

    await act(async () => {
      await saveProfile({
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
      })
    })

    await waitFor(() => expect(result.current.profile?.firstName).toBe('Ada'))
  })
})
