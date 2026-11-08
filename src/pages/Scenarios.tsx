import { useCallback, useEffect, useRef, useState } from 'react'
import scenariosRaw from '../data/scenarios.json'
import { SCENARIO_GROUPS } from '../types'
import type { ScenarioGroupKey, ScenarioTurn } from '../types'
import { useApp } from '../store/app'
import { speak, stopSpeak } from '../lib/tts'
import { Icon, Headphones, CheckCircle2, ChevronRight, ChevronLeft, Play, Square, EyeOff, Eye, Phone, MessageCircle, Volume2, Check } from '../components/icons'
import { SCENARIO_ICONS } from '../components/icons'

type ScenarioGroup = ScenarioTurn[][]
const SCENARIOS = scenariosRaw as unknown as Record<ScenarioGroupKey, ScenarioGroup>

const DONE_KEY = 'local-word-study-scenarios-done'

function loadDone(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DONE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

export function Scenarios() {
  const [open, setOpen] = useState<ScenarioGroupKey | null>(null)
  return open ? (
    <ScenarioViewer group={open} onBack={() => setOpen(null)} />
  ) : (
    <div className="flex flex-col gap-4 anim-in">
      <div className="glass p-5 scan-card">
        <h2 className="font-extrabold text-lg inline-flex items-center gap-2"><Icon icon={Headphones} size={20} className="text-[var(--cyan)]" /> 情景跟读</h2>
        <p className="text-xs text-[var(--txt-dim)] mt-1 leading-relaxed">
          原创合成对话：可隐藏中文对照。朗读需要设备提供离线英语语音。
        </p>
      </div>
      {Object.keys(SCENARIOS).map((k) => {
        const key = k as ScenarioGroupKey
        const meta = SCENARIO_GROUPS[key]
        const turns = SCENARIOS[key].flat().length
        const done = loadDone()[key] ?? 0
        const total = SCENARIOS[key].length
        return (
          <button
            key={key}
            onClick={() => setOpen(key)}
            className="glass p-5 text-left transition-all hover:brightness-115 active:scale-[0.985] anim-in"
          >
            <div className="flex items-center gap-4">
              <div className="icon-tile w-12 h-12 shrink-0"><Icon icon={SCENARIO_ICONS[meta.icon] ?? Headphones} size={22} /></div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[16px]">{meta.title}</span>
                  {done === total && total > 0 && <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-[rgba(63,224,168,0.14)] border border-[rgba(63,224,168,0.4)] text-[var(--good)] inline-flex items-center gap-0.5"><Icon icon={CheckCircle2} size={11} /> 已练完</span>}
                </div>
                <div className="text-xs text-[var(--txt-dim)] mt-0.5">{meta.desc}</div>
              </div>
              <div className="text-right shrink-0">
                <div className="text-[11px] text-[var(--txt-faint)]">{total} 组 · {turns} 句</div>
                <div className="text-[var(--cyan)] mt-1 text-sm font-bold inline-flex items-center gap-0.5">开始 <Icon icon={ChevronRight} size={14} /></div>
              </div>
            </div>
            {total > 1 && (
              <div className="progress-track h-1.5 mt-3"><div className="progress-fill" style={{ width: `${(done / total) * 100}%` }} /></div>
            )}
          </button>
        )
      })}
    </div>
  )
}

function ScenarioViewer({ group, onBack }: { group: ScenarioGroupKey; onBack: () => void }) {
  const settings = useApp((s) => s.settings)
  const meta = SCENARIO_GROUPS[group]
  const items = SCENARIOS[group]
  const [itemIdx, setItemIdx] = useState(0)
  const [showZh, setShowZh] = useState(true)
  const [playing, setPlaying] = useState(false)
  const playSessionRef = useRef(0)
  const nextTurnRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const stopPlayback = useCallback(() => {
    playSessionRef.current += 1
    if (nextTurnRef.current !== null) {
      clearTimeout(nextTurnRef.current)
      nextTurnRef.current = null
    }
    stopSpeak()
  }, [])

  useEffect(() => {
    stopPlayback()
    setPlaying(false)
    return stopPlayback
  }, [group, itemIdx, stopPlayback])

  const changeItem = (index: number) => {
    stopPlayback()
    setPlaying(false)
    setItemIdx(index)
  }

  const playAll = () => {
    if (playing) { stopPlayback(); setPlaying(false); return }
    stopPlayback()
    const session = playSessionRef.current
    const turns = items[itemIdx]
    let i = 0
    setPlaying(true)
    const step = () => {
      if (session !== playSessionRef.current) return
      nextTurnRef.current = null
      if (i >= turns.length) { setPlaying(false); return }
      speak(turns[i].en, {
        rate: settings.speakRate,
        onend: () => {
          if (session !== playSessionRef.current) return
          i += 1
          nextTurnRef.current = setTimeout(step, 400)
        },
      })
    }
    step()
  }

  const item = items[itemIdx]
  const turns = item
  const markDone = () => {
    // 完成返回只出现在最后一组，走完一遍即视为该情景全部练完
    const done = loadDone()
    done[group] = items.length
    localStorage.setItem(DONE_KEY, JSON.stringify(done))
  }

  return (
    <div className="flex flex-col gap-4 anim-in">
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost !p-2 !rounded-xl" onClick={onBack} aria-label="返回">
          <Icon icon={ChevronLeft} size={20} strokeWidth={2.4} />
        </button>
        <div className="flex-1">
          <div className="font-extrabold inline-flex items-center gap-2"><Icon icon={SCENARIO_ICONS[meta.icon] ?? Headphones} size={18} className="text-[var(--cyan)]" /> {meta.title}</div>
          <div className="text-[11px] text-[var(--txt-faint)]">第 {itemIdx + 1} / {items.length} 组 · {turns.length} 句</div>
        </div>
        <button onClick={() => setShowZh((v) => !v)} className={`chip !py-1.5 ${showZh ? '' : 'on'}`}><Icon icon={showZh ? EyeOff : Eye} size={14} /> {showZh ? '隐藏中文' : '显示中文'}</button>
      </div>

      {items.length > 1 && (
        <div className="flex gap-1.5">
          {items.map((_, i) => (
            <button key={i} onClick={() => changeItem(i)} className={`flex-1 h-1.5 rounded-full transition-colors ${i === itemIdx ? 'bg-[var(--cyan)] shadow-[0_0_8px_rgba(56,225,255,0.6)]' : 'bg-white/10 hover:bg-white/20'}`} aria-label={`第 ${i + 1} 组`} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {turns.map((t, i) => (
          <div key={i} className={`glass p-4 anim-in ${i === 0 ? '' : ''}`} style={{ animationDelay: `${Math.min(i, 10) * 30}ms` }}>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                t.speaker === '我方'
                  ? 'bg-[rgba(56,225,255,0.14)] text-[var(--cyan)] border border-[rgba(56,225,255,0.35)]'
                  : 'bg-[rgba(157,123,255,0.14)] text-[#b39dff] border border-[rgba(157,123,255,0.35)]'
              }`}>
                <Icon icon={t.speaker === '我方' ? Phone : MessageCircle} size={11} className="mr-1" /> {t.speaker === '我方' ? '我方' : '对方'}
              </span>
              <button
                className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--cyan)] bg-[rgba(56,225,255,0.12)] border border-[rgba(56,225,255,0.35)] active:scale-90 transition-transform"
                onClick={() => speak(t.en, { rate: settings.speakRate })}
                aria-label="播放本句"
              >
                <Icon icon={Volume2} size={13} fill="currentColor" strokeWidth={0} />
              </button>
            </div>
            <div className="text-[15px] font-semibold leading-relaxed">{t.en}</div>
            {showZh && t.zh && <div className="text-[13px] text-[var(--txt-dim)] mt-1.5 leading-relaxed">{t.zh}</div>}
          </div>
        ))}
      </div>

      <div className="sticky bottom-20 md:bottom-6 flex gap-2.5">
        <button className={`btn flex-1 ${playing ? 'btn-ghost' : 'btn-primary'}`} onClick={playAll}>
          {playing ? <><Icon icon={Square} size={16} /> 停止播放</> : <><Icon icon={Play} size={16} /> 顺序播放本组</>}
        </button>
        {itemIdx < items.length - 1 ? (
          <button className="btn btn-ghost" onClick={() => changeItem(itemIdx + 1)}>下一组 <Icon icon={ChevronRight} size={15} /></button>
        ) : (
          <button className="btn btn-ghost" onClick={() => { markDone(); onBack() }}><Icon icon={Check} size={15} /> 完成返回</button>
        )}
      </div>
    </div>
  )
}
