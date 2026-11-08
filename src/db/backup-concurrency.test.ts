// 作者：Wangyuan；日期：2026-11-08。职责：备份两表快照与跨连接写入的真实交错。
import 'fake-indexeddb/auto'
import { expect, it, vi } from 'vitest'
import { AppDB, db, exportData } from './db'
import { emptyState } from '../lib/srs'

it('exports words and stats from the same snapshot while another connection commits', async () => {
  await db.words.clear(); await db.stats.clear()
  const id = 'synthetic-backup-item', date = '2030-01-01'
  await db.words.put(emptyState(id))
  await db.stats.put({ date, learned: 0, reviewed: 0, correct: 0, wrong: 0, quizDone: 0 })
  const peer = new AppDB()
  let writing: Promise<unknown> | undefined
  const readStats = db.stats.toArray.bind(db.stats)
  const spy = vi.spyOn(db.stats, 'toArray').mockImplementationOnce(() => {
    // The export has read words. The peer now queues an atomic two-table update.
    writing = peer.transaction('rw', peer.words, peer.stats, async () => {
      await peer.words.update(id, { reviewCount: 1 })
      await peer.stats.update(date, { reviewed: 1, correct: 1 })
    })
    return readStats()
  })
  try {
    const backup = JSON.parse(await exportData())
    expect(backup.words[0].reviewCount).toBe(0)
    expect(backup.stats[0].correct).toBe(0)
    await writing
    expect((await peer.words.get(id))!.reviewCount).toBe(1)
    expect((await peer.stats.get(date))!.correct).toBe(1)
  } finally { spy.mockRestore(); peer.close(); await db.delete() }
})
