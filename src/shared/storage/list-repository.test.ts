import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { createListRepository } from './list-repository'

interface Widget {
  id: string
  name: string
}

beforeEach(() => {
  installChromeStorageMock()
})

describe('createListRepository', () => {
  it('starts empty', async () => {
    const repository = createListRepository<Widget>('widgets')
    expect(await repository.list()).toEqual([])
  })

  it('adds, updates, and removes items', async () => {
    const repository = createListRepository<Widget>('widgets')

    await repository.add({ id: '1', name: 'First' })
    await repository.add({ id: '2', name: 'Second' })
    expect(await repository.list()).toEqual([
      { id: '1', name: 'First' },
      { id: '2', name: 'Second' },
    ])

    await repository.update('1', { name: 'First updated' })
    expect(await repository.list()).toEqual([
      { id: '1', name: 'First updated' },
      { id: '2', name: 'Second' },
    ])

    await repository.remove('2')
    expect(await repository.list()).toEqual([{ id: '1', name: 'First updated' }])
  })
})
