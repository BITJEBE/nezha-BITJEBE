import { SortContext } from "@/context/sort-context"
import { useContext } from "react"

export function useSort() {
  const context = useContext(SortContext)
  if (context === undefined) {
    throw new Error("useStatus must be used within a SortProvider")
  }
  return context
}
