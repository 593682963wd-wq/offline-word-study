// 词语练习 · 词条配图（语义插画）解析
// 每个单词按 语义规则 → Lucide 图标 + 分类主题色，由 WordArt 组件渲染为科技风插画。
import type { Word } from '../types'
import {
  Plane, PlaneTakeoff, PlaneLanding, Navigation, Compass, RotateCw, RotateCcw,
  Radar, MapPin, Route, Locate, Rocket, Truck, Bus, CarFront, Ambulance, Tractor,
  Fuel, Construction, TowerControl, Container, HeartPulse, Stethoscope, Pill,
  Syringe, Thermometer, Bone, Activity, Cross, Hospital, Bandage, Droplets,
  Shield, ShieldAlert, ShieldCheck, Lock, KeyRound, Search, ScanSearch, Eye,
  Warehouse, Antenna, RadioTower, Satellite, Wifi, Zap, Lightbulb, Flag, Cone,
  Luggage, Armchair, DoorOpen, Megaphone, Sparkles, Timer, RefreshCcw, CheckCircle2,
  Ban, XCircle, Package, Layers, Snowflake, Gauge, Wind, Ticket, CheckSquare,
  ArrowRightLeft, Globe, Users, Utensils, Apple, Clock, CalendarClock, Scale,
  CloudRain, CloudLightning, CloudSnow, CloudFog, CloudSun, CloudDrizzle, Sun,
  Tornado, Cloudy, Waves, Umbrella, CloudMoon, Wrench, Briefcase, CircleCheck,
  TriangleAlert, CircleAlert, Siren, Radio, Headset, Phone, FileText, BookOpen,
  GraduationCap, ListChecks, ScanLine, Fence, LifeBuoy, Heart, BatteryFull,
  BatteryLow, Target, User, UserX, Handshake, Building2, Settings, GlassWater,
  Infinity, BadgeCheck, GitBranch, SearchX, Undo2, ArrowRight, ArrowUpDown,
  ArrowLeftRight, MoveHorizontal, Hash, Repeat, Medal, Trophy, Award, BellRing,
  AlarmClock, Hourglass, CalendarDays, Moon, Star, Bed, Accessibility, PlugZap,
  Bird, Type, EyeOff, Flame, Brain, Candy, BriefcaseMedical, UtensilsCrossed,
  Sailboat, Anchor, CircleDot, Plus, Minus,
  type LucideIcon,
} from 'lucide-react'

export type ToneKey = 'cyan' | 'violet' | 'sky' | 'amber' | 'rose' | 'emerald' | 'blue' | 'teal'

export interface ToneSpec {
  from: string
  to: string
  icon: string
  glow: string
  line: string
}

export const TONES: Record<ToneKey, ToneSpec> = {
  cyan:    { from: 'rgba(56,225,255,0.20)', to: 'rgba(8,47,73,0.45)',  icon: '#7de9ff', glow: 'rgba(56,225,255,0.55)', line: 'rgba(125,233,255,0.5)' },
  violet:  { from: 'rgba(139,132,255,0.22)', to: 'rgba(30,27,75,0.50)', icon: '#b4b0ff', glow: 'rgba(139,132,255,0.55)', line: 'rgba(180,176,255,0.5)' },
  sky:     { from: 'rgba(125,211,252,0.18)', to: 'rgba(7,42,66,0.45)',  icon: '#a5e3ff', glow: 'rgba(125,211,252,0.5)',  line: 'rgba(165,227,255,0.45)' },
  amber:   { from: 'rgba(252,211,77,0.18)',  to: 'rgba(66,47,8,0.50)',  icon: '#ffe08a', glow: 'rgba(252,211,77,0.45)',  line: 'rgba(255,224,138,0.45)' },
  rose:    { from: 'rgba(251,113,133,0.18)', to: 'rgba(76,20,32,0.50)', icon: '#ffb3c0', glow: 'rgba(251,113,133,0.5)',  line: 'rgba(255,179,192,0.45)' },
  emerald: { from: 'rgba(52,211,153,0.18)',  to: 'rgba(6,60,44,0.50)',  icon: '#8cf0d0', glow: 'rgba(52,211,153,0.5)',  line: 'rgba(140,240,208,0.45)' },
  blue:    { from: 'rgba(96,165,250,0.20)',  to: 'rgba(16,41,84,0.50)', icon: '#a8c8ff', glow: 'rgba(96,165,250,0.55)',  line: 'rgba(168,200,255,0.45)' },
  teal:    { from: 'rgba(45,212,191,0.18)',  to: 'rgba(8,54,52,0.50)',  icon: '#8cece0', glow: 'rgba(45,212,191,0.5)',  line: 'rgba(140,236,224,0.45)' },
}

