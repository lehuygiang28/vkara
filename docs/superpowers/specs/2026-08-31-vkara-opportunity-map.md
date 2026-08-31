# vkara opportunity map

Date: 2026-08-31
Status: exploration (not an implementation spec)
Scope: what this repo already is, what is unfinished, and what is worth building next

This is a thinking artifact from `/opsx-explore` + brainstorming. It does not authorize implementation. Pick one thread, then create an OpenSpec change.

---

## North star (already written, still unfinished)

The product sentence is stable:

> Open vkara on a TV. Everyone else uses their phone as the remote. No account, no install. YouTube plays the song.

The author already named the real remaining problems in the 2025 Finish-Up-A-Thon write-up:

> who is allowed to skip, who added this song, whose turn is next, how to stop one person from filling the whole queue, how to rejoin quickly when someone closes their phone, and how to bring back the same queue for the next karaoke night.

> Not “AI lyrics” or some huge feature that sounds cool in a roadmap. VKara should make the room feel calm.

Recent `main` work has been going the other direction: agents, MCP, URL commands, TikTok experiments, Tizen/Android shells, Sentry, Chrome 76. Those are real, but they are **platform**. The party-night gaps above are still open in code.

```
                         WHAT VKARA IS TODAY
  ─────────────────────────────────────────────────────────────

  Phone remotes          TV / laptop player         YouTube
  ┌──────────────┐       ┌──────────────────┐       ┌─────────┐
  │ search       │       │ iframe + QR      │       │ catalog │
  │ queue add    │──────▶│ captions         │──────▶│ embed   │
  │ skip/pause   │  WS   │ next-up (thin)   │       │ related │
  │ anyone can   │ Redis │                  │       └─────────┘
  │ skip/shuffle │       └──────────────────┘
  └──────────────┘
         │
         ▼  missing for a karaoke night
  ┌──────────────────────────────────────────────────────────┐
  │  who queued this  ·  whose turn  ·  fair queue           │
  │  skip policy      ·  session recap ·  “same room Friday” │
  └──────────────────────────────────────────────────────────┘
```

---

## What is already shipped (do not rebuild)

Inventory from `packages/room`, `packages/validators`, `apps/web`, OpenSpec specs, and recent git history.

| Area | What exists |
|------|-------------|
| Join | 4-digit room, QR, optional password, joinToken, rejoin secret, room lock |
| Roles | host / member, co-host promote/demote, kick, claimHost, agent flag |
| Queue | add, play now, play next, move to top, shuffle, clear, history, playlist import |
| Search | YouTube + karaoke title prefix, suggestions, voice (Web Speech + optional Whisper) |
| Discovery | curated playlist catalog (vi/en), playlist preview, local personalization ranking |
| Player | volume, seek, captions tracks, skip unplayable embeds, playback sync |
| TV | `/tv` route, Chrome 76 downlevel, Tizen WGT + TizenBrew, Android TV Expo shell |
| Agents | URL commands, HTTP room control, MCP, `llms.txt`, copy-invite in settings |
| Experiments | TikTok search/embed behind `VKARA_EXPERIMENTS` |
| Ops | Redis rooms, Docker AIO, Sentry, embed playability cache |

Host-only today (`requireHost` in `apps/api/src/modules/room/room-service.ts`): lock/unlock, kick, promote/demote, mint join token, close room.

**Not host-only:** skip (`nextVideo`), play now, pause, volume, shuffle, clear queue, add video. Any member can cut the current singer. That is the largest product hole relative to the north star.

Video schema (`packages/validators/src/youtube/video.ts`) has no `queuedBy` / `addedBy`. Queue items are anonymous songs.

`sendMessage` is on the WS contract and broadcasts `{ type: 'message' }` — there is no chat UI. Dead protocol surface.

Karaoke filter defaults to **off** (`searchStore.isKaraoke: false`) even though Vietnamese SEO and browse copy are karaoke-first.

PWA was removed on purpose (`ServiceWorkerCleanup` unregisters legacy workers).

---

## In-flight / leftover work (cheap, already scoped)

Do these only if they are blocking a party night. They are not new ideas.

