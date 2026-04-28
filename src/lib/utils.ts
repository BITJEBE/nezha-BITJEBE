import { SharedClient } from "@/hooks/use-rpc2"
import { formatBytes } from "@/lib/format"
import { NezhaServer, NezhaWebsocketResponse } from "@/types/nezha-api"
import { type ClassValue, clsx } from "clsx"
import dayjs from "dayjs"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatNezhaInfo(now: number, serverInfo: NezhaServer) {
  const lastActiveRaw = serverInfo.last_active || ""
  const lastActiveTime = lastActiveRaw.startsWith("000") ? 0 : parseISOTimestamp(lastActiveRaw)
  // 优先使用 Komari 后端权威 online 字段(基于 WS 连接 + presence TTL),
  // 仅在缺失时回退到 now - last_active <= 30s 的时间差判断。
  // 这样可以避免访客本地时钟与服务器时钟偏差(>30s)造成的误判离线。
  const onlineFlag =
    typeof serverInfo.online === "boolean"
      ? serverInfo.online
      : Number.isFinite(lastActiveTime) && lastActiveTime > 0 && now - lastActiveTime <= 30000
  return {
    ...serverInfo,
    cpu: serverInfo.state.cpu || 0,
    gpu: serverInfo.state.gpu || [],
    process: serverInfo.state.process_count || 0,
    up: serverInfo.state.net_out_speed / 1024 / 1024 || 0,
    down: serverInfo.state.net_in_speed / 1024 / 1024 || 0,
    last_active_time_string: lastActiveTime ? dayjs(lastActiveTime).format("YYYY-MM-DD HH:mm:ss") : "",
    online: onlineFlag,
    uptime: serverInfo.state.uptime || 0,
    version: serverInfo.host.version || null,
    tcp: serverInfo.state.tcp_conn_count || 0,
    udp: serverInfo.state.udp_conn_count || 0,
    mem: (serverInfo.state.mem_used / serverInfo.host.mem_total) * 100 || 0,
    swap: (serverInfo.state.swap_used / serverInfo.host.swap_total) * 100 || 0,
    disk: (serverInfo.state.disk_used / serverInfo.host.disk_total) * 100 || 0,
    stg: (serverInfo.state.disk_used / serverInfo.host.disk_total) * 100 || 0,
    country_code: serverInfo.country_code,
    platform: serverInfo.host.platform || "",
    net_out_transfer: serverInfo.state.net_out_transfer || 0,
    net_in_transfer: serverInfo.state.net_in_transfer || 0,
    arch: serverInfo.host.arch || "",
    mem_total: serverInfo.host.mem_total || 0,
    swap_total: serverInfo.host.swap_total || 0,
    disk_total: serverInfo.host.disk_total || 0,
    boot_time: serverInfo.host.boot_time || 0,
    boot_time_string: serverInfo.host.boot_time ? dayjs(serverInfo.host.boot_time * 1000).format("YYYY-MM-DD HH:mm:ss") : "",
    platform_version: serverInfo.host.platform_version || "",
    cpu_info: serverInfo.host.cpu || [],
    gpu_info: serverInfo.host.gpu || [],
    load_1: serverInfo.state.load_1?.toFixed(2) || 0.0,
    load_5: serverInfo.state.load_5?.toFixed(2) || 0.0,
    load_15: serverInfo.state.load_15?.toFixed(2) || 0.0,
    public_note: handlePublicNote(serverInfo.id, serverInfo.public_note || ""),
    traffic_limit: serverInfo.traffic_limit || 0,
    traffic_limit_type: serverInfo.traffic_limit_type || "sum",
    expired_at: serverInfo.expired_at || "",
  }
}

export function calcTrafficUsed(up: number, down: number, type: string): number {
  switch (type) {
    case "max": return Math.max(up, down)
    case "min": return Math.min(up, down)
    case "up": return up
    case "down": return down
    default: return up + down
  }
}

