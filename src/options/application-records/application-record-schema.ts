import { z } from 'zod'

export const applicationRecordFormSchema = z.object({
  companyName: z.string().min(1, 'Company name is required'),
  jobTitle: z.string().min(1, 'Job title is required'),
  status: z.enum(['Applied', 'Draft', 'Interested']),
  notes: z.string().optional(),
  resumeVersion: z.string().optional(),
  coverLetterVersion: z.string().optional(),
  applicationDate: z.string(),
  sourcePlatform: z.literal('Workday'),
})

export type ApplicationRecordFormValues = z.input<typeof applicationRecordFormSchema>
