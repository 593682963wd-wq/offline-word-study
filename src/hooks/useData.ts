import { useToast } from '../store/toast'
import { create } from 'zustand'
import wordsRaw from '../data/words.json'
import type { Word, WordState, DayStat, Grade } from '../types'
import { db, addStat, importData } from '../db/db'
import { emptyState, applyGrade, markWrong, offsetWrong } from '../lib/srs'
import { todayStr } from '../lib/utils'
import { xpForGrade } from '../lib/gamify'
import { useApp } from '../store/app'

export const WORDS: Word[] = (wordsRaw as Word[]).map((w) => ({
  ...w,
  pos: w.pos ?? '',
  example: w.example ?? '',
  mnemonic: w.mnemonic ?? '',
}))
export const CATS: { key: string; label: string; icon: string }[] = Array.from(new Set(WORDS.map((w) => w.cat))).map((key) => ({ key, label: key, icon: 'book' }))
const WORD_BY_ID = new Map(WORDS.map((w) => [w.id, w]))
export function wordById(id: string): Word {
  return WORD_BY_ID.get(id)!
}

interface DataState {
  ready: boolean
  states: Map<string, WordState>
  stats: Map<string, DayStat>
  load: () => Promise<void>
  getState: (id: string) => WordState
  saveState: (s: WordState) => Promise<boolean>
  gradeWord: (id: string, grade: Grade, now?: number) => Promise<boolean>
  quizRecord: (results: { id: string; correct: boolean; near?: boolean }[], now?: number) => Promise<boolean>
  toggleTag: (id: string, tag: string) => Promise<boolean>
  toggleFavorite: (id: string) => Promise<boolean>
  setNote: (id: string, note: string) => Promise<boolean>
  setMnemonicCustom: (id: string, text: string) => Promise<boolean>
  clearWrong: (id: string) => Promise<boolean>
  resetAll: () => Promise<void>
  importAll: (json: string) => Promise<{ words: number; stats: number }>
  statToday: () => DayStat
  streakDays: () => number
  activityOn: (date: string) => boolean
  refreshStat: (date: string) => Promise<void>
}

