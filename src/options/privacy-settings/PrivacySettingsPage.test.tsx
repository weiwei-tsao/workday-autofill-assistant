import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { getPrivacySettings } from '../../shared/storage/privacy-settings-repository'
import { PrivacySettingsPage } from './PrivacySettingsPage'

beforeEach(() => {
  installChromeStorageMock()
})

describe('PrivacySettingsPage', () => {
  it('renders all four toggles unchecked by default', async () => {
    render(<PrivacySettingsPage />)

    expect(await screen.findByLabelText('Allow auto-fill for Gender')).not.toBeChecked()
    expect(screen.getByLabelText('Allow auto-fill for Race / Ethnicity')).not.toBeChecked()
    expect(screen.getByLabelText('Allow auto-fill for Disability status')).not.toBeChecked()
    expect(screen.getByLabelText('Allow auto-fill for Veteran status')).not.toBeChecked()
  })

  it('saves a toggle change immediately without a separate save button', async () => {
    const user = userEvent.setup()
    render(<PrivacySettingsPage />)

    const genderToggle = await screen.findByLabelText('Allow auto-fill for Gender')
    await user.click(genderToggle)

    expect(genderToggle).toBeChecked()
    const saved = await getPrivacySettings()
    expect(saved.allowGenderAutoFill).toBe(true)
    expect(saved.allowRaceAutoFill).toBe(false)
  })
})
