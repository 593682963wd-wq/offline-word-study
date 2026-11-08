import { useMemo, useRef, useState } from 'react'
import { CATS, WORDS, useData } from '../hooks/useData'
import { useApp } from '../store/app'
import { isMastered, isNew, inWrongBook } from '../lib/srs'
import { MODE_META, makeQuestions } from '../lib/quiz'
import type { QuizMode, QuizQuestion } from '../types'
import { QuizRunner } from '../components/QuizRunner'
import { Icon, PenLine, Target, Hash, Globe, Sparkles, CircleAlert, Heart, Medal, FolderOpen, ListChecks } from '../components/icons'
import { MODE_ICONS, CAT_ICONS } from '../components/icons'
import type { LucideIcon } from 'lucide-react'

type Scope = 'all' | 'fresh' | 'wrong' | 'fav' | 'mastered' | 'cat'

const SCOPES: { key: Scope; label: string; icon: LucideIcon; tone: string }[] = [
  { key: 'all', label: '全部词库', icon: Globe, tone: '#22d3ee' },
  { key: 'fresh', label: '未学词', icon: Sparkles, tone: '#7db0ff' },
  { key: 'wrong', label: '错词本', icon: CircleAlert, tone: '#ff7a8a' },
  { key: 'fav', label: '我的收藏', icon: Heart, tone: '#ff7a8a' },
  { key: 'mastered', label: '已掌握', icon: Medal, tone: '#3fe0a8' },
]

