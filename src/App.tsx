import { HashRouter, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { Home } from './pages/Home'
import { Study } from './pages/Study'
import { Review } from './pages/Review'
import { Quiz } from './pages/Quiz'
import { Typing } from './pages/Typing'
import { Words } from './pages/Words'
import { Scenarios } from './pages/Scenarios'
import { Stats } from './pages/Stats'
import { Settings } from './pages/Settings'
import { useToast } from './store/toast'
import { Icon, Trophy, BellRing } from './components/icons'

function ToastHost() {
  const toasts = useToast((s) => s.toasts)
  const dismiss = useToast((s) => s.dismiss)
  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2 items-end pointer-events-none" aria-live="polite">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={`pointer-events-auto anim-pop flex items-center gap-2.5 glass-strong !rounded-2xl px-4 py-3 text-sm font-bold shadow-[0_10px_30px_rgba(0,0,0,0.45)] ${
            t.kind === 'badge' ? 'text-[var(--gold)] border-[rgba(255,199,89,0.45)]' : 'text-[var(--cyan)] border-[rgba(56,225,255,0.35)]'
          }`}
        >
          <Icon icon={t.kind === 'badge' ? Trophy : BellRing} size={17} />
          {t.text}
        </button>
      ))}
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <ToastHost />
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/study" element={<Study />} />
          <Route path="/review" element={<Review />} />
          <Route path="/quiz" element={<Quiz />} />
          <Route path="/typing" element={<Typing />} />
          <Route path="/words" element={<Words />} />
          <Route path="/scenarios" element={<Scenarios />} />
          <Route path="/stats" element={<Stats />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </HashRouter>
  )
}
