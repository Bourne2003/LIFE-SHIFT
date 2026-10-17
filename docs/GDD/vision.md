# LIFE SHIFT — Vision and Scope

## Core fantasy

**Live your life. Change the world.** The player enters a living world where NPCs have their own
lives and remember important interactions, careers and lifestyles are open, and player decisions
change the state of the world. Long term: persistent, dynamic, single-player plus LAN and online
multiplayer.

## Core loop

Explore → Discover → Interact → Decide → Act → **World changes** → Reward / consequence →
New opportunity → Explore again.

Every system should serve this loop. Features that do not are out of scope unless required
architecturally.

## Current goal: a small vertical slice

One small city (central street, residential area, market, restaurant, park, shop, player home,
a hidden location, one landmark), ~10 data-driven NPCs, ~5 quests (at least one changes world
state), day/night, clear/rain weather, inventory, basic shop economy, versioned save/load,
responsive UI, keyboard and touch controls, offline single-player.

**Not** a massive MMO. Prove the loop is fun first.

## Priorities

P0 critical for the prototype · P1 important · P2 useful · P3 future. No P2/P3 while P0 is open.

Quality order: correctness, maintainability, security, performance, mobile compatibility,
developer experience, visual quality.

## Milestones

| #   | Milestone              | Contents                                                                      | Status   |
| --- | ---------------------- | ----------------------------------------------------------------------------- | -------- |
| 1   | Browser Game Bootstrap | TS + Vite + Phaser, scene, player, movement, camera, responsive canvas, touch | **Done** |
| 2   | Playable City          | Small map, collision, NPCs, interaction, dialogue, basic quest                | **Done** |
| 3   | World Memory           | World state, quest consequences, NPC memory, save/load                        | **Done** |
| 4   | LAN Multiplayer        | Local server, room, connection, sync, disconnect handling                     |          |
| 5   | Online Ready           | Deploy config, env config, HTTPS, database design, monitoring                 | Started  |

Multiplayer order: local single-player → local server → LAN → Internet → persistent accounts →
persistent world. Multiplayer stays behind `VITE_MULTIPLAYER_ENABLED` until single-player is
stable.

Inventory and a basic shop economy (money, Aunt Daeng's store, quest rewards) are in, completing
the MVP definition below. Day/night (24-minute days, lit park lanterns) and clear/rain weather are
in too. The city now has named places (home, morning market, Aunt Daeng's store, clock-tower
landmark, park, Grandma Boon's curry shop and a secret alley), 10 NPCs and 5 quests, three of
which change the world (noodle stall, clock tower, a cat that goes home). The vertical slice is
content-complete. Polish so far: a pause menu (resume, new game with confirmation) and selling
items back to shops at half price. Still to polish before milestone 4: real art and sound. A public playtest build is published
to GitHub Pages on every push to `main` (ADR-006).

## MVP definition (end of milestone 3 + shop)

App starts; player moves and collides; camera follows; NPCs exist and can be talked to; dialogue
and quests work; a quest modifies world state; inventory and a basic shop work; save/load works;
desktop and mobile input work; production build and automated tests pass; no critical console
errors.

## Human approval required for

Core architecture or core loop changes, monetization, deleting significant systems, new major
platforms or external services, spending money, production deploys, secrets, legal/privacy
behaviour.
