import { describe, expect, it } from 'vitest'
import { formatNumber, formatWeight, formatMonthDay, formatMonthDayPadded } from './format'

describe('formatNumber', () => {
  it("strips trailing zeros: '4.00' -> '4'", () => {
    expect(formatNumber('4.00')).toBe('4')
  })

  it("keeps meaningful decimals: '4.50' -> '4.5'", () => {
    expect(formatNumber('4.50')).toBe('4.5')
  })

  it("preserves multi-digit decimals: '7.25' -> '7.25'", () => {
    expect(formatNumber('7.25')).toBe('7.25')
  })

  it('handles integer numbers', () => {
    expect(formatNumber(10)).toBe('10')
  })

  it('handles zero', () => {
    expect(formatNumber(0)).toBe('0')
    expect(formatNumber('0')).toBe('0')
    expect(formatNumber('0.00')).toBe('0')
  })

  it('returns empty string for undefined', () => {
    expect(formatNumber(undefined)).toBe('')
  })

  it('returns empty string for empty string', () => {
    expect(formatNumber('')).toBe('')
  })

  it('returns empty string for non-numeric string', () => {
    expect(formatNumber('abc')).toBe('')
  })
})

describe('formatWeight', () => {
  it('strips trailing zeros like formatNumber', () => {
    expect(formatWeight('135.00')).toBe('135')
  })

  it('keeps meaningful decimals', () => {
    expect(formatWeight('2.5')).toBe('2.5')
  })

  it('returns empty string for zero', () => {
    expect(formatWeight(0)).toBe('')
    expect(formatWeight('0')).toBe('')
    expect(formatWeight('0.00')).toBe('')
  })

  it('returns empty string for undefined', () => {
    expect(formatWeight(undefined)).toBe('')
  })
})

describe('formatMonthDay', () => {
  it('formats as M/DD (no leading zero on month)', () => {
    expect(formatMonthDay('2026-03-07T12:00:00')).toBe('3/07')
  })

  it('single digit month stays single digit', () => {
    expect(formatMonthDay('2026-01-05T12:00:00')).toBe('1/05')
  })

  it('double digit month stays as-is', () => {
    expect(formatMonthDay('2025-12-25T12:00:00')).toBe('12/25')
  })
})

describe('formatMonthDayPadded', () => {
  it('formats as MM/DD with zero-padded month', () => {
    expect(formatMonthDayPadded('2026-03-07T12:00:00')).toBe('03/07')
  })

  it('double digit month stays as-is', () => {
    expect(formatMonthDayPadded('2025-11-01T12:00:00')).toBe('11/01')
  })
})
