export interface PrivacySettings {
  allowGenderAutoFill: boolean
  allowRaceAutoFill: boolean
  allowDisabilityAutoFill: boolean
  allowVeteranStatusAutoFill: boolean
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  allowGenderAutoFill: false,
  allowRaceAutoFill: false,
  allowDisabilityAutoFill: false,
  allowVeteranStatusAutoFill: false,
}
