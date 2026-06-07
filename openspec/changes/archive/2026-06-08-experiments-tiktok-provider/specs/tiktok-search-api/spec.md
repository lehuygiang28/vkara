## ADDED Requirements

### Requirement: TikTok search endpoint is experiments-gated

The API MUST expose `POST /tiktok/search` only when `VKARA_EXPERIMENTS` is enabled.

#### Scenario: Experiments disabled

- **WHEN** a client calls `POST /tiktok/search` and `VKARA_EXPERIMENTS` is falsy
- **THEN** the API MUST respond with HTTP 404 or 403
- **AND** MUST NOT launch a Playwright browser

#### Scenario: Experiments enabled

- **WHEN** a client calls `POST /tiktok/search` with a valid body and `VKARA_EXPERIMENTS` is truthy
- **THEN** the API MUST return a JSON list of TikTok videos parsed from TikTok search API results

### Requirement: TikTok search runs server-side with browser pool

TikTok search MUST execute in the API process using a shared Playwright Chromium browser pool; it MUST NOT be callable from the browser client directly against TikTok signed URLs.

#### Scenario: Successful search

- **WHEN** `POST /tiktok/search` receives `{ "query": "karaoke tình ca" }`
- **THEN** the server MUST perform TikTok search via in-page fetch inside a Playwright context
- **AND** MUST map results to `TikTokVideo` objects with at least `id`, `desc`, `duration`, `cover`, `author`, `url`

#### Scenario: Browser pool reuse

- **WHEN** multiple TikTok search requests arrive sequentially
- **THEN** the API MUST reuse a shared browser pool instance rather than launching a new browser per request

### Requirement: TikTok search request is validated

`POST /tiktok/search` MUST validate request bodies with a Zod schema in `@vkara/validators`.

#### Scenario: Invalid body

- **WHEN** the request body fails validation
- **THEN** the API MUST respond with HTTP 400 and MUST NOT invoke Playwright
