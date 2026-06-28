import { Checkbox } from "@/components/ui/checkbox"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { fetchLoginUser, fetchService, updateThemeSetting } from "@/lib/nezha-api"
import { NezhaServer, ServiceData } from "@/types/nezha-api"
import { ExclamationTriangleIcon } from "@heroicons/react/20/solid"
import { useQuery } from "@tanstack/react-query"
import { Settings2 } from "lucide-react"
import { useState } from "react"
import { useTranslation } from "react-i18next"

import { CycleTransferStatsCard } from "./CycleTransferStats"
import ServiceTrackerClient from "./ServiceTrackerClient"
import { Loader } from "./loading/Loader"

function getHiddenServices(): string[] {
  const val = (window as unknown as Record<string, unknown>).ServiceTrackerHidden
  if (Array.isArray(val)) return val as string[]
  return []
}

export function ServiceTracker({ serverList }: { serverList: NezhaServer[] }) {
  const { t } = useTranslation()
  const [hiddenServices, setHiddenServices] = useState<string[]>(getHiddenServices)

  const { data: serviceData, isLoading } = useQuery({
    queryKey: ["service"],
    queryFn: () => fetchService(),
    refetchOnMount: true,
    refetchOnWindowFocus: false,
    refetchInterval: 600000, // 10分钟刷新一次，30天数据变化缓慢
    staleTime: 300000, // 5分钟内不重复请求
  })

  const { data: userData } = useQuery({
    queryKey: ["login-user"],
    queryFn: () => fetchLoginUser(),
    retry: 0,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const isLoggedIn = !!userData?.data?.id

  const toggleService = (name: string) => {
    const next = hiddenServices.includes(name) ? hiddenServices.filter((n) => n !== name) : [...hiddenServices, name]
    // 乐观更新：立即更新 UI
    setHiddenServices(next)
    ;(window as unknown as Record<string, unknown>).ServiceTrackerHidden = next
    // 后台异步保存到服务端
    updateThemeSetting("ServiceTrackerHidden", next).catch((e) => {
      console.error("Failed to save service filter:", e)
    })
  }

  const processServiceData = (serviceData: ServiceData) => {
    // 找到第一个有数据的天（up+down > 0），只展示从该天开始的数据
    let firstDataIndex = 0
    for (let i = 0; i < serviceData.up.length; i++) {
      if (serviceData.up[i] + serviceData.down[i] > 0) {
        firstDataIndex = i
        break
      }
    }

    const days = serviceData.up.slice(firstDataIndex).map((up, index) => {
      const actualIndex = firstDataIndex + index
      const totalChecks = up + serviceData.down[actualIndex]
      const dailyUptime = totalChecks > 0 ? (up / totalChecks) * 100 : 0
      return {
        completed: up > serviceData.down[actualIndex],
        date: new Date(Date.now() - (29 - actualIndex) * 24 * 60 * 60 * 1000),
        uptime: dailyUptime,
        delay: serviceData.delay[actualIndex] || 0,
      }
    })

    const activeUp = serviceData.up.slice(firstDataIndex)
    const activeDown = serviceData.down.slice(firstDataIndex)
    const totalUp = activeUp.reduce((a, b) => a + b, 0)
    const totalChecks = totalUp + activeDown.reduce((a, b) => a + b, 0)
    const uptime = totalChecks > 0 ? (totalUp / totalChecks) * 100 : 0

    const activeDelays = serviceData.delay.slice(firstDataIndex)
    const nonZeroDelays = activeDelays.filter((d) => d > 0)
    const avgDelay = nonZeroDelays.length > 0 ? nonZeroDelays.reduce((a, b) => a + b, 0) / nonZeroDelays.length : 0

    const totalDays = days.length

    return { days, uptime, avgDelay, totalDays }
  }

  if (isLoading) {
    return (
      <div className="mt-4 text-sm font-medium flex items-center gap-1">
        <Loader visible={true} />
        {t("serviceTracker.loading")}
      </div>
    )
  }

  if (!serviceData?.data?.services && !serviceData?.data?.cycle_transfer_stats) {
    return (
      <div className="mt-4 text-sm font-medium flex items-center gap-1">
        <ExclamationTriangleIcon className="w-4 h-4" />
        {t("serviceTracker.noService")}
      </div>
    )
  }

  const allServices = serviceData.data.services ? Object.entries(serviceData.data.services) : []
  const visibleServices = allServices.filter(([, data]) => !hiddenServices.includes(data.service_name))

  return (
    <div className="mt-4 w-full mx-auto ">
      {serviceData.data.cycle_transfer_stats && (
        <div>
          <CycleTransferStatsCard serverList={serverList} cycleStats={serviceData.data.cycle_transfer_stats} />
        </div>
      )}
      {allServices.length > 0 && (
        <>
          {isLoggedIn && (
            <div className="flex justify-end mt-2 mb-1">
              <Popover>
                <PopoverTrigger asChild>
                  <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                    <Settings2 className="w-3.5 h-3.5" />
                    {t("serviceTracker.filter", "筛选")}
                  </button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-56 p-3">
                  <p className="text-sm font-medium mb-2">{t("serviceTracker.selectTargets", "选择显示目标")}</p>
                  <div className="space-y-2">
                    {allServices.map(([id, data]) => (
                      <label key={id} className="flex items-center gap-2 cursor-pointer text-sm">
                        <Checkbox
                          checked={!hiddenServices.includes(data.service_name)}
                          onCheckedChange={() => toggleService(data.service_name)}
                        />
                        {data.service_name}
                      </label>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          )}
          {visibleServices.length > 0 && (
            <section className="grid grid-cols-1 md:grid-cols-2 mt-2 gap-2 md:gap-4">
              {visibleServices.map(([name, data]) => {
                const { days, uptime, avgDelay, totalDays } = processServiceData(data)
                return <ServiceTrackerClient key={name} days={days} title={data.service_name} uptime={uptime} avgDelay={avgDelay} totalDays={totalDays} />
              })}
            </section>
          )}
        </>
      )}
    </div>
  )
}

export default ServiceTracker
