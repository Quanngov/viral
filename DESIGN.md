---
name: Viral
description: A calm creator dashboard for short-form video research, trends, and scripts.
colors:
  shell-bg: "#f4f5f7"
  ink: "#18181b"
  surface: "#ffffff"
  primary: "#059669"
  primary-hover: "#047857"
  primary-tint: "#ecfdf5"
  primary-border: "#a7f3d0"
  rating-mid: "#f59e0b"
  muted-text: "#71717a"
  border: "#e4e4e7"
  border-subtle: "#f4f4f5"
typography:
  display:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.25
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.3
    letterSpacing: "-0.02em"
  title:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "normal"
  body:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
    letterSpacing: "normal"
  label:
    fontFamily: "var(--font-geist-sans), ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.6875rem"
    fontWeight: 500
    lineHeight: 1.3
    letterSpacing: "normal"
  mono:
    fontFamily: "var(--font-geist-mono), ui-monospace, monospace"
    fontSize: "0.8125rem"
    fontWeight: 400
    lineHeight: 1.45
rounded:
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
    textColor: "{colors.surface}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    padding: "10px 16px"
  nav-item-active:
    backgroundColor: "{colors.primary-tint}"
    textColor: "#064e3b"
    rounded: "{rounded.md}"
    padding: "6px 8px"
  video-card:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "0px"
---

# Design System: Viral

## Overview

**Creative North Star: "The Quiet Radar"**

Viral is a product dashboard for solo creators hunting short-form trends — not another social feed. The interface stays light, structured, and legible: a soft zinc shell (`#f4f5f7`) frames white work surfaces while emerald signals action, success, and active wayfinding. Thumbnails and scripts are the focal point; chrome recedes.

The personality is a **friendly guide**: warm enough to encourage, restrained enough to respect focus. Density is calm — grids, sidebars, and panels organize information without infinite-scroll chaos. Motion is responsive (hover lift, soft enters) but never performative; reduced-motion users get instant or crossfaded states.

**Key Characteristics:**
- Light shell + white panels — never cream/sand marketing warmth
- Emerald as the sole accent for CTAs, active nav, and positive signals
- Geist Sans for all UI; Geist Mono for code-like values when needed
- Rounded corners (8–16px) with whisper shadows, not glass stacks
- Video thumbnails carry visual energy; UI does not compete

## Colors

A restrained product palette: cool zinc neutrals with one confident emerald accent and amber reserved for mid-tier viral scores.

### Primary
- **Signal Emerald** (`#059669` / emerald-600): Primary buttons, auth submit, billing CTAs, active nav emphasis, focus rings. The accent of record — use for actions that move the creator forward.
- **Deep Emerald** (`#047857` / emerald-700): Hover state on primary buttons and filled CTAs.
- **Mist Emerald** (`#ecfdf5` / emerald-50): Active nav backgrounds, plan badges, success callouts. Tint only — not a page background.

### Secondary
- **Ink Button** (`#18181b` / zinc-900): Secondary emphasis actions (OAuth-adjacent patterns, destructive-neutral confirmations) where emerald would overstate importance.

### Tertiary
- **Amber Pulse** (`#f59e0b` / amber-500): Viral score badges in the 0–64 range — caution without alarm. Never used for navigation or marketing chrome.

### Neutral
- **Shell Gray** (`#f4f5f7`): App background, sidebar canvas, full-viewport shell.
- **Paper White** (`#ffffff`): Cards, panels, inputs, modals — primary work surfaces.
- **Ink** (`#18181b`): Headings, primary body text, high-emphasis labels.
- **Muted Slate** (`#71717a` / zinc-500): Secondary labels, helper text, metadata. Must remain readable on white (≥4.5:1).
- **Hairline** (`#e4e4e7` / zinc-200): Default borders on inputs, cards, dividers.
- **Whisper** (`#f4f4f5` / zinc-100): In-panel section dividers, tab track backgrounds.

### Named Rules
**The One Accent Rule.** Emerald is the only chromatic accent for UI chrome. Amber appears only on score badges. No purple gradients, no second brand hue on buttons.

**The Thumbnail Wins Rule.** On video cards, color comes from the thumbnail and its gradient scrim — never from decorative UI frames around the media.

## Typography

**Display Font:** Geist Sans (`var(--font-geist-sans)`) with system-ui fallback  
**Body Font:** Geist Sans (same family — single-family system)  
**Label/Mono Font:** Geist Mono for tabular token counts and technical values

**Character:** Modern, neutral-geometric, optimized for Russian UI copy at small sizes. Tracking tightens slightly on semibold headings (`tracking-tight`); body stays at normal tracking for Cyrillic legibility.

### Hierarchy
- **Display** (700, 1.5rem / 24px, 1.25): Page titles (`Мой тариф`), modal headers. Max one per viewport region.
- **Headline** (600, 1.25rem / 20px, 1.3): Section headers inside panels, billing plan names.
- **Title** (600, 0.875rem / 14px, 1.4): Card titles, nav items, button labels, video titles in detailed cards.
- **Body** (400–500, 0.875rem / 14px, 1.5): Descriptions, form copy, table cells. Cap prose blocks at ~65–75ch where long text appears.
- **Label** (500, 0.6875rem / 11px, 1.3): Mobile bottom-nav captions, compact metadata chips.

