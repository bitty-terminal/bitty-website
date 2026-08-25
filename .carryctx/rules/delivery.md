# Delivery rules

1. Begin with a GitHub Issue that states the outcome, acceptance criteria,
   risks, affected repositories, and documentation impact.
2. Represent the work as a CarryCtx task with a team, required role,
   dependencies, explicit scopes, and a named owner.
3. Bind a named session before editing and record progress, blockers, risks,
   decisions, handoffs, and checkpoints durably.
4. After the first commit, create an isolated task worktree and branch. Do not
   share a checkout for parallel implementation.
5. In an unborn repository, initialization may use the shared checkout only
   when scopes are non-overlapping and local CI-equivalent checks are available.
6. Commits are focused and traceable to the Issue and task. Pull requests name
   verification evidence, documentation effects, dependencies, and ordering.
7. A separate reviewer verifies the diff and CI before merge. Implementers stop
   at review and never self-accept.
8. Merge only after required cross-repository changes are ready in the correct
   order. Then synchronize docs, record the merged revision and checkpoint,
   complete the task, and close the Issue.
9. Never commit, push, merge, publish, or deploy without explicit task authority.
