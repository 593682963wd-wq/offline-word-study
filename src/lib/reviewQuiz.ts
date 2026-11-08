import type { Word, WordState } from '../types'
import { isDue } from './srs'

export type ReviewScope = 'due' | 'all'

/** 按模块 + 范围生成复习选择题的词池（null cat = 全部模块） */
export function reviewQuizPool(
  words: Word[],
  getState: (id: string) => WordState,
  opts: { cat: string | null; scope: ReviewScope; now?: number },
): Word[] {
  const now = opts.now ?? Date.now()
  return words.filter(
    (w) =>
      (opts.cat === null || w.cat === opts.cat) &&
      (opts.scope === 'all' || isDue(getState(w.id), now)),
  )
}

/** 某模块（或全部）的到期单词数 */
export function moduleDueCount(
  words: Word[],
  getState: (id: string) => WordState,
  cat: string | null,
  now: number,
): number {
  return reviewQuizPool(words, getState, { cat, scope: 'due', now }).length
}
