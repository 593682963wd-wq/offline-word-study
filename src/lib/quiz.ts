import type { Word, QuizMode, QuizQuestion, Grade } from '../types'
import wordsRaw from '../data/words.json'

const FULL_WORDS: Word[] = (wordsRaw as Word[]).map((w) => ({
  ...w,
  pos: w.pos ?? '',
  example: w.example ?? '',
  mnemonic: w.mnemonic ?? '',
}))

export function acceptedAnswers(word: Word): string[] {
  const base = word.word.toLowerCase()
  const out = new Set<string>([base])
  // strip parentheses and slash variants
  const noParen = base.replace(/\s*\(.*?\)\s*/g, ' ').replace(/\s+/g, ' ').trim()
  if (noParen) out.add(noParen)
  const noSlash = base.replace(/\s*\/.*$/, '').trim()
  if (noSlash) out.add(noSlash)
  for (const v of [...out]) {
    out.add(v.replace(/[-]/g, ''))          // nosegear
    out.add(v.replace(/[^a-z\s]/g, '').trim())
  }
  out.delete('')
  return [...out]
}

export function normalizeAnswer(input: string): string {
  return input.trim().toLowerCase().replace(/[^a-z\s]/g, '').replace(/\s+/g, ' ').trim()
}

export function checkAnswer(input: string, accepted: string[]): boolean {
  const norm = normalizeAnswer(input)
  if (!norm) return false
  return accepted.some((a) => normalizeAnswer(a) === norm)
}

/* ---------------- 听写/拼写容错（融合 Flash 版） ---------------- */

/** 编辑距离（Levenshtein），用于听写容错 */
export function levenshtein(a: string, b: string): number {
  if (a === b) return 0
  const m = a.length, n = b.length
  if (!m) return n
  if (!n) return m
  let prev = new Array(n + 1), cur = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    cur[0] = i
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
    }
    ;[prev, cur] = [cur, prev]
  }
  return prev[n]
}

/** 归一化：小写、非字母数字替换为空格、折叠空格 */
export function normCompact(s: string): string {
  return String(s ?? '').toLowerCase().replace(/[^a-z0-9\s]/g, ' ').replace(/\s+/g, ' ').trim()
}

/**
 * 拼写/听写判题（融合 Flash checkDictation）：
 * 精确（含去空格紧凑形式）→ { ok:true, near:false }
 * 编辑距离 ≤ 1（多打/漏打/错打一个字母）→ { ok:false, near:true } 容错通过
 * 其余 → { ok:false, near:false }
 */
export function checkNear(input: string, accepted: string[]): { ok: boolean; near: boolean } {
  const inNorm = normCompact(input).replace(/\s+/g, '')
  if (!inNorm) return { ok: false, near: false }
  let near = false
  for (const a of accepted) {
    const vNorm = normCompact(a).replace(/\s+/g, '')
    if (!vNorm) continue
    if (normCompact(a) === normCompact(input) || vNorm === inNorm) return { ok: true, near: false }
    if (levenshtein(vNorm, inNorm) <= 1) near = true
  }
  return { ok: false, near }
}

/* ---------------- 相似干扰项池（融合 Flash simOpts） ---------------- */

export interface SimCand { id: string; s: number }

/** 预计算每个词的相似候选：编辑距离 + 共享前缀 + 长度差 + 同分类 + 中文距离 */
export function buildSimCache(words: Word[]): Map<string, SimCand[]> {
  const map = new Map<string, SimCand[]>()
  for (const w of words) {
    const wEn = w.word.toLowerCase()
    const cands: SimCand[] = []
    for (const o of words) {
      if (o.id === w.id) continue
      let s = 0
      const oEn = o.word.toLowerCase()
      const d = levenshtein(wEn, oEn)
      if (d <= 1) s += 120
      else if (d === 2) s += 70
      else if (d === 3) s += 35
      else if (d === 4) s += 16
      else if (d <= 6) s += 6
      let pref = 0
      const lim = Math.min(wEn.length, oEn.length)
      while (pref < lim && wEn[pref] === oEn[pref]) pref++
      if (pref >= 4) s += 14
      else if (pref === 3) s += 6
      const dl = Math.abs(wEn.length - oEn.length)
      if (dl <= 1) s += 6
      else if (dl <= 2) s += 2
      if (o.cat === w.cat) s += 20
      const zd = levenshtein(w.cn, o.cn)
      if (zd === 1) s += 40
      else if (zd === 2) s += 14
      if (s > 0) cands.push({ id: o.id, s })
    }
    cands.sort((a, b) => b.s - a.s)
    map.set(w.id, cands)
  }
  return map
}

