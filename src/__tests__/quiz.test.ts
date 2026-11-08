import { describe, expect, it } from 'vitest'
import { acceptedAnswers, checkAnswer, checkNear, levenshtein, makeQuestions, normalizeAnswer, buildSimCache, pickSimilar } from '../lib/quiz'
import type { Word } from '../types'

function w(id: string, word: string, cn: string): Word {
  return { id, word, cn, cat: '测试', phonetic: '', pos: '', example: '', mnemonic: '' }
}

const POOL = Array.from({ length: 40 }, (_, i) => w(`w${i}`, `word${i}`, `释义${i}`))
const TARGET = w('t1', 'runway', '跑道')

describe('acceptedAnswers', () => {
  it('accepts base, no-paren, no-slash, hyphen-stripped variants', () => {
    const a = acceptedAnswers(w('x', 'runway (RWY)', '跑道'))
    expect(a).toContain('runway (rwy)')
    expect(a).toContain('runway rwy')
    expect(a).toContain('runway')
  })
  it('handles slash variants', () => {
    const a = acceptedAnswers(w('x', 'glider/paragliding', '滑翔机/滑翔伞'))
    expect(a).toContain('glider/paragliding')
    expect(a).toContain('glider')
  })
  it('handles hyphen stripping', () => {
    const a = acceptedAnswers(w('x', 'de-icing', '除冰'))
    expect(a).toContain('deicing')
  })
})

describe('checkAnswer', () => {
  it('normalizes case and punctuation', () => {
    expect(checkAnswer('  RunWay! ', ['runway'])).toBe(true)
    expect(checkAnswer('RUNWAY', ['runway'])).toBe(true)
  })
  it('rejects wrong and empty', () => {
    expect(checkAnswer('taxiway', ['runway'])).toBe(false)
    expect(checkAnswer('', ['runway'])).toBe(false)
    expect(checkAnswer('   ', ['runway'])).toBe(false)
  })
  it('normalizeAnswer strips non-letters', () => {
    expect(normalizeAnswer('de-icing!!!')).toBe('deicing')
  })
})

describe('makeQuestions', () => {
  it('respects count and always includes the target', () => {
    const qs = makeQuestions([TARGET], 'en2cn', 1, POOL)
    expect(qs).toHaveLength(1)
    expect(qs[0].options).toHaveLength(4)
    expect(qs[0].options).toContain('跑道')
    expect(qs[0].correctIndex).not.toBeUndefined()
  })
  it('generates spell questions with accepted answers', () => {
    const qs = makeQuestions([TARGET], 'spell', 1, POOL)
    expect(qs[0].accepted).toBeDefined()
    expect(qs[0].accepted).toContain('runway')
  })
  it('distractors come from pool without target', () => {
    const qs = makeQuestions([TARGET], 'cn2en', 1, POOL)
    const opts = qs[0].options!
    expect(opts).toContain('runway')
    expect(opts.filter((o) => o === 'runway')).toHaveLength(1)
  })
  it('limits count to available words', () => {
    const qs = makeQuestions([TARGET], 'en2cn', 5, POOL)
    expect(qs).toHaveLength(1)
  })
})

describe('levenshtein', () => {
  it('computes edit distance', () => {
    expect(levenshtein('runway', 'runway')).toBe(0)
    expect(levenshtein('runwai', 'runway')).toBe(1)
    expect(levenshtein('runawy', 'runway')).toBe(2) // 换位=2 次编辑
    expect(levenshtein('', 'runway')).toBe(6)
  })
})

describe('checkNear 听写/拼写容错', () => {
  it('exact match is ok, not near', () => {
    expect(checkNear('runway', ['runway'])).toEqual({ ok: true, near: false })
    expect(checkNear('  RunWay! ', ['runway'])).toEqual({ ok: true, near: false })
  })
  it('one-edit typo returns near', () => {
    expect(checkNear('runwai', ['runway'])).toEqual({ ok: false, near: true })   // 错一个字母
    expect(checkNear('runwayy', ['runway'])).toEqual({ ok: false, near: true })  // 多打
    expect(checkNear('runwa', ['runway'])).toEqual({ ok: false, near: true })    // 漏打
  })
  it('two-edit typo is plain wrong', () => {
    expect(checkNear('runxwy', ['runway'])).toEqual({ ok: false, near: false })
    expect(checkNear('xxxxx', ['runway'])).toEqual({ ok: false, near: false })
  })
  it('empty input is not near', () => {
    expect(checkNear('', ['runway'])).toEqual({ ok: false, near: false })
    expect(checkNear('   ', ['runway'])).toEqual({ ok: false, near: false })
  })
  it('works with multiple accepted variants', () => {
    expect(checkNear('nose gea', ['nose gear', 'nosegear'])).toEqual({ ok: false, near: true })
    expect(checkNear('de-icin', ['de-icing', 'deicing'])).toEqual({ ok: false, near: true })
    expect(checkNear('deicing', ['de-icing', 'deicing'])).toEqual({ ok: true, near: false })
  })
})

describe('相似干扰项 buildSimCache / pickSimilar', () => {
  const pool = [
    w('a', 'runway', '跑道'),
    w('b', 'taxiway', '滑行道'),
    w('c', 'runaways', '逃跑者'),
    w('d', 'runwaylight', '跑道灯'),
    w('e', 'gate', '登机口'),
    w('f', 'cabin', '客舱'),
  ]
  it('scores similar spelling higher', () => {
    const cache = buildSimCache(pool)
    const cands = cache.get('a') ?? []
    expect(cands.length).toBeGreaterThan(0)
    const top = cands[0].id
    // runway 与 runaways/runwaylight 编辑距离小，应排前面
    expect(['c', 'd', 'b']).toContain(top)
  })
  it('pickSimilar returns unique values and excludes target', () => {
    const cache = buildSimCache(pool)
    const out = pickSimilar(pool[0], pool, (x) => x.cn, 3, cache)
    expect(out.length).toBeLessThanOrEqual(3)
    expect(out.some((o) => o.id === 'a')).toBe(false)
    const vals = out.map((o) => o.cn)
    expect(new Set(vals).size).toBe(vals.length)
  })
  it('makeQuestions always includes target among 4 options', () => {
    const qs = makeQuestions([pool[0]], 'cn2en', 1, pool)
    expect(qs[0].options).toHaveLength(4)
    expect(qs[0].options).toContain('runway')
    expect(qs[0].correctIndex).not.toBeUndefined()
  })
})