/** 图标名 → 组件（避免超长 import 列表重复） */
const ICONS: Record<string, LucideIcon> = {
  plane: Plane, planeTakeoff: PlaneTakeoff, planeLanding: PlaneLanding,
  navigation: Navigation, compass: Compass, rotateCcw: RotateCcw, rotateCw: RotateCw,
  radar: Radar, mapPin: MapPin, route: Route, locate: Locate, rocket: Rocket,
  truck: Truck, bus: Bus, carFront: CarFront, ambulance: Ambulance, tractor: Tractor,
  fuel: Fuel, construction: Construction, towerControl: TowerControl, container: Container,
  heartPulse: HeartPulse, stethoscope: Stethoscope, pill: Pill, syringe: Syringe,
  thermometer: Thermometer, bone: Bone, activity: Activity, cross: Cross,
  hospital: Hospital, bandage: Bandage, droplets: Droplets, shield: Shield,
  shieldAlert: ShieldAlert, shieldCheck: ShieldCheck, lock: Lock, keyRound: KeyRound,
  search: Search, scanSearch: ScanSearch, eye: Eye, warehouse: Warehouse,
  antenna: Antenna, radioTower: RadioTower, satellite: Satellite, wifi: Wifi,
  zap: Zap, lightbulb: Lightbulb, flag: Flag, cone: Cone, luggage: Luggage,
  armchair: Armchair, doorOpen: DoorOpen, megaphone: Megaphone, sparkles: Sparkles,
  timer: Timer, refreshCcw: RefreshCcw, checkCircle2: CheckCircle2, ban: Ban,
  xCircle: XCircle, package: Package, layers: Layers, snowflake: Snowflake,
  gauge: Gauge, wind: Wind, ticket: Ticket, checkSquare: CheckSquare,
  arrowRightLeft: ArrowRightLeft, globe: Globe, users: Users, utensils: Utensils,
  apple: Apple, clock: Clock, calendarClock: CalendarClock, scale: Scale,
  cloudRain: CloudRain, cloudLightning: CloudLightning, cloudSnow: CloudSnow,
  cloudFog: CloudFog, cloudSun: CloudSun, cloudDrizzle: CloudDrizzle, sun: Sun,
  tornado: Tornado, cloudy: Cloudy, waves: Waves, umbrella: Umbrella,
  cloudMoon: CloudMoon, wrench: Wrench, briefcase: Briefcase, circleCheck: CircleCheck,
  triangleAlert: TriangleAlert, circleAlert: CircleAlert, siren: Siren, radio: Radio,
  headset: Headset, phone: Phone, fileText: FileText, bookOpen: BookOpen,
  graduationCap: GraduationCap, listChecks: ListChecks, scanLine: ScanLine,
  fence: Fence, lifeBuoy: LifeBuoy, heart: Heart, batteryFull: BatteryFull,
  batteryLow: BatteryLow, target: Target, user: User, userX: UserX,
  handshake: Handshake, building2: Building2, settings: Settings, glassWater: GlassWater,
  infinity: Infinity, badgeCheck: BadgeCheck, gitBranch: GitBranch, searchX: SearchX,
  undo2: Undo2, arrowRight: ArrowRight, arrowUpDown: ArrowUpDown,
  arrowLeftRight: ArrowLeftRight, moveHorizontal: MoveHorizontal, hash: Hash,
  repeat: Repeat, medal: Medal, trophy: Trophy, award: Award, bellRing: BellRing,
  alarmClock: AlarmClock, hourglass: Hourglass, calendarDays: CalendarDays,
  moon: Moon, star: Star, bed: Bed, accessibility: Accessibility, plugZap: PlugZap,
  bird: Bird, type: Type, eyeOff: EyeOff, flame: Flame, brain: Brain, candy: Candy,
  briefcaseMedical: BriefcaseMedical, utensilsCrossed: UtensilsCrossed,
  sailboat: Sailboat, anchor: Anchor, circleDot: CircleDot, plus: Plus, minus: Minus,
}

export interface ArtSpec {
  kind: 'icon'
  icon: LucideIcon
  tone: ToneKey
}

export interface ArtLetter {
  kind: 'letter'
  letter: string
  tone: ToneKey
}

export type Art = ArtSpec | ArtLetter

