import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../tests/chrome-storage-mock'
import { App } from './App'

beforeEach(() => {
  installChromeStorageMock()
})

describe('App', () => {
  it('switches between profile sections via the tab navigation', async () => {
    const user = userEvent.setup()
    render(<App />)

    expect(screen.getByLabelText('Personal info form')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Work experience' }))
    expect(screen.getByLabelText('Work experience form')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Education' }))
    expect(screen.getByLabelText('Education form')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Answer bank' }))
    expect(screen.getByLabelText('Answer bank form')).toBeInTheDocument()
  })

  it('shows the application records tab', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Application records' }))
    expect(screen.getByLabelText('Application record form')).toBeInTheDocument()
  })

  it('shows the import/export tab', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Import / Export' }))
    expect(screen.getByRole('button', { name: 'Export data' })).toBeInTheDocument()
  })

  it('shows the privacy settings tab', async () => {
    const user = userEvent.setup()
    render(<App />)

    await user.click(screen.getByRole('button', { name: 'Privacy settings' }))
    expect(await screen.findByLabelText('Allow auto-fill for Gender')).toBeInTheDocument()
  })
})
