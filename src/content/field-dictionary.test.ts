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
})
