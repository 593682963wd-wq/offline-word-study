import { useState } from 'react'
import type { Word } from '../types'
import { useData, wordById } from '../hooks/useData'
import { isMastered, isNew, inWrongBook } from '../lib/srs'
import { Icon, Heart, Lightbulb, PenLine, Check, XCircle, HelpCircle, CheckCircle2, Zap, Plane } from './icons'
import { Modal, SpeakButton } from './ui'
import { useToast } from '../store/toast'
import { WordArt } from './WordArt'

const PRESET_TAGS = ['易混淆', '常考', '难记', '已掌握']

export function WordDetail({ id, onClose, onStudy }: { id: string; onClose: () => void; onStudy?: () => void }) {
  const word: Word = wordById(id)
  const state = useData((s) => s.states.get(id))
  const data = useData()
  const toast = useToast((s) => s.push)
  const [note, setNote] = useState(state?.note ?? '')
  const [mnemonic, setMnemonic] = useState(state?.mnemonicCustom ?? '')
  const [tagInput, setTagInput] = useState('')
  const [saved, setSaved] = useState(false)
  if (!word) return null

  const tags = state?.tags ?? []

  const fav = (state?.favorite ?? 0) === 1
  const mastered = state ? isMastered(state) : false
  const wrong = state ? inWrongBook(state) : false
  const fresh = state ? isNew(state) : true

  const flash = async (fn: () => Promise<boolean>) => {
    setSaved(false)
    if (await fn() === false) return
    setSaved(true)
    setTimeout(() => setSaved(false), 1200)
  }

  return (
    <Modal open onClose={onClose} title="单词详情">
      <div className="flex flex-col gap-5">
        {/* word head */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
                {word.emoji && <span className="text-3xl leading-none">{word.emoji}</span>}
                <span>{word.word}</span>
              </h2>
              {word.pos && <span className="chip !py-1 !px-2.5 !text-xs" style={{ opacity: .85 }}>{word.pos}</span>}
            </div>
            {word.phonetic && <div className="text-[var(--gold)] mt-1 text-base font-medium">{word.phonetic}</div>}
            <div className="mt-2 text-lg font-semibold text-[var(--txt-dim)]">{word.cn}</div>
          </div>
          <div className="flex flex-col items-center gap-2">
            <SpeakButton text={word.word} word={word} size="lg" />
            <button
              className={`transition-transform active:scale-75 ${fav ? 'text-[var(--bad)] drop-shadow-[0_0_10px_rgba(255,122,138,0.6)]' : 'grayscale opacity-50'}`}
              onClick={() => flash(() => data.toggleFavorite(id))}
              aria-label="收藏"
            >
              <Icon icon={Heart} size={26} fill={fav ? 'currentColor' : 'none'} />
            </button>
          </div>
        </div>

        {/* 内置标注：缩写/全称 note + 北约音标字母（对齐 Flash openSheet） */}
        {(word.note || word.cat === 'ICAO字母读法') && (
          <div className="flex flex-wrap gap-2">
            {word.note && (
              <span className="chip !py-1 !px-2.5 !text-[13px] !text-[#9fd8ff] !border-[rgba(77,201,255,0.35)] !bg-[rgba(77,201,255,0.08)]">
                <Icon icon={Zap} size={13} className="inline mr-1 -mt-0.5" />{word.note}
              </span>
            )}
            {word.cat === 'ICAO字母读法' && (
              <span className="chip !py-1 !px-2.5 !text-[13px] !text-[var(--accent)]">
                <Icon icon={Plane} size={13} className="inline mr-1 -mt-0.5" />北约音标字母
              </span>
            )}
          </div>
        )}

        {/* badges */}
        <div className="flex flex-wrap gap-2 text-xs">
          <span className="chip !py-1 !px-2.5">{word.cat}</span>
          {tags.map((t) => (
            <span key={t} className="chip !py-1 !px-2.5 !text-[var(--cyan)]">{t}</span>
          ))}
          {fresh && <span className="chip !py-1 !px-2.5 !text-[var(--accent)]">新词</span>}
          {mastered && <span className="chip !py-1 !px-2.5 !text-[var(--good)]">已掌握 L{state?.level ?? 0}</span>}
          {!fresh && !mastered && <span className="chip !py-1 !px-2.5">等级 L{state?.level ?? 0}</span>}
          {wrong && <span className="chip !py-1 !px-2.5 !text-[var(--bad)]">错 {state?.wrongCount} 次</span>}
          {!wrong && (state?.correctCount ?? 0) > 0 && <span className="chip !py-1 !px-2.5 !text-[var(--good)]">对 {state?.correctCount} 次</span>}
          {(state?.reviewCount ?? 0) > 0 && <span className="chip !py-1 !px-2.5">复习 {state?.reviewCount} 次</span>}
        </div>

        {/* 语义配图 */}
        <WordArt word={word} variant="hero" className="w-full" />

        {/* example */}
        {word.example && (
          <div className="glass p-4">
            <div className="text-xs font-bold text-[var(--txt-faint)] uppercase tracking-wider mb-1.5">例句</div>
            <div className="leading-relaxed text-lg sm:text-xl">{word.example}</div>
          </div>
        )}

        {/* mnemonic */}
        <div className="glass p-4">
          <div className="text-xs font-bold text-[var(--txt-faint)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Icon icon={Lightbulb} size={14} className="text-[var(--gold)]" />助记</div>
          {word.mnemonic ? (
            <div className="leading-relaxed text-2xl sm:text-3xl text-[var(--gold)] font-semibold">{word.mnemonic}</div>
          ) : (
            <div className="text-base text-[var(--txt-faint)]">暂无内置助记，可添加你自己的联想</div>
          )}
          <textarea
            className="mt-3 w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm outline-none focus:border-[var(--gold)] transition-colors resize-none"
            rows={2}
            placeholder="添加自定义助记…"
            value={mnemonic}
            onChange={(e) => setMnemonic(e.target.value)}
            onBlur={() => flash(() => data.setMnemonicCustom(id, mnemonic.trim()))}
          />
        </div>

        {/* tags：融合 Flash 预设标签 + 自定义 */}
        <div className="glass p-4">
          <div className="text-xs font-bold text-[var(--txt-faint)] uppercase tracking-wider mb-2">标签（点击切换）</div>
          <div className="flex flex-wrap gap-2">
            {PRESET_TAGS.map((t) => (
              <button
                key={t}
                onClick={() => flash(() => data.toggleTag(id, t))}
                className={`chip !py-1.5 !px-3 !text-[13px] ${tags.includes(t) ? 'on' : ''}`}
              >
                {tags.includes(t) && <Icon icon={Check} size={12} />} {t}
              </button>
            ))}
          </div>
          <input
            className="mt-2.5 w-full rounded-xl bg-black/20 border border-white/10 px-3 py-2 text-sm outline-none focus:border-[var(--gold)] transition-colors"
            placeholder="自定义标签，回车添加…"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && tagInput.trim()) {
                flash(() => data.toggleTag(id, tagInput.trim()))
                setTagInput('')
              }
            }}
          />
        </div>

        {/* note */}
        <div className="glass p-4">
          <div className="text-xs font-bold text-[var(--txt-faint)] uppercase tracking-wider mb-1.5 flex items-center gap-1.5"><Icon icon={PenLine} size={14} className="text-[var(--gold)]" />笔记 / 标注</div>
          <textarea
            className="w-full rounded-xl bg-black/20 border border-white/10 p-3 text-sm outline-none focus:border-[var(--gold)] transition-colors resize-none"
            rows={2}
            placeholder="记录你的标注：用法、易错点、关联词…"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={() => flash(() => data.setNote(id, note.trim()))}
          />
        </div>

        {saved && <div className="text-center text-sm text-[var(--good)] anim-pop flex items-center justify-center gap-1.5"><Icon icon={Check} size={15} />已保存</div>}

        {/* 评分：融合 Flash 不认识/模糊/认识 */}
        <div className="glass p-4">
          <div className="text-xs font-bold text-[var(--txt-faint)] uppercase tracking-wider mb-2">掌握程度（即时评分）</div>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              className="py-3 rounded-2xl border border-[rgba(255,122,138,0.35)] bg-[rgba(255,122,138,0.08)] text-[var(--bad)] text-sm font-bold hover:bg-[rgba(255,122,138,0.16)] active:scale-[0.97] transition-all"
              onClick={async () => { if (await data.gradeWord(id, 'again')) toast('已记录：不认识，加入错题本') }}
            >
              <Icon icon={XCircle} size={16} className="mx-auto mb-1" /> 不认识
            </button>
            <button
              className="py-3 rounded-2xl border border-[rgba(255,196,86,0.35)] bg-[rgba(255,196,86,0.08)] text-[var(--warn)] text-sm font-bold hover:bg-[rgba(255,196,86,0.16)] active:scale-[0.97] transition-all"
              onClick={async () => { if (await data.gradeWord(id, 'hard')) toast('已记录：模糊，稍后复习') }}
            >
              <Icon icon={HelpCircle} size={16} className="mx-auto mb-1" /> 模糊
            </button>
            <button
              className="py-3 rounded-2xl border border-[rgba(63,224,168,0.35)] bg-[rgba(63,224,168,0.08)] text-[var(--good)] text-sm font-bold hover:bg-[rgba(63,224,168,0.16)] active:scale-[0.97] transition-all"
              onClick={async () => { if (await data.gradeWord(id, 'good')) toast('已记录：认识') }}
            >
              <Icon icon={CheckCircle2} size={16} className="mx-auto mb-1" /> 认识
            </button>
          </div>
        </div>

        {/* actions */}
        <div className="flex gap-2.5">
          {wrong && (
            <button className="btn btn-ghost flex-1 text-sm" onClick={() => flash(() => data.clearWrong(id))}>
              移出错词本
            </button>
          )}
          {onStudy && (
            <button className="btn btn-primary flex-1" onClick={onStudy}>
              <Icon icon={Zap} size={16} className="mr-1.5 inline -mt-0.5" /> 练这个词
            </button>
          )}
          <button className="btn btn-ghost flex-1 text-sm" onClick={onClose}>完成</button>
        </div>
      </div>
    </Modal>
  )
}
