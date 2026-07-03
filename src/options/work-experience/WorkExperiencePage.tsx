import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { workExperienceRepository } from '../../shared/storage/work-experience-repository'
import { useEntityCrudForm } from '../../shared/storage/use-entity-crud-form'
import type { WorkExperience } from '../../shared/types/work-experience'
import {
  workExperienceFormSchema,
  type WorkExperienceFormValues,
} from './work-experience-schema'

const emptyValues: WorkExperienceFormValues = {
  companyName: '',
  jobTitle: '',
  location: '',
  startMonth: 1,
  startYear: new Date().getFullYear(),
  endMonth: undefined,
  endYear: undefined,
  currentlyWorking: false,
  description: '',
}

const inputClass =
  'font-sans text-[13px] text-ink bg-surface border border-line-strong rounded-input px-3 py-2.5 outline-none w-full focus:border-primary transition-colors'
const labelClass = 'text-[12px] font-semibold text-body'
const optionalLabelClass = 'text-[12px] font-semibold text-faint'

export function WorkExperiencePage() {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors },
  } = useForm<WorkExperienceFormValues>({
    resolver: zodResolver(workExperienceFormSchema),
    defaultValues: emptyValues,
  })
  const { items, editingId, submit, startEdit, remove, cancelEdit } = useEntityCrudForm<
    WorkExperience,
    WorkExperienceFormValues
  >('workExperiences', workExperienceRepository, emptyValues, reset)
  const currentlyWorking = watch('currentlyWorking')

  const onSubmit = handleSubmit(submit)

  function formatDateRange(item: WorkExperience): string {
    const start = `${item.startMonth}/${item.startYear}`
    const end = item.currentlyWorking ? 'present' : item.endMonth ? `${item.endMonth}/${item.endYear}` : ''
    return `${start} — ${end}`
  }

  return (
    <section className="bg-raised border border-[#E3DFD8] rounded-panel p-7 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[22px] font-semibold tracking-[-0.02em]">Work experience</h2>
          <span className="text-[13px] text-muted">Entries are filled in order — newest first.</span>
        </div>
        <button
          type="button"
          onClick={() => cancelEdit()}
          className="font-sans text-[13px] font-semibold bg-surface text-ink border border-line-strong rounded-input px-[18px] py-[10px] hover:bg-[#FBFAF8] transition-colors duration-150"
        >
          + Add experience
        </button>
      </div>

      <div className="grid grid-cols-[1fr_1.3fr] gap-5 items-start">
        <ul aria-label="Work experience list" className="flex flex-col gap-3 list-none m-0 p-0">
          {items.map((item) => {
            const isEditing = item.id === editingId
            return (
              <li
                key={item.id}
                className={`bg-surface rounded-card p-4 flex flex-col gap-2 ${
                  isEditing ? 'border-2 border-primary' : 'border border-line'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold">
                    {item.jobTitle} at {item.companyName}
                  </span>
                  {isEditing ? (
                    <span className="font-mono text-[10px] text-primary bg-[#EDE8F9] rounded-badge px-2 py-0.5">
                      editing
                    </span>
                  ) : (
                    <span className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => startEdit(item)}
                        className="text-[12px] font-semibold text-muted"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(item.id)}
                        className="text-[12px] font-semibold text-danger"
                      >
                        Delete
                      </button>
                    </span>
                  )}
                </div>
                {item.location && <span className="text-[13px] text-body">{item.location}</span>}
                <span className="font-mono text-[11px] text-muted">{formatDateRange(item)}</span>
              </li>
            )
          })}
          <li className="border border-dashed border-[#C9C3BA] rounded-card p-3.5 text-center text-[12px] font-medium text-faint">
            Drag to reorder — top entry fills first
          </li>
        </ul>

        <form
          onSubmit={onSubmit}
          aria-label="Work experience form"
          className="bg-surface border border-line rounded-card p-5 flex flex-col gap-3.5"
        >
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="companyName" className={labelClass}>Company name</label>
              <input id="companyName" className={inputClass} {...register('companyName')} />
              {errors.companyName && <p role="alert">{errors.companyName.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="jobTitle" className={labelClass}>Job title</label>
              <input id="jobTitle" className={inputClass} {...register('jobTitle')} />
              {errors.jobTitle && <p role="alert">{errors.jobTitle.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="location" className={optionalLabelClass}>
              Location <span className="font-normal">· optional</span>
            </label>
            <input id="location" className={inputClass} {...register('location')} />
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="startMonth" className={labelClass}>Start month</label>
              <input id="startMonth" type="number" className={inputClass} {...register('startMonth')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="startYear" className={labelClass}>Start year</label>
              <input id="startYear" type="number" className={inputClass} {...register('startYear')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="endMonth"
                className={currentlyWorking ? 'text-[12px] font-semibold text-[#C9C3BA]' : optionalLabelClass}
              >
                End month
              </label>
              <input
                id="endMonth"
                type="number"
                disabled={currentlyWorking}
                className={`${inputClass} disabled:bg-canvas disabled:text-[#C9C3BA]`}
                {...register('endMonth')}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="endYear"
                className={currentlyWorking ? 'text-[12px] font-semibold text-[#C9C3BA]' : optionalLabelClass}
              >
                End year
              </label>
              <input
                id="endYear"
                type="number"
                disabled={currentlyWorking}
                className={`${inputClass} disabled:bg-canvas disabled:text-[#C9C3BA]`}
                {...register('endYear')}
              />
            </div>
          </div>
          <label htmlFor="currentlyWorking" className="flex items-center gap-2.5 cursor-pointer">
            <span className="relative inline-flex items-center cursor-pointer flex-shrink-0">
              <input
                id="currentlyWorking"
                type="checkbox"
                className="sr-only peer"
                {...register('currentlyWorking')}
              />
              <span className="w-[34px] h-5 bg-line-strong peer-checked:bg-success rounded-full transition-colors duration-150 relative after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-4 after:w-4 after:shadow-[0_1px_2px_rgba(28,26,23,0.2)] after:transition-all after:duration-150 peer-checked:after:translate-x-[14px]" />
            </span>
            <span className="text-[13px] font-medium">Currently working here</span>
          </label>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className={optionalLabelClass}>
              Description <span className="font-normal">· optional</span>
            </label>
            <textarea id="description" className={inputClass} {...register('description')} />
          </div>
          <div className="flex justify-end border-t border-hairline pt-3.5">
            <button
              type="submit"
              className="font-sans text-[13px] font-semibold bg-ink text-white rounded-input px-4 py-2.5 hover:bg-[#2E2B26] transition-colors duration-150"
            >
              {editingId ? 'Update experience' : 'Add experience'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
