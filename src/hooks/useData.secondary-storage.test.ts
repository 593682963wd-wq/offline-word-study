// 作者：Wangyuan；日期：2026-11-08。职责：已提交学习与辅助奖励异常的边界。
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { db } from '../db/db'
import { useData, WORDS } from './useData'
import { emptyState } from '../lib/srs'
import { useApp } from '../store/app'
import { useToast } from '../store/toast'

beforeEach(async () => {
  await db.words.clear(); await db.stats.clear()
  await useData.getState().load()
  useApp.getState().resetGamify()
  useToast.setState({ toasts: [] })
})
afterEach(() => vi.restoreAllMocks())
it.each(['grade', 'quiz'] as const)('returns committed success when %s reward persistence fails', async (action) => {
  const id = WORDS[0]!.id
  const spy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('synthetic quota failure', 'QuotaExceededError')
  })
  const result = action === 'grade'
    ? await useData.getState().gradeWord(id, 'good')
    : await useData.getState().quizRecord([{ id, correct: true }])
  expect(result).toBe(true)
  expect((await db.words.get(id))!.reviewCount).toBe(1)
  expect(useData.getState().getState(id).reviewCount).toBe(1)
  const stats = await db.stats.toArray()
  expect(stats).toHaveLength(1)
  expect(stats[0]!.correct).toBe(1)
  expect(useToast.getState().toasts.some(t => t.text.includes('学习进度已保存，奖励设置未能保存'))).toBe(true)
  // The caller can proceed; no retry of the already committed learning record is needed.
  spy.mockRestore()
})

it('clears an existing wrong entry once even when the badge cannot persist', async () => {
  const id = WORDS[0]!.id
  await db.words.put({ ...emptyState(id), wrongCount: 1, wrongAt: Date.now() })
  await useData.getState().load()
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new DOMException('synthetic quota failure', 'QuotaExceededError')
  })
  expect(await useData.getState().clearWrong(id)).toBe(true)
  expect((await db.words.get(id))!.wrongCount).toBe(0)
  expect(useToast.getState().toasts.some(t => t.text.includes('学习进度已保存'))).toBe(true)
})
