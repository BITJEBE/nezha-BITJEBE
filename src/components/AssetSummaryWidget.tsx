import { CircleDollarSign, Heart, HelpCircle, RefreshCw, X } from "lucide-react"
import { useEffect, useMemo, useState } from "react"

import { formatBytes } from "@/lib/format"
import {
  calcTrafficUsed,
  cn,
  formatBillingAmount,
  formatNezhaInfo,
  normalizeBillingCurrency,
  parseBillingAmountNumber,
  parsePublicNote,
  resolveThemeBillingCurrency,
} from "@/lib/utils"
import { NezhaServer } from "@/types/nezha-api"

type AssetSummaryWidgetProps = {
  now: number
  servers: NezhaServer[]
}

type BillingData = NonNullable<NonNullable<ReturnType<typeof parsePublicNote>>["billingDataMod"]>
type FormattedServer = ReturnType<typeof formatNezhaInfo>
type ExchangeRates = Record<string, number>
type AssetSort = "weight_asc" | "weight_desc" | "price_asc" | "price_desc"

type AssetItem = {
  id: number
  name: string
  displayIndex: number
  formatted: FormattedServer
  billing?: BillingData
  sourceAmount: number | null
  sourceCurrency: string
  priceCny: number | null
  monthlyCny: number | null
  remainingCny: number | null
  remainingDays: number | null
  isExpired: boolean
  isFree: boolean
  isUsageBased: boolean
  isLongTerm: boolean
  isFreeTagged: boolean
  sourcePriceText: string
}

const DAY_MS = 24 * 60 * 60 * 1000
const LONG_TERM_DAYS = 365 * 100
const DISPLAY_CURRENCIES = ["CNY", "USD", "HKD", "EUR", "GBP", "JPY"] as const
const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  CNY: 1,
  USD: 0.142536,
  HKD: 1.108377,
  EUR: 0.12102,
  GBP: 0.105581,
  JPY: 22.231552,
}
const CURRENCY_SYMBOLS: Record<string, string> = {
  CNY: "¥",
  USD: "$",
  HKD: "HK$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
}

function getInitialCurrency(): string {
  const win = window as unknown as Record<string, unknown>
  const configured = typeof win.AssetCardDefaultCurrency === "string" ? normalizeBillingCurrency(win.AssetCardDefaultCurrency) : ""
  if (DISPLAY_CURRENCIES.includes(configured as (typeof DISPLAY_CURRENCIES)[number])) {
    return configured
  }

  return localStorage.getItem("asset_card_currency") || "CNY"
}

function normalizeAssetCurrency(currency?: string): string {
  return normalizeBillingCurrency(currency)
}

function formatMoney(value: number | null, currency: string): string {
  if (value === null || !Number.isFinite(value)) {
    return "--"
  }

  const digits = currency === "JPY" ? 0 : 2
  const symbol = CURRENCY_SYMBOLS[currency] || `${currency} `
  return `${symbol}${value.toFixed(digits)}`
}

function amountToCny(amount: number, currency: string, rates: ExchangeRates): number | null {
  const sourceCurrency = normalizeAssetCurrency(currency)
  if (!sourceCurrency) {
    return null
  }
  if (sourceCurrency === "CNY") {
    return amount
  }

  const rate = rates[sourceCurrency]
  return rate ? amount / rate : null
}

function cnyToCurrency(amount: number | null, currency: string, rates: ExchangeRates): number | null {
  if (amount === null) {
    return null
  }
  const rate = rates[currency]
  return rate ? amount * rate : null
}

function parseCycleDays(cycle?: string, startDate?: string, endDate?: string): number | null {
  const raw = String(cycle || "").trim().toLowerCase()
  const number = "([0-9]+(?:\\.[0-9]+)?)"

  const dayMatch = raw.match(new RegExp(`^${number}\\s*(d|day|days|天)$`))
  if (dayMatch) return Number(dayMatch[1])

  const monthMatch = raw.match(new RegExp(`^${number}\\s*(m|mo|month|months|月)$`))
  if (monthMatch) return Number(monthMatch[1]) * 30

  const yearMatch = raw.match(new RegExp(`^${number}\\s*(y|yr|year|years|年)$`))
  if (yearMatch) return Number(yearMatch[1]) * 365

  if (raw.includes("半") || raw.includes("half") || raw.includes("semi")) return 184
  if (raw.includes("季") || raw.includes("quarter") || raw === "q" || raw === "qr") return 92
  if (raw.includes("年") || raw.includes("annual") || raw === "y" || raw === "yr") return 365
  if (raw.includes("月") || raw.includes("month") || raw === "m" || raw === "mo") return 30
  if (raw.includes("一次") || raw.includes("one-time")) return null

  const start = Date.parse(startDate || "")
  const end = Date.parse(endDate || "")
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    const days = (end - start) / DAY_MS
    return days > 0 && days < 3660 ? days : null
  }

  return null
}

