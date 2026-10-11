export function getBoxDate(date: string) {
  return new Date(`${date}T12:00:00`)
}

export function formatMonth(date: Date, locale: 'zh-CN' | 'en') {
  return new Intl.DateTimeFormat(locale, {
    month: locale === 'en' ? 'long' : 'long',
    year: 'numeric',
  }).format(date)
}

export function getCalendarCells(date: Date) {
  const year = date.getFullYear()
  const month = date.getMonth()
  const firstDay = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay + 1
    return day > 0 && day <= days ? day : null
  })
}

export function contrastColor(hex: string) {
  const rgb = hex.replace('#', '')
  const r = Number.parseInt(rgb.slice(0, 2), 16)
  const g = Number.parseInt(rgb.slice(2, 4), 16)
  const b = Number.parseInt(rgb.slice(4, 6), 16)
  return r * 0.299 + g * 0.587 + b * 0.114 > 168 ? '#17211f' : '#ffffff'
}
