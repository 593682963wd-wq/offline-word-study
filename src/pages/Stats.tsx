import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { WORDS, useData } from '../hooks/useData'
import { inWrongBook, isMastered, isNew } from '../lib/srs'
import { addDays, fmtDate, todayStr } from '../lib/utils'
import { Icon, BarChart3, Settings, Flame, Medal, CircleAlert, TrendingUp, CalendarDays, Layers, Trophy, Lock } from '../components/icons'
import { BADGE_ICONS } from '../components/icons'
import { useApp } from '../store/app'
import { BADGES, xpProgress } from '../lib/gamify'

export function Stats() {
  const data = useData()
  const states = useData((s) => s.states)
  const stats = useData((s) => s.stats)
  const gamify = useApp((s) => s.gamify)

  const agg = useMemo(() => {
    let fresh = 0, mastered = 0, wrong = 0, fav = 0, totalLearned = 0, totalReviewed = 0, totalWrong = 0, totalCorrect = 0
    for (const w of WORDS) {
      const st = data.getState(w.id)
      if (isNew(st)) fresh += 1
      if (isMastered(st)) mastered += 1
      if (inWrongBook(st)) wrong += 1
      if (st.favorite) fav += 1
      if (!isNew(st)) totalLearned += 1
      totalReviewed += st.reviewCount
      totalWrong += st.wrongCount
      totalCorrect += st.correctCount
    }
    let learned = 0, reviewed = 0, quiz = 0, correct = 0, wrongDay = 0
    for (const s of stats.values()) {
      learned += s.learned; reviewed += s.reviewed; quiz += s.quizDone; correct += s.correct; wrongDay += s.wrong
    }
    return { fresh, mastered, wrong, fav, totalLearned, totalReviewed, totalWrong, totalCorrect, learned, reviewed, quiz, correct, wrongDay }
  }, [data, states, stats])

  const streak = data.streakDays()
  const acc = agg.correct + agg.wrongDay > 0 ? Math.round((agg.correct / (agg.correct + agg.wrongDay)) * 100) : 0
  const today = data.statToday()

  // 日历热力图：近 84 天（12 周），列=周
  const heat = useMemo(() => {
    const end = new Date()
    const start = addDays(end, -83)
    // 调整到周日开始
    const startSunday = addDays(start, -start.getDay())
    const cells: { date: Date; level: number }[] = []
    for (let d = startSunday; d <= end; d = addDays(d, 1)) {
      const key = todayStr(d)
      const s = stats.get(key)
      const active = s ? s.learned + s.reviewed + s.quizDone + s.correct + s.wrong : 0
      const level = active === 0 ? 0 : active <= 3 ? 1 : active <= 8 ? 2 : active <= 15 ? 3 : 4
      cells.push({ date: new Date(d), level })
    }
    return cells
  }, [stats])

  const weekRows = useMemo(() => {
    const rows: typeof heat[] = []
    for (let i = 0; i < heat.length; i += 7) rows.push(heat.slice(i, i + 7))
    return rows
  }, [heat])

  // 近 7 天柱状图
  const weekBars = useMemo(() => {
    const out: { label: string; count: number; isToday: boolean }[] = []
    for (let i = 6; i >= 0; i--) {
      const d = addDays(new Date(), -i)
      const key = todayStr(d)
      const s = stats.get(key)
      out.push({ label: i === 0 ? '今天' : `${d.getMonth() + 1}/${d.getDate()}`, count: s ? s.learned + s.reviewed + s.quizDone : 0, isToday: i === 0 })
    }
    return out
  }, [stats])
  const maxBar = Math.max(1, ...weekBars.map((b) => b.count))

  const heatColor = (lvl: number) =>
    lvl === 0 ? 'rgba(255,255,255,0.06)'
    : lvl === 1 ? 'rgba(56,225,255,0.28)'
    : lvl === 2 ? 'rgba(99,102,241,0.45)'
    : lvl === 3 ? 'rgba(99,102,241,0.72)'
    : 'linear-gradient(135deg, #a855f7 0%, #ff5fa8 100%)'

  return (
    <div className="flex flex-col gap-4 anim-in">
      <div className="flex items-center justify-between">
        <h2 className="font-extrabold text-lg inline-flex items-center gap-2"><Icon icon={BarChart3} size={20} className="text-[var(--cyan)]" /> 学习统计</h2>
        <Link to="/settings" className="chip !py-1.5"><Icon icon={Settings} size={13} /> 设置</Link>
      </div>

      {/* 顶部四卡 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="glass p-4 text-center">
          <div className="inline-flex items-center gap-1.5 text-3xl font-extrabold text-[var(--cyan)]"><Icon icon={Flame} size={22} className="text-[var(--warn)]" />{streak}</div>
          <div className="text-xs text-[var(--txt-dim)] mt-1">连续天数</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="text-3xl font-extrabold text-[var(--accent)]">{agg.learned}</div>
          <div className="text-xs text-[var(--txt-dim)] mt-1">累计学词</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="inline-flex items-center gap-1.5 text-3xl font-extrabold text-[var(--good)]"><Icon icon={Medal} size={22} />{agg.mastered}</div>
          <div className="text-xs text-[var(--txt-dim)] mt-1">已掌握</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="inline-flex items-center gap-1.5 text-3xl font-extrabold text-[var(--bad)]"><Icon icon={CircleAlert} size={22} />{agg.wrong}</div>
          <div className="text-xs text-[var(--txt-dim)] mt-1">错词本</div>
        </div>
      </div>

      {/* 今日 + 正确率 */}
      <div className="grid grid-cols-3 gap-3">
        <div className="glass p-4 text-center">
          <div className="text-2xl font-extrabold">{today.learned}</div>
          <div className="text-xs text-[var(--txt-faint)] mt-1">今日新学</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="text-2xl font-extrabold">{today.reviewed}</div>
          <div className="text-xs text-[var(--txt-faint)] mt-1">今日复习</div>
        </div>
        <div className="glass p-4 text-center">
          <div className="text-2xl font-extrabold text-[var(--good)]">{acc}%</div>
          <div className="text-xs text-[var(--txt-faint)] mt-1">总正确率</div>
        </div>
      </div>

      {/* 等级与徽章 */}
      <div className="glass p-5 scan-card">
        <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
          <h3 className="font-bold inline-flex items-center gap-2"><Icon icon={Trophy} size={17} className="text-[var(--gold)]" /> 等级徽章</h3>
          <span className="chip !text-xs !border-[rgba(255,199,89,0.4)] !text-[var(--gold)]">Lv.{xpProgress(gamify.xp).level} · 总 {gamify.xp} XP</span>
        </div>
        {(() => {
          const { cur, need, level } = xpProgress(gamify.xp)
          return (
            <div className="mb-4">
              <div className="flex justify-between text-xs text-[var(--txt-dim)] mb-1.5">
                <span>Lv.{level}</span>
                <span>距离 Lv.{level + 1} 还差 <b className="text-[var(--gold)]">{need - cur} XP</b></span>
              </div>
              <div className="progress-track h-2.5"><div className="progress-fill" style={{ width: `${Math.min(100, (cur / Math.max(1, need)) * 100)}%` }} /></div>
            </div>
          )
        })()}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {BADGES.map((b) => {
            const on = gamify.badges.includes(b.id)
            const BIcon = BADGE_ICONS[b.icon] ?? Trophy
            return (
              <div key={b.id}
                className={`rounded-2xl p-4 flex flex-col items-center gap-2 text-center border transition-all ${
                  on
                    ? 'bg-[rgba(255,199,89,0.07)] border-[rgba(255,199,89,0.35)] shadow-[0_8px_24px_rgba(255,199,89,0.08)]'
                    : 'bg-white/3 border-white/6 opacity-55'
                }`}>
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
                  on
                    ? 'bg-gradient-to-br from-[rgba(255,199,89,0.22)] to-[rgba(255,148,77,0.10)] border-[rgba(255,199,89,0.4)]'
                    : 'bg-white/4 border-white/8'
                }`}>
                  <Icon icon={on ? BIcon : Lock} size={24} className={on ? 'text-[var(--gold)]' : 'text-[var(--txt-faint)]'} />
                </div>
                <div>
                  <div className={`text-[13px] font-bold ${on ? 'text-[var(--gold)]' : 'text-[var(--txt-dim)]'}`}>{b.name}</div>
                  <div className="text-[11px] text-[var(--txt-faint)] mt-0.5 leading-relaxed">{b.desc}</div>
                </div>
              </div>
            )
          })}
        </div>
      </div>


      <div className="glass p-5 scan-card">
        <h3 className="font-bold text-sm mb-4 inline-flex items-center gap-2"><Icon icon={TrendingUp} size={15} className="text-[var(--cyan)]" /> 近 7 天学习量</h3>
        <div className="flex items-end justify-between gap-2 h-28">
          {weekBars.map((b, i) => (
            <div key={i} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
              <span className="text-[10px] text-[var(--txt-faint)]">{b.count > 0 ? b.count : ''}</span>
              <div
                className={`w-full max-w-9 rounded-t-lg transition-all ${b.isToday ? 'bg-gradient-to-t from-[#6366f1] to-[#a855f7] shadow-[0_0_16px_rgba(99,102,241,0.5)]' : 'bg-[rgba(99,102,241,0.30)]'}`}
                style={{ height: `${Math.max(4, (b.count / maxBar) * 100)}%` }}
              />
              <span className={`text-[10px] ${b.isToday ? 'text-[var(--cyan)] font-bold' : 'text-[var(--txt-faint)]'}`}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* 日历热力图 */}
      <div className="glass p-5 overflow-x-auto no-scrollbar">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-sm inline-flex items-center gap-2"><Icon icon={CalendarDays} size={15} className="text-[var(--violet)]" /> 学习足迹（近 12 周）</h3>
          <div className="flex items-center gap-1 text-[10px] text-[var(--txt-faint)]">
            <span>少</span>
            {[0, 1, 2, 3, 4].map((l) => (
              <span key={l} className="w-3 h-3 rounded-[4px]" style={{ background: heatColor(l) }} />
            ))}
            <span>多</span>
          </div>
        </div>
        <div className="flex gap-1.5 min-w-max">
          {weekRows.map((row, ri) => (
            <div key={ri} className="flex flex-col gap-1.5">
              {Array.from({ length: 7 }, (_, di) => {
                const cell = row[di]
                return (
                  <div
                    key={di}
                    title={cell ? `${todayStr(cell.date)} · 学习 ${(stats.get(todayStr(cell.date))?.learned ?? 0) + (stats.get(todayStr(cell.date))?.reviewed ?? 0)} 词` : ''}
                    className="w-3.5 h-3.5 rounded-[4px]"
                    style={{ background: cell ? heatColor(cell.level) : 'transparent' }}
                  />
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* 详细档案 */}
      <div className="glass p-5">
        <h3 className="font-bold text-sm mb-3 inline-flex items-center gap-2"><Icon icon={Layers} size={15} className="text-[var(--cyan)]" /> 学习档案</h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
          <div className="flex justify-between"><span className="text-[var(--txt-dim)]">词库总量</span><b>{WORDS.length} 词</b></div>
          <div className="flex justify-between"><span className="text-[var(--txt-dim)]">已学</span><b>{agg.totalLearned} 词</b></div>
          <div className="flex justify-between"><span className="text-[var(--txt-dim)]">未学</span><b>{agg.fresh} 词</b></div>
          <div className="flex justify-between"><span className="text-[var(--txt-dim)]">掌握率</span><b>{Math.round((agg.mastered / WORDS.length) * 100)}%</b></div>
          <div className="flex justify-between"><span className="text-[var(--txt-dim)]">总复习次数</span><b>{agg.totalReviewed} 次</b></div>
          <div className="flex justify-between"><span className="text-[var(--txt-dim)]">累计测验</span><b>{agg.quiz} 次</b></div>
          <div className="flex justify-between"><span className="text-[var(--txt-dim)]">累计答对</span><b>{agg.correct} 次</b></div>
          <div className="flex justify-between"><span className="text-[var(--txt-dim)]">累计答错</span><b>{agg.wrongDay} 次</b></div>
          <div className="flex justify-between"><span className="text-[var(--txt-dim)]">收藏</span><b>{agg.fav} 词</b></div>
          <div className="flex justify-between"><span className="text-[var(--txt-dim)]">当前日期</span><b>{fmtDate(todayStr())}</b></div>
        </div>
      </div>
    </div>
  )
}
