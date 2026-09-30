# ADR-001: Browser-first delivery

- **Status:** Accepted
- **Date:** 2026-09-30

## Context

LIFE SHIFT must be playable on desktop, laptop, tablet and phone without installing a native
client, work offline for single-player, and later support LAN and online multiplayer from the
same client.

## Decision

Ship the game as a standard web application (HTML5 canvas via Phaser, static assets built by
Vite). No platform-specific code paths; differences between devices are handled by input
abstraction (`InputSource`) and responsive layout (RESIZE scaling + adaptive camera zoom).
Server endpoints come from configuration (`VITE_SERVER_URL`), so the same build targets local,
LAN or online servers. Offline play will be added via a service worker once there is something
worth caching (not claimed until tested).

## Consequences

- One codebase and one build for every device; distribution is a URL.
- Must stay within browser limits: bundle size, memory on low-end phones, no native APIs.
- Touch controls are first-class, not an afterthought — every interaction needs a touch path.
- Native wrappers (e.g. Capacitor, Tauri) remain possible later without rewriting the game.
