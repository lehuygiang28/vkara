<p align="center">
  <img src="apps/web/public/icons/vkara-icon.svg" alt="vkara logo" width="72" height="72" />
</p>

<h1 align="center">vkara</h1>

<p align="center">
  <strong>Turn your TV into a karaoke machine.</strong><br />
  Friends pick songs from their phones - no typing on the TV remote.
</p>

<p align="center">
  <img alt="No account required" src="https://img.shields.io/badge/no_account-required-brightgreen">
  <img alt="Phone as remote" src="https://img.shields.io/badge/phone_as-remote-blue">
  <img alt="YouTube-powered search" src="https://img.shields.io/badge/search-YouTube-red">
  <img alt="Self-hostable" src="https://img.shields.io/badge/self--hostable-Docker-2496ED">
</p>

<p align="center">
  Open vkara on a TV or laptop. Everyone joins from their phone, searches YouTube karaoke videos, adds songs to the queue, and controls playback together - <strong>no app install, no account</strong>.
</p>

<p align="center">
  Made for house parties, family karaoke nights, dorm rooms, and small gatherings.
</p>

<p align="center">
  <a href="https://vkara.vercel.app/en"><strong>Try it live → vkara.vercel.app/en</strong></a>
</p>

<p align="center">
  <a href="README.md"><strong>English</strong></a>
  ·
  <a href="docs/vi/README.md">Tiếng Việt</a>
  <!-- · <a href="docs/xx/README.md">Language</a> -->
</p>

<p align="center">
  <a href="#why-vkara">Why vkara</a> ·
  <a href="#usage">How to use</a> ·
  <a href="#self-host">Self-host</a> ·
  <a href="#for-developers">Developers</a>
</p>

<p align="center">
  <img src="apps/web/public/og-image.png" alt="vkara - TV player and phone remote in one room" width="640" />
</p>

<p align="center"><em>One shared player on the big screen. Everyone else uses their phone as the remote.</em></p>

---

## Why vkara?

- **No one types on a TV remote** - search and queue from a phone keyboard.
- **Everyone can add songs** - not just whoever holds the remote.
- **One shared player screen** - the TV stays on the video; phones handle control.
- **Browser only** - no install, no sign-up, no app store.
- **Self-host if you want** - one Docker image runs the full stack at home.

## How it works

1. **TV or laptop** - open vkara. A room appears with a **4-digit code** and **QR**.
2. **Phones** - open the same site, enter the code or scan the QR.
3. **Sing together** - search YouTube, build the queue, skip, pause. Everyone stays in sync.

## Usage

### Host (TV / laptop)

