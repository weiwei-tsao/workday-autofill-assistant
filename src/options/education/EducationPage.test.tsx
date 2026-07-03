import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { EducationPage } from './EducationPage'

beforeEach(() => {
  installChromeStorageMock()
})

describe('EducationPage', () => {
  it('adds an education entry and lists it', async () => {
    const user = userEvent.setup()
    render(<EducationPage />)

    await user.type(screen.getByLabelText('School name'), 'MIT')
    await user.type(screen.getByLabelText('Degree'), 'BSc')
    await user.type(screen.getByLabelText('Field of study'), 'Computer Science')
    await user.clear(screen.getByLabelText('Start year'))
    await user.type(screen.getByLabelText('Start year'), '2016')
    await user.click(screen.getByRole('button', { name: 'Add education' }))

    const list = await screen.findByLabelText('Education list')
    expect(within(list).getByText('BSc, Computer Science — MIT')).toBeInTheDocument()
  })

  it('clicking + Add education while editing starts a new entry instead of overwriting the one being edited', async () => {
    const user = userEvent.setup()
    render(<EducationPage />)

    await user.type(screen.getByLabelText('School name'), 'MIT')
    await user.type(screen.getByLabelText('Degree'), 'BSc')
    await user.type(screen.getByLabelText('Field of study'), 'Computer Science')
    await user.clear(screen.getByLabelText('Start year'))
    await user.type(screen.getByLabelText('Start year'), '2016')
    await user.click(screen.getByRole('button', { name: 'Add education' }))

    const list = await screen.findByLabelText('Education list')
    await user.click(within(list).getByRole('button', { name: 'Edit' }))
    expect(screen.getByRole('button', { name: 'Update education' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: '+ Add education' }))
    expect(screen.getByRole('button', { name: 'Add education' })).toBeInTheDocument()

    await user.type(screen.getByLabelText('School name'), 'Stanford')
    await user.type(screen.getByLabelText('Degree'), 'MSc')
    await user.type(screen.getByLabelText('Field of study'), 'AI')
    await user.clear(screen.getByLabelText('Start year'))
    await user.type(screen.getByLabelText('Start year'), '2020')
    await user.click(screen.getByRole('button', { name: 'Add education' }))

    const updatedList = await screen.findByLabelText('Education list')
    expect(within(updatedList).getByText('BSc, Computer Science — MIT')).toBeInTheDocument()
    expect(within(updatedList).getByText('MSc, AI — Stanford')).toBeInTheDocument()
  })
})
