import { describe, expect, it } from 'vitest'
import { emptyState, applyGrade, isDue, isNew, isMastered, inWrongBook, offsetWrong, REAGAIN_MS, MASTERED_LEVEL } from '../lib/srs'
import type { WordState } from '../types'

const NOW = 1_800_000_000_000
const DAY = 24 * 3600 * 1000

function fresh(): WordState { return emptyState('w1') }

describe('emptyState', () => {
  it('creates a clean state', () => {
    const s = emptyState('abc')
    expect(s.id).toBe('abc')
    expect(s.level).toBe(0)
    expect(s.learnedAt).toBeNull()
    expect(s.wrongCount).toBe(0)
    expect(s.favorite).toBe(0)
  })
})

describe('applyGrade', () => {
  it('again marks wrong and re-queues in 10 minutes', () => {
    const s = applyGrade(fresh(), 'again', NOW)
    expect(s.wrongCount).toBe(1)
    expect(s.nextReview).toBe(NOW + REAGAIN_MS)
    expect(s.wrongAt).toBe(NOW)
    expect(s.learnedAt).toBe(NOW)
  })

  it('good advances level by 1 with interval days', () => {
    const s = applyGrade(fresh(), 'good', NOW)
    expect(s.level).toBe(1)
    expect(s.nextReview).toBe(NOW + DAY)
    expect(s.correctCount).toBe(1)
  })

  it('easy advances level by 2 with 1.5x interval', () => {
    const s = applyGrade(fresh(), 'easy', NOW)
    expect(s.level).toBe(2)
    expect(s.nextReview).toBe(NOW + 2 * DAY * 1.5)
  })

  it('hard keeps level and schedules next day at minimum', () => {
    const s = applyGrade(fresh(), 'hard', NOW)
    expect(s.level).toBe(0)
    expect(s.nextReview).toBe(NOW + DAY)
  })

  it('caps level at MAX_LEVEL and marks mastered', () => {
    let s = fresh()
    for (let i = 0; i < 10; i++) s = applyGrade(s, 'good', NOW + i * DAY)
    expect(s.level).toBe(6)
    expect(s.masteredAt).not.toBeNull()
    expect(isMastered(s)).toBe(true)
  })

  it('mastered requires level threshold', () => {
    let s = fresh()
    for (let i = 0; i < MASTERED_LEVEL - 1; i++) s = applyGrade(s, 'good', NOW + i * DAY)
    expect(isMastered(s)).toBe(false)
    s = applyGrade(s, 'good', NOW + 99 * DAY)
    expect(isMastered(s)).toBe(true)
  })
})

describe('state predicates', () => {
  it('isNew only before first learn', () => {
    expect(isNew(fresh())).toBe(true)
    expect(isNew(applyGrade(fresh(), 'good', NOW))).toBe(false)
  })

  it('isDue respects nextReview', () => {
    const s = applyGrade(fresh(), 'good', NOW)
    expect(isDue(s, NOW - 1)).toBe(false)
    expect(isDue(s, NOW + DAY)).toBe(true)
  })

  it('inWrongBook requires wrongCount and wrongAt', () => {
    const s = applyGrade(fresh(), 'again', NOW)
    expect(inWrongBook(s)).toBe(true)
    const s2 = applyGrade(fresh(), 'good', NOW)
    expect(inWrongBook(s2)).toBe(false)
  })
})

describe('offsetWrong 错题本抵消', () => {
  it('decrements wrongCount on correct answer', () => {
    let s = applyGrade(fresh(), 'again', NOW)
    s = applyGrade(s, 'again', NOW + 1000)
    expect(s.wrongCount).toBe(2)
    const o1 = offsetWrong(s)
    expect(o1.wrongCount).toBe(1)
    expect(o1.wrongAt).not.toBeNull()
    expect(inWrongBook(o1)).toBe(true)
  })
  it('removes from wrong book when count reaches zero', () => {
    const s = applyGrade(fresh(), 'again', NOW)
    expect(s.wrongCount).toBe(1)
    const o = offsetWrong(s)
    expect(o.wrongCount).toBe(0)
    expect(o.wrongAt).toBeNull()
    expect(inWrongBook(o)).toBe(false)
  })
  it('does nothing when not in wrong book', () => {
    const s = applyGrade(fresh(), 'good', NOW)
    const o = offsetWrong(s)
    expect(o.wrongCount).toBe(0)
    expect(o.correctCount).toBe(s.correctCount)
  })
  it('does not touch SRS level', () => {
    let s = applyGrade(fresh(), 'good', NOW)
    s = offsetWrong(s)
    expect(s.level).toBe(1)
  })
})
