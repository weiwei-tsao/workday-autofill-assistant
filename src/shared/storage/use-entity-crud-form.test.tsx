import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installChromeStorageMock } from '../../../tests/chrome-storage-mock'
import { createListRepository } from './list-repository'
import { useEntityCrudForm } from './use-entity-crud-form'

interface Widget {
  id: string
  name: string
}

interface WidgetFormValues {
  name: string
}

beforeEach(() => {
  installChromeStorageMock()
})

describe('useEntityCrudForm', () => {
  it('adds a new item on submit when not editing', async () => {
    const repository = createListRepository<Widget>('widgets')
    const reset = vi.fn()
    const { result } = renderHook(() =>
      useEntityCrudForm<Widget, WidgetFormValues>('widgets', repository, { name: '' }, reset)
    )

    await waitFor(() => expect(result.current.items).toEqual([]))

    await act(async () => {
      await result.current.submit({ name: 'First' })
    })

    await waitFor(() => expect(result.current.items).toHaveLength(1))
    expect(result.current.items[0]).toMatchObject({ name: 'First' })
    expect(reset).toHaveBeenCalledWith({ name: '' })
  })

  it('updates the item being edited, then clears editing state', async () => {
    const repository = createListRepository<Widget>('widgets')
    await repository.add({ id: '1', name: 'First' })
    const reset = vi.fn()
    const { result } = renderHook(() =>
      useEntityCrudForm<Widget, WidgetFormValues>('widgets', repository, { name: '' }, reset)
    )

    await waitFor(() => expect(result.current.items).toHaveLength(1))

    act(() => {
      result.current.startEdit(result.current.items[0])
    })
    expect(reset).toHaveBeenCalledWith({ id: '1', name: 'First' })
    expect(result.current.editingId).toBe('1')

    await act(async () => {
      await result.current.submit({ name: 'First updated' })
    })

    await waitFor(() =>
      expect(result.current.items).toEqual([{ id: '1', name: 'First updated' }])
    )
    expect(result.current.editingId).toBeNull()
  })

  it('removes an item', async () => {
    const repository = createListRepository<Widget>('widgets')
    await repository.add({ id: '1', name: 'First' })
    const reset = vi.fn()
    const { result } = renderHook(() =>
      useEntityCrudForm<Widget, WidgetFormValues>('widgets', repository, { name: '' }, reset)
    )

    await waitFor(() => expect(result.current.items).toHaveLength(1))

    await act(async () => {
      await result.current.remove('1')
    })

    await waitFor(() => expect(result.current.items).toEqual([]))
  })
})