export const useData = create<DataState>((set, get) => {
  type WriteWord = (id: string, update: (current: WordState) => WordState) => Promise<{ before: WordState; after: WordState }>

  const commit = async <T,>(
    change: (write: WriteWord) => Promise<T>,
    failure = '保存失败，请检查浏览器存储权限后重试',
  ): Promise<{ value: T } | undefined> => {
    try {
      const committed = await db.transaction('rw', db.words, db.stats, async () => {
        const write: WriteWord = async (id, update) => {
          const before = (await db.words.get(id)) ?? emptyState(id)
          const after = update(before)
          await db.words.put(after)
          return { before, after }
        }
        const value = await change(write)
        // 同一事务内取得提交快照，徽章判断也不再依赖其他词条的旧缓存。
        return { value, states: await db.words.toArray(), stats: await db.stats.toArray() }
      })
      set({
        states: new Map(committed.states.map((s) => [s.id, s])),
        stats: new Map(committed.stats.map((s) => [s.date, s])),
      })
      return { value: committed.value }
    } catch {
      useToast.getState().push(failure)
      return undefined
    }
  }

  const rewardsAfterCommit = (apply: () => void) => {
    try { apply() } catch {
      // 学习记录已在 IndexedDB 提交，辅助奖励失败不能让页面重试该记录。
      useToast.getState().push('学习进度已保存，奖励设置未能保存，请检查浏览器存储空间')
    }
  }

  return {
  ready: false,
  states: new Map(),
  stats: new Map(),

  load: async () => {
    const [statesArr, statsArr] = await Promise.all([db.words.toArray(), db.stats.toArray()])
    set({
      ready: true,
      states: new Map(statesArr.map((s) => [s.id, s])),
      stats: new Map(statsArr.map((s) => [s.date, s])),
    })
  },

  getState: (id) => {
    const s = get().states.get(id)
    return s ?? emptyState(id)
  },

  saveState: async (s) => {
    // 保留整行调用接口，只提交相对本页缓存发生变化的字段。
    const base = get().getState(s.id)
    const patch = Object.fromEntries(
      (Object.keys(s) as (keyof WordState)[])
        .filter((key) => key !== 'id' && (key === 'tags'
          ? s.tags.length !== base.tags.length || s.tags.some((tag, i) => tag !== base.tags[i])
          : s[key] !== base[key]))
        .map((key) => [key, s[key]]),
    ) as Partial<WordState>
    return Boolean(await commit(async (write) => {
      await write(s.id, (cur) => ({ ...cur, ...patch, id: s.id }))
    }))
  },

  gradeWord: async (id, grade, now = Date.now()) => {
    const date = todayStr(new Date(now))
    const committed = await commit(async (write) => {
      const { before } = await write(id, (cur) => applyGrade(cur, grade, now))
      const isFirst = before.learnedAt === null
      await addStat(date, {
        learned: isFirst ? 1 : 0,
        reviewed: isFirst ? 0 : 1,
        correct: grade === 'good' || grade === 'easy' ? 1 : 0,
        wrong: grade === 'again' ? 1 : 0,
      })
    })
    if (!committed) return false
    rewardsAfterCommit(() => {
      const app = useApp.getState()
      const xp = xpForGrade(grade)
      if (xp > 0) app.recordXp(xp)
      app.recordConsec(grade === 'good' || grade === 'easy')
      app.syncBadges(gamifyCtx(get))
    })
    return true
  },

  quizRecord: async (results, now = Date.now()) => {
    const date = todayStr(new Date(now))
    const correct = results.filter((r) => r.correct).length
    const near = results.filter((r) => !r.correct && r.near).length
    const committed = await commit(async (write) => {
      const anyWrongBefore = (await db.words.toArray()).some((st) => st.wrongCount > 0)
      for (const r of results) {
        await write(r.id, (cur) => r.correct
          ? offsetWrong(applyGrade(cur, 'good', now))
          : markWrong(cur, now))
      }
      await addStat(date, {
        quizDone: 1,
        correct,
        wrong: results.length - correct,
        reviewed: results.length,
      })
      return anyWrongBefore
    })
    if (!committed) return false
    rewardsAfterCommit(() => {
      const app = useApp.getState()
      app.recordQuiz(correct, results.length, near)
      for (const r of results) app.recordConsec(r.correct)
      // 错题本归零 → 触发「错题清零」徽章
      if (committed.value) {
        const anyWrongAfter = [...get().states.values()].some((st) => st.wrongCount > 0)
        if (!anyWrongAfter) {
          app.markWrongCleared()
        }
      }
      app.syncBadges(gamifyCtx(get))
    })
    return true
  },

  toggleTag: async (id, tag) => {
    return Boolean(await commit(async (write) => {
      await write(id, (cur) => {
        const tags = cur.tags ? [...cur.tags] : []
        const i = tags.indexOf(tag)
        if (i >= 0) tags.splice(i, 1)
        else tags.push(tag)
        return { ...cur, tags }
      })
    }))
  },

  toggleFavorite: async (id) => {
    return Boolean(await commit(async (write) => {
      await write(id, (cur) => ({ ...cur, favorite: cur.favorite ? 0 : 1 }))
    }, '收藏保存失败，请检查浏览器存储权限后重试'))
  },

  setNote: async (id, note) => {
    return Boolean(await commit(async (write) => {
      await write(id, (cur) => ({ ...cur, note }))
    }))
  },

  setMnemonicCustom: async (id, text) => {
    return Boolean(await commit(async (write) => {
      await write(id, (cur) => ({ ...cur, mnemonicCustom: text }))
    }))
  },

  clearWrong: async (id) => {
    const committed = await commit(async (write) => {
      const { before } = await write(id, (cur) => ({ ...cur, wrongCount: 0, wrongAt: null }))
      return before.wrongCount > 0
    })
    if (committed?.value) rewardsAfterCommit(() => {
      const anyWrong = [...get().states.values()].some((st) => st.wrongCount > 0)
      const app = useApp.getState()
      if (!anyWrong) {
        app.markWrongCleared()
        app.syncBadges(gamifyCtx(get))
      }
    })
    return Boolean(committed)
  },

  resetAll: async () => {
    await db.transaction('rw', db.words, db.stats, async () => {
      await db.words.clear()
      await db.stats.clear()
    })
    set({ states: new Map(), stats: new Map() })
  },

  importAll: async (json) => {
    const counts = await importData(json)
    await get().load()
    return counts
  },

  statToday: () => {
    const s = get().stats.get(todayStr())
    return s ?? { date: todayStr(), learned: 0, reviewed: 0, correct: 0, wrong: 0, quizDone: 0 }
  },

  streakDays: () => {
    let n = 0
    const d = new Date()
    for (;;) {
      const key = todayStr(d)
      if (get().activityOn(key)) {
        n += 1
        d.setDate(d.getDate() - 1)
      } else if (n === 0 && key === todayStr(new Date())) {
        d.setDate(d.getDate() - 1)
      } else break
    }
    return n
  },

  activityOn: (date) => {
    const s = get().stats.get(date)
    if (!s) return false
    return s.learned + s.reviewed + s.quizDone + s.correct + s.wrong > 0
  },

  refreshStat: async (date) => {
    const s = await db.stats.get(date)
    if (s) {
      set((st) => {
        const stats = new Map(st.stats)
        stats.set(date, s)
        return { stats }
      })
    }
  },
  }
})

export function useDataReady(): boolean {
  return useData((s) => s.ready)
}


/** 徽章汇总上下文：从当前学习状态推导 */
export function gamifyCtx(get: () => DataState) {
  const st = get
  const states = st().states
  let learned = 0, mastered = 0, natoLearned = 0
  for (const s of states.values()) {
    if (s.learnedAt !== null) learned += 1
    if (s.masteredAt !== null) mastered += 1
  }
  const nato = WORDS.filter((w) => w.cat === 'ICAO字母读法')
  for (const w of nato) {
    const s = states.get(w.id)
    if (s && s.learnedAt !== null) natoLearned += 1
  }
  return {
    learned,
    streak: st().streakDays(),
    mastered,
    natoLearned,
  }
}
