// 主题色板:用于访客胶囊和资产卡片的"主色"下拉框配置。
//
// Tailwind JIT 通过扫描源码字面量来识别 class,所以这里必须把完整 class 字符串
// 一一写出来,不能用模板字符串拼接(如 `bg-${color}-50` 会被摇树掉)。
//
// 添加新色时:在两个对象里都加一组,同时保持 tailwind.config.js 的 safelist 同步。

export type ThemeColorKey = "blue" | "green" | "purple" | "pink" | "orange" | "red" | "cyan" | "amber"

export const THEME_COLOR_KEYS: ThemeColorKey[] = ["blue", "green", "purple", "pink", "orange", "red", "cyan", "amber"]

export function resolveThemeColor(value: unknown, fallback: ThemeColorKey = "blue"): ThemeColorKey {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : ""
  return (THEME_COLOR_KEYS as string[]).includes(normalized) ? (normalized as ThemeColorKey) : fallback
}

// 访客胶囊用色板
export interface CapsuleColorClasses {
  container: string
  ipLabel: string
  divider: string
  iconWrap: string
  errorAccent: string
}

export const CAPSULE_COLORS: Record<ThemeColorKey, CapsuleColorClasses> = {
  blue: {
    container:
      "border-blue-300/70 bg-blue-50/85 text-blue-950 shadow-[0_10px_30px_rgba(37,99,235,0.22)] dark:border-blue-400/30 dark:bg-blue-950/80 dark:text-blue-50",
    ipLabel: "text-blue-700 dark:text-blue-200",
    divider: "bg-blue-200 dark:bg-blue-500/40",
    iconWrap:
      "border-blue-200/70 bg-white/80 text-blue-600 dark:border-blue-300/25 dark:bg-blue-900/70 dark:text-blue-200",
    errorAccent: "text-blue-700 dark:text-blue-200",
  },
  green: {
    container:
      "border-green-300/70 bg-green-50/85 text-green-950 shadow-[0_10px_30px_rgba(22,163,74,0.22)] dark:border-green-400/30 dark:bg-green-950/80 dark:text-green-50",
    ipLabel: "text-green-700 dark:text-green-200",
    divider: "bg-green-200 dark:bg-green-500/40",
    iconWrap:
      "border-green-200/70 bg-white/80 text-green-600 dark:border-green-300/25 dark:bg-green-900/70 dark:text-green-200",
    errorAccent: "text-green-700 dark:text-green-200",
  },
  purple: {
    container:
      "border-purple-300/70 bg-purple-50/85 text-purple-950 shadow-[0_10px_30px_rgba(147,51,234,0.22)] dark:border-purple-400/30 dark:bg-purple-950/80 dark:text-purple-50",
    ipLabel: "text-purple-700 dark:text-purple-200",
    divider: "bg-purple-200 dark:bg-purple-500/40",
    iconWrap:
      "border-purple-200/70 bg-white/80 text-purple-600 dark:border-purple-300/25 dark:bg-purple-900/70 dark:text-purple-200",
    errorAccent: "text-purple-700 dark:text-purple-200",
  },
  pink: {
    container:
      "border-pink-300/70 bg-pink-50/85 text-pink-950 shadow-[0_10px_30px_rgba(219,39,119,0.22)] dark:border-pink-400/30 dark:bg-pink-950/80 dark:text-pink-50",
    ipLabel: "text-pink-700 dark:text-pink-200",
    divider: "bg-pink-200 dark:bg-pink-500/40",
    iconWrap:
      "border-pink-200/70 bg-white/80 text-pink-600 dark:border-pink-300/25 dark:bg-pink-900/70 dark:text-pink-200",
    errorAccent: "text-pink-700 dark:text-pink-200",
  },
  orange: {
    container:
      "border-orange-300/70 bg-orange-50/85 text-orange-950 shadow-[0_10px_30px_rgba(234,88,12,0.22)] dark:border-orange-400/30 dark:bg-orange-950/80 dark:text-orange-50",
    ipLabel: "text-orange-700 dark:text-orange-200",
    divider: "bg-orange-200 dark:bg-orange-500/40",
    iconWrap:
      "border-orange-200/70 bg-white/80 text-orange-600 dark:border-orange-300/25 dark:bg-orange-900/70 dark:text-orange-200",
    errorAccent: "text-orange-700 dark:text-orange-200",
  },
  red: {
    container:
      "border-red-300/70 bg-red-50/85 text-red-950 shadow-[0_10px_30px_rgba(220,38,38,0.22)] dark:border-red-400/30 dark:bg-red-950/80 dark:text-red-50",
    ipLabel: "text-red-700 dark:text-red-200",
    divider: "bg-red-200 dark:bg-red-500/40",
    iconWrap:
      "border-red-200/70 bg-white/80 text-red-600 dark:border-red-300/25 dark:bg-red-900/70 dark:text-red-200",
    errorAccent: "text-red-700 dark:text-red-200",
  },
  cyan: {
    container:
      "border-cyan-300/70 bg-cyan-50/85 text-cyan-950 shadow-[0_10px_30px_rgba(8,145,178,0.22)] dark:border-cyan-400/30 dark:bg-cyan-950/80 dark:text-cyan-50",
    ipLabel: "text-cyan-700 dark:text-cyan-200",
    divider: "bg-cyan-200 dark:bg-cyan-500/40",
    iconWrap:
      "border-cyan-200/70 bg-white/80 text-cyan-600 dark:border-cyan-300/25 dark:bg-cyan-900/70 dark:text-cyan-200",
    errorAccent: "text-cyan-700 dark:text-cyan-200",
  },
  amber: {
    container:
      "border-amber-300/70 bg-amber-50/85 text-amber-950 shadow-[0_10px_30px_rgba(217,119,6,0.22)] dark:border-amber-400/30 dark:bg-amber-950/80 dark:text-amber-50",
    ipLabel: "text-amber-700 dark:text-amber-200",
    divider: "bg-amber-200 dark:bg-amber-500/40",
    iconWrap:
      "border-amber-200/70 bg-white/80 text-amber-600 dark:border-amber-300/25 dark:bg-amber-900/70 dark:text-amber-200",
    errorAccent: "text-amber-700 dark:text-amber-200",
  },
}

