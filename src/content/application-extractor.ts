export interface ExtractedApplicationInfo {
  companyName: string
  jobTitle: string
  jobLocation: string
  jobUrl: string
  applicationDate: string
}

function extractCompanyName(hostname: string): string {
  const subdomain = hostname.split('.')[0]
  if (!subdomain) return ''
  return subdomain.charAt(0).toUpperCase() + subdomain.slice(1)
}

function extractJobTitle(doc: Document): string {
  const jobTitleHeading = doc.querySelector('[data-automation-id="jobTitleHeading"]')
  if (jobTitleHeading?.textContent?.trim()) return jobTitleHeading.textContent.trim()
  const heading = doc.querySelector('h1')
  if (heading?.textContent?.trim()) return heading.textContent.trim()
  return doc.title.trim()
}

function extractJobLocation(doc: Document): string {
  const candidate = doc.querySelector('[data-automation-id*="location" i]')
  return candidate?.textContent?.trim() ?? ''
}

function todayIsoDate(): string {
  return new Date().toISOString().split('T')[0]
}

export function extractApplicationInfo(
  doc: Document = document,
  href: string = location.href,
  hostname: string = location.hostname
): ExtractedApplicationInfo {
  return {
    companyName: extractCompanyName(hostname),
    jobTitle: extractJobTitle(doc),
    jobLocation: extractJobLocation(doc),
    jobUrl: href,
    applicationDate: todayIsoDate(),
  }
}
