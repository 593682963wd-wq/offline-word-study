import { type ReactNode, useEffect } from 'react'
import { speak, speakWord, stopSpeak } from '../lib/tts'
import { Icon, X, FolderOpen, Volume2 } from './icons'

export function ProgressRing({ value, size = 120, stroke = 10, label, sub }: {
  value: number; size?: number; stroke?: number; label?: string; sub?: string
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const pct = Math.min(1, Math.max(0, value))
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="var(--ring-track, rgba(140,190,255,0.14))" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke="url(#ringGrad)" strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - pct)}
          style={{ transition: 'stroke-dashoffset .6s cubic-bezier(.22,1,.36,1)', filter: 'drop-shadow(0 0 8px rgba(56,225,255,0.55))' }}
        />
        <defs>
          <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38e1ff" />
            <stop offset="55%" stopColor="#4d8dff" />
            <stop offset="100%" stopColor="#9d7bff" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label ? (
          <>
            <div className="text-2xl font-extrabold tracking-tight">{label}</div>
            {sub && <div className="text-xs text-[var(--txt-dim)] mt-0.5">{sub}</div>}
          </>
        ) : (
          <div className="text-xl font-extrabold">{Math.round(pct * 100)}%</div>
        )}
      </div>
    </div>
  )
}

export function SpeakButton({ text, word, rate = 0.92, size = 'md', className = '' }: {
  text: string; word?: { id: string; word: string }; rate?: number; size?: 'sm' | 'md' | 'lg'; className?: string
}) {
  const sz = size === 'lg' ? 52 : size === 'sm' ? 34 : 42
  return (
    <button
      aria-label="播放发音"
      className={`inline-flex items-center justify-center rounded-full transition-all active:scale-90 hover:brightness-115 ${className}`}
      style={{
        width: sz, height: sz,
        background: 'linear-gradient(135deg, #22d3ee, #6366f1 55%, #a855f7)',
        border: '1px solid rgba(77,201,255,0.45)',
        color: '#fff',
        boxShadow: '0 6px 20px rgba(76,130,255,0.45), 0 0 14px rgba(77,201,255,0.30), inset 0 1px 0 rgba(255,255,255,0.25)',
      }}
      onClick={(e) => { e.stopPropagation(); if (word) speakWord(word, { rate }); else speak(text, { rate }) }}
    >
      <Icon icon={Volume2} size={size === 'lg' ? 26 : size === 'sm' ? 17 : 20} fill="currentColor" strokeWidth={0} />
    </button>
  )
}

export function Modal({ open, onClose, children, title }: {
  open: boolean; onClose: () => void; children: ReactNode; title?: string
}) {
  useEffect(() => {
    if (!open) return
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [open, onClose])
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" role="dialog">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm anim-in" style={{ animationDuration: '.2s' }} onClick={onClose} />
      <div className="relative w-full sm:max-w-lg max-h-[88vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl glass-strong anim-pop p-5 sm:p-6 safe-bottom">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">{title ?? ''}</h3>
          <button className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--txt-dim)] hover:bg-white/10" onClick={onClose} aria-label="关闭">
            <Icon icon={X} size={18} strokeWidth={2.4} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function EmptyState({ icon, text, hint }: { icon?: typeof FolderOpen; text: string; hint?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-14 text-center anim-in">
      <div className="icon-tile w-16 h-16 mb-3 !rounded-2xl">
        <Icon icon={icon ?? FolderOpen} size={30} />
      </div>
      <div className="font-semibold text-[var(--txt-dim)]">{text}</div>
      {hint && <div className="text-sm text-[var(--txt-faint)] mt-1.5 max-w-[260px]">{hint}</div>}
    </div>
  )
}

export function stopAllSpeech() { stopSpeak() }

/** 彩色图标块：科技风渐变底 + 微光 */
export function IconTile({ icon: I, size = 22, box = 44, tone = 'cyan', className = '' }: {
  icon: typeof FolderOpen; size?: number; box?: number; tone?: 'cyan' | 'violet' | 'green' | 'amber' | 'rose' | 'blue'; className?: string
}) {
  const tones: Record<string, { bg: string; bd: string; color: string; glow: string }> = {
    cyan:   { bg: 'linear-gradient(150deg, rgba(56,225,255,0.18), rgba(77,141,255,0.10))', bd: 'rgba(56,225,255,0.35)', color: '#38e1ff', glow: 'rgba(56,225,255,0.25)' },
    blue:   { bg: 'linear-gradient(150deg, rgba(77,141,255,0.20), rgba(77,141,255,0.08))', bd: 'rgba(77,141,255,0.40)', color: '#7db0ff', glow: 'rgba(77,141,255,0.25)' },
    violet: { bg: 'linear-gradient(150deg, rgba(157,123,255,0.20), rgba(157,123,255,0.08))', bd: 'rgba(157,123,255,0.40)', color: '#b39dff', glow: 'rgba(157,123,255,0.25)' },
    green:  { bg: 'linear-gradient(150deg, rgba(63,224,168,0.16), rgba(63,224,168,0.06))', bd: 'rgba(63,224,168,0.35)', color: '#3fe0a8', glow: 'rgba(63,224,168,0.22)' },
    amber:  { bg: 'linear-gradient(150deg, rgba(255,196,92,0.16), rgba(255,196,92,0.06))', bd: 'rgba(255,196,92,0.35)', color: '#ffc45c', glow: 'rgba(255,196,92,0.22)' },
    rose:   { bg: 'linear-gradient(150deg, rgba(255,122,138,0.16), rgba(255,122,138,0.06))', bd: 'rgba(255,122,138,0.35)', color: '#ff7a8a', glow: 'rgba(255,122,138,0.22)' },
  }
  const t = tones[tone]
  return (
    <span
      className={`inline-flex items-center justify-center rounded-2xl shrink-0 ${className}`}
      style={{ width: box, height: box, background: t.bg, border: `1px solid ${t.bd}`, color: t.color, boxShadow: `0 6px 18px ${t.glow}, inset 0 1px 0 rgba(255,255,255,0.10)` }}
    >
      <I size={size} strokeWidth={2.1} />
    </span>
  )
}
