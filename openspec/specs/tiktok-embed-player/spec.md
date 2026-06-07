# tiktok-embed-player Specification

## Purpose

Play TikTok queue items in the web client using TikTok Embed Player v1 with host-controlled playback via postMessage and room sync comparable to YouTube.

## Requirements

### Requirement: TikTok playback uses Embed Player v1 iframe

When `videoProvider` is `tiktok`, the web client MUST render TikTok videos using an iframe sourced from `https://www.tiktok.com/player/v1/{videoId}` with native controls hidden via documented query parameters.

#### Scenario: TikTok item plays in player column

- **WHEN** `playingNow` has `source` equal to `tiktok`
- **THEN** `PlayerColumn` MUST mount a TikTok embed component instead of `YoutubeTvEmbed`
- **AND** the iframe MUST hide native controls (`controls=0`, `progress_bar=0`, `play_button=0`, `volume_control=0` at minimum)

### Requirement: Host controls TikTok player via postMessage

The TikTok embed component MUST control playback by posting messages to the iframe with `{ type, value?, 'x-tiktok-player': true }` per TikTok Embed Player documentation.

#### Scenario: Play command

- **WHEN** the user triggers play from vkara remote controls for a TikTok item
- **THEN** the embed component MUST post `{ type: 'play', 'x-tiktok-player': true }` to the iframe

#### Scenario: Pause command

- **WHEN** the user triggers pause from vkara remote controls for a TikTok item
- **THEN** the embed component MUST post `{ type: 'pause', 'x-tiktok-player': true }` to the iframe

#### Scenario: Seek command

- **WHEN** the user seeks to a position for a TikTok item
- **THEN** the embed component MUST post `{ type: 'seekTo', value: <seconds>, 'x-tiktok-player': true }` to the iframe

#### Scenario: Mute command

- **WHEN** the user mutes audio for a TikTok item
- **THEN** the embed component MUST post `{ type: 'mute', 'x-tiktok-player': true }` to the iframe

### Requirement: TikTok player reports playback state to sync layer

The TikTok embed component MUST listen for iframe `message` events with `'x-tiktok-player': true` and forward `onPlayerReady`, `onCurrentTime`, and `onStateChange` to the playback sync module.

#### Scenario: Player ready

- **WHEN** the iframe emits `onPlayerReady`
- **THEN** the sync layer MUST mark the TikTok player as ready for seek/play commands

#### Scenario: Current time updates

- **WHEN** the iframe emits `onCurrentTime` with `currentTime` and `duration`
- **THEN** the sync layer MUST use those values for room playback position sync comparable to YouTube

### Requirement: TikTok items skip YouTube embed playability check

When adding or playing a queue item with `source` equal to `tiktok`, the API room service MUST NOT invoke YouTube `checkEmbeddable` for that item.

#### Scenario: playNow TikTok item

- **WHEN** a WebSocket `playNow` message carries a video with `source: 'tiktok'`
- **THEN** `room-service` MUST accept the item without YouTube embed preflight
- **AND** MUST broadcast `roomUpdate` as with YouTube items
