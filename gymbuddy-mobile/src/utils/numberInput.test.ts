import { describe, expect, it, vi } from 'vitest'
import { setDecimalInput, parseReps, stepRepsValue } from './numberInput'

describe('setDecimalInput', () => {
  it('passes through whole numbers', () => {
    const setter = vi.fn()
    setDecimalInput(setter, '123')
    expect(setter).toHaveBeenCalledWith('123')
  })

  it('allows one decimal point', () => {
    const setter = vi.fn()
    setDecimalInput(setter, '12.5')
    expect(setter).toHaveBeenCalledWith('12.5')
  })

  it('limits to maxDecimals digits after decimal', () => {
    const setter = vi.fn()
    setDecimalInput(setter, '12.567')
    expect(setter).toHaveBeenCalledWith('12.56')
  })

  it('collapses multiple decimal points', () => {
    const setter = vi.fn()
    setDecimalInput(setter, '12.3.4')
    expect(setter).toHaveBeenCalledWith('12.34')
  })

  it('strips non-numeric characters', () => {
    const setter = vi.fn()
    setDecimalInput(setter, 'abc12x3')
    expect(setter).toHaveBeenCalledWith('123')
  })

  it('prepends 0 when input starts with decimal', () => {
    const setter = vi.fn()
    setDecimalInput(setter, '.5')
    expect(setter).toHaveBeenCalledWith('0.5')
  })

  it('respects custom maxDecimals', () => {
    const setter = vi.fn()
    setDecimalInput(setter, '12.345', 1)
    expect(setter).toHaveBeenCalledWith('12.3')
  })
})

describe('parseReps', () => {
  it('parses integer string', () => {
    expect(parseReps('10')).toBe(10)
  })

  it('parses decimal string', () => {
    expect(parseReps('7.5')).toBe(7.5)
  })

  it('returns null for empty string', () => {
    expect(parseReps('')).toBe(null)
  })

  it('returns null for non-numeric string', () => {
    expect(parseReps('abc')).toBe(null)
  })

  it('returns null for negative numbers', () => {
    expect(parseReps('-1')).toBe(null)
  })

  it('returns 0 for zero', () => {
    expect(parseReps('0')).toBe(0)
  })
})

describe('stepRepsValue', () => {
  it('increments integer by 1', () => {
    expect(stepRepsValue('5', 'next')).toBe(6)
  })

  it('decrements integer by 1', () => {
    expect(stepRepsValue('5', 'prev')).toBe(4)
  })

  it('does not go below 0', () => {
    expect(stepRepsValue('0', 'prev')).toBe(0)
  })

  it('snaps decimal up to ceiling on next', () => {
    expect(stepRepsValue('7.5', 'next')).toBe(8)
    expect(stepRepsValue('7.1', 'next')).toBe(8)
    expect(stepRepsValue('7.9', 'next')).toBe(8)
  })

  it('snaps decimal down to floor on prev', () => {
    expect(stepRepsValue('7.5', 'prev')).toBe(7)
    expect(stepRepsValue('7.1', 'prev')).toBe(7)
    expect(stepRepsValue('7.9', 'prev')).toBe(7)
  })

  it('returns 1 for invalid input on next', () => {
    expect(stepRepsValue('', 'next')).toBe(1)
    expect(stepRepsValue('abc', 'next')).toBe(1)
  })

  it('returns 0 for invalid input on prev', () => {
    expect(stepRepsValue('', 'prev')).toBe(0)
    expect(stepRepsValue('abc', 'prev')).toBe(0)
  })
})
