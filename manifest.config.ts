import { defineManifest } from '@crxjs/vite-plugin'
import pkg from './package.json'

export default defineManifest({
  manifest_version: 3,
  name: 'Workday Autofill Assistant',
  version: pkg.version,
  description:
    'Save your job application profile locally and reuse it across Workday application forms.',
  permissions: ['storage'],
  options_page: 'src/options/index.html',
})
