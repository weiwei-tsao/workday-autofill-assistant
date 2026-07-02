import { z } from 'zod'

export const exportBundleSchema = z.object({
  exportedAt: z.string(),
  profile: z.record(z.string(), z.unknown()).optional(),
  workExperiences: z.array(z.record(z.string(), z.unknown())),
  educations: z.array(z.record(z.string(), z.unknown())),
  answerBank: z.array(z.record(z.string(), z.unknown())),
  applicationRecords: z.array(z.record(z.string(), z.unknown())),
})
