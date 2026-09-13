export function formatDate(date: string | Date, locale = 'pt-BR'): string {
  return new Date(date).toLocaleDateString(locale)
}

export function formatDateTime(date: string | Date, locale = 'pt-BR'): string {
  return new Date(date).toLocaleString(locale)
}
