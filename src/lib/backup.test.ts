import { describe, it, expect } from 'vitest'
import { parseBackup } from './backup'
import { emptyState } from './srs'
import words from '../data/words.json'
const make = () => ({ app: 'local-word-study', version: 1, words: [emptyState(words[0].id)], stats: [{ date: '2026-01-02', learned: 1, reviewed: 0, correct: 1, wrong: 0, quizDone: 0 }] })
describe('备份边界', () => {
  it('接受完整合成备份且保留记录', () => expect(parseBackup(JSON.stringify(make())).words[0].id).toBe(words[0].id))
  it('拒绝其他应用或版本', () => expect(() => parseBackup(JSON.stringify({ ...make(), version: 2 }))).toThrow())
  it('拒绝缺少表的残缺文件', () => expect(() => parseBackup(JSON.stringify({ app: 'local-word-study', version: 1, words: [] }))).toThrow())
  it('拒绝重复词条以避免隐式覆盖', () => { const d = make(); d.words.push(d.words[0]); expect(() => parseBackup(JSON.stringify(d))).toThrow() })
  it('拒绝未知词和负计数', () => { const d = make(); d.words[0].wrongCount = -1; expect(() => parseBackup(JSON.stringify(d))).toThrow(); d.words[0].wrongCount = 0; d.words[0].id = 'unknown'; expect(() => parseBackup(JSON.stringify(d))).toThrow() })
  it('拒绝无效日期及重复日期', () => { const d = make(); d.stats[0].date = '2026-02-30'; expect(() => parseBackup(JSON.stringify(d))).toThrow(); d.stats[0].date = '2026-02-28'; d.stats.push(d.stats[0]); expect(() => parseBackup(JSON.stringify(d))).toThrow() })
  it('拒绝损坏标签类型', () => { const d = make(); const broken = { ...d, words: [{ ...d.words[0], tags: 'not-an-array' }] }; expect(() => parseBackup(JSON.stringify(broken))).toThrow() })
  it('拒绝超限文件及非JSON', () => { expect(() => parseBackup(' '.repeat(2 * 1024 * 1024 + 1))).toThrow(); expect(() => parseBackup('<script>')).toThrow() })
})
