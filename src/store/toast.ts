// 轻量 toast：徽章解锁等全局提示（不持久化）
import { create } from 'zustand'

export interface ToastItem {
  id: number
  text: string
  kind: 'badge' | 'info'
}

interface ToastState {
  toasts: ToastItem[]
  push: (text: string, kind?: 'badge' | 'info') => void
  dismiss: (id: number) => void
}

let seq = 1
export const useToast = create<ToastState>((set) => ({
  toasts: [],
  push: (text, kind = 'info') => {
    const id = seq++
    set((s) => ({ toasts: [...s.toasts.slice(-2), { id, text, kind }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 3600)
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))
