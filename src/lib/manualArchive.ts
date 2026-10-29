/**
 * Archive-member validation for the pinned bitty-manual bundles.
 *
 * The digest in `manual.lock.json` is checked before extraction, but the
 * member list is validated too: a compromised or malformed archive must never
 * be able to write outside its locale tree or introduce a link that `tar`
 * follows. Kept as pure functions so the security-critical rules have tests
 * independent of the download path.
 */

export function assertSafeArchivePath(path: string, locale: string): void {
  const normalized = path.replaceAll("\\", "/");
  const prefix = `${locale}/`;
  if (normalized === "manifest.json") return;
  if (!normalized.startsWith(prefix)) {
    throw new Error(`manual archive contains unexpected path: ${path}`);
  }
  const segments = normalized.slice(prefix.length).split("/");
  if (segments.at(-1) === "") segments.pop();
  if (
    segments.some(
      (segment) => segment === "" || segment === "." || segment === "..",
    )
  ) {
    throw new Error(`manual archive contains unsafe path: ${path}`);
  }
}

export function assertRegularArchiveMember(
  type: string,
  path: string,
  locale: string,
): void {
  if (type !== "-" && type !== "d") {
    throw new Error(
      `manual archive contains unsupported ${type || "unknown"} member for ${locale}: ${path}`,
    );
  }
}
