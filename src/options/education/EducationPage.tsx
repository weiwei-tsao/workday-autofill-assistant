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

const inputClass =
  'font-sans text-[13px] text-ink bg-surface border border-line-strong rounded-input px-3 py-2.5 outline-none w-full focus:border-primary transition-colors'
const labelClass = 'text-[12px] font-semibold text-body'
const optionalLabelClass = 'text-[12px] font-semibold text-faint'

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
  const { items, editingId, submit, startEdit, remove, cancelEdit } = useEntityCrudForm<
    Education,
    EducationFormValues
  >('educations', educationRepository, emptyValues, reset)

  const onSubmit = handleSubmit(submit)

  return (
    <section className="bg-raised border border-[#E3DFD8] rounded-panel shadow-[0_12px_32px_rgba(28,26,23,0.08)] p-7 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[22px] font-semibold tracking-[-0.02em]">Education</h2>
          <span className="text-[13px] text-muted">Entries are filled in order — newest first.</span>
        </div>
        <button
          type="button"
          onClick={() => cancelEdit()}
          className="font-sans text-[13px] font-semibold bg-surface text-ink border border-line-strong rounded-input px-[18px] py-[10px] hover:bg-[#FBFAF8] transition-colors duration-150"
        >
          + Add education
        </button>
      </div>

      <div className="grid grid-cols-[1fr_1.3fr] gap-5 items-start">
        <ul aria-label="Education list" className="flex flex-col gap-3 list-none m-0 p-0">
          {items.map((item) => {
            const isEditing = item.id === editingId
            return (
              <li
                key={item.id}
                className={`bg-surface rounded-card shadow-[0_1px_2px_rgba(28,26,23,0.04)] p-4 flex flex-col gap-2 ${
                  isEditing ? 'border-2 border-primary' : 'border border-line'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[14px] font-semibold">
                    {item.degree}, {item.fieldOfStudy} — {item.schoolName}
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
                <span className="font-mono text-[11px] text-muted">
                  {item.startYear} — {item.endYear ?? 'present'}
                </span>
              </li>
            )
          })}
        </ul>

        <form
          onSubmit={onSubmit}
          aria-label="Education form"
          className="bg-surface border border-line rounded-card shadow-[0_1px_2px_rgba(28,26,23,0.04)] p-5 flex flex-col gap-3.5"
        >
          <div className="flex flex-col gap-1.5">
            <label htmlFor="schoolName" className={labelClass}>School name</label>
            <input id="schoolName" className={inputClass} {...register('schoolName')} />
            {errors.schoolName && <p role="alert">{errors.schoolName.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3.5">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="degree" className={labelClass}>Degree</label>
              <input id="degree" className={inputClass} {...register('degree')} />
              {errors.degree && <p role="alert">{errors.degree.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="fieldOfStudy" className={labelClass}>Field of study</label>
              <input id="fieldOfStudy" className={inputClass} {...register('fieldOfStudy')} />
              {errors.fieldOfStudy && <p role="alert">{errors.fieldOfStudy.message}</p>}
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
              <label htmlFor="startYear" className={labelClass}>Start year</label>
              <input id="startYear" type="number" className={inputClass} {...register('startYear')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="endYear" className={optionalLabelClass}>
                End year <span className="font-normal">· optional</span>
              </label>
              <input id="endYear" type="number" className={inputClass} {...register('endYear')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="gpa" className={optionalLabelClass}>
              GPA <span className="font-normal">· optional</span>
            </label>
            <input id="gpa" className={inputClass} {...register('gpa')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="description" className={optionalLabelClass}>
              Description <span className="font-normal">· optional</span>
            </label>
            <textarea id="description" className={inputClass} {...register('description')} />
          </div>
          <div className="flex justify-end border-t border-hairline pt-3.5">
            <button
              type="submit"
              className="font-sans text-[13px] font-semibold bg-ink text-white rounded-input px-[18px] py-[10px] hover:bg-[#2E2B26] transition-colors duration-150"
            >
              {editingId ? 'Update education' : 'Add education'}
            </button>
          </div>
        </form>
      </div>
    </section>
  )
}
