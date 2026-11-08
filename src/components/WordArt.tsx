// 词语练习 · 词条配图
// 有真实照片的词条渲染照片（百度图片检索压缩版），加载失败自动回退科技风插画；
// 无照片词条（如 ICAO 巨型字母）保持原有语义插画。
// 照片按真实宽高比完整显示（aspect-ratio + max-height + object-contain），不裁切。
import { useState, type CSSProperties } from 'react'
import type { Word } from '../types'
import { resolveArt, TONES, type Art, type ToneKey } from '../lib/art'
import { WORD_IMAGES } from '../data/wordImages'
import { Icon } from './icons'
import { Radio } from './icons'

function Decor({ tone }: { tone: ToneKey }) {
  const t = TONES[tone]
  return (
    <>
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.045) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <div className="absolute -top-8 -right-8 w-36 h-36 rounded-full blur-3xl" style={{ background: t.glow, opacity: 0.5 }} />
      <div className="absolute -bottom-10 -left-8 w-32 h-32 rounded-full border" style={{ borderColor: t.line, opacity: 0.28 }} />
      <div className="absolute -bottom-4 -left-2 w-14 h-14 rounded-full border" style={{ borderColor: t.line, opacity: 0.35 }} />
      <div
        className="absolute top-0 left-0 right-0 h-px"
        style={{ background: `linear-gradient(90deg, transparent, ${t.line}, transparent)` }}
      />
    </>
  )
}

function LetterArt({ art, size }: { art: Extract<Art, { kind: 'letter' }>; size: number }) {
  const t = TONES[art.tone]
  return (
    <div className="absolute inset-0 flex items-center justify-center">
      <div className="relative flex items-center justify-center">
        <div className="absolute w-[68%] aspect-square rounded-full border" style={{ borderColor: t.line, opacity: 0.5 }} />
        <div className="absolute w-[105%] aspect-square rounded-full border" style={{ borderColor: t.line, opacity: 0.22 }} />
        <div className="absolute w-[150%] aspect-square rounded-full border" style={{ borderColor: t.line, opacity: 0.1 }} />
        <div
          className="font-black leading-none tracking-tight select-none"
          style={{
            fontSize: size * 0.72,
            color: t.icon,
            textShadow: `0 0 28px ${t.glow}, 0 0 60px ${t.glow}`,
            opacity: 0.92,
          }}
        >
          {art.letter}
        </div>
      </div>
      <Icon icon={Radio} size={Math.max(10, Math.round(size * 0.16))} className="absolute bottom-[12%] right-[10%]" style={{ color: t.icon, opacity: 0.85 }} strokeWidth={2.2} />
    </div>
  )
}

/** 真实照片卡面：深色底 + 按比例完整显示 + 极淡科技网格 + 分类角标 */
function PhotoArt({ word, src, label, onError, onLoad }: {
  word: Word
  src: string
  label: boolean
  onError: () => void
  onLoad: (w: number, h: number) => void
}) {
  return (
    <>
      <div className="absolute inset-0 bg-[#070b16]" />
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        onError={onError}
        onLoad={(e) => onLoad(e.currentTarget.naturalWidth, e.currentTarget.naturalHeight)}
        className="absolute inset-0 w-full h-full object-contain"
      />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      <div className="absolute top-0 left-0 right-0 h-px bg-white/10" />
      {label && (
        <span className="absolute bottom-1.5 left-2.5 text-[9px] sm:text-[10px] font-semibold tracking-[0.18em] uppercase text-white/90 [text-shadow:0_1px_3px_rgba(0,0,0,0.8)]">
          {word.cat}
        </span>
      )}
    </>
  )
}

export function WordArt({ word, variant = 'banner', className = '' }: {
  word: Word
  variant?: 'banner' | 'thumb' | 'hero'
  className?: string
}) {
  const art = resolveArt(word)
  const tone = art.tone
  const t = TONES[tone]
  const dims =
    variant === 'banner' ? { h: 'h-28 sm:h-32', icon: 52, label: true }
    : variant === 'hero' ? { h: 'h-40 sm:h-44', icon: 68, label: true }
    : { h: 'h-12', icon: 22, label: false }

  const imgRel = WORD_IMAGES[word.id]
  const imgSrc = imgRel ? `${import.meta.env.BASE_URL}${imgRel}` : null
  const [photoFailed, setPhotoFailed] = useState(false)
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const showPhoto = !!imgSrc && !photoFailed

  // 照片容器：按图片真实比例撑高（不裁切）；竖图过高时 max-height 截断容器，
  // object-contain 保证图片仍完整居中显示。
  const maxH = variant === 'thumb' ? 48 : 340
  const boxStyle: CSSProperties | undefined = showPhoto
    ? {
        aspectRatio: nat && nat.h > 0 ? `${nat.w} / ${nat.h}` : '16 / 9',
        maxHeight: maxH,
        minHeight: variant === 'thumb' ? 48 : 150,
        background: '#070b16',
      }
    : undefined

  return (
    <div
      className={`relative overflow-hidden rounded-xl border border-white/10 ${showPhoto ? '' : dims.h} ${className} pointer-events-none`}
      style={showPhoto ? boxStyle : { background: `linear-gradient(135deg, ${t.from}, ${t.to})` }}
      aria-hidden="true"
    >
      {showPhoto ? (
        <PhotoArt
          word={word}
          src={imgSrc as string}
          label={dims.label}
          onError={() => setPhotoFailed(true)}
          onLoad={(w, h) => setNat({ w, h })}
        />
      ) : (
        <>
          <Decor tone={tone} />
          {art.kind === 'letter' ? (
            <LetterArt art={art} size={variant === 'thumb' ? 30 : 60} />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Icon
                icon={art.icon}
                size={variant === 'thumb' ? 20 : dims.icon}
                strokeWidth={1.6}
                className="drop-shadow-[0_0_14px_var(--glow)]"
                style={{ color: t.icon, filter: `drop-shadow(0 0 ${variant === 'thumb' ? 8 : 18}px ${t.glow})`, opacity: 0.95 }}
              />
            </div>
          )}
          {dims.label && (
            <span className="absolute bottom-1.5 left-2.5 text-[9px] sm:text-[10px] font-semibold tracking-[0.18em] uppercase" style={{ color: t.icon, opacity: 0.75 }}>
              {word.cat}
            </span>
          )}
        </>
      )}
    </div>
  )
}

export default WordArt
