import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { applicationRecordRepository } from '../../shared/storage/application-record-repository'
import { useEntityCrudForm } from '../../shared/storage/use-entity-crud-form'
import type { ApplicationRecord } from '../../shared/types/application-record'
import {
  applicationRecordFormSchema,
  type ApplicationRecordFormValues,
} from './application-record-schema'

const emptyValues: ApplicationRecordFormValues = {
  companyName: '',
  jobTitle: '',
  status: 'Applied',
  notes: '',
  resumeVersion: '',
  coverLetterVersion: '',
  applicationDate: new Date().toISOString().split('T')[0],
  sourcePlatform: 'Workday',
}

export function ApplicationRecordsPage() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ApplicationRecordFormValues>({
    resolver: zodResolver(applicationRecordFormSchema),
    defaultValues: emptyValues,
  })
  const { items, editingId, submit, startEdit, remove } = useEntityCrudForm<
    ApplicationRecord,
    ApplicationRecordFormValues
  >('applicationRecords', applicationRecordRepository, emptyValues, reset)

  const onSubmit = handleSubmit(submit)

  return (
    <section>
      <h2>Application records</h2>
      <table aria-label="Application records list">
        <thead>
          <tr>
            <th>Date</th>
            <th>Company</th>
            <th>Job title</th>
            <th>Status</th>
            <th>URL</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id}>
              <td>{item.applicationDate}</td>
              <td>{item.companyName}</td>
              <td>{item.jobTitle}</td>
              <td>{item.status}</td>
              <td>{item.jobUrl ?? ''}</td>
              <td>{item.notes ?? ''}</td>
              <td>
                <button type="button" onClick={() => startEdit(item)}>
                  Edit
                </button>
                <button type="button" onClick={() => remove(item.id)}>
                  Delete
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <form
        onSubmit={onSubmit}
        aria-label="Application record form"
        className="space-y-2 max-w-xl"
      >
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
          <label htmlFor="status">Status</label>
          <select id="status" {...register('status')}>
            <option value="Applied">Applied</option>
            <option value="Draft">Draft</option>
            <option value="Interested">Interested</option>
          </select>
        </div>
        <div>
          <label htmlFor="notes">Notes</label>
          <textarea id="notes" {...register('notes')} />
        </div>
        <div>
          <label htmlFor="resumeVersion">Resume version</label>
          <input id="resumeVersion" {...register('resumeVersion')} />
        </div>
        <div>
          <label htmlFor="coverLetterVersion">Cover letter version</label>
          <input id="coverLetterVersion" {...register('coverLetterVersion')} />
        </div>
        <button type="submit">{editingId ? 'Update record' : 'Add record'}</button>
      </form>
    </section>
  )
}