export function getDaysBetweenDatesWithAutoRenewal({ autoRenewal, cycle, startDate, endDate }: BillingData): {
  days: number
  cycleLabel: string
  remainingPercentage: number
} {
  let months = 1
  // 套餐资费
  let cycleLabel = cycle

  const cycleLower = cycle.toLowerCase()
  const yearsMatch = cycleLower.match(/^(\d+)年$/)

  if (yearsMatch) {
    const y = parseInt(yearsMatch[1])
    cycleLabel = cycle
    months = y * 12
  } else {
    switch (cycleLower) {
      case "月":
      case "m":
      case "mo":
      case "month":
      case "monthly":
        cycleLabel = "月"
        months = 1
        break
      case "年":
      case "y":
      case "yr":
      case "year":
      case "annual":
        cycleLabel = "年"
        months = 12
        break
      case "季":
      case "q":
      case "qr":
      case "quarterly":
        cycleLabel = "季"
        months = 3
        break
      case "半":
      case "半年":
      case "h":
      case "half":
      case "semi-annually":
        cycleLabel = "半年"
        months = 6
        break
      case "一次性":
        cycleLabel = "一次性"
        months = 1
        break
      default:
        cycleLabel = cycle
        break
    }
  }

  const nowTime = new Date().getTime()
  const endTime = dayjs(endDate).valueOf()

  if (autoRenewal !== "1") {
    return {
      days: getDaysBetweenDates(endDate, new Date(nowTime).toISOString()),
      cycleLabel: cycleLabel,
      remainingPercentage:
        getDaysBetweenDates(endDate, new Date(nowTime).toISOString()) / dayjs(endDate).diff(startDate, "day") > 1
          ? 1
          : getDaysBetweenDates(endDate, new Date(nowTime).toISOString()) / dayjs(endDate).diff(startDate, "day"),
    }
  }

  if (nowTime < endTime) {
    return {
      days: getDaysBetweenDates(endDate, new Date(nowTime).toISOString()),
      cycleLabel: cycleLabel,
      remainingPercentage:
        getDaysBetweenDates(endDate, new Date(nowTime).toISOString()) / (30 * months) > 1
          ? 1
          : getDaysBetweenDates(endDate, new Date(nowTime).toISOString()) / (30 * months),
    }
  }

  const nextTime = getNextCycleTime(endTime, months, nowTime)
  const diff = dayjs(nextTime).diff(dayjs(), "day") + 1
  const remainingPercentage = diff / (30 * months) > 1 ? 1 : diff / (30 * months)

  return {
    days: diff,
    cycleLabel: cycleLabel,
    remainingPercentage: remainingPercentage,
  }
}

// Thanks to hi2shark for the code
// https://github.com/hi2shark/nazhua/blob/main/src/utils/date.js#L86
export function getNextCycleTime(startDate: number, months: number, specifiedDate: number): number {
  const start = dayjs(startDate)
  const checkDate = dayjs(specifiedDate)

  if (!start.isValid() || months <= 0) {
    throw new Error("参数无效：请检查起始日期、周期月份数和指定日期。")
  }

  let nextDate = start

  // 循环增加周期直到大于当前日期
  let whileStatus = true
  while (whileStatus) {
    nextDate = nextDate.add(months, "month")
    whileStatus = nextDate.valueOf() <= checkDate.valueOf()
  }

  return nextDate.valueOf() // 返回时间毫秒数
}

export function getDaysBetweenDates(date1: string, date2: string): number {
  const oneDay = 24 * 60 * 60 * 1000 // 一天的毫秒数
  const firstDate = new Date(date1)
  const secondDate = new Date(date2)

  // 计算两个日期之间的天数差异
  return Math.round((firstDate.getTime() - secondDate.getTime()) / oneDay)
}

export const fetcher = (url: string) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) {
        throw new Error(res.statusText)
      }
      return res.json()
    })
    .then((data) => data.data)
    .catch((err) => {
      console.error(err)
      throw err
    })

export const nezhaFetcher = async (url: string) => {
  const res = await fetch(url)

  if (!res.ok) {
    const error = new Error("An error occurred while fetching the data.")
    // @ts-expect-error - res.json() returns a Promise<any>
    error.info = await res.json()
    // @ts-expect-error - res.status is a number
    error.status = res.status
    throw error
  }

  return res.json()
}

export function parseISOTimestamp(isoString: string): number {
  return new Date(isoString).getTime()
}

export function formatRelativeTime(timestamp: number): string {
  const now = Date.now()
  const diff = now - timestamp
  const hours = Math.floor(diff / (1000 * 60 * 60))
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
  const seconds = Math.floor((diff % (1000 * 60)) / 1000)

  if (hours > 24) {
    const days = Math.floor(hours / 24)
    return `${days}d`
  } else if (hours > 0) {
    return `${hours}h`
  } else if (minutes > 0) {
    return `${minutes}m`
  } else if (seconds >= 0) {
    return `${seconds}s`
  }
  return "0s"
}

export function formatTime(timestamp: number): string {
  const date = new Date(timestamp)
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  const hours = date.getHours().toString().padStart(2, "0")
  const minutes = date.getMinutes().toString().padStart(2, "0")
  const seconds = date.getSeconds().toString().padStart(2, "0")
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
}

interface BillingData {
  startDate: string
  endDate: string
  autoRenewal: string
  cycle: string
  amount: string
  currency?: string
}

