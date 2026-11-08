export function todayStr(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = `${d.getMonth() + 1}`.padStart(2, '0')
  const day = `${d.getDate()}`.padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function dateFromStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d)
  x.setDate(x.getDate() + n)
  return x
}

export function fmtDate(s: string): string {
  const d = dateFromStr(s)
  return `${d.getMonth() + 1}月${d.getDate()}日`
}

export function fmtDuration(ms: number): string {
  const min = Math.floor(ms / 60000)
  if (min < 1) return `${Math.max(1, Math.floor(ms / 1000))}秒`
  if (min < 60) return `${min}分钟`
  const h = Math.floor(min / 60)
  return `${h}小时${min % 60 ? min % 60 + '分' : ''}`
}

export function greeting(): string {
  const h = new Date().getHours()
  if (h < 6) return '夜深了'
  if (h < 12) return '早上好'
  if (h < 14) return '中午好'
  if (h < 18) return '下午好'
  return '晚上好'
}

export function cnNum(n: number): string {
  const map = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  if (n < 10) return map[n]
  return String(n)
}

export function clamp(n: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, n))
}

export function uid(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
