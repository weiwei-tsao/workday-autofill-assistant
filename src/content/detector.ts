const WORKDAY_HOSTNAME_PATTERN = /\.myworkdayjobs\.com$/i

export function isWorkdayPage(hostname: string, doc: Document): boolean {
  if (WORKDAY_HOSTNAME_PATTERN.test(hostname)) return true
  return doc.querySelector('[data-automation-id]') !== null
}
