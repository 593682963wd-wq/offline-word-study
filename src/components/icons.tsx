import type { CSSProperties } from 'react'
import {
  Home, BookOpen, RefreshCw, PenLine, Keyboard, Headphones, FolderOpen,
  BarChart3, Settings, Plane, Flame, Clock, Target, Heart, Medal,
  CircleAlert, Globe, Sparkles, Radio, Siren, Handshake, CloudSun,
  CloudLightning, Users, Building2, AlertTriangle, FileText, Compass,
  LifeBuoy, Package, Type, Eye, EyeOff, Play, Square, Phone,
  MessageCircle, Search, X, Volume2, Brain, Ear, Award, CheckCircle2,
  BookMarked, Star, Zap, CalendarDays, PencilLine, Timer, TrendingUp,
  ChevronRight, ChevronLeft, RotateCcw, GraduationCap, Lightbulb, Check,
  Sun, Moon, MonitorSmartphone, Languages, ArrowRight, ArrowLeft,
  Bookmark, BookmarkCheck, CircleHelp, User, Radar, Satellite, Wind,
  CloudRain, Server, Smartphone, Monitor, Rocket, Cpu, CircleDot,
  Waves, Pen, MapPin, Navigation, Signal, BellRing, PartyPopper,
  BadgeCheck, CircleX, LayoutGrid, Repeat, ScanLine, Route, Dices,
  Speech, AudioWaveform, Volume1, Pause, Gauge, Trophy, ListChecks,
  Layers, Lock, Database, FolderHeart, Mic2, Image, Mail, Dumbbell, Hash,
  Library, Palette, SearchX, SkipForward, CircleX as XCircle, CircleHelp as HelpCircle,
  Scale, Crown, Gem,
  type LucideIcon,
} from 'lucide-react'

export { Home, BookOpen, RefreshCw, PenLine, Keyboard, Headphones, FolderOpen,
  BarChart3, Settings, Plane, Flame, Clock, Target, Heart, Medal,
  CircleAlert, Globe, Sparkles, Radio, Siren, Handshake, CloudSun,
  CloudLightning, Users, Building2, AlertTriangle, FileText, Compass,
  LifeBuoy, Package, Type, Eye, EyeOff, Play, Square, Phone,
  MessageCircle, Search, X, Volume2, Brain, Ear, Award, CheckCircle2,
  BookMarked, Star, Zap, CalendarDays, PencilLine, Timer, TrendingUp,
  ChevronRight, ChevronLeft, RotateCcw, GraduationCap, Lightbulb, Check,
  Sun, Moon, MonitorSmartphone, Languages, ArrowRight, ArrowLeft,
  Bookmark, BookmarkCheck, CircleHelp, User, Radar, Satellite, Wind,
  CloudRain, Server, Smartphone, Monitor, Rocket, Cpu, CircleDot,
  Waves, Pen, MapPin, Navigation, Signal, BellRing, PartyPopper,
  BadgeCheck, CircleX, LayoutGrid, Repeat, ScanLine, Route, Dices,
  Speech, AudioWaveform, Volume1, Pause, Gauge, Trophy, ListChecks,
  Layers, Lock, Database, FolderHeart, Mic2, Image, Mail, Dumbbell, Hash,
  Library, Palette, SearchX, SkipForward, XCircle, HelpCircle,
  Scale, Crown, Gem }

/** 统一图标渲染：科技风线性图标，默认 2px 描边 */
export function Icon({ icon: I, size = 20, className = '', strokeWidth = 2, fill, style }: {
  icon: LucideIcon; size?: number; className?: string; strokeWidth?: number; fill?: string; style?: CSSProperties
}) {
  return <I size={size} strokeWidth={strokeWidth} className={className} fill={fill} style={style} aria-hidden="true" />
}

/* ---------- 数据注册表：类别 / 测验模式 / 情景 ---------- */

export const CAT_ICONS: Record<string, LucideIcon> = {
  plane: Plane,
  users: Users,
  building: Building2,
  warning: AlertTriangle,
  file: FileText,
  compass: Compass,
  weather: CloudLightning,
  safety: LifeBuoy,
  clock: Clock,
  package: Package,
  icao: Type,
}

export const MODE_ICONS: Record<string, LucideIcon> = {
  en2cn: Eye,
  cn2en: Brain,
  listen: Ear,
  spell: Keyboard,
  dictation: PenLine,
  judge: Scale,
}

export const SCENARIO_ICONS: Record<string, LucideIcon> = {
  agent: Handshake,
  atc: Radio,
  emergency: Siren,
  weather: CloudSun,
}

/** 徽章图标映射：gamify BADGES 的 icon 字段 → lucide 组件 */
export const BADGE_ICONS: Record<string, LucideIcon> = {
  rocket: Rocket,
  flame: Flame,
  crown: Crown,
  target: Target,
  zap: Zap,
  sparkle: Sparkles,
  gem: Gem,
  plane: Plane,
}
