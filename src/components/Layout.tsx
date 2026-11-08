import { useMemo, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { WORDS, useData } from '../hooks/useData'
import { useApp } from '../store/app'
import { useToast } from '../store/toast'
import { isDue, isNew } from '../lib/srs'
import { Icon, Home, BookOpen, RefreshCw, PenLine, Keyboard, Headphones, FolderOpen, BarChart3, Settings, Plane, ChevronLeft, ChevronRight, Database, Languages, Search } from './icons'

const NAV: { to: string; label: string; icon: typeof Home; badge?: 'due' | 'fresh' }[] = [
  { to: '/', label: '首页', icon: Home },
  { to: '/study', label: '学新词', icon: BookOpen, badge: 'fresh' },
  { to: '/review', label: '复习', icon: RefreshCw, badge: 'due' },
  { to: '/quiz', label: '测验', icon: PenLine },
  { to: '/typing', label: '打字练习', icon: Keyboard },
  { to: '/scenarios', label: '情景跟读', icon: Headphones },
  { to: '/words', label: '词库', icon: FolderOpen },
  { to: '/stats', label: '统计', icon: BarChart3 },
  { to: '/settings', label: '设置', icon: Settings },
]
const TABS: { to: string; label: string; icon: typeof Home }[] = [
  { to: '/', label: '首页', icon: Home },
  { to: '/study', label: '学习', icon: BookOpen },
  { to: '/quiz', label: '测验', icon: PenLine },
  { to: '/words', label: '词库', icon: FolderOpen },
  { to: '/stats', label: '统计', icon: BarChart3 },
]
const TITLES: Record<string, string> = {
  '/': '首页', '/study': '学新词', '/review': '复习', '/quiz': '测验',
  '/typing': '打字练习', '/scenarios': '情景跟读', '/words': '词库',
  '/stats': '统计', '/settings': '设置',
}

function Badge({ n }: { n: number }) {
  if (n <= 0) return null
  return (
    <span className="ml-auto min-w-[20px] h-5 px-1.5 rounded-full bg-gradient-to-r from-[#22d3ee] via-[#6366f1] to-[#a855f7] text-white text-[11px] font-bold inline-flex items-center justify-center shadow-[0_0_10px_rgba(99,102,241,0.55)]">
      {n > 99 ? '99+' : n}
    </span>
  )
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <div
      className="relative shrink-0 rounded-2xl flex items-center justify-center text-white"
      style={{
        width: size, height: size,
        background: 'linear-gradient(140deg, #22d3ee 0%, #6366f1 55%, #a855f7 100%)',
        boxShadow: '0 6px 22px rgba(99,102,241,0.5), 0 0 18px rgba(77,201,255,0.28), inset 0 1px 0 rgba(255,255,255,0.5)',
      }}
    >
      <Plane size={size * 0.52} strokeWidth={2.2} />
      <span className="sheen-layer" />
    </div>
  )
}

