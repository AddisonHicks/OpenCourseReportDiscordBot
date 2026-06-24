export function formatPace(minutes: number | null): string {
  if (minutes == null || minutes <= 0) return '—'
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function timeOfDayEmoji(tod: string): string {
  switch (tod) {
    case 'morning':
      return '☀️'
    case 'midday':
      return '🌤'
    case 'afternoon':
      return '🌇'
    default:
      return ''
  }
}

export function timeOfDayLabel(tod: string): string {
  switch (tod) {
    case 'morning':
      return 'AM'
    case 'midday':
      return 'Mid-Day'
    case 'afternoon':
      return 'PM'
    default:
      return tod
  }
}

export function formatDate(dateStr: string): string {
  const d = new Date(dateStr + 'T12:00:00')
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatPrice(price: number | null): string {
  if (price == null) return '—'
  return `$${Math.round(price)}`
}

export function formatGreenFee(
  price: number | null,
  holesPlayed: number | null,
): string {
  if (price == null) return '—'
  if (holesPlayed === 9 || holesPlayed === 18) {
    return `${formatPrice(price)} (${holesPlayed} holes)`
  }
  return formatPrice(price)
}

export function formatHolesPlayed(holes: number | null): string {
  if (holes === 9 || holes === 18) return String(holes)
  return '—'
}

export function submitterName(first: string, lastInitial: string): string {
  return `${first} ${lastInitial.toUpperCase()}.`
}

export function transportLabel(mode: string | null): string | null {
  if (mode === 'walking') return '🚶 Walking'
  if (mode === 'cart') return '🛺 Cart'
  return null
}

export function truncateField(value: string, max = 1024): string {
  const t = value.trim()
  if (t.length <= max) return t
  return `${t.slice(0, max - 1)}…`
}
