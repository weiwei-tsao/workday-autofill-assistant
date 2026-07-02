import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { workExperienceRepository } from '../../shared/storage/work-experience-repository'
import { ImportExportPage } from './ImportExportPage'

beforeEach(() => {
  installChromeStorageMock()
})

describe('ImportExportPage', () => {
  it('imports a valid backup file and restores the data', async () => {
    const user = userEvent.setup()
    render(<ImportExportPage />)

    const bundle = {
      exportedAt: '2026-07-02T00:00:00.000Z',
      profile: {
        firstName: 'Grace',
        lastName: 'Hopper',
        email: 'grace@example.com',
        phone: '555-0100',
        country: 'USA',
        addressLine1: '123 Main St',
        city: 'Springfield',
        province: 'IL',
        postalCode: '62704',
        workAuthorizationStatus: 'Citizen',
        sponsorshipRequired: false,
      },
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
      answerBank: [],
      applicationRecords: [],
    }
    const file = new File([JSON.stringify(bundle)], 'backup.json', { type: 'application/json' })

    await user.upload(screen.getByLabelText('Import data'), file)

    expect(
      await screen.findByText('Import successful. Your data has been restored.')
    ).toBeInTheDocument()
    expect(await workExperienceRepository.list()).toHaveLength(1)
  })

  it('shows an error for a file that is not a valid backup', async () => {
    const user = userEvent.setup()
    render(<ImportExportPage />)

    const file = new File([JSON.stringify({ foo: 'bar' })], 'not-a-backup.json', {
      type: 'application/json',
    })

    await user.upload(screen.getByLabelText('Import data'), file)

    expect(await screen.findByText('This file is not a valid backup.')).toBeInTheDocument()
  })
})
