import { describe, expect, it } from 'vitest'
import { extractApplicationInfo } from './application-extractor'

describe('extractApplicationInfo', () => {
  it('derives company name from the Workday tenant subdomain', () => {
    document.body.innerHTML = '<h1>Software Engineer</h1>'

    const info = extractApplicationInfo(
      document,
      'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/1',
      'acme.wd5.myworkdayjobs.com'
    )

    expect(info.companyName).toBe('Acme')
  })

  it('extracts the job title from the page h1', () => {
    document.body.innerHTML = '<h1>Software Engineer</h1>'

    const info = extractApplicationInfo(
      document,
      'https://acme.wd5.myworkdayjobs.com/job/1',
      'acme.wd5.myworkdayjobs.com'
    )

    expect(info.jobTitle).toBe('Software Engineer')
  })

  it('prefers the jobTitleHeading data-automation-id over a generic h1', () => {
    document.body.innerHTML =
      '<h1>Careers at Acme</h1>' +
      '<h2 data-automation-id="jobTitleHeading">Sr. Program Manager</h2>'

    const info = extractApplicationInfo(
      document,
      'https://acme.wd5.myworkdayjobs.com/job/1',
      'acme.wd5.myworkdayjobs.com'
    )

    expect(info.jobTitle).toBe('Sr. Program Manager')
  })

  it('falls back to document.title when there is no h1', () => {
    document.body.innerHTML = ''
    document.title = 'Software Engineer - Acme Careers'

    const info = extractApplicationInfo(
      document,
      'https://acme.wd5.myworkdayjobs.com/job/1',
      'acme.wd5.myworkdayjobs.com'
    )

    expect(info.jobTitle).toBe('Software Engineer - Acme Careers')
  })

  it('extracts job location from a data-automation-id containing "location"', () => {
    document.body.innerHTML = '<div data-automation-id="jobPostingLocation">Remote - USA</div>'

    const info = extractApplicationInfo(
      document,
      'https://acme.wd5.myworkdayjobs.com/job/1',
      'acme.wd5.myworkdayjobs.com'
    )

    expect(info.jobLocation).toBe('Remote - USA')
  })

  it('returns an empty string for job location when no matching element exists', () => {
    document.body.innerHTML = '<h1>Software Engineer</h1>'

    const info = extractApplicationInfo(
      document,
      'https://acme.wd5.myworkdayjobs.com/job/1',
      'acme.wd5.myworkdayjobs.com'
    )

    expect(info.jobLocation).toBe('')
  })

  it('always uses the provided URL as jobUrl and today as applicationDate', () => {
    document.body.innerHTML = '<h1>Software Engineer</h1>'
    const today = new Date().toISOString().split('T')[0]

    const info = extractApplicationInfo(
      document,
      'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/42',
      'acme.wd5.myworkdayjobs.com'
    )

    expect(info.jobUrl).toBe('https://acme.wd5.myworkdayjobs.com/en-US/careers/job/42')
    expect(info.applicationDate).toBe(today)
  })
})
