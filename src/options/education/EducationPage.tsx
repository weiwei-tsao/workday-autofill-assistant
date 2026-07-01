import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { educationRepository } from '../../shared/storage/education-repository'
import { useEntityCrudForm } from '../../shared/storage/use-entity-crud-form'
import type { Education } from '../../shared/types/education'
import { educationFormSchema, type EducationFormValues } from './education-schema'

const emptyValues: EducationFormValues = {
  schoolName: '',
  degree: '',
  fieldOfStudy: '',
  location: '',
  startYear: new Date().getFullYear(),
  endYear: undefined,
  gpa: '',
  description: '',
}

export function EducationPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<EducationFormValues>({
    resolver: zodResolver(educationFormSchema),
    defaultValues: emptyValues,
  })
  const { items, editingId, submit, startEdit, remove } = useEntityCrudForm<
    Education,
    EducationFormValues
  >('educations', educationRepository, emptyValues, reset)

  const onSubmit = handleSubmit(submit)

  return (
    <section>
      <h2>Education</h2>
      <ul aria-label="Education list">
        {items.map((item) => (
          <li key={item.id}>
            <span>
              {item.degree}, {item.fieldOfStudy} — {item.schoolName}
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
      <form onSubmit={onSubmit} aria-label="Education form" className="space-y-2 max-w-xl">
        <div>
          <label htmlFor="schoolName">School name</label>
          <input id="schoolName" {...register('schoolName')} />
          {errors.schoolName && <p role="alert">{errors.schoolName.message}</p>}
        </div>
        <div>
          <label htmlFor="degree">Degree</label>
          <input id="degree" {...register('degree')} />
          {errors.degree && <p role="alert">{errors.degree.message}</p>}
        </div>
        <div>
          <label htmlFor="fieldOfStudy">Field of study</label>
          <input id="fieldOfStudy" {...register('fieldOfStudy')} />
          {errors.fieldOfStudy && <p role="alert">{errors.fieldOfStudy.message}</p>}
        </div>
        <div>
          <label htmlFor="location">Location</label>
          <input id="location" {...register('location')} />
        </div>
        <div>
          <label htmlFor="startYear">Start year</label>
          <input id="startYear" type="number" {...register('startYear')} />
        </div>
        <div>
          <label htmlFor="endYear">End year</label>
          <input id="endYear" type="number" {...register('endYear')} />
        </div>
        <div>
          <label htmlFor="gpa">GPA</label>
          <input id="gpa" {...register('gpa')} />
        </div>
        <div>
          <label htmlFor="description">Description</label>
          <textarea id="description" {...register('description')} />
        </div>
        <button type="submit">{editingId ? 'Update education' : 'Add education'}</button>
      </form>
    </section>
  )
}
