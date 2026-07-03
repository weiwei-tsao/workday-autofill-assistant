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

const inputClass =
  'font-sans text-[13px] text-ink bg-surface border border-line-strong rounded-input px-3 py-2.5 outline-none w-full focus:border-primary transition-colors'
const monoInputClass =
  'font-mono text-[12px] text-ink bg-surface border border-line-strong rounded-input px-3 py-2.5 outline-none w-full focus:border-primary transition-colors'
const labelClass = 'text-[12px] font-semibold text-body'
const optionalLabelClass = 'text-[12px] font-semibold text-faint'
const sectionLabelClass = 'font-mono text-[11px] text-muted uppercase tracking-[0.08em]'

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
    <form
      onSubmit={onSubmit}
      aria-label="Personal info form"
      noValidate
      className="bg-raised border border-[#E3DFD8] rounded-panel p-7 flex flex-col gap-5 max-w-3xl"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[22px] font-semibold tracking-[-0.02em]">Personal info</h2>
          <span className="text-[13px] text-muted">
            Fills Workday contact, address, and eligibility fields.
          </span>
        </div>
        <button type="submit" className="font-sans text-[13px] font-semibold bg-ink text-white rounded-input px-[18px] py-[10px] hover:bg-[#2E2B26] transition-colors duration-150">
          Save
        </button>
      </div>

      <div className="bg-surface border border-line rounded-card p-5 flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <span className={sectionLabelClass}>Name</span>
          <div className="grid grid-cols-3 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="firstName" className={labelClass}>First name</label>
              <input id="firstName" className={inputClass} {...register('firstName')} />
              {errors.firstName && <p role="alert">{errors.firstName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lastName" className={labelClass}>Last name</label>
              <input id="lastName" className={inputClass} {...register('lastName')} />
              {errors.lastName && <p role="alert">{errors.lastName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="preferredName" className={optionalLabelClass}>
                Preferred name <span className="font-normal">· optional</span>
              </label>
              <input id="preferredName" className={inputClass} {...register('preferredName')} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-hairline pt-5">
          <span className={sectionLabelClass}>Contact</span>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className={labelClass}>Email</label>
              <input id="email" type="email" className={inputClass} {...register('email')} />
              {errors.email && <p role="alert">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="phone" className={labelClass}>Phone number</label>
              <input id="phone" className={inputClass} {...register('phone')} />
              {errors.phone && <p role="alert">{errors.phone.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-hairline pt-5">
          <span className={sectionLabelClass}>Address</span>
          <div className="grid grid-cols-[1fr_2fr] gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="country" className={labelClass}>Country</label>
              <input id="country" className={inputClass} {...register('country')} />
              {errors.country && <p role="alert">{errors.country.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="addressLine1" className={labelClass}>Address line 1</label>
              <input id="addressLine1" className={inputClass} {...register('addressLine1')} />
              {errors.addressLine1 && <p role="alert">{errors.addressLine1.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="addressLine2" className={optionalLabelClass}>
              Address line 2 <span className="font-normal">· optional</span>
            </label>
            <input id="addressLine2" className={inputClass} {...register('addressLine2')} />
          </div>
          <div className="grid grid-cols-3 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="city" className={labelClass}>City</label>
              <input id="city" className={inputClass} {...register('city')} />
              {errors.city && <p role="alert">{errors.city.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="province" className={labelClass}>Province / State</label>
              <input id="province" className={inputClass} {...register('province')} />
              {errors.province && <p role="alert">{errors.province.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="postalCode" className={labelClass}>Postal code</label>
              <input id="postalCode" className={inputClass} {...register('postalCode')} />
              {errors.postalCode && <p role="alert">{errors.postalCode.message}</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-hairline pt-5">
          <span className={sectionLabelClass}>Links</span>
          <div className="grid grid-cols-3 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="linkedinUrl" className={optionalLabelClass}>
                LinkedIn URL <span className="font-normal">· optional</span>
              </label>
              <input id="linkedinUrl" className={monoInputClass} {...register('linkedinUrl')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="githubUrl" className={optionalLabelClass}>
                GitHub URL <span className="font-normal">· optional</span>
              </label>
              <input id="githubUrl" className={monoInputClass} {...register('githubUrl')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="portfolioUrl" className={optionalLabelClass}>
                Portfolio / personal website <span className="font-normal">· optional</span>
              </label>
              <input id="portfolioUrl" className={monoInputClass} {...register('portfolioUrl')} />
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 border-t border-hairline pt-5">
          <span className={sectionLabelClass}>Work eligibility</span>
          <div className="grid grid-cols-3 gap-3.5 items-end">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="workAuthorizationStatus" className={labelClass}>
                Work authorization status
              </label>
              <input
                id="workAuthorizationStatus"
                className={inputClass}
                {...register('workAuthorizationStatus')}
              />
              {errors.workAuthorizationStatus && (
                <p role="alert">{errors.workAuthorizationStatus.message}</p>
              )}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="earliestStartDate" className={optionalLabelClass}>
                Earliest start date <span className="font-normal">· optional</span>
              </label>
              <input
                id="earliestStartDate"
                type="date"
                className={monoInputClass}
                {...register('earliestStartDate')}
              />
            </div>
            <label
              htmlFor="sponsorshipRequired"
              className="flex items-center justify-between border border-line-strong rounded-input px-3 py-2.5 cursor-pointer"
            >
              <span className="text-[13px] font-medium">Will now or in the future require sponsorship</span>
              <span className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                <input
                  id="sponsorshipRequired"
                  type="checkbox"
                  className="sr-only peer"
                  {...register('sponsorshipRequired')}
                />
                <span className="w-[34px] h-5 bg-line-strong peer-checked:bg-success rounded-full transition-colors duration-150 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:shadow-[0_1px_2px_rgba(28,26,23,0.2)] after:transition-all after:duration-150 peer-checked:after:translate-x-[14px]" />
              </span>
            </label>
          </div>
        </div>
      </div>
      {isSubmitSuccessful && <p role="status">Profile saved.</p>}
    </form>
  )
}
