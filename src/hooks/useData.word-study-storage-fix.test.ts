// 作者：Wangyuan；日期：2026-11-08。
import 'fake-indexeddb/auto'
import { afterAll, afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { AppDB, db, exportData } from '../db/db'
import { emptyState } from '../lib/srs'
import { todayStr } from '../lib/utils'
import { useData, WORDS } from './useData'

const effects = vi.hoisted(() => ({
  push: vi.fn(),
  app: {
    recordXp: vi.fn(),
    recordConsec: vi.fn(),
    syncBadges: vi.fn(),
    recordQuiz: vi.fn(),
    markWrongCleared: vi.fn(),
  },
}))
vi.mock('../store/toast', () => ({
  useToast: { getState: () => ({ push: effects.push }) },
}))
vi.mock('../store/app', () => ({
  useApp: { getState: () => effects.app },
}))

const id = WORDS[0]!.id
const now = new Date(2030, 0, 2, 12).getTime()
const date = todayStr(new Date(now))
const blankStat = () => ({ date, learned: 0, reviewed: 0, correct: 0, wrong: 0, quizDone: 0 })
let peer: AppDB

beforeEach(async () => {
  vi.clearAllMocks()
  await db.transaction('rw', db.words, db.stats, async () => {
    await db.words.clear()
    await db.stats.clear()
  })
  useData.setState({ ready: false, states: new Map(), stats: new Map() })
  await db.words.put(emptyState(id))
  await useData.getState().load()
  // 独立连接模拟另一标签页已提交的写入，本页 Zustand 缓存保持不变。
  peer = new AppDB()
})
afterEach(() => {
  peer.close()
  vi.restoreAllMocks()
})
afterAll(async () => { await db.delete() })

describe('word-study-storage-fix：事务中的词条修改', () => {
  it('旧缓存收藏不会覆盖另一连接已保存的笔记、助记、标签和评分', async () => {
    const remote = {
      ...emptyState(id), note: '另一页的新笔记', mnemonicCustom: '新的联想',
      tags: ['常考'], reviewCount: 3, correctCount: 2, level: 2, learnedAt: now - 1,
    }
    await peer.words.put(remote)
    expect(useData.getState().getState(id).note).toBe('')

    await useData.getState().toggleFavorite(id)

    const expected = { ...remote, favorite: 1 }
    expect(await peer.words.get(id)).toEqual(expected)
    expect(useData.getState().getState(id)).toEqual(expected)
  })

  it('saveState 只合并调用方相对缓存修改的字段', async () => {
    const cached = useData.getState().getState(id)
    const remote = { ...emptyState(id), note: '不能被旧快照覆盖', tags: ['远端标签'], reviewCount: 4 }
    await peer.words.put(remote)

    await useData.getState().saveState({ ...cached, favorite: 1 })

    expect(await db.words.get(id)).toEqual({ ...remote, favorite: 1 })
    expect(useData.getState().getState(id)).toEqual({ ...remote, favorite: 1 })
  })

  it('两个并发评分从数据库最新计数累加，并正确区分首次学习和复习', async () => {
    await peer.words.put({
      ...emptyState(id), note: '保留', level: 2, reviewCount: 2,
      correctCount: 2, learnedAt: now - 1,
    })

    await Promise.all([
      useData.getState().gradeWord(id, 'good', now),
      useData.getState().gradeWord(id, 'good', now),
    ])

    const stored = await db.words.get(id)
    expect(stored).toMatchObject({
      note: '保留', level: 4, reviewCount: 4, correctCount: 4, learnedAt: now - 1,
    })
    expect(useData.getState().getState(id)).toEqual(stored)
    expect(await db.stats.get(date)).toEqual({ ...blankStat(), reviewed: 2, correct: 2 })
    expect(useData.getState().stats.get(date)).toEqual(await db.stats.get(date))
    expect(effects.app.recordConsec).toHaveBeenCalledTimes(2)
  })

  it('并发修改不同字段、添加标签和两次收藏切换均不丢失', async () => {
    await Promise.all([
      useData.getState().setNote(id, '笔记'),
      useData.getState().setMnemonicCustom(id, '助记'),
      useData.getState().toggleTag(id, '甲'),
      useData.getState().toggleTag(id, '乙'),
      useData.getState().toggleFavorite(id),
      useData.getState().toggleFavorite(id),
    ])

    const stored = await db.words.get(id)
    expect(stored).toMatchObject({ note: '笔记', mnemonicCustom: '助记', favorite: 0 })
    expect(stored?.tags).toHaveLength(2)
    expect(stored?.tags).toEqual(expect.arrayContaining(['甲', '乙']))
    expect(useData.getState().getState(id)).toEqual(stored)
  })

  it('测验中重复出现的词条顺序更新最新状态，并保留其他字段', async () => {
    await peer.words.put({ ...emptyState(id), note: '保留测验前笔记', wrongCount: 2, wrongAt: now - 1 })

    await useData.getState().quizRecord([
      { id, correct: true },
      { id, correct: false, near: true },
    ], now)

    expect(await db.words.get(id)).toMatchObject({
      note: '保留测验前笔记', wrongCount: 2, correctCount: 1,
      reviewCount: 2, lastGrade: 'again', wrongAt: now,
    })
    expect(await db.stats.get(date)).toEqual({
      ...blankStat(), quizDone: 1, reviewed: 2, correct: 1, wrong: 1,
    })
    expect(effects.app.recordQuiz).toHaveBeenCalledWith(1, 2, 1)
    expect(effects.app.markWrongCleared).not.toHaveBeenCalled()
  })

  it('测验清除缓存中尚未出现的最后一个错词后才更新徽章', async () => {
    await peer.words.put({ ...emptyState(id), wrongCount: 1, wrongAt: now - 1 })

    await useData.getState().quizRecord([{ id, correct: true }], now)

    expect(await db.words.get(id)).toMatchObject({ wrongCount: 0, wrongAt: null, reviewCount: 1 })
    expect(effects.app.markWrongCleared).toHaveBeenCalledTimes(1)
  })

  it('移出错词本读取最新行，保留笔记和评分计数', async () => {
    await peer.words.put({
      ...emptyState(id), note: '远端笔记', wrongCount: 3, wrongAt: now - 1, reviewCount: 5,
    })

    await useData.getState().clearWrong(id)

    expect(await db.words.get(id)).toMatchObject({
      note: '远端笔记', wrongCount: 0, wrongAt: null, reviewCount: 5,
    })
    expect(effects.app.markWrongCleared).toHaveBeenCalledTimes(1)
  })

  it('统计溢出时评分与内存一并回滚，不发奖励；修复统计后可以重试', async () => {
    const overflow = { ...blankStat(), learned: Number.MAX_SAFE_INTEGER }
    await db.stats.put(overflow)
    await useData.getState().load()

    await useData.getState().gradeWord(id, 'good', now)

    expect(await db.words.get(id)).toEqual(emptyState(id))
    expect(useData.getState().getState(id)).toEqual(emptyState(id))
    expect(await db.stats.get(date)).toEqual(overflow)
    expect(useData.getState().stats.get(date)).toEqual(overflow)
    expect(effects.push).toHaveBeenCalledTimes(1)
    expect(effects.app.recordXp).not.toHaveBeenCalled()
    expect(effects.app.recordConsec).not.toHaveBeenCalled()
    expect(effects.app.syncBadges).not.toHaveBeenCalled()

    await db.stats.put(blankStat())
    await useData.getState().gradeWord(id, 'good', now)

    expect(await db.words.get(id)).toMatchObject({ level: 1, reviewCount: 1, correctCount: 1 })
    expect(await db.stats.get(date)).toEqual({ ...blankStat(), learned: 1, correct: 1 })
    expect(useData.getState().getState(id)).toEqual(await db.words.get(id))
    expect(effects.app.recordConsec).toHaveBeenCalledWith(true)
  })

  it('收藏写入失败不改变缓存或数据库，下一次操作可以恢复', async () => {
    vi.spyOn(db.words, 'put').mockRejectedValueOnce(new Error('synthetic storage failure'))

    await useData.getState().toggleFavorite(id)

    expect(await db.words.get(id)).toEqual(emptyState(id))
    expect(useData.getState().getState(id)).toEqual(emptyState(id))
    expect(effects.push).toHaveBeenCalledTimes(1)

    await useData.getState().toggleFavorite(id)

    expect(await db.words.get(id)).toMatchObject({ favorite: 1 })
    expect(useData.getState().getState(id).favorite).toBe(1)
  })
})

describe('word-study-storage-fix：编辑、持久化与备份恢复边界', () => {
  it.each([10001, 2 * 1024 * 1024 + 1])('完整恢复 %i 字符笔记及超旧限制的助记、标签', async (length) => {
    const tags = Array.from({ length: 33 }, (_, i) => `${'标'.repeat(101)}-${i}`)
    for (const tag of tags) await useData.getState().toggleTag(id, tag)
    await useData.getState().setMnemonicCustom(id, '助'.repeat(10001))
    await useData.getState().setNote(id, '记'.repeat(length))
    const expected = {
      ...emptyState(id), note: '记'.repeat(length), mnemonicCustom: '助'.repeat(10001), tags,
    }
    expect(await db.words.get(id)).toEqual(expected)
    const backup = await exportData()
    if (length > 2 * 1024 * 1024) expect(backup.length).toBeGreaterThan(2 * 1024 * 1024)

    await useData.getState().resetAll()
    expect(await db.words.get(id)).toBeUndefined()
    const counts = await useData.getState().importAll(backup)

    expect(counts).toEqual({ words: 1, stats: 0 })
    expect(await db.words.get(id)).toEqual(expected)
    expect(useData.getState().getState(id)).toEqual(expected)
  }, 15000)

  it.each([
    { note: 42 },
    { mnemonicCustom: 42 },
    { tags: 'not-an-array' },
    { tags: ['有效标签', 42] },
  ])('放宽长度限制后仍拒绝错误类型且不破坏已有内容：%j', async (patch) => {
    await useData.getState().setNote(id, '已有内容')
    const before = await db.words.get(id)
    const malformed = JSON.stringify({
      app: 'local-word-study', version: 1,
      words: [{ ...emptyState(id), ...patch }], stats: [],
    })

    await expect(useData.getState().importAll(malformed)).rejects.toThrow()

    expect(await db.words.get(id)).toEqual(before)
    expect(useData.getState().getState(id)).toEqual(before)
  })
})
