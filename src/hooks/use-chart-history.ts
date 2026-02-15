import { NezhaWebsocketResponse } from "@/types/nezha-api"
import { useEffect, useState } from "react"

export function useChartHistory<T>(
  messageHistory: { data: string }[],
  serverId: number,
  formatFn: (wsData: NezhaWebsocketResponse, serverId: number) => T | null,
) {
  const [data, setData] = useState<T[]>([])

  useEffect(() => {
    if (messageHistory.length > 0 && data.length === 0) {
      const historyData = messageHistory
        .map((msg) => {
          const wsData = JSON.parse(msg.data) as NezhaWebsocketResponse
          return formatFn(wsData, serverId)
        })
        .filter((item): item is T => item !== null)
        .reverse()

      setData(historyData)
    }
  }, [messageHistory])

  return data
}
