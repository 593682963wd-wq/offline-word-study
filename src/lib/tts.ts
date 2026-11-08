// 仅设备离线语音，无远程音频/模型。自动朗读默认关闭。
import { WORD_AUDIO } from '../data/wordAudio'
import type { Word } from '../types'

export type Voice = 'us' | 'uk'

let globalVoice: Voice = 'us'
let audioEl: HTMLAudioElement | null = null
/** 播放失败过的词条不再反复尝试 MP3（直接走 TTS），与 Flash audioFailing 同策略 */
const audioFailing = new Set<string>()

export function setGlobalVoice(v: Voice): void {
  globalVoice = v
}
export function getGlobalVoice(): Voice {
  return globalVoice
}

const US_PREFER = ['Google US English', 'Samantha', 'Aria', 'Microsoft Aria', 'Microsoft Jenny', 'Google US English Male']
const UK_PREFER = ['Google UK English Female', 'Daniel', 'Karen', 'Google UK English Male', 'Microsoft Ryan', 'Microsoft Sonia']

function pickVoice(voice: Voice): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return null
  const voices = window.speechSynthesis.getVoices().filter(v => v.localService)
  const prefer = voice === 'uk' ? UK_PREFER : US_PREFER
  for (const p of prefer) {
    const v = voices.find((x) => x.name.includes(p))
    if (v) return v
  }
  const lang = voice === 'uk' ? 'en-GB' : 'en-US'
  const en = voices.find((v) => v.lang && v.lang.toLowerCase().startsWith(lang))
  return en || null
}

export function loadVoices(): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  pickVoice(globalVoice)
  window.speechSynthesis.onvoiceschanged = () => { /* 每次 speak 时重新查即可 */ }
}

/** 纯 TTS 朗读（句子、无音频词条、英音） */
export function speak(text: string, opts: { rate?: number; onend?: () => void; voice?: Voice } = {}): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  const v = pickVoice(opts.voice ?? globalVoice)
  if (!v) { opts.onend?.(); return }
  u.voice = v
  u.lang = (opts.voice ?? globalVoice) === 'uk' ? 'en-GB' : 'en-US'
  u.rate = opts.rate ?? 0.92
  if (opts.onend) u.onend = opts.onend
  window.speechSynthesis.speak(u)
}

/** 单词朗读：美音优先真实 MP3，失败/无资源/英音回退 TTS */
export function speakWord(word: Word | { id: string; word: string }, opts: { rate?: number; onend?: () => void; voice?: Voice } = {}): void {
  const voice = opts.voice ?? globalVoice
  const fallback = () => speak(word.word, { rate: opts.rate, onend: opts.onend, voice })
  if (voice === 'us' && !audioFailing.has(word.id)) {
    const rel = WORD_AUDIO[word.id]
    if (rel) {
      try {
        if (!audioEl) audioEl = new Audio()
        audioEl.src = `${import.meta.env.BASE_URL}${rel}`
        audioEl.playbackRate = 1
        audioEl.onended = () => { if (opts.onend) opts.onend() }
        audioEl.onerror = () => { audioFailing.add(word.id); fallback() }
        const p = audioEl.play()
        if (p) p.catch(() => { audioFailing.add(word.id); fallback() })
        return
      } catch {
        /* 落到 TTS */
      }
    }
  }
  fallback()
}

export function stopSpeak(): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) window.speechSynthesis.cancel()
  if (audioEl) {
    try { audioEl.pause() } catch { /* 忽略 */ }
  }
}

export function ttsSupported(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}
