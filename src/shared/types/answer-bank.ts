export type AnswerType = 'yesNo' | 'text' | 'select'

export type SensitiveCategory = 'gender' | 'race' | 'disability' | 'veteranStatus' | 'other'

export interface AnswerBankEntry {
  id: string
  questionKey: string
  questionLabel: string
  type: AnswerType
  value: string
  isSensitive: boolean
  sensitiveCategory?: SensitiveCategory
  autoFillEnabled: boolean
}
