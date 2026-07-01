import { z } from 'zod'

export const profileSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  preferredName: z.string().optional(),
  email: z.string().email('Enter a valid email address'),
  phone: z.string().min(1, 'Phone number is required'),
  country: z.string().min(1, 'Country is required'),
  addressLine1: z.string().min(1, 'Address is required'),
  addressLine2: z.string().optional(),
  city: z.string().min(1, 'City is required'),
  province: z.string().min(1, 'Province / State is required'),
  postalCode: z.string().min(1, 'Postal code is required'),
  linkedinUrl: z.string().optional(),
  githubUrl: z.string().optional(),
  portfolioUrl: z.string().optional(),
  workAuthorizationStatus: z.string().min(1, 'Work authorization status is required'),
  sponsorshipRequired: z.boolean(),
  earliestStartDate: z.string().optional(),
})

export type ProfileFormValues = z.infer<typeof profileSchema>
