import { z } from 'zod'

const optionalCoercedNumber = (min: number, max: number) =>
  z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().int().min(min).max(max).optional()
  )

export const workExperienceFormSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  location: z.string().optional(),
  startMonth: z.coerce.number().int().min(1).max(12),
  startYear: z.coerce.number().int().min(1950).max(2100),
  endMonth: optionalCoercedNumber(1, 12),
  endYear: optionalCoercedNumber(1950, 2100),
  currentlyWorking: z.boolean(),
  description: z.string().optional(),
})

export type WorkExperienceFormValues = z.input<typeof workExperienceFormSchema>
