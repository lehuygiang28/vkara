## ADDED Requirements

### Requirement: Related parse failures do not 502
When InnerTube `next`/`player` HTTP succeeds but youtubei `Video.load`, `LiveVideo.load`, or `BaseVideoParser.parseRelated` throws (including missing `attributedDescription.content` or `onResponseReceivedEndpoints[0]`), `POST /related` MUST NOT return `502 youtube_upstream_failed`. The handler MUST return HTTP 200 with `{ items, continuation }` where `items` MAY be empty and `continuation` MAY be omitted.

#### Scenario: Video.load throws on schema drift
- **WHEN** `loadVideoFromNextResponses` receives a successful InnerTube payload
- **AND** `Video.load` / `LiveVideo.load` throws
- **THEN** the function MUST return `video: undefined` plus the raw `nextResponseData`
- **AND** MUST NOT rethrow that parse error

#### Scenario: parseRelated throws on continuation
- **WHEN** `fetchRelatedContinuationPage` receives a successful InnerTube continuation payload
- **AND** `BaseVideoParser.parseRelated` throws
- **THEN** the page result MUST have `items` as an empty array
- **AND** MUST NOT rethrow that parse error

#### Scenario: Related HTTP still 502 on transport failure
- **WHEN** InnerTube HTTP for `/related` throws (network or non-success transport)
- **THEN** `POST /related` MAY still return `502 youtube_upstream_failed`

#### Scenario: Continuation kept when Video.load fails but related parse succeeds
- **WHEN** `loadVideoFromNextResponses` returns `video: undefined`
- **AND** related items parse from `nextResponseData`
- **AND** continuation parse from `nextResponseData` returns a token
- **THEN** the related response MUST include that continuation so pagination can continue

### Requirement: Parse failures remain visible in Sentry
Each swallowed youtubei parse throw on the related path MUST be reported via `captureUnexpected` with tags `area=youtube`, `route=related`, `kind=parse`, and level `warning`.

#### Scenario: Capture on Video.load throw
- **WHEN** `Video.load` throws inside `loadVideoFromNextResponses`
- **THEN** `captureUnexpected` is invoked with `kind=parse`

#### Scenario: Capture on parseRelated throw
- **WHEN** `safeParseRelated` catches `BaseVideoParser.parseRelated`
- **THEN** `captureUnexpected` is invoked with `kind=parse`