interface PlanData {
  bandwidth: string
  trafficVol: string
  trafficType: string
  IPv4: string
  IPv6: string
  networkRoute: string
  extra: string
}

export interface PublicNoteData {
  billingDataMod?: BillingData
  planDataMod?: PlanData
}

// CNY \u663e\u793a\u98ce\u683c:\u00a5 \u89c6\u89c9\u7b80\u6d01,\u4f46\u4e0e JPY \u5171\u7528\u7b26\u53f7\u6709\u6b67\u4e49\u3002\u5f53\u90e8\u7f72\u91cc"\u7edd\u5927\u591a\u6570 CNY + \u5c11\u6570 JPY"
// \u65f6,\u7528 \u00a5 \u8868\u793a CNY\u3001\u7528 JPY \u6587\u5b57\u6807\u8bb0\u65e5\u5143\u6700\u81ea\u7136(\u6d88\u6b67\u4e49\u8d1f\u62c5\u843d\u5728\u5c11\u6570\u6d3e);\u53cd\u4e4b\u4ea6\u7136\u3002
// \u9ed8\u8ba4 \u00a5,\u53ef\u5728 komari-theme.json \u7684 CnySymbolStyle \u91cc\u5207\u5230 CNY\u3002
function getCnyLabel(): string {
  if (typeof window === "undefined") return "\u00a5"
  const style = (window as unknown as Record<string, unknown>).CnySymbolStyle
  const raw = typeof style === "string" ? style.trim().toUpperCase() : ""
  return raw === "CNY" ? "CNY " : "\u00a5"
}

const STATIC_CURRENCY_LABELS: Record<string, string> = {
  JPY: "JPY ",
  USD: "$",
  EUR: "\u20ac",
  GBP: "\u00a3",
  HKD: "HK$",
  TWD: "NT$",
  KRW: "KRW ",
  SGD: "S$",
  CAD: "CA$",
  AUD: "A$",
  $: "$",
  "\u20ac": "\u20ac",
  "\u00a3": "\u00a3",
  "\u00a5": "\u00a5",
  "\uffe5": "\uffe5",
}

function getCurrencyLabel(currency: string): string | undefined {
  if (currency === "CNY") return getCnyLabel()
  return STATIC_CURRENCY_LABELS[currency]
}

export function normalizeBillingCurrency(currency?: unknown): string {
  const raw = typeof currency === "string" ? currency.trim() : ""
  if (!raw) return ""

  const upper = raw.toUpperCase()
  const compact = upper.replace(/\s+/g, "")

  if (["CNY", "RMB", "CN\u00a5", "CN\uffe5"].includes(compact) || raw.includes("\u4eba\u6c11\u5e01")) return "CNY"
  if (["JPY", "JP\u00a5", "JP\uffe5"].includes(compact) || raw.includes("\u65e5\u5143") || raw.includes("\u5186")) return "JPY"

  // Komari's currency field is user-entered text. In Chinese deployments, bare ¥/￥ is commonly used for CNY.
  if (compact === "\u00a5" || compact === "\uffe5") return "CNY"

  if (compact === "$") return "USD"
  if (compact === "\u20ac") return "EUR"
  if (compact === "\u00a3") return "GBP"
  if (compact === "US$") return "USD"
  if (compact === "HK$") return "HKD"
  if (compact === "NT$") return "TWD"

  return compact || raw
}

export function stripCurrencyMarks(amount: string): string {
  return amount
    .trim()
    .replace(
      /^(?:CNY|RMB|JPY|USD|EUR|GBP|HKD|TWD|KRW|SGD|CAD|AUD|CN\u00a5|CN\uffe5|JP\u00a5|JP\uffe5|US\$|HK\$|NT\$|\$|\u20ac|\u00a3|\u00a5|\uffe5)\s*/i,
      "",
    )
    .replace(
      /\s*(?:CNY|RMB|JPY|USD|EUR|GBP|HKD|TWD|KRW|SGD|CAD|AUD|CN\u00a5|CN\uffe5|JP\u00a5|JP\uffe5|US\$|HK\$|NT\$|\$|\u20ac|\u00a3|\u00a5|\uffe5)$/i,
      "",
    )
    .trim()
}

export function parseBillingAmountNumber(amount: string): number | null {
  const rawAmount = String(amount || "").trim()
  if (!rawAmount || rawAmount === "-1") {
    return null
  }

  const normalized = stripCurrencyMarks(rawAmount).replace(/,/g, "")
  const value = Number(normalized)
  return Number.isFinite(value) ? value : null
}