/** 类别 → 兜底配色 */
const CAT_TONE: Record<string, ToneKey> = {
  '飞机系统': 'cyan',
  '气象': 'sky',
  '旅客': 'violet',
  '机场设施': 'amber',
  '不正常情况': 'rose',
  '航行通告': 'amber',
  'ICAO字母读法': 'violet',
  '其他': 'teal',
  '运行相关': 'blue',
  '飞行程序': 'blue',
  '安全与应急设备': 'rose',
}

/** 语义规则（按顺序优先匹配），hay = word + cn + mnemonic（小写） */
const RULES: { re: RegExp; icon: string }[] = [
  // ---- 不正常情况（特异性优先） ----
  { re: /风挡破裂|windshield cracked/, icon: 'triangleAlert' },
  { re: /紧急撤离|emergency evacuation/, icon: 'siren' },
  { re: /炸弹|bomb|爆炸物|explosive/, icon: 'shieldAlert' },
  { re: /劫持|hijack/, icon: 'lock' },
  { re: /非法干扰|violence|interference/, icon: 'shieldAlert' },
  { re: /遇险|distress/, icon: 'siren' },
  { re: /跑道入侵|runway incursion/, icon: 'triangleAlert' },
  { re: /中断起飞|takeoff aborted|abandon/, icon: 'ban' },
  { re: /鸟击|bird strike/, icon: 'bird' },
  { re: /备降|divert|alternate/, icon: 'planeLanding' },
  { re: /擦机尾|tail strike/, icon: 'plane' },
  { re: /碎片|debris/, icon: 'layers' },
  { re: /放油|dump fuel/, icon: 'fuel' },
  { re: /不明异物|foreign object/, icon: 'searchX' },
  { re: /复飞|go around|go-round|missed approach/, icon: 'rotateCcw' },
  { re: /颠簸|turbulence/, icon: 'waves' },
  { re: /风切变|windshear/, icon: 'wind' },
  { re: /安保检查|security check/, icon: 'shieldCheck' },
  { re: /应急运行|emergency operation/, icon: 'lifeBuoy' },
  { re: /通信故障|communication failure/, icon: 'radio' },
  { re: /故障|malfunction|faulty/, icon: 'wrench' },
  { re: /意图|intention/, icon: 'target' },
  { re: /脱离跑道|vacate/, icon: 'arrowRight' },
  { re: /滑梯|slide/, icon: 'rocket' },
  { re: /撤离|evacuat|疏散/, icon: 'doorOpen' },
  { re: /拖回|tow back/, icon: 'undo2' },
  { re: /泄露|泄漏|leak|spillage/, icon: 'droplets' },
  // ---- 气象 ----
  { re: /台风|typhoon/, icon: 'tornado' },
  { re: /龙卷|tornado/, icon: 'tornado' },
  { re: /雷暴|thunderstorm|闪电|lightning|雷击/, icon: 'cloudLightning' },
  { re: /冰雹|hail/, icon: 'snowflake' },
  { re: /暴风雪|blizzard|snowstorm/, icon: 'cloudSnow' },
  { re: /雨夹雪|sleet/, icon: 'cloudSnow' },
  { re: /雪浆|slush|雪堆|snowdrift/, icon: 'snowflake' },
  { re: /大雨|暴雨|阵雨|shower|heavy rain/, icon: 'cloudRain' },
  { re: /小雨|毛毛雨|drizzle|light rain/, icon: 'cloudDrizzle' },
  { re: /雾凇|明冰|结冰|积冰|除冰|除霜|防冰|结冰|icing|frost|rime|de-?icing|anti-?icing|clear ice|glazed/, icon: 'snowflake' },
  { re: /霾|haze/, icon: 'cloudFog' },
  { re: /雾|fog|mist|轻雾|薄雾/, icon: 'cloudFog' },
  { re: /沙暴|尘暴|sandstorm|dust storm/, icon: 'wind' },
  { re: /侧风|顺风|逆风|阵风|crosswind|tailwind|headwind|gust|大风|strong gale/, icon: 'wind' },
  { re: /晴空|sky clear/, icon: 'sun' },
  { re: /阴天|overcast/, icon: 'cloudy' },
  { re: /云幕|ceiling/, icon: 'cloudSun' },
  { re: /气象预报|meteorological forecast|预报/, icon: 'fileText' },
  { re: /气象观测|meteorological observation|观测/, icon: 'radar' },
  { re: /寒潮|cold spell/, icon: 'snowflake' },
  { re: /火山灰|volcanic/, icon: 'flame' },
  { re: /中度|moderate/, icon: 'gauge' },
  // ---- 飞机系统 ----
  { re: /反推|thrust reverser|推力反向/, icon: 'undo2' },
  { re: /气象雷达|wx radar/, icon: 'radar' },
  { re: /襟翼|flaps|缝翼|slats/, icon: 'plane' },
  { re: /副翼|aileron/, icon: 'moveHorizontal' },
  { re: /升降舵|elevator/, icon: 'arrowUpDown' },
  { re: /方向舵|rudder/, icon: 'navigation' },
  { re: /扰流板|spoiler/, icon: 'plane' },
  { re: /驾驶舱|cockpit/, icon: 'gauge' },
  { re: /起落架|landing gear|主轮|nosegear|main gear/, icon: 'circleDot' },
  { re: /机腹|belly/, icon: 'plane' },
  { re: /收轮|放轮|gear extension|gear retraction/, icon: 'arrowUpDown' },
  { re: /厕所|lavatory/, icon: 'doorOpen' },
  { re: /皮托管|pitot/, icon: 'gauge' },
  { re: /卡阻|jam/, icon: 'lock' },
  { re: /风挡|windshield/, icon: 'scanLine' },
  { re: /液压|hydraulic/, icon: 'droplets' },
  { re: /发动机故障|engine trouble|engine failure|停车|flame out|喘振|surge/, icon: 'triangleAlert' },
  { re: /失速|stall/, icon: 'triangleAlert' },
  { re: /厨房|galley/, icon: 'utensils' },
  { re: /发动机|engine/, icon: 'settings' },
  // ---- 航行通告 ----
  { re: /施工|wip|work in progress|construction/, icon: 'construction' },
  { re: /停机坪|apron/, icon: 'plane' },
  { re: /维护|检修|maint|maintenance/, icon: 'wrench' },
  { re: /维修|repair/, icon: 'wrench' },
  { re: /不工作|unserviceable/, icon: 'xCircle' },
  { re: /活动|生效|active/, icon: 'zap' },
  { re: /关闭|clsd|closed/, icon: 'ban' },
  { re: /可用|avbl|available/, icon: 'circleCheck' },
  { re: /临时|temp|temporary/, icon: 'timer' },
  { re: /永久|perm|permanent/, icon: 'infinity' },
  { re: /障碍物|obst|obstruction/, icon: 'triangleAlert' },
  { re: /起重机|crane/, icon: 'construction' },
  { re: /天线|antenna/, icon: 'antenna' },
  { re: /气球|balloon/, icon: 'circleDot' },
  { re: /烟火|pyro|pyrotechnics/, icon: 'sparkles' },
  { re: /跳伞|parachute/, icon: 'umbrella' },
  { re: /滑翔|glider|paragliding/, icon: 'bird' },
  { re: /无人机|uav|drone/, icon: 'rocket' },
  { re: /航展|air show/, icon: 'star' },
  { re: /演习|exer|exercise/, icon: 'target' },
  { re: /军方|军事|military/, icon: 'shield' },
  { re: /单向|single operation/, icon: 'arrowRight' },
  { re: /双向|bidirectional/, icon: 'arrowLeftRight' },
  { re: /灯|reil|tdz|rcll|redl|sfl|als|renl|rtzl/, icon: 'lightbulb' },
  { re: /污染|contaminated/, icon: 'triangleAlert' },
  { re: /湿|damp/, icon: 'droplets' },
  { re: /积水|standing water/, icon: 'waves' },
  { re: /摩擦系数|friction/, icon: 'gauge' },
  { re: /刹车效应|braking/, icon: 'gauge' },
  // ---- 飞行程序 ----
  { re: /航路|published route/, icon: 'route' },
  { re: /平飞|level off/, icon: 'moveHorizontal' },
  { re: /航向|heading/, icon: 'compass' },
  { re: /航迹|track/, icon: 'navigation' },
  { re: /应答机|squawk/, icon: 'hash' },
  { re: /偏航|deviation/, icon: 'gitBranch' },
  { re: /盘旋|circle/, icon: 'refreshCcw' },
  { re: /程序|procedure/, icon: 'listChecks' },
  // ---- 安全与应急设备 ----
  { re: /紧急出口|emergency exit/, icon: 'doorOpen' },
  { re: /安全带|seat belt/, icon: 'shieldCheck' },
  { re: /救生衣|life vest/, icon: 'lifeBuoy' },
  { re: /应急设备|emergency equipment/, icon: 'package' },
  { re: /氧气面罩|oxygen mask/, icon: 'wind' },
  { re: /安全演示|safety demonstration/, icon: 'megaphone' },
  { re: /灭火器|fire extinguisher/, icon: 'flame' },
  // ---- 运行相关 ----
  { re: /值勤期|duty period/, icon: 'clock' },
  { re: /协调|coordinate/, icon: 'handshake' },
  { re: /裕度|buffer/, icon: 'timer' },
  { re: /运行能力|operating capability/, icon: 'gauge' },
  { re: /失能|incapacitation/, icon: 'userX' },
  { re: /卫星电话|satellite phone/, icon: 'satellite' },
  { re: /禁航|route forbidden/, icon: 'ban' },
  { re: /流控|flow control/, icon: 'gauge' },
  { re: /加班|extra flight/, icon: 'planeTakeoff' },
  { re: /隐载|hiding payload/, icon: 'eyeOff' },
  { re: /超载|over payload/, icon: 'scale' },
  { re: /过夜|remain overnight/, icon: 'moon' },
  { re: /过站时间|stay time/, icon: 'clock' },
  { re: /返航|turn back/, icon: 'undo2' },
  { re: /撤轮挡|chocks away/, icon: 'plugZap' },
  { re: /续航|endurance/, icon: 'batteryFull' },
  // ---- 旅客 ----
  { re: /呕吐|vomit|恶心|nauseate/, icon: 'utensilsCrossed' },
  { re: /食物中毒|food poisoning/, icon: 'utensils' },
  { re: /心脏病|heart attack|高血压|high blood pressure|血压/, icon: 'heartPulse' },
  { re: /发烧|fever|发热|流感|flu/, icon: 'thermometer' },
  { re: /斗殴|冲突|fight|conflict/, icon: 'triangleAlert' },
  { re: /症状|symptom/, icon: 'activity' },
  { re: /医疗援助|medical assistance|急救|first aid/, icon: 'cross' },
  { re: /昏厥|晕倒|unconscious|眩晕|dizzy|休克|shock/, icon: 'activity' },
  { re: /电子烟|vape/, icon: 'cloudFog' },
  { re: /哮喘|asthma|呼吸困难|difficulty breathing/, icon: 'wind' },
  { re: /稳定|stable/, icon: 'checkCircle2' },
  { re: /流血|bleed|出血/, icon: 'droplets' },
  { re: /头疼|headache|头痛|中风|stroke/, icon: 'brain' },
  { re: /癫痫|seizure/, icon: 'brain' },
  { re: /咳嗽|cough/, icon: 'headset' },
  { re: /腹泻|diarrhea/, icon: 'droplets' },
  { re: /疲劳|fatigue/, icon: 'batteryLow' },
  { re: /传染病|contagious/, icon: 'shieldAlert' },
  { re: /精神状态|mental condition/, icon: 'brain' },
  { re: /登机牌|boarding pass/, icon: 'ticket' },
  { re: /值机|check-in/, icon: 'checkSquare' },
  { re: /随身行李|carry-on/, icon: 'luggage' },
  { re: /中转|connecting|transit|转机/, icon: 'arrowRightLeft' },
  { re: /直飞|non-stop/, icon: 'plane' },
  { re: /未到场|no-show|未值机/, icon: 'userX' },
  { re: /优先登机|pre-boarding/, icon: 'planeTakeoff' },
  { re: /机上|on board/, icon: 'plane' },
  { re: /海关|customs/, icon: 'shield' },
  { re: /国籍|nationality/, icon: 'globe' },
  { re: /持续|persistent/, icon: 'repeat' },
  { re: /无人陪伴|unaccompanied/, icon: 'userX' },
  { re: /充电宝|power bank/, icon: 'batteryFull' },
  // ---- 机场设施 ----
  { re: /救护车|ambulance/, icon: 'ambulance' },
  { re: /地面电源|ground power/, icon: 'plugZap' },
  { re: /检疫|quarantine|卫生/, icon: 'shield' },
  { re: /气源车|air starting/, icon: 'wind' },
  { re: /轮椅|wheelchair/, icon: 'accessibility' },
  { re: /空调车|air conditioning/, icon: 'snowflake' },
  { re: /油车|加油|fuel|refuell/, icon: 'fuel' },
  { re: /拖车|towing|tractor|牵引/, icon: 'tractor' },
  { re: /移民|immigration/, icon: 'building2' },
  { re: /除冰车|de-icing/, icon: 'snowflake' },
  { re: /扫雪车|snow sweeper/, icon: 'snowflake' },
  { re: /引导车|follow-me/, icon: 'carFront' },
  { re: /除霜|remove frost/, icon: 'sun' },
  { re: /消防车|fire engine/, icon: 'flame' },
  { re: /摆渡车|shuttle/, icon: 'bus' },
  { re: /警察|police/, icon: 'shield' },
  { re: /客梯车|passenger stair/, icon: 'arrowUpDown' },
  { re: /休息室|lounge/, icon: 'armchair' },
  { re: /廊桥|passenger bridge/, icon: 'doorOpen' },
  { re: /地勤|ground handling/, icon: 'handshake' },
  { re: /配餐车|catering/, icon: 'utensils' },
  { re: /标志|标线|marking/, icon: 'scanLine' },
  { re: /防冰|anti-icing/, icon: 'snowflake' },
  { re: /宵禁|curfew/, icon: 'moon' },
  { re: /机场|aerodrome/, icon: 'plane' },
  { re: /机库|hangar/, icon: 'warehouse' },
  { re: /航站楼|terminal/, icon: 'building2' },
  { re: /污水车|lavatory service/, icon: 'droplets' },
  { re: /清水车|potable water/, icon: 'glassWater' },
  // ---- 其他 ----
  { re: /进港|inbound/, icon: 'planeLanding' },
  { re: /离港|outbound/, icon: 'planeTakeoff' },
  { re: /代办|agent for airlines/, icon: 'handshake' },
  { re: /调机|ferry/, icon: 'plane' },
  { re: /标准|standard/, icon: 'badgeCheck' },
  { re: /绕行|detour/, icon: 'route' },
  { re: /公共卫生|public health/, icon: 'shieldAlert' },
  { re: /过敏|allergic/, icon: 'sparkles' },
  { re: /低血糖|hypoglycemia/, icon: 'candy' },
  { re: /糖尿病|diabetes/, icon: 'candy' },
  { re: /骨折|fracture/, icon: 'bone' },
  { re: /急救箱|first aid kit/, icon: 'briefcaseMedical' },
  { re: /应急医疗箱|emergency medical kit/, icon: 'briefcaseMedical' },
  { re: /乘客安置|accommodation/, icon: 'bed' },
  { re: /检查|inspection/, icon: 'search' },
  { re: /通知|告知|advise/, icon: 'megaphone' },
  { re: /申报|file/, icon: 'fileText' },
  { re: /射击|firing/, icon: 'target' },
]

