import { describe, expect, it } from 'vitest'
import { matchField, matchFields } from './matcher'
import { scanFields } from './scanner'

function scanField(html: string) {
  document.body.innerHTML = html
  return scanFields(document)[0]
}

describe('matchField', () => {
  it('matches a labelled input whose id also matches the pattern at high confidence', () => {
    const field = scanField(
      '<label for="firstName">First Name</label><input id="firstName" name="firstName" />'
    )

    const match = matchField(field)

    expect(match.canonicalKey).toBe('firstName')
    expect(match.confidence).toBe('high')
  })

  it('matches "Given Name" as firstName from the label alone, at medium confidence', () => {
    const field = scanField('<label for="fn">Given Name</label><input id="fn" name="fn" />')

    const match = matchField(field)

    expect(match.canonicalKey).toBe('firstName')
    expect(match.confidence).toBe('medium')
  })

  it('matches "Postal Code" via aria-label alone at medium confidence', () => {
    const field = scanField('<input aria-label="Postal Code" />')

    const match = matchField(field)

    expect(match.canonicalKey).toBe('postalCode')
    expect(match.confidence).toBe('medium')
  })

  it('returns low confidence and no canonical key for an unrecognized field', () => {
    const field = scanField('<label for="x">Favorite Color</label><input id="x" name="x" />')

    const match = matchField(field)

    expect(match.canonicalKey).toBeNull()
    expect(match.confidence).toBe('low')
  })
})

describe('matchFields', () => {
  it('matches every field in a small form', () => {
    document.body.innerHTML = `
      <label for="fn">First Name</label><input id="fn" name="fn" />
      <label for="ln">Last Name</label><input id="ln" name="ln" />
      <label for="em">Email Address</label><input id="em" name="em" type="email" />
    `
    const fields = scanFields(document)

    const matches = matchFields(fields)

    expect(matches.map((m) => m.canonicalKey)).toEqual(['firstName', 'lastName', 'email'])
  })
})

describe('section-aware matching', () => {
  it('matches a Work Experience field only when the section heading indicates Work Experience', () => {
    document.body.innerHTML = `
      <section>
        <h2>Work Experience</h2>
        <label for="companyName">Company Name</label>
        <input id="companyName" name="companyName" />
      </section>
    `
    const field = scanFields(document)[0]

    const match = matchField(field)

    expect(match.canonicalKey).toBe('companyName')
    expect(match.section).toBe('workExperience')
    expect(match.confidence).toBe('high')
  })

  it('disambiguates "Location" between Work Experience and Education sections', () => {
    document.body.innerHTML = `
      <section>
        <h2>Work Experience</h2>
        <input aria-label="Location" />
      </section>
      <section>
        <h2>Education</h2>
        <input aria-label="Location" />
      </section>
    `
    const fields = scanFields(document)

    const workExperienceMatch = matchField(fields[0])
    const educationMatch = matchField(fields[1])

    expect(workExperienceMatch.canonicalKey).toBe('location')
    expect(workExperienceMatch.section).toBe('workExperience')
    expect(educationMatch.canonicalKey).toBe('location')
    expect(educationMatch.section).toBe('education')
  })

  it('does not match a work-experience-only field when there is no section heading', () => {
    document.body.innerHTML = '<label for="cn">Company Name</label><input id="cn" name="cn" />'
    const field = scanFields(document)[0]

    const match = matchField(field)

    expect(match.canonicalKey).toBeNull()
    expect(match.section).toBeNull()
  })

  it('still matches section-agnostic personal-info fields inside a labelled section', () => {
    document.body.innerHTML = `
      <section>
        <h2>Personal Information</h2>
        <label for="email">Email Address</label>
        <input id="email" name="email" type="email" />
      </section>
    `
    const field = scanFields(document)[0]

    const match = matchField(field)

    expect(match.canonicalKey).toBe('email')
  })
})
