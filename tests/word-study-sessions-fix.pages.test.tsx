// 作者：Wangyuan；日期：2026-11-08。
import 'fake-indexeddb/auto'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { Settings, Word } from '../src/types'
import { db } from '../src/db/db'
import { useData, WORDS } from '../src/hooks/useData'
import { applyGrade, emptyState } from '../src/lib/srs'
import { Review } from '../src/pages/Review'
import { Quiz } from '../src/pages/Quiz'

// Exercise the real store, SRS, question generator and runners.
// IndexedDB runs in memory; only rewards, decorative UI and audio are isolated.
vi.mock('../src/data/words.json', () => ({
  default: ['alpha', 'bravo', 'charlie', 'delta', 'echo'].map((word, index): Word => ({
    id: `sessions-${index + 1}`,
    word,
    cn: `会话释义${index + 1}`,
    cat: '会话测试模块',
    phonetic: '',
    pos: '',
    example: '',
    mnemonic: '',
  })),
}))

vi.mock('../src/store/app', async () => {
  const { create } = await import('zustand')
  const settings: Settings = {
    dailyGoal: 10,
    autoSpeak: false,
    speakRate: 1,
    voice: 'us',
    theme: 'dark',
    newWordsPerSession: 5,
    quizCount: 5,
  }
  return {
    useApp: create(() => ({
      settings,
      recordXp: vi.fn(),
      recordConsec: vi.fn(),
      syncBadges: vi.fn(),
      recordQuiz: vi.fn(),
      markWrongCleared: vi.fn(),
    })),
  }
})

const alerts = vi.hoisted(() => ({ push: vi.fn() }))
vi.mock('../src/store/toast', () => ({
  useToast: { getState: () => ({ push: alerts.push }) },
}))

vi.mock('../src/lib/gamify', () => ({ xpForGrade: () => 0 }))

vi.mock('../src/lib/tts', () => ({
  speakWord: vi.fn(),
  stopSpeak: vi.fn(),
}))

vi.mock('../src/components/ui', () => ({
  SpeakButton: () => null,
  IconTile: () => null,
  EmptyState: ({ text, hint }: { text: string; hint: string }) => (
    <div><p>{text}</p><p>{hint}</p></div>
  ),
}))

vi.mock('../src/components/WordArt', () => ({ WordArt: () => null }))
vi.mock('../src/components/WordDetail', () => ({ WordDetail: () => null }))

beforeEach(async () => {
  vi.clearAllMocks()
  await db.words.clear()
  await db.stats.clear()
  const now = Date.now()
  useData.setState({
    ready: true,
    states: new Map(WORDS.map((word) => [word.id, {
      ...applyGrade(emptyState(word.id), 'good', now),
      nextReview: now + 30 * 24 * 3600 * 1000,
    }])),
    stats: new Map(),
  })
  await db.words.bulkPut([...useData.getState().states.values()])
  vi.spyOn(db.words, 'put')
})

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

async function makeDue(count: number) {
  const states = new Map(useData.getState().states)
  for (const word of WORDS.slice(0, count)) {
    states.set(word.id, { ...useData.getState().getState(word.id), nextReview: 0 })
  }
  useData.setState({ states })
  await db.words.bulkPut([...states.values()])
}

function optionButtons(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLButtonElement>('button[data-opt]'))
}

describe('word-study-sessions-fix: review queue snapshot', () => {
  it.each([2, 4])('reviews every word and reaches completion with %i due words', async (count) => {
    await makeDue(count)
    render(<Review />)
    fireEvent.click(screen.getByRole('button', { name: /^开始复习/ }))

    for (const [index, word] of WORDS.slice(0, count).entries()) {
      expect(screen.getByText(`${index + 1}/${count}`)).not.toBeNull()
      expect(screen.getByText(word.word)).not.toBeNull()
      await act(async () => { fireEvent.keyDown(window, { key: '3' }) })
      await waitFor(() => expect(useData.getState().getState(word.id).nextReview).toBeGreaterThan(Date.now()))
      expect(db.words.put).toHaveBeenNthCalledWith(index + 1, expect.objectContaining({
        id: word.id,
        lastGrade: 'good',
      }))
      expect(useData.getState().getState(word.id).nextReview).toBeGreaterThan(Date.now())
    }

    expect(db.words.put).toHaveBeenCalledTimes(count)
    expect(screen.getByRole('heading', { name: '本轮完成！' })).not.toBeNull()

    // Replaying a completed round must still have its original queue.
    fireEvent.click(screen.getByRole('button', { name: '再来一组' }))
    expect(screen.getByText(`1/${count}`)).not.toBeNull()
    expect(screen.getByText(WORDS[0]!.word)).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '退出' }))
    expect(screen.getByText('现在没有到期的单词')).not.toBeNull()
  })
})