### Named Rules
**The Single Family Rule.** Do not introduce a second sans-serif. Pairing happens through weight and size, not font mixing.

## Elevation

Depth is **tonal first, shadow second**. The shell (`#f4f5f7`) sits behind white panels; separation comes from surface color and 1px borders before shadows engage.

Cards and panels use **whisper shadows** at rest (`shadow-sm` with `shadow-zinc-900/5` — a 5% ink tint). Hover on interactive cards adds a slight lift (`-translate-y-0.5`) and a deeper shadow (`shadow-lg shadow-zinc-900/10`). Loading states may use soft glass pulse on thumbnails only — never as a default card style.

### Shadow Vocabulary
- **Panel rest** (`box-shadow: 0 1px 2px 0 rgb(24 24 27 / 0.05)`): User panel, billing cards, auth modal surfaces.
- **Card hover** (`box-shadow: 0 10px 15px -3px rgb(24 24 27 / 0.1)`): Video cards on hover.
- **Badge float** (`box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1)`): Score pills on thumbnails.

### Named Rules
**The Flat Chrome Rule.** Navigation rails and shell backgrounds stay flat — no shadow on the sidebar canvas. Shadows belong on elevated white surfaces only.

## Components

### Buttons
- **Shape:** Generously rounded (12px / `rounded-xl` for primary flows; 8px / `rounded-lg` for compact toolbar actions).
- **Primary:** Emerald fill (`#059669`), white semibold label, `py-2`–`py-2.5` vertical padding. Used for sign-in, upgrade, confirm.
- **Hover / Focus:** Background shifts to `#047857`; focus-visible ring `emerald-500` with 2px offset on cards and interactive tiles.
- **Secondary:** White fill, zinc-200 border, zinc-800 text; hover `bg-zinc-50` or emerald-tinted border on account shortcuts.
- **Ghost / Ink:** Zinc-900 fill for rare tertiary emphasis (billing admin actions); use sparingly.

### Chips
- **Style:** Score badges on video cards — rounded-lg, semibold tabular nums, border + shadow. High (≥85): emerald fill; mid (65–84): white + emerald border; low: amber fill.
- **State:** Nav chips use emerald-100 background when active on mobile bottom bar.

### Cards / Containers
- **Corner Style:** 16px (`rounded-2xl`) for video cards and billing plan tiles; 12px (`rounded-xl`) for account panel shell.
- **Background:** White on shell gray; billing cards may use `from-white to-zinc-50/80` gradient — subtle, not glass.
- **Shadow Strategy:** Panel rest shadow only; video cards gain hover shadow.
- **Border:** `border-zinc-200` default; dashed `border-zinc-300` for empty/token-pack placeholders.
- **Internal Padding:** `p-3` compact panels, `p-4` billing cards.

### Inputs / Fields
- **Style:** White background, `border-zinc-200`, `rounded-xl`, `px-3 py-2`, 14px text.
- **Focus:** Border shifts to `emerald-400`; no glow halos.
- **Error / Disabled:** `disabled:opacity-50`–`60` on buttons; form errors use plain text (no red side-stripe alerts).

### Navigation
- **Desktop sidebar:** Icon + label rows, `text-sm font-medium`, active = `bg-emerald-50 text-emerald-900`, inactive = `text-zinc-800` with emerald hover tint.
- **Mobile bottom nav:** Compact icons with 10px labels; active tab `bg-emerald-100`.
- **Account rail:** White rounded-xl panel with token balance in emerald-tinted inset card.

### Video Card (signature)
- **Aspect:** 3:4 thumbnail, `rounded-2xl` white card.
- **Overlay:** Bottom gradient scrim `from-black/70` for view count and age; platform icon top-left; score badge top-right.
- **Hover:** Thumbnail scale 1.03, card lifts 2px, shadow deepens.
- **Loading:** `card-thumb-glass` pulse on thumbnail only (respects `prefers-reduced-motion`).

## Do's and Don'ts

### Do:
- **Do** keep the shell at `#f4f5f7` and panels at white — the contrast defines the workspace.
- **Do** use emerald for every primary action and active navigation state.
- **Do** let video thumbnails dominate color in the main content area.
- **Do** use `dashboard-ease` transitions (300ms, cubic-bezier(0.4, 0, 0.2, 1)) for hover and state changes.
- **Do** honor `prefers-reduced-motion` — disable card enter, glass pulse, and typing dot animations.
- **Do** write UI copy in clear Russian; keep labels short for narrow mobile nav.

### Don't:
- **Don't** build noisy social-feed UI — no infinite-scroll chaos, loud colors, or attention-bait chrome.
- **Don't** use generic SaaS templates — cream dashboards, purple gradient heroes, interchangeable metric cards.
- **Don't** ship AI-template tells — gradient text, eyebrow kickers on every section, identical icon-card grids, side-stripe accent borders.
- **Don't** default to glassmorphism on panels; glass pulse is for thumbnail loading only.
- **Don't** add a second accent color for navigation or marketing surfaces.
- **Don't** use muted gray (`zinc-400` and lighter) for body text on tinted backgrounds — bump toward ink.
