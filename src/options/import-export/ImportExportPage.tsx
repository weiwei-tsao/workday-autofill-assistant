import { useState, type ChangeEvent } from 'react'
import { buildExportBundle, restoreFromBundle } from '../../shared/storage/export-import'
import type { ExportBundle } from '../../shared/types/export-bundle'
import { exportBundleSchema } from '../../shared/types/export-bundle-schema'

type ImportStatus = 'idle' | 'success' | 'error'

export function ImportExportPage() {
  const [importStatus, setImportStatus] = useState<ImportStatus>('idle')
  const [importError, setImportError] = useState('')

  async function handleExport() {
    const bundle = await buildExportBundle()
    const json = JSON.stringify(bundle, null, 2)
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `workday-autofill-backup-${bundle.exportedAt.slice(0, 10)}.json`
    link.click()
    URL.revokeObjectURL(url)
  }

  async function handleImportFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (!file) return

    try {
      const text = await file.text()
      const parsed: unknown = JSON.parse(text)
      const result = exportBundleSchema.safeParse(parsed)
      if (!result.success) {
        setImportStatus('error')
        setImportError('This file is not a valid backup.')
        return
      }
      await restoreFromBundle(result.data as unknown as ExportBundle)
      setImportStatus('success')
      setImportError('')
    } catch {
      setImportStatus('error')
      setImportError('This file is not a valid backup.')
    } finally {
      event.target.value = ''
    }
  }

  return (
    <section>
      <h2>Import / Export</h2>
      <div>
        <button type="button" onClick={handleExport}>
          Export data
        </button>
      </div>
      <div>
        <label htmlFor="importFile">Import data</label>
        <input
          id="importFile"
          type="file"
          accept=".json,application/json"
          onChange={handleImportFile}
        />
      </div>
      {importStatus === 'success' && <p>Import successful. Your data has been restored.</p>}
      {importStatus === 'error' && <p role="alert">{importError}</p>}
    </section>
  )
}
