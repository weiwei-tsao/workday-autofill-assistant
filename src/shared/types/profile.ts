export interface Profile {
  firstName: string
  lastName: string
  preferredName?: string
  email: string
  phone: string
  country: string
  addressLine1: string
  addressLine2?: string
  city: string
  province: string
  postalCode: string
  linkedinUrl?: string
  githubUrl?: string
  portfolioUrl?: string
  workAuthorizationStatus: string
  sponsorshipRequired: boolean
  earliestStartDate?: string
}
