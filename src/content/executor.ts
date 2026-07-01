import type { AutofillSummary } from '../shared/messaging/messages'
import type { Profile } from '../shared/types/profile'
import type { FieldMatch } from './matcher'

function setFieldValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: string
): void {
  element.value = value
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
  element.dispatchEvent(new Event('blur', { bubbles: true }))
}

export function autofillFields(matches: FieldMatch[], profile: Profile): AutofillSummary {
  let detected = 0
  let filled = 0
  let needsReview = 0

  for (const match of matches) {
    if (match.canonicalKey === null || match.confidence === 'low') continue
    detected++

    if (match.confidence === 'high') {
      const value = profile[match.canonicalKey as keyof Profile]
      if (typeof value === 'string' && value.length > 0) {
        setFieldValue(match.field.element, value)
        filled++
      }
    } else if (match.confidence === 'medium') {
      needsReview++
    }
  }

  return { detected, filled, needsReview }
}