// 资产卡片用色板
export interface AssetColorClasses {
  triggerText: string
  panelTitle: string
  primaryText: string
  hoverPrimary: string
  focusInput: string
}

export const ASSET_COLORS: Record<ThemeColorKey, AssetColorClasses> = {
  blue: {
    triggerText: "text-blue-700 dark:text-blue-300",
    panelTitle: "text-blue-700 dark:text-blue-300",
    primaryText: "text-blue-700 dark:text-blue-300",
    hoverPrimary: "hover:text-blue-600",
    focusInput: "focus:border-blue-400 focus:ring-blue-300/50",
  },
  green: {
    triggerText: "text-green-700 dark:text-green-300",
    panelTitle: "text-green-700 dark:text-green-300",
    primaryText: "text-green-700 dark:text-green-300",
    hoverPrimary: "hover:text-green-600",
    focusInput: "focus:border-green-400 focus:ring-green-300/50",
  },
  purple: {
    triggerText: "text-purple-700 dark:text-purple-300",
    panelTitle: "text-purple-700 dark:text-purple-300",
    primaryText: "text-purple-700 dark:text-purple-300",
    hoverPrimary: "hover:text-purple-600",
    focusInput: "focus:border-purple-400 focus:ring-purple-300/50",
  },
  pink: {
    triggerText: "text-pink-700 dark:text-pink-300",
    panelTitle: "text-pink-700 dark:text-pink-300",
    primaryText: "text-pink-700 dark:text-pink-300",
    hoverPrimary: "hover:text-pink-600",
    focusInput: "focus:border-pink-400 focus:ring-pink-300/50",
  },
  orange: {
    triggerText: "text-orange-700 dark:text-orange-300",
    panelTitle: "text-orange-700 dark:text-orange-300",
    primaryText: "text-orange-700 dark:text-orange-300",
    hoverPrimary: "hover:text-orange-600",
    focusInput: "focus:border-orange-400 focus:ring-orange-300/50",
  },
  red: {
    triggerText: "text-red-700 dark:text-red-300",
    panelTitle: "text-red-700 dark:text-red-300",
    primaryText: "text-red-700 dark:text-red-300",
    hoverPrimary: "hover:text-red-600",
    focusInput: "focus:border-red-400 focus:ring-red-300/50",
  },
  cyan: {
    triggerText: "text-cyan-700 dark:text-cyan-300",
    panelTitle: "text-cyan-700 dark:text-cyan-300",
    primaryText: "text-cyan-700 dark:text-cyan-300",
    hoverPrimary: "hover:text-cyan-600",
    focusInput: "focus:border-cyan-400 focus:ring-cyan-300/50",
  },
  amber: {
    triggerText: "text-amber-700 dark:text-amber-300",
    panelTitle: "text-amber-700 dark:text-amber-300",
    primaryText: "text-amber-700 dark:text-amber-300",
    hoverPrimary: "hover:text-amber-600",
    focusInput: "focus:border-amber-400 focus:ring-amber-300/50",
  },
}
