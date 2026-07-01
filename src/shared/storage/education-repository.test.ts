import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { educationRepository } from './education-repository'

beforeEach(() => {
  installChromeStorageMock()
})

describe('educationRepository', () => {
  it('round-trips an education entry under the educations key', async () => {
    await educationRepository.add({
      id: '1',
      schoolName: 'MIT',
      degree: 'BSc',
      fieldOfStudy: 'Computer Science',
      startYear: 2016,
    })

    expect(await educationRepository.list()).toEqual([
      {
        id: '1',
        schoolName: 'MIT',
        degree: 'BSc',
        fieldOfStudy: 'Computer Science',
        startYear: 2016,
      },
    ])
  })
})
