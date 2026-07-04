import { usePrivacySettings } from '../../shared/storage/use-privacy-settings'
import { savePrivacySettings } from '../../shared/storage/privacy-settings-repository'
import type { PrivacySettings } from '../../shared/types/privacy-settings'

interface Row {
  key: keyof PrivacySettings
  label: string
  accessibleName: string
  onDescription: string
}

const ROWS: Row[] = [
  {
    key: 'allowGenderAutoFill',
    label: 'Gender',
    accessibleName: 'Allow auto-fill for Gender',
    onDescription: 'Allow auto-fill of your saved gender answer',
  },
  {
    key: 'allowRaceAutoFill',
    label: 'Race / Ethnicity',
    accessibleName: 'Allow auto-fill for Race / Ethnicity',
    onDescription: 'Allow auto-fill of your saved race / ethnicity answer',
  },
  {
    key: 'allowDisabilityAutoFill',
    label: 'Disability status',
    accessibleName: 'Allow auto-fill for Disability status',
    onDescription: 'Allow auto-fill of your saved disability status answer',
  },
  {
    key: 'allowVeteranStatusAutoFill',
    label: 'Veteran status',
    accessibleName: 'Allow auto-fill for Veteran status',
    onDescription: 'Allow auto-fill of your saved veteran status answer',
  },
]

export function PrivacySettingsPage() {
  const { settings, isLoading } = usePrivacySettings()

  async function handleToggle(key: keyof PrivacySettings, checked: boolean) {
    await savePrivacySettings({ ...settings, [key]: checked })
  }

  if (isLoading) return null

  return (
    <section className="bg-raised border border-[#E3DFD8] rounded-panel shadow-[0_12px_32px_rgba(28,26,23,0.08)] p-6 flex flex-col gap-4 max-w-xl">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[20px] font-semibold tracking-[-0.02em]">Privacy settings</h2>
        <span className="text-[13px] text-muted">
          Sensitive categories are off by default and never auto-filled.
        </span>
      </div>
      <div className="bg-surface border border-line rounded-card shadow-[0_1px_2px_rgba(28,26,23,0.04)] overflow-hidden">
        {ROWS.map((row) => {
          const isOn = settings[row.key]
          return (
            <div
              key={row.key}
              className="flex items-center justify-between px-4.5 py-3.5 border-b border-hairline last:border-b-0"
            >
              <div className="flex flex-col gap-0.5">
                <span className="text-[13px] font-semibold">{row.label}</span>
                <span className="text-[12px] text-muted">
                  {isOn ? row.onDescription : 'Off — highlighted for manual review instead'}
                </span>
              </div>
              <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <span className="sr-only">{row.accessibleName}</span>
                <input
                  type="checkbox"
                  className="sr-only peer"
                  aria-label={row.accessibleName}
                  checked={isOn}
                  onChange={(event) => handleToggle(row.key, event.target.checked)}
                />
                <span className="w-[34px] h-5 bg-line-strong peer-checked:bg-success rounded-full transition-colors duration-150 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:shadow-[0_1px_2px_rgba(28,26,23,0.2)] after:transition-all after:duration-150 peer-checked:after:translate-x-[14px]" />
              </label>
            </div>
          )
        })}
      </div>
    </section>
  )
}
