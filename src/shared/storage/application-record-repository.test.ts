import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { applicationRecordRepository } from './application-record-repository'

beforeEach(() => {
  installChromeStorageMock()
})

describe('applicationRecordRepository', () => {
  it('round-trips an application record under the applicationRecords key', async () => {
    await applicationRecordRepository.add({
      id: '1',
      companyName: 'Acme',
      jobTitle: 'Software Engineer',
      jobLocation: 'Remote',
      jobUrl: 'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/1',
      applicationDate: '2026-07-01',
      sourcePlatform: 'Workday',
      status: 'Applied',
    })

    expect(await applicationRecordRepository.list()).toEqual([
      {
        id: '1',
        companyName: 'Acme',
        jobTitle: 'Software Engineer',
        jobLocation: 'Remote',
        jobUrl: 'https://acme.wd5.myworkdayjobs.com/en-US/careers/job/1',
        applicationDate: '2026-07-01',
        sourcePlatform: 'Workday',
        status: 'Applied',
      },
    ])
  })
})
