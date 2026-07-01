import { FIELD_DICTIONARY, type FieldSection } from './field-dictionary'
import type { ScannedField } from './scanner'

export type ConfidenceLevel = 'high' | 'medium' | 'low'

export interface FieldMatch {
  field: ScannedField
  canonicalKey: string | null
  section: FieldSection | null
  score: number
  confidence: ConfidenceLevel
}

const WORK_EXPERIENCE_HEADING_PATTERN = /work\s*experience/i
const EDUCATION_HEADING_PATTERN = /education/i

function detectSection(sectionHeadingText: string): FieldSection | null {
  if (WORK_EXPERIENCE_HEADING_PATTERN.test(sectionHeadingText)) return 'workExperience'
  if (EDUCATION_HEADING_PATTERN.test(sectionHeadingText)) return 'education'
  return null
}

function scoreAgainstEntry(field: ScannedField, patterns: RegExp[]): number {
  let score = 0
  if (patterns.some((pattern) => pattern.test(field.labelText))) score += 40
  if (patterns.some((pattern) => pattern.test(field.ariaLabel))) score += 35
  if (patterns.some((pattern) => pattern.test(field.name) || pattern.test(field.id))) score += 25
  if (patterns.some((pattern) => pattern.test(field.placeholder))) score += 20
  return score
}

function confidenceFor(score: number): ConfidenceLevel {
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

export function matchField(field: ScannedField): FieldMatch {
  const section = detectSection(field.sectionHeadingText)

  let bestKey: string | null = null
  let bestScore = 0

  for (const entry of FIELD_DICTIONARY) {
    if (entry.section && entry.section !== section) continue
    const score = scoreAgainstEntry(field, entry.patterns)
    if (score > bestScore) {
      bestScore = score
      bestKey = entry.canonicalKey
    }
  }

  return {
    field,
    canonicalKey: bestScore > 0 ? bestKey : null,
    section,
    score: bestScore,
    confidence: confidenceFor(bestScore),
  }
}

export function matchFields(fields: ScannedField[]): FieldMatch[] {
  return fields.map(matchField)
}
