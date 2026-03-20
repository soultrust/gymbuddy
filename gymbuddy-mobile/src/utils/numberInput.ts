/**
 * Sanitize a text input to allow only valid decimal numbers
 * with up to `maxDecimals` digits after the decimal point.
 */
export const setDecimalInput = (
  setter: (v: string) => void,
  text: string,
  maxDecimals = 2,
) => {
  const cleaned = text.replace(/[^0-9.]/g, '')
  const [whole = '', ...rest] = cleaned.split('.')
  if (rest.length === 0) {
    setter(whole)
    return
  }
  const fractional = rest.join('').slice(0, maxDecimals)
  const normalizedWhole = whole.length > 0 ? whole : '0'
  setter(`${normalizedWhole}.${fractional}`)
}

export const parseReps = (value: string): number | null => {
  const n = parseFloat(value)
  if (Number.isNaN(n) || n < 0) return null
  return n
}

/**
 * Step reps value up or down. If the current value is a decimal,
 * stepping snaps to the nearest whole number in the given direction.
 * E.g. 7.5 prev -> 7, 7.5 next -> 8.
 */
export const stepRepsValue = (
  value: string,
  direction: 'prev' | 'next',
): number => {
  const n = parseFloat(value)
  if (Number.isNaN(n) || n < 0) return direction === 'prev' ? 0 : 1
  if (Number.isInteger(n)) {
    return direction === 'prev' ? Math.max(0, n - 1) : n + 1
  }
  return direction === 'prev' ? Math.floor(n) : Math.ceil(n)
}
