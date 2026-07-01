import { describe, expect, it } from 'vitest'
import { FIELD_DICTIONARY, COMMON_QUESTION_KEYS } from './field-dictionary'

describe('FIELD_DICTIONARY', () => {
  it('maps common label synonyms to their canonical keys', () => {
    const byKey = (key: string) => FIELD_DICTIONARY.find((entry) => entry.canonicalKey === key)

    expect(byKey('firstName')?.patterns.some((p) => p.test('First Name'))).toBe(true)
    expect(byKey('firstName')?.patterns.some((p) => p.test('Given Name'))).toBe(true)
    expect(byKey('lastName')?.patterns.some((p) => p.test('Last Name'))).toBe(true)
    expect(byKey('lastName')?.patterns.some((p) => p.test('Family Name'))).toBe(true)
    expect(byKey('email')?.patterns.some((p) => p.test('Email Address'))).toBe(true)
    expect(byKey('phone')?.patterns.some((p) => p.test('Phone Number'))).toBe(true)
    expect(byKey('linkedinUrl')?.patterns.some((p) => p.test('LinkedIn Profile'))).toBe(true)
    expect(byKey('postalCode')?.patterns.some((p) => p.test('Postal Code'))).toBe(true)
  })

  it('tags work experience fields with the workExperience section', () => {
    const byKey = (key: string, section: string) =>
      FIELD_DICTIONARY.find((entry) => entry.canonicalKey === key && entry.section === section)

    expect(byKey('companyName', 'workExperience')?.patterns.some((p) => p.test('Company Name'))).toBe(
      true
    )
    expect(byKey('jobTitle', 'workExperience')?.patterns.some((p) => p.test('Job Title'))).toBe(true)
    expect(byKey('startYear', 'workExperience')?.patterns.some((p) => p.test('Start Year'))).toBe(true)
    expect(
      byKey('currentlyWorking', 'workExperience')?.patterns.some((p) => p.test('Currently Working'))
    ).toBe(true)
  })

  it('tags education fields with the education section', () => {
    const byKey = (key: string, section: string) =>
      FIELD_DICTIONARY.find((entry) => entry.canonicalKey === key && entry.section === section)

    expect(byKey('schoolName', 'education')?.patterns.some((p) => p.test('School Name'))).toBe(true)
    expect(byKey('degree', 'education')?.patterns.some((p) => p.test('Degree'))).toBe(true)
    expect(byKey('fieldOfStudy', 'education')?.patterns.some((p) => p.test('Field of Study'))).toBe(
      true
    )
    expect(byKey('gpa', 'education')?.patterns.some((p) => p.test('GPA'))).toBe(true)
  })

  it('leaves personal-info fields section-agnostic', () => {
    const firstNameEntry = FIELD_DICTIONARY.find((entry) => entry.canonicalKey === 'firstName')
    expect(firstNameEntry?.section).toBeUndefined()
  })

  it('tags common question fields with canonical keys and leaves them section-agnostic', () => {
    const byKey = (key: string) => FIELD_DICTIONARY.find((entry) => entry.canonicalKey === key)

    expect(
      byKey('workAuthorization')?.patterns.some((p) =>
        p.test('Are you legally authorized to work in this country?')
      )
    ).toBe(true)
    expect(
      byKey('sponsorship')?.patterns.some((p) =>
        p.test('Will you now or in the future require sponsorship?')
      )
    ).toBe(true)
    expect(byKey('relocate')?.patterns.some((p) => p.test('Are you willing to relocate?'))).toBe(
      true
    )
    expect(
      byKey('relocate')?.patterns.some((p) => p.test('Would you consider relocating for this role?'))
    ).toBe(true)
    expect(byKey('workArrangement')?.patterns.some((p) => p.test('Work arrangement'))).toBe(true)
    expect(byKey('desiredSalary')?.patterns.some((p) => p.test('Desired salary'))).toBe(true)
    expect(byKey('noticePeriod')?.patterns.some((p) => p.test('Notice period'))).toBe(true)
    expect(byKey('yearsOfExperience')?.patterns.some((p) => p.test('Years of experience'))).toBe(
      true
    )
    expect(
      byKey('whyInterested')?.patterns.some((p) => p.test('Why are you interested in this role?'))
    ).toBe(true)
    expect(byKey('workAuthorization')?.section).toBeUndefined()
  })

  it('exports COMMON_QUESTION_KEYS containing exactly the 8 common-question canonical keys', () => {
    expect(COMMON_QUESTION_KEYS.size).toBe(8)
    expect(COMMON_QUESTION_KEYS.has('workAuthorization')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('sponsorship')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('relocate')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('workArrangement')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('desiredSalary')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('noticePeriod')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('yearsOfExperience')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('whyInterested')).toBe(true)
    expect(COMMON_QUESTION_KEYS.has('firstName')).toBe(false)
  })
})
