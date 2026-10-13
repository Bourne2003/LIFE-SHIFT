# ADR-004: Thai-first localization

- **Status:** Accepted
- **Date:** 2026-10-13

## Context

The game must fully support Thai. Canvas text in Phaser has three Thai-specific problems: Thai
is written without spaces between words (Phaser wraps only on spaces), stacked vowel and tone
marks get clipped by Phaser's default text metrics, and system fonts render Thai inconsistently
across devices.

## Decision

- Locales `th` (default) and `en`. Start language: `?lang=` → saved choice (localStorage) → Thai.
  An in-game button switches language; `<html lang>` follows.
- Content text is `LocalizedText = Record<Locale, string>`; validation requires every locale.
  UI strings are a typed `Record<Locale, UiStrings>`.
- Line wrapping uses `Intl.Segmenter` word boundaries, splitting over-long words between
  grapheme clusters only (never separating a consonant from its marks).
- Noto Sans Thai (OFL) is bundled from `@fontsource/noto-sans-thai` and served with the app — no
  external font CDN. The game waits (max 3 s) for it before creating text.
- Text styles use a metrics sample containing Thai stacked marks and descenders.

## Consequences

- Adding a language = adding it to `LOCALES`; type checks and validation list everything to
  translate.
- The bundle gains the font files (~60 KB woff2 for Thai + Latin, two weights), loaded only for
  the scripts actually used thanks to `unicode-range`.
