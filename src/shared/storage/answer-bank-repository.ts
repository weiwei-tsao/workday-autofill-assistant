import type { AnswerBankEntry } from '../types/answer-bank'
import { createListRepository } from './list-repository'

export const answerBankRepository = createListRepository<AnswerBankEntry>('answerBank')
