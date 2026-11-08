import type { Grade, WordState } from '../types'

export const INTERVALS_DAYS = [0, 1, 2, 4, 7, 15, 30, 60] as const
export const MAX_LEVEL = 6
export const MASTERED_LEVEL = 5
export const REAGAIN_MS = 10 * 60 * 1000

export function emptyState(id: string): WordState {
  return {
    id, level: 0, nextReview: 0, wrongCount: 0, correctCount: 0, reviewCount: 0,
    lastGrade: null, lastReviewed: null, wrongAt: null, learnedAt: null,
    masteredAt: null, favorite: 0, note: '', mnemonicCustom: '', tags: [],
  }
}

const DAY = 24 * 3600 * 1000
const intervals = INTERVALS_DAYS

export function applyGrade(s: WordState, grade: Grade, now: number): WordState {
  const next: WordState = { ...s }
  next.lastGrade = grade
  next.lastReviewed = now
  next.reviewCount += 1
  if (next.learnedAt === null) next.learnedAt = now
  switch (grade) {
    case 'again':
      next.level = Math.max(0, next.level - 1)
      next.nextReview = now + REAGAIN_MS
      next.wrongCount += 1
      next.wrongAt = now
      break
    case 'hard':
      next.level = Math.max(0, next.level)
      next.nextReview = now + Math.max(DAY, intervals[Math.min(next.level + 1, intervals.length - 1)] * DAY)
      break
    case 'good': {
      const lv = Math.min(MAX_LEVEL, next.level + 1)
      next.level = lv
      next.nextReview = now + intervals[Math.min(lv, intervals.length - 1)] * DAY
      next.correctCount += 1
      break
    }
    case 'easy': {
      const lv = Math.min(MAX_LEVEL, next.level + 2)
      next.level = lv
      next.nextReview = now + intervals[Math.min(lv, intervals.length - 1)] * DAY * 1.5
      next.correctCount += 1
      break
    }
  }
  if (next.level >= MASTERED_LEVEL && next.masteredAt === null) next.masteredAt = now
  return next
}

/** 错题本抵消（融合 Flash applyTestResult）：测验答对递减 wrongCount，归零即移出错题本 */
export function offsetWrong(s: WordState): WordState {
  const next: WordState = { ...s }
  if (next.wrongCount > 0) {
    next.wrongCount -= 1
    if (next.wrongCount <= 0) {
      next.wrongCount = 0
      next.wrongAt = null
    }
  }
  return next
}

export function markWrong(s: WordState, now: number): WordState {
  const next = applyGrade(s, 'again', now)
  return next
}

export function isDue(s: WordState, now: number): boolean {
  return s.learnedAt !== null && s.nextReview <= now
}
export function isNew(s: WordState): boolean {
  return s.learnedAt === null
}
export function isMastered(s: WordState): boolean {
  return s.level >= MASTERED_LEVEL
}
export function inWrongBook(s: WordState): boolean {
  return s.wrongCount > 0 && s.wrongAt !== null
}
