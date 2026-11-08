import { describe, expect, it } from 'vitest'
import { addDays, clamp, cnNum, fmtDuration, todayStr } from '../lib/utils'

describe('todayStr', () => {
  it('formats YYYY-MM-DD', () => {
    expect(todayStr(new Date(2026, 7, 3))).toBe('2026-08-03')
    expect(todayStr(new Date(2026, 0, 9))).toBe('2026-01-09')
  })
})

describe('addDays', () => {
  it('adds days across month boundaries', () => {
    const d = addDays(new Date(2026, 0, 31), 1)
    expect(d.getMonth()).toBe(1)
    expect(d.getDate()).toBe(1)
  })
})

describe('fmtDuration', () => {
  it('formats seconds/minutes/hours', () => {
    expect(fmtDuration(30_000)).toBe('30秒')
    expect(fmtDuration(120_000)).toBe('2分钟')
    expect(fmtDuration(3_600_000)).toBe('1小时')
    expect(fmtDuration(3_900_000)).toBe('1小时5分')
  })
})

describe('clamp', () => {
  it('clamps to range', () => {
    expect(clamp(5, 1, 10)).toBe(5)
    expect(clamp(-3, 1, 10)).toBe(1)
    expect(clamp(99, 1, 10)).toBe(10)
  })
})

describe('cnNum', () => {
  it('maps small numbers to Chinese', () => {
    expect(cnNum(0)).toBe('零')
    expect(cnNum(3)).toBe('三')
    expect(cnNum(9)).toBe('九')
    expect(cnNum(12)).toBe('12')
  })
})
