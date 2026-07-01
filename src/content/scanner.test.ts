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

  it('captures the nearest preceding section heading for a field', () => {
    document.body.innerHTML = `
      <section>
        <h2>Work Experience</h2>
        <div class="entry">
          <label for="companyName">Company Name</label>
          <input id="companyName" name="companyName" />
        </div>
      </section>
    `

    const fields = scanFields(document)

    expect(fields[0].sectionHeadingText).toBe('Work Experience')
  })

  it('returns an empty string when there is no preceding heading', () => {
    document.body.innerHTML = '<label for="firstName">First Name</label><input id="firstName" />'

    const fields = scanFields(document)

    expect(fields[0].sectionHeadingText).toBe('')
  })

  it('finds the correct heading when multiple sections precede the field', () => {
    document.body.innerHTML = `
      <section>
        <h2>Personal Information</h2>
        <input id="firstName" aria-label="First Name" />
      </section>
      <section>
        <h2>Education</h2>
        <input id="schoolName" aria-label="School Name" />
      </section>
    `

    const fields = scanFields(document)

    expect(fields[0].sectionHeadingText).toBe('Personal Information')
    expect(fields[1].sectionHeadingText).toBe('Education')
  })

  it('falls back to a fieldset legend when there is no label association', () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Would you consider relocating for this role?</legend>
        <input type="text" />
      </fieldset>
    `

    const fields = scanFields(document)

    expect(fields[0].labelText).toBe('Would you consider relocating for this role?')
  })

  it('prefers a real label over a fieldset legend when both are present', () => {
    document.body.innerHTML = `
      <fieldset>
        <legend>Contact details</legend>
        <label for="email">Email Address</label>
        <input id="email" type="text" />
      </fieldset>
    `

    const fields = scanFields(document)

    expect(fields[0].labelText).toBe('Email Address')
  })

  it('reproduces a real Workday custom-combobox structure (button + hidden text input inside a fieldset)', () => {
    document.body.innerHTML = `
      <div data-automation-id="formField-ccc084dd696010002a38cbc7dc290000" class="css-gvoll6">
        <fieldset class="css-1s9yhc">
          <legend>
            <div id="rich-label45" class="css-f6y8ld">
              <div data-automation-id="richText" class="css-1wx38f7">
                <p><b>Would you consider relocating for this role?<abbr title="required" class="requiredAsterisk">*</abbr></b></p>
              </div>
            </div>
          </legend>
          <div class="css-15rz5ap">
            <div style="width: 100%; max-width: 344px; min-width: 280px;">
              <div class="css-12zup1l">
                <button aria-haspopup="listbox" type="button" value="" aria-label=" Select One Required" name="ccc084dd696010002a38cbc7dc290000" id="primaryQuestionnaire--ccc084dd696010002a38cbc7dc290000" class="css-5bqb1n">Select One</button>
                <input type="text" class="css-77hcv" value="">
              </div>
            </div>
          </div>
        </fieldset>
      </div>
    `

    const fields = scanFields(document)
    const hiddenInput = fields.find((field) => field.element.matches('input[type="text"]'))

    expect(hiddenInput?.labelText).toContain('Would you consider relocating for this role?')
  })
})
