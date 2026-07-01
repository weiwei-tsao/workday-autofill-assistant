export interface WorkExperience extends Record<string, unknown> {
  id: string
  companyName: string
  jobTitle: string
  location?: string
  startMonth: number
  startYear: number
  endMonth?: number
  endYear?: number
  currentlyWorking: boolean
  description?: string
}
