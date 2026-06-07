# video-provider-routing Specification

## Purpose

Route vkara search, queue, and playback flows to YouTube or TikTok based on the persisted `videoProvider` preference and experiments flag.

## Requirements

### Requirement: Search routes to active video provider

When the user performs a search, the client MUST call the YouTube or TikTok search API based on the persisted `videoProvider` preference and `VKARA_EXPERIMENTS` gate.

#### Scenario: YouTube provider active

- **WHEN** `videoProvider` is `youtube`
- **THEN** `performSearch` MUST call the existing YouTube search endpoint (`POST /search`)
- **AND** MUST apply the existing karaoke query prefix behavior

#### Scenario: TikTok provider active with experiments enabled

- **WHEN** `videoProvider` is `tiktok` and experiments are enabled
- **THEN** `performSearch` MUST call `POST /tiktok/search`
- **AND** MUST map results through the TikTok-to-queue adapter before displaying in `VideoList`

#### Scenario: TikTok provider active with experiments disabled

- **WHEN** `videoProvider` is `tiktok` but experiments are disabled
- **THEN** the client MUST treat `videoProvider` as `youtube` for routing
- **AND** MUST NOT call `POST /tiktok/search`

### Requirement: Queue items carry provider source discriminator

Adapted TikTok videos placed on the room queue MUST include `source: 'tiktok'`; YouTube videos MUST use `source: 'youtube'` or omit the field (default YouTube).

#### Scenario: Add TikTok search result to queue

- **WHEN** the user adds a TikTok search result while `videoProvider` is `tiktok`
- **THEN** the WebSocket `addVideo` payload MUST include `source: 'tiktok'`
- **AND** MUST include fields required by existing queue item schema (via adapter mapping)

### Requirement: YouTube-only features hidden for TikTok provider

When `videoProvider` is `tiktok`, the client MUST NOT expose YouTube-only flows that cannot work with TikTok items.

#### Scenario: Playlist import unavailable

- **WHEN** `videoProvider` is `tiktok`
- **THEN** YouTube playlist import UI and actions MUST be hidden or disabled

#### Scenario: Captions unavailable

- **WHEN** `videoProvider` is `tiktok` and a TikTok item is playing
- **THEN** caption track selection MUST NOT be offered for that item