1. Open [vkara](https://vkara.vercel.app/en) in Chrome or Edge on the big screen.
2. Share the **code** or **QR** with friends.
3. Hit fullscreen and let the queue run.

### Guest (phone)

1. Open vkara, scan the QR or type the room code.
2. Search, add songs, control playback from your phone.
3. Enter the room password if the host set one.

### Tips

| Situation | What to do |
|-----------|------------|
| Old or slow TV browser | Plug in a laptop via HDMI |
| Want karaoke versions | Turn on the karaoke filter when searching |
| App UI · English | Open [/en](https://vkara.vercel.app/en) |
| App UI · Vietnamese | Open [`/`](https://vkara.vercel.app/) |

## FAQ

**Do I need an account?**  
No. Join with a room code or QR. Hosts can optionally set a room password.

**Where do the songs come from?**  
YouTube. Some videos cannot be embedded; vkara skips those. Use of YouTube content is subject to [YouTube’s Terms of Service](https://www.youtube.com/t/terms).

**Is vkara affiliated with YouTube?**  
No. vkara uses YouTube search and embedded playback, but is not affiliated with or endorsed by YouTube.

**Why two layouts (TV vs phone)?**  
The player screen is for watching. Phones are for searching and controlling - so nobody hunts for letters on a TV remote.

**Can I host my own copy?**  
Yes. See [Self-host](#self-host) below or the full guide in [containers/README.md](containers/README.md).

---

## Self-host

The easiest way to run vkara yourself is the **all-in-one Docker image** (`vkara-aio`). It runs the web app and backend together on **port 3000**, with the default setup handled for you.

```bash
cp containers/aio/.env.example containers/aio/.env
docker compose --profile aio up --build
```

Open http://localhost:3000

Pre-built image from Docker Hub:

```bash
docker pull lehuygiang28/vkara-aio:latest
docker run --rm -p 3000:3000 lehuygiang28/vkara-aio:latest
```

Split web/API, production env, and other profiles: **[containers/README.md](containers/README.md)**.

---

## For developers

<details>
<summary><strong>Local development</strong></summary>

**Requirements:** [Bun](https://bun.sh) ≥ 1.3.13, Redis, Node.js 22+ (for production web builds only).

```bash
git clone https://github.com/lehuygiang28/vkara.git
cd vkara
bun install
```

Copy env files:

- `apps/api/.env.example` → `apps/api/.env`
- `apps/web/.env.example` → `apps/web/.env.local`

Start Redis (example):

```bash
docker run -d --name vkara-redis -p 6379:6379 redis:7-alpine \
  redis-server --requirepass giang
```

Run:

```bash
bun run dev          # web :3000 + API :8000
bun run dev:web
bun run dev:api
```

</details>

<details>
<summary><strong>Docker images</strong></summary>

| Image | Port | Notes |
|-------|------|--------|
| `lehuygiang28/vkara-aio` | 3000 | Full stack (recommended) |
| `lehuygiang28/vkara-web` | 3000 | Frontend only |
| `lehuygiang28/vkara-api` | 8000 | API only (bring your own Redis) |
| `lehuygiang28/vkara-api-redis` | 8000 | API + Redis in one container; Redis is internal only |

Compose profiles: `aio`, `web`, `api`, `bundle`, `whisper`. See [containers/README.md](containers/README.md).

</details>

<details>
<summary><strong>Tech stack</strong></summary>

| Layer | Stack |
|-------|--------|
| Frontend | Next.js 15, React 19, Tailwind |
| Backend | Bun, Elysia |
| State | Redis |
| Repo | Bun workspaces, Turborepo |

Optional voice search: [Whisper STT](containers/whisper-stt/README.md).

</details>

<details>
<summary><strong>Repository layout</strong></summary>

```text
vkara/
├── apps/
│   ├── web/                 frontend
│   └── api/                 backend
├── packages/
│   └── shared-types/        shared API & realtime types
├── containers/
│   ├── aio/                 all-in-one Docker image
│   ├── api-redis/           API + Redis bundle
│   └── whisper-stt/         optional voice search
└── docker-compose.yml
```

Protocol types live in `packages/shared-types` - update there before changing web/API contracts.

**Scripts:** `bun run dev` · `bun run build` · `bun run format`

**Docs:** [Monorepo architecture](docs/monorepo-architecture.md)

</details>

## Contributing

Issues and pull requests welcome. Change `packages/shared-types` first when altering API or realtime message shapes.

## Thanks

YouTube search and playback in vkara depend on open-source libraries and their authors:

| Library | Author | Used for |
|---------|--------|----------|
| [youtubei](https://github.com/SuspiciousLookingOwl/youtubei) | [@SuspiciousLookingOwl](https://github.com/SuspiciousLookingOwl) | Search, video metadata, playlists, Innertube API |
| [youtube-sr](https://github.com/twlite/youtube-sr) | [@twlite](https://github.com/twlite) | Search suggestions |
| [react-youtube](https://github.com/tjallingt/react-youtube) | [@tjallingt](https://github.com/tjallingt) | YouTube player embed in the web app |

Thank you to the maintainers and contributors of these projects.

## License

MIT - see [LICENSE](LICENSE).

---

<p align="center">
  <a href="https://github.com/lehuygiang28/vkara">github.com/lehuygiang28/vkara</a>
</p>