function VoiceToggle({ compact = false }: { compact?: boolean }) {
  const voice = useApp((s) => s.settings.voice)
  const setSettings = useApp((s) => s.setSettings)
  const toast = useToast((s) => s.push)
  const us = voice === 'us'
  return (
    <button
      onClick={() => {
        setSettings({ voice: us ? 'uk' : 'us' })
        toast(us ? '已切换为英音（UK）' : '已切换为美音（US）')
      }}
      className={compact
        ? 'w-9 h-9 rounded-xl flex items-center justify-center text-[var(--txt-dim)] active:scale-90 transition-transform hover:text-[var(--cyan)]'
        : 'flex items-center gap-2 w-full px-3 py-2 rounded-xl text-[13px] font-semibold border border-white/10 bg-white/4 text-[var(--txt-dim)] hover:border-[rgba(56,225,255,0.4)] hover:text-[var(--cyan)] transition-all active:scale-[0.98]'}
      title={us ? '当前美音，点击切换英音' : '当前英音，点击切换美音'}
      aria-label="切换发音口音"
    >
      <Icon icon={Languages} size={compact ? 18 : 16} strokeWidth={2} />
      {!compact && <span>{us ? '美音（US）' : '英音（UK）'}</span>}
      {!compact && (
        <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-md ${us ? 'bg-[rgba(56,225,255,0.15)] text-[var(--cyan)]' : 'bg-[rgba(157,123,255,0.15)] text-[var(--violet)]'}`}>
          {us ? '设备离线语音' : 'TTS'}
        </span>
      )}
    </button>
  )
}

export function Layout() {
  const loc = useLocation()
  const nav = useNavigate()
  const [q, setQ] = useState('')
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('aviation_pro_side') === '1' } catch { return false }
  })
  const toggleSide = () => setCollapsed((v) => {
    try { localStorage.setItem('aviation_pro_side', v ? '0' : '1') } catch {}
    return !v
  })
  const states = useData((s) => s.states)
  const { due, fresh } = useMemo(() => {
    const now = Date.now()
    let due = 0, fresh = 0
    for (const w of WORDS) {
      const st = states.get(w.id)
      if (!st) { fresh += 1; continue }
      if (isNew(st)) fresh += 1
      else if (isDue(st, now)) due += 1
    }
    return { due, fresh }
  }, [states])

  const title = TITLES[loc.pathname] ?? '词语练习'
  const isTabPage = TABS.some((t) => t.to === loc.pathname)

  return (
    <div className="md:flex min-h-dvh">
      {/* 桌面侧栏 */}
      <aside className={`hidden md:flex flex-col ${collapsed ? 'w-[68px] px-2' : 'w-60 px-4'} shrink-0 sticky top-0 h-dvh py-6 gap-1 border-r border-white/8 bg-black/15 backdrop-blur-xl transition-[width] duration-300 ease-out overflow-visible`}>
        <button
          onClick={toggleSide}
          aria-label={collapsed ? '展开侧栏' : '折叠侧栏'}
          title={collapsed ? '展开侧栏' : '折叠侧栏'}
          className="absolute -right-3 top-6 z-20 w-7 h-7 rounded-full flex items-center justify-center text-[var(--txt-dim)] bg-[var(--bg-1)] border border-white/15 shadow-[0_4px_14px_rgba(0,0,0,0.45)] hover:text-[var(--cyan)] hover:border-[rgba(56,225,255,0.45)] transition-all active:scale-90"
        >
          <Icon icon={collapsed ? ChevronRight : ChevronLeft} size={15} strokeWidth={2.4} />
        </button>
        <div className={`flex items-center gap-3 mb-5 ${collapsed ? 'justify-center px-0' : 'px-3'}`}>
          <LogoMark size={collapsed ? 34 : 40} />
          {!collapsed && (
            <div>
              <div className="font-extrabold text-lg leading-tight tracking-tight">
                词语 <span className="neon-text">Pro</span>
              </div>
              <div className="text-[11px] text-[var(--txt-faint)]">离线单词练习 · 智能记忆</div>
            </div>
          )}
        </div>
        {!collapsed && (
        <form
          className="relative mb-3"
          onSubmit={(e) => {
            e.preventDefault()
            nav(`/words?q=${encodeURIComponent(q.trim())}`)
          }}
        >
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--txt-faint)] pointer-events-none"><Icon icon={Search} size={15} /></span>
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索单词 / 中文…"
            className="w-full pl-9 pr-3 py-2 rounded-xl outline-none border border-white/10 bg-white/5 text-[13px] placeholder:text-[var(--txt-faint)] focus:border-[rgba(56,225,255,0.5)] focus:bg-white/8 transition-colors"
            aria-label="全局搜索单词"
          />
        </form>
        )}
        {NAV.map((n) => (
          <NavLink
            key={n.to} to={n.to} end={n.to === '/'}
            className={({ isActive }) =>
              `flex items-center ${collapsed ? 'justify-center px-0' : 'gap-3 px-3'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                isActive
                  ? 'relative bg-gradient-to-r from-[rgba(34,211,238,0.16)] via-[rgba(99,102,241,0.15)] to-[rgba(168,85,247,0.10)] text-[var(--cyan)] border border-[rgba(99,102,241,0.45)] shadow-[0_4px_18px_rgba(99,102,241,0.20)] before:content-[""] before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2 before:w-[3px] before:h-6 before:rounded-full before:bg-gradient-to-b before:from-[#22d3ee] before:to-[#a855f7] before:shadow-[0_0_10px_rgba(99,102,241,0.8)]'
                  : 'text-[var(--txt-dim)] hover:bg-white/6 hover:text-[var(--txt)] border border-transparent'
              }`}
          >
            <Icon icon={n.icon} size={19} />
            {!collapsed && <span>{n.label}</span>}
            {!collapsed && n.badge === 'due' && <Badge n={due} />}
            {!collapsed && n.badge === 'fresh' && <Badge n={fresh} />}
          </NavLink>
        ))}
        <div className={`mt-auto pt-4 flex flex-col gap-2 ${collapsed ? 'items-center px-0' : 'px-3'}`}>
          <VoiceToggle compact={collapsed} />
          {!collapsed && (
            <div className="text-[11px] text-[var(--txt-faint)] leading-relaxed">
              <div className="flex items-center gap-1.5 mb-1"><Icon icon={Database} size={12} />本机词库 · 合成示例</div>
              数据保存在本机浏览器
            </div>
          )}
        </div>
      </aside>

      {/* 主区 */}
      <div className="flex-1 flex flex-col min-w-0 min-h-dvh">
        {/* 移动顶栏 */}
        <header className="md:hidden sticky top-0 z-40 px-4 h-14 flex items-center gap-2 bg-[color-mix(in_srgb,var(--bg-0)_82%,transparent)] backdrop-blur-xl border-b border-white/8 relative after:content-[''] after:absolute after:left-0 after:right-0 after:bottom-[-1px] after:h-px after:bg-gradient-to-r after:from-transparent after:via-[rgba(77,201,255,0.5)] after:to-transparent after:pointer-events-none">
          {!isTabPage && (
            <button className="w-9 h-9 rounded-xl flex items-center justify-center text-[var(--txt-dim)] active:scale-90 transition-transform" onClick={() => nav(-1)} aria-label="返回">
              <Icon icon={ChevronLeft} size={22} strokeWidth={2.4} />
            </button>
          )}
          <h1 className="text-[17px] font-extrabold tracking-tight">{title}</h1>
          <div className="ml-auto flex items-center gap-2">
            <VoiceToggle compact />
            <LogoMark size={28} />
            <span className="text-sm font-extrabold tracking-tight neon-text">词语练习</span>
          </div>
        </header>

        <main className="flex-1 w-full max-w-4xl mx-auto px-4 pt-4 md:pt-8 pb-28 md:pb-12">
          <Outlet />
        </main>
      </div>

      {/* 移动底部 Tab */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 pb-[env(safe-area-inset-bottom)] bg-[color-mix(in_srgb,var(--bg-1)_90%,transparent)] backdrop-blur-xl border-t border-white/8">
        <div className="grid grid-cols-5">
          {TABS.map((t) => (
            <NavLink
              key={t.to} to={t.to} end={t.to === '/'}
              className={({ isActive }) =>
                `relative flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors ${
                  isActive
                    ? 'text-[#bdeaff] after:content-[""] after:absolute after:-top-[7px] after:left-1/2 after:-translate-x-1/2 after:w-6 after:h-[2.5px] after:rounded-full after:bg-gradient-to-r after:from-[#22d3ee] after:to-[#a855f7] after:shadow-[0_0_12px_rgba(77,201,255,0.9)]'
                    : 'text-[var(--txt-faint)]'}`}
            >
              {({ isActive }) => (
                <>
                  <span className={`flex items-center justify-center h-8 px-4 rounded-xl transition-all ${
                    isActive
                      ? 'bg-gradient-to-br from-[rgba(34,211,238,0.18)] via-[rgba(139,123,255,0.24)] to-[rgba(168,85,247,0.20)] border border-[rgba(77,201,255,0.4)] shadow-[0_0_16px_rgba(77,201,255,0.28)]'
                      : ''
                  }`}>
                    <Icon icon={t.icon} size={21} strokeWidth={isActive ? 2.2 : 2} className={isActive ? 'drop-shadow-[0_0_5px_rgba(77,201,255,0.65)]' : ''} />
                  </span>
                  <span>{t.label}</span>
                  {(t.to === '/study' && fresh > 0) || (t.to === '/review' && due > 0) ? (
                    <span className="absolute top-1 right-[22%] w-2 h-2 rounded-full bg-[var(--bad)] border-2 border-[var(--bg-1)]" />
                  ) : null}
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  )
}
