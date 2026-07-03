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
    <section className="bg-raised border border-[#E3DFD8] rounded-panel p-6 flex flex-col gap-4 max-w-xl">
      <div className="flex flex-col gap-1">
        <h2 className="m-0 text-[20px] font-semibold tracking-[-0.02em]">Import / Export</h2>
        <span className="text-[13px] text-muted">Your data lives in this browser. Take it with you.</span>
      </div>

      <div className="bg-surface border border-line rounded-card p-4 flex items-center justify-between gap-3">
        <span className="text-[13px] font-semibold">Export your data</span>
        <button
          type="button"
          onClick={handleExport}
          className="font-sans text-[13px] font-semibold bg-ink text-white rounded-input px-4 py-2.5 hover:bg-[#2E2B26] transition-colors duration-150 flex-shrink-0"
        >
          Export data
        </button>
      </div>

      <div className="border border-dashed border-[#C9C3BA] bg-surface rounded-card p-5 flex flex-col items-center gap-1.5 text-center">
        <label htmlFor="importFile" className="text-[13px] font-semibold">
          Import data
        </label>
        <span className="text-[12px] text-muted">
          Select a bundle file — you&apos;ll confirm before anything is replaced
        </span>
        <input
          id="importFile"
          type="file"
          accept=".json,application/json"
          onChange={handleImportFile}
          className="text-[12px] mt-2"
        />
      </div>

      {importStatus === 'success' && (
        <p className="text-[13px] text-success">Import successful. Your data has been restored.</p>
      )}
      {importStatus === 'error' && (
        <p role="alert" className="text-[13px] text-danger">
          {importError}
        </p>
      )}
    </section>
  )
}