function getRemainingSourceValue(billing: BillingData, amount: number, atDate = new Date()) {
  if (amount <= 0) {
    return { value: 0, days: 0, isExpired: false, isLongTerm: false }
  }

  const endDate = billing.endDate || ""
  if (!endDate) {
    return { value: amount, days: null, isExpired: false, isLongTerm: false }
  }
  if (endDate.startsWith("0000-00-00")) {
    return { value: amount, days: null, isExpired: false, isLongTerm: true }
  }

  const atMs = atDate.getTime()
  let endMs = Date.parse(endDate)
  if (!Number.isFinite(endMs)) {
    return { value: 0, days: null, isExpired: false, isLongTerm: false }
  }

  if ((endMs - atMs) / DAY_MS > LONG_TERM_DAYS) {
    return { value: amount, days: null, isExpired: false, isLongTerm: true }
  }

  const cycleDays = parseCycleDays(billing.cycle, billing.startDate, billing.endDate)
  if (billing.autoRenewal === "1" && cycleDays && endMs < atMs) {
    const cycleMs = cycleDays * DAY_MS
    endMs += Math.ceil((atMs - endMs) / cycleMs) * cycleMs
  }

  const daysLeft = (endMs - atMs) / DAY_MS
  if (daysLeft <= 0) {
    return { value: 0, days: Math.floor(daysLeft), isExpired: true, isLongTerm: false }
  }
  if (!cycleDays) {
    return { value: amount, days: Math.ceil(daysLeft), isExpired: false, isLongTerm: false }
  }

  return {
    value: amount * Math.min(1, daysLeft / cycleDays),
    days: Math.ceil(daysLeft),
    isExpired: false,
    isLongTerm: false,
  }
}

function getSourcePriceText(billing?: BillingData, currency?: string): string {
  if (!billing?.amount) {
    return "未设置"
  }
  if (billing.amount === "0") {
    return "免费"
  }
  if (billing.amount === "-1") {
    return "按量"
  }

  const amount = formatBillingAmount(billing.amount, currency || billing.currency)
  return billing.cycle ? `${amount}/${billing.cycle}` : amount
}

function formatEndDate(endDate?: string): string {
  if (!endDate) {
    return "-"
  }
  if (endDate.startsWith("0000-00-00")) {
    return "长期"
  }

  const endMs = Date.parse(endDate)
  return Number.isFinite(endMs) ? new Date(endMs).toLocaleDateString() : "-"
}

function buildAssetItem(now: number, server: NezhaServer, rates: ExchangeRates): AssetItem {
  const formatted = formatNezhaInfo(now, server)
  const parsed = parsePublicNote(formatted.public_note)
  const billing = parsed?.billingDataMod
  const sourceAmount = billing ? parseBillingAmountNumber(billing.amount) : null
  const sourceCurrency = normalizeAssetCurrency(resolveThemeBillingCurrency(server, billing?.currency) || billing?.currency)
  const priceCny = sourceAmount !== null && sourceAmount > 0 ? amountToCny(sourceAmount, sourceCurrency, rates) : sourceAmount === 0 ? 0 : null
  const cycleDays = billing ? parseCycleDays(billing.cycle, billing.startDate, billing.endDate) : null
  const monthlyCny = priceCny !== null && cycleDays ? priceCny / (cycleDays / 30) : null
  const remaining = billing && sourceAmount !== null ? getRemainingSourceValue(billing, sourceAmount) : null
  const remainingCny = remaining && sourceCurrency ? amountToCny(remaining.value, sourceCurrency, rates) : null
  const extra = parsed?.planDataMod?.extra || ""

  return {
    id: formatted.id,
    name: formatted.name,
    displayIndex: formatted.display_index || 0,
    formatted,
    billing,
    sourceAmount,
    sourceCurrency,
    priceCny,
    monthlyCny,
    remainingCny,
    remainingDays: remaining?.days ?? null,
    isExpired: remaining?.isExpired || false,
    isFree: billing?.amount === "0" || sourceAmount === 0,
    isUsageBased: billing?.amount === "-1",
    isLongTerm: remaining?.isLongTerm || false,
    isFreeTagged: extra.includes("白嫖"),
    sourcePriceText: getSourcePriceText(billing, sourceCurrency),
  }
}

