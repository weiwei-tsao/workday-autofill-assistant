export type ApplicationStatus = 'Applied' | 'Draft' | 'Interested'

export interface ApplicationRecord {
  id: string
  companyName: string
  jobTitle: string
  jobLocation?: string
  jobUrl?: string
  applicationDate: string
  sourcePlatform: 'Workday'
  status: ApplicationStatus
  notes?: string
  resumeVersion?: string
  coverLetterVersion?: string
}
