import type { ApplicationRecord } from '../types/application-record'
import { createListRepository } from './list-repository'

export const applicationRecordRepository =
  createListRepository<ApplicationRecord>('applicationRecords')