function sortAssetItems(items: AssetItem[], sortBy: AssetSort) {
  return [...items].sort((a, b) => {
    if (sortBy === "weight_asc") return a.displayIndex - b.displayIndex
    if (sortBy === "weight_desc") return b.displayIndex - a.displayIndex

    const aPrice = a.priceCny ?? Number.MAX_SAFE_INTEGER
    const bPrice = b.priceCny ?? Number.MAX_SAFE_INTEGER
    return sortBy === "price_asc" ? aPrice - bPrice : bPrice - aPrice
  })
}

function useExchangeRates(refreshKey: number) {
  const [rates, setRates] = useState<ExchangeRates>(DEFAULT_EXCHANGE_RATES)
  const [status, setStatus] = useState("使用默认汇率")

  useEffect(() => {
    let cancelled = false
    const controller = new AbortController()
    const timeout = window.setTimeout(() => controller.abort(), 5000)

    async function fetchRates() {
      const apis = ["https://open.er-api.com/v6/latest/CNY", "https://api.exchangerate-api.com/v4/latest/CNY"]

      for (const url of apis) {
        try {
          const res = await fetch(url, {
            cache: "no-store",
            signal: controller.signal,
          })
          if (!res.ok) {
            continue
          }
          const data = (await res.json()) as { rates?: ExchangeRates }
          if (data.rates && !cancelled) {
            setRates({ ...DEFAULT_EXCHANGE_RATES, ...data.rates, CNY: 1 })
            setStatus(`汇率更新: ${new Date().toLocaleTimeString()}`)
            return
          }
        } catch {
          // Try the next provider, then fall back to bundled rates.
        }
      }

      if (!cancelled) {
        setRates(DEFAULT_EXCHANGE_RATES)
        setStatus("使用默认汇率")
      }
    }

    fetchRates()

    return () => {
      cancelled = true
      controller.abort()
      window.clearTimeout(timeout)
    }
  }, [refreshKey])

  return { rates, status }
}

function FinanceRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 text-[13px]">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-bold text-blue-700 dark:text-blue-300">{value}</span>
    </div>
  )
}

