/** Strip trailing decimal zeros: "4.00" -> "4", "4.50" -> "4.5" */
export const formatNumber = (v: string | number | undefined): string => {
  if (v == null || v === '') return ''
  const n = parseFloat(String(v))
  return Number.isNaN(n) ? '' : String(n)
}

/** Same as formatNumber but returns "" for zero values (useful for weight display). */
export const formatWeight = (w: string | number | undefined): string => {
  const s = formatNumber(w)
  return s === '0' ? '' : s
}

/** Format as M/DD (e.g. 3/17) -- no year, no leading zero on month. */
export const formatMonthDay = (d: string): string => {
  const date = new Date(d)
  const mm = String(date.getMonth() + 1)
  const dd = String(date.getDate()).padStart(2, '0')
  return `${mm}/${dd}`
}

/** Format as MM/DD (e.g. 03/17) -- no year. */
export const formatMonthDayPadded = (d: string): string => {
  const date = new Date(d)
  const mm = String(date.getMonth() + 1).padStart(2, '0')
  const dd = String(date.getDate()).padStart(2, '0')
  return `${mm}/${dd}`
}

/** Format as "FRI July 24, 2026" */
export const formatFullDate = (d: string): string => {
  const date = new Date(d)
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return `${weekdays[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

/** Same format for a Date object (used for today's date suggestions) */
export const formatFullDateFromDate = (date: Date): string => {
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ]
  return `${weekdays[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

/** Local calendar day key for grouping sessions (YYYY-M-D). */
export const calendarDayKey = (d: string | Date): string => {
  const date = typeof d === 'string' ? new Date(d) : d
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`
}

/** e.g. "7:14 AM" */
export const formatSessionTime = (d: string | Date): string => {
  const date = typeof d === 'string' ? new Date(d) : d
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

/**
 * Session display title from date.
 * When includeTime is true (multiple sessions that calendar day):
 * "FRI July 24, 2026 · 7:14 AM"
 */
export const formatSessionTitle = (d: string, includeTime = false): string => {
  const base = formatFullDate(d)
  return includeTime ? `${base} · ${formatSessionTime(d)}` : base
}

/**
 * Compact list-column title: "7/24" or "7/24 · 7:14 AM" when same-day siblings exist.
 */
export const formatSessionListTitle = (d: string, includeTime = false): string => {
  const base = formatMonthDay(d)
  return includeTime ? `${base} · ${formatSessionTime(d)}` : base
}

/** Day keys that have more than one session. */
export const daysWithMultipleSessions = (dates: Array<string | Date>): Set<string> => {
  const counts = new Map<string, number>()
  for (const d of dates) {
    const key = calendarDayKey(d)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  const multi = new Set<string>()
  for (const [key, n] of counts) {
    if (n > 1) multi.add(key)
  }
  return multi
}

/** Format as "Sat, Feb 14, 2026" for session dropdown. */
export const formatSessionDate = (d: string): string =>
  new Date(d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
