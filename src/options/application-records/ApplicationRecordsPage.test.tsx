import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { ApplicationRecordsPage } from './ApplicationRecordsPage'

beforeEach(() => {
  installChromeStorageMock()
})

async function addSampleRecord(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Company name'), 'Acme')
  await user.type(screen.getByLabelText('Job title'), 'Software Engineer')
  await user.click(screen.getByRole('button', { name: 'Add record' }))
}

describe('ApplicationRecordsPage', () => {
  it('adds an application record and lists it', async () => {
    const user = userEvent.setup()
    render(<ApplicationRecordsPage />)

    await addSampleRecord(user)

    const list = await screen.findByLabelText('Application records list')
    expect(within(list).getByText('Acme')).toBeInTheDocument()
    expect(within(list).getByText('Software Engineer')).toBeInTheDocument()
    expect(within(list).getByText('Applied')).toBeInTheDocument()
  })

  it('deletes an application record', async () => {
    const user = userEvent.setup()
    render(<ApplicationRecordsPage />)

    await addSampleRecord(user)

    const list = await screen.findByLabelText('Application records list')
    await user.click(within(list).getByRole('button', { name: 'Delete' }))

    expect(within(list).queryByText('Acme')).not.toBeInTheDocument()
  })
})