export function Quiz() {
  const data = useData()
  const states = useData((s) => s.states)
  const settings = useApp((s) => s.settings)
  const [mode, setMode] = useState<QuizMode>('en2cn')
  const [scope, setScope] = useState<Scope>('all')
  const [cat, setCat] = useState<string>(CATS[0].key)
  const [count, setCount] = useState(settings.quizCount)
  const nextRunId = useRef(0)
  const [run, setRun] = useState<{ id: number; qs: QuizQuestion[]; mode: QuizMode } | null>(null)

  const pool = useMemo(() => {
    const st = (id: string) => data.getState(id)
    switch (scope) {
      case 'fresh': return WORDS.filter((w) => isNew(st(w.id)))
      case 'wrong': return WORDS.filter((w) => inWrongBook(st(w.id)))
      case 'fav': return WORDS.filter((w) => st(w.id).favorite === 1)
      case 'mastered': return WORDS.filter((w) => isMastered(st(w.id)))
      case 'cat': return WORDS.filter((w) => w.cat === cat)
      default: return WORDS
    }
  }, [data, states, scope, cat])

  const start = () => {
    const qs = makeQuestions(pool, mode, count, WORDS)
    setRun({ id: ++nextRunId.current, qs, mode })
  }
  const restartWrong = () => {
    // 测验答错的词已自动加入错词本，从错词本取样再练
    const wrongPool = WORDS.filter((w) => inWrongBook(data.getState(w.id)))
    const qs = makeQuestions(wrongPool.length > 0 ? wrongPool : pool, run?.mode ?? 'en2cn', count, WORDS)
    setRun({ id: ++nextRunId.current, qs, mode: run?.mode ?? 'en2cn' })
  }

  if (run) {
    return (
      <QuizRunner
        key={run.id}
        questions={run.qs}
        mode={run.mode}
        onExit={() => setRun(null)}
        onRestartWrong={restartWrong}
      />
    )
  }

  return (
    <div className="flex flex-col gap-5 anim-in">
      <div className="glass p-5 scan-card">
        <h2 className="font-extrabold text-lg inline-flex items-center gap-2"><Icon icon={PenLine} size={20} className="text-[var(--cyan)]" /> 选择测验方式</h2>
        <p className="text-xs text-[var(--txt-dim)] mt-0.5">答错的单词会自动进入错词本，并在测验后提供再练习</p>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mt-4">
          {(Object.keys(MODE_META) as QuizMode[]).map((m) => {
            const meta = MODE_META[m]
            const active = mode === m
            return (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded-2xl p-4 text-left border transition-all active:scale-[0.97] ${
                  active
                    ? 'bg-[rgba(56,225,255,0.10)] border-[rgba(56,225,255,0.45)] shadow-[0_8px_24px_rgba(56,225,255,0.14)]'
                    : 'bg-white/4 border-white/8 hover:border-white/20'
                }`}
              >
                <span className={`inline-flex items-center justify-center w-11 h-11 rounded-xl border ${
                  active
                    ? 'bg-gradient-to-br from-[rgba(56,225,255,0.22)] to-[rgba(157,123,255,0.14)] border-[rgba(56,225,255,0.4)] text-[var(--cyan)]'
                    : 'bg-white/5 border-white/10 text-[var(--txt-dim)]'
                }`}>
                  <Icon icon={MODE_ICONS[m] ?? PenLine} size={21} />
                </span>
                <div className={`font-bold text-[15px] mt-2 ${active ? 'text-[var(--cyan)]' : ''}`}>{meta.name}</div>
                <div className="text-[13px] text-[var(--txt-faint)] mt-0.5 leading-relaxed">{meta.desc}</div>
              </button>
            )
          })}
        </div>
      </div>

      <div className="glass p-5">
        <h3 className="font-bold text-sm mb-3 inline-flex items-center gap-2"><Icon icon={Target} size={16} className="text-[var(--cyan)]" /> 出题范围</h3>
        <div className="flex flex-wrap gap-2">
          {SCOPES.map((s) => {
            let n = 0
            const st = (id: string) => data.getState(id)
            if (s.key === 'fresh') n = WORDS.filter((w) => isNew(st(w.id))).length
            else if (s.key === 'wrong') n = WORDS.filter((w) => inWrongBook(st(w.id))).length
            else if (s.key === 'fav') n = WORDS.filter((w) => st(w.id).favorite === 1).length
            else if (s.key === 'mastered') n = WORDS.filter((w) => isMastered(st(w.id))).length
            else n = WORDS.length
            return (
              <button key={s.key} onClick={() => setScope(s.key)} className={`chip ${scope === s.key ? 'on' : ''}`}>
                <Icon icon={s.icon} size={14} /> {s.label} <span className="opacity-70">({n})</span>
              </button>
            )
          })}
          <button onClick={() => setScope('cat')} className={`chip ${scope === 'cat' ? 'on' : ''}`}>
            <Icon icon={FolderOpen} size={14} /> 分类
          </button>
        </div>
        {scope === 'cat' && (
          <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-1">
            {CATS.map((c) => (
              <button key={c.key} onClick={() => setCat(c.key)} className={`chip shrink-0 ${cat === c.key ? 'on' : ''}`}>
                <Icon icon={CAT_ICONS[c.icon] ?? FolderOpen} size={14} /> {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="glass p-5 flex items-center justify-between flex-wrap gap-3">
        <div>
          <h3 className="font-bold text-sm inline-flex items-center gap-2"><Icon icon={Hash} size={15} className="text-[var(--cyan)]" /> 题数</h3>
          <div className="flex gap-2 mt-2.5">
            {[5, 10, 15, 20].map((n) => (
              <button key={n} onClick={() => setCount(n)} className={`chip !px-4 ${count === n ? 'on' : ''}`}>{n} 题</button>
            ))}
          </div>
        </div>
        <button className="btn btn-primary !px-8 !py-3.5" onClick={start} disabled={pool.length === 0}>
          {pool.length === 0 ? '该范围暂无单词' : `开始测验（${Math.min(count, pool.length)} 题）`}
        </button>
      </div>

      <p className="text-center text-[11px] text-[var(--txt-faint)] inline-flex items-center justify-center gap-1">
        <Icon icon={ListChecks} size={12} /> 提示：测验结果会同步更新记忆曲线与错词本
      </p>
    </div>
  )
}
