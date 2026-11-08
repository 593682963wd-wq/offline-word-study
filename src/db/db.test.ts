// Wangyuan · 2026-11-06：使用内存IndexedDB验证统计增量与事务并发。
import 'fake-indexeddb/auto'
import { beforeEach, afterAll, describe, expect, it } from 'vitest'
import { addStat, db, getStat } from './db'

beforeEach(async () => { await db.stats.clear() })
afterAll(async () => { await db.delete() })

describe('统计增量事务', () => {
  it('连续两次学习累加而非覆盖', async () => {
    await addStat('2030-01-01', { learned: 1, correct: 1 })
    await addStat('2030-01-01', { learned: 1, correct: 1 })
    expect(await getStat('2030-01-01')).toMatchObject({ learned: 2, correct: 2 })
  })
  it('并发写事务不丢失增量', async () => {
    await Promise.all(Array.from({ length: 20 }, () => addStat('2030-01-01', { reviewed: 1, wrong: 1, quizDone: 1 })))
    expect(await getStat('2030-01-01')).toMatchObject({ reviewed: 20, wrong: 20, quizDone: 20 })
  })
  it('非法增量不写入统计', async () => {
    for (const learned of [-1, 1.5, NaN, Infinity]) await expect(addStat('2030-01-01', { learned })).rejects.toThrow()
    expect(await getStat('2030-01-01')).toBeUndefined()
  })
  it('总数溢出时整个增量回滚', async () => {
    await addStat('2030-01-01', { learned: Number.MAX_SAFE_INTEGER })
    await expect(addStat('2030-01-01', { learned: 1, correct: 1 })).rejects.toThrow()
    expect(await getStat('2030-01-01')).toMatchObject({ learned: Number.MAX_SAFE_INTEGER, correct: 0 })
  })
})
