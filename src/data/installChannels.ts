/**
 * Install channels published for Bitty.
 *
 * Every `available` entry below is backed by a live channel that was verified
 * on 2026-11-04 for v0.0.31 (see `scripts/check-install-channels.mjs`). A
 * channel moves here only after its artifacts are published; a planned channel
 * stays `pending` with the reason it is not usable yet. Commands are copied
 * verbatim from the packaging documentation in `bitty-terminal/bitty` and must
 * remain copy-pasteable.
 */

export type Locale = "en" | "zh-CN";
export type Localized = Record<Locale, string>;
export type InstallStatus = "available" | "pending";

export type InstallCommand = {
  /** Optional label when a channel offers more than one path. */
  label?: Localized;
  code: string;
};

export type InstallChannel = {
  id: string;
  name: Localized;
  /** Architecture coverage rendered verbatim, e.g. "x86_64 · arm64". */
  arch: string;
  summary: Localized;
  status: InstallStatus;
  commands: InstallCommand[];
  /** Present only for pending channels. */
  pendingReason?: Localized;
};

/** Version-independent release pointer used by artifact downloads. */
export const RELEASE_POINTER = "https://cdn.bitty.run/install/latest.txt";

/** Commands for the three primary paths shown as cards. */
export const primaryChannels: InstallChannel[] = [
  {
    id: "unix-installer",
    name: { en: "Linux / macOS", "zh-CN": "Linux / macOS" },
    arch: "x86_64 · aarch64",
    summary: {
      en: "User-local installer; resolves the latest tag and verifies every checksum.",
      "zh-CN": "用户级安装脚本，解析最新版本并校验所有下载的 SHA-256。",
    },
    status: "available",
    commands: [
      { code: "curl -fsSL https://cdn.bitty.run/install/install.sh | bash" },
    ],
  },
  {
    id: "windows-installer",
    name: { en: "Windows", "zh-CN": "Windows" },
    arch: "x64 · arm64",
    summary: {
      en: "PowerShell installer for the current user; no administrator rights required.",
      "zh-CN": "为当前用户安装的 PowerShell 脚本，无需管理员权限。",
    },
    status: "available",
    commands: [{ code: "irm https://cdn.bitty.run/install/install.ps1 | iex" }],
  },
  {
    id: "source",
    name: { en: "Build from source", "zh-CN": "从源码构建" },
    arch: "Rust 1.98.1",
    summary: {
      en: "Install the binary crate with the toolchain pinned by the repository.",
      "zh-CN": "使用仓库固定的 Rust 工具链直接安装二进制 crate。",
    },
    status: "available",
    commands: [
      {
        code: "cargo +1.98.1 install --git https://github.com/bitty-terminal/bitty.git bitty-terminal --locked",
      },
    ],
  },
];

