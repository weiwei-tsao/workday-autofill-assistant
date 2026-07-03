import type { AutofillSummary } from '../shared/messaging/messages'
import type { Profile } from '../shared/types/profile'
import type { FieldSection } from './field-dictionary'
import type { FieldMatch } from './matcher'
import type { AnswerBankEntry } from '../shared/types/answer-bank'
import type { PrivacySettings } from '../shared/types/privacy-settings'

type FillableValue = string | number | boolean

function hasFillableValue(value: unknown): value is FillableValue {
  if (value === undefined || value === null) return false
  if (typeof value === 'string') return value.length > 0
  return typeof value === 'number' || typeof value === 'boolean'
}

function highlightField(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
): void {
  const originalOutline = element.style.outline
  const originalTransition = element.style.transition
  element.style.transition = 'outline 0.2s ease-in-out'
  element.style.outline = '2px solid #22c55e'
  setTimeout(() => {
    element.style.outline = originalOutline
    element.style.transition = originalTransition
  }, 1500)
}

function setFieldValue(
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement,
  value: FillableValue
): void {
  if (element instanceof HTMLInputElement && element.type === 'checkbox') {
    element.checked = Boolean(value)
  } else {
    element.value = String(value)
  }
  element.dispatchEvent(new Event('input', { bubbles: true }))
  element.dispatchEvent(new Event('change', { bubbles: true }))
  element.dispatchEvent(new Event('blur', { bubbles: true }))
  highlightField(element)
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
      if (hasFillableValue(value)) {
        setFieldValue(match.field.element, value)
        filled++
      }
    } else if (match.confidence === 'medium') {
      needsReview++
    }
  }

  return { detected, filled, needsReview }
}

export function autofillSectionFields<T extends object>(
  matches: FieldMatch[],
  section: FieldSection,
  entry: T | undefined
): AutofillSummary {
  let detected = 0
  let filled = 0
  let needsReview = 0

  for (const match of matches) {
    if (match.section !== section) continue
    if (match.canonicalKey === null || match.confidence === 'low') continue
    detected++

    if (match.confidence === 'high') {
      const value = entry
        ? (entry as Record<string, unknown>)[match.canonicalKey]
        : undefined
      if (hasFillableValue(value)) {
        setFieldValue(match.field.element, value)
        filled++
      }
    } else if (match.confidence === 'medium') {
      needsReview++
    }
  }

  return { detected, filled, needsReview }
}

function isAutoFillAllowed(entry: AnswerBankEntry, privacySettings: PrivacySettings): boolean {
  if (!entry.isSensitive) return entry.autoFillEnabled

  switch (entry.sensitiveCategory) {
    case 'gender':
      return privacySettings.allowGenderAutoFill
    case 'race':
      return privacySettings.allowRaceAutoFill
    case 'disability':
      return privacySettings.allowDisabilityAutoFill
    case 'veteranStatus':
      return privacySettings.allowVeteranStatusAutoFill
    default:
      return false
  }
}

export function autofillAnswerBankFields(
  matches: FieldMatch[],
  answerBank: AnswerBankEntry[],
  privacySettings: PrivacySettings
): AutofillSummary {
  let detected = 0
  let filled = 0
  let needsReview = 0

  for (const match of matches) {
    if (match.canonicalKey === null || match.confidence === 'low') continue
    detected++

    if (match.confidence === 'high') {
      const entry = answerBank.find((candidate) => candidate.questionKey === match.canonicalKey)
      if (entry && isAutoFillAllowed(entry, privacySettings) && hasFillableValue(entry.value)) {
        setFieldValue(match.field.element, entry.value)
        filled++
      }
    } else if (match.confidence === 'medium') {
      needsReview++
    }
  }

  return { detected, filled, needsReview }
}
