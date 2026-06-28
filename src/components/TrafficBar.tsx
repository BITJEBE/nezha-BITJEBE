import { formatBytes } from "@/lib/format"
import { useEffect, useRef, useState } from "react"

interface TrafficBarProps {
  used: number
  limit: number
  resetDay?: number
  limitType: string
}

function getMonthlyResetDate(now: Date, day: number): Date {
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate()
  return new Date(now.getFullYear(), now.getMonth(), Math.min(day, lastDay))
}

function calcResetDays(resetDay?: number): string {
  if (!resetDay || resetDay < 1 || resetDay > 31) return "N/A"

  const now = new Date()
  let reset = getMonthlyResetDate(now, resetDay)
  if (reset <= now) {
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    reset = getMonthlyResetDate(nextMonth, resetDay)
  }

  return Math.ceil((reset.getTime() - now.getTime()) / 86400000) + "日"
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "max": return "较大值"
    case "min": return "较小值"
    case "up": return "单向(上行)"
    case "down": return "单向(下行)"
    default: return "双向"
  }
}

function getColor(percent: number): string {
  return `hsl(${(100 - percent) * 1.4}, 70%, 50%)`
}

export default function TrafficBar({ used, limit, resetDay, limitType }: TrafficBarProps) {
  const [infoIndex, setInfoIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const win = window as unknown as Record<string, unknown>
  const showPercent = win.TrafficBarShowPercent !== false
  const showResetDay = win.TrafficBarShowResetDay !== false
  const showBillingMode = win.TrafficBarShowBillingMode !== false

  const percent = limit > 0 ? Math.min(100, (used / limit) * 100) : 0
  const percentStr = percent.toFixed(2)
  const usedFormatted = formatBytes(used)
  const limitFormatted = formatBytes(limit)
  const resetDays = calcResetDays(resetDay)

  // 根据设置构建要显示的信息项
  const infoItems: string[] = []
  if (showPercent) infoItems.push(`${percentStr}%`)
  if (showResetDay) infoItems.push(`流量重置: ${resetDays}`)
  if (showBillingMode) infoItems.push(`计费: ${getTypeLabel(limitType)}`)

  const shouldCycle = infoItems.length > 1

  useEffect(() => {
    if (!shouldCycle) {
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = null
      return
    }
    timerRef.current = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setInfoIndex((prev) => (prev + 1) % infoItems.length)
        setFading(false)
      }, 500)
    }, 3000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [shouldCycle, infoItems.length])

  if (limit <= 0) return null

  return (
    <div className="space-y-1.5 w-full">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-1">
          <span className="text-[10px] font-medium text-neutral-800 dark:text-neutral-200">
            {usedFormatted}
          </span>
          <span className="text-[10px] text-neutral-500 dark:text-neutral-400">
            / {limitFormatted}
          </span>
        </div>
        {infoItems.length > 0 && (
          shouldCycle ? (
            <div
              className="text-[10px] font-medium text-neutral-600 dark:text-neutral-300 transition-opacity duration-500"
              style={{ opacity: fading ? 0 : 1 }}
            >
              {infoItems[infoIndex % infoItems.length]}
            </div>
          ) : (
            <span className="text-[10px] font-medium text-neutral-600 dark:text-neutral-300">
              {infoItems[0]}
            </span>
          )
        )}
      </div>
      <div className="relative h-1.5 w-full">
        <div className="absolute inset-0 bg-neutral-100 dark:bg-neutral-800 rounded-full" />
        <div
          className="absolute inset-0 rounded-full transition-all duration-300"
          style={{
            width: `${percentStr}%`,
            backgroundColor: getColor(percent),
          }}
        />
      </div>
    </div>
  )
}