1. **Open PR #3 — real-time scoring** (`feat: add karaoke real-time scoring system`, last update 2026-07-16). YIN pitch on the phone, coverage/stability/variety, confetti overlay. Sourcery/Gemini reviews are still open (AudioWorklet vs deprecated `ScriptProcessorNode`, scorer-role persistence, hot-path re-renders). This is *fun*, not *calm-room*. Scoring has no reference melody (YouTube ToS: you cannot decode the embed audio), so it is a party toy, not a karaoke machine score.
2. **Android TV OpenSpec** `android-tv-shell-sideload` — tasks 0–6.3 done; **6.4 device smoke still unchecked**. Archive after smoke, or drop the change if smoke is accepted elsewhere.
3. **Playlist import phase-2 TODOs** in `prepare-youtube-videos.ts` / `fetch-playlist-*` / `room-service.ts`: playlist rows lack views/verified until a follow-up that needs rate-limit research.
4. **Sentry non-goals left explicit** in `fix-sentry-first-party-crashes`: Zalo in-app inject (`WEB-8`/`WEB-9`), YouTube iframe SOP on Tizen (`WEB-A`), anonymous `videoElement.paused` (`WEB-7`), reconnect-banner UX. Zalo matters in Vietnam; the others are TV-runtime tax.
5. **Stale docs**: `docs/monorepo-duplication-inventory.md` still talks about deleted `shared-types` / `shared-infra`. `openspec/specs/platform-feature-flags` Purpose is still `TBD`.

---

## Opportunity clusters

Ranked by “does this make a real karaoke night calmer?” then by fit with no-account / YouTube-embed / self-host constraints.

### A. Calm the room (recommended next product work)

The job is a living-room party, not a video site. Singa Party Mode is the commercial analogue (QR + shared queue + host as DJ). vkara already has the QR/queue shape; it is missing the social rules.

| Idea | Why it is real | Fit | Size |
|------|----------------|-----|------|
| **A1. Queue attribution** | “Who added this?” — author named it; schema has no owner | Additive field on queue items + phone/TV list chrome | S–M |
| **A2. Skip / play-now / shuffle policy** | Anyone can skip today | Host-only, or vote-to-skip, or “singer + host” | M |
| **A3. Fair queue / round-robin** | One person dumping 12 songs is the classic party failure | Interleave by `queuedBy` when adding, optional host toggle | M |
| **A4. Now / next on TV** | Big title, requester name, “up next” so people stop crowding the phone | TV overlay; data from A1 | S after A1 |
| **A5. Your-turn ping** | Phone vibrates / banner when your song is next or playing | Needs A1 | S |
| **A6. Session snapshot** | “Same queue Friday” — persist a named night locally or in Redis with a revive code | Local-first keeps no-account; Redis revive needs TTL/privacy thought | M |

Recommended slice if we only do one change: **A1 + A2 + A4** as one OpenSpec (“karaoke night ownership”). A3 can follow. Do not bundle scoring or TikTok.

### B. Find the right karaoke video faster

vkara is only as good as the YouTube result list. Karaoke mode is a query prefix (`karaoke ${query}`), plus a small title boost in `@vkara/personalization`. That is weak for Vietnamese (“beat”, “karaoke lời”, “instrumental”, channel names).

| Idea | Notes |
|------|--------|
| **B1. Karaoke filter default on for `vi`** | One-line product decision; persist still wins after first toggle |
| **B2. Stronger karaoke ranking** | Expand `KARAOKE_TITLE_PATTERN`; optional operator channel allow-list in curated catalog |
| **B3. Curated catalog freshness** | Spec ships 3 karaoke + 1 music playlist IDs. Treat catalog as a living editorial file, not a one-time JSON |
| **B4. Artist / “hát gìtonight” rails** | Browse idle already has curated + personalization. Next step is named artists (Sơn Tùng, Mỹ Tâm…) without a backend catalog service — still JSON |
| **B5. Playlist metadata phase-2** | Views/verified on import — already TODO’d; only if lists look broken in real use |

B1 is the smallest high-leverage tweak. B2–B4 are editorial + ranking, not new infrastructure.

### C. Vietnam distribution (where nights actually start)

vkara.dev.to and README assume Chrome/Edge on TV + camera QR. Real nights in VN often start in **Zalo**.

| Idea | Notes |
|------|--------|
| **C1. Zalo in-app browser** | Sentry `WEB-8`/`WEB-9` already known. If guests tap a Zalo link and white-screen, the night dies before QR |
| **C2. Share-to-Zalo / copy room as text** | Room code is 4 digits — a `Phòng 4821` text card may beat QR in a group chat |
| **C3. First-host onboarding** | One screen: “mở cái này trên TV, điện thoại quét QR”. Current lobby is fine for people who already know |
| **C4. LG webOS shell** | Tizen + Android TV exist; LG is the other living-room box. Same thin-WebView pattern. Do **not** start this until `/tv` is boringly solid |

C1 is reliability, not a feature. Worth a spike if Sentry volume is real.

### D. Scoring and “karaoke machine” fantasy (tempting, constrained)

