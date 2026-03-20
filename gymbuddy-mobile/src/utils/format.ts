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

/** Format as "FRI Feb 13, 2006" */
export const formatFullDate = (d: string): string => {
  const date = new Date(d)
  const weekdays = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT']
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${weekdays[date.getDay()]} ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`
}

/** Format as "Sat, Feb 14, 2026" for session dropdown. */
export const formatSessionDate = (d: string): string =>
  new Date(d).toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
