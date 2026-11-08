import { useCallback, useEffect, useRef, useState } from 'react'
import type { QuizQuestion, QuizMode } from '../types'
import { useData } from '../hooks/useData'
import { useApp } from '../store/app'
import { MODE_META, checkNear } from '../lib/quiz'
import { speakWord, stopSpeak } from '../lib/tts'
import { Icon, MODE_ICONS, PenLine, ChevronLeft, Trophy, PartyPopper, Dumbbell, Volume2, Check, X, Zap } from './icons'
import { SpeakButton } from './ui'
import { WordDetail } from './WordDetail'
import { WordArt } from './WordArt'

interface Props {
  questions: QuizQuestion[]
  mode: QuizMode
  onExit: () => void
  onRestartWrong?: () => void
  title?: string
}

interface ResultItem { q: QuizQuestion; correct: boolean; near?: boolean }

export function QuizRunner({ questions, mode, onExit, onRestartWrong, title }: Props) {
  const [idx, setIdx] = useState(0)
  const [selected, setSelected] = useState<number | null>(null)
  const [input, setInput] = useState('')
  const [answered, setAnswered] = useState(false)
  const [results, setResults] = useState<ResultItem[]>([])
  const [detailId, setDetailId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const savingRef = useRef(false)
  const data = useData()
  const settings = useApp((s) => s.settings)
  const q = questions[idx]
  const meta = MODE_META[mode]
  const isInput = mode === 'spell' || mode === 'dictation'
  const isListen = mode === 'listen' || mode === 'dictation'
  const inputRes = isInput && answered ? checkNear(input, q?.accepted ?? []) : null

/** Flash 风格题干容器：渐变深底 + 底部中心高光线 */
function Prompter({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full rounded-2xl p-5 sm:p-6 bg-[linear-gradient(165deg,rgba(34,211,238,0.07),rgba(99,102,241,0.09)_50%,rgba(168,85,247,0.07))] border border-[rgba(96,140,255,0.16)] shadow-[inset_0_1px_0_rgba(255,255,255,0.04),inset_0_0_30px_rgba(77,201,255,0.05)]">
      {children}
      <span className="absolute left-[22%] right-[22%] bottom-[-1px] h-px bg-gradient-to-r from-transparent via-[rgba(77,201,255,0.6)] to-transparent pointer-events-none" />
    </div>
  )
}

  const speakIt = useCallback(() => {
    if (!q) return
    speakWord(q.word, { rate: settings.speakRate })
  }, [q, settings.speakRate])

  useEffect(() => { stopSpeak() }, [])
  useEffect(() => {
    setSelected(null); setInput(''); setAnswered(false)
    if (isListen) { const t = setTimeout(speakIt, 450); return () => clearTimeout(t) }
  }, [idx, isListen, speakIt])

  const submit = useCallback(() => {
    if (!q || answered) return
    let correct: boolean
    let near = false
    if (isInput) {
      const r = checkNear(input, q.accepted ?? [])
      correct = r.ok
      near = r.near
    } else if (mode === 'judge') {
      correct = (selected === 1) === (q.judgeCorrect ?? true)
    } else {
      correct = selected === q.correctIndex
    }
    if (!correct && isInput && settings.autoSpeak) {
      speakWord(q.word, { rate: settings.speakRate }) // 错了：读一遍正确发音
    }
    setAnswered(true)
    setResults((r) => [...r, { q, correct, near }])
  }, [q, answered, isInput, input, selected, mode, settings.speakRate, settings.autoSpeak])

  /** 选择题选项（键盘/点击共用） */
  const pick = useCallback((i: number) => {
    if (!q || answered || mode === 'judge') return
    setSelected(i); setAnswered(true)
    if (i !== q.correctIndex && settings.autoSpeak) speakWord(q.word, { rate: settings.speakRate })
    setResults((r) => [...r, { q, correct: i === q.correctIndex }])
  }, [q, answered, mode, settings.speakRate, settings.autoSpeak])

  /** judge 选项：1=正确 0=错误（键盘/点击共用） */
  const pickJudge = useCallback((v: number) => {
    if (!q || answered || mode !== 'judge') return
    const ok = v === (q.judgeCorrect ? 1 : 0)
    setSelected(v); setAnswered(true)
    if (!ok && settings.autoSpeak) speakWord(q.word, { rate: settings.speakRate })
    setResults((r) => [...r, { q, correct: ok }])
  }, [q, answered, mode, settings.speakRate, settings.autoSpeak])

  // 键盘快捷键（融合 Flash 测验交互）：1-4 选 MC 选项，judge 用 1/2
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (answered || !q) return
      if (isInput) return // 输入题由回车处理
      if (mode === 'judge') {
        if (e.key === '1') { e.preventDefault(); pickJudge(1) }
        else if (e.key === '2') { e.preventDefault(); pickJudge(0) }
        return
      }
      const n = parseInt(e.key, 10)
      if (n >= 1 && n <= (q.options?.length ?? 0)) {
        e.preventDefault()
        pick(n - 1)
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [q, answered, isInput, mode, pick, pickJudge])

  const next = useCallback(async () => {
    if (savingRef.current || !answered) return
    if (idx + 1 >= questions.length) {
      savingRef.current = true
      setSaving(true)
      stopSpeak()
      try {
        const saved = await data.quizRecord(results.map((r) => ({ id: r.q.word.id, correct: r.correct, near: r.near })))
        if (saved !== false) setIdx(idx + 1)
      } finally {
        savingRef.current = false
        setSaving(false)
      }
      return
    }
    setIdx(idx + 1)
  }, [idx, questions.length, results, data, answered])

  // ---- result screen ----
  if (idx >= questions.length) {
    const correct = results.filter((r) => r.correct).length
    const nearCount = results.filter((r) => r.near).length
    const wrong = results.filter((r) => !r.correct)
    const pct = Math.round((correct / Math.max(1, results.length)) * 100)
    const ResultIcon = pct >= 90 ? Trophy : pct >= 60 ? PartyPopper : Dumbbell
    const resultTone = pct >= 90 ? 'text-[var(--gold)]' : pct >= 60 ? 'text-[var(--blue)]' : 'text-[var(--violet)]'
    return (
      <div className="flex flex-col items-center gap-5 py-8 anim-pop">
        <div className={`icon-tile w-24 h-24 !rounded-3xl ${resultTone} !text-5xl`}>
          <Icon icon={ResultIcon} size={44} />
        </div>
        <h2 className="text-2xl font-extrabold">{pct >= 90 ? '太棒了！' : pct >= 60 ? '不错！' : '继续加油！'}</h2>
        <div className="text-4xl font-extrabold text-[var(--gold)]">{correct}<span className="text-lg text-[var(--txt-dim)]">/{results.length}</span></div>
        <div className="progress-track w-full max-w-sm h-3"><div className="progress-fill" style={{ width: `${pct}%` }} /></div>
        {nearCount > 0 && (
          <div className="text-sm text-[var(--warn)] inline-flex items-center gap-1.5">
            <Icon icon={Zap} size={15} /> 容错通过 {nearCount} 次（差一个字母，已提醒正确拼写并加入错词本强化）
          </div>
        )}
        {wrong.length > 0 && (
          <div className="w-full max-w-sm glass p-4">
            <div className="text-sm font-bold mb-2">错词回顾（已加入错词本）</div>
            <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto">
              {wrong.map((r) => (
                <button key={r.q.word.id} className="text-left text-sm flex items-center gap-2 py-1 hover:opacity-80"
                  onClick={() => setDetailId(r.q.word.id)}>
                  <Icon icon={X} size={14} className="text-[var(--bad)] shrink-0" />
                  <span className="font-semibold">{r.q.word.word}</span>
                  {r.near && <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-[rgba(255,196,86,0.14)] border border-[rgba(255,196,86,0.4)] text-[var(--warn)] shrink-0">容错</span>}
                  <span className="text-[var(--txt-faint)] text-xs truncate flex-1">{r.q.word.cn}</span>
                  <span className="text-[var(--txt-faint)]">查看</span>
                </button>
              ))}
            </div>
            {onRestartWrong && (
              <button className="btn btn-ghost w-full mt-3 text-sm" onClick={onRestartWrong}>再练一次错词</button>
            )}
          </div>
        )}
        <button className="btn btn-primary w-full max-w-sm" onClick={onExit}>返回</button>
        {detailId && <WordDetail id={detailId} onClose={() => setDetailId(null)} />}
      </div>
    )
  }

  if (!q) return null

  const optState = (i: number) => {
    if (!answered) return ''
    if (i === q.correctIndex) return 'correct'
    if (i === selected && selected !== q.correctIndex) return 'wrong'
    return 'dim'
  }

  return (
    <div className="flex flex-col gap-4 anim-in">
      <div className="flex items-center gap-3">
        <button className="btn btn-ghost !p-2 !rounded-xl" onClick={onExit} aria-label="退出">
          <Icon icon={ChevronLeft} size={18} strokeWidth={2.4} />
        </button>
        <div className="flex-1 progress-track h-2.5"><div className="progress-fill" style={{ width: `${(idx / questions.length) * 100}%` }} /></div>
        <span className="text-sm font-semibold text-[var(--txt-dim)]">{idx + 1}/{questions.length}</span>
      </div>

      <div className="flex items-center justify-center gap-2 flex-wrap">
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[linear-gradient(135deg,rgba(34,211,238,0.16),rgba(99,102,241,0.2)_55%,rgba(168,85,247,0.16))] border border-[rgba(99,102,241,0.45)] text-[#9be8ff] text-[13px] font-semibold tracking-[0.04em] shadow-[0_0_16px_rgba(99,102,241,0.2),inset_0_1px_0_rgba(255,255,255,0.06)]">
          <Icon icon={MODE_ICONS[mode] ?? PenLine} size={14} className="-mt-0.5" /> {meta.name}
          <span className="opacity-45 mx-0.5">·</span> {q.word.cat}
        </span>
        {title && <span className="text-[var(--cyan)] text-[13px] font-bold">{title}</span>}
      </div>

      <div className="glass-strong relative overflow-hidden p-6 sm:p-8 flex flex-col items-center gap-4 anim-pop before:content-[''] before:absolute before:top-0 before:left-[12%] before:right-[12%] before:h-px before:bg-[linear-gradient(90deg,transparent,rgba(34,211,238,0.85),rgba(168,85,247,0.85),transparent)]" key={`q-${idx}`}>
        {/* prompt */}
        {mode === 'en2cn' && (
          <Prompter>
            <div className="flex flex-col items-center gap-3 w-full">
              <WordArt word={q.word} variant="banner" className="w-full max-w-md" />
              <div className="flex items-center gap-3 flex-wrap justify-center">
                <h3 className="text-4xl font-extrabold tracking-tight text-center bg-gradient-to-r from-[#e9f0ff] via-[#c7d6ff] to-[#d8b4fe] bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(77,201,255,0.30)]">{q.word.word}</h3>
                <SpeakButton text={q.word.word} word={q.word} rate={settings.speakRate} />
              </div>
            </div>
          </Prompter>
        )}
        {mode === 'cn2en' && (
          <Prompter>
            <h3 className="text-4xl font-extrabold text-center leading-snug bg-gradient-to-r from-[#7de9ff] to-[#c4b5fd] bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(99,102,241,0.28)]">{q.word.cn}</h3>
          </Prompter>
        )}
        {mode === 'listen' && (
          <Prompter>
            <button className="w-20 h-20 rounded-full flex items-center justify-center text-white bg-[linear-gradient(135deg,#22d3ee,#6366f1_55%,#a855f7)] border border-[rgba(77,201,255,0.45)] active:scale-90 transition-transform shadow-[0_8px_22px_rgba(76,130,255,0.5),0_0_18px_rgba(77,201,255,0.35)]" onClick={speakIt} aria-label="重听">
              <Icon icon={Volume2} size={32} strokeWidth={2.2} className="drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]" />
            </button>
          </Prompter>
        )}
        {mode === 'spell' && (
          <Prompter>
            <div className="text-center">
              <div className="text-2xl font-bold mb-1">{q.word.cn}</div>
              {q.word.phonetic && <div className="text-[#b39dff] text-sm mb-3 drop-shadow-[0_0_10px_rgba(139,123,255,0.3)]">{q.word.phonetic}</div>}
              <div className="flex items-center justify-center gap-2">
                <SpeakButton text={q.word.word} word={q.word} rate={settings.speakRate} />
                <span className="text-xs text-[var(--txt-faint)]">听发音辅助拼写</span>
              </div>
            </div>
          </Prompter>
        )}
        {mode === 'dictation' && (
          <Prompter>
            <div className="text-center">
              <div className="text-xs text-[var(--txt-faint)] mb-2">听写 · 只听发音写出单词</div>
              <button className="w-20 h-20 rounded-full flex items-center justify-center text-white bg-[linear-gradient(135deg,#22d3ee,#6366f1_55%,#a855f7)] border border-[rgba(77,201,255,0.45)] active:scale-90 transition-transform shadow-[0_8px_22px_rgba(76,130,255,0.5),0_0_18px_rgba(77,201,255,0.35)]" onClick={speakIt} aria-label="重听">
                <Icon icon={Volume2} size={32} strokeWidth={2.2} className="drop-shadow-[0_0_6px_rgba(255,255,255,0.5)]" />
              </button>
            </div>
          </Prompter>
        )}

        {/* judge: 快速判断 */}
        {mode === 'judge' && (
          <div className="w-full flex flex-col items-center gap-4">
            <Prompter>
              <div className="flex flex-col items-center gap-3 w-full">
                <WordArt word={q.word} variant="banner" className="w-full max-w-md" />
                <div className="flex items-center gap-3 flex-wrap justify-center">
                  <h3 className="text-4xl font-extrabold tracking-tight text-center bg-gradient-to-r from-[#e9f0ff] via-[#c7d6ff] to-[#d8b4fe] bg-clip-text text-transparent drop-shadow-[0_0_16px_rgba(77,201,255,0.30)]">{q.word.word}</h3>
                  <SpeakButton text={q.word.word} word={q.word} rate={settings.speakRate} />
                </div>
                <div className="text-center anim-pop" key={`pair-${idx}`}>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-[var(--txt-faint)] mb-1.5">配对释义</div>
                  <div className="text-3xl font-extrabold text-[var(--txt)] leading-snug max-w-md">{q.judgeCorrect ? q.word.cn : (q.judgeCn ?? q.word.cn)}</div>
                </div>
              </div>
            </Prompter>
            <div className="w-full grid grid-cols-2 gap-3">
              {([1, 0] as const).map((v) => {
                const rightVal = q.judgeCorrect ? 1 : 0
                const st = !answered ? '' : v === rightVal ? 'correct' : v === selected ? 'wrong' : 'dim'
                return (
                  <button
                    key={v}
                    data-opt
                    disabled={answered}
                    onClick={() => pickJudge(v)}
                    className={`py-4 rounded-2xl border text-[15px] font-bold transition-all flex items-center justify-center gap-2 ${
                      !answered
                        ? v === 1
                          ? 'bg-[rgba(63,224,168,0.08)] border-[rgba(63,224,168,0.35)] text-[var(--good)] hover:bg-[rgba(63,224,168,0.16)] active:scale-[0.97]'
                          : 'bg-[rgba(255,122,138,0.08)] border-[rgba(255,122,138,0.35)] text-[var(--bad)] hover:bg-[rgba(255,122,138,0.16)] active:scale-[0.97]'
                        : st === 'correct' ? 'bg-[rgba(63,224,168,0.14)] border-[rgba(63,224,168,0.5)] text-[var(--good)]'
                        : st === 'wrong' ? 'bg-[rgba(255,122,138,0.14)] border-[rgba(255,122,138,0.5)] text-[var(--bad)] anim-shake'
                        : 'opacity-40 border-white/5 bg-white/5'
                    }`}
                  >
                    {v === 1 ? <><Icon icon={Check} size={18} strokeWidth={2.6} /> 正确</> : <><Icon icon={X} size={18} strokeWidth={2.6} /> 错误</>}
                  </button>
                )
              })}
            </div>
            {answered && (
              <div className={`text-sm font-bold anim-pop ${(selected === 1) === (q.judgeCorrect ?? true) ? 'text-[var(--good)]' : 'text-[var(--bad)]'}`}>
                {(selected === 1) === (q.judgeCorrect ?? true) ? '答对了！' : `正确答案是「${q.word.cn}」`}
              </div>
            )}
            <div className="text-[11px] text-[var(--txt-faint)]">快捷键：1=正确 2=错误</div>
          </div>
        )}

        {/* MC options */}
        {!isInput && mode !== 'judge' && (
          <div className="w-full grid gap-2.5">
            {q.options!.map((opt, i) => {
              const st = optState(i)
              return (
                <button
                  key={i}
                  data-opt
                  disabled={answered}
                  onClick={() => pick(i)}
                  className={`group relative w-full text-left px-4 py-3.5 rounded-2xl border transition-all text-[15px] leading-snug overflow-hidden flex items-center gap-3 ${
                    !answered
                      ? 'bg-[linear-gradient(160deg,rgba(22,31,52,0.92),rgba(15,22,38,0.78))] border-[rgba(96,140,255,0.18)] hover:-translate-y-0.5 hover:border-[rgba(77,201,255,0.5)] hover:shadow-[0_10px_26px_rgba(2,8,26,0.5),0_0_18px_rgba(77,201,255,0.15)] active:scale-[0.98]'
                      : st === 'correct' ? 'bg-[linear-gradient(160deg,rgba(45,212,191,0.17),rgba(45,212,191,0.05))] border-[rgba(45,212,191,0.7)] text-[#5eead4] shadow-[0_0_22px_rgba(45,212,191,0.22)]'
                      : st === 'wrong' ? 'bg-[linear-gradient(160deg,rgba(255,107,122,0.16),rgba(255,107,122,0.05))] border-[rgba(255,107,122,0.7)] text-[#ff8fa0] shadow-[0_0_22px_rgba(255,107,122,0.2)] anim-shake'
                      : 'opacity-40 border-white/5 bg-white/5'
                  }`}
                >
                  <span className={`flex-none w-8 h-8 rounded-[10px] flex items-center justify-center text-[15px] font-extrabold border transition-all ${
                    !answered
                      ? 'text-[#8fd8ff] bg-[rgba(77,201,255,0.09)] border-[rgba(77,201,255,0.3)] group-hover:bg-[linear-gradient(135deg,#22d3ee,#6366f1)] group-hover:text-white group-hover:border-transparent group-hover:shadow-[0_0_14px_rgba(99,102,241,0.55)]'
                      : st === 'correct' ? 'bg-[rgba(45,212,191,0.2)] border-[rgba(45,212,191,0.65)] text-[#5eead4]'
                      : st === 'wrong' ? 'bg-[rgba(255,107,122,0.18)] border-[rgba(255,107,122,0.6)] text-[#ff8fa0]'
                      : 'text-[var(--txt-faint)] bg-white/4 border-white/8'
                  }`}>{String.fromCharCode(65 + i)}</span>
                  <span className="flex-1 min-w-0">{opt}</span>
                  {answered && i === q.correctIndex && <Icon icon={Check} size={16} className="flex-none text-[var(--good)]" />}
                  {answered && i === selected && i !== q.correctIndex && <Icon icon={X} size={16} className="flex-none text-[var(--bad)]" />}
                </button>
              )
            })}
            <div className="text-[11px] text-[var(--txt-faint)] -mt-1">快捷键：1-4 直接作答</div>
          </div>
        )}

        {/* input answer */}
        {isInput && (
          <div className="w-full flex flex-col gap-3">
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { answered ? next() : submit() } }}
              disabled={answered}
              placeholder="输入英文单词…"
              className={`w-full text-center text-xl font-semibold tracking-wider py-3.5 rounded-2xl outline-none border transition-colors bg-black/20 ${
                answered
                  ? inputRes?.ok
                    ? 'border-[rgba(63,224,168,0.5)] text-[var(--good)]'
                    : inputRes?.near
                      ? 'border-[rgba(255,196,86,0.55)] text-[var(--warn)]'
                      : 'border-[rgba(255,122,138,0.5)] text-[var(--bad)]'
                  : 'border-white/15 focus:border-[var(--gold)]'
              }`}
              autoCapitalize="off" autoCorrect="off" spellCheck={false}
            />
            {answered && isInput && !inputRes?.ok && (
              <div className="text-center text-sm anim-pop flex flex-col gap-1">
                {inputRes?.near ? (
                  <div className="text-[var(--warn)] font-bold inline-flex items-center justify-center gap-1.5">
                    <Icon icon={Zap} size={15} /> 很接近！容错通过，记住正确拼写
                  </div>
                ) : (
                  <div className="text-[var(--bad)] font-bold">拼写不正确</div>
                )}
                <div className="inline-flex items-center justify-center gap-2 flex-wrap">
                  <span className="text-[var(--txt-dim)]">你写的：<span className="line-through">{input.trim() || '（空）'}</span></span>
                  <span>正确答案：<span className="font-bold text-[var(--good)]">{q.word.word}</span></span>
                </div>
                <div className="text-[11px] text-[var(--txt-faint)]">{inputRes?.near ? '已加入错词本强化记忆' : '已加入错词本'}</div>
              </div>
            )}
            {answered && isInput && inputRes?.ok && (
              <div className="text-center text-sm anim-pop text-[var(--good)] font-bold">拼写正确！</div>
            )}
            <button className="btn btn-ghost text-sm inline-flex items-center justify-center gap-1.5" onClick={() => speakWord(q.word, { rate: settings.speakRate })}>
              <Icon icon={Volume2} size={15} /> 再听一遍
            </button>
          </div>
        )}

        {/* next */}
        {answered && (
          <button className="btn btn-primary w-full" onClick={next} disabled={saving}>{saving ? '正在保存…' : idx + 1 >= questions.length ? '查看结果' : '下一题'}</button>
        )}
        {isInput && !answered && (
          <button className="btn btn-primary w-full" onClick={submit}>检查</button>
        )}
      </div>

      {detailId && <WordDetail id={detailId} onClose={() => setDetailId(null)} />}
    </div>
  )
}
