// import { fetchSetting } from "@/lib/nezha-api"
// import { useQuery } from "@tanstack/react-query"
import React from "react"
import { useTranslation } from "react-i18next"

const Footer: React.FC = () => {
  const { t } = useTranslation()
  const isMac = /macintosh|mac os x/i.test(navigator.userAgent)

  // const { data: settingData } = useQuery({
  //   queryKey: ["setting"],
  //   queryFn: () => fetchSetting(),
  //   refetchOnMount: true,
  //   refetchOnWindowFocus: true,
  // })

  return (
    <footer className="mx-auto w-full max-w-5xl px-4 lg:px-0 pb-4 server-footer">
      <section className="flex flex-col">
        <section className="mt-1 flex items-center sm:flex-row flex-col justify-between gap-2 text-[13px] font-light tracking-tight text-neutral-600/50 dark:text-neutral-300/50 server-footer-name">
          <div className="flex items-center gap-1">
            <p>Powered by <a href={"https://github.com/komari-monitor/komari"} target="_blank">Komari Monitor</a></p>
          </div>
          <div className="server-footer-theme flex flex-col items-center sm:items-end">
            <p className="mt-1 text-[13px] font-light tracking-tight text-neutral-600/50 dark:text-neutral-300/50">
              <kbd className="pointer-events-none mx-1 inline-flex h-4 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground opacity-100">
                {isMac ? <span className="text-xs">⌘</span> : "Ctrl "}K
              </kbd>
            </p>
            <section>
              {t("footer.themeBy")}
              <a href={"https://github.com/BITJEBE/nezha-BITJEBE"} target="_blank">
                nezha-BITJEBE
              </a>
            </section>
          </div>
        </section>
      </section>
    </footer>
  )
}

export default Footer
