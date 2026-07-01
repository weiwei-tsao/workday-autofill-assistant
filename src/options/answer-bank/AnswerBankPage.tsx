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
  autoFillEnabled: true,
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
    <section>
      <h2>Answer bank</h2>
      <ul aria-label="Answer bank list">
        {items.map((item) => (
          <li key={item.id}>
            <span>{item.questionLabel}</span>
            <span>
              {item.isSensitive
                ? item.autoFillEnabled
                  ? 'Sensitive — auto-fill on'
                  : 'Sensitive — auto-fill off'
                : 'Auto-fill on'}
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
      <form onSubmit={onSubmit} aria-label="Answer bank form" className="space-y-2 max-w-xl">
        <div>
          <label htmlFor="questionKey">Question key</label>
          <input id="questionKey" {...register('questionKey')} />
          {errors.questionKey && <p role="alert">{errors.questionKey.message}</p>}
        </div>
        <div>
          <label htmlFor="questionLabel">Question label</label>
          <input id="questionLabel" {...register('questionLabel')} />
          {errors.questionLabel && <p role="alert">{errors.questionLabel.message}</p>}
        </div>
        <div>
          <label htmlFor="type">Question type</label>
          <select id="type" {...register('type')}>
            <option value="yesNo">Yes / No</option>
            <option value="text">Text</option>
            <option value="select">Select</option>
          </select>
        </div>
        <div>
          <label htmlFor="value">Answer</label>
          <input id="value" {...register('value')} />
          {errors.value && <p role="alert">{errors.value.message}</p>}
        </div>
        <div>
          <label htmlFor="isSensitive">
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
            Sensitive question
          </label>
        </div>
        <div>
          <label htmlFor="autoFillEnabled">
            <input id="autoFillEnabled" type="checkbox" {...register('autoFillEnabled')} />
            Auto-fill this answer
          </label>
        </div>
        <button type="submit">{editingId ? 'Update answer' : 'Add answer'}</button>
      </form>
    </section>
  )
}
