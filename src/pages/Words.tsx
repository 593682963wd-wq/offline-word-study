import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { CATS, WORDS, useData } from '../hooks/useData'
import { isMastered, isNew, inWrongBook } from '../lib/srs'
import { SpeakButton } from '../components/ui'
import { StudyFlow } from '../components/StudyFlow'
import { WordDetail } from '../components/WordDetail'
import { Icon, Search, X, Globe, Sparkles, BookOpen, Medal, CircleAlert, Heart, FolderOpen, SearchX } from '../components/icons'
import { CAT_ICONS } from '../components/icons'
import { WordArt } from '../components/WordArt'
import type { LucideIcon } from 'lucide-react'

type Filter = 'all' | 'fresh' | 'learned' | 'mastered' | 'wrong' | 'fav'

const FILTERS: { key: Filter; label: string; icon: LucideIcon }[] = [
  { key: 'all', label: '全部', icon: Globe },
  { key: 'fresh', label: '未学', icon: Sparkles },
  { key: 'learned', label: '已学', icon: BookOpen },
  { key: 'mastered', label: '掌握', icon: Medal },
  { key: 'wrong', label: '错词', icon: CircleAlert },
  { key: 'fav', label: '收藏', icon: Heart },
]

export function Words() {
  const data = useData()
  const states = useData((s) => s.states)
  const [params, setParams] = useSearchParams()
  const [filter, setFilter] = useState<Filter>('all')
  const [cat, setCat] = useState<string>('all')
  const [q, setQ] = useState(params.get('q') ?? '')
  const [detailId, setDetailId] = useState<string | null>(null)
  const [flow, setFlow] = useState<{ queue: typeof WORDS; title: string } | null>(null)

  const updateSearch = (value: string) => {
    setQ(value)
    const next = new URLSearchParams(params)
    const query = value.trim()
    if (query) next.set('q', query)
    else next.delete('q')
    setParams(next, { replace: true })
  }

  const list = useMemo(() => {
    const kw = q.trim().toLowerCase()
    const out = WORDS.filter((w) => {
      if (cat !== 'all' && w.cat !== cat) return false
      const st = data.getState(w.id)
      switch (filter) {
        case 'fresh': if (!isNew(st)) return false; break
        case 'learned': if (isNew(st)) return false; break
        case 'mastered': if (!isMastered(st)) return false; break
        case 'wrong': if (!inWrongBook(st)) return false; break
        case 'fav': if (st.favorite !== 1) return false; break
      }
      if (kw) {
        const hit = w.word.toLowerCase().includes(kw) || w.cn.includes(kw) || (w.phonetic ?? '').includes(kw)
        if (!hit) return false
      }
      return true
    })
    // 错词按错次数降序（融合 Flash：错得最多的排最前）
    if (filter === 'wrong') {
      out.sort((a, b) => data.getState(b.id).wrongCount - data.getState(a.id).wrongCount)
    }
    return out
  }, [data, states, filter, cat, q])

  if (flow) {
    return <StudyFlow queue={flow.queue} title={flow.title} onExit={() => setFlow(null)} />
  }

  return (
    <div className="flex flex-col gap-4 anim-in">
      <div className="glass p-4">
        <div className="relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--txt-faint)]"><Icon icon={Search} size={16} /></span>
          <input
            value={q}
            onChange={(e) => updateSearch(e.target.value)}
            placeholder="搜索单词 / 中文 / 音标…"
            className="w-full pl-11 pr-4 py-3 rounded-2xl outline-none border border-white/10 bg-white/5 focus:border-[var(--cyan)] transition-colors text-[15px] placeholder:text-[var(--txt-faint)]"
          />
          {q && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full flex items-center justify-center text-[var(--txt-faint)] hover:bg-white/10" onClick={() => updateSearch('')} aria-label="清空"><Icon icon={X} size={15} /></button>
          )}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-0.5">
          {FILTERS.map((f) => {
            let n = 0
            const st = (id: string) => data.getState(id)
            if (f.key === 'fresh') n = WORDS.filter((w) => isNew(st(w.id))).length
            else if (f.key === 'learned') n = WORDS.filter((w) => !isNew(st(w.id))).length
            else if (f.key === 'mastered') n = WORDS.filter((w) => isMastered(st(w.id))).length
            else if (f.key === 'wrong') n = WORDS.filter((w) => inWrongBook(st(w.id))).length
            else if (f.key === 'fav') n = WORDS.filter((w) => st(w.id).favorite === 1).length
            else n = WORDS.length
            return (
              <button key={f.key} onClick={() => setFilter(f.key)} className={`chip shrink-0 ${filter === f.key ? 'on' : ''}`}>
                <Icon icon={f.icon} size={14} /> {f.label} <span className="opacity-70">({n})</span>
              </button>
            )
          })}
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar mt-2.5 pb-0.5">
          <button onClick={() => setCat('all')} className={`chip shrink-0 ${cat === 'all' ? 'on' : ''}`}><Icon icon={FolderOpen} size={14} /> 全部类别</button>
          {CATS.map((c) => (
            <button key={c.key} onClick={() => setCat(c.key)} className={`chip shrink-0 ${cat === c.key ? 'on' : ''}`}><Icon icon={CAT_ICONS[c.icon] ?? FolderOpen} size={14} /> {c.label}</button>
          ))}
        </div>
      </div>

      <div className="text-xs text-[var(--txt-faint)] px-1">共 {list.length} 个单词</div>

      <div className="flex flex-col gap-2.5">
        {list.map((w, i) => {
          const st = data.getState(w.id)
          const wrong = inWrongBook(st)
          const mastered = isMastered(st)
          const fav = st.favorite === 1
          return (
            <div
              key={w.id}
              role="button"
              tabIndex={0}
              onClick={() => setDetailId(w.id)}
              onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); setDetailId(w.id) } }}
              className="glass p-3.5 flex items-center gap-3 text-left cursor-pointer transition-all hover:brightness-115 active:scale-[0.985] anim-in"
              style={{ animationDelay: `${Math.min(i, 20) * 20}ms` }}
            >
              <WordArt word={w} variant="thumb" className="w-14 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  {w.emoji && <span className="text-[16px] leading-none">{w.emoji}</span>}
                  <span className="font-bold text-[16px] tracking-tight">{w.word}</span>
                  {w.pos && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-white/6 border border-white/8 text-[var(--txt-faint)]">{w.pos}</span>}
                  {wrong && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[rgba(255,122,138,0.14)] border border-[rgba(255,122,138,0.4)] text-[var(--bad)] inline-flex items-center gap-0.5"><Icon icon={CircleAlert} size={10} /> 错词</span>}
                  {mastered && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[rgba(63,224,168,0.13)] border border-[rgba(63,224,168,0.4)] text-[var(--good)] inline-flex items-center gap-0.5"><Icon icon={Medal} size={10} /> 掌握</span>}
                  {fav && <Icon icon={Heart} size={13} className="text-[var(--bad)]" fill="currentColor" />}
                </div>
                <div className="text-[13px] text-[var(--txt-dim)] mt-0.5 truncate">{w.cn}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="flex items-center gap-1">
                  <SpeakButton text={w.word} word={w} size="sm" />
                  <button
                    onClick={(e) => { e.stopPropagation(); data.toggleFavorite(w.id) }}
                    aria-label={fav ? '取消收藏' : '收藏'}
                    title={fav ? '取消收藏' : '收藏'}
                    className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all active:scale-90 border ${fav ? 'bg-[rgba(255,122,138,0.14)] border-[rgba(255,122,138,0.4)] text-[var(--bad)]' : 'bg-white/4 border-white/8 text-[var(--txt-faint)] hover:text-[var(--bad)]'}`}
                  >
                    <Icon icon={Heart} size={15} fill={fav ? 'currentColor' : 'none'} />
                  </button>
                </div>
                <span className="text-[10px] text-[var(--txt-faint)]">{w.cat}</span>
              </div>
            </div>
          )
        })}
        {list.length === 0 && (
          <div className="py-14 text-center text-[var(--txt-dim)] inline-flex items-center gap-2 justify-center w-full"><Icon icon={SearchX} size={18} className="text-[var(--txt-faint)]" /> 没有匹配的单词</div>
        )}
      </div>

      {detailId && (
        <WordDetail
          id={detailId}
          onClose={() => setDetailId(null)}
          onStudy={() => {
            const w = WORDS.find((x) => x.id === detailId)
            if (!w) return
            setDetailId(null)
            setFlow({ queue: [w], title: '练这个词' })
          }}
        />
      )}
    </div>
  )
}
