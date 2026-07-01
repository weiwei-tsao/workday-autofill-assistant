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

export function WorkExperiencePage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WorkExperienceFormValues>({
    resolver: zodResolver(workExperienceFormSchema),
    defaultValues: emptyValues,
  })
  const { items, editingId, submit, startEdit, remove } = useEntityCrudForm<
    WorkExperience,
    WorkExperienceFormValues
  >('workExperiences', workExperienceRepository, emptyValues, reset)

  const onSubmit = handleSubmit(submit)

  return (
    <section>
      <h2>Work experience</h2>
      <ul aria-label="Work experience list">
        {items.map((item) => (
          <li key={item.id}>
            <span>
              {item.jobTitle} at {item.companyName}
            </span>
            <button type="button" onClick={() => startEdit(item)}>
              Edit
            </button>
            <button type="button" onClick={() => remove(item.id)}>
              Delete
            </button>
          </li>
        ))}
      </ul>
      <form onSubmit={onSubmit} aria-label="Work experience form" className="space-y-2 max-w-xl">
        <div>
          <label htmlFor="companyName">Company name</label>
          <input id="companyName" {...register('companyName')} />
          {errors.companyName && <p role="alert">{errors.companyName.message}</p>}
        </div>
        <div>
          <label htmlFor="jobTitle">Job title</label>
          <input id="jobTitle" {...register('jobTitle')} />
          {errors.jobTitle && <p role="alert">{errors.jobTitle.message}</p>}
        </div>
        <div>
          <label htmlFor="location">Location</label>
          <input id="location" {...register('location')} />
        </div>
        <div>
          <label htmlFor="startMonth">Start month</label>
          <input id="startMonth" type="number" {...register('startMonth')} />
        </div>
        <div>
          <label htmlFor="startYear">Start year</label>
          <input id="startYear" type="number" {...register('startYear')} />
        </div>
        <div>
          <label htmlFor="endMonth">End month</label>
          <input id="endMonth" type="number" {...register('endMonth')} />
        </div>
        <div>
          <label htmlFor="endYear">End year</label>
          <input id="endYear" type="number" {...register('endYear')} />
        </div>
        <div>
          <label htmlFor="currentlyWorking">
            <input id="currentlyWorking" type="checkbox" {...register('currentlyWorking')} />
            Currently working here
          </label>
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea id="description" {...register('description')} />
        </div>
        <button type="submit">{editingId ? 'Update experience' : 'Add experience'}</button>
      </form>
    </section>
  )
}
