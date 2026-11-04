#!/usr/bin/env bun

/**
 * Verify the install channels advertised on the home page.
 *
 * The page must never claim a channel that is not published. This script is
 * the evidence gate for that claim: it resolves the current release pointer
 * and checks every artifact, repository, and manifest the page names, plus the
 * two channels that are still pending (which must stay unavailable).
 *
 * Run it before a release or whenever the install section changes:
 *
 *   just check-channels
 *
 * Network access is required, so it is not part of `just check`.
 */

const CDN = "https://cdn.bitty.run";
const TIMEOUT_MS = 20_000;
const GITHUB_API = "https://api.github.com";
const AUR_RPC = "https://aur.archlinux.org/rpc/v5/info";

const token = process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN;
const results = [];

function record(channel, detail, ok, kind = "required") {
  results.push({ channel, detail, ok, kind });
}

/** Compare the parsed origin so a crafted path cannot borrow the API token. */
function isGitHubApi(url) {
  try {
    return new URL(url).origin === GITHUB_API;
  } catch {
    return false;
  }
}

async function request(url, { method = "HEAD" } = {}) {
  const headers = { "user-agent": "bitty-website-channel-check" };
  if (token && isGitHubApi(url)) {
    headers.authorization = `Bearer ${token}`;
  }
  try {
    return await fetch(url, {
      method,
      headers,
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
  } catch (error) {
    return { ok: false, status: 0, error, text: async () => "" };
  }
}

/** HEAD with a ranged GET fallback for endpoints that reject HEAD. */
async function statusOf(url) {
  let response = await request(url);
  if (response.status === 405 || response.status === 403) {
    response = await request(url, { method: "GET" });
  }
  return response;
}

async function expectOk(channel, url) {
  const response = await statusOf(url);
  record(channel, url, response.status === 200);
  return response;
}

async function expectMissing(channel, url) {
  const response = await statusOf(url);
  const gone = response.status === 404 || response.status === 410;
  // A 200 means the channel shipped and the page must be updated; any other
  // status (403, 429, 5xx, network error) means the check could not verify it.
  const kind = response.status === 200 ? "unexpected" : "required";
  record(channel, `${url} (must stay unpublished)`, gone, kind);
  return response;
}

async function text(url) {
  const response = await request(url, { method: "GET" });
  return response.status === 200 ? response.text() : "";
}

const pointer = await text(`${CDN}/install/latest.txt`);
const tag = pointer.trim();
const version = tag.replace(/^v/u, "");
if (!/^v\d+\.\d+\.\d+$/u.test(tag)) {
  record("release pointer", `${CDN}/install/latest.txt -> "${tag}"`, false);
  report();
}

record("release pointer", `${tag}`, true);

await expectOk("Linux / macOS installer", `${CDN}/install/install.sh`);
await expectOk("Windows installer", `${CDN}/install/install.ps1`);

for (const asset of [
  "apt/setup.sh",
  "apt/bitty.sources",
  "apt/bitty-archive-keyring.gpg",
  "apt/dists/stable/Release",
]) {
  await expectOk("Debian / Ubuntu (APT)", `${CDN}/${asset}`);
}

for (const chroot of [
  "fedora-43",
  "epel-10",
  "amazonlinux-2023",
  "openeuler-24.03",
]) {
  await expectOk(
    "Fedora / RHEL (Copr)",
    `https://copr.fedorainfracloud.org/coprs/xuepoo/bitty-terminal/repo/${chroot}/xuepoo-bitty-terminal.repo`,
  );
}

const coprBuilds = await request(
  "https://copr.fedorainfracloud.org/api_3/build/list?ownername=xuepoo&projectname=bitty-terminal&limit=1",
  { method: "GET" },
);
if (coprBuilds.status === 200) {
  const latest = (await coprBuilds.json())?.items?.[0];
  record(
    "Fedora / RHEL (Copr)",
    `latest build ${latest?.source_package?.version ?? "unknown"}`,
    latest?.state === "succeeded" &&
      latest?.source_package?.version?.startsWith(`${version}-`) === true,
  );
} else {
  record("Fedora / RHEL (Copr)", "build list unreadable", false);
}

for (const arch of ["amd64", "arm64"]) {
  const packages = await text(
    `${CDN}/apt/dists/stable/main/binary-${arch}/Packages`,
  );
  const published = packages.match(/^Version:\s*(\S+)/mu)?.[1];
  record(
    "Debian / Ubuntu (APT)",
    `Packages ${arch} ${published ?? "unreadable"}`,
    published === version,
  );
}

const aur = await request(`${AUR_RPC}?arg[]=bitty&arg[]=bitty-bin`, {
  method: "GET",
});
if (aur.status === 200) {
  const payload = await aur.json();
  const packages = payload?.results ?? [];
  for (const name of ["bitty", "bitty-bin"]) {
    const found = packages.find((entry) => entry.Name === name);
    record(
      "Arch Linux (AUR)",
      `${name} ${found?.Version ?? "missing"}`,
      found?.Version?.startsWith(`${version}-`) === true,
    );
  }
} else {
  record("Arch Linux (AUR)", `${AUR_RPC} (${aur.status})`, false);
}

const formula = await text(
  "https://raw.githubusercontent.com/bitty-terminal/homebrew-tap/main/Formula/bitty.rb",
);
record(
  "macOS (Homebrew)",
  `formula ${version}`,
  formula.includes(`version "${version}"`) &&
    formula.includes(`${CDN}/releases/${tag}/`),
);

const scoopText = await text(
  "https://raw.githubusercontent.com/bitty-terminal/scoop-bucket/main/bucket/bitty.json",
);
let scoop = null;
try {
  scoop = JSON.parse(scoopText);
} catch {
  scoop = null;
}
record(
  "Windows (Scoop)",
  `manifest ${scoop?.version ?? "unreadable"}`,
  scoop?.version === version && scoopText.includes(`${CDN}/releases/${tag}/`),
);

await expectOk(
  "Nix / NixOS",
  "https://raw.githubusercontent.com/bitty-terminal/bitty/main/flake.nix",
);
await expectOk("Nix / NixOS", "https://bitty.cachix.org/nix-cache-info");

const extensionCatalog = await text(`${CDN}/extensions/catalog.v1`);
record(
  "Extension catalog",
  "extensions/catalog.v1 lists graphics and net",
  extensionCatalog.includes("extension graphics") &&
    extensionCatalog.includes("extension net"),
);

const archPackage = `bitty-${version}-1-x86_64.pkg.tar.zst`;
for (const asset of [
  `bitty-${version}-x86_64-unknown-linux-gnu.tar.zst`,
  `bitty-${version}-aarch64-unknown-linux-gnu.tar.zst`,
  `bitty-${version}-x86_64-unknown-linux-musl.tar.zst`,
  `bitty-x86_64-unknown-linux-gnu.deb`,
  `bitty-aarch64-unknown-linux-gnu.deb`,
  `bitty-x86_64-unknown-linux-gnu.rpm`,
  `bitty-aarch64-unknown-linux-gnu.rpm`,
  `bitty-x86_64-unknown-linux-musl.apk`,
  `bitty-x86_64-unknown-linux-gnu.AppImage`,
  `bitty-aarch64-unknown-linux-gnu.AppImage`,
  archPackage,
  `bitty-${version}-windows-x86_64.zip`,
  `Bitty-${version}-universal.dmg`,
  "SHA256SUMS",
]) {
  await expectOk("Release artifacts", `${CDN}/releases/${tag}/${asset}`);
}

await expectMissing(
  "Windows (winget)",
  `${GITHUB_API}/repos/microsoft/winget-pkgs/contents/manifests/b/BittyTerminal/Bitty`,
);
await expectMissing(
  "openSUSE / SLES",
  "https://download.opensuse.org/repositories/home:/xuepoo:/bitty/",
);

report();

function report() {
  const width = Math.max(...results.map((entry) => entry.channel.length));
  let failed = 0;
  let unexpected = 0;
  for (const entry of results) {
    const mark = entry.ok
      ? "ok  "
      : entry.kind === "unexpected"
        ? "warn"
        : "FAIL";
    if (!entry.ok && entry.kind === "unexpected") unexpected += 1;
    if (!entry.ok && entry.kind !== "unexpected") failed += 1;
    console.log(
      `${mark.padEnd(5)} ${entry.channel.padEnd(width)}  ${entry.detail}`,
    );
  }
  console.log(
    `\n${results.length - failed - unexpected}/${results.length} checks passed for ${tag}.`,
  );
  if (unexpected > 0) {
    console.log(
      "A pending channel is now reachable; update src/data/installChannels.ts before publishing.",
    );
  }
  if (failed > 0) {
    console.error(`${failed} install channel check(s) failed.`);
    process.exit(1);
  }
  process.exit(unexpected > 0 ? 2 : 0);
}
