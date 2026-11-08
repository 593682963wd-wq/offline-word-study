import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { CATS, WORDS, useData } from '../hooks/useData'
import { useApp } from '../store/app'
import { inWrongBook, isDue, isMastered, isNew } from '../lib/srs'
import { greeting, todayStr } from '../lib/utils'
import { ProgressRing, IconTile } from '../components/ui'
import { Icon, BookOpen, RefreshCw, PenLine, Keyboard, Headphones, FolderOpen, Flame, Clock, Target, Heart, Medal, BadgeCheck, ChevronRight, Sparkles, BarChart3, CircleAlert, Lock, Trophy, Layers, ArrowRight } from '../components/icons'
import { BADGE_ICONS, CAT_ICONS } from '../components/icons'
import type { LucideIcon } from 'lucide-react'
import { BADGES, xpProgress } from '../lib/gamify'

const QUICK: { to: string; icon: LucideIcon; label: string; sub: string; tone: 'cyan' | 'violet' | 'green' | 'amber' | 'rose' | 'blue'; accent?: boolean }[] = [
  { to: '/study', icon: BookOpen, label: '学新词', sub: '按间隔复习', tone: 'cyan', accent: true },
  { to: '/review', icon: RefreshCw, label: '复习', sub: '到期单词巩固', tone: 'blue' },
  { to: '/quiz', icon: PenLine, label: '测验', sub: '多种题型', tone: 'violet' },
  { to: '/typing', icon: Keyboard, label: '打字', sub: '拼写肌肉记忆', tone: 'green' },
  { to: '/scenarios', icon: Headphones, label: '情景跟读', sub: '合成对话', tone: 'amber' },
  { to: '/words', icon: FolderOpen, label: '词库', sub: '合成示例词库', tone: 'rose' },
]