/** Package-manager channels that are published and install-smoked today. */
export const packageChannels: InstallChannel[] = [
  {
    id: "apt",
    name: { en: "Debian / Ubuntu", "zh-CN": "Debian / Ubuntu" },
    arch: "amd64 · arm64",
    summary: {
      en: "GPG-signed APT repository served from Cloudflare R2.",
      "zh-CN": "由 Cloudflare R2 提供的 GPG 签名 APT 仓库。",
    },
    status: "available",
    commands: [
      {
        label: { en: "One-line setup", "zh-CN": "一键配置" },
        code: "curl -fsSL https://cdn.bitty.run/apt/setup.sh | sudo bash\nsudo apt install -y bitty",
      },
      {
        label: { en: "Manual deb822 source", "zh-CN": "手动 deb822 源" },
        code: "sudo install -d -m 0755 /etc/apt/keyrings\nsudo curl -fsSL https://cdn.bitty.run/apt/bitty-archive-keyring.gpg -o /etc/apt/keyrings/bitty-archive-keyring.gpg\nsudo curl -fsSL https://cdn.bitty.run/apt/bitty.sources -o /etc/apt/sources.list.d/bitty.sources\nsudo apt update\nsudo apt install -y bitty",
      },
    ],
  },
  {
    id: "copr",
    name: { en: "Fedora / RHEL", "zh-CN": "Fedora / RHEL" },
    arch: "x86_64 · aarch64",
    summary: {
      en: "Copr builds for Fedora, EPEL, Amazon Linux 2023, and openEuler 24.03.",
      "zh-CN":
        "Copr 为 Fedora、EPEL、Amazon Linux 2023 与 openEuler 24.03 构建。",
    },
    status: "available",
    commands: [
      {
        label: { en: "Fedora", "zh-CN": "Fedora" },
        code: "sudo dnf copr enable -y xuepoo/bitty-terminal\nsudo dnf install -y bitty",
      },
      {
        label: { en: "RHEL / CentOS Stream", "zh-CN": "RHEL / CentOS Stream" },
        code: "sudo dnf install -y epel-release dnf-plugins-core\nsudo dnf copr enable -y xuepoo/bitty-terminal\nsudo dnf install -y bitty",
      },
    ],
  },
  {
    id: "aur",
    name: { en: "Arch Linux", "zh-CN": "Arch Linux" },
    arch: "x86_64",
    summary: {
      en: "AUR recipes; yay accepts the same package names. Install one, not both.",
      "zh-CN": "AUR 配方；yay 也可使用相同的包名。两者只装其一。",
    },
    status: "available",
    commands: [
      {
        label: { en: "Prebuilt (recommended)", "zh-CN": "预构建（推荐）" },
        code: "paru -S bitty-bin",
      },
      {
        label: { en: "Build locally", "zh-CN": "本地构建" },
        code: "paru -S bitty",
      },
    ],
  },
  {
    id: "alpine",
    name: { en: "Alpine Linux", "zh-CN": "Alpine Linux" },
    arch: "x86_64 (musl)",
    summary: {
      en: "musl apk published with each release; unsigned, so apk needs the explicit flag.",
      "zh-CN": "每次发布附带 musl apk；未签名，因此 apk 需要显式允许。",
    },
    status: "available",
    commands: [
      {
        label: { en: "Install the release apk", "zh-CN": "安装发布版 apk" },
        code: 'TAG=$(curl -fsSL https://cdn.bitty.run/install/latest.txt)\ncurl -fsSLO "https://cdn.bitty.run/releases/$TAG/bitty-x86_64-unknown-linux-musl.apk"\nsudo apk add --allow-untrusted "./bitty-x86_64-unknown-linux-musl.apk"',
      },
    ],
  },
  {
    id: "nix",
    name: { en: "Nix / NixOS", "zh-CN": "Nix / NixOS" },
    arch: "x86_64 · aarch64",
    summary: {
      en: "Flake with a binary cache at bitty.cachix.org.",
      "zh-CN": "Flake 构建，二进制缓存位于 bitty.cachix.org。",
    },
    status: "available",
    commands: [
      {
        label: { en: "Run without installing", "zh-CN": "免安装运行" },
        code: "nix run github:bitty-terminal/bitty",
      },
      {
        label: { en: "Install into the profile", "zh-CN": "安装到 profile" },
        code: "nix profile install github:bitty-terminal/bitty",
      },
    ],
  },
  {
    id: "homebrew",
    name: { en: "macOS (Homebrew)", "zh-CN": "macOS（Homebrew）" },
    arch: "Intel · Apple silicon",
    summary: {
      en: "Official tap. Current Homebrew requires trusting a third-party tap first.",
      "zh-CN": "官方 tap；新版 Homebrew 需要先信任第三方 tap。",
    },
    status: "available",
    commands: [
      {
        code: "brew tap bitty-terminal/homebrew-tap\nbrew trust bitty-terminal/homebrew-tap\nbrew install bitty",
      },
    ],
  },
  {
    id: "scoop",
    name: { en: "Windows (Scoop)", "zh-CN": "Windows（Scoop）" },
    arch: "x64 · arm64",
    summary: {
      en: "Official bucket; ships the bare executable and skips the unsigned setup dialog.",
      "zh-CN": "官方 bucket，直接安装可执行文件，避开未签名安装器的提示。",
    },
    status: "available",
    commands: [
      {
        code: "scoop bucket add bitty https://github.com/bitty-terminal/scoop-bucket\nscoop install bitty",
      },
    ],
  },
  {
    id: "appimage",
    name: { en: "Any Linux (AppImage)", "zh-CN": "任意 Linux（AppImage）" },
    arch: "x86_64 · aarch64",
    summary: {
      en: "Portable single file; no package manager and no root. Swap x86_64 for aarch64 on ARM.",
      "zh-CN":
        "便携单文件，无需包管理器与 root。ARM 设备将 x86_64 换成 aarch64。",
    },
    status: "available",
    commands: [
      {
        code: 'TAG=$(curl -fsSL https://cdn.bitty.run/install/latest.txt)\ncurl -fsSLO "https://cdn.bitty.run/releases/$TAG/bitty-x86_64-unknown-linux-gnu.AppImage"\nchmod +x bitty-x86_64-unknown-linux-gnu.AppImage\n./bitty-x86_64-unknown-linux-gnu.AppImage',
      },
    ],
  },
];

/** Channels that are not published and must not look installable. */
export const pendingChannels: InstallChannel[] = [
  {
    id: "winget",
    name: { en: "Windows (winget)", "zh-CN": "Windows（winget）" },
    arch: "x64 · arm64",
    summary: {
      en: "Manifest not merged into microsoft/winget-pkgs yet.",
      "zh-CN": "清单尚未合并到 microsoft/winget-pkgs。",
    },
    status: "pending",
    commands: [],
    pendingReason: {
      en: "Use the PowerShell installer or Scoop until the manifest is published.",
      "zh-CN": "清单发布前请使用 PowerShell 安装脚本或 Scoop。",
    },
  },
  {
    id: "opensuse",
    name: { en: "openSUSE / SLES", "zh-CN": "openSUSE / SLES" },
    arch: "x86_64",
    summary: {
      en: "No OBS repository is published; the standalone RPM is not a zypper channel.",
      "zh-CN": "尚未发布 OBS 仓库；独立 RPM 不构成 zypper 渠道。",
    },
    status: "pending",
    commands: [],
    pendingReason: {
      en: "Install the release RPM manually or build from source.",
      "zh-CN": "请手动安装发布版 RPM 或从源码构建。",
    },
  },
];
