# CLAUDE.md

Repo-level context for Claude Code sessions. The full design source of truth
lives in [.impeccable.md](.impeccable.md) — read that file for color tokens,
type scale, motion rules, and the principles. The summary below is the
short version that should bias every change.

## Project

**Waffles** — real-time multiplayer trivia, shipped as a World App mini-app.

- **Tech**: Next.js 16 (App Router), React 19, TypeScript, NextAuth (JWT
  sessions, World wallet credentials provider), MiniKit (`@worldcoin/minikit-js`).
- **Auth**: World wallet via SIWE through MiniKit (see
  [src/auth.ts](src/auth.ts) and [src/app/world-auth-gate.tsx](src/app/world-auth-gate.tsx)).
- **State**: Single in-memory `ProtoProvider` context for the prototype
  ([src/app/state.tsx](src/app/state.tsx)). All screens live in
  [src/app/screens/](src/app/screens/).
- **Onboarding**: 5-step pre-auth teaser + post-auth verify gate in
  [src/app/onboarding/](src/app/onboarding/). Owns its own auth + verify
  hooks. The previous visual execution is being redesigned per the brief
  in `.impeccable.md` — treat any existing onboarding CSS as legacy.
- **Verify endpoint**: [src/app/api/world/verify-human/route.ts](src/app/api/world/verify-human/route.ts) —
  prototype stub. Inline TODOs flag the production hardening (server-side
  proof verification, DB-backed `nullifierHash` unique constraint).

## Design Context (summary)

See [.impeccable.md](.impeccable.md) for the canonical version. Quick reference:

### Users
Trivia in micro-sessions on a phone, played at daytime breaks / commutes /
waiting in line. Three personas equally weighted: crypto-native World App
users, mainstream mobile gamers, global Gen-Z (especially emerging markets).

### Brand Personality
**Warm. Weird. Handmade.** Sounds like the friend running the local trivia
night with a notebook of weird facts. Has opinions, has texture, has a sense
of humor. NOT loud-and-fast hype. NOT premium-glossy. NOT corporate-restrained.

### Aesthetic Direction
**Warm cream paper meets 70s game show meets risograph zine.**

Light theme only. Cream paper canvas, ink type, ONE bold brick-red accent used
like a stamp, ochre as a quiet supporter. Halftones, paper grain, hand-drawn
rules. References: Are.na, NYT Magazine, Penguin Classics, risograph posters,
Tom Sachs, Aesop packaging.

**Anti-references** (do NOT do):
- Generic Web3 / crypto dashboard (no purple-blue gradients, no glowing cyan
  accents on dark, no glassmorphism)
- Generic SaaS / Linear-clone restraint (no two-greys-and-a-blue minimalism,
  no productivity-tool feel)
- Universal AI tells (no gradient text, no card-grid templating, no rounded-
  rectangle drop shadows for depth, no left-stripe accent borders)

### Type
Display: **Funnel Display** (variable, Google Fonts).
Body: **Funnel Sans** (variable, Google Fonts, paired with display).

### Color (OKLCH)
- `--paper` `oklch(96.5% 0.018 80)` — dominant surface
- `--ink` `oklch(20% 0.015 60)` — type, rules
- `--brick` `oklch(54% 0.180 28)` — primary accent, used rarely
- `--ochre` `oklch(74% 0.140 78)` — secondary accent

Tinted neutrals (warm hue 60-80). No pure black, no pure white. Texture from
print (halftones, grain), never from gradients.

### Mascot
Wally returns, redrawn — flat hand-illustrated waffle character in single-
color line work. Sits, watches, gestures. Does NOT bounce. The bouncing pixel
Wally is dead.

### Design Principles (cheat sheet)
1. Cream paper, never dark gaming.
2. Type carries the brand.
3. One accent, used like a stamp.
4. Texture from print, not gradient.
5. Editorial restraint with one weird moment per screen.

## Conventions

- **Styles** scoped under `.waffles-v2` to avoid colliding with future surfaces.
- **Pixel-art assets** under `public/images/v2/` are legacy — most will be
  retired or replaced with hand-drawn illustrations as the redesign lands.
- **localStorage keys** for client-only state are prefixed `waffles-`
  (see [src/app/onboarding/storage.ts](src/app/onboarding/storage.ts)).
- **Path alias** `@/*` maps to `src/*` (see `tsconfig.json`).
- **Package manager**: `pnpm`. Use `pnpm dev`, `pnpm build`, `pnpm lint`.

## Open follow-ups

The first redesign pass produced a UI the maintainer rejected. The new design
direction (this document) is the response. Pending work:

1. Rebuild onboarding visual layer against this design context
2. Roll new tokens (color, type, spacing, radii) through `styles.css`
3. Replace pixel-art assets with hand-illustrated equivalents over time
4. Hand-draw the Wally redesign + category marks
5. Re-flow Home, Levels, Lobby, Question, Results, Profile etc. against the
   paper aesthetic — IA stays, surface gets reskinned
