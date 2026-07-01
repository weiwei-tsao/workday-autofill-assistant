export type FieldSection = 'workExperience' | 'education'

export interface FieldDictionaryEntry {
  canonicalKey: string
  patterns: RegExp[]
  section?: FieldSection
}

export const FIELD_DICTIONARY: FieldDictionaryEntry[] = [
  // Personal info — section-agnostic, matches anywhere on the page
  { canonicalKey: 'firstName', patterns: [/first\s*name/i, /given\s*name/i] },
  { canonicalKey: 'lastName', patterns: [/last\s*name/i, /family\s*name/i, /surname/i] },
  { canonicalKey: 'email', patterns: [/email/i] },
  { canonicalKey: 'phone', patterns: [/phone/i, /mobile/i] },
  { canonicalKey: 'linkedinUrl', patterns: [/linkedin/i] },
  { canonicalKey: 'postalCode', patterns: [/postal\s*code/i, /zip\s*code/i, /\bzip\b/i] },

  // Work experience
  {
    canonicalKey: 'companyName',
    patterns: [/company\s*name/i, /employer/i],
    section: 'workExperience',
  },
  {
    canonicalKey: 'jobTitle',
    patterns: [/job\s*title/i, /position\s*title/i],
    section: 'workExperience',
  },
  { canonicalKey: 'location', patterns: [/location/i], section: 'workExperience' },
  { canonicalKey: 'startMonth', patterns: [/start\s*month/i], section: 'workExperience' },
  { canonicalKey: 'startYear', patterns: [/start\s*year/i], section: 'workExperience' },
  { canonicalKey: 'endMonth', patterns: [/end\s*month/i], section: 'workExperience' },
  { canonicalKey: 'endYear', patterns: [/end\s*year/i], section: 'workExperience' },
  {
    canonicalKey: 'currentlyWorking',
    patterns: [/currently\s*working/i, /current\s*(position|role|job)/i],
    section: 'workExperience',
  },
  {
    canonicalKey: 'description',
    patterns: [/description/i, /responsibilities/i],
    section: 'workExperience',
  },

  // Education
  {
    canonicalKey: 'schoolName',
    patterns: [/school\s*name/i, /\bschool\b/i, /university/i, /institution/i],
    section: 'education',
  },
  { canonicalKey: 'degree', patterns: [/degree/i], section: 'education' },
  {
    canonicalKey: 'fieldOfStudy',
    patterns: [/field\s*of\s*study/i, /major/i],
    section: 'education',
  },
  { canonicalKey: 'location', patterns: [/location/i], section: 'education' },
  { canonicalKey: 'startYear', patterns: [/start\s*year/i], section: 'education' },
  { canonicalKey: 'endYear', patterns: [/end\s*year/i], section: 'education' },
  { canonicalKey: 'gpa', patterns: [/\bgpa\b/i], section: 'education' },
  { canonicalKey: 'description', patterns: [/description/i], section: 'education' },
]
