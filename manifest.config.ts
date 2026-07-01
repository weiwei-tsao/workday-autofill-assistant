import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Workday Autofill Assistant',
  version: pkg.version,
  description:
    'Save your job application profile locally and reuse it across Workday application forms.',
  permissions: ['storage', 'activeTab', 'scripting', 'sidePanel'],
  host_permissions: ['*://*.myworkdayjobs.com/*'],
  options_page: 'src/options/index.html',
  background: {
    service_worker: 'src/background/service-worker.ts',
    type: 'module',
  },
  side_panel: {
    default_path: 'src/sidepanel/index.html',
  },
  content_scripts: [
    {
      matches: ['*://*.myworkdayjobs.com/*'],
      js: ['src/content/index.ts'],
    },
  ],
})
