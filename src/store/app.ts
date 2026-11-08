import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Settings } from '../types'
import { dueBadges, levelFromXp, type GamifyContext } from '../lib/gamify'
import { useToast } from './toast'

const DEFAULT_SETTINGS: Settings = {
  dailyGoal: 6,
  autoSpeak: false,
  speakRate: 0.92,
  voice: 'us',
  theme: 'dark',
  newWordsPerSession: 6,
  quizCount: 6,
}

export interface GamifyState {
  xp: number
  badges: string[]        // 已解锁徽章 id
  consec: number          // 当前连续答对
  bestConsec: number      // 历史最高连续答对
  answered: number        // 累计测试答题数
  wrongCleared: boolean   // 错题本曾清空
}

interface AppState {
  settings: Settings
  gamify: GamifyState
  setSettings: (patch: Partial<Settings>) => void
  /** 学习卡/测验后累加 XP，并返回新解锁徽章数 */
  recordXp: (amount: number) => void
  /** 连续答对状态更新：correct=true 连击+1，false 中断 */
  recordConsec: (correct: boolean) => void
  /** 测验记录：答对数、总题数、容错数（自动累加 answered；XP=答对*5+容错*2） */
  recordQuiz: (correct: number, total: number, near?: number) => void
  markWrongCleared: () => void
  /** 汇总校验徽章解锁；返回新解锁列表（供 toast） */
  syncBadges: (ctx: Omit<GamifyContext, 'answered' | 'bestConsec' | 'wrongCleared'>) => string[]
  resetGamify: () => void
}

export const useApp = create<AppState>()(
  persist(
    (set, get) => ({
      settings: DEFAULT_SETTINGS,
      gamify: { xp: 0, badges: [], consec: 0, bestConsec: 0, answered: 0, wrongCleared: false },

      setSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

      recordXp: (amount) => {
        if (amount <= 0) return
        set((s) => ({ gamify: { ...s.gamify, xp: s.gamify.xp + amount } }))
      },

      recordConsec: (correct) => {
        set((s) => {
          const consec = correct ? s.gamify.consec + 1 : 0
          return {
            gamify: {
              ...s.gamify,
              consec,
              bestConsec: Math.max(s.gamify.bestConsec, consec),
            },
          }
        })
      },

      recordQuiz: (correct, total, near = 0) => {
        set((s) => ({
          gamify: {
            ...s.gamify,
            xp: s.gamify.xp + correct * 5 + near * 2,
            answered: s.gamify.answered + total,
          },
        }))
      },

      markWrongCleared: () => {
        set((s) => (s.gamify.wrongCleared ? s : { gamify: { ...s.gamify, wrongCleared: true } }))
      },

      syncBadges: (ctx) => {
        const g = get().gamify
        const full: GamifyContext = { ...ctx, answered: g.answered, bestConsec: g.bestConsec, wrongCleared: g.wrongCleared }
        const fresh = dueBadges(full, g.badges)
        if (fresh.length === 0) return []
        set((s) => ({ gamify: { ...s.gamify, badges: [...s.gamify.badges, ...fresh] } }))
        for (const id of fresh) {
          useToast.getState().push(`解锁徽章：${badgeName(id)}`, 'badge')
        }
        return fresh
      },

      resetGamify: () => set({ gamify: { xp: 0, badges: [], consec: 0, bestConsec: 0, answered: 0, wrongCleared: false } }),
    }),
    { name: 'local-word-study-settings' },
  ),
)

function badgeName(id: string): string {
  // 避免循环依赖：简单查找表
  const names: Record<string, string> = {
    'first-learn': '初学乍练', 'streak-7': '七日之约', 'streak-30': '满月达人',
    'test-50': '身经百战', 'perfect-10': '十连全对', 'wrong-zero': '错题清零',
    'master-50': '掌握五十', 'nato-26': '字母大师',
  }
  return names[id] ?? id
}

export function applyTheme(theme: 'dark' | 'light'): void {
  if (typeof document === 'undefined') return
  document.documentElement.classList.toggle('light', theme === 'light')
}

export { levelFromXp }
