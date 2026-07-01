import { describe, expect, it } from 'vitest'
import { scanFields } from './scanner'

describe('scanFields', () => {
  it('collects labelled text inputs with their label, name, and id', () => {
    document.body.innerHTML = `
      <form>
        <label for="firstName">First Name</label>
        <input id="firstName" name="legalName--firstName" type="text" />
        <label for="email">Email Address</label>
        <input id="email" name="email" type="email" />
      </form>
    `

    const fields = scanFields(document)

    expect(fields).toHaveLength(2)
    expect(fields[0]).toMatchObject({
      labelText: 'First Name',
      name: 'legalName--firstName',
      id: 'firstName',
    })
    expect(fields[1]).toMatchObject({
      labelText: 'Email Address',
      name: 'email',
      id: 'email',
    })
  })

  it('falls back to aria-label and placeholder when there is no associated label', () => {
    document.body.innerHTML = `
      <input id="phone" aria-label="Phone Number" placeholder="555-0100" type="tel" />
    `

    const fields = scanFields(document)

    expect(fields).toHaveLength(1)
    expect(fields[0]).toMatchObject({
      labelText: '',
      ariaLabel: 'Phone Number',
      placeholder: '555-0100',
    })
  })

  it('includes textarea, select, checkbox, and radio fields', () => {
    document.body.innerHTML = `
      <textarea aria-label="Description"></textarea>
      <select aria-label="Country"><option value="ca">Canada</option></select>
      <input type="checkbox" aria-label="Currently working here" />
      <input type="radio" aria-label="Remote" />
    `

    const fields = scanFields(document)

    expect(fields.map((f) => f.ariaLabel)).toEqual([
      'Description',
      'Country',
      'Currently working here',
      'Remote',
    ])
  })
})
