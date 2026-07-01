export interface FieldDictionaryEntry {
  canonicalKey: string
  patterns: RegExp[]
}

export const FIELD_DICTIONARY: FieldDictionaryEntry[] = [
  { canonicalKey: 'firstName', patterns: [/first\s*name/i, /given\s*name/i] },
  { canonicalKey: 'lastName', patterns: [/last\s*name/i, /family\s*name/i, /surname/i] },
  { canonicalKey: 'email', patterns: [/email/i] },
  { canonicalKey: 'phone', patterns: [/phone/i, /mobile/i] },
  { canonicalKey: 'linkedinUrl', patterns: [/linkedin/i] },
  { canonicalKey: 'postalCode', patterns: [/postal\s*code/i, /zip\s*code/i, /\bzip\b/i] },
]