PR #3 and classic Arirang/VietKTV muscle memory: score, key change, vocal reduce, numbered catalog.

| Idea | Verdict |
|------|---------|
| Phone scoring (PR #3) | Shippable as experiment; no pitch-vs-melody truth; keep off TV until it is delightful |
| Score on the big screen | Party moment; wait until phone path is trusted |
| Key change / tempo / vocal cancel | **Do not.** YouTube iframe; ToS; no independent audio pipeline |
| Licensed catalog / numbered songs | Different product, different legal surface. Out of scope while MIT + YouTube embed is the deal |
| Duet / two mics | Needs scoring + identity; later |

If energy goes here, finish PR #3 as a **device experiment**, gated, one scorer, no Redis. Do not make it the roadmap.

### E. Platform leftovers (only when they unblock A–C)

| Idea | Verdict |
|------|---------|
| TikTok as a provider | Spec’d, flag-gated, Playwright-heavy. Fun experiment; not how a family karaoke night searches for “Chung ta cua hien tai beat” |
| More URL commands / MCP verbs | Surface is already rich (`queue`/`play`/`next`/`karaoke`/`name`). Add verbs when A1 exists (`queuedBy=agent`) |
| Chromecast / AirPlay | Singa sells this. vkara’s model is “open `/tv` on the screen you already have”. Cast is a different architecture |
| Bring back PWA | Explicitly removed. Revisit only for “Add to Home Screen” on phones, not as a TV strategy |
| Chat (`sendMessage`) | Protocol exists, UI does not. Party chat on phones pulls eyes off the singer. Skip unless it is reactions (“👏”) not a thread |
| Reactions / clap from phones | Cheap delight *after* A4; do not start here |
| Apple TV / Fire TV / Play Store | Android proposal explicitly deferred Play/Fire/Apple. Sideload first, stores later |

### F. Reliability tax (ongoing, not a feature sprint)

YouTube Innertube drift (`youtubei`) will keep breaking related/search. Embed-unplayable skip already exists. Empty related-on-parse is the right posture.

Reconnect-banner UX was called out as non-exception Sentry noise — still a human problem when someone’s phone sleeps.

Do not replace youtubei “for fun”. Budget for parse-resilience, not a new extractor.

---

## What not to do next

- Another provider (Spotify, SoundCloud, local files) while YouTube + karaoke filter is still the night.
- Accounts, friends lists, or cloud libraries. No-account is the badge on the README.
- Downloading / re-streaming / vocal isolation of YouTube audio.
- “AI DJ that picks the whole night” as a user-facing default. Agents already exist for power users; the living room does not want a bot hogging the queue (agents are already blocked from becoming host).
- LG/Apple shells, Cast, or store listings before the queue feels fair.
- Chat.

---

## Three approaches for the next change

If we leave exploration and write a proposal, pick one:

**1. Karaoke-night ownership (recommended)**  
Ship A1 attribution + A2 skip policy + A4 TV now/next. One WS contract bump (`queuedByDeviceId` / `queuedByName` on queue items; host-configurable `skipPolicy`). Makes the room feel like karaoke, not a shared YouTube tab. Risk: protocol versioning for old clients; keep fields optional.

**2. Finish scoring PR #3 as an experiment**  
Party toy on the Controls tab, gated, fix review comments, do not persist scorer role. High visible fun, weak “calm room”, YouTube-ToS-honest (no reference pitch). Risk: mic permissions, old TV browsers, performance.

**3. Vietnam join path**  
Zalo robustness + share-as-text + karaoke-filter default for `vi`. Growth/reliability, little new karaoke mechanics. Risk: Zalo inject is third-party and may not be fully fixable.

Recommendation: **approach 1**. It is the gap the author already articulated, it fits existing room/host machinery, and it does not fight YouTube.

---

## Suggested first OpenSpec (when leaving explore)

Name: `karaoke-night-ownership`

Minimum:

- Queue items remember who added them (device id + display name snapshot).
- TV and phone queue show that name.
- Skip / play-now / shuffle / clear are policy-gated (default: any member, matching today; optional host-only).
- TV shows current title + requester, and next title + requester.

Out of scope for that change: scoring, fair-queue interleave, session revive, Zalo, TikTok, new TV shells.

---

## Open questions (for the human, not for more research)

1. Next night, what hurts more: **someone else skipping your song**, **not knowing whose song this is**, or **search not finding a beat version**?
2. Is PR #3 still wanted as an experiment, or should it stay parked?
3. Is the Android TV 6.4 smoke actually done on a device, so `android-tv-shell-sideload` can archive?

When one of those is answered, exit explore and `/opsx-propose` that thread.
