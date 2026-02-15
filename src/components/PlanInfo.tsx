import { PublicNoteData, cn } from "@/lib/utils"

const TAG_COLORS: Record<string, string> = {
  gray: "bg-gray-600 text-gray-200 dark:bg-gray-800 dark:text-gray-300",
  gold: "bg-amber-600 text-amber-200 dark:bg-amber-800 dark:text-amber-300",
  bronze: "bg-amber-700 text-amber-200 dark:bg-amber-900 dark:text-amber-300",
  brown: "bg-amber-800 text-amber-200 dark:bg-amber-950 dark:text-amber-300",
  yellow: "bg-yellow-600 text-yellow-200 dark:bg-yellow-800 dark:text-yellow-300",
  amber: "bg-amber-600 text-amber-200 dark:bg-amber-800 dark:text-amber-300",
  orange: "bg-orange-600 text-orange-200 dark:bg-orange-800 dark:text-orange-300",
  tomato: "bg-red-500 text-red-100 dark:bg-red-700 dark:text-red-200",
  red: "bg-red-600 text-red-200 dark:bg-red-800 dark:text-red-300",
  ruby: "bg-rose-600 text-rose-200 dark:bg-rose-800 dark:text-rose-300",
  crimson: "bg-rose-600 text-rose-200 dark:bg-rose-800 dark:text-rose-300",
  pink: "bg-pink-600 text-pink-200 dark:bg-pink-800 dark:text-pink-300",
  plum: "bg-fuchsia-600 text-fuchsia-200 dark:bg-fuchsia-800 dark:text-fuchsia-300",
  purple: "bg-purple-600 text-purple-200 dark:bg-purple-800 dark:text-purple-300",
  violet: "bg-violet-600 text-violet-200 dark:bg-violet-800 dark:text-violet-300",
  iris: "bg-indigo-600 text-indigo-200 dark:bg-indigo-800 dark:text-indigo-300",
  indigo: "bg-indigo-600 text-indigo-200 dark:bg-indigo-800 dark:text-indigo-300",
  blue: "bg-blue-600 text-blue-200 dark:bg-blue-800 dark:text-blue-300",
  cyan: "bg-cyan-600 text-cyan-200 dark:bg-cyan-800 dark:text-cyan-300",
  teal: "bg-teal-600 text-teal-200 dark:bg-teal-800 dark:text-teal-300",
  jade: "bg-emerald-600 text-emerald-200 dark:bg-emerald-800 dark:text-emerald-300",
  green: "bg-green-600 text-green-200 dark:bg-green-800 dark:text-green-300",
  grass: "bg-green-600 text-green-200 dark:bg-green-800 dark:text-green-300",
  lime: "bg-lime-600 text-lime-200 dark:bg-lime-800 dark:text-lime-300",
  mint: "bg-emerald-500 text-emerald-100 dark:bg-emerald-700 dark:text-emerald-200",
  sky: "bg-sky-600 text-sky-200 dark:bg-sky-800 dark:text-sky-300",
}

// 用于自动分配的颜色池（视觉上区分度较高的颜色）
const AUTO_COLOR_POOL = [
  "blue", "teal", "violet", "cyan", "orange", "pink", "indigo", "jade",
  "amber", "ruby", "sky", "plum", "lime", "crimson", "gold", "iris",
]

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

function parseExtraTag(tag: string): { text: string; colorClass: string } {
  const colonIndex = tag.indexOf(":")
  if (colonIndex > 0) {
    const maybeColor = tag.substring(0, colonIndex).toLowerCase()
    if (TAG_COLORS[maybeColor]) {
      return { text: tag.substring(colonIndex + 1).trim(), colorClass: TAG_COLORS[maybeColor] }
    }
  }
  // 没有指定颜色时，根据文本哈希自动分配
  const text = tag.trim()
  const colorKey = AUTO_COLOR_POOL[hashString(text) % AUTO_COLOR_POOL.length]
  return { text, colorClass: TAG_COLORS[colorKey] }
}

export default function PlanInfo({ parsedData }: { parsedData: PublicNoteData }) {
  if (!parsedData || !parsedData.planDataMod) {
    return null
  }

  const extraList = parsedData.planDataMod.extra
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)

  return (
    <section className="flex gap-1 items-center flex-wrap mt-0.5">
      {parsedData.planDataMod.bandwidth !== "" && (
        <p className={cn("text-[9px] bg-blue-600 dark:bg-blue-800 text-blue-200 dark:text-blue-300  w-fit rounded-[5px] px-[3px] py-[1.5px]")}>
          {parsedData.planDataMod.bandwidth}
        </p>
      )}
      {parsedData.planDataMod.trafficVol !== "" && (
        <p className={cn("text-[9px] bg-green-600 text-green-200 dark:bg-green-800 dark:text-green-300  w-fit rounded-[5px] px-[3px] py-[1.5px]")}>
          {parsedData.planDataMod.trafficVol}
        </p>
      )}
      {parsedData.planDataMod.IPv4 === "1" && (
        <p
          className={cn("text-[9px] bg-purple-600 text-purple-200 dark:bg-purple-800 dark:text-purple-300  w-fit rounded-[5px] px-[3px] py-[1.5px]")}
        >
          IPv4
        </p>
      )}
      {parsedData.planDataMod.IPv6 === "1" && (
        <p className={cn("text-[9px] bg-pink-600 text-pink-200 dark:bg-pink-800 dark:text-pink-300  w-fit rounded-[5px] px-[3px] py-[1.5px]")}>
          IPv6
        </p>
      )}
      {parsedData.planDataMod.networkRoute && (
        <p className={cn("text-[9px] bg-blue-600 text-blue-200 dark:bg-blue-800 dark:text-blue-300  w-fit rounded-[5px] px-[3px] py-[1.5px]")}>
          {parsedData.planDataMod.networkRoute.split(",").map((route, index) => {
            return route + (index === parsedData.planDataMod!.networkRoute.split(",").length - 1 ? "" : "｜")
          })}
        </p>
      )}
      {extraList.map((extra, index) => {
        const { text, colorClass } = parseExtraTag(extra)
        return (
          <p
            key={index}
            className={cn("text-[9px] w-fit rounded-[5px] px-[3px] py-[1.5px]", colorClass)}
          >
            {text}
          </p>
        )
      })}
    </section>
  )
}
