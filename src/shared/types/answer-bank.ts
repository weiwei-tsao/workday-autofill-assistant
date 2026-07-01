export type AnswerType = 'yesNo' | 'text' | 'select'

export interface AnswerBankEntry {
  id: string
  questionKey: string
  questionLabel: string
  type: AnswerType
  value: string
  isSensitive: boolean
  autoFillEnabled: boolean
}
