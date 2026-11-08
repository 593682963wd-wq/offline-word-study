import { StrictMode, useEffect, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { useData } from './hooks/useData'
import { useApp } from './store/app'
import { applyTheme } from './store/app'
import { loadVoices, setGlobalVoice } from './lib/tts'
import { Icon, Plane, CircleAlert } from './components/icons'

function Boot() {
  const ready = useData((s) => s.ready)
  const load = useData((s) => s.load)
  const theme = useApp((s) => s.settings.theme)
  const [err, setErr] = useState(false)

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  useEffect(() => {
    loadVoices()
    // 发音口音全局同步（真实音频仅美音，英音走 en-GB TTS）
    setGlobalVoice(useApp.getState().settings.voice)
    // 全局同步发音口音（zustand subscribe 单监听器签名）
    const un = useApp.subscribe((state) => { setGlobalVoice(state.settings.voice) })
    load().catch(() => setErr(true))
    return () => un()
  }, [load])

  if (!ready && !err) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-4">
        <div className="w-16 h-16 rounded-3xl bg-gradient-to-br from-[#22d3ee] via-[#6366f1] to-[#a855f7] flex items-center justify-center text-3xl anim-glow shadow-[0_0_32px_rgba(99,102,241,0.5)]"><Icon icon={Plane} size={30} className="text-white" strokeWidth={2.2} /></div>
        <div className="font-extrabold text-lg tracking-tight">词语练习</div>
        <div className="text-xs text-[var(--txt-faint)]">正在起飞…</div>
      </div>
    )
  }
  if (err) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center gap-3 px-8 text-center">
        <Icon icon={CircleAlert} size={40} className="text-[var(--warn)]" />
        <div className="font-bold">本地数据库初始化失败</div>
        <p className="text-xs text-[var(--txt-dim)]">可能是浏览器隐私模式或存储被禁用。请尝试刷新，或更换浏览器（推荐 Chrome）。</p>
      </div>
    )
  }
  return <App />
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Boot />
  </StrictMode>,
)
