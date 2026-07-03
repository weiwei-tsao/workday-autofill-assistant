import { usePrivacySettings } from '../../shared/storage/use-privacy-settings'
import { savePrivacySettings } from '../../shared/storage/privacy-settings-repository'
import type { PrivacySettings } from '../../shared/types/privacy-settings'

export function PrivacySettingsPage() {
  const { settings, isLoading } = usePrivacySettings()

  async function handleToggle(key: keyof PrivacySettings, checked: boolean) {
    await savePrivacySettings({ ...settings, [key]: checked })
  }

  if (isLoading) return null

  return (
    <section>
      <h2>Privacy settings</h2>
      <p>
        Sensitive questions (gender, race/ethnicity, disability status, veteran status) are never
        auto-filled unless you explicitly enable it here, per category.
      </p>
      <div>
        <label htmlFor="allowGenderAutoFill">
          <input
            id="allowGenderAutoFill"
            type="checkbox"
            checked={settings.allowGenderAutoFill}
            onChange={(event) => handleToggle('allowGenderAutoFill', event.target.checked)}
          />
          Allow auto-fill for Gender
        </label>
      </div>
      <div>
        <label htmlFor="allowRaceAutoFill">
          <input
            id="allowRaceAutoFill"
            type="checkbox"
            checked={settings.allowRaceAutoFill}
            onChange={(event) => handleToggle('allowRaceAutoFill', event.target.checked)}
          />
          Allow auto-fill for Race / Ethnicity
        </label>
      </div>
      <div>
        <label htmlFor="allowDisabilityAutoFill">
          <input
            id="allowDisabilityAutoFill"
            type="checkbox"
            checked={settings.allowDisabilityAutoFill}
            onChange={(event) => handleToggle('allowDisabilityAutoFill', event.target.checked)}
          />
          Allow auto-fill for Disability status
        </label>
      </div>
      <div>
        <label htmlFor="allowVeteranStatusAutoFill">
          <input
            id="allowVeteranStatusAutoFill"
            type="checkbox"
            checked={settings.allowVeteranStatusAutoFill}
            onChange={(event) =>
              handleToggle('allowVeteranStatusAutoFill', event.target.checked)
            }
          />
          Allow auto-fill for Veteran status
        </label>
      </div>
    </section>
  )
}