export default function AssetSummaryWidget({ now, servers }: AssetSummaryWidgetProps) {
  const [open, setOpen] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)
  const [targetCurrency, setTargetCurrency] = useState(getInitialCurrency)
  const [sortBy, setSortBy] = useState<AssetSort>((localStorage.getItem("asset_card_sort") as AssetSort) || "weight_asc")
  const [excludeFree, setExcludeFree] = useState(localStorage.getItem("asset_card_exclude_free") !== "false")
  const [tradeItem, setTradeItem] = useState<AssetItem | null>(null)
  const [tradeAmount, setTradeAmount] = useState("")
  const [tradeDate, setTradeDate] = useState(new Date().toISOString().slice(0, 10))
  const { rates, status } = useExchangeRates(refreshKey)

  const items = useMemo(() => servers.map((server) => buildAssetItem(now, server, rates)), [now, rates, servers])
  const visibleItems = useMemo(() => {
    const filtered = excludeFree ? items.filter((item) => !item.isFree && !item.isUsageBased && !item.isFreeTagged) : items
    return sortAssetItems(filtered, sortBy)
  }, [excludeFree, items, sortBy])

  const totals = useMemo(() => {
    return visibleItems.reduce(
      (acc, item) => {
        acc.unresolved += item.sourceAmount !== null && item.priceCny === null && !item.isFree && !item.isUsageBased ? 1 : 0
        acc.total += item.priceCny ?? 0
        acc.monthly += item.monthlyCny ?? 0
        acc.remaining += item.remainingCny ?? 0
        return acc
      },
      { monthly: 0, remaining: 0, total: 0, unresolved: 0 },
    )
  }, [visibleItems])

  const targetRate = rates[targetCurrency] || 1
  const exchangeRows = DISPLAY_CURRENCIES.filter((currency) => currency !== targetCurrency && rates[currency]).map((currency) => ({
    currency,
    value: rates[targetCurrency] / rates[currency],
  }))

  const selectedTradeRemaining = useMemo(() => {
    if (!tradeItem?.billing || tradeItem.sourceAmount === null) {
      return tradeItem?.remainingCny ?? null
    }

    const asOf = new Date(`${tradeDate}T00:00:00`)
    const remaining = getRemainingSourceValue(tradeItem.billing, tradeItem.sourceAmount, asOf)
    return amountToCny(remaining.value, tradeItem.sourceCurrency, rates)
  }, [rates, tradeDate, tradeItem])

  const tradeRemainingValue = cnyToCurrency(selectedTradeRemaining, targetCurrency, rates)
  const tradeAmountValue = Number(tradeAmount)
  const premiumValue = Number.isFinite(tradeAmountValue) && tradeAmount !== "" && tradeRemainingValue !== null ? tradeAmountValue - tradeRemainingValue : null
  const premiumRate = premiumValue !== null && tradeRemainingValue && tradeRemainingValue > 0 ? (premiumValue / tradeRemainingValue) * 100 : null

  const persistCurrency = (currency: string) => {
    setTargetCurrency(currency)
    localStorage.setItem("asset_card_currency", currency)
  }

  const persistSort = (sort: AssetSort) => {
    setSortBy(sort)
    localStorage.setItem("asset_card_sort", sort)
  }

  const toggleFree = () => {
    const nextValue = !excludeFree
    setExcludeFree(nextValue)
    localStorage.setItem("asset_card_exclude_free", String(nextValue))
  }

  return (
    <>
      <button
        type="button"
        aria-label="打开资产统计"
        className={cn(
          "fixed right-5 top-[70px] z-[1041] flex size-11 items-center justify-center rounded-full border border-border bg-card/85 text-blue-700 shadow-lg backdrop-blur-xl transition dark:text-blue-300 max-[576px]:right-4",
          open ? "pointer-events-none scale-0 opacity-0" : "scale-100 opacity-100 hover:scale-105",
        )}
        onClick={() => setOpen(true)}
      >
        <CircleDollarSign className="size-6" />
      </button>

      <section
        className={cn(
          "fixed right-5 top-[70px] z-[1040] flex w-[280px] max-w-[calc(100vw-40px)] flex-col rounded-2xl border border-border bg-card/90 text-card-foreground shadow-2xl backdrop-blur-xl transition max-[576px]:right-5 max-[576px]:w-[calc(100vw-40px)]",
          open ? "translate-y-0 opacity-100" : "pointer-events-none -translate-y-4 opacity-0",
        )}
      >
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300">
            <CircleDollarSign className="size-4" />
            资产统计
          </h3>
          <button type="button" aria-label="关闭资产统计" className="rounded-full p-1 text-muted-foreground transition hover:text-blue-600" onClick={() => setOpen(false)}>
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-col gap-2 px-4 py-3">
          <FinanceRow label="服务器数量" value={`${servers.length}`} />
          <FinanceRow label="总价值" value={formatMoney(totals.total * targetRate, targetCurrency)} />
          <FinanceRow label="月均支出" value={formatMoney(totals.monthly * targetRate, targetCurrency)} />
          <FinanceRow label="年均支出" value={formatMoney(totals.monthly * 12 * targetRate, targetCurrency)} />
          <FinanceRow label="剩余总价值" value={formatMoney(totals.remaining * targetRate, targetCurrency)} />
          {totals.unresolved > 0 && (
            <div className="flex items-start gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-[11px] text-amber-700 dark:text-amber-300">
              <HelpCircle className="mt-0.5 size-3 shrink-0" />
              <span>{totals.unresolved} 台服务器的币种未配置或无法换算，未计入汇总。</span>
            </div>
          )}

          <div className="my-1 h-px bg-border" />

          <div className="max-h-[230px] overflow-y-auto pr-1">
            {visibleItems.length > 0 ? (
              visibleItems.map((item) => {
                const convertedValue = cnyToCurrency(item.remainingCny ?? item.priceCny, targetCurrency, rates)
                const title = item.isLongTerm
                  ? "长期机器按原价计入剩余价值"
                  : item.isExpired
                    ? "已过期"
                    : item.remainingDays !== null
                      ? `剩余 ${item.remainingDays} 天`
                      : item.sourcePriceText

                return (
                  <button
                    key={item.id}
                    type="button"
                    className="flex w-full items-center justify-between gap-3 rounded-md px-1 py-1.5 text-left text-[13px] transition hover:bg-accent"
                    onClick={() => {
                      setTradeDate(new Date().toISOString().slice(0, 10))
                      setTradeAmount("")
                      setTradeItem(item)
                    }}
                  >
                    <span className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap" title={item.name}>
                      {item.name}
                    </span>
                    <span className="flex shrink-0 items-center gap-1 font-semibold text-blue-700 dark:text-blue-300" title={`${item.sourcePriceText} · ${title}`}>
                      {formatMoney(convertedValue, targetCurrency)}
                      {(item.isFree || item.isUsageBased || item.isFreeTagged || item.isLongTerm || item.isExpired) && <HelpCircle className="size-3 text-muted-foreground" />}
                    </span>
                  </button>
                )
              })
            ) : (
              <p className="py-4 text-center text-xs text-muted-foreground">没有可显示的资产项目</p>
            )}
          </div>

          <p className="text-right text-[11px] text-muted-foreground">{status}</p>

          <div className="max-h-[120px] overflow-y-auto rounded-md bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground">
            {exchangeRows.map((row) => (
              <div key={row.currency} className="flex justify-between gap-3">
                <span>1 {row.currency}</span>
                <span className="font-medium text-blue-700 dark:text-blue-300">{formatMoney(row.value, targetCurrency)}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-border pt-2">
            <div className="flex gap-2">
              <select
                className="h-7 rounded border border-border bg-card px-1.5 text-[11px] outline-none"
                value={targetCurrency}
                onChange={(event) => persistCurrency(event.target.value)}
              >
                {DISPLAY_CURRENCIES.map((currency) => (
                  <option key={currency} value={currency}>
                    {currency} ({CURRENCY_SYMBOLS[currency]})
                  </option>
                ))}
              </select>
              <select
                className="h-7 rounded border border-border bg-card px-1.5 text-[11px] outline-none"
                value={sortBy}
                onChange={(event) => persistSort(event.target.value as AssetSort)}
              >
                <option value="weight_asc">权重 正序</option>
                <option value="weight_desc">权重 倒序</option>
                <option value="price_asc">价格 正序</option>
                <option value="price_desc">价格 倒序</option>
              </select>
            </div>
            <div className="flex gap-1">
              <button
                type="button"
                aria-label="切换免费资产"
                className={cn("rounded p-1 text-muted-foreground transition hover:text-blue-600", excludeFree && "text-blue-600")}
                onClick={toggleFree}
                title={excludeFree ? "当前：已排除免费/白嫖" : "当前：包含免费/白嫖"}
              >
                <Heart className="size-4" />
              </button>
              <button
                type="button"
                aria-label="刷新汇率"
                className="rounded p-1 text-muted-foreground transition hover:text-blue-600"
                onClick={() => setRefreshKey((value) => value + 1)}
                title="刷新汇率"
              >
                <RefreshCw className="size-4" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {tradeItem && (
        <div className="fixed inset-0 z-[1999] flex items-center justify-center bg-black/35 px-4 backdrop-blur-sm" onClick={() => setTradeItem(null)}>
          <section
            className="max-h-[90vh] w-full max-w-[550px] overflow-hidden rounded-2xl border border-border bg-card/95 shadow-2xl backdrop-blur-xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="flex items-center gap-2 text-sm font-bold text-blue-700 dark:text-blue-300">
                <CircleDollarSign className="size-4" />
                服务器交易
              </h3>
              <button type="button" aria-label="关闭交易计算" className="rounded-full p-1 text-muted-foreground transition hover:text-blue-600" onClick={() => setTradeItem(null)}>
                <X className="size-4" />
              </button>
            </div>

            <div className="max-h-[calc(90vh-52px)] overflow-y-auto p-4">
              <div className="mb-3 text-sm font-bold text-blue-700 dark:text-blue-300">服务器信息</div>
              <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-border bg-muted/30 text-[13px]">
                <div className="border-b border-r border-border p-2">
                  <span className="text-muted-foreground">名称</span>
                  <p className="font-medium">{tradeItem.name}</p>
                </div>
                <div className="border-b border-border p-2">
                  <span className="text-muted-foreground">CPU</span>
                  <p className="font-medium">{tradeItem.formatted.cpu.toFixed(2)}%</p>
                </div>
                <div className="border-b border-r border-border p-2">
                  <span className="text-muted-foreground">内存</span>
                  <p className="font-medium">{formatBytes(tradeItem.formatted.mem_total)}</p>
                </div>
                <div className="border-b border-border p-2">
                  <span className="text-muted-foreground">硬盘</span>
                  <p className="font-medium">{formatBytes(tradeItem.formatted.disk_total)}</p>
                </div>
                <div className="border-b border-r border-border p-2">
                  <span className="text-muted-foreground">流量</span>
                  <p className="font-medium">
                    {tradeItem.formatted.traffic_limit > 0
                      ? `${formatBytes(tradeItem.formatted.traffic_limit)} / ${formatBytes(
                          calcTrafficUsed(tradeItem.formatted.net_out_transfer, tradeItem.formatted.net_in_transfer, tradeItem.formatted.traffic_limit_type),
                        )}`
                      : "-"}
                  </p>
                </div>
                <div className="border-b border-border p-2">
                  <span className="text-muted-foreground">原价</span>
                  <p className="font-medium">{tradeItem.sourcePriceText}</p>
                </div>
                <div className="col-span-2 p-2">
                  <span className="text-muted-foreground">到期时间</span>
                  <p className="font-medium">{formatEndDate(tradeItem.billing?.endDate)}</p>
                </div>
              </div>

              <div className="my-4 h-px bg-border" />
              <div className="mb-3 text-sm font-bold text-blue-700 dark:text-blue-300">交易计算</div>
              <div className="grid gap-3">
                <label className="grid gap-1 text-[13px] font-semibold text-muted-foreground">
                  交易日期
                  <input
                    className="h-9 rounded-md border border-border bg-background px-3 text-foreground outline-none focus:border-pink-400 focus:ring-2 focus:ring-pink-300/50"
                    type="date"
                    value={tradeDate}
                    onChange={(event) => setTradeDate(event.target.value)}
                  />
                </label>
                <label className="grid gap-1 text-[13px] font-semibold text-muted-foreground">
                  交易金额
                  <input
                    className="h-11 rounded-md border-2 border-border bg-background px-3 text-base font-bold text-blue-700 outline-none transition focus:border-pink-400 focus:ring-2 focus:ring-pink-300/50 dark:text-blue-300"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="请输入交易金额"
                    value={tradeAmount}
                    onChange={(event) => setTradeAmount(event.target.value)}
                  />
                </label>
                <div className="rounded-lg border border-border bg-muted/30 px-3 py-1 text-[13px]">
                  <div className="flex justify-between border-b border-border py-2">
                    <span className="text-muted-foreground">剩余价值</span>
                    <span className="font-semibold text-blue-700 dark:text-blue-300">{formatMoney(tradeRemainingValue, targetCurrency)}</span>
                  </div>
                  <div className="flex justify-between border-b border-border py-2">
                    <span className="text-muted-foreground">溢价金额</span>
                    <span className={cn("font-semibold text-red-600", premiumValue !== null && premiumValue <= 0 && "text-green-600")}>
                      {premiumValue === null ? "-" : formatMoney(premiumValue, targetCurrency)}
                    </span>
                  </div>
                  <div className="flex justify-between py-2">
                    <span className="text-muted-foreground">溢价率</span>
                    <span className={cn("font-semibold text-red-600", premiumValue !== null && premiumValue <= 0 && "text-green-600")}>
                      {premiumRate === null ? "-" : `${premiumRate > 0 ? "+" : ""}${premiumRate.toFixed(2)}%`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>
      )}
    </>
  )
}