export function formatBillingAmount(amount: string, currency?: string): string {
  const rawAmount = String(amount || "").trim()
  if (!rawAmount || rawAmount === "0" || rawAmount === "-1") {
    return rawAmount
  }

  const normalizedCurrency = normalizeBillingCurrency(currency)
  if (!normalizedCurrency) {
    return rawAmount
  }

  const label = getCurrencyLabel(normalizedCurrency) || `${normalizedCurrency} `
  const value = stripCurrencyMarks(rawAmount)
  return value ? `${label}${value}` : rawAmount
}

function isFollowBackendCurrency(value?: unknown): boolean {
  const raw = typeof value === "string" ? value.trim() : ""
  const normalized = raw.toLowerCase()
  return (
    raw === "" ||
    ["backend", "follow-backend", "follow backend", "auto", "default", "\u8ddf\u968f\u540e\u7aef", "\u4f7f\u7528\u540e\u7aef"].includes(normalized)
  )
}

function parseBillingCurrencyOverrides(value: unknown): Record<string, unknown> {
  if (!value) return {}
  if (typeof value === "object" && !Array.isArray(value)) return value as Record<string, unknown>
  if (typeof value !== "string" || !value.trim()) return {}

  try {
    const parsed = JSON.parse(value)
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

export function resolveThemeBillingCurrency(server: any, existingCurrency?: string): string {
  const win = typeof window === "undefined" ? {} : (window as unknown as Record<string, unknown>) || {}

  // 优先级:主题面板 JSON 覆盖 > tags 内嵌 <CURRENCY> > 主题默认货币 > Komari 后端 currency 字段
  // 1) 主题面板 ServerBillingCurrencyOverrides JSON
  const overrides = parseBillingCurrencyOverrides(win.ServerBillingCurrencyOverrides)
  const overrideKeys = [server?.uuid, server?.name, server?.id, server?.uuid ? String(uuidToNumber(String(server.uuid))) : ""]
    .filter(Boolean)
    .map(String)

  for (const key of overrideKeys) {
    if (Object.prototype.hasOwnProperty.call(overrides, key)) {
      const override = overrides[key]
      return isFollowBackendCurrency(override)
        ? readTagCurrency(server) || normalizeBillingCurrency(server?.currency) || normalizeBillingCurrency(existingCurrency)
        : normalizeBillingCurrency(override)
    }
  }

  // 2) tags 内嵌 <CURRENCY> 元标签——比 JSON 配置易维护,贴近数据
  const tagCurrency = readTagCurrency(server)
  if (tagCurrency) return tagCurrency

  // 3) 主题默认货币
  const defaultCurrency = win.DefaultBillingCurrency
  if (!isFollowBackendCurrency(defaultCurrency)) {
    return normalizeBillingCurrency(defaultCurrency)
  }

  // 4) Komari 后端 currency 字段
  return normalizeBillingCurrency(server?.currency) || normalizeBillingCurrency(existingCurrency)
}

function readTagCurrency(server: any): string {
  const tags = typeof server?.tags === "string" ? server.tags : ""
  if (!tags) return ""
  return normalizeBillingCurrency(parseTagMetadata(tags).currency)
}

export function parsePublicNote(publicNote: string): PublicNoteData | null {
  try {
    if (!publicNote) {
      return null
    }
    const data = JSON.parse(publicNote)
    if (!data.billingDataMod && !data.planDataMod) {
      return null
    }
    if (data.billingDataMod && !data.planDataMod) {
      return {
        billingDataMod: {
          startDate: data.billingDataMod.startDate || "",
          endDate: data.billingDataMod.endDate,
          autoRenewal: data.billingDataMod.autoRenewal || "",
          cycle: data.billingDataMod.cycle || "",
          amount: data.billingDataMod.amount || "",
          currency: data.billingDataMod.currency || "",
        },
      }
    }
    if (!data.billingDataMod && data.planDataMod) {
      return {
        planDataMod: {
          bandwidth: data.planDataMod.bandwidth || "",
          trafficVol: data.planDataMod.trafficVol || "",
          trafficType: data.planDataMod.trafficType || "",
          IPv4: data.planDataMod.IPv4 || "",
          IPv6: data.planDataMod.IPv6 || "",
          networkRoute: data.planDataMod.networkRoute || "",
          extra: data.planDataMod.extra || "",
        },
      }
    }

    return {
      billingDataMod: {
        startDate: data.billingDataMod.startDate || "",
        endDate: data.billingDataMod.endDate,
        autoRenewal: data.billingDataMod.autoRenewal || "",
        cycle: data.billingDataMod.cycle || "",
        amount: data.billingDataMod.amount || "",
        currency: data.billingDataMod.currency || "",
      },
      planDataMod: {
        bandwidth: data.planDataMod.bandwidth || "",
        trafficVol: data.planDataMod.trafficVol || "",
        trafficType: data.planDataMod.trafficType || "",
        IPv4: data.planDataMod.IPv4 || "",
        IPv6: data.planDataMod.IPv6 || "",
        networkRoute: data.planDataMod.networkRoute || "",
        extra: data.planDataMod.extra || "",
      },
    }
  } catch (error) {
    console.error("Error parsing public note:", error)
    return null
  }
}

// Function to handle public_note with sessionStorage
export function handlePublicNote(serverId: number, publicNote: string): string {
  const storageKey = `server_${serverId}_public_note`
  const storedNote = sessionStorage.getItem(storageKey)

  if (!publicNote && storedNote) {
    return storedNote
  }

  if (publicNote) {
    sessionStorage.setItem(storageKey, publicNote)
    return publicNote
  }

  return ""
}

export const uuidToNumber = (uuid: string): number => {
  let hash = 0
  for (let i = 0; i < uuid.length; i++) {
    const charCode = uuid.charCodeAt(i)
    hash = charCode + ((hash << 5) - hash)
  }
  return hash >>> 0
}

let km_servers_cache: any[] = []

const countryFlagToCode = (flag: string): string => {
  const value = String(flag || "").trim()
  if (/^[a-z]{2}$/i.test(value)) return value.toLowerCase()
  return [...value].map((c) => String.fromCharCode(c.codePointAt(0)! - 127397 + 32)).join("")
}

// 根据 common:getNodes 的字段构造/合并公开备注（public_note）
// 目标结构：{ billingDataMod: { startDate,endDate,autoRenewal,cycle,amount }, planDataMod: { bandwidth,trafficVol,trafficType,IPv4,IPv6,networkRoute,extra } }
// 周期标签：使用阿拉伯数字+年/月，避免"五年"等中文数字给下游 parseCycleDays 带来识别歧义。
const CYCLE_MAP: Record<number, string> = { 30: "月", 92: "季", 184: "半年", 365: "年", 730: "2年", 1095: "3年", 1825: "5年" }

function deriveCycleLabel(billing_cycle?: number): string {
  const bc = Number(billing_cycle || 0)
  if (!bc) return ""
  if (bc === -1 || bc === 0) return "一次性"
  for (const [days, label] of Object.entries(CYCLE_MAP)) {
    if (Math.abs(bc - Number(days)) <= 3) return label
  }
  const y = Math.round(bc / 365)
  if (y >= 1 && y <= 10) return y === 1 ? "年" : `${y}年`
  return `${bc}天`
}

// 颜色名与 ISO 货币代码两个集合互不相交,可以共用 <...> 语法。
const TAG_COLORS = [
  "Gray", "Gold", "Bronze", "Brown", "Yellow", "Amber", "Orange", "Tomato",
  "Red", "Ruby", "Crimson", "Pink", "Plum", "Purple", "Violet", "Iris",
  "Indigo", "Blue", "Cyan", "Teal", "Jade", "Green", "Grass", "Lime", "Mint", "Sky",
]
const TAG_CURRENCIES = ["CNY", "JPY", "USD", "EUR", "GBP", "HKD", "TWD", "KRW", "SGD", "CAD", "AUD"]

const TAG_COLOR_EXTRACT = new RegExp(`<\\s*(${TAG_COLORS.join("|")})\\s*>`, "i")
const TAG_COLOR_REMOVE = new RegExp(`<\\s*(?:${TAG_COLORS.join("|")})\\s*>`, "ig")
const TAG_CURRENCY_EXTRACT = new RegExp(`<\\s*(${TAG_CURRENCIES.join("|")})\\s*>`, "i")
const TAG_CURRENCY_REMOVE = new RegExp(`<\\s*(?:${TAG_CURRENCIES.join("|")})\\s*>`, "ig")

// 解析 tags 字段:抽出货币元数据(如 <JPY>),同时返回清洗后的人类可读文本(去掉所有 <...> 元标签)。
// currency tag 设计为纯元数据,不在 UI 上显示——金额前缀已经会显示 "JPY 12800",再标记一次就重复。
export function parseTagMetadata(tags: string): { text: string; currency: string } {
  if (!tags) return { text: "", currency: "" }
  let currency = ""
  const cleanedParts: string[] = []
  for (const rawPart of tags.split(";")) {
    const part = rawPart.trim()
    if (!part) continue

    // 第一次遇到的 currency tag 生效(后续覆盖不生效,避免 <JPY><USD> 这种歧义写法)
    if (!currency) {
      const m = part.match(TAG_CURRENCY_EXTRACT)
      if (m) currency = m[1].toUpperCase()
    }

    const colorMatch = part.match(TAG_COLOR_EXTRACT)
    const color = colorMatch ? colorMatch[1] : ""
    const text = part.replace(TAG_COLOR_REMOVE, "").replace(TAG_CURRENCY_REMOVE, "").trim()
    if (!text) continue
    cleanedParts.push(color ? `${color}:${text}` : text)
  }
  return { text: cleanedParts.join(","), currency }
}

// 清洗 tags 用于显示;currency tag 在此被静默剥离。
function sanitizeTags(tags: string): string {
  return parseTagMetadata(tags).text
}

function buildPublicNoteFromNode(server: any, existingPublicNote?: string): string {
  try {
    // 如果已有结构化的 public_note，先解析出来以便合并
    const existing = parsePublicNote(existingPublicNote || "") || undefined
    const bc: number = Number(server?.billing_cycle || 0)
    const autoRenewal: string = server?.auto_renewal === true || server?.auto_renewal === 1 || server?.auto_renewal === "1" ? "1" : "0"
    const cycle: string = deriveCycleLabel(bc) || String(bc || "")
    const currency = resolveThemeBillingCurrency(server, existing?.billingDataMod?.currency)
    const amount: string =
      server?.price != null && server?.price !== 0
        ? server.price === -1
          ? "-1"
          : String(server.price)
        : ""

    // 起止时间：优先使用 created_at/expired_at；若缺失 startDate 且存在 bc+expired_at，则回推
    const expiredRaw: string = server?.expired_at || ""
    const endDate: string =
      expiredRaw && dayjs(expiredRaw).isValid() && dayjs(expiredRaw).diff(dayjs(), "year", true) > 100
        ? "0000-00-00T23:59:59+08:00"
        : expiredRaw
    // 生成 startDate；若其年份小于 0002 年，则视为未填写（置为空）
    const startDateCandidate =
      server?.created_at || (expiredRaw && bc ? dayjs(expiredRaw).subtract(bc, "day").toISOString() : null)
    const startDate =
      startDateCandidate && dayjs(startDateCandidate).isValid() && dayjs(startDateCandidate).year() < 2 ? null : startDateCandidate

    // 计划/流量信息（如果 traffic_limit 为 0，则不添加流量相关信息）
    const trafficLimitNum = Number(server?.traffic_limit)
    const hasTraffic =
      server?.traffic_limit != null && server?.traffic_limit !== "" && !Number.isNaN(trafficLimitNum) && trafficLimitNum > 0
    const trafficVol: string = hasTraffic ? formatBytes(trafficLimitNum) : ""
    const trafficTypeFromNode: string = hasTraffic ? server?.traffic_limit_type || "" : ""
    const extraFromNode: string = existing ? "" : (
      server?.public_remark != null && server.public_remark !== ""
        ? String(server.public_remark)
        : server?.tags
          ? sanitizeTags(String(server.tags))
          : "")

    const merged = {
      billingDataMod: endDate
        ? {
            startDate: existing?.billingDataMod?.startDate || startDate,
            endDate: existing?.billingDataMod?.endDate || endDate,
            autoRenewal: existing?.billingDataMod?.autoRenewal || autoRenewal,
            cycle: existing?.billingDataMod?.cycle || (cycle === "-1" ? "" : cycle),
            amount: existing?.billingDataMod?.amount || amount,
            currency: currency || existing?.billingDataMod?.currency || "",
          }
        : null,
      planDataMod: {
        bandwidth: existing?.planDataMod?.bandwidth || "",
        // 当 traffic_limit==0 时，不从节点写入流量信息
        trafficVol: existing?.planDataMod?.trafficVol || trafficVol,
        trafficType: existing?.planDataMod?.trafficType || trafficTypeFromNode,
        IPv4: existing?.planDataMod?.IPv4 || (server?.ipv4 ? "1" : ""),
        IPv6: existing?.planDataMod?.IPv6 || (server?.ipv6 ? "1" : ""),
        networkRoute: existing?.planDataMod?.networkRoute || "",
        // 若存在 public_remark，优先写入 extra；否则保留已有或使用 tags
        extra: existing?.planDataMod?.extra || extraFromNode || "",
      },
    }

    return JSON.stringify(merged)
  } catch (e) {
    console.error("buildPublicNoteFromNode error:", e)
    return existingPublicNote || ""
  }
}

export const komariToNezhaWebsocketResponse = (data: any): NezhaWebsocketResponse => {
  // 每次 WS tick 都尝试拿一次节点列表;getKomariNodes 自带 2 分钟 TTL,
  // 命中缓存时几乎零开销,TTL 过期后会触发刷新,从而让后端删除的服务器
  // 在 ≤2 分钟内从前端消失(否则 km_servers_cache 一旦填充就永不更新,
  // 已删除的机器会以"幽灵卡片"形式残留:名称来自缓存、所有指标为 0、
  // last_active=0000-00-00,直到刷新页面)
  getKomariNodes()
    .then((res) => {
      const next = Object.values(res || {})
      if (next.length > 0) {
        km_servers_cache = next
      }
    })
    .catch(() => {
      // 拉取失败保持现有缓存,下一轮自动重试
    })

  // 如果还没有缓存，先按 data 渲染，避免首次为空
  if (!km_servers_cache || km_servers_cache.length === 0) {
    return {
      now: Date.now(),
      servers: [],
    }
    // const servers: any[] = Object.entries(data || {}).reduce((acc: any[], [uuid, status]: [string, any]) => {
    //   const host = {
    //     platform: status.os || "",
    //     platform_version: status.kernel_version || "",
    //     cpu: status.cpu_name ? [status.cpu_name] : [],
    //     gpu: status.gpu_name ? [status.gpu_name] : [],
    //     mem_total: status.ram_total || 0,
    //     disk_total: status.disk_total || 0,
    //     swap_total: status.swap_total || 0,
    //     arch: status.arch || "",
    //     boot_time: new Date(status.time).getTime() / 1000 - (status.uptime || 0),
    //     version: "",
    //   }

    //   const state = {
    //     cpu: status.cpu || 0,
    //     mem_used: status.ram || 0,
    //     swap_used: status.swap || 0,
    //     disk_used: status.disk || 0,
    //     net_in_transfer: status.net_total_down || 0,
    //     net_out_transfer: status.net_total_up || 0,
    //     net_in_speed: status.net_in || 0,
    //     net_out_speed: status.net_out || 0,
    //     uptime: status.uptime || 0,
    //     load_1: status.load || 0,
    //     load_5: status.load5 || 0,
    //     load_15: status.load15 || 0,
    //     tcp_conn_count: status.connections || 0,
    //     udp_conn_count: status.connections_udp || 0,
    //     process_count: status.process || 0,
    //     temperatures: status.temp > 0 ? [{ Name: "CPU", Temperature: status.temp }] : [],
    //     gpu: typeof status.gpu === "number" ? [status.gpu] : [],
    //   }

    //   acc.push({
    //     id: uuidToNumber(uuid),
    //     name: status.name || uuid,
    //     public_note: "",
    //     last_active: status.time,
    //     country_code: status.region ? countryFlagToCode(status.region) : "",
    //     display_index: 0,
    //     host,
    //     state,
    //   })
    //   return acc
    // }, [])

    // return {
    //   now: Date.now(),
    //   servers,
    // }
  }

  // 按缓存列表展示；如果 data 中没有该 uuid，则视为离线
  const statusMap = new Map<string, any>(Object.entries(data || {}))
  // Komari 的 getNodesLatestStatus 对**离线但仍注册**的服务器会以 online:false 返回,
  // 只有**被后端删除**的服务器才会从该接口完全消失。因此当 statusMap 非空时,
  // 把缓存中存在但 statusMap 里没有的 UUID 直接过滤掉,删服务器可以在下一次 WS tick(≤2 秒)
  // 立即从前端消失,而不必等 km_servers_cache 的 2 分钟 TTL 刷新;
  // statusMap 为空时(初次加载或瞬时错误)保留全部缓存,避免误删。
  const hasStatusData = statusMap.size > 0
  const liveCache = hasStatusData
    ? km_servers_cache.filter((server: any) => statusMap.has(server.uuid))
    : km_servers_cache
  const servers: any[] = liveCache.map((server: any) => {
    const uuid = server.uuid
    const status = statusMap.get(uuid)
    const countryCode = server?.region ? countryFlagToCode(String(server.region)) : ""
    // 已处理的 uuid 从映射中移除，避免后续增补阶段重复添加
    if (statusMap.has(uuid)) {
      statusMap.delete(uuid)
    }

    const bootTime = status ? new Date(status.time).getTime() / 1000 - (status.uptime || 0) : 0

    const host = {
      platform: server.os,
      platform_version: server.kernel_version,
      cpu: [server.cpu_name],
      gpu: server.gpu_name ? [server.gpu_name] : [],
      mem_total: server.mem_total,
      disk_total: server.disk_total,
      swap_total: server.swap_total,
      arch: server.arch,
      boot_time: bootTime,
      version: "",
    }

    const state = status
      ? {
          cpu: status.cpu || 0,
          mem_used: status.ram || 0,
          swap_used: status.swap || 0,
          disk_used: status.disk || 0,
          net_in_transfer: status.net_total_down || 0,
          net_out_transfer: status.net_total_up || 0,
          net_in_speed: status.net_in || 0,
          net_out_speed: status.net_out || 0,
          uptime: status.uptime || 0,
          load_1: status.load || 0,
          load_5: status.load5 || 0,
          load_15: status.load15 || 0,
          tcp_conn_count: status.connections || 0,
          udp_conn_count: status.connections_udp || 0,
          process_count: status.process || 0,
          temperatures: status.temp > 0 ? [{ Name: "CPU", Temperature: status.temp }] : [],
          gpu: server.gpu_name && typeof status.gpu === "number" ? [status.gpu] : [],
        }
      : {
          cpu: 0,
          mem_used: 0,
          swap_used: 0,
          disk_used: 0,
          net_in_transfer: 0,
          net_out_transfer: 0,
          net_in_speed: 0,
          net_out_speed: 0,
          uptime: 0,
          load_1: 0,
          load_5: 0,
          load_15: 0,
          tcp_conn_count: 0,
          udp_conn_count: 0,
          process_count: 0,
          temperatures: [],
          gpu: [],
        }

    return {
      uuid,
      id: uuidToNumber(uuid),
      name: server.name,
      public_note: buildPublicNoteFromNode(server, server.public_remark || ""),
      last_active: status && status.time ? status.time : "0000-00-00T00:00:00Z",
      country_code: countryCode,
      display_index: -server.weight || 0,
      host,
      state,
      traffic_limit: server.traffic_limit || 0,
      traffic_limit_type: server.traffic_limit_type || "sum",
      expired_at: server.expired_at || "",
      online: status ? status.online === true : false,
      tags: typeof server.tags === "string" ? server.tags : "",
      currency: typeof server.currency === "string" ? server.currency : "",
    }
  })

  // 追加那些仅在 data 里出现但缓存里没有的新服务器（保证“出现过的都显示”）
  for (const [uuid, status] of statusMap.entries()) {
    const host = {
      platform: status.os || "",
      platform_version: status.kernel_version || "",
      cpu: status.cpu_name ? [status.cpu_name] : [],
      gpu: status.gpu_name ? [status.gpu_name] : [],
      mem_total: status.ram_total || 0,
      disk_total: status.disk_total || 0,
      swap_total: status.swap_total || 0,
      arch: status.arch || "",
      boot_time: new Date(status.time).getTime() / 1000 - (status.uptime || 0),
      version: "",
    }

    const state = {
      cpu: status.cpu || 0,
      mem_used: status.ram || 0,
      swap_used: status.swap || 0,
      disk_used: status.disk || 0,
      net_in_transfer: status.net_total_down || 0,
      net_out_transfer: status.net_total_up || 0,
      net_in_speed: status.net_in || 0,
      net_out_speed: status.net_out || 0,
      uptime: status.uptime || 0,
      load_1: status.load || 0,
      load_5: status.load5 || 0,
      load_15: status.load15 || 0,
      tcp_conn_count: status.connections || 0,
      udp_conn_count: status.connections_udp || 0,
      process_count: status.process || 0,
      temperatures: status.temp > 0 ? [{ Name: "CPU", Temperature: status.temp }] : [],
      gpu: typeof status.gpu === "number" ? [status.gpu] : [],
    }

    servers.push({
      uuid,
      id: uuidToNumber(uuid),
      name: status.name || uuid,
      public_note: "",
      last_active: status.time || "0000-00-00T00:00:00Z",
      country_code: status.region ? countryFlagToCode(status.region) : "",
      display_index: 0,
      host,
      state,
      online: status.online === true,
    })
  }

  return {
    now: Date.now(),
    servers,
  }
}

let __nodesCache__ : any = null
let __nodesCachePromise__: Promise<any> | null = null
export const getKomariNodes = async () => {
  // 命中缓存，直接返回
  if (__nodesCache__) {
    return __nodesCache__
  }

  // 若已有进行中的请求，复用同一个 Promise，避免并发重复请求
  if (__nodesCachePromise__) {
    return __nodesCachePromise__
  }

  // 建立并发锁（in-flight Promise）
  __nodesCachePromise__ = SharedClient()
    .call("common:getNodes")
    .then((res) => {
      __nodesCache__ = res
      // 设置 TTL 到期清理
      setTimeout(() => {
        __nodesCache__ = null
      }, 2 * 60 * 1000) // 2 minutes cache
      return __nodesCache__
    })
    .catch((err) => {
      // 失败不污染缓存，下次可重试
      __nodesCache__ = null
      throw err
    })
    .finally(() => {
      // 请求结束，释放并发锁
      __nodesCachePromise__ = null
    })

  return __nodesCachePromise__
}
