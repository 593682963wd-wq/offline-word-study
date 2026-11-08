export interface Word {
  id: string
  word: string
  cn: string
  cat: string
  phonetic: string
  pos: string
  example: string
  mnemonic: string
  emoji?: string
  note?: string
}

export interface ScenarioTurn {
  speaker: '我方' | '对方'
  zh: string
  en: string
}
export interface ScenarioItem {
  turns: ScenarioTurn[]
}
export type ScenarioGroupKey = 'agent' | 'atc' | 'emergency' | 'weather'

export const SCENARIO_GROUPS:Record<ScenarioGroupKey,{title:string;desc:string;icon:string}>={
agent:{title:'一起学习',desc:'合成练习对话',icon:'agent'},atc:{title:'交流想法',desc:'合成练习对话',icon:'atc'},emergency:{title:'互相帮助',desc:'合成练习对话',icon:'emergency'},weather:{title:'日常交流',desc:'合成练习对话',icon:'weather'}}

export interface WordState {
  id: string
  level: number
  nextReview: number
  wrongCount: number
  correctCount: number
  reviewCount: number
  lastGrade: string | null
  lastReviewed: number | null
  wrongAt: number | null
  learnedAt: number | null
  masteredAt: number | null
  favorite: number
  note: string
  mnemonicCustom: string
  tags: string[]       // 预设/自定义标签：易混淆、常考、难记、已掌握…
}

export type Grade = 'again' | 'hard' | 'good' | 'easy'

export type QuizMode = 'en2cn' | 'cn2en' | 'listen' | 'spell' | 'dictation' | 'judge'

export interface QuizQuestion {
  word: Word
  mode: QuizMode
  options?: string[]   // for en2cn/cn2en/listen
  correctIndex?: number
  accepted?: string[]   // accepted answers for spell/dictation
  judgeCorrect?: boolean // judge 模式：配对是否正确
  judgeCn?: string       // judge 模式：错误配对时显示的干扰释义
}

export interface DayStat {
  date: string // YYYY-MM-DD
  learned: number
  reviewed: number
  correct: number
  wrong: number
  quizDone: number
}

export interface Settings {
  dailyGoal: number
  autoSpeak: boolean
  speakRate: number
  voice: 'us' | 'uk'
  theme: 'dark' | 'light'
  newWordsPerSession: number
  quizCount: number
}
