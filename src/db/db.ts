import { parseBackup } from '../lib/backup'
import Dexie, { type Table } from 'dexie'
import type { WordState, DayStat } from '../types'

export class AppDB extends Dexie {
  words!: Table<WordState, string>
  stats!: Table<DayStat, string>

  constructor() {
    super('local-word-study')
    this.version(1).stores({
      words: 'id, level, nextReview, favorite, wrongCount, wrongAt, learnedAt, masteredAt',
      stats: 'date',
    })
  }
}

export const db = new AppDB()

export async function getAllStates(): Promise<Map<string, WordState>> {
  const all = await db.words.toArray()
  return new Map(all.map((s) => [s.id, s]))
}

export async function bulkPutStates(states: WordState[]): Promise<void> {
  await db.words.bulkPut(states)
}

export async function getStatsAll(): Promise<DayStat[]> {
  return db.stats.toArray()
}

export async function getStat(date: string): Promise<DayStat | undefined> {
  return db.stats.get(date)
}

export async function addStat(date: string, patch: Partial<Omit<DayStat, 'date'>>): Promise<void> {
  const fields = ['learned', 'reviewed', 'correct', 'wrong', 'quizDone'] as const
  if (Object.keys(patch).some((key) => !(fields as readonly string[]).includes(key)) ||
      fields.some((key) => patch[key] !== undefined && (!Number.isSafeInteger(patch[key]) || patch[key]! < 0))) {
    throw new Error('统计增量必须为非负安全整数')
  }
  // 多个评分或标签页可能同时提交；读和累加必须处于同一个写事务。
  await db.transaction('rw', db.stats, async () => {
    const current = (await db.stats.get(date)) ?? { date, learned: 0, reviewed: 0, correct: 0, wrong: 0, quizDone: 0 }
    const next = { ...current }
    for (const field of fields) {
      next[field] += patch[field] ?? 0
      if (!Number.isSafeInteger(next[field]) || next[field] < 0) throw new Error('统计总数超出有效范围')
    }
    await db.stats.put(next)
  })
}

export async function resetAll(): Promise<void> {
  await db.transaction('rw', db.words, db.stats, async () => {
    await db.words.clear()
    await db.stats.clear()
  })
}

export async function exportData(): Promise<string> {
  return db.transaction('r', db.words, db.stats, async () => {
    const words = await db.words.toArray()
    const stats = await db.stats.toArray()
    return JSON.stringify({ app: 'local-word-study', version: 1, exportedAt: Date.now(), words, stats })
  })
}

export async function importData(json: string): Promise<{ words: number; stats: number }> {
  const data = parseBackup(json)
  await db.transaction('rw', db.words, db.stats, async () => {
    await db.words.bulkPut(data.words)
    await db.stats.bulkPut(data.stats)
  })
  return { words: data.words.length, stats: data.stats.length }
}
