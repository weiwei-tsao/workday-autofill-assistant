import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { answerBankRepository } from './answer-bank-repository'

beforeEach(() => {
  installChromeStorageMock()
})

describe('answerBankRepository', () => {
  it('round-trips an answer bank entry under the answerBank key', async () => {
    await answerBankRepository.add({
      id: '1',
      questionKey: 'workAuthorization',
      questionLabel: 'Are you legally authorized to work in this country?',
      type: 'yesNo',
      value: 'Yes',
      isSensitive: false,
      autoFillEnabled: true,
    })

    expect(await answerBankRepository.list()).toEqual([
      {
        id: '1',
        questionKey: 'workAuthorization',
        questionLabel: 'Are you legally authorized to work in this country?',
        type: 'yesNo',
        value: 'Yes',
        isSensitive: false,
        autoFillEnabled: true,
      },
    ])
  })
})
