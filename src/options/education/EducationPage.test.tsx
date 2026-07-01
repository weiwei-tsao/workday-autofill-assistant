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
})
