import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { getProfile } from '../../shared/storage/profile-repository'
import { PersonalInfoPage } from './PersonalInfoPage'

beforeEach(() => {
  installChromeStorageMock()
})

describe('PersonalInfoPage', () => {
  it('saves a filled-in profile to storage', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoPage />)

    await user.type(screen.getByLabelText('First name'), 'Ada')
    await user.type(screen.getByLabelText('Last name'), 'Lovelace')
    await user.type(screen.getByLabelText('Email'), 'ada@example.com')
    await user.type(screen.getByLabelText('Phone number'), '555-0100')
    await user.type(screen.getByLabelText('Country'), 'Canada')
    await user.type(screen.getByLabelText('Address line 1'), '123 Main St')
    await user.type(screen.getByLabelText('City'), 'Toronto')
    await user.type(screen.getByLabelText('Province / State'), 'ON')
    await user.type(screen.getByLabelText('Postal code'), 'M5V 2T6')
    await user.type(screen.getByLabelText('Work authorization status'), 'Citizen')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    await screen.findByRole('status')
    const saved = await getProfile()
    expect(saved).toMatchObject({ firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' })
  })

  it('shows a validation error when email is invalid', async () => {
    const user = userEvent.setup()
    render(<PersonalInfoPage />)

    await user.type(screen.getByLabelText('Email'), 'not-an-email')
    await user.click(screen.getByRole('button', { name: 'Save' }))

    expect(await screen.findByText('Enter a valid email address')).toBeInTheDocument()
  })
})
