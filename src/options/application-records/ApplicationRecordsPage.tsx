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

const inputClass =
  'font-sans text-[13px] text-ink bg-surface border border-line-strong rounded-input px-3 py-2.5 outline-none w-full focus:border-primary transition-colors'
const labelClass = 'text-[12px] font-semibold text-body'

const statusDot: Record<string, string> = {
  Applied: 'bg-success',
  Draft: 'bg-faint',
  Interested: 'bg-primary',
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
    <section className="flex flex-col gap-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[22px] font-semibold tracking-[-0.02em]">Application records</h2>
          <span className="text-[13px] text-muted">
            Everything you saved with one click from Workday pages.
          </span>
        </div>
        <span className="font-mono text-[12px] text-muted">{items.length} applications saved</span>
      </div>

      <table aria-label="Application records list" className="w-full bg-surface border border-line rounded-card shadow-[0_1px_2px_rgba(28,26,23,0.04)] border-collapse overflow-hidden">
        <thead>
          <tr className="border-b border-line">
            <th className="font-mono text-[11px] text-muted font-normal text-left px-5 py-3">Date</th>
            <th className="font-mono text-[11px] text-muted font-normal text-left px-5 py-3">Company</th>
            <th className="font-mono text-[11px] text-muted font-normal text-left px-5 py-3">Job title</th>
            <th className="font-mono text-[11px] text-muted font-normal text-left px-5 py-3">Status</th>
            <th className="font-mono text-[11px] text-muted font-normal text-left px-5 py-3">URL</th>
            <th className="font-mono text-[11px] text-muted font-normal text-left px-5 py-3">Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => (
            <tr key={item.id} className="border-b border-hairline last:border-b-0 hover:bg-[#FBFAF8]">
              <td className="font-mono text-[11px] text-muted px-5 py-3.5">{item.applicationDate}</td>
              <td className="text-[13px] font-semibold px-5 py-3.5">{item.companyName}</td>
              <td className="text-[13px] text-body px-5 py-3.5">{item.jobTitle}</td>
              <td className="px-5 py-3.5">
                <span className="inline-flex items-center gap-1.5 border border-line rounded-full px-2.5 py-[3px] text-[11px] font-medium">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusDot[item.status] ?? 'bg-faint'}`} />
                  {item.status}
                </span>
              </td>
              <td className="font-mono text-[10px] text-faint px-5 py-3.5">{item.jobUrl ?? ''}</td>
              <td className="text-[13px] text-body px-5 py-3.5">{item.notes ?? ''}</td>
              <td className="px-5 py-3.5">
                <span className="flex gap-3">
                  <button type="button" onClick={() => startEdit(item)} className="text-[12px] font-semibold text-muted">
                    Edit
                  </button>
                  <button type="button" onClick={() => remove(item.id)} className="text-[12px] font-semibold text-danger">
                    Delete
                  </button>
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <form
        onSubmit={onSubmit}
        aria-label="Application record form"
        className="bg-surface border border-line rounded-card shadow-[0_1px_2px_rgba(28,26,23,0.04)] p-5 flex flex-col gap-3.5"
      >
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
        <div className="flex flex-col gap-1.5">
          <label htmlFor="status" className={labelClass}>Status</label>
          <select id="status" className={inputClass} {...register('status')}>
            <option value="Applied">Applied</option>
            <option value="Draft">Draft</option>
            <option value="Interested">Interested</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="notes" className={labelClass}>Notes</label>
          <textarea id="notes" className={inputClass} {...register('notes')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="resumeVersion" className={labelClass}>Resume version</label>
          <input id="resumeVersion" className={inputClass} {...register('resumeVersion')} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="coverLetterVersion" className={labelClass}>Cover letter version</label>
          <input id="coverLetterVersion" className={inputClass} {...register('coverLetterVersion')} />
        </div>
        <div className="flex justify-end border-t border-hairline pt-3.5">
          <button
            type="submit"
            className="font-sans text-[13px] font-semibold bg-ink text-white rounded-input px-[18px] py-[10px] hover:bg-[#2E2B26] transition-colors duration-150"
          >
            {editingId ? 'Update record' : 'Add record'}
          </button>
        </div>
      </form>
    </section>
  )
}
