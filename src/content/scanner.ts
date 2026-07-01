export interface ScannedField {
  element: HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  labelText: string
  ariaLabel: string
  placeholder: string
  name: string
  id: string
}

const FIELD_SELECTOR =
  'input[type="text"], input[type="email"], input[type="tel"], input:not([type]), ' +
  'textarea, select, input[type="checkbox"], input[type="radio"]'

function findLabelText(element: Element, doc: Document): string {
  const id = element.getAttribute('id')
  if (id) {
    const label = doc.querySelector(`label[for="${id}"]`)
    if (label?.textContent) return label.textContent.trim()
  }
  const parentLabel = element.closest('label')
  if (parentLabel?.textContent) return parentLabel.textContent.trim()
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
  }))
}
