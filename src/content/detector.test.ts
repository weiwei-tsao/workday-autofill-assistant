import { describe, expect, it } from 'vitest'
import { isWorkdayPage } from './detector'

describe('isWorkdayPage', () => {
  it('returns true when the hostname matches *.myworkdayjobs.com', () => {
    const doc = document.implementation.createHTMLDocument('')
    expect(isWorkdayPage('acme.wd1.myworkdayjobs.com', doc)).toBe(true)
  })

  it('returns true when the page has a Workday automation-id marker, regardless of hostname', () => {
    const doc = document.implementation.createHTMLDocument('')
    doc.body.innerHTML = '<div data-automation-id="jobPostingHeader"></div>'
    expect(isWorkdayPage('careers.example.com', doc)).toBe(true)
  })

  it('returns false for an unrelated hostname with no Workday markers', () => {
    const doc = document.implementation.createHTMLDocument('')
    doc.body.innerHTML = '<div>Hello</div>'
    expect(isWorkdayPage('example.com', doc)).toBe(false)
  })
})
