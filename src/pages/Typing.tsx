import { useEffect, useMemo, useRef, useState } from 'react'
import { CATS, WORDS, useData } from '../hooks/useData'
import { useApp } from '../store/app'
import { inWrongBook } from '../lib/srs'
import { speak, stopSpeak } from '../lib/tts'
import type { Word } from '../types'
import { Icon, Keyboard, Globe, CircleAlert, Heart, FolderOpen, Lightbulb, Trophy, Dumbbell, ChevronLeft, Timer, SkipForward, XCircle } from '../components/icons'
import { CAT_ICONS } from '../components/icons'
import type { LucideIcon } from 'lucide-react'

type Scope = 'all' | 'wrong' | 'fav' | 'cat'

const SCOPES: { key: Scope; label: string; icon: LucideIcon }[] = [
  { key: 'all', label: '全部', icon: Globe },
  { key: 'wrong', label: '错词本', icon: CircleAlert },
  { key: 'fav', label: '收藏', icon: Heart },
]

export function Typing() {
  const data = useData()
  const states = useData((s) => s.states)
  const settings = useApp((s) => s.settings)
  const [scope, setScope] = useState<Scope>('all')
  const [cat, setCat] = useState<string>(CATS[0].key)
  const [limit, setLimit] = useState(20)
  const [running, setRunning] = useState(false)

  const pool = useMemo(() => {
    const st = (id: string) => data.getState(id)
    let list: Word[]
    if (scope === 'wrong') list = WORDS.filter((w) => inWrongBook(st(w.id)))
    else if (scope === 'fav') list = WORDS.filter((w) => st(w.id).favorite === 1)
    else if (scope === 'cat') list = WORDS.filter((w) => w.cat === cat)
    else list = WORDS
    return list
  }, [data, states, scope, cat])

  const queue = useMemo(() => {
    if (!running) return []
    const arr = [...pool].sort(() => Math.random() - 0.5)
    return limit > 0 ? arr.slice(0, limit) : arr
  }, [running, pool, limit])

  return (
    <div className="flex flex-col gap-4 anim-in">
      {!running ? (
        <>
          <div className="glass p-5 scan-card">
            <h2 className="font-extrabold text-lg inline-flex items-center gap-2"><Icon icon={Keyboard} size={20} className="text-[var(--cyan)]" /> 打字练习</h2>
            <p className="text-xs text-[var(--txt-dim)] mt-1 leading-relaxed">
              看释义打出英文单词，逐字母校验。模拟 Qwerty Learner 的打字记忆法，让拼写变成肌肉记忆。
              多词短语直接打空格即可；期望字母不是空格时按空格可跳过当前单词，也可点「跳过本词」。
            </p>
            <div className="flex flex-wrap gap-2 mt-4">
              {SCOPES.map((s) => (
                <button key={s.key} onClick={() => setScope(s.key)} className={`chip ${scope === s.key ? 'on' : ''}`}><Icon icon={s.icon} size={14} /> {s.label}</button>
              ))}
              <button onClick={() => setScope('cat')} className={`chip ${scope === 'cat' ? 'on' : ''}`}><Icon icon={FolderOpen} size={14} /> 分类</button>
            </div>
            {scope === 'cat' && (
              <div className="flex gap-2 overflow-x-auto no-scrollbar mt-3 pb-1">
                {CATS.map((c) => (
                  <button key={c.key} onClick={() => setCat(c.key)} className={`chip shrink-0 ${cat === c.key ? 'on' : ''}`}><Icon icon={CAT_ICONS[c.icon] ?? FolderOpen} size={14} /> {c.label}</button>
                ))}
              </div>
            )}
            <div className="flex items-center gap-2 mt-4">
              <span className="text-sm text-[var(--txt-dim)]">练习数量</span>
              {[10, 20, 50, 0].map((n) => (
                <button key={n} onClick={() => setLimit(n)} className={`chip !px-4 ${limit === n ? 'on' : ''}`}>{n === 0 ? '全部' : n}</button>
              ))}
            </div>
            <button
              className="btn btn-primary w-full mt-5 !py-3.5"
              disabled={pool.length === 0}
              onClick={() => setRunning(true)}
            >
              {pool.length === 0 ? '该范围暂无单词' : `开始打字（${limit === 0 ? pool.length : Math.min(limit, pool.length)} 词）`}
            </button>
          </div>
          <div className="glass p-4 text-sm text-[var(--txt-dim)]">
            <div className="font-bold text-[var(--txt)] mb-1.5 inline-flex items-center gap-2"><Icon icon={Lightbulb} size={16} className="text-[var(--warn)]" /> 练习建议</div>
            <ul className="list-disc pl-4 flex flex-col gap-1 text-[13px]">
              <li>先看释义，在脑中回想单词，再打出来</li>
              <li>打错时会显示正确单词并朗读，跟着读一遍</li>
              <li>打字速度 = 拼写熟练度，练完看 WPM 提升</li>
            </ul>
          </div>
        </>
      ) : (
        <TypingSession words={queue} rate={settings.speakRate} onExit={() => setRunning(false)} />
      )}
    </div>
  )
}