describe('word-study-sessions-fix: independent quiz rounds', () => {
  it.each(['Quiz', 'Review'] as const)('%s can answer a one-word retry after a five-question round', async (page) => {
    await makeDue(5)
    const { container } = render(page === 'Quiz' ? <Quiz /> : <Review />)
    if (page === 'Review') {
      fireEvent.click(screen.getByRole('button', { name: '选择模块开始' }))
      fireEvent.click(screen.getByRole('button', { name: /全部模块/ }))
    } else {
      fireEvent.click(screen.getByRole('button', { name: /^开始测验/ }))
    }

    let wrongWord = WORDS[0]!
    for (let index = 0; index < 5; index++) {
      expect(screen.getByText(`${index + 1}/5`)).not.toBeNull()
      const prompt = screen.getByRole('heading', { level: 3 }).textContent
      const word = WORDS.find((candidate) => candidate.word === prompt)
      expect(word).toBeDefined()
      const options = optionButtons(container)
      expect(options).toHaveLength(4)
      expect(options.every((button) => !button.disabled)).toBe(true)
      const correctIndex = options.findIndex((button) => button.textContent?.includes(word!.cn))
      expect(correctIndex).toBeGreaterThanOrEqual(0)
      if (index === 0) wrongWord = word!
      const answerIndex = index === 0 ? (correctIndex + 1) % options.length : correctIndex
      fireEvent.click(options[answerIndex]!)
      await act(async () => { fireEvent.click(screen.getByRole('button', {
        name: index === 4 ? '查看结果' : '下一题',
      })) })
    }

    await waitFor(() => expect(screen.getByRole('button', { name: '再练一次错词' })).not.toBeNull())
    expect(db.words.put).toHaveBeenCalledTimes(5)
    expect([...useData.getState().states.values()]
      .filter((state) => state.wrongCount > 0)
      .map((state) => state.id)).toEqual([wrongWord.id])

    fireEvent.click(screen.getByRole('button', { name: '再练一次错词' }))
    expect(screen.getByText('1/1')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 3 }).textContent).toBe(wrongWord.word)
    expect(screen.queryByRole('button', { name: '再练一次错词' })).toBeNull()

    const retryOptions = optionButtons(container)
    expect(retryOptions).toHaveLength(4)
    expect(retryOptions.every((button) => !button.disabled)).toBe(true)
    const correctOption = retryOptions.find((button) => button.textContent?.includes(wrongWord.cn))
    expect(correctOption).toBeDefined()
    fireEvent.click(correctOption!)
    await act(async () => { fireEvent.click(screen.getByRole('button', { name: '查看结果' })) })

    await waitFor(() => expect(screen.getByRole('heading', { name: '太棒了！' })).not.toBeNull())
    expect(db.words.put).toHaveBeenCalledTimes(6)
    expect(db.words.put).toHaveBeenLastCalledWith(expect.objectContaining({
      id: wrongWord.id,
      lastGrade: 'good',
    }))
    expect(screen.getByRole('heading', { name: '太棒了！' })).not.toBeNull()
    expect(screen.getByText('/1')).not.toBeNull()
    expect(screen.queryByRole('button', { name: '再练一次错词' })).toBeNull()
  })
})


describe('transaction result integration', () => {
  it('keeps the current review card when storage fails and allows a successful retry', async () => {
    await makeDue(2)
    render(<Review />)
    fireEvent.click(screen.getByRole('button', { name: /^开始复习/ }))
    vi.mocked(db.words.put).mockRejectedValueOnce(new Error('synthetic disk failure'))
    await act(async () => { fireEvent.keyDown(window, { key: '3' }) })
    await waitFor(() => expect(alerts.push).toHaveBeenCalledTimes(1))
    expect(screen.getByText('1/2')).not.toBeNull()
    expect(useData.getState().getState(WORDS[0]!.id).nextReview).toBe(0)
    await act(async () => { fireEvent.keyDown(window, { key: '3' }) })
    await waitFor(() => expect(screen.getByText('2/2')).not.toBeNull())
    expect((await db.words.get(WORDS[0]!.id))!.nextReview).toBeGreaterThan(Date.now())
  })
})
