import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { workExperienceRepository } from './work-experience-repository'

beforeEach(() => {
  installChromeStorageMock()
})

describe('workExperienceRepository', () => {
  it('round-trips a work experience entry under the workExperiences key', async () => {
    await workExperienceRepository.add({
      id: '1',
      companyName: 'Acme',
      jobTitle: 'Engineer',
      startMonth: 1,
      startYear: 2020,
      currentlyWorking: true,
    })

    expect(await workExperienceRepository.list()).toEqual([
      {
        id: '1',
        companyName: 'Acme',
        jobTitle: 'Engineer',
        startMonth: 1,
        startYear: 2020,
        currentlyWorking: true,
      },
    ])
  })
})
