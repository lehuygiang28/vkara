## Summary
- [ ] What changed and why

## Monorepo Checklist
- [ ] No duplicate contracts introduced outside `packages/shared-types`
- [ ] No duplicate infra setup introduced (redis/env/logger factories reused)
- [ ] Shared package boundaries respected (no deep cross-app imports)
- [ ] If shared contracts changed, impacted app call sites were updated

## Verification
- [ ] `bun run build`
- [ ] `bun run lint:web`
- [ ] `bun run build:api`
