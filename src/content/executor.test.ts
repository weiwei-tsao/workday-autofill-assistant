import { afterEach, describe, expect, it, vi } from 'vitest'
import type { Profile } from '../shared/types/profile'
import type { WorkExperience } from '../shared/types/work-experience'
import type { AnswerBankEntry } from '../shared/types/answer-bank'
import type { PrivacySettings } from '../shared/types/privacy-settings'
import { autofillFields, autofillSectionFields, autofillAnswerBankFields } from './executor'
import { matchFields } from './matcher'
import { scanFields } from './scanner'

const profile: Profile = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '555-0100',
  country: 'Canada',
  addressLine1: '123 Main St',
  city: 'Toronto',
  province: 'ON',
  postalCode: 'M5V 2T6',
  linkedinUrl: 'https://linkedin.com/in/ada',
  workAuthorizationStatus: 'Citizen',
  sponsorshipRequired: false,
}

describe('autofillFields', () => {
  it('fills high-confidence matched fields and dispatches input/change/blur events', () => {
    document.body.innerHTML = `
      <label for="firstName">First Name</label><input id="firstName" name="firstName" />
      <label for="email">Email Address</label><input id="email" name="email" type="email" />
    `
    const matches = matchFields(scanFields(document))

    const firstNameInput = document.getElementById('firstName') as HTMLInputElement
    const events: string[] = []
    firstNameInput.addEventListener('input', () => events.push('input'))
    firstNameInput.addEventListener('change', () => events.push('change'))
    firstNameInput.addEventListener('blur', () => events.push('blur'))

    const summary = autofillFields(matches, profile)

    expect(firstNameInput.value).toBe('Ada')
    expect((document.getElementById('email') as HTMLInputElement).value).toBe('ada@example.com')
    expect(events).toEqual(['input', 'change', 'blur'])
    expect(summary).toEqual({ detected: 2, filled: 2, needsReview: 0 })
  })

  it('does not fill medium-confidence fields, counting them as needing review instead', () => {
    document.body.innerHTML = '<label for="fn">Given Name</label><input id="fn" name="fn" />'
    const matches = matchFields(scanFields(document))

    const summary = autofillFields(matches, profile)

    expect((document.getElementById('fn') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 1 })
  })

  it('does not count or fill fields with no canonical key match', () => {
    document.body.innerHTML = '<label for="x">Favorite Color</label><input id="x" name="x" />'
    const matches = matchFields(scanFields(document))

    const summary = autofillFields(matches, profile)

    expect(summary).toEqual({ detected: 0, filled: 0, needsReview: 0 })
  })

  it('ignores low-confidence matches entirely, even when they have a canonical key', () => {
    document.body.innerHTML = '<input placeholder="linkedin profile" />'
    const matches = matchFields(scanFields(document))

    // Sanity-check this test actually exercises the low-confidence, non-null-key path
    expect(matches[0].canonicalKey).toBe('linkedinUrl')
    expect(matches[0].confidence).toBe('low')

    const summary = autofillFields(matches, profile)

    expect(summary).toEqual({ detected: 0, filled: 0, needsReview: 0 })
  })

  it('does not fill a high-confidence match when the profile value is an empty string', () => {
    document.body.innerHTML =
      '<label for="firstName">First Name</label><input id="firstName" name="firstName" />'
    const matches = matchFields(scanFields(document))

    const summary = autofillFields(matches, { ...profile, firstName: '' })

    expect((document.getElementById('firstName') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })
})

describe('autofillSectionFields', () => {
  const workExperience: WorkExperience = {
    id: '1',
    companyName: 'Acme',
    jobTitle: 'Engineer',
    startMonth: 3,
    startYear: 2020,
    currentlyWorking: true,
  }

  it('fills high-confidence work experience fields, including numbers and checkboxes', () => {
    document.body.innerHTML = `
      <section>
        <h2>Work Experience</h2>
        <label for="companyName">Company Name</label>
        <input id="companyName" name="companyName" />
        <label for="startYear">Start Year</label>
        <input id="startYear" name="startYear" type="number" />
        <label for="currentlyWorking">Currently Working</label>
        <input id="currentlyWorking" name="currentlyWorking" type="checkbox" />
      </section>
    `
    const matches = matchFields(scanFields(document))

    const summary = autofillSectionFields(matches, 'workExperience', workExperience)

    expect((document.getElementById('companyName') as HTMLInputElement).value).toBe('Acme')
    expect((document.getElementById('startYear') as HTMLInputElement).value).toBe('2020')
    expect((document.getElementById('currentlyWorking') as HTMLInputElement).checked).toBe(true)
    expect(summary).toEqual({ detected: 3, filled: 3, needsReview: 0 })
  })

  it('ignores matches from a different section', () => {
    document.body.innerHTML = `
      <section>
        <h2>Education</h2>
        <label for="schoolName">School Name</label>
        <input id="schoolName" name="schoolName" />
      </section>
    `
    const matches = matchFields(scanFields(document))

    const summary = autofillSectionFields(matches, 'workExperience', workExperience)

    expect((document.getElementById('schoolName') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 0, filled: 0, needsReview: 0 })
  })

  it('reports zero filled fields when no entry is provided', () => {
    document.body.innerHTML = `
      <section>
        <h2>Work Experience</h2>
        <label for="companyName">Company Name</label>
        <input id="companyName" name="companyName" />
      </section>
    `
    const matches = matchFields(scanFields(document))

    const summary = autofillSectionFields(matches, 'workExperience', undefined)

    expect((document.getElementById('companyName') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })
})

describe('autofillAnswerBankFields', () => {
  const allowAllPrivacySettings: PrivacySettings = {
    allowGenderAutoFill: true,
    allowRaceAutoFill: true,
    allowDisabilityAutoFill: true,
    allowVeteranStatusAutoFill: true,
  }
  const blockAllPrivacySettings: PrivacySettings = {
    allowGenderAutoFill: false,
    allowRaceAutoFill: false,
    allowDisabilityAutoFill: false,
    allowVeteranStatusAutoFill: false,
  }

  it('fills a high-confidence match with a non-sensitive, auto-fill-enabled answer', () => {
    document.body.innerHTML =
      '<label for="salary">Desired salary</label><input id="salary" name="desiredSalary" />'
    const matches = matchFields(scanFields(document))
    const answerBank: AnswerBankEntry[] = [
      {
        id: '1',
        questionKey: 'desiredSalary',
        questionLabel: 'Desired salary',
        type: 'text',
        value: '$120,000',
        isSensitive: false,
        autoFillEnabled: true,
      },
    ]

    const summary = autofillAnswerBankFields(matches, answerBank, blockAllPrivacySettings)

    expect((document.getElementById('salary') as HTMLInputElement).value).toBe('$120,000')
    expect(summary).toEqual({ detected: 1, filled: 1, needsReview: 0 })
  })

  it('never fills a sensitive answer bank entry with no category, regardless of privacy settings', () => {
    document.body.innerHTML =
      '<label for="sponsorship">Sponsorship</label><input id="sponsorship" name="sponsorship" />'
    const matches = matchFields(scanFields(document))
    const answerBank: AnswerBankEntry[] = [
      {
        id: '1',
        questionKey: 'sponsorship',
        questionLabel: 'Sponsorship',
        type: 'yesNo',
        value: 'No',
        isSensitive: true,
        autoFillEnabled: false,
      },
    ]

    const summary = autofillAnswerBankFields(matches, answerBank, allowAllPrivacySettings)

    expect((document.getElementById('sponsorship') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })

  it('does not fill a non-sensitive entry with autoFillEnabled set to false', () => {
    document.body.innerHTML =
      '<label for="notice">Notice period</label><input id="notice" name="noticePeriod" />'
    const matches = matchFields(scanFields(document))
    const answerBank: AnswerBankEntry[] = [
      {
        id: '1',
        questionKey: 'noticePeriod',
        questionLabel: 'Notice period',
        type: 'text',
        value: '2 weeks',
        isSensitive: false,
        autoFillEnabled: false,
      },
    ]

    const summary = autofillAnswerBankFields(matches, answerBank, allowAllPrivacySettings)

    expect((document.getElementById('notice') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })

  it('reports zero filled fields when no matching answer bank entry exists', () => {
    document.body.innerHTML =
      '<label for="salary">Desired salary</label><input id="salary" name="desiredSalary" />'
    const matches = matchFields(scanFields(document))

    const summary = autofillAnswerBankFields(matches, [], allowAllPrivacySettings)

    expect((document.getElementById('salary') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })

  it('fills a sensitive entry when its category is explicitly allowed in privacy settings', () => {
    document.body.innerHTML = '<label for="vet">Veteran status</label><input id="vet" name="veteranStatus" />'
    const matches = matchFields(scanFields(document))
    const answerBank: AnswerBankEntry[] = [
      {
        id: '1',
        questionKey: 'veteranStatus',
        questionLabel: 'Veteran status',
        type: 'yesNo',
        value: 'No',
        isSensitive: true,
        sensitiveCategory: 'veteranStatus',
        autoFillEnabled: false,
      },
    ]

    const summary = autofillAnswerBankFields(matches, answerBank, allowAllPrivacySettings)

    expect((document.getElementById('vet') as HTMLInputElement).value).toBe('No')
    expect(summary).toEqual({ detected: 1, filled: 1, needsReview: 0 })
  })

  it('does not fill a sensitive entry when its category is not allowed in privacy settings', () => {
    document.body.innerHTML = '<label for="vet">Veteran status</label><input id="vet" name="veteranStatus" />'
    const matches = matchFields(scanFields(document))
    const answerBank: AnswerBankEntry[] = [
      {
        id: '1',
        questionKey: 'veteranStatus',
        questionLabel: 'Veteran status',
        type: 'yesNo',
        value: 'No',
        isSensitive: true,
        sensitiveCategory: 'veteranStatus',
        autoFillEnabled: false,
      },
    ]

    const summary = autofillAnswerBankFields(matches, answerBank, blockAllPrivacySettings)

    expect((document.getElementById('vet') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })

  it('never fills a sensitive entry tagged "other", even when all privacy settings are enabled', () => {
    document.body.innerHTML =
      '<label for="disability">Disability status</label><input id="disability" name="disabilityStatus" />'
    const matches = matchFields(scanFields(document))
    const answerBank: AnswerBankEntry[] = [
      {
        id: '1',
        questionKey: 'disabilityStatus',
        questionLabel: 'Disability status',
        type: 'yesNo',
        value: 'No',
        isSensitive: true,
        sensitiveCategory: 'other',
        autoFillEnabled: false,
      },
    ]

    const summary = autofillAnswerBankFields(matches, answerBank, allowAllPrivacySettings)

    expect((document.getElementById('disability') as HTMLInputElement).value).toBe('')
    expect(summary).toEqual({ detected: 1, filled: 0, needsReview: 0 })
  })
})

describe('field highlight on fill', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('briefly highlights a field after filling it, then reverts the style', () => {
    vi.useFakeTimers()
    document.body.innerHTML =
      '<label for="firstName">First Name</label><input id="firstName" name="firstName" />'
    const matches = matchFields(scanFields(document))

    autofillFields(matches, profile)

    const element = document.getElementById('firstName') as HTMLInputElement
    expect(element.style.outline).toBe('2px solid #22c55e')

    vi.advanceTimersByTime(1500)

    expect(element.style.outline).toBe('')
  })

  it('does not apply a highlight when a field is not actually filled', () => {
    document.body.innerHTML = '<label for="fn">Given Name</label><input id="fn" name="fn" />'
    const matches = matchFields(scanFields(document))

    autofillFields(matches, profile)

    const element = document.getElementById('fn') as HTMLInputElement
    expect(element.style.outline).toBe('')
  })
})
