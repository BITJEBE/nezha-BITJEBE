import { Globe2, X } from "lucide-react"
import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

type VisitorInfo = {
  ip: string
  country: string
  code: string
  org: string
}

const VISITOR_APIS = ["https://ipapi.co/json/", "https://api.ip.sb/geoip", "https://freeipapi.com/api/json", "https://ipwho.is/"]

async function fetchWithTimeout(url: string, timeoutMs = 4500): Promise<Response> {
  const controller = new AbortController()
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs)

  try {
    return await fetch(url, {
      cache: "no-store",
      signal: controller.signal,
    })
  } finally {
    window.clearTimeout(timeout)
  }
}

function normalizeVisitorInfo(data: Record<string, any>): VisitorInfo {
  const ip = data.ip || data.ipAddress || data.query
  if (!ip) {
    throw new Error("Visitor IP is missing")
  }

  return {
    ip: String(ip),
    country: String(data.country_name || data.countryName || data.country || "Global"),
    code: String(data.country_code || data.countryCode || "UN").toUpperCase(),
    org: String(data.org || data.isp || data.asn_organization || data.organization || data.connection?.isp || "Internet"),
  }
}

async function fetchVisitorInfo(): Promise<VisitorInfo> {
  return new Promise((resolve, reject) => {
    let pending = VISITOR_APIS.length
    let resolved = false

    VISITOR_APIS.forEach((url) => {
      ;(async () => {
        try {
          const res = await fetchWithTimeout(url)
          if (!res.ok) {
            throw new Error("Visitor API failed")
          }
          const data = (await res.json()) as Record<string, any>
          const info = normalizeVisitorInfo(data)
          if (!resolved) {
            resolved = true
            resolve(info)
          }
        } catch (error) {
          pending -= 1
          if (!resolved && pending === 0) {
            reject(error)
          }
        }
      })()
    })
  })
}

export default function VisitorCapsuleBar() {
  const [visitorInfo, setVisitorInfo] = useState<VisitorInfo | null>(null)
  const [hasError, setHasError] = useState(false)
  const [active, setActive] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    let mounted = true
    const showTimer = window.setTimeout(() => setActive(true), 1000)
    const hideTimer = window.setTimeout(() => setActive(false), 12000)

    fetchVisitorInfo()
      .then((info) => {
        if (mounted) {
          setVisitorInfo(info)
        }
      })
      .catch(() => {
        if (mounted) {
          setHasError(true)
        }
      })

    return () => {
      mounted = false
      window.clearTimeout(showTimer)
      window.clearTimeout(hideTimer)
    }
  }, [])

  if (dismissed) {
    return null
  }

  const canShowFlag = visitorInfo?.code && /^[A-Z]{2}$/.test(visitorInfo.code) && visitorInfo.code !== "UN"

  return (
    <div
      className={cn(
        "fixed bottom-[30px] left-1/2 z-[10001] flex max-w-[95vw] -translate-x-1/2 translate-y-[50px] items-center gap-2 whitespace-nowrap rounded-[18px] border border-white/50 bg-white/75 px-5 py-2 text-[13px] font-medium text-stone-900 opacity-0 shadow-[0_10px_30px_rgba(0,0,0,0.28)] backdrop-blur-xl transition-all duration-700 dark:border-white/15 dark:bg-stone-900/75 dark:text-stone-100 max-[768px]:bottom-4 max-[768px]:scale-75 max-[768px]:px-3 max-[768px]:py-1.5 max-[768px]:text-xs",
        active ? "translate-y-0 opacity-100" : "pointer-events-none invisible",
      )}
    >
      <button
        type="button"
        aria-label="关闭访客信息"
        className="absolute right-0 top-[-6px] flex size-[18px] items-center justify-center rounded-full border border-white/60 bg-pink-200/70 text-pink-700 backdrop-blur transition hover:scale-110 hover:bg-pink-400 hover:text-white"
        onClick={() => {
          setActive(false)
          setDismissed(true)
        }}
      >
        <X className="size-2.5" strokeWidth={3} />
      </button>
      <span className="flex size-5 shrink-0 items-center justify-center overflow-hidden rounded-full text-blue-500">
        {canShowFlag ? (
          <img
            className="size-full object-cover"
            src={`https://flagcdn.com/w80/${visitorInfo.code.toLowerCase()}.png`}
            alt={visitorInfo.code}
            loading="lazy"
          />
        ) : (
          <Globe2 className="size-4" />
        )}
      </span>
      {visitorInfo ? (
        <span className="flex min-w-0 items-center gap-2">
          <span>
            <span className="font-semibold text-blue-600 dark:text-blue-400">IP:</span> {visitorInfo.ip}
          </span>
          <span className="h-3 w-px bg-stone-300 dark:bg-stone-600" />
          <span className="max-[768px]:hidden">{visitorInfo.country}</span>
          <span className="hidden max-[768px]:inline">{visitorInfo.code}</span>
          <span className="h-3 w-px bg-stone-300 dark:bg-stone-600" />
          <span className="inline-block max-w-[140px] overflow-hidden text-ellipsis align-bottom" title={visitorInfo.org}>
            {visitorInfo.org}
          </span>
        </span>
      ) : hasError ? (
        <span className="flex items-center gap-2">
          <span className="font-semibold text-blue-600 dark:text-blue-400">Hello!</span>
          <span className="h-3 w-px bg-stone-300 dark:bg-stone-600" />
          <span>欢迎回来</span>
        </span>
      ) : (
        <span>Loading...</span>
      )}
    </div>
  )
}
