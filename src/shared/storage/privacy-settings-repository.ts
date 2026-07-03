import { DEFAULT_PRIVACY_SETTINGS, type PrivacySettings } from '../types/privacy-settings'
import { getLocal, setLocal } from './local-store'

const PRIVACY_SETTINGS_KEY = 'privacySettings'

export async function getPrivacySettings(): Promise<PrivacySettings> {
  const stored = await getLocal<PrivacySettings>(PRIVACY_SETTINGS_KEY)
  return stored ?? DEFAULT_PRIVACY_SETTINGS
}

export async function savePrivacySettings(settings: PrivacySettings): Promise<void> {
  await setLocal(PRIVACY_SETTINGS_KEY, settings)
}
