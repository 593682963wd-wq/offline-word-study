import { useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { useApp } from '../store/app'
import { useData } from '../hooks/useData'
import { exportData } from '../db/db'
import { WORDS } from '../hooks/useData'
import { Icon, Settings as SettingsIcon, Target, Volume2, Palette, Database, Check, X } from '../components/icons'
import { Modal } from '../components/ui'

function Row({ label, desc, children }: { label: string; desc?: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3.5 border-b border-white/6 last:border-0">
      <div>
        <div className="font-semibold text-[15px]">{label}</div>
        {desc && <div className="text-xs text-[var(--txt-faint)] mt-0.5">{desc}</div>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Switch({ on, onChange }: { on: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={on}
      onClick={() => onChange(!on)}
      className={`w-12 h-7 rounded-full transition-colors relative ${on ? 'bg-gradient-to-r from-[#22d3ee] via-[#6366f1] to-[#a855f7] shadow-[0_0_12px_rgba(99,102,241,0.45)]' : 'bg-white/12'}`}
    >
      <span className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow transition-all ${on ? 'left-[22px]' : 'left-0.5'}`} />
    </button>
  )
}

export function Settings() {
  const settings = useApp((s) => s.settings)
  const setSettings = useApp((s) => s.setSettings)
  const data = useData()
  const fileRef = useRef<HTMLInputElement>(null)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const [confirmReset, setConfirmReset] = useState(false)

  const flash = (ok: boolean, text: string) => {
    setMsg({ ok, text })
    setTimeout(() => setMsg(null), 2600)
  }

  const doExport = async () => {
    try {
      const json = await exportData()
      const blob = new Blob([json], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `词语练习备份_${new Date().toISOString().slice(0, 10)}.json`
      a.click()
      URL.revokeObjectURL(url)
      flash(true, '备份已导出')
    } catch {
      flash(false, '导出失败')
    }
  }

  const doImport = async (f: File | undefined) => {
    if (!f) return
    try {
      if (f.size > 2 * 1024 * 1024) throw new Error('备份文件不可超过 2 MiB')
      const text = await f.text()
      const r = await data.importAll(text)
      flash(true, `导入成功：${r.words} 条学习记录、${r.stats} 条统计`)
    } catch (e) {
      flash(false, e instanceof Error ? e.message : '导入失败')
    }
    if (fileRef.current) fileRef.current.value = ''
  }

  return (
    <div className="flex flex-col gap-4 anim-in">
      <div className="glass p-5">
        <h2 className="font-extrabold text-lg flex items-center gap-2"><Icon icon={SettingsIcon} size={20} className="text-[var(--gold)]" />设置</h2>
        <p className="text-xs text-[var(--txt-dim)] mt-1">所有设置与学习数据都保存在本机浏览器中</p>
      </div>

      {msg && (
        <div className={`glass !rounded-2xl px-4 py-3 text-sm font-medium anim-pop ${msg.ok ? '!border-[rgba(63,224,168,0.4)] text-[var(--good)]' : '!border-[rgba(255,122,138,0.4)] text-[var(--bad)]'}`}>
          <Icon icon={msg.ok ? Check : X} size={15} className="mr-1.5 inline -mt-0.5 shrink-0" />{msg.text}
        </div>
      )}

      <div className="glass px-5">
        <h3 className="font-bold text-sm pt-4 flex items-center gap-2"><Icon icon={Target} size={16} className="text-[var(--gold)]" />学习目标</h3>
        <Row label="每日目标词数" desc="每天新学 + 复习的目标">
          <div className="flex items-center gap-3">
            <input
              type="range" min={5} max={100} step={5}
              value={settings.dailyGoal}
              onChange={(e) => setSettings({ dailyGoal: Number(e.target.value) })}
              className="w-28 accent-[#22d3ee]"
            />
            <span className="w-10 text-right font-bold text-[var(--gold)]">{settings.dailyGoal}</span>
          </div>
        </Row>
        <Row label="测验题数" desc="每次测验的默认题目数量">
          <div className="flex gap-1.5">
            {[5, 10, 15, 20].map((n) => (
              <button key={n} onClick={() => setSettings({ quizCount: n })} className={`chip !px-3 !py-1.5 ${settings.quizCount === n ? 'on' : ''}`}>{n}</button>
            ))}
          </div>
        </Row>
      </div>

      <div className="glass px-5">
        <h3 className="font-bold text-sm pt-4 flex items-center gap-2"><Icon icon={Volume2} size={16} className="text-[var(--gold)]" />发音</h3>
        <Row label="自动发音" desc="学习卡片翻面时自动朗读单词">
          <Switch on={settings.autoSpeak} onChange={(v) => setSettings({ autoSpeak: v })} />
        </Row>
        <Row label="发音口音" desc="只使用系统离线语音；不附音频，默认关闭自动朗读">
          <div className="flex gap-1.5">
            <button
              onClick={() => setSettings({ voice: 'us' })}
              className={`chip !px-3 !py-1.5 ${settings.voice === 'us' ? 'on' : ''}`}
              title="美式发音（设备已安装的离线语音）"
            >🇺🇸 美音</button>
            <button
              onClick={() => setSettings({ voice: 'uk' })}
              className={`chip !px-3 !py-1.5 ${settings.voice === 'uk' ? 'on' : ''}`}
              title="英式发音（浏览器 TTS）"
            >🇬🇧 英音</button>
          </div>
        </Row>
        <Row label="语速" desc={`当前 ${Math.round(settings.speakRate * 100)}%`}>
          <input
            type="range" min={0.6} max={1.2} step={0.04}
            value={settings.speakRate}
            onChange={(e) => setSettings({ speakRate: Number(e.target.value) })}
            className="w-28 accent-[#22d3ee]"
          />
        </Row>
      </div>

      <div className="glass px-5">
        <h3 className="font-bold text-sm pt-4 flex items-center gap-2"><Icon icon={Palette} size={16} className="text-[var(--gold)]" />外观</h3>
        <Row label="深色模式" desc="夜间护眼，航司深夜值班友好">
          <Switch on={settings.theme === 'dark'} onChange={(v) => setSettings({ theme: v ? 'dark' : 'light' })} />
        </Row>
      </div>

      <div className="glass px-5">
        <h3 className="font-bold text-sm pt-4 flex items-center gap-2"><Icon icon={Database} size={16} className="text-[var(--gold)]" />数据</h3>
        <Row label="导出备份" desc="下载全部学习记录为 JSON 文件">
          <button className="btn btn-ghost !py-2 !px-4 text-sm" onClick={doExport}>导出</button>
        </Row>
        <Row label="导入备份" desc="从备份文件恢复学习记录">
          <>
            <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" onChange={(e) => doImport(e.target.files?.[0])} />
            <button className="btn btn-ghost !py-2 !px-4 text-sm" onClick={() => fileRef.current?.click()}>导入</button>
          </>
        </Row>
        <Row label="清空学习数据" desc="删除所有学习记录与统计，词库保留">
          <button className="btn btn-danger !py-2 !px-4 text-sm" onClick={() => setConfirmReset(true)}>清空</button>
        </Row>
      </div>

      <div className="text-center text-[11px] text-[var(--txt-faint)] leading-relaxed pb-2">
        词语练习 · 离线单词练习学习<br />
        词库 {WORDS.length} 词 · 数据保存在本机（PWA 离线可用）<br />
        使用原创合成单词与例句，可自行替换词库
      </div>

      <Modal open={confirmReset} onClose={() => setConfirmReset(false)} title="确认清空？">
        <p className="text-sm text-[var(--txt-dim)] leading-relaxed">
          将删除全部学习记录、错词本、收藏与统计，且无法恢复。词库内容不会受影响。确定继续吗？
        </p>
        <div className="flex gap-2.5 mt-5">
          <button className="btn btn-ghost flex-1" onClick={() => setConfirmReset(false)}>取消</button>
          <button
            className="btn btn-danger flex-1"
            onClick={async () => {
              await data.resetAll()
              setConfirmReset(false)
              flash(true, '已清空学习数据')
            }}
          >
            确认清空
          </button>
        </div>
      </Modal>
    </div>
  )
}
