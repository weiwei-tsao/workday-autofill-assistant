import type { ApplicationRecord } from '../types/application-record'

export interface AutofillSummary {
  detected: number
  filled: number
  needsReview: number
}

export interface AutofillResultSummary extends AutofillSummary {
  skipped: number
  hasMoreEntries: boolean
}

export interface GetPageStatusMessage {
  type: 'GET_PAGE_STATUS'
}

export interface PageStatusMessage {
  type: 'PAGE_STATUS'
  isWorkdayPage: boolean
}

export interface AutofillPageMessage {
  type: 'AUTOFILL_PAGE'
}

export interface AutofillResultMessage {
  type: 'AUTOFILL_RESULT'
  summary: AutofillResultSummary
}

export interface SaveApplicationMessage {
  type: 'SAVE_APPLICATION'
}

export interface ApplicationSavedMessage {
  type: 'APPLICATION_SAVED'
  record: ApplicationRecord
}

export type ExtensionMessage =
  | GetPageStatusMessage
  | PageStatusMessage
  | AutofillPageMessage
  | AutofillResultMessage
  | SaveApplicationMessage
  | ApplicationSavedMessage
