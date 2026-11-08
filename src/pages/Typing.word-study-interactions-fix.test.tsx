// 作者：Wangyuan；日期：2026-11-08。
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Typing } from './Typing'

const speech = vi.hoisted(() => ({ speak: vi.fn(), stopSpeak: vi.fn() }))

vi.mock('../lib/tts', () => speech)
vi.mock('../lib/srs', () => ({ inWrongBook: () => false }))
vi.mock('../store/app', () => {
  const state = { settings: { speakRate: 1, autoSpeak: false } }
  return {
    useApp: Object.assign(
      (select: (value: typeof state) => unknown) => select(state),
      { getState: () => state },
    ),
  }
})
vi.mock('../hooks/useData', () => {
  const words = [
    { id: 'phrase', word: "ab-c d'", cn: '短语', cat: 'test', phonetic: '', pos: '', example: '', mnemonic: '' },
    { id: 'second', word: 'ef', cn: '第二词', cat: 'test', phonetic: '', pos: '', example: '', mnemonic: '' },
  ]
  const data = {
    states: new Map(),
    getState: () => ({ favorite: 0 }),
  }
  return {
    WORDS: words,
    CATS: [{ key: 'test', label: '测试', icon: 'book' }],
    useData: (select?: (value: typeof data) => unknown) => select ? select(data) : data,
  }
})

function begin() {
  render(<Typing />)
  fireEvent.click(screen.getByRole('button', { name: '开始打字（2 词）' }))
  expect(screen.getByText('短语')).toBeTruthy()
}

function press(key: string) {
  fireEvent.keyDown(window, { key })
}

function tick(ms: number) {
  act(() => { vi.advanceTimersByTime(ms) })
}

function expectWpm(value: string) {
  expect(screen.getByText('练习完成！')).toBeTruthy()
  expect(screen.getByText('WPM 速度').previousElementSibling?.textContent).toBe(value)
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00Z'))
  vi.clearAllMocks()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
})

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

describe('word-study interactions: typing WPM', () => {
  it.each(['button', 'space'])('reports zero when every word is skipped using %s', (method) => {
    begin()
    tick(6000)
    for (let i = 0; i < 2; i += 1) {
      if (method === 'button') fireEvent.click(screen.getByRole('button', { name: '跳过本词' }))
      else press(' ')
    }
    expectWpm('0')
    expect(screen.getByText('6 秒 · 跳过 2 词')).toBeTruthy()
    expect(speech.speak).not.toHaveBeenCalled()
  })

  it('counts only net correct letters, excluding errors, punctuation and spaces, and resets on retry', () => {
    begin()
    tick(5000)
    for (const key of ['A', 'x', 'Backspace', 'a', 'b', '-', 'Backspace', '-', 'c', ' ', 'Backspace', ' ', 'd', "'"]) {
      press(key)
    }
    tick(220)
    expect(screen.getByText('第二词')).toBeTruthy()
    tick(780)
    fireEvent.click(screen.getByRole('button', { name: '跳过本词' }))

    // Four net correct letters in six seconds produce 8 WPM.
    expectWpm('8')
    expect(screen.getByText('打错次数').previousElementSibling?.textContent).toBe('1')
    expect(screen.getByText('6 秒 · 跳过 1 词')).toBeTruthy()

    fireEvent.click(screen.getByRole('button', { name: '再练一轮' }))
    expect(screen.getByText('短语')).toBeTruthy()
    tick(6000)
    fireEvent.click(screen.getByRole('button', { name: '跳过本词' }))
    fireEvent.click(screen.getByRole('button', { name: '跳过本词' }))
    expectWpm('0')
    expect(screen.getByText('打错次数').previousElementSibling?.textContent).toBe('0')
  })

  it('retains only the net letters actually entered before a partial skip', () => {
    begin()
    tick(5780)
    press('a')
    press('b')
    press('Backspace')
    press(' ')
    expect(screen.getByText('第二词')).toBeTruthy()
    press('e')
    press('f')
    tick(220)

    // One retained letter from the skipped word plus two completed letters.
    expectWpm('6')
    expect(screen.getByText('6 秒 · 跳过 1 词')).toBeTruthy()
  })
})
