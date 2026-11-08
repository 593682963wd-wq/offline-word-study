// 词语练习 · 游戏化：XP 等级 + 徽章系统
// 融合自 Flash 版设计：等级阈值 25L²+75L，8 枚徽章
export interface BadgeDef {
  id: string
  icon: 'rocket' | 'flame' | 'crown' | 'target' | 'zap' | 'sparkle' | 'gem' | 'plane'
  name: string
  desc: string
}

export const BADGES: BadgeDef[] = [
  { id: 'first-learn', icon: 'rocket', name: '初学乍练', desc: '第一次学会单词' },
  { id: 'streak-7', icon: 'flame', name: '七日之约', desc: '连续打卡 7 天' },
  { id: 'streak-30', icon: 'crown', name: '满月达人', desc: '连续打卡 30 天' },
  { id: 'test-50', icon: 'target', name: '身经百战', desc: '累计测试作答 50 次' },
  { id: 'perfect-10', icon: 'zap', name: '十连全对', desc: '连续答对 10 题' },
  { id: 'wrong-zero', icon: 'sparkle', name: '错题清零', desc: '错题本清空一次' },
  { id: 'master-50', icon: 'gem', name: '掌握五十', desc: '50 个词标记已掌握' },
  { id: 'nato-26', icon: 'plane', name: '字母大师', desc: '学完 26 个北约字母词' },
]

export interface GamifyContext {
  learned: number      // 已学词数
  streak: number       // 连续打卡天数
  answered: number     // 累计测试答题数
  bestConsec: number   // 历史最高连续答对
  wrongCleared: boolean // 错题本曾清空
  mastered: number     // 已掌握词数
  natoLearned: number  // 已学北约字母词数
}

/** 等级：累计 XP 阈值 25L²+75L */
export function levelFromXp(xp: number): number {
  let L = 1
  while (25 * (L + 1) * (L + 1) + 75 * (L + 1) <= xp) L++
  return L
}

export function xpProgress(xp: number): { level: number; cur: number; need: number } {
  const level = levelFromXp(xp)
  const low = 25 * level * level + 75 * level
  const high = 25 * (level + 1) * (level + 1) + 75 * (level + 1)
  return { level, cur: xp - low, need: high - low }
}

/** 学习卡 XP：认识 +3 / 模糊 +1 / 不认识 0 */
export function xpForGrade(grade: 'again' | 'hard' | 'good' | 'easy'): number {
  if (grade === 'good' || grade === 'easy') return 3
  if (grade === 'hard') return 1
  return 0
}

/** 测验 XP：答对每题 +5 */
export const QUIZ_XP_PER_CORRECT = 5

/** 给定当前汇总，返回应解锁但未解锁的徽章 id */
export function dueBadges(ctx: GamifyContext, owned: string[]): string[] {
  const out: string[] = []
  const own = new Set(owned)
  const want = (id: string, cond: boolean) => {
    if (cond && !own.has(id)) out.push(id)
  }
  want('first-learn', ctx.learned >= 1)
  want('streak-7', ctx.streak >= 7)
  want('streak-30', ctx.streak >= 30)
  want('test-50', ctx.answered >= 50)
  want('perfect-10', ctx.bestConsec >= 10)
  want('wrong-zero', ctx.wrongCleared)
  want('master-50', ctx.mastered >= 50)
  want('nato-26', ctx.natoLearned >= 26)
  return out
}
