import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { answerBankRepository } from './answer-bank-repository'
import { applicationRecordRepository } from './application-record-repository'
import { educationRepository } from './education-repository'
import { buildExportBundle, restoreFromBundle } from './export-import'
import { getProfile, saveProfile } from './profile-repository'
import { workExperienceRepository } from './work-experience-repository'

const sampleProfile = {
  firstName: 'Ada',
  lastName: 'Lovelace',
  email: 'ada@example.com',
  phone: '555-0100',
  country: 'USA',
  addressLine1: '123 Main St',
  city: 'Springfield',
  province: 'IL',
  postalCode: '62704',
  workAuthorizationStatus: 'Citizen',
  sponsorshipRequired: false,
}

beforeEach(() => {
  installChromeStorageMock()
})

describe('buildExportBundle', () => {
  it('bundles all five data sources with a timestamp', async () => {
    await saveProfile(sampleProfile)
    await workExperienceRepository.add({
      id: '1',
      companyName: 'Acme',
      jobTitle: 'Engineer',
      startMonth: 3,
      startYear: 2020,
      currentlyWorking: true,
    })

    const bundle = await buildExportBundle()

    expect(bundle.profile).toEqual(sampleProfile)
    expect(bundle.workExperiences).toHaveLength(1)
    expect(bundle.educations).toEqual([])
    expect(bundle.answerBank).toEqual([])
    expect(bundle.applicationRecords).toEqual([])
    expect(typeof bundle.exportedAt).toBe('string')
  })
})

describe('restoreFromBundle', () => {
  it('replaces all five data sources from a bundle', async () => {
    await restoreFromBundle({
      exportedAt: '2026-07-02T00:00:00.000Z',
      profile: { ...sampleProfile, firstName: 'Grace', lastName: 'Hopper' },
      workExperiences: [
        {
          id: '1',
          companyName: 'Acme',
          jobTitle: 'Engineer',
          startMonth: 3,
          startYear: 2020,
          currentlyWorking: true,
        },
      ],
      educations: [],
      answerBank: [
        {
          id: '1',
          questionKey: 'desiredSalary',
          questionLabel: 'Desired salary',
          type: 'text',
          value: '$120,000',
          isSensitive: false,
          autoFillEnabled: true,
        },
      ],
      applicationRecords: [],
    })

    expect(await getProfile()).toEqual({ ...sampleProfile, firstName: 'Grace', lastName: 'Hopper' })
    expect(await workExperienceRepository.list()).toHaveLength(1)
    expect(await educationRepository.list()).toEqual([])
    expect(await answerBankRepository.list()).toHaveLength(1)
    expect(await applicationRecordRepository.list()).toEqual([])
  })

  it('leaves an existing profile untouched when the bundle has no profile', async () => {
    await saveProfile(sampleProfile)

    await restoreFromBundle({
      exportedAt: '2026-07-02T00:00:00.000Z',
      profile: undefined,
      workExperiences: [],
      educations: [],
      answerBank: [],
      applicationRecords: [],
    })

    expect(await getProfile()).toEqual(sampleProfile)
  })
})
