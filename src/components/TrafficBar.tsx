import { formatBytes } from "@/lib/format"
import { useEffect, useRef, useState } from "react"

interface TrafficBarProps {
  used: number
  limit: number
  expiredAt: string
  limitType: string
}

function calcResetDays(expiredAt: string): string {
  if (!expiredAt || expiredAt.startsWith("0000")) return "N/A"
  try {
    const day = new Date(expiredAt).getDate()
    const now = new Date()
    const reset = new Date(now.getFullYear(), now.getMonth(), day)
    if (reset <= now) reset.setMonth(reset.getMonth() + 1)
    return Math.ceil((reset.getTime() - now.getTime()) / 86400000) + "日"
  } catch {
    return "N/A"
  }
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

export default function TrafficBar({ used, limit, expiredAt, limitType }: TrafficBarProps) {
  const [infoIndex, setInfoIndex] = useState(0)
  const [fading, setFading] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => {
      setFading(true)
      setTimeout(() => {
        setInfoIndex((prev) => (prev + 1) % 3)
        setFading(false)
      }, 500)
    }, 3000)
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  if (limit <= 0) return null

  const percent = Math.min(100, (used / limit) * 100)
  const percentStr = percent.toFixed(2)
  const usedFormatted = formatBytes(used)
  const limitFormatted = formatBytes(limit)
  const resetDays = calcResetDays(expiredAt)

  const infoItems = [
    `${percentStr}%`,
    `流量重置: ${resetDays}`,
    `计费: ${getTypeLabel(limitType)}`,
  ]

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
        <div
          className="text-[10px] font-medium text-neutral-600 dark:text-neutral-300 transition-opacity duration-500"
          style={{ opacity: fading ? 0 : 1 }}
        >
          {infoItems[infoIndex]}
        </div>
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
