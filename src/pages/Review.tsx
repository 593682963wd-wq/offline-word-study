import { useMemo, useRef, useState } from 'react'
import { CATS, WORDS, useData } from '../hooks/useData'
import { isDue, inWrongBook } from '../lib/srs'
import { reviewQuizPool, moduleDueCount } from '../lib/reviewQuiz'
import type { ReviewScope } from '../lib/reviewQuiz'
import { makeQuestions } from '../lib/quiz'
import { StudyFlow } from '../components/StudyFlow'
import { QuizRunner } from '../components/QuizRunner'
import { EmptyState, IconTile } from '../components/ui'
import { Icon, RefreshCw, PartyPopper, Play, CalendarDays, ListChecks, FolderOpen, ChevronLeft, Target, CircleAlert, Globe } from '../components/icons'
import { CAT_ICONS } from '../components/icons'
import type { QuizQuestion, Word } from '../types'

function daysFromNow(days: number): number {
  return Date.now() + days * 24 * 3600 * 1000
}

export function Review() {
  const data = useData()
  const states = useData((s) => s.states)
  const [view, setView] = useState<'home' | 'flow' | 'quiz'>('home')
  const [flowQueue, setFlowQueue] = useState<Word[]>([])
  const [quizScope, setQuizScope] = useState<ReviewScope>('due')
  const [quizCat, setQuizCat] = useState<string | null>(null)
  const nextRunId = useRef(0)
  const [run, setRun] = useState<{ id: number; qs: QuizQuestion[]; label: string; cat: string | null } | null>(null)
  const now = Date.now()

  const due = useMemo(
    () => WORDS.filter((w) => isDue(data.getState(w.id), now)),
    [data, states, now],
  )
  const dueTomorrow = useMemo(
    () => WORDS.filter((w) => {
      const st = data.getState(w.id)
      return st.learnedAt !== null && st.nextReview > now && st.nextReview <= daysFromNow(1)
    }).length,
    [data, states, now],
  )
  const dueWeek = useMemo(
    () => WORDS.filter((w) => {
      const st = data.getState(w.id)
      return st.learnedAt !== null && st.nextReview > now && st.nextReview <= daysFromNow(7)
    }).length,
    [data, states, now],
  )

  // 选择题复习：按模块统计数量（当前范围）
  const modStats = useMemo(() => {
    const st = (id: string) => data.getState(id)
    const all: { key: string | null; label: string; due: number; total: number }[] = [
      { key: null, label: '全部模块', due: due.length, total: WORDS.length },
      ...CATS.map((c) => ({
        key: c.key,
        label: c.label,
        due: moduleDueCount(WORDS, st, c.key, now),
        total: WORDS.filter((w) => w.cat === c.key).length,
      })),
    ]
    return all
  }, [data, states, now, due])

  const startQuiz = (cat: string | null) => {
    const pool = reviewQuizPool(WORDS, (id) => data.getState(id), { cat, scope: quizScope, now: Date.now() })
    if (pool.length === 0) return
    const qs = makeQuestions(pool, 'en2cn', pool.length, WORDS)
    const label = cat === null ? '全部模块' : (CATS.find((c) => c.key === cat)?.label ?? cat)
    setRun({ id: ++nextRunId.current, qs, label, cat })
  }

  const restartWrong = () => {
    if (!run) return
    const wrongPool = reviewQuizPool(WORDS, (id) => data.getState(id), { cat: run.cat, scope: 'all' })
      .filter((w) => inWrongBook(data.getState(w.id)))
    const pool = wrongPool.length > 0 ? wrongPool : reviewQuizPool(WORDS, (id) => data.getState(id), { cat: run.cat, scope: quizScope, now: Date.now() })
    const qs = makeQuestions(pool, 'en2cn', pool.length, WORDS)
    setRun({ id: ++nextRunId.current, qs, label: run.label, cat: run.cat })
  }

  // 运行中的选择题
  if (run) {
    return (
      <QuizRunner
        key={run.id}
        questions={run.qs}
        mode="en2cn"
        title={`${run.label} · 选择题复习`}
        onExit={() => setRun(null)}
        onRestartWrong={restartWrong}
      />
    )
  }

  // 选择题配置页
  if (view === 'quiz') {
    return (
      <div className="flex flex-col gap-4 anim-in">
        <div className="flex items-center gap-3">
          <button className="btn btn-ghost !p-2 !rounded-xl" onClick={() => setView('home')} aria-label="返回">
            <Icon icon={ChevronLeft} size={18} strokeWidth={2.4} />
          </button>
          <div>
            <h2 className="font-extrabold text-lg inline-flex items-center gap-2">
              <Icon icon={ListChecks} size={20} className="text-[var(--cyan)]" /> 选择题复习
            </h2>
            <p className="text-xs text-[var(--txt-dim)] mt-0.5">按模块看单词选释义，答对自动延后复习，答错自动进错词本</p>
          </div>
        </div>

        <div className="glass p-5 scan-card">
          <h3 className="font-bold text-sm mb-3 inline-flex items-center gap-2"><Icon icon={Target} size={15} className="text-[var(--cyan)]" /> 出题范围</h3>
          <div className="flex gap-2">
            <button onClick={() => setQuizScope('due')} className={`chip ${quizScope === 'due' ? 'on' : ''}`}>
              <Icon icon={RefreshCw} size={14} /> 仅到期单词
            </button>
            <button onClick={() => setQuizScope('all')} className={`chip ${quizScope === 'all' ? 'on' : ''}`}>
              <Icon icon={Globe} size={14} /> 全部单词
            </button>
          </div>
          {quizScope === 'due' && (
            <p className="text-[11px] text-[var(--txt-faint)] mt-2">只考到期该巩固的单词；某模块暂无到期时可切换到「全部单词」</p>
          )}
        </div>

        <div className="glass p-5">
          <h3 className="font-bold text-sm mb-3 inline-flex items-center gap-2"><Icon icon={FolderOpen} size={15} className="text-[var(--cyan)]" /> 选择模块</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
            {modStats.map((m) => {
              const n = quizScope === 'due' ? m.due : m.total
              const empty = n === 0
              const active = quizCat === m.key
              return (
                <button
                  key={m.key ?? 'all'}
                  disabled={empty}
                  onClick={() => { setQuizCat(m.key); startQuiz(m.key) }}
                  className={`rounded-2xl p-3.5 text-left border transition-all active:scale-[0.97] disabled:opacity-35 disabled:pointer-events-none ${
                    active
                      ? 'bg-[rgba(56,225,255,0.10)] border-[rgba(56,225,255,0.45)] shadow-[0_8px_24px_rgba(56,225,255,0.14)]'
                      : 'bg-white/4 border-white/8 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white/5 border border-white/10 text-[var(--cyan)]">
                      <Icon icon={m.key === null ? Globe : (CAT_ICONS[CATS.find((c) => c.key === m.key)?.icon ?? ''] ?? FolderOpen)} size={16} />
                    </span>
                    <span className="font-bold text-[13px] truncate flex-1">{m.label}</span>
                  </div>
                  <div className="text-[11px] text-[var(--txt-faint)] mt-1.5">
                    {quizScope === 'due' ? `${m.due} 词到期` : `${m.total} 词`}
                    {empty && ' · 暂无'}
                  </div>
                </button>
              )
            })}
          </div>
        </div>

        <p className="text-center text-[11px] text-[var(--txt-faint)] inline-flex items-center justify-center gap-1">
          <Icon icon={CircleAlert} size={12} /> 一次考完整个模块，不设题数限制；答错的词会在结果页提供再练
        </p>
      </div>
    )
  }

  if (view === 'flow') {
    return <StudyFlow queue={flowQueue} title="到期复习" onExit={() => setView('home')} />
  }

  if (due.length === 0 && view === 'home') {
    return (
      <div className="anim-in">
        <EmptyState icon={PartyPopper} text="现在没有到期的单词" hint="记忆曲线复习已全部完成，去学新词、做测验或选择题复习巩固吧" />
        <div className="grid grid-cols-2 gap-3 mt-2">
          <div className="glass p-4 text-center scan-card">
            <Icon icon={CalendarDays} size={18} className="text-[var(--cyan)] mx-auto" />
            <div className="text-2xl font-extrabold text-[var(--txt-dim)] mt-1.5">{dueTomorrow}</div>
            <div className="text-xs text-[var(--txt-faint)] mt-1">明天到期</div>
          </div>
          <div className="glass p-4 text-center scan-card">
            <Icon icon={CalendarDays} size={18} className="text-[var(--violet)] mx-auto" />
            <div className="text-2xl font-extrabold text-[var(--txt-dim)] mt-1.5">{dueWeek}</div>
            <div className="text-xs text-[var(--txt-faint)] mt-1">未来 7 天</div>
          </div>
        </div>
        <div className="glass p-5 mt-4 scan-card">
          <h3 className="font-bold mb-3 inline-flex items-center gap-2"><Icon icon={ListChecks} size={16} className="text-[var(--cyan)]" /> 选择题复习</h3>
          <p className="text-xs text-[var(--txt-dim)] mb-3">按模块看单词选释义，考考自己有没有记住，答错自动进错词本</p>
          <button className="btn btn-ghost w-full" onClick={() => setView('quiz')}>
            <Icon icon={ListChecks} size={16} /> 选择模块开始
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 anim-in">
      <div className="glass p-6 text-center relative overflow-hidden scan-card">
        <div className="absolute -top-10 -left-10 w-40 h-40 rounded-full bg-[rgba(77,141,255,0.14)] blur-2xl pointer-events-none" />
        <div className="absolute -bottom-14 -right-10 w-44 h-44 rounded-full bg-[rgba(157,123,255,0.12)] blur-2xl pointer-events-none" />
        <div className="absolute top-3 left-4 text-[10px] font-bold tracking-[0.28em] uppercase text-[rgba(56,225,255,0.45)] select-none">MEMORY CYCLE</div>
        <IconTile icon={RefreshCw} size={30} box={64} tone="cyan" className="mx-auto !rounded-3xl" />
        <h2 className="text-xl font-extrabold mt-4">{due.length} 个单词等待复习</h2>
        <p className="text-sm text-[var(--txt-dim)] mt-1.5">根据艾宾浩斯记忆曲线，这些单词该巩固了</p>
        <button className="btn btn-primary w-full mt-5 !py-3.5 text-base anim-glow inline-flex items-center justify-center gap-2" onClick={() => { setFlowQueue([...due]); setView('flow') }}>
          <Icon icon={Play} size={18} /> 开始复习（{due.length} 词）
        </button>
      </div>

      <div className="glass p-5 scan-card">
        <h3 className="font-bold inline-flex items-center gap-2"><Icon icon={ListChecks} size={17} className="text-[var(--cyan)]" /> 选择题复习</h3>
        <p className="text-xs text-[var(--txt-dim)] mt-1">按模块看单词选释义，考考自己有没有记住，答错自动进错词本</p>
        <button className="btn btn-ghost w-full mt-3" onClick={() => setView('quiz')}>
          <Icon icon={ListChecks} size={16} /> 选择模块开始
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="glass p-4 text-center scan-card">
          <div className="text-2xl font-extrabold text-[var(--warn)]">{dueTomorrow}</div>
          <div className="text-xs text-[var(--txt-faint)] mt-1">明天到期</div>
        </div>
        <div className="glass p-4 text-center scan-card">
          <div className="text-2xl font-extrabold text-[var(--txt-dim)]">{dueWeek}</div>
          <div className="text-xs text-[var(--txt-faint)] mt-1">未来 7 天</div>
        </div>
      </div>

      <div className="glass p-5">
        <h3 className="font-bold mb-3 inline-flex items-center gap-2"><Icon icon={CalendarDays} size={16} className="text-[var(--cyan)]" /> 今日待复习</h3>
        <div className="flex flex-col divide-y divide-white/6">
          {due.slice(0, 8).map((w) => {
            const st = data.getState(w.id)
            return (
              <div key={w.id} className="flex items-center gap-3 py-2.5">
                <span className="font-semibold text-[15px]">{w.word}</span>
                <span className="text-xs text-[var(--txt-dim)] truncate flex-1">{w.cn}</span>
                <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-white/5 border border-white/10 text-[var(--txt-faint)]">Lv.{st.level}</span>
              </div>
            )
          })}
          {due.length > 8 && <div className="text-center text-xs text-[var(--txt-faint)] pt-2">还有 {due.length - 8} 词在队列中…</div>}
        </div>
      </div>
    </div>
  )
}
