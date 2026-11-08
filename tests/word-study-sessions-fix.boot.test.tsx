// 作者：Wangyuan；日期：2026-11-08。
import { expect, it, vi } from 'vitest'
import { act, within } from '@testing-library/react'

const harness = vi.hoisted(() => ({
  load: vi.fn<() => Promise<void>>(),
  root: null as import('react-dom/client').Root | null,
}))

// Capture the real root so the entry-point side effect can be cleaned up.
vi.mock('react-dom/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('react-dom/client')>()
  return {
    ...actual,
    createRoot: (...args: Parameters<typeof actual.createRoot>) => {
      const root = actual.createRoot(...args)
      harness.root = root
      return root
    },
  }
})

vi.mock('../src/hooks/useData', () => ({
  useData: (select: (state: { ready: boolean; load: () => Promise<void> }) => unknown) => (
    select({ ready: false, load: harness.load })
  ),
}))

vi.mock('../src/store/app', () => {
  const state = { settings: { theme: 'dark', voice: 'us' } }
  return {
    useApp: Object.assign(
      (select: (value: typeof state) => unknown) => select(state),
      {
        getState: () => state,
        subscribe: vi.fn(() => () => {}),
      },
    ),
    applyTheme: vi.fn(),
  }
})

vi.mock('../src/lib/tts', () => ({
  loadVoices: vi.fn(),
  setGlobalVoice: vi.fn(),
}))

vi.mock('../src/App.tsx', () => ({
  default: () => <div data-testid="sessions-boot-app" />,
}))

it('word-study-sessions-fix: replaces the initial loading screen when load rejects', async () => {
  let rejectLoad!: (reason?: unknown) => void
  const pending = new Promise<void>((_resolve, reject) => {
    rejectLoad = reject
  })
  harness.load.mockReturnValue(pending)
  const container = document.createElement('div')
  container.id = 'root'
  document.body.appendChild(container)

  try {
    await act(async () => {
      await import('../src/main.tsx')
    })
    const view = within(container)
    expect(harness.load).toHaveBeenCalled()
    expect(view.getByText('正在起飞…')).not.toBeNull()
    expect(view.queryByText('本地数据库初始化失败')).toBeNull()

    await act(async () => {
      rejectLoad(new Error('storage disabled'))
      await pending.catch(() => undefined)
    })

    expect(view.getByText('本地数据库初始化失败')).not.toBeNull()
    expect(view.queryByText('正在起飞…')).toBeNull()
    expect(view.queryByTestId('sessions-boot-app')).toBeNull()
  } finally {
    act(() => { harness.root?.unmount() })
    harness.root = null
    container.remove()
  }
})
