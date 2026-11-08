// 作者：Wangyuan；日期：2026-11-08。
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Scenarios } from './Scenarios'

const speech = vi.hoisted(() => ({
  speak: vi.fn<(text: string, options?: { rate?: number; onend?: () => void }) => void>(),
  stopSpeak: vi.fn(),
}))

vi.mock('../lib/tts', () => speech)
vi.mock('../store/app', () => ({
  useApp: (select: (state: { settings: { speakRate: number } }) => unknown) =>
    select({ settings: { speakRate: 1 } }),
}))
vi.mock('../data/scenarios.json', () => ({
  default: {
    agent: [
      [
        { speaker: '我方', zh: '甲一', en: 'A1' },
        { speaker: '对方', zh: '甲二', en: 'A2' },
      ],
      [
        { speaker: '我方', zh: '乙一', en: 'B1' },
        { speaker: '对方', zh: '乙二', en: 'B2' },
      ],
    ],
    atc: [],
    emergency: [],
    weather: [],
  },
}))

function endCallback(index: number) {
  const callback = speech.speak.mock.calls[index]?.[1]?.onend
  if (!callback) throw new Error(`Missing onend for speech call ${index}`)
  return callback
}

function begin() {
  const view = render(<Scenarios />)
  fireEvent.click(screen.getByRole('button', { name: /一起学习/ }))
  fireEvent.click(screen.getByRole('button', { name: '顺序播放本组' }))
  expect(speech.speak).toHaveBeenCalledTimes(1)
  expect(speech.speak).toHaveBeenLastCalledWith('A1', expect.objectContaining({ rate: 1 }))
  return { view, end: endCallback(0) }
}

function tick(ms: number) {
  act(() => { vi.advanceTimersByTime(ms) })
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  localStorage.clear()
})

afterEach(() => {
  cleanup()
  vi.clearAllTimers()
  vi.useRealTimers()
})

describe('word-study interactions: scenario playback sessions', () => {
  it('continues after 400 ms and restores the start button after completion', () => {
    const { end } = begin()
    act(() => { end() })
    tick(399)
    expect(speech.speak).toHaveBeenCalledTimes(1)
    tick(1)
    expect(speech.speak).toHaveBeenCalledTimes(2)
    expect(speech.speak).toHaveBeenLastCalledWith('A2', expect.any(Object))
    act(() => { endCallback(1)() })
    tick(400)
    expect(screen.getByRole('button', { name: '顺序播放本组' })).toBeTruthy()
    expect(speech.speak).toHaveBeenCalledTimes(2)
  })

  it('cancels a pending continuation and isolates an immediate restart from stale onend', () => {
    const { end: oldEnd } = begin()
    act(() => { oldEnd() })
    tick(200)
    fireEvent.click(screen.getByRole('button', { name: '停止播放' }))
    expect(vi.getTimerCount()).toBe(0)
    expect(speech.stopSpeak).toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '顺序播放本组' }))
    expect(speech.speak).toHaveBeenCalledTimes(2)
    expect(speech.speak).toHaveBeenLastCalledWith('A1', expect.any(Object))
    act(() => { oldEnd() })
    tick(400)
    expect(speech.speak).toHaveBeenCalledTimes(2)

    act(() => { endCallback(1)() })
    tick(400)
    expect(speech.speak).toHaveBeenCalledTimes(3)
    expect(speech.speak).toHaveBeenLastCalledWith('A2', expect.any(Object))
  })

  it.each(['下一组', '第 2 组'])('resets playback when switching with %s', (buttonName) => {
    const { end: oldEnd } = begin()
    act(() => { oldEnd() })
    tick(200)
    fireEvent.click(screen.getByRole('button', { name: buttonName }))
    expect(screen.queryByRole('button', { name: '停止播放' })).toBeNull()
    expect(screen.getByRole('button', { name: '顺序播放本组' })).toBeTruthy()
    expect(vi.getTimerCount()).toBe(0)
    act(() => { oldEnd() })
    tick(1000)
    expect(speech.speak).toHaveBeenCalledTimes(1)

    fireEvent.click(screen.getByRole('button', { name: '顺序播放本组' }))
    expect(speech.speak).toHaveBeenLastCalledWith('B1', expect.any(Object))
    act(() => { endCallback(1)() })
    tick(400)
    expect(speech.speak).toHaveBeenCalledTimes(3)
    expect(speech.speak).toHaveBeenLastCalledWith('B2', expect.any(Object))
  })

  it.each(['返回', '卸载'])('clears a pending continuation on %s', (exit) => {
    const { view, end } = begin()
    act(() => { end() })
    tick(200)
    if (exit === '返回') fireEvent.click(screen.getByRole('button', { name: '返回' }))
    else view.unmount()
    expect(vi.getTimerCount()).toBe(0)
    act(() => { end() })
    expect(vi.getTimerCount()).toBe(0)
    tick(1000)
    expect(speech.speak).toHaveBeenCalledTimes(1)
    expect(speech.stopSpeak).toHaveBeenCalled()
  })

  it('ignores an onend arriving only after unmount', () => {
    const { view, end } = begin()
    view.unmount()
    act(() => { end() })
    expect(vi.getTimerCount()).toBe(0)
    tick(1000)
    expect(speech.speak).toHaveBeenCalledTimes(1)
  })
})
