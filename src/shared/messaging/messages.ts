import type { AutofillSummary } from '../../content/executor'

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
  summary: AutofillSummary
}

export type ExtensionMessage =
  | GetPageStatusMessage
  | PageStatusMessage
  | AutofillPageMessage
  | AutofillResultMessage
