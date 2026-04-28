import { PublicNoteData, cn, formatBillingAmount, getDaysBetweenDatesWithAutoRenewal } from "@/lib/utils"
import { useTranslation } from "react-i18next"

import RemainPercentBar from "./RemainPercentBar"

export default function BillingInfo({ parsedData }: { parsedData: PublicNoteData }) {
  const { t } = useTranslation()
  if (!parsedData || !parsedData.billingDataMod) {
    return null
  }

  const billingData = parsedData.billingDataMod
  const billingPrice = `${formatBillingAmount(billingData.amount, billingData.currency)}/${billingData.cycle}`

  let isNeverExpire = false
  let daysLeftObject = {
    days: 0,
    cycleLabel: "",
    remainingPercentage: 0,
  }

  if (billingData.endDate) {
    if (billingData.endDate.startsWith("0000-00-00")) {
      isNeverExpire = true
    } else {
      try {
        daysLeftObject = getDaysBetweenDatesWithAutoRenewal(billingData)
      } catch (error) {
        console.error(error)
        return (
          <div className={cn("text-[10px] text-muted-foreground text-red-600")}>
            {t("billingInfo.remaining")}: {t("billingInfo.error")}
          </div>
        )
      }
    }
  }

  return daysLeftObject.days >= 0 ? (
    <>
      {billingData.amount && billingData.amount !== "0" && billingData.amount !== "-1" ? (
        <p className={cn("text-[10px] text-muted-foreground ")}>
          {t("billingInfo.price")}: {billingPrice}
        </p>
      ) : billingData.amount === "-1" ? (
        <p className={cn("text-[10px] text-green-600 ")}>{t("billingInfo.free")}</p>
      ) : null}
      <div className={cn("text-[10px] text-muted-foreground")}>
        {t("billingInfo.remaining")}: {isNeverExpire ? t("billingInfo.indefinite") : daysLeftObject.days + " " + t("billingInfo.days")}
      </div>
      {!isNeverExpire && <RemainPercentBar className="mt-0.5" value={daysLeftObject.remainingPercentage * 100} />}
    </>
  ) : (
    <>
      {billingData.amount && billingData.amount !== "0" && billingData.amount !== "-1" ? (
        <p className={cn("text-[10px] text-muted-foreground ")}>
          {t("billingInfo.price")}: {billingPrice}
        </p>
      ) : billingData.amount === "-1" ? (
        <p className={cn("text-[10px] text-green-600 ")}>{t("billingInfo.free")}</p>
      ) : null}
      <p className={cn("text-[10px] text-muted-foreground text-red-600")}>
        {t("billingInfo.expired")}: {daysLeftObject.days * -1} {t("billingInfo.days")}
      </p>
    </>
  )
}
