## 1. Gutter tokens and utilities

- [x] 1.1 Add `--vkara-page-gutter`, `--vkara-page-gutter-inline-start`, `--vkara-page-gutter-inline-end` to `:root` in `globals.css`
- [x] 1.2 Rewire `px-safe-offset`, `pl-safe-offset`, `pr-safe-offset`, `left-safe-offset`, `right-safe-offset` to use gutter tokens (unify 1rem vs 0.75rem split)
- [x] 1.3 Add alias utilities `px-page-gutter`, `pl-page-gutter`, `pr-page-gutter`, `left-page-gutter`, `right-page-gutter` mapping to the same tokens
- [x] 1.4 Export `PAGE_GUTTER` constant from `remote-chrome.ts` (className + CSS var keys)

## 2. Shell alignment fixes

- [x] 2.1 Remove duplicate `px-safe-offset` from VideoList loading/error footers (parent owns gutter)
- [x] 2.2 Change `VideoListItem` row padding from `p-2` to `py-2` (no horizontal padding inside guttered list)
- [x] 2.3 Refactor `ResultsSearchHeader` to grid layout so back button stays inside gutter box
- [x] 2.4 Verify browse header, list toolbar, NowPlayingBar, MobileBottomNav all use gutter utility only at shell wrapper (no extra horizontal px on inner flex children)

## 3. Floating controls and rails

- [x] 3.1 Confirm `scroll-to-top-list.tsx` and `horizontal-scroll-rail.tsx` use token-backed left/right utilities after phase 1
- [x] 3.2 Audit curated panel / overlay shells (`remote-panel-overlay-shell`, `curated-catalog-section`) for consistent pl/pr gutter on rails

## 4. Overlay consistency (same change)

- [x] 4.1 Migrate `voice-search-overlay.tsx` header/footer from raw `px-3`/`px-5` to page gutter utilities
- [x] 4.2 Spot-check `search-page-overlay` scroll body inherits gutter without double padding

## 5. Verification

- [x] 5.1 Manual QA at 320, 375, 390, 414, 430px: header, list thumb, now-playing thumb, nav icons share left edge
- [x] 5.2 Manual QA on results mode with back button: search field aligns with list
- [x] 5.3 Run existing web unit tests / lint
- [x] 5.4 Optional: add comment block in `globals.css` or `remote-chrome.ts` documenting gutter ownership rules for future contributors
