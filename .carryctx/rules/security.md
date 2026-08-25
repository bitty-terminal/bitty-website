# Security and privacy rules

1. Treat imported content, frontmatter, links, assets, dependencies, preview
   payloads, and contributions as untrusted inputs.
2. Validate before rendering and fail closed on malformed metadata, unsafe URL
   schemes, route collisions, unresolved local links, or unexpected content.
3. Avoid raw HTML, script-capable Markdown, dynamic code execution, and remote
   asset loading unless a reviewed design proves a narrow need and sanitization.
4. Do not expose secrets, private source data, environment variables, tokens,
   or personal information through pages, logs, source maps, previews, analytics,
   or deployment artifacts.
5. Use least-privilege GitHub Actions and deployment credentials. Pull-request
   workflows from untrusted forks receive no write or secret authority.
6. Pin dependencies and actions, review supply-chain changes, and reject install
   scripts or generated executables unless explicitly justified.
7. Security headers, privacy behavior, telemetry, forms, and external services
   require explicit policy and test evidence before release.
8. A security-sensitive change needs threat analysis, negative tests,
   independent privacy/security review, and canonical documentation updates.
