## Requirements

### Requirement: Catalog file defines nested playlists

The system MUST load starter playlists from a versioned JSON file in `packages/curated-playlists/` containing a `catalogs` array. Each catalog row MUST have an `id` (e.g. `karaoke`, `music`), a `suggestLocales` string array, and a `playlists` array of YouTube playlist URLs. Multiple rows MAY share the same `id` with different `suggestLocales` ordering and playlist sets. The order of URLs within a row MUST define playlist display order within that section.

#### Scenario: Valid catalog loads

- **WHEN** the application loads the catalog file at build or runtime
- **THEN** all catalogs and playlist URLs are parsed without error
- **AND** each playlist URL yields a parseable YouTube list id

#### Scenario: Invalid entry fails validation

- **WHEN** a playlist URL cannot be parsed to a list id
- **THEN** catalog loading MUST fail fast in development/tests or skip the entry with a logged error per project convention

### Requirement: Locale filtering for catalogs

The system MUST include every catalog row whose `suggestLocales` includes the active UI locale (`vi` or `en`). Rows tagged with only `vi` MUST be excluded when UI locale is `en`, and rows tagged with only `en` MUST be excluded when UI locale is `vi`. When multiple rows share the same `id` and match the locale, the system MUST merge them into a single UI section: sort rows by how early the active locale appears in `suggestLocales` (tie-break: earlier JSON row), then concatenate `playlists` in that order. Section order follows the first merged row’s position in that sorted list.

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

The shipped catalog MUST include three operator-provided playlists under `karaoke` (list ids `PLRH1bes7ddmVMYRkmPNJY4lFZsGlAAXbC`, `PLRH1bes7ddmVp0Cpe2OWJxK6zqA2h8CrD`, `PLRH1bes7ddmWyHL0CVqETM7p3mVwdFXFx`) and one under `music` (`PLRH1bes7ddmWZCJsf02s3WLhtMV2dXbWO`), each with `suggestLocales` `["vi", "en"]`.

#### Scenario: Curated starters present

- **WHEN** a cold-start user views curated suggestions
- **THEN** karaoke and music starter playlists are available in display order defined in JSON
