import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { FormEvent, useState } from "react"

export default function PrivateAccessGate({ siteName, siteDesc }: { siteName: string; siteDesc?: string }) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  const customLogo = ((window as unknown as Record<string, unknown>).CustomLogo as string) || "/favicon.ico"

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const token = password.trim()
    if (!token) {
      setError("请输入访问密码")
      return
    }

    setLoading(true)
    setError("")
    document.cookie = `temp_key=${token}; path=/; max-age=2592000; SameSite=Lax`

    try {
      const res = await fetch("/api/public", { credentials: "include", cache: "no-store" })
      const json = await res.json()
      const data = json?.data || json
      if (res.ok && data?.private_site === false) {
        window.location.reload()
        return
      }

      document.cookie = "temp_key=; path=/; max-age=0; SameSite=Lax"
      setError("访问密码无效或已过期")
    } catch {
      document.cookie = "temp_key=; path=/; max-age=0; SameSite=Lax"
      setError("验证失败，请稍后重试")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-sm space-y-5 rounded-3xl border-neutral-200/70 bg-white/85 p-6 shadow-2xl shadow-black/5 backdrop-blur-xl dark:border-neutral-800/70 dark:bg-neutral-950/80">
        <section className="flex items-center gap-3">
          <img src={customLogo} alt="site logo" className="h-10 w-10 rounded-xl object-cover" />
          <div className="min-w-0">
            <h1 className="truncate text-base font-semibold">{siteName || "Komari"}</h1>
            <p className="truncate text-xs text-muted-foreground">{siteDesc || "Private monitor"}</p>
          </div>
        </section>
        <form className="space-y-3" onSubmit={handleSubmit}>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">访问密码</label>
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="输入临时访问密码"
              autoFocus
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <Button type="submit" className="w-full rounded-full" disabled={loading}>
            {loading ? "验证中..." : "进入监控"}
          </Button>
        </form>
        <a href="/admin" className="block text-center text-xs text-muted-foreground transition-colors hover:text-foreground">
          管理员登录
        </a>
      </Card>
    </div>
  )
}
