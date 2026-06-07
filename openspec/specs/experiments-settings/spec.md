# experiments-settings Specification

## Purpose

Let operators enable experimental TikTok integration from device Settings when the deploy flag is on, with safe provider switching and persistence.

## Requirements

### Requirement: Experiments section visibility is deploy-gated

The web client MUST show the Experiments section in device Settings only when `NEXT_PUBLIC_VKARA_EXPERIMENTS` is truthy (mirroring `VKARA_EXPERIMENTS`).

#### Scenario: Experiments flag disabled

- **WHEN** `VKARA_EXPERIMENTS` is unset or falsy in the web environment
- **THEN** the Experiments section MUST NOT appear in Settings
- **AND** the video provider MUST remain YouTube regardless of any stale localStorage value

#### Scenario: Experiments flag enabled

- **WHEN** `VKARA_EXPERIMENTS` is truthy in the web environment
- **THEN** the Experiments section MUST appear in device Settings
- **AND** it MUST include a warning that features are experimental and may be unstable

### Requirement: User can select video provider in Experiments

The system SHALL persist a device-local `videoProvider` preference with values `youtube` or `tiktok`, defaulting to `youtube`.

#### Scenario: User selects TikTok provider

- **WHEN** the user enables TikTok in Experiments Settings
- **THEN** `videoProvider` MUST be persisted to `vkara-app-settings` localStorage
- **AND** subsequent search and playback routing MUST use TikTok until changed back

#### Scenario: User selects YouTube provider

- **WHEN** the user selects YouTube in Experiments Settings
- **THEN** `videoProvider` MUST be set to `youtube`
- **AND** search and playback MUST use the existing YouTube integration

### Requirement: Provider switch clears incompatible local search state

When the user changes `videoProvider`, the client MUST clear current search results for the previous provider.

#### Scenario: Switch provider after search

- **WHEN** the user changes `videoProvider` while search results from the previous provider are displayed
- **THEN** the search results list MUST be cleared
- **AND** the search input MAY retain its text for re-search on the new provider

#### Scenario: Switch provider during playback

- **WHEN** the user changes `videoProvider` while a video is playing
- **THEN** the client MUST prompt for confirmation before applying the switch
- **AND** on confirm MUST stop local player preview state for the previous provider's item
