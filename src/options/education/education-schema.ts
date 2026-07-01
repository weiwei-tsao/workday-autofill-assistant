import { z } from 'zod'

const optionalCoercedNumber = (min: number, max: number) =>
  z.preprocess(
    (val) => (val === '' ? undefined : val),
    z.coerce.number().int().min(min).max(max).optional()
  )

export const educationFormSchema = z.object({
  schoolName: z.string().min(1, 'School name is required'),
  degree: z.string().min(1, 'Degree is required'),
  fieldOfStudy: z.string().min(1, 'Field of study is required'),
  location: z.string().optional(),
  startYear: z.coerce.number().int().min(1950).max(2100),
  endYear: optionalCoercedNumber(1950, 2100),
  gpa: z.string().optional(),
  description: z.string().optional(),
})

export type EducationFormValues = z.input<typeof educationFormSchema>
