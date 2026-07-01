import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { answerBankFormSchema } from './answer-bank-schema'
import { AnswerBankPage } from './AnswerBankPage'

beforeEach(() => {
  installChromeStorageMock()
})

describe('AnswerBankPage', () => {
  it('adds an answer bank entry marked as sensitive with auto-fill disabled', async () => {
    const user = userEvent.setup()
    render(<AnswerBankPage />)

    await user.type(screen.getByLabelText('Question key'), 'veteranStatus')
    await user.type(screen.getByLabelText('Question label'), 'Are you a veteran?')
    await user.selectOptions(screen.getByLabelText('Question type'), 'yesNo')
    await user.type(screen.getByLabelText('Answer'), 'Prefer not to answer')
    await user.click(screen.getByLabelText('Sensitive question'))
    await user.click(screen.getByRole('button', { name: 'Add answer' }))

    const list = await screen.findByLabelText('Answer bank list')
    expect(within(list).getByText('Are you a veteran?')).toBeInTheDocument()
    expect(within(list).getByText('Sensitive — auto-fill off')).toBeInTheDocument()
  })

  it('enforces sensitive-field constraint at schema level even when bypassing checkbox guard', () => {
    const input = {
      questionKey: 'testKey',
      questionLabel: 'Test',
      type: 'text' as const,
      value: 'answer',
      isSensitive: true,
      autoFillEnabled: true,
    }
    const result = answerBankFormSchema.parse(input)
    expect(result.autoFillEnabled).toBe(false)
  })
})