const CAT_DEFAULT_ICON: Record<string, string> = {
  '飞机系统': 'plane',
  '气象': 'cloudSun',
  '旅客': 'users',
  '机场设施': 'building2',
  '不正常情况': 'triangleAlert',
  '航行通告': 'fileText',
  'ICAO字母读法': 'radioTower',
  '其他': 'package',
  '运行相关': 'clock',
  '飞行程序': 'compass',
  '安全与应急设备': 'lifeBuoy',
}

const CAT_ORDER: string[] = [
  '飞机系统', '气象', '旅客', '机场设施', '不正常情况',
  '航行通告', 'ICAO字母读法', '其他', '运行相关', '飞行程序', '安全与应急设备',
]

export function resolveArt(word: Word): Art {
  // ICAO 字母读法：巨型字母 + 信标装饰
  if (word.cat === 'ICAO字母读法') {
    const m = /^([A-Za-z])/.exec(word.word.trim())
    return { kind: 'letter', letter: (m ? m[1] : word.word[0] ?? 'A').toUpperCase(), tone: CAT_TONE[word.cat] ?? 'violet' }
  }
  const hay = [word.word, word.cn, word.mnemonic ?? ''].join(' ').toLowerCase()
  for (const r of RULES) {
    if (r.re.test(hay)) {
      if (r.icon in ICONS) return { kind: 'icon', icon: ICONS[r.icon], tone: CAT_TONE[word.cat] ?? 'cyan' }
    }
  }
  const fallback = ICONS[CAT_DEFAULT_ICON[word.cat] ?? 'package'] ?? Package
  return { kind: 'icon', icon: fallback, tone: CAT_TONE[word.cat] ?? 'cyan' }
}

/** 供词库页/列表使用的快速查询（按 id） */
export function artFor(id: string, words: Word[]): Art {
  const w = words.find((x) => x.id === id)
  return w ? resolveArt(w) : { kind: 'icon', icon: Package, tone: 'cyan' }
}

export { ICONS, CAT_ORDER }
