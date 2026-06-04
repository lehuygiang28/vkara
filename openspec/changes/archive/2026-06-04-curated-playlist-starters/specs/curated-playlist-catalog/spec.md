## ADDED Requirements

### Requirement: Catalog file defines nested playlists

The system MUST load starter playlists from a versioned JSON file in `packages/curated-playlists/` containing a `catalogs` array. Each catalog MUST have a stable `id` (e.g. `karaoke`, `music`), a `suggestLocales` string array, and a `playlists` array of YouTube playlist URLs. The order of catalogs in the file MUST define catalog display order. The order of URLs within a catalog MUST define playlist display order within that catalog.

#### Scenario: Valid catalog loads

- **WHEN** the application loads the catalog file at build or runtime
- **THEN** all catalogs and playlist URLs are parsed without error
- **AND** each playlist URL yields a parseable YouTube list id

#### Scenario: Invalid entry fails validation

- **WHEN** a playlist URL cannot be parsed to a list id
- **THEN** catalog loading MUST fail fast in development/tests or skip the entry with a logged error per project convention

### Requirement: Locale filtering for catalogs

The system MUST expose only catalogs whose `suggestLocales` includes the active UI locale (`vi` or `en`). Filtered catalogs MUST retain their relative order from the JSON file.

#### Scenario: UI locale Vietnamese

- **WHEN** UI locale is `vi`
- **THEN** catalogs with `suggestLocales` containing `vi` are included
- **AND** catalogs without `vi` are excluded

#### Scenario: UI locale English

- **WHEN** UI locale is `en`
- **THEN** catalogs with `suggestLocales` containing `en` are included
- **AND** catalogs without `en` are excluded

### Requirement: Empty catalogs are omitted from UI

The system MUST NOT render a catalog section when that catalog has zero playlist URLs after loading.

#### Scenario: Music catalog has no playlists

- **WHEN** the `music` catalog exists but `playlists` is empty
- **THEN** no music section is shown in curated suggestion UI

### Requirement: Initial operator playlists

The shipped catalog MUST include the four operator-provided karaoke playlists (list ids `PLRH1bes7ddmVMYRkmPNJY4lFZsGlAAXbC`, `PLRH1bes7ddmVp0Cpe2OWJxK6zqA2h8CrD`, `PLRH1bes7ddmWyHL0CVqETM7p3mVwdFXFx`, `PLRH1bes7ddmWZCJsf02s3WLhtMV2dXbWO`) under the `karaoke` catalog with `suggestLocales` `["vi", "en"]`.

#### Scenario: Karaoke starters present

- **WHEN** a cold-start user views curated suggestions
- **THEN** all four karaoke starter playlists are available in display order defined in JSON
