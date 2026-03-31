export const ASSAI_BASE = 'https://eu.assaicloud.com/AWeu578';
export const ASSAI_PROJECT = 'BGC_PROJ';

export function assaiDetailsUrl(documentNumber: string): string {
  return `${ASSAI_BASE}/get/details/${ASSAI_PROJECT}/DOCS/${documentNumber}`;
}

export function assaiDownloadUrl(documentNumber: string, project: string = ASSAI_PROJECT): string {
  return `${ASSAI_BASE}/get/download/${project}/DOCS/${documentNumber}`;
}

// Regex to detect Assai document numbers in free text
export const ASSAI_DOC_NUMBER_REGEX = /\b(\d{4}-[A-Z]{2,6}-[A-Z0-9]+-[A-Z]+-[A-Z0-9]+-[A-Z]{2}-[A-Z]\d{2}-\d{5}-\d{3})\b/g;
