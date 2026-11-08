import { describe, expect, it } from 'vitest'
import { reviewQuizPool, moduleDueCount } from '../lib/reviewQuiz'
import type { Word, WordState } from '../types'

function w(id: string, cat: string): Word {
  return { id, word: `word-${id}`, cn: `释义${id}`, cat, phonetic: '', pos: '', example: '', mnemonic: '' }
}
function state(due: boolean): WordState {
  return {
    id: 'x', level: 1, nextReview: due ? 1 : Number.MAX_SAFE_INTEGER,
    wrongCount: 0, correctCount: 0, reviewCount: 0, lastGrade: null,
    lastReviewed: null, wrongAt: null, learnedAt: 1, masteredAt: null,
    favorite: 0, note: '', mnemonicCustom: '', tags: [],
  }
}

const NOW = 1000000
const WORDS = [
  w('a1', '飞机系统'), w('a2', '飞机系统'), w('a3', '飞机系统'),
  w('b1', '旅客'), w('b2', '旅客'),
  w('c1', '气象'),
]
const STATES = new Map<string, WordState>([
  ['a1', state(true)], ['a2', state(false)], ['a3', state(true)],
  ['b1', state(true)], ['b2', state(false)],
  ['c1', state(false)],
])
const getState = (id: string) => STATES.get(id)!

describe('reviewQuizPool', () => {
  it('scope=due + cat=null 返回全部到期单词', () => {
    const pool = reviewQuizPool(WORDS, getState, { cat: null, scope: 'due', now: NOW })
    expect(pool.map((x) => x.id).sort()).toEqual(['a1', 'a3', 'b1'])
  })
  it('scope=all + cat=null 返回全部单词', () => {
    expect(reviewQuizPool(WORDS, getState, { cat: null, scope: 'all', now: NOW })).toHaveLength(6)
  })
  it('scope=due + 指定模块 只返回该模块到期词', () => {
    const pool = reviewQuizPool(WORDS, getState, { cat: '飞机系统', scope: 'due', now: NOW })
    expect(pool.map((x) => x.id).sort()).toEqual(['a1', 'a3'])
  })
  it('scope=all + 指定模块 返回该模块全部词', () => {
    const pool = reviewQuizPool(WORDS, getState, { cat: '旅客', scope: 'all', now: NOW })
    expect(pool.map((x) => x.id).sort()).toEqual(['b1', 'b2'])
  })
  it('无到期词的模块返回空数组', () => {
    expect(reviewQuizPool(WORDS, getState, { cat: '气象', scope: 'due', now: NOW })).toHaveLength(0)
  })
  it('模块统计数量正确', () => {
    expect(moduleDueCount(WORDS, getState, '飞机系统', NOW)).toBe(2)
    expect(moduleDueCount(WORDS, getState, '旅客', NOW)).toBe(1)
    expect(moduleDueCount(WORDS, getState, null, NOW)).toBe(3)
  })
})
