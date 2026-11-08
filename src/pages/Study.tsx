import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { CATS, WORDS, useData } from '../hooks/useData'
import { inWrongBook, isDue, isMastered, isNew } from '../lib/srs'
import { StudyFlow } from '../components/StudyFlow'
import { EmptyState, IconTile } from '../components/ui'
import { Icon, BookOpen, Sparkles, ArrowRight, Library, CircleAlert, Target, RefreshCw } from '../components/icons'
import { CAT_ICONS } from '../components/icons'

export function Study() {
  const data = useData()
  const states = useData((s) => s.states)
  const [flow, setFlow] = useState<{ queue: typeof WORDS; title: string } | null>(null)
  const now = Date.now()

  const catStats = useMemo(() => {
    const m = new Map<string, { total: number; fresh: number; due: number; mastered: number }>()
    for (const w of WORDS) {
      const c = m.get(w.cat) ?? { total: 0, fresh: 0, due: 0, mastered: 0 }
      c.total += 1
      const st = data.getState(w.id)
      if (isNew(st)) c.fresh += 1
      else if (isDue(st, now)) c.due += 1
      if (isMastered(st)) c.mastered += 1
      m.set(w.cat, c)
    }
    return m
  }, [data, states, now])

  const totalFresh = useMemo(() => {
    let n = 0
    for (const w of WORDS) if (isNew(data.getState(w.id))) n += 1
    return n
  }, [data, states])

  const totalDue = useMemo(() => {
    let n = 0
    for (const w of WORDS) if (!isNew(data.getState(w.id)) && isDue(data.getState(w.id), now)) n += 1
    return n
  }, [data, states, now])

  // 错词本（按错误次数降序，Flash 同款「错题重测」入口）
  const wrongWords = useMemo(
    () => WORDS.filter((w) => inWrongBook(data.getState(w.id))).sort(
      (a, b) => data.getState(b.id).wrongCount - data.getState(a.id).wrongCount,
    ),
    [data, states],
  )

  if (flow) {
    return <StudyFlow queue={flow.queue} title={flow.title} onExit={() => setFlow(null)} />
  }

  const startCat = (cat: string) => {
    const words = WORDS.filter((w) => w.cat === cat)
    const fresh = words.filter((w) => isNew(data.getState(w.id)))
    const rest = words.filter((w) => !isNew(data.getState(w.id)) && !isMastered(data.getState(w.id)))
    // 一次学完该部分：不设数量限制，中途退出进度已保存，可随时回来继续
    const queue = [...fresh, ...rest]
    if (!queue.length) return
    setFlow({ queue, title: `学习 · ${cat}` })
  }

  const startAll = () => {
    const fresh = WORDS.filter((w) => isNew(data.getState(w.id)))
    const rest = WORDS.filter((w) => !isNew(data.getState(w.id)) && !isMastered(data.getState(w.id)))
    // 不设数量限制：全部未掌握词一次学完
    const queue = [...fresh, ...rest]
    if (!queue.length) return
    setFlow({ queue, title: '学习 · 全词库' })
  }

  return (
    <div className="flex flex-col gap-4 anim-in">
      <div className="glass p-5 flex items-center gap-4 scan-card">
        <IconTile icon={BookOpen} size={24} box={50} tone="cyan" />
        <div className="flex-1">
          <h2 className="font-extrabold text-lg">学新词</h2>
          <p className="text-xs text-[var(--txt-dim)] mt-0.5">按部分整段学习 · 不设数量限制 · 新词还剩 {totalFresh} 个，中途退出进度自动保存</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            <span className="chip !text-[11px] !py-0.5"><Icon icon={BookOpen} size={12} className="text-[var(--cyan)]" /> 已学 {WORDS.length - totalFresh}/{WORDS.length}</span>
            <span className="chip !text-[11px] !py-0.5"><Icon icon={RefreshCw} size={12} className="text-[var(--warn)]" /> 待复习 {totalDue}</span>
            <span className="chip !text-[11px] !py-0.5"><Icon icon={Target} size={12} className="text-[var(--good)]" /> 今日已学 {data.statToday().learned + data.statToday().reviewed}</span>
          </div>
        </div>
        {totalFresh > 0 ? (
          <button className="btn btn-primary !py-2.5 !px-4 text-sm" onClick={startAll}>全部开刷</button>
        ) : (
          <Link to="/review" className="btn btn-ghost !py-2.5 !px-4 text-sm">去复习</Link>
        )}
      </div>

      {wrongWords.length > 0 && (
        <button
          onClick={() => setFlow({ queue: wrongWords, title: '错题重测' })}
          className="glass p-4 flex items-center gap-3.5 text-left transition-all hover:brightness-115 active:scale-[0.98] scan-card !border-[rgba(255,122,138,0.35)]"
        >
          <span className="inline-flex items-center justify-center w-11 h-11 rounded-2xl shrink-0 bg-[rgba(255,122,138,0.14)] border border-[rgba(255,122,138,0.4)] text-[var(--bad)]">
            <Icon icon={CircleAlert} size={21} />
          </span>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-[15px] flex items-center gap-2">
              错题重测 <span className="text-[11px] chip !py-0.5 !px-2 !text-[var(--bad)]">{wrongWords.length} 个</span>
            </div>
            <div className="text-xs text-[var(--txt-dim)] mt-0.5">答错的词按错误次数排序，优先攻克它们</div>
          </div>
          <span className="btn btn-ghost !py-2 !px-3.5 text-[13px] shrink-0 inline-flex items-center gap-1.5">
            <Icon icon={Target} size={14} /> 重测
          </span>
        </button>
      )}

      {totalFresh === 0 && (
        <div className="glass p-4 text-sm text-[var(--txt-dim)] flex items-center gap-2">
          <Icon icon={Sparkles} size={16} className="text-[var(--cyan)]" /> 示例词库都学过一遍了！接下来按记忆曲线复习，或选类别「再学一遍」巩固。
        </div>
      )}

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {CATS.map((c, i) => {
          const s = catStats.get(c.key)
          if (!s) return null
          const pct = s.total ? Math.round((s.mastered / s.total) * 100) : 0
          const tone = (['cyan', 'blue', 'violet', 'green', 'amber', 'rose'] as const)[i % 6]
          return (
            <button
              key={c.key}
              onClick={() => startCat(c.key)}
              className="glass p-4 text-left transition-all hover:brightness-115 active:scale-[0.97] anim-in scan-card"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="flex items-center justify-between">
                <IconTile icon={CAT_ICONS[c.icon] ?? BookOpen} size={19} box={40} tone={tone} />
                <span className="text-[11px] text-[var(--txt-faint)]">{s.total} 词</span>
              </div>
              <div className="font-bold text-[15px] mt-2.5">{c.label}</div>
              <div className="flex items-center gap-2 mt-1.5">
                <span className="text-[11px] text-[var(--txt-dim)]">掌握 {pct}%</span>
                {s.fresh > 0 && <span className="text-[11px] font-bold text-[var(--cyan)]">新 {s.fresh}</span>}
                {s.due > 0 && <span className="text-[11px] font-bold text-[var(--warn)]">复习 {s.due}</span>}
              </div>
              <div className="progress-track h-1.5 mt-2.5"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
            </button>
          )
        })}
      </div>

      <p className="text-center text-[11px] text-[var(--txt-faint)] inline-flex items-center justify-center gap-1">
        点任意部分一次学完该部分全部未掌握词，答错自动进错词本 <Icon icon={ArrowRight} size={12} />
      </p>
    </div>
  )
}

export function StudyEmpty() {
  return <EmptyState icon={Library} text="暂无内容" hint="请返回重试" />
}
