export interface ScannedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  labelText: string
  ariaLabel: string
  placeholder: string
  name: string
  id: string
  sectionHeadingText: string
}

const FIELD_SELECTOR =
  'input[type="text"], input[type="email"], input[type="tel"], input[type="number"], input:not([type]), ' +
  'textarea, select, input[type="checkbox"], input[type="radio"]'

const HEADING_SELECTOR = 'h1, h2, h3, h4, h5, h6, [role="heading"]'

function findLegendText(element: Element): string {
  const fieldset = element.closest('fieldset')
  const legend = fieldset?.querySelector('legend')
  return legend?.textContent?.trim() ?? ''
}

function findLabelText(element: Element, doc: Document): string {
  const id = element.getAttribute('id')
  if (id) {
    const label = doc.querySelector(`label[for="${id}"]`)
    if (label?.textContent) return label.textContent.trim()
  }
  const parentLabel = element.closest('label')
  if (parentLabel?.textContent) return parentLabel.textContent.trim()
  const legendText = findLegendText(element)
  if (legendText) return legendText
  return ''
}

function findSectionHeadingText(element: Element): string {
  let current: Element | null = element

  while (current) {
    let sibling: Element | null = current.previousElementSibling
    while (sibling) {
      if (sibling.matches(HEADING_SELECTOR)) {
        return sibling.textContent?.trim() ?? ''
      }
      const nestedHeading = sibling.querySelector(HEADING_SELECTOR)
      if (nestedHeading?.textContent) {
        return nestedHeading.textContent.trim()
      }
      sibling = sibling.previousElementSibling
    }
    current = current.parentElement
  }

  return ''
}

export function scanFields(doc: Document = document): ScannedField[] {
  const elements = Array.from(
    doc.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(
      FIELD_SELECTOR
    )
  )

  return elements.map((element) => ({
    element,
    labelText: findLabelText(element, doc),
    ariaLabel: element.getAttribute('aria-label') ?? '',
    placeholder: element.getAttribute('placeholder') ?? '',
    name: element.getAttribute('name') ?? '',
    id: element.getAttribute('id') ?? '',
    sectionHeadingText: findSectionHeadingText(element),
  }))
}
