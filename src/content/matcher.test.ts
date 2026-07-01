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