export function Home() {
  const data = useData()
  const states = useData((s) => s.states)
  const settings = useApp((s) => s.settings)
  const gamify = useApp((s) => s.gamify)
  const now = Date.now()

  const { freshCount, dueWords, masteredCount, wrongCount, favCount } = useMemo(() => {
    let freshCount = 0, masteredCount = 0, wrongCount = 0, favCount = 0
    const dueWords: typeof WORDS = []
    for (const w of WORDS) {
      const st = data.getState(w.id)
      if (isNew(st)) freshCount += 1
      else if (isDue(st, now)) dueWords.push(w)
      if (isMastered(st)) masteredCount += 1
      if (inWrongBook(st)) wrongCount += 1
      if (st.favorite) favCount += 1
    }
    return { freshCount, dueWords, masteredCount, wrongCount, favCount }
  }, [data, states, now])

  const catStats = useMemo(() => {
    const m = new Map<string, { key: string; label: string; total: number; done: number; fresh: number }>()
    for (const w of WORDS) {
      const c = m.get(w.cat) ?? { key: w.cat, label: w.cat, total: 0, done: 0, fresh: 0 }
      c.total += 1
      const st = data.getState(w.id)
      if (isNew(st)) c.fresh += 1
      else if (!isMastered(st)) c.done += 1
      else c.done += 1
      m.set(w.cat, c)
    }
    return [...m.values()].sort((a, b) => CATS.findIndex((c) => c.key === a.key) - CATS.findIndex((c) => c.key === b.key))
  }, [data, states])

  const stat = data.statToday()
  const doneToday = stat.learned + stat.reviewed
  const goal = settings.dailyGoal
  const progress = goal > 0 ? doneToday / goal : 1
  const streak = data.streakDays()
  const allDone = freshCount === 0 && dueWords.length === 0
  const totalLearned = WORDS.length - freshCount
  const acc = stat.correct + stat.wrong > 0
    ? Math.round((stat.correct / Math.max(1, stat.correct + stat.wrong)) * 100)
    : 0

  return (
    <div className="flex flex-col gap-4 anim-in">
      {/* Hero */}
      <section className="glass p-5 sm:p-6 relative overflow-hidden scan-card">
        <div className="absolute -top-16 -right-16 w-52 h-52 rounded-full bg-[rgba(56,225,255,0.10)] blur-2xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-10 w-44 h-44 rounded-full bg-[rgba(157,123,255,0.10)] blur-2xl pointer-events-none" />
        <div className="absolute top-3 right-4 text-[10px] font-bold tracking-[0.28em] uppercase text-[rgba(56,225,255,0.5)] select-none">SYSTEM ONLINE</div>
        <div className="flex items-center gap-5 flex-wrap">
          <ProgressRing value={progress} size={116} stroke={11} label={`${doneToday}`} sub={`/ ${goal}`} />
          <div className="flex-1 min-w-[180px]">
            <div className="text-sm text-[var(--txt-dim)]">{greeting()}，今天是 {todayStr().replace(/-/g, ' / ')}</div>
            <h2 className="text-xl sm:text-2xl font-extrabold mt-1 tracking-tight">
              {allDone ? (
                <span className="neon-text inline-flex items-center gap-2"><Sparkles size={22} />今日任务全部完成！</span>
              ) : progress >= 1 ? (
                <span className="neon-text">已达成今日目标，继续巩固！</span>
              ) : '今天也要记得单词呀'}
            </h2>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip !text-xs"><Icon icon={Flame} size={14} className="text-[var(--warn)]" /> 连续 {streak} 天</span>
              <span className="chip !text-xs !border-[rgba(255,199,89,0.4)] !text-[var(--gold)]"><Icon icon={Trophy} size={14} /> Lv.{xpProgress(gamify.xp).level} · {gamify.xp} XP</span>
              <span className="chip !text-xs"><Icon icon={BookOpen} size={14} className="text-[var(--cyan)]" /> 已学 {totalLearned}/{WORDS.length}</span>
              <span className="chip !text-xs"><Icon icon={Clock} size={14} className="text-[var(--warn)]" /> 到期 {dueWords.length}</span>
              <span className="chip !text-xs"><Icon icon={Target} size={14} className="text-[var(--good)]" /> 今日正确率 {acc}%</span>
            </div>
          </div>
        </div>
        {progress < 1 && (
          <div className="mt-4">
            <div className="progress-track h-2.5"><div className="progress-fill" style={{ width: `${Math.min(100, progress * 100)}%` }} /></div>
            <div className="text-[11px] text-[var(--txt-faint)] mt-1.5">距离今日目标还差 {Math.max(0, goal - doneToday)} 词</div>
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-white/8 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex-1 min-w-0">
            <div className="text-[12px] text-[var(--txt-dim)]">今日目标：复习 {dueWords.length} 个到期词 + 新学 {freshCount} 个，共 {dueWords.length + freshCount} 个</div>
            <div className="text-[11px] text-[var(--txt-faint)] mt-0.5">按记忆曲线安排 · 答错自动进错词本</div>
          </div>
          {dueWords.length > 0 ? (
            <Link to="/review" className="btn btn-primary !px-6 !py-3 shrink-0 inline-flex items-center justify-center gap-2">
              <Icon icon={RefreshCw} size={17} /> 开始今日学习
            </Link>
          ) : freshCount > 0 ? (
            <Link to="/study" className="btn btn-primary !px-6 !py-3 shrink-0 inline-flex items-center justify-center gap-2">
              <Icon icon={BookOpen} size={17} /> 开始今日学习
            </Link>
          ) : (
            <span className="btn btn-ghost !px-6 !py-3 shrink-0 inline-flex items-center justify-center gap-2 opacity-60 cursor-not-allowed">
              <Icon icon={Sparkles} size={17} /> 今日任务全部完成
            </span>
          )}
        </div>
      </section>

      {/* 快捷入口 */}
      <section className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {QUICK.map((q, i) => (
          <Link
            key={q.to} to={q.to}
            className={`glass p-4 flex flex-col gap-1 transition-all hover:brightness-115 active:scale-[0.97] anim-in scan-card ${q.accent ? '!bg-[rgba(56,225,255,0.07)]' : ''}`}
            style={{ animationDelay: `${i * 40}ms` }}
          >
            <IconTile icon={q.icon} size={21} box={42} tone={q.tone} />
            <span className="font-bold text-[15px] mt-1.5">{q.label}</span>
            <span className="text-xs text-[var(--txt-faint)]">{q.sub}</span>
            {q.to === '/study' && freshCount > 0 && <span className="text-[11px] font-bold text-[var(--cyan)]">还有 {freshCount} 个新词</span>}
            {q.to === '/review' && dueWords.length > 0 && <span className="text-[11px] font-bold text-[var(--warn)]">{dueWords.length} 个待复习</span>}
          </Link>
        ))}
      </section>

      {/* 我的徽章 */}
      <section className="glass p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold inline-flex items-center gap-2"><Icon icon={Medal} size={17} className="text-[var(--gold)]" /> 我的徽章</h3>
          <Link to="/stats" className="text-xs text-[var(--cyan)] font-semibold inline-flex items-center gap-0.5">全部成就 <Icon icon={ChevronRight} size={13} /></Link>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2.5">
          {BADGES.slice(0, 6).map((b) => {
            const on = gamify.badges.includes(b.id)
            const BIcon = BADGE_ICONS[b.icon] ?? Trophy
            return (
              <div key={b.id} title={`${b.name}：${b.desc}`}
                className={`rounded-2xl p-3 flex flex-col items-center gap-1.5 text-center border transition-all ${
                  on
                    ? 'bg-[rgba(255,199,89,0.07)] border-[rgba(255,199,89,0.35)]'
                    : 'bg-white/3 border-white/6 opacity-55'
                }`}>
                <Icon icon={on ? BIcon : Lock} size={22} className={on ? 'text-[var(--gold)]' : 'text-[var(--txt-faint)]'} />
                <span className={`text-[11px] font-bold leading-tight ${on ? 'text-[var(--gold)]' : 'text-[var(--txt-dim)]'}`}>{b.name}</span>
                <span className="text-[10px] leading-snug text-[var(--txt-faint)] line-clamp-2">{b.desc}</span>
              </div>
            )
          })}
        </div>
      </section>


      {/* 按模块学习（融合 Flash 首页模块网格） */}
      <section className="glass p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold inline-flex items-center gap-2"><Icon icon={Layers} size={17} className="text-[var(--violet)]" /> 按模块学习</h3>
          <Link to="/study" className="text-xs text-[var(--cyan)] font-semibold inline-flex items-center gap-0.5">全部模块 <Icon icon={ChevronRight} size={13} /></Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
          {catStats.slice(0, 8).map((c, i) => {
            const cat = CATS.find((x) => x.key === c.key)
            const pct = c.total ? Math.round((c.done / c.total) * 100) : 0
            const tone = (['cyan', 'blue', 'violet', 'green', 'amber', 'rose'] as const)[i % 6]
            return (
              <Link
                key={c.key} to="/study"
                className="rounded-2xl p-3.5 border border-white/8 bg-white/3 hover:border-[rgba(56,225,255,0.35)] hover:bg-white/5 transition-all active:scale-[0.97]"
              >
                <div className="flex items-center gap-2">
                  <IconTile icon={CAT_ICONS[cat?.icon ?? ''] ?? BookOpen} size={16} box={34} tone={tone} />
                  <span className="font-bold text-[13px] truncate flex-1">{cat?.label ?? c.key}</span>
                  <span className="text-[10px] text-[var(--txt-faint)] shrink-0">{c.total} 词</span>
                </div>
                <div className="flex items-center justify-between mt-2">
                  <span className="text-[11px] text-[var(--txt-dim)]">已学 {c.done}</span>
                  {c.fresh > 0 && <span className="text-[11px] font-bold text-[var(--cyan)]">新 {c.fresh}</span>}
                </div>
                <div className="progress-track h-1.5 mt-1.5"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
              </Link>
            )
          })}
          {catStats.length > 8 && (
            <Link to="/study" className="rounded-2xl border border-dashed border-white/14 hover:border-[rgba(56,225,255,0.4)] p-3.5 flex flex-col items-center justify-center gap-1 text-[var(--txt-dim)] transition-all active:scale-[0.97]">
              <Icon icon={ArrowRight} size={18} className="text-[var(--cyan)]" />
              <span className="text-[11px] font-semibold">查看全部模块</span>
            </Link>
          )}
        </div>
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <div className="glass p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold inline-flex items-center gap-2"><Icon icon={Clock} size={17} className="text-[var(--cyan)]" /> 待复习单词</h3>
            {dueWords.length > 0 && (
              <Link to="/review" className="text-xs text-[var(--cyan)] font-semibold inline-flex items-center gap-0.5">全部复习 <Icon icon={ChevronRight} size={13} /></Link>
            )}
          </div>
          {dueWords.length === 0 ? (
            <div className="text-sm text-[var(--txt-faint)] py-6 text-center">太棒了，现在没有到期单词</div>
          ) : (
            <div className="flex flex-col divide-y divide-white/6">
              {dueWords.slice(0, 5).map((w) => (
                <Link key={w.id} to="/review" className="flex items-center gap-3 py-2.5 group">
                  <span className="font-semibold text-[15px] group-hover:text-[var(--cyan)] transition-colors">{w.word}</span>
                  <span className="text-xs text-[var(--txt-dim)] truncate flex-1">{w.cn}</span>
                  <span className="text-[11px] chip !py-0.5 !px-2">{w.cat}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
        <div className="glass p-5">
          <h3 className="font-bold mb-3 inline-flex items-center gap-2"><Icon icon={BarChart3} size={17} className="text-[var(--violet)]" /> 学习档案</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-2xl bg-white/4 border border-white/6 p-3.5">
              <div className="flex items-center gap-2"><Icon icon={Medal} size={16} className="text-[var(--cyan)]" /><span className="text-2xl font-extrabold text-[var(--cyan)]">{masteredCount}</span></div>
              <div className="text-xs text-[var(--txt-dim)] mt-0.5">已掌握</div>
            </div>
            <div className="rounded-2xl bg-white/4 border border-white/6 p-3.5">
              <div className="flex items-center gap-2"><Icon icon={CircleAlert} size={16} className="text-[var(--bad)]" /><span className="text-2xl font-extrabold text-[var(--bad)]">{wrongCount}</span></div>
              <div className="text-xs text-[var(--txt-dim)] mt-0.5">错词本</div>
            </div>
            <div className="rounded-2xl bg-white/4 border border-white/6 p-3.5">
              <div className="flex items-center gap-2"><Icon icon={Heart} size={16} className="text-[var(--bad)]" /><span className="text-2xl font-extrabold text-[var(--accent)]">{favCount}</span></div>
              <div className="text-xs text-[var(--txt-dim)] mt-0.5">收藏</div>
            </div>
            <div className="rounded-2xl bg-white/4 border border-white/6 p-3.5">
              <div className="flex items-center gap-2"><Icon icon={BadgeCheck} size={16} className="text-[var(--good)]" /><span className="text-2xl font-extrabold text-[var(--good)]">{totalLearned}</span></div>
              <div className="text-xs text-[var(--txt-dim)] mt-0.5">已学</div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
