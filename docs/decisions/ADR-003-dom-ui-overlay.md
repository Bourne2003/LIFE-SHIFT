# ADR-003: DOM overlay for text and menus

- **Status:** Accepted
- **Date:** 2026-10-01

## Context

Milestone 2 adds the first text-heavy UI: dialogue with choices, interaction prompts, a quest
tracker and notifications. It must be readable and tappable on phones as well as desktops.

Phaser text is rendered into the canvas at CSS-pixel resolution (we do not scale the canvas by
`devicePixelRatio`), so on high-DPI phones it is blurry, and every button, focus state and
layout rule has to be built by hand.

## Decision

Text, panels and buttons are plain DOM elements in `#ui`, layered over the canvas and built by
`apps/web/src/ui/mountUi.ts` without a framework. The overlay root has `pointer-events: none`;
only real controls receive input, so touches elsewhere still reach the canvas (joystick).

Controls that need canvas coordinates (the touch joystick) stay in Phaser's `UIScene`.

UI reads game state only through services and their events (`session`, `dialogue`, `world`)
and sends input through the same `InputManager` actions as the keyboard. It re-renders on
events, never per frame.

## Consequences

- Crisp text at any DPI, native buttons, CSS layout with safe-area insets, screen-reader roles
  and `aria-live` for free; browser tests can target elements by role, text and test id.
- Two rendering technologies to keep visually consistent.
- Must keep DOM updates event-driven to avoid layout thrash.
- If the UI grows large (inventory, shop, settings), a small view library may become worth it —
  record that as a new ADR.
