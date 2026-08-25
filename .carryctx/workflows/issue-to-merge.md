# Issue-to-merge workflow

## 1. Define the work

1. Create or confirm a GitHub Issue with outcome, acceptance criteria, risk,
   repository impact, documentation impact, and explicit exclusions.
2. Create a CarryCtx task linked to the Issue. Assign its team, required role,
   owner, dependencies, and exact file scopes.
3. Check team context and scope conflicts before dispatch.

## 2. Prepare execution

1. Start a named session bound to the task and adopt the assigned persona.
2. Read AGENTS, relevant rules, canonical `bitty-docs` contracts, and prior
   decisions before editing.
3. After the first repository commit, create an isolated CarryCtx worktree and
   task branch. Record the branch and worktree in the task handoff.
4. If the repository is unborn, remain in the shared checkout. Work only in an
   explicit non-overlapping initialization scope; branch, commit, and pull
   request stages begin only after the initial commit exists and is authorized.

## 3. Implement and verify

1. Keep changes inside scope and record progress, decisions, risks, and blockers
   as they arise.
2. Preserve the canonical content boundary. Coordinate any public behavior,
   schema, route, redirect, or compatibility change with `bitty-docs`.
3. Run local checks equivalent to CI: formatting, content metadata, language,
   links, accessibility, build, security, and hygiene as applicable.
4. Checkpoint at a meaningful boundary with changed files, exact evidence,
   residual risks, and remaining cross-repository work.

## 4. Commit and request review

1. When explicitly authorized, create focused commits on the task branch and
   reference the Issue and CarryCtx task.
2. Open a pull request describing scope, contract changes, evidence, risks,
   documentation synchronization, dependencies, and merge ordering.
3. Move the CarryCtx task to review and end the implementer session cleanly.
4. A separate reviewer inspects the diff, reruns relevant checks, records
   findings, and confirms CI. The implementer cannot self-approve.

## 5. Merge and close

1. Resolve review findings and ensure dependent or cross-repository pull
   requests are ready in the recorded order.
2. Merge only with required approval, passing CI, synchronized canonical docs,
   and explicit merge authority.
3. Record the merged revision, deployment or publication evidence if applicable,
   and a final CarryCtx checkpoint.
4. Complete the CarryCtx task and close the GitHub Issue only after documentation,
   redirects, release notes, and follow-up ownership are current.
