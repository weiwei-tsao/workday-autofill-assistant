import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { createListRepository } from './list-repository'
import { useStorageList } from './use-storage-list'

interface Widget {
  id: string
  name: string
}

beforeEach(() => {
  installChromeStorageMock()
})

describe('useStorageList', () => {
  it('loads existing items on mount and reflects storage changes', async () => {
    const repository = createListRepository<Widget>('widgets')
    await repository.add({ id: '1', name: 'First' })

    const { result } = renderHook(() => useStorageList<Widget>('widgets', repository))

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.items).toEqual([{ id: '1', name: 'First' }])

    await act(async () => {
      await repository.add({ id: '2', name: 'Second' })
    })

    await waitFor(() => expect(result.current.items).toHaveLength(2))
  })
})
