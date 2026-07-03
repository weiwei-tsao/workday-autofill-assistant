import { z } from 'zod'

const optionalSensitiveCategory = z.preprocess(
  (val) => (val === '' ? undefined : val),
  z.enum(['gender', 'race', 'disability', 'veteranStatus', 'other']).optional()
)

export const answerBankFormSchema = z
  .object({
    questionKey: z.string().min(1, 'Question key is required'),
    questionLabel: z.string().min(1, 'Question label is required'),
    type: z.enum(['yesNo', 'text', 'select']),
    value: z.string().min(1, 'Answer value is required'),
    isSensitive: z.boolean(),
    sensitiveCategory: optionalSensitiveCategory,
    autoFillEnabled: z.boolean(),
  })
  .transform((values) => ({
    ...values,
    autoFillEnabled: values.isSensitive ? false : values.autoFillEnabled,
  }))

export type AnswerBankFormValues = z.input<typeof answerBankFormSchema>
