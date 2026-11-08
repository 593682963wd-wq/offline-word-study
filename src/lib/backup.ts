// Wangyuan · 2026-10-29：在写入 IndexedDB 前完整验证备份，避免部分导入破坏学习状态。
import type { WordState, DayStat } from '../types'
import words from '../data/words.json'
const ids = new Set(words.map((w) => w.id))
const fail = (): never => { throw new Error('备份格式无效：请使用本应用导出的完整 JSON 文件') }
const record = (v: unknown): v is Record<string, unknown> => v !== null && typeof v === 'object' && !Array.isArray(v)
const integer = (v: unknown, max = 1e9): boolean => typeof v === 'number' && Number.isSafeInteger(v) && v >= 0 && v <= max
const text = (v: unknown): boolean => typeof v === 'string'
/** 校验版本、边界、重复键和日期；验证完成前不写任何持久状态。 */
export function parseBackup(json: string): { words: WordState[]; stats: DayStat[] } {
  // 与编辑、持久化一致：不设额外文本/文件长度上限，兼容已导出的长内容。
  const data: unknown = JSON.parse(json)
  if (!record(data) || data.app !== 'local-word-study' || data.version !== 1 || !Array.isArray(data.words) || !Array.isArray(data.stats)) fail()
  const input = data as { words: unknown[]; stats: unknown[] }
  if (input.words.length > ids.size || input.stats.length > 10000) fail()
  const seenWords = new Set<string>(); const seenDates = new Set<string>()
  for (const item of input.words) {
    if (!record(item)) fail()
    const w = item as Record<string, unknown>
    if (typeof w.id !== 'string' || !ids.has(w.id) || seenWords.has(w.id)) fail()
    seenWords.add(w.id as string)
    if (!integer(w.level, 6) || !integer(w.favorite, 1)) fail()
    for (const key of ['wrongCount', 'correctCount', 'reviewCount']) if (!integer(w[key])) fail()
    if (!integer(w.nextReview, 8640000000000000)) fail()
    for (const key of ['lastReviewed', 'wrongAt', 'learnedAt', 'masteredAt']) if (w[key] !== null && !integer(w[key], 8640000000000000)) fail()
    if (w.lastGrade !== null && !['again', 'hard', 'good', 'easy'].includes(w.lastGrade as string)) fail()
    if (!text(w.note) || !text(w.mnemonicCustom) || !Array.isArray(w.tags) || !w.tags.every((t) => text(t))) fail()
  }
  for (const item of input.stats) {
    if (!record(item)) fail()
    const s = item as Record<string, unknown>
    if (typeof s.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s.date) || seenDates.has(s.date)) fail()
    const date = s.date as string
    const parsed = new Date(`${date}T00:00:00Z`)
    if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) fail()
    seenDates.add(date)
    for (const key of ['learned', 'reviewed', 'correct', 'wrong', 'quizDone']) if (!integer(s[key])) fail()
  }
  return input as { words: WordState[]; stats: DayStat[] }
}
