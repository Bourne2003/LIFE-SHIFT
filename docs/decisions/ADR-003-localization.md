# ADR-003: Locale-aware client localization

- **Status:** Accepted
- **Date:** 2026-10-05

## Context

The browser client needs Thai support while keeping English available for development and
international players. Text is currently rendered by Phaser and the document metadata is owned by
the HTML entry point, so a single translation mechanism must serve both surfaces. The game-data
package planned for milestone 2 will also introduce dialogue, quests and item names that need
localization.

## Decision

The web client uses a small, typed translation catalog in `apps/web/src/i18n.ts`. Locale selection
has the following precedence:

1. `?lang=th` or `?lang=en` (useful for QA and shareable links)
2. `VITE_LOCALE` (useful for a fixed deployment default)
3. the browser's preferred language list
4. English fallback

Language tags such as `th-TH` are normalized to their base language. Unsupported languages
continue to use English rather than displaying missing keys. The selected locale also updates the
document `lang`, accessible game label and description metadata.

Translations are keyed rather than embedded in scenes. This keeps future HUD, dialogue and menu
work from duplicating locale detection and gives tests a pure catalog/selection surface.
Locale-aware `Intl` helpers are provided for numbers, dates and currencies so game data does not
assemble locale-sensitive strings manually. The document also uses a Thai-capable font fallback
stack, while Phaser text specifies the same stack explicitly.
Players can switch between English and Thai from the current UI hint area. Their choice is stored
in `localStorage`; a valid `?lang=` URL remains the highest-priority override for QA and sharing.
Engine-agnostic localized content types now live in `packages/game-data`, with a guard that rejects
blank translations before content is shipped.

## Follow-up improvements

- Move dialogue, quest, NPC and item text into the planned data package, with explicit `en` and `th`
  fields (or stable translation keys) rather than translating inside scene code.
- Add a visible language selector in settings once menus exist; persist the choice locally and let
  an explicit user choice override browser detection.
- Add Thai typography checks on desktop and narrow mobile viewports. Thai line breaking, font
  fallback and text width need visual review as longer dialogue is introduced.
- Add plural, number, date and currency formatters through `Intl` before economy and quest rewards
  are exposed. Do not concatenate localized sentences around raw numbers.
- Add locale-specific e2e coverage for `?lang=th`, accessibility metadata and every user-facing
  surface as new content lands.
- Have a native Thai reviewer validate character names, honorifics, tone and culturally specific
  wording before shipping narrative content.
- Add a real settings screen with an explicit language choice and persisted preference. The current
  URL/config/browser resolution is intentionally appropriate for the bootstrap and QA, but is not
  a substitute for an in-game preference.
- Add translation completeness checks that compare every locale catalog against the key set and
  fail CI when a new user-facing key lacks Thai copy.
