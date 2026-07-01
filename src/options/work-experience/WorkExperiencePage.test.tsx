import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { WorkExperiencePage } from './WorkExperiencePage'

beforeEach(() => {
  installChromeStorageMock()
})

async function addSampleEntry(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Company name'), 'Acme')
  await user.type(screen.getByLabelText('Job title'), 'Engineer')
  await user.clear(screen.getByLabelText('Start month'))
  await user.type(screen.getByLabelText('Start month'), '3')
  await user.clear(screen.getByLabelText('Start year'))
  await user.type(screen.getByLabelText('Start year'), '2021')
  await user.click(screen.getByRole('button', { name: 'Add experience' }))
}

describe('WorkExperiencePage', () => {
  it('adds a work experience entry and lists it', async () => {
    const user = userEvent.setup()
    render(<WorkExperiencePage />)

    await addSampleEntry(user)

    const list = await screen.findByLabelText('Work experience list')
    expect(within(list).getByText('Engineer at Acme')).toBeInTheDocument()
  })

  it('deletes a work experience entry', async () => {
    const user = userEvent.setup()
    render(<WorkExperiencePage />)

    await addSampleEntry(user)

    const list = await screen.findByLabelText('Work experience list')
    await user.click(within(list).getByRole('button', { name: 'Delete' }))

    expect(within(list).queryByText('Engineer at Acme')).not.toBeInTheDocument()
  })
})