let _simCache: Map<string, SimCand[]> | null = null
function getSimCache(): Map<string, SimCand[]> {
  if (!_simCache) _simCache = buildSimCache(FULL_WORDS)
  return _simCache
}

/** 取相似干扰词：s≥8 候选 → 前 8 随机 → 最多 n 个（值不重复） */
export function pickSimilar(
  target: Word,
  pool: Word[],
  valueOf: (w: Word) => string,
  n = 3,
  cache?: Map<string, SimCand[]>,
): Word[] {
  const c = cache ?? getSimCache()
  const self = valueOf(target)
  const cands = (c.get(target.id) ?? []).filter((x) => x.s >= 8)
  const out: Word[] = []
  for (const cand of shuffle(cands.slice(0, 8))) {
    if (out.length >= n) break
    const o = pool.find((p) => p.id === cand.id)
    if (!o) continue
    const v = valueOf(o)
    if (v === self || out.some((x) => valueOf(x) === v)) continue
    out.push(o)
  }
  return out
}

function pickDistractors(pool: Word[], target: Word, n: number, valueOf: (w: Word) => string): Word[] {
  const out = pickSimilar(target, pool, valueOf, n)
  if (out.length < n) {
    // 相似候选不足时随机补足
    const self = valueOf(target)
    for (const o of shuffle(pool)) {
      if (out.length >= n) break
      if (o.id === target.id) continue
      const v = valueOf(o)
      if (v === self || out.some((x) => valueOf(x) === v)) continue
      out.push(o)
    }
  }
  return out
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export function makeQuestions(
  words: Word[],
  mode: QuizMode,
  count: number,
  pool: Word[],
): QuizQuestion[] {
  const picked = shuffle(words).slice(0, count)
  const qs: QuizQuestion[] = []
  for (const w of picked) {
    if (mode === 'spell' || mode === 'dictation') {
      qs.push({ word: w, mode, accepted: acceptedAnswers(w) })
      continue
    }
    if (mode === 'judge') {
      const correct = Math.random() < 0.5
      const dist = correct ? null : pickDistractors(pool, w, 1, (x) => x.cn)[0]
      qs.push({ word: w, mode, judgeCorrect: correct, judgeCn: dist?.cn })
      continue
    }
    const valueOf = mode === 'cn2en' ? (x: Word) => x.word : (x: Word) => x.cn
    const distract = pickDistractors(pool, w, 3, valueOf)
    const opts = shuffle([w, ...distract])
    qs.push({
      word: w, mode,
      options: opts.map((o) => valueOf(o)),
      correctIndex: opts.findIndex((o) => o.id === w.id),
    })
  }
  return qs
}

export const MODE_META: Record<QuizMode, { name: string; desc: string; icon: string }> = {
  en2cn: { name: '看词选义', desc: '显示单词，选出正确释义', icon: 'en2cn' },
  cn2en: { name: '看义选词', desc: '显示释义，选出正确单词', icon: 'cn2en' },
  listen: { name: '听音选义', desc: '听发音，选出正确释义', icon: 'listen' },
  spell: { name: '拼写测试', desc: '看释义，拼出单词', icon: 'spell' },
  dictation: { name: '听写', desc: '听发音，写出单词', icon: 'dictation' },
  judge: { name: '快速判断', desc: '判断词义配对对错', icon: 'judge' },
}

export function gradeOf(correct: boolean): Grade {
  return correct ? 'good' : 'again'
}

/** 测验 XP：答对 +5，听写容错 +2（融合 Flash 公式） */
export const QUIZ_XP_PER_CORRECT = 5
export const QUIZ_XP_PER_NEAR = 2
