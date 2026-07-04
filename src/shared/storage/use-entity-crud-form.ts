import { useState } from 'react'
import { useStorageList } from './use-storage-list'

interface CrudRepository<T> {
  list: () => Promise<T[]>
  add: (item: T) => Promise<void>
  update: (id: string, patch: Partial<T>) => Promise<void>
  remove: (id: string) => Promise<void>
}

export function useEntityCrudForm<T extends { id: string }, TFormValues>(
  storageKey: string,
  repository: CrudRepository<T>,
  emptyValues: TFormValues,
  reset: (values: TFormValues) => void
) {
  const { items, reload } = useStorageList<T>(storageKey, repository)
  const [editingId, setEditingId] = useState<string | null>(null)

  async function submit(values: TFormValues) {
    if (editingId) {
      await repository.update(editingId, values as Partial<T>)
    } else {
      await repository.add({ id: crypto.randomUUID(), ...values } as unknown as T)
    }
    setEditingId(null)
    reset(emptyValues)
    await reload()
  }

  function startEdit(item: T) {
    setEditingId(item.id)
    reset(item as unknown as TFormValues)
  }

  function cancelEdit() {
    setEditingId(null)
    reset(emptyValues)
  }

  async function remove(id: string) {
    await repository.remove(id)
    await reload()
  }

  return { items, editingId, submit, startEdit, remove, cancelEdit }
}
