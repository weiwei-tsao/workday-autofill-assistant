import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { answerBankRepository } from '../../shared/storage/answer-bank-repository'
import { useEntityCrudForm } from '../../shared/storage/use-entity-crud-form'
import type { AnswerBankEntry } from '../../shared/types/answer-bank'
import { answerBankFormSchema, type AnswerBankFormValues } from './answer-bank-schema'

const emptyValues: AnswerBankFormValues = {
  questionKey: '',
  questionLabel: '',
  type: 'yesNo',
  value: '',
  isSensitive: false,
  sensitiveCategory: '',
  autoFillEnabled: true,
}

const inputClass =
  'font-sans text-[13px] text-ink bg-surface border border-line-strong rounded-input px-3 py-2.5 outline-none w-full focus:border-primary transition-colors'
const labelClass = 'text-[12px] font-semibold text-body'

function statusPill(item: AnswerBankEntry) {
  const text = item.isSensitive
    ? item.autoFillEnabled
      ? 'Sensitive — auto-fill on'
      : 'Sensitive — auto-fill off'
    : 'Auto-fill on'
  const dotColor = item.isSensitive ? (item.autoFillEnabled ? 'bg-success' : 'bg-warning') : 'bg-success'
  return (
    <span className="inline-flex items-center gap-1.5 border border-line rounded-full px-2.5 py-[3px] text-[11px] font-medium bg-surface">
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {text}
    </span>
  )
}

export function AnswerBankPage() {
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<AnswerBankFormValues>({
    resolver: zodResolver(answerBankFormSchema),
    defaultValues: emptyValues,
  })
  const { items, editingId, submit, startEdit, remove } = useEntityCrudForm<
    AnswerBankEntry,
    AnswerBankFormValues
  >('answerBank', answerBankRepository, emptyValues, reset)
  const isSensitiveField = register('isSensitive')

  const onSubmit = handleSubmit(submit)

  return (
    <section className="bg-raised border border-[#E3DFD8] rounded-panel shadow-[0_12px_32px_rgba(28,26,23,0.08)] p-7 flex flex-col gap-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="m-0 text-[22px] font-semibold tracking-[-0.02em]">Answer bank</h2>
          <span className="text-[13px] text-muted">
            Reusable answers for the questions every application asks.
          </span>
        </div>
      </div>

      <ul aria-label="Answer bank list" className="bg-surface border border-line rounded-card shadow-[0_1px_2px_rgba(28,26,23,0.04)] overflow-hidden list-none m-0 p-0">
        {items.map((item) => (
          <li
            key={item.id}
            className={`flex items-center justify-between gap-4 px-5 py-3.5 border-b border-hairline last:border-b-0 ${
              item.isSensitive ? 'bg-[#FBF7EE]' : ''
            }`}
          >
            <span className="flex flex-col gap-0.5">
              <span className="text-[13px] font-semibold">{item.questionLabel}</span>
              <span className="font-mono text-[10px] text-faint">{item.questionKey}</span>
            </span>
            <span className="flex items-center gap-3">
              {statusPill(item)}
              <button type="button" onClick={() => startEdit(item)} className="text-[12px] font-semibold text-muted">
                Edit
              </button>
              <button type="button" onClick={() => remove(item.id)} className="text-[12px] font-semibold text-danger">
                Delete
              </button>
            </span>
          </li>
        ))}
      </ul>
      <span className="text-[12px] text-muted">
        Sensitive answers are never auto-filled by default. Manage exceptions in Privacy settings.
      </span>

      <form onSubmit={onSubmit} aria-label="Answer bank form" className="bg-surface border border-line rounded-card shadow-[0_1px_2px_rgba(28,26,23,0.04)] p-5 flex flex-col gap-3.5">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="questionKey" className={labelClass}>Question key</label>
          <input id="questionKey" className={inputClass} {...register('questionKey')} />
          {errors.questionKey && <p role="alert">{errors.questionKey.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="questionLabel" className={labelClass}>Question label</label>
          <input id="questionLabel" className={inputClass} {...register('questionLabel')} />
          {errors.questionLabel && <p role="alert">{errors.questionLabel.message}</p>}
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="type" className={labelClass}>Question type</label>
          <select id="type" className={inputClass} {...register('type')}>
            <option value="yesNo">Yes / No</option>
            <option value="text">Text</option>
            <option value="select">Select</option>
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="value" className={labelClass}>Answer</label>
          <input id="value" className={inputClass} {...register('value')} />
          {errors.value && <p role="alert">{errors.value.message}</p>}
        </div>
        <label htmlFor="isSensitive" className="flex items-center gap-2.5 cursor-pointer">
          <input
            id="isSensitive"
            type="checkbox"
            name={isSensitiveField.name}
            ref={isSensitiveField.ref}
            onBlur={isSensitiveField.onBlur}
            onChange={(event) => {
              isSensitiveField.onChange(event)
              if (event.target.checked) {
                setValue('autoFillEnabled', false)
              }
            }}
          />
          <span className="text-[13px] font-medium">Sensitive question</span>
        </label>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="sensitiveCategory" className={labelClass}>Sensitive category (if applicable)</label>
          <select id="sensitiveCategory" className={inputClass} {...register('sensitiveCategory')}>
            <option value="">Not applicable</option>
            <option value="gender">Gender</option>
            <option value="race">Race / Ethnicity</option>
            <option value="disability">Disability status</option>
            <option value="veteranStatus">Veteran status</option>
            <option value="other">Other sensitive category</option>
          </select>
        </div>
        <label htmlFor="autoFillEnabled" className="flex items-center gap-2.5 cursor-pointer">
          <input id="autoFillEnabled" type="checkbox" {...register('autoFillEnabled')} />
          <span className="text-[13px] font-medium">Auto-fill this answer</span>
        </label>
        <div className="flex justify-end border-t border-hairline pt-3.5">
          <button
            type="submit"
            className="font-sans text-[13px] font-semibold bg-ink text-white rounded-input px-[18px] py-[10px] hover:bg-[#2E2B26] transition-colors duration-150"
          >
            {editingId ? 'Update answer' : 'Add answer'}
          </button>
        </div>
      </form>
    </section>
  )
}
