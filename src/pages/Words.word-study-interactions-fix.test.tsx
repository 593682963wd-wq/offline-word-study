// 作者：Wangyuan；日期：2026-11-08。
import { cleanup, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, useLocation } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Words } from './Words'

const actions = vi.hoisted(() => ({
  toggleFavorite: vi.fn(),
  speak: vi.fn(),
  speakWord: vi.fn(),
  stopSpeak: vi.fn(),
}))

vi.mock('../lib/tts', () => ({
  speak: actions.speak,
  speakWord: actions.speakWord,
  stopSpeak: actions.stopSpeak,
}))
vi.mock('../lib/srs', () => ({
  isMastered: () => false,
  isNew: () => true,
  inWrongBook: () => false,
}))
vi.mock('../hooks/useData', () => {
  const words = [
    { id: 'alpha-id', word: 'alpha', cn: '甲', cat: 'test', phonetic: '', pos: '', example: '', mnemonic: '' },
    { id: 'beta-id', word: 'beta', cn: '乙', cat: 'test', phonetic: '', pos: '', example: '', mnemonic: '' },
  ]
  const data = {
    states: new Map(),
    getState: () => ({ favorite: 0, wrongCount: 0 }),
    toggleFavorite: actions.toggleFavorite,
  }
  return {
    WORDS: words,
    CATS: [{ key: 'test', label: '测试', icon: 'book' }],
    useData: (select?: (value: typeof data) => unknown) => select ? select(data) : data,
  }
})
vi.mock('../components/StudyFlow', () => ({ StudyFlow: () => null }))
vi.mock('../components/WordArt', () => ({ WordArt: () => null }))
vi.mock('../components/WordDetail', () => ({
  WordDetail: ({ id }: { id: string }) => <div role="dialog" aria-label="词条详情">{id}</div>,
}))

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="测试位置">{location.pathname}{location.search}</output>
}

function mount(entry = '/words') {
  return render(
    <MemoryRouter initialEntries={[entry]}>
      <Words />
      <LocationProbe />
    </MemoryRouter>,
  )
}

function currentEntry() {
  const entry = screen.getByLabelText('测试位置').textContent
  if (!entry) throw new Error('Missing router location')
  return entry
}

function alphaRow() {
  const row = screen.getByText('alpha').closest<HTMLElement>('[role="button"]')
  if (!row) throw new Error('Missing alpha row')
  return row
}

beforeEach(() => { vi.clearAllMocks() })
afterEach(() => { cleanup() })

describe('word-study interactions: search URL', () => {
  it.each(['button', 'input'])('removes q through %s clearing and stays cleared after remount', async (method) => {
    const user = userEvent.setup()
    const view = mount('/words?keep=1')
    const input = screen.getByPlaceholderText('搜索单词 / 中文 / 音标…') as HTMLInputElement
    await user.type(input, 'alpha')
    expect(input.value).toBe('alpha')
    expect(screen.queryByText('beta')).toBeNull()
    let params = new URL(currentEntry(), 'https://offline.invalid').searchParams
    expect(params.get('q')).toBe('alpha')
    expect(params.get('keep')).toBe('1')

    if (method === 'button') await user.click(screen.getByRole('button', { name: '清空' }))
    else await user.clear(input)
    expect(input.value).toBe('')
    expect(screen.getByText('alpha')).toBeTruthy()
    expect(screen.getByText('beta')).toBeTruthy()
    const reloadEntry = currentEntry()
    params = new URL(reloadEntry, 'https://offline.invalid').searchParams
    expect(params.has('q')).toBe(false)
    expect(params.get('keep')).toBe('1')

    view.unmount()
    mount(reloadEntry)
    const reloadedInput = screen.getByPlaceholderText('搜索单词 / 中文 / 音标…') as HTMLInputElement
    expect(reloadedInput.value).toBe('')
    expect(screen.getByText('alpha')).toBeTruthy()
    expect(screen.getByText('beta')).toBeTruthy()
  })
})

describe('word-study interactions: nested keyboard controls', () => {
  it.each(['{Enter}', ' '])('allows native pronunciation and favorite activation with %j', async (key) => {
    const user = userEvent.setup()
    mount()
    alphaRow().focus()
    await user.tab()
    expect(document.activeElement).toBe(screen.getAllByRole('button', { name: '播放发音' })[0])
    await user.keyboard(key)
    expect(actions.speakWord).toHaveBeenCalledTimes(1)
    expect(actions.speakWord).toHaveBeenCalledWith(expect.objectContaining({ id: 'alpha-id' }), { rate: 0.92 })
    expect(screen.queryByRole('dialog')).toBeNull()

    await user.tab()
    expect(document.activeElement).toBe(screen.getAllByRole('button', { name: /^收藏$/ })[0])
    await user.keyboard(key)
    expect(actions.toggleFavorite).toHaveBeenCalledExactlyOnceWith('alpha-id')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it.each(['{Enter}', ' '])('still opens details when the row itself receives %j', async (key) => {
    const user = userEvent.setup()
    mount()
    const row = alphaRow()
    row.focus()
    expect(document.activeElement).toBe(row)
    await user.keyboard(key)
    expect(screen.getByRole('dialog', { name: '词条详情' }).textContent).toBe('alpha-id')
    expect(actions.toggleFavorite).not.toHaveBeenCalled()
    expect(actions.speakWord).not.toHaveBeenCalled()
  })
})
