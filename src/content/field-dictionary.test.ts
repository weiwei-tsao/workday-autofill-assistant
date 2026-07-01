import { describe, expect, it } from 'vitest'
import { FIELD_DICTIONARY } from './field-dictionary'

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
})
