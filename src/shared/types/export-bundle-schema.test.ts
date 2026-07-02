import { describe, expect, it } from 'vitest'
import { exportBundleSchema } from './export-bundle-schema'

describe('exportBundleSchema', () => {
  it('accepts a valid full bundle', () => {
    const result = exportBundleSchema.safeParse({
      exportedAt: '2026-07-02T00:00:00.000Z',
      profile: { firstName: 'Ada' },
      workExperiences: [{ id: '1', companyName: 'Acme' }],
      educations: [],
      answerBank: [],
      applicationRecords: [],
    })

    expect(result.success).toBe(true)
  })

  it('accepts a bundle with no profile key', () => {
    const result = exportBundleSchema.safeParse({
      exportedAt: '2026-07-02T00:00:00.000Z',
      workExperiences: [],
      educations: [],
      answerBank: [],
      applicationRecords: [],
    })

    expect(result.success).toBe(true)
  })

  it('rejects a bundle missing a required list field', () => {
    const result = exportBundleSchema.safeParse({
      exportedAt: '2026-07-02T00:00:00.000Z',
      educations: [],
      answerBank: [],
      applicationRecords: [],
    })

    expect(result.success).toBe(false)
  })

  it('rejects an unrelated JSON object', () => {
    const result = exportBundleSchema.safeParse({ foo: 'bar' })

    expect(result.success).toBe(false)
  })

  it('rejects a bundle where a list field is not an array', () => {
    const result = exportBundleSchema.safeParse({
      exportedAt: '2026-07-02T00:00:00.000Z',
      workExperiences: 'not an array',
      educations: [],
      answerBank: [],
      applicationRecords: [],
    })

    expect(result.success).toBe(false)
  })
})
