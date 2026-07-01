import { getLocal, setLocal } from './local-store'

export interface Identifiable {
  id: string
}

export function createListRepository<T extends Identifiable>(storageKey: string) {
  async function list(): Promise<T[]> {
    const items = await getLocal<T[]>(storageKey)
    return items ?? []
  }

  async function add(item: T): Promise<void> {
    const items = await list()
    await setLocal(storageKey, [...items, item])
  }

  async function update(id: string, patch: Partial<T>): Promise<void> {
    const items = await list()
    const next = items.map((item) => (item.id === id ? { ...item, ...patch } : item))
    await setLocal(storageKey, next)
  }

  async function remove(id: string): Promise<void> {
    const items = await list()
    await setLocal(
      storageKey,
      items.filter((item) => item.id !== id)
    )
  }

  return { list, add, update, remove }
}
