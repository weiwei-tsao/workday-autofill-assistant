import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect, useRef } from 'react'
import { useForm } from 'react-hook-form'
import { saveProfile } from '../../shared/storage/profile-repository'
import { useProfile } from '../../shared/storage/use-profile'
import { profileSchema, type ProfileFormValues } from './profile-schema'

const defaultValues: ProfileFormValues = {
  firstName: '',
  lastName: '',
  preferredName: '',
  email: '',
  phone: '',
  country: '',
  addressLine1: '',
  addressLine2: '',
  city: '',
  province: '',
  postalCode: '',
  linkedinUrl: '',
  githubUrl: '',
  portfolioUrl: '',
  workAuthorizationStatus: '',
  sponsorshipRequired: false,
  earliestStartDate: '',
}

export function PersonalInfoPage() {
  const { profile } = useProfile()
  const skipNextResetRef = useRef(false)
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitSuccessful },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues,
  })

  useEffect(() => {
    if (!profile) return
    if (skipNextResetRef.current) {
      skipNextResetRef.current = false
      return
    }
    reset(profile)
  }, [profile, reset])

  const onSubmit = handleSubmit(async (values) => {
    skipNextResetRef.current = true
    await saveProfile(values)
  })

  return (
    <form onSubmit={onSubmit} className="space-y-4 max-w-xl" aria-label="Personal info form" noValidate>
      <div>
        <label htmlFor="firstName">First name</label>
        <input id="firstName" {...register('firstName')} />
        {errors.firstName && <p role="alert">{errors.firstName.message}</p>}
      </div>
      <div>
        <label htmlFor="lastName">Last name</label>
        <input id="lastName" {...register('lastName')} />
        {errors.lastName && <p role="alert">{errors.lastName.message}</p>}
      </div>
      <div>
        <label htmlFor="preferredName">Preferred name</label>
        <input id="preferredName" {...register('preferredName')} />
      </div>
      <div>
        <label htmlFor="email">Email</label>
        <input id="email" type="email" {...register('email')} />
        {errors.email && <p role="alert">{errors.email.message}</p>}
      </div>
      <div>
        <label htmlFor="phone">Phone number</label>
        <input id="phone" {...register('phone')} />
        {errors.phone && <p role="alert">{errors.phone.message}</p>}
      </div>
      <div>
        <label htmlFor="country">Country</label>
        <input id="country" {...register('country')} />
        {errors.country && <p role="alert">{errors.country.message}</p>}
      </div>
      <div>
        <label htmlFor="addressLine1">Address line 1</label>
        <input id="addressLine1" {...register('addressLine1')} />
        {errors.addressLine1 && <p role="alert">{errors.addressLine1.message}</p>}
      </div>
      <div>
        <label htmlFor="addressLine2">Address line 2</label>
        <input id="addressLine2" {...register('addressLine2')} />
      </div>
      <div>
        <label htmlFor="city">City</label>
        <input id="city" {...register('city')} />
        {errors.city && <p role="alert">{errors.city.message}</p>}
      </div>
      <div>
        <label htmlFor="province">Province / State</label>
        <input id="province" {...register('province')} />
        {errors.province && <p role="alert">{errors.province.message}</p>}
      </div>
      <div>
        <label htmlFor="postalCode">Postal code</label>
        <input id="postalCode" {...register('postalCode')} />
        {errors.postalCode && <p role="alert">{errors.postalCode.message}</p>}
      </div>
      <div>
        <label htmlFor="linkedinUrl">LinkedIn URL</label>
        <input id="linkedinUrl" {...register('linkedinUrl')} />
      </div>
      <div>
        <label htmlFor="githubUrl">GitHub URL</label>
        <input id="githubUrl" {...register('githubUrl')} />
      </div>
      <div>
        <label htmlFor="portfolioUrl">Portfolio / personal website</label>
        <input id="portfolioUrl" {...register('portfolioUrl')} />
      </div>
      <div>
        <label htmlFor="workAuthorizationStatus">Work authorization status</label>
        <input id="workAuthorizationStatus" {...register('workAuthorizationStatus')} />
        {errors.workAuthorizationStatus && (
          <p role="alert">{errors.workAuthorizationStatus.message}</p>
        )}
      </div>
      <div>
        <label htmlFor="sponsorshipRequired">
          <input id="sponsorshipRequired" type="checkbox" {...register('sponsorshipRequired')} />
          Will now or in the future require sponsorship
        </label>
      </div>
      <div>
        <label htmlFor="earliestStartDate">Earliest start date</label>
        <input id="earliestStartDate" type="date" {...register('earliestStartDate')} />
      </div>
      <button type="submit">Save</button>
      {isSubmitSuccessful && <p role="status">Profile saved.</p>}
    </form>
  )
}
