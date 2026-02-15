import type { SVGProps } from "react"

export function GetFontLogoClass(platform: string): string {
  const p = (platform || "").toLowerCase().trim()

  // 已是标准化的 logo 名称直接返回
  const known = new Set([
    "almalinux",
    "alpine",
    "aosc",
    "apple",
    "archlinux",
    "archlabs",
    "artix",
    "budgie",
    "centos",
    "coreos",
    "debian",
    "deepin",
    "devuan",
    "docker",
    "elementary",
    "fedora",
    "ferris",
    "flathub",
    "freebsd",
    "gentoo",
    "gnu-guix",
    "illumos",
    "kali-linux",
    "linuxmint",
    "mageia",
    "mandriva",
    "manjaro",
    "nixos",
    "openbsd",
    "opensuse",
    "pop-os",
    "raspberry-pi",
    "redhat",
    "rocky-linux",
    "sabayon",
    "slackware",
    "snappy",
    "solus",
    "tux",
    "ubuntu",
    "void",
    "zorin",
  ])
  if (known.has(p)) return p

  if (p === "darwin" || p.includes("mac os") || p.includes("macos") || p.includes("apple")) return "apple"
  if (p.includes("openwrt") || p.includes("immortalwrt")) return "tux"
  if (p === "amazon" || p.includes("amazon linux")) return "redhat"
  if (p === "arch" || p.includes("arch linux") || p.includes("archlinux")) return "archlinux"
  if (p.includes("opensuse") || p.includes("suse")) return "opensuse"
  if (p.includes("debian")) return "debian"
  if (p.includes("ubuntu")) return "ubuntu"
  if (p.includes("alpine")) return "alpine"
  if (p.includes("centos")) return "centos"
  if (p.includes("rocky")) return "rocky-linux"
  if (p.includes("rhel") || p.includes("red hat")) return "redhat"
  if (p.includes("fedora")) return "fedora"
  if (p.includes("manjaro")) return "manjaro"
  if (p.includes("kali")) return "kali-linux"
  if (p.includes("mint")) return "linuxmint"
  if (p.includes("nixos")) return "nixos"
  if (p.includes("raspbian") || p.includes("raspberry")) return "raspberry-pi"
  if (p.includes("freebsd")) return "freebsd"
  if (p.includes("openbsd")) return "openbsd"
  if (p.includes("gentoo")) return "gentoo"
  if (p.includes("deepin")) return "deepin"
  if (p.includes("elementary")) return "elementary"
  if (p.includes("void")) return "void"
  if (p.includes("zorin")) return "zorin"

  if (p.includes("linux")) return "tux"
  return "tux"
}

export function GetOsName(platform: string): string {
  const p = (platform || "").toLowerCase().trim()
  const proper = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

  const direct = new Set([
    "almalinux",
    "alpine",
    "aosc",
    "apple",
    "archlinux",
    "archlabs",
    "artix",
    "budgie",
    "centos",
    "coreos",
    "debian",
    "deepin",
    "devuan",
    "docker",
    "fedora",
    "ferris",
    "flathub",
    "freebsd",
    "gentoo",
    "gnu-guix",
    "illumos",
    "linuxmint",
    "mageia",
    "mandriva",
    "manjaro",
    "nixos",
    "openbsd",
    "opensuse",
    "pop-os",
    "redhat",
    "sabayon",
    "slackware",
    "snappy",
    "solus",
    "tux",
    "ubuntu",
    "void",
    "zorin",
  ])
  if (direct.has(p)) return proper(p)

  if (p === "darwin" || p.includes("mac os") || p.includes("macos") || p.includes("apple")) return "macOS"
  if (p.includes("windows") || p.startsWith("win")) return "Windows"
  if (p === "amazon" || p.includes("amazon linux") || p.includes("rhel") || p.includes("red hat")) return "Redhat"
  if (p === "arch" || p.includes("arch linux") || p.includes("archlinux")) return "Archlinux"
  if (p.includes("opensuse") || p.includes("suse")) return "Opensuse"
  if (p.includes("debian")) return "Debian"
  if (p.includes("ubuntu")) return "Ubuntu"
  if (p.includes("alpine")) return "Alpine"
  if (p.includes("centos")) return "Centos"
  if (p.includes("rocky")) return "Rocky Linux"
  if (p.includes("fedora")) return "Fedora"
  if (p.includes("manjaro")) return "Manjaro"
  if (p.includes("kali")) return "Kali Linux"
  if (p.includes("mint")) return "Linux Mint"
  if (p.includes("nixos")) return "NixOS"
  if (p.includes("raspbian") || p.includes("raspberry")) return "Raspberry Pi OS"
  if (p.includes("freebsd")) return "FreeBSD"
  if (p.includes("openbsd")) return "OpenBSD"
  if (p.includes("gentoo")) return "Gentoo"
  if (p.includes("deepin")) return "Deepin"
  if (p.includes("elementary")) return "elementaryOS"
  if (p.includes("void")) return "Void"
  if (p.includes("zorin")) return "Zorin"

  // 最后再兜底到 Linux（包含 "linux" 或通用类）
  if (p.includes("openwrt") || p.includes("immortalwrt") || p.includes("linux")) return "Linux"

  return "Linux"
}

export function MageMicrosoftWindows(props: SVGProps<SVGSVGElement>) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" {...props}>
      <path
        fill="currentColor"
        d="M2.75 7.189V2.865c0-.102 0-.115.115-.115h8.622c.128 0 .14 0 .14.128V11.5c0 .128 0 .128-.14.128H2.865c-.102 0-.115 0-.115-.116zM7.189 21.25H2.865c-.102 0-.115 0-.115-.116V12.59c0-.128 0-.128.128-.128h8.635c.102 0 .115 0 .115.115v8.57c0 .09 0 .103-.116.103zM21.25 7.189v4.31c0 .116 0 .116-.116.116h-8.557c-.102 0-.128 0-.128-.115V2.865c0-.09 0-.102.115-.102h8.48c.206 0 .206 0 .206.205zm-8.763 9.661v-4.273c0-.09 0-.115.103-.09h8.621c.026 0 0 .09 0 .142v8.518a.06.06 0 0 1-.017.06a.06.06 0 0 1-.06.017H12.54s-.09 0-.077-.09V16.85z"
      ></path>
    </svg>
  )
}
