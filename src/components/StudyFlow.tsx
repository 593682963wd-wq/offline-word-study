import { useCallback, useEffect, useRef, useState } from 'react'
import type { Word, Grade } from '../types'
import { useData } from '../hooks/useData'
import { useApp } from '../store/app'
import { isNew } from '../lib/srs'
import { speakWord, stopSpeak } from '../lib/tts'
import { Icon, PartyPopper, Dumbbell, Flame, ChevronLeft, Plane, Lightbulb, XCircle, HelpCircle, CheckCircle2, Zap } from './icons'
import { SpeakButton } from './ui'
import { WordArt } from './WordArt'

interface Props {
  queue: Word[]
  title: string
  onExit: () => void
}

export function StudyFlow({ queue, title, onExit }: Props) {
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [results, setResults] = useState<{ id: string; grade: Grade }[]>([])
  const [done, setDone] = useState(false)
  const savingRef = useRef(false)
  const data = useData()
  const settings = useApp((s) => s.settings)
  const word = queue[idx]
  const isFirstTime = word ? isNew(data.getState(word.id)) : false
  const gradesRef = useRef<Grade[]>([])
  const autoSpeakRef = useRef(settings.autoSpeak)
  const drag = useRef({ x: 0, y: 0, active: false, moved: false })
  const [dragDy, setDragDy] = useState(0)
  const [dragDx, setDragDx] = useState(0)
  autoSpeakRef.current = settings.autoSpeak

  useEffect(() => { stopSpeak() }, [])

  useEffect(() => {
    if (done || !word) return
    if (autoSpeakRef.current && !flipped) {
      const t = setTimeout(() => speakWord(word, { rate: settings.speakRate }), 350)
      return () => clearTimeout(t)
    }
  }, [idx, flipped, done, word, settings.speakRate])

  const grade = useCallback(async (g: Grade) => {
    if (!word || done || savingRef.current) return
    savingRef.current = true
    try {
      if (await data.gradeWord(word.id, g) === false) return
    } finally {
      savingRef.current = false
    }
    gradesRef.current.push(g)
    setResults((r) => [...r, { id: word.id, grade: g }])
    setFlipped(false)
    // 提交成功后再前进，失败时保留当前词以便重试。
    if (idx + 1 >= queue.length) {
      setDone(true)
      stopSpeak()
    } else {
      setIdx(idx + 1)
    }
  }, [word, idx, queue.length, done, data])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (done || !word) return
      if (e.key === ' ') { e.preventDefault(); setFlipped((f) => !f); return }
      const map: Record<string, Grade> = { '1': 'again', '2': 'hard', '3': 'good', '4': 'easy' }
      const g = map[e.key]
      if (g) { e.preventDefault(); grade(g) }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [done, word, grade, isFirstTime])

  // 滑动手势：上=认识 下=不认识 左=模糊 右=简单；轻点=翻面
  const onPointerDown = useCallback((e: React.PointerEvent) => {
    drag.current = { x: e.clientX, y: e.clientY, active: true, moved: false }
  }, [])
  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!drag.current.active || !word || done) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    if (Math.abs(dy) > 10 || Math.abs(dx) > 10) drag.current.moved = true
    if (drag.current.moved) { setDragDy(dy); setDragDx(dx) }
  }, [word, done])
  const onPointerUp = useCallback((e: React.PointerEvent) => {
    if (!drag.current.active) return
    const dx = e.clientX - drag.current.x
    const dy = e.clientY - drag.current.y
    const moved = drag.current.moved
    drag.current.active = false
    setDragDy(0); setDragDx(0)
    if (!moved) { setFlipped((f) => !f); return }
    if (Math.abs(dy) >= 70 && Math.abs(dy) > Math.abs(dx)) {
      grade(dy < 0 ? 'good' : 'again')
    } else if (Math.abs(dx) >= 70 && Math.abs(dx) > Math.abs(dy)) {
      grade(dx < 0 ? 'hard' : 'easy')
    }
  }, [grade])

  if (!word) return null

  if (done) {
    const correct = results.filter((r) => r.grade === 'good' || r.grade === 'easy').length
    const wrong = results.filter((r) => r.grade === 'again').length
    const hard = results.length - correct - wrong
    return (
      <div className="flex flex-col items-center justify-center py-10 anim-pop gap-6">
        <div className={`icon-tile w-24 h-24 !rounded-3xl ${wrong === 0 ? 'text-[var(--gold)]' : hard > 0 ? 'text-[var(--blue)]' : 'text-[var(--warn)]'}`}>
          <Icon icon={wrong === 0 ? PartyPopper : hard > 0 ? Dumbbell : Flame} size={44} />
        </div>
        <h2 className="text-2xl font-extrabold">本轮完成！</h2>
        <div className="grid grid-cols-3 gap-3 w-full max-w-sm">
          <div className="glass p-4 text-center"><div className="text-2xl font-extrabold text-[var(--good)]">{correct}</div><div className="text-xs text-[var(--txt-dim)] mt-1">认识</div></div>
          <div className="glass p-4 text-center"><div className="text-2xl font-extrabold text-[var(--warn)]">{hard}</div><div className="text-xs text-[var(--txt-dim)] mt-1">模糊</div></div>
          <div className="glass p-4 text-center"><div className="text-2xl font-extrabold text-[var(--bad)]">{wrong}</div><div className="text-xs text-[var(--txt-dim)] mt-1">不认识</div></div>
        </div>
        <p className="text-sm text-[var(--txt-dim)]">学过的词已按记忆曲线安排复习，答错的词已自动加入错词本。</p>
        <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
          <button
            className="btn btn-ghost"
            onClick={() => {
              setIdx(0); setResults([]); setDone(false); setFlipped(false); gradesRef.current = []
            }}
          >再来一组</button>
          <button className="btn btn-primary" onClick={onExit}>返回</button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4 anim-in">
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost !p-2 !rounded-xl" onClick={onExit} aria-label="退出">
          <Icon icon={ChevronLeft} size={18} strokeWidth={2.4} />
        </button>
        <div className="flex-1 progress-track h-2.5">
          <div className="progress-fill" style={{ width: `${((idx) / queue.length) * 100}%` }} />
        </div>
        <span className="text-sm font-semibold text-[var(--txt-dim)]">{idx + 1}/{queue.length}</span>
      </div>

      <div className="text-center text-xs font-bold uppercase tracking-[0.2em] text-[var(--txt-faint)] mb-1">{title}</div>

      {/* card：3D 翻卡 —— 正面藏义(词+音标+图) / 背面显义(释义+例句+助记)，仿 Flash 并超越 */}
      <div
        className="glass-strong relative cursor-grab active:cursor-grabbing select-none anim-pop touch-none before:content-[''] before:absolute before:left-0 before:top-6 before:bottom-6 before:w-[3px] before:rounded-full before:bg-gradient-to-b before:from-[#22d3ee] before:via-[#6366f1] before:to-[#a855f7] before:shadow-[0_0_12px_rgba(99,102,241,0.55)] before:z-10"
        style={{ transform: dragDy !== 0 || dragDx !== 0 ? `translate(${dragDx}px, ${dragDy}px) rotate(${dragDx * 0.02}deg)` : undefined, transition: dragDy === 0 && dragDx === 0 ? undefined : 'none', opacity: Math.max(0.35, 1 - Math.hypot(dragDx, dragDy) / 340) }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        role="button"
      >
        <div className={`flip3d ${flipped ? 'flipped' : ''}`}>
          {/* 正面：词 + 大号音标（双行焦点）+ 配图，不显示释义 */}
          <div key={`f-${word.id}`} className="flip-face flip-front flex flex-col items-center justify-center gap-4 min-h-[430px] sm:min-h-[480px] p-6 sm:p-8 text-center">
            <div className="relative w-full flex items-center justify-center">
              {word.cat && (
                <div className="absolute left-0 top-0 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[rgba(77,201,255,0.10)] border border-[rgba(77,201,255,0.35)] text-[var(--cyan)] tracking-[0.08em]">{word.cat}</div>
              )}
              <SpeakButton text={word.word} word={word} rate={settings.speakRate} size="lg" className="absolute right-0 top-0" />
            </div>
            <div className="flex items-center justify-center gap-3 flex-wrap">
              {word.emoji && <span className="text-4xl sm:text-5xl leading-none drop-shadow-[0_0_18px_rgba(77,201,255,0.35)]">{word.emoji}</span>}
              <span className="text-4xl sm:text-5xl font-extrabold tracking-tight break-words leading-tight bg-gradient-to-b from-[#e9f0ff] via-[#c7d6ff] to-[#d8b4fe] bg-clip-text text-transparent drop-shadow-[0_0_24px_rgba(77,201,255,0.22)]">{word.word}</span>
            </div>
            {word.phonetic && (
              <div className="text-2xl sm:text-[28px] font-semibold tracking-[0.08em] text-[#b39dff] drop-shadow-[0_0_16px_rgba(139,123,255,0.45)] -mt-2">{word.phonetic}</div>
            )}
            {word.note && (
              <div className="text-[13px] sm:text-sm text-[#9fd8ff] tracking-[0.04em] px-3 py-1.5 rounded-full bg-[rgba(77,201,255,0.08)] border border-[rgba(77,201,255,0.28)] -mt-1">{word.note}</div>
            )}
            {(() => {
              const wc = data.getState(word.id).wrongCount
              if (!wc) return null
              return (
                <div className="text-[13px] sm:text-sm font-bold text-[#ff5fa8] tracking-[0.04em] inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[rgba(255,95,168,0.10)] border border-[rgba(255,95,168,0.38)] shadow-[0_0_14px_rgba(255,95,168,0.18)] -mt-1">
                  <Icon icon={XCircle} size={14} /> 错题 {wc} 次，注意啦
                </div>
              )
            })()}
            <WordArt word={word} variant="banner" className="w-full max-w-md" />
            <div className="text-xs text-[var(--txt-faint)] mt-1">点击翻面 · 上滑认识 / 下滑不认识 / 左右滑模糊·简单</div>
          </div>

          {/* 背面：配图 + 释义 + 例句 + 大号助记 */}
          <div key={`b-${word.id}`} className="flip-face flip-back flex flex-col gap-4 min-h-[430px] sm:min-h-[480px] p-6 sm:p-8">
            <WordArt word={word} variant="banner" className="w-full" />
            <div className="text-center">
              <div className="text-2xl sm:text-3xl font-extrabold">{word.cn}</div>
              {word.pos && <div className="text-xs text-[var(--txt-faint)] mt-1">{word.pos}</div>}
            </div>
            {word.example && (
              <div className="glass p-4 text-xl sm:text-2xl leading-relaxed !border-[rgba(99,102,241,0.25)]">
                <Icon icon={Plane} size={19} className="text-[var(--txt-faint)] mr-1.5 inline -mt-0.5" />{word.example}
              </div>
            )}
            {(word.mnemonic || data.getState(word.id).mnemonicCustom) && (
              <div className="p-5 text-2xl sm:text-3xl leading-relaxed rounded-2xl bg-gradient-to-br from-[rgba(139,123,255,0.16)] to-[rgba(34,211,238,0.10)] border border-[rgba(139,123,255,0.30)] shadow-[0_6px_22px_rgba(88,74,220,0.18),inset_0_1px_0_rgba(255,255,255,0.05)]">
                <Icon icon={Lightbulb} size={24} className="text-[var(--gold)] mr-2 inline -mt-1 drop-shadow-[0_0_8px_rgba(255,196,92,0.4)]" />
                <span className="text-[var(--gold)] font-semibold drop-shadow-[0_0_12px_rgba(255,196,92,0.25)]">{word.mnemonic || data.getState(word.id).mnemonicCustom}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* grade buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <button className="btn !bg-[rgba(255,122,138,0.14)] !border !border-[rgba(255,122,138,0.4)] !text-[var(--bad)]" onClick={() => grade('again')}>
          <Icon icon={XCircle} size={16} className="mr-1.5 inline -mt-0.5" /> 不认识
        </button>
        <button className="btn !bg-[rgba(255,180,84,0.14)] !border !border-[rgba(255,180,84,0.35)] !text-[var(--warn)]" onClick={() => grade('hard')}>
          <Icon icon={HelpCircle} size={16} className="mr-1.5 inline -mt-0.5" /> 模糊
        </button>
        <button className="btn !bg-[rgba(63,224,168,0.13)] !border !border-[rgba(63,224,168,0.4)] !text-[var(--good)]" onClick={() => grade('good')}>
          <Icon icon={CheckCircle2} size={16} className="mr-1.5 inline -mt-0.5" /> 认识
        </button>
        <button className="btn btn-primary" onClick={() => grade('easy')}>
          <Icon icon={Zap} size={16} className="mr-1.5 inline -mt-0.5" /> 简单
        </button>
      </div>
      <div className="text-center text-xs text-[var(--txt-faint)]">快捷键 1-4 评分 · 空格 翻面 · 手机可滑动卡片评分</div>
    </div>
  )
}