function TypingSession({ words, rate, onExit }: { words: Word[]; rate: number; onExit: () => void }) {
  const [idx, setIdx] = useState(0)
  const [typed, setTyped] = useState('')
  const [wrongFlash, setWrongFlash] = useState(false)
  const [wrongCount, setWrongCount] = useState(0)
  // 净正确字母数：退格扣除被删除的字母；跳过时保留已实际输入的部分。
  const [correctLetters, setCorrectLetters] = useState(0)
  const [skips, setSkips] = useState(0)
  const [done, setDone] = useState(false)
  const startRef = useRef(Date.now())
  const [elapsed, setElapsed] = useState(0)

  const word = words[idx]
  const target = word ? word.word.toLowerCase().replace(/[^a-z\s'-]/g, '').trim() : ''
  // 允许空格原样，比较时忽略大小写与符号

  useEffect(() => { stopSpeak() }, [])
  useEffect(() => {
    if (done || !word) return
    const t = setInterval(() => setElapsed(Math.floor((Date.now() - startRef.current) / 1000)), 500)
    return () => clearInterval(t)
  }, [done, word])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (done || !word) return
      if (e.key === 'Escape') { stopSpeak(); onExit(); return }
      if (e.key === ' ') {
        e.preventDefault()
        const expected = target[typed.length]
        if (expected === ' ') {
          // 多词短语：空格是正常字符，直接输入
          setTyped((t) => t + ' ')
        } else {
          // 期望字符不是空格时，空格 = 跳过当前词
          setSkips((s) => s + 1)
          if (useApp.getState().settings.autoSpeak) speak(word.word, { rate })
          advance()
        }
        return
      }
      if (e.key.length === 1) {
        e.preventDefault()
        const expected = target[typed.length]
        if (e.key.toLowerCase() === expected) {
          setTyped((t) => t + expected)
          if (/^[a-z]$/i.test(e.key)) setCorrectLetters((n) => n + 1)
        } else {
          setWrongCount((n) => n + 1)
          setWrongFlash(true)
          setTimeout(() => setWrongFlash(false), 380)
        }
      } else if (e.key === 'Backspace' && typed.length > 0) {
        if (/^[a-z]$/.test(typed.slice(-1))) setCorrectLetters((n) => n - 1)
        setTyped((t) => t.slice(0, -1))
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [done, word, typed, target, rate, onExit])

  const advance = () => {
    if (idx + 1 >= words.length) {
      stopSpeak()
      setDone(true)
      setElapsed(Math.floor((Date.now() - startRef.current) / 1000))
    } else {
      setTyped('')
      setIdx(idx + 1)
    }
  }

  useEffect(() => {
    if (!word || done) return
    if (typed.length === target.length && target.length > 0) {
      const t = setTimeout(() => { if (useApp.getState().settings.autoSpeak) speak(word.word, { rate }); advance() }, 220)
      return () => clearTimeout(t)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typed, target, word, done, rate])

  if (!word) {
    return <div className="py-16 text-center text-[var(--txt-dim)]">队列为空，请返回重选</div>
  }

  if (done) {
    const wpm = elapsed > 0 ? Math.round(correctLetters / 5 / (elapsed / 60)) : 0
    return (
      <div className="glass p-6 text-center anim-pop scan-card">
        <div className="icon-tile w-20 h-20 mx-auto mb-3 !rounded-3xl">
          <Icon icon={wrongCount <= 3 ? Trophy : Dumbbell} size={38} />
        </div>
        <h2 className="text-2xl font-extrabold">练习完成！</h2>
        <div className="grid grid-cols-3 gap-3 mt-5">
          <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
            <div className="text-2xl font-extrabold text-[var(--cyan)]">{words.length}</div>
            <div className="text-xs text-[var(--txt-dim)] mt-1">完成词数</div>
          </div>
          <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
            <div className="text-2xl font-extrabold text-[var(--bad)]">{wrongCount}</div>
            <div className="text-xs text-[var(--txt-dim)] mt-1">打错次数</div>
          </div>
          <div className="rounded-2xl bg-white/4 border border-white/6 p-4">
            <div className="text-2xl font-extrabold text-[var(--good)]">{wpm}</div>
            <div className="text-xs text-[var(--txt-dim)] mt-1">WPM 速度</div>
          </div>
        </div>
        <p className="text-xs text-[var(--txt-faint)] mt-3">{elapsed} 秒 · 跳过 {skips} 词</p>
        <button className="btn btn-primary w-full mt-5" onClick={() => { startRef.current = Date.now(); setIdx(0); setTyped(''); setWrongCount(0); setCorrectLetters(0); setSkips(0); setElapsed(0); setDone(false) }}>再练一轮</button>
        <button className="btn btn-ghost w-full mt-2.5" onClick={onExit}>返回</button>
      </div>
    )
  }

  const chars = target.split('')
  const ok = typed.length

  return (
    <div className="flex flex-col gap-4 anim-in">
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost !p-2 !rounded-xl" onClick={onExit} aria-label="退出">
          <Icon icon={ChevronLeft} size={20} strokeWidth={2.4} />
        </button>
        <div className="flex-1 progress-track h-2.5"><div className="progress-fill" style={{ width: `${(idx / words.length) * 100}%` }} /></div>
        <span className="text-sm font-semibold text-[var(--txt-dim)]">{idx + 1}/{words.length}</span>
      </div>

      <div className="glass-strong p-6 sm:p-8 anim-pop" key={`t-${idx}`}>
        <div className="text-center text-xs font-bold uppercase tracking-[0.2em] text-[var(--txt-faint)] mb-4 inline-flex items-center gap-1.5 justify-center w-full"><Icon icon={Keyboard} size={13} /> TYPING LAB</div>
        <div className="text-lg font-bold text-center leading-snug">{word.cn}</div>
        {word.phonetic && <div className="text-[var(--cyan)] text-sm text-center mt-1.5">{word.phonetic}</div>}

        {/* 字母显示 */}
        <div className={`flex justify-center flex-wrap gap-1.5 my-7 ${wrongFlash ? 'anim-shake' : ''}`}>
          {chars.map((ch, i) => {
            if (i < ok) {
              return <span key={i} className="w-6 h-8 sm:w-7 sm:h-9 rounded-lg bg-[rgba(63,224,168,0.15)] border border-[rgba(63,224,168,0.45)] text-[var(--good)] flex items-center justify-center font-mono font-bold text-lg sm:text-xl anim-pop">{ch}</span>
            }
            if (i === ok) {
              return <span key={i} className="w-6 h-8 sm:w-7 sm:h-9 rounded-lg bg-[rgba(56,225,255,0.16)] border border-[var(--cyan)] text-[var(--cyan)] flex items-center justify-center font-mono font-bold text-lg sm:text-xl anim-glow">{ch === ' ' ? '␣' : ch}</span>
            }
            return <span key={i} className="w-6 h-8 sm:w-7 sm:h-9 rounded-lg bg-white/4 border border-white/8 text-transparent flex items-center justify-center font-mono font-bold text-lg sm:text-xl">{ch === ' ' ? '␣' : ch}</span>
          })}
        </div>

        <div className="flex items-center justify-center gap-4 text-xs text-[var(--txt-faint)]">
          <span className="inline-flex items-center gap-1"><Icon icon={XCircle} size={13} className="text-[var(--bad)]" /> 打错 {wrongCount}</span>
          <span className="inline-flex items-center gap-1"><Icon icon={Timer} size={13} className="text-[var(--warn)]" /> {elapsed} 秒</span>
          <span className="inline-flex items-center gap-1"><Icon icon={SkipForward} size={13} /> 跳过 {skips}</span>
        </div>
        <div className="flex items-center justify-center gap-3 mt-4">
          <button
            className="chip !py-1.5"
            onClick={() => { setSkips((n) => n + 1); if (useApp.getState().settings.autoSpeak) speak(word.word, { rate }); advance() }}
          >
            <Icon icon={SkipForward} size={13} /> 跳过本词
          </button>
          <span className="text-xs text-[var(--txt-faint)]">直接打字即可 · 空格输入空格 · Esc 退出</span>
        </div>
      </div>
    </div>
  )
}
