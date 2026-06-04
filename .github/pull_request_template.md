## Summary
- [ ] What changed and why

## Monorepo Checklist
- [ ] No duplicate contracts outside `packages/validators` / domain packages (`youtube`, `room`)
- [ ] No duplicate infra setup introduced (redis/env/logger factories reused)
- [ ] Shared package boundaries respected (no deep cross-app imports)
- [ ] If shared contracts changed, impacted app call sites were updated

## Verification
- [ ] `bun run test`
- [ ] `bun run typecheck`
- [ ] `bun run lint`
- [ ] `bun run build`
