# Handoff: Workday Autofill Assistant — UI Theme

## Overview
A complete visual theme for the Workday Autofill Assistant Chrome extension, covering the **options page** (Personal info, Work experience, Answer bank, Application records, Privacy settings, Import/Export) and the **side panel** (all states: checking, not-Workday, detected, autofill result, needs-review, saved).

Target branch: `feat/ui-design`.

## About the Design Files
`Extension Theme.dc.html` in this bundle is a **design reference created in HTML** — a prototype showing the intended look, not production code. The task is to **recreate these designs in the existing codebase**: React 18 + TypeScript + Tailwind CSS + Vite (CRXJS). Implement styling via Tailwind utility classes and the token extensions below — do not copy the inline-styled HTML directly.

Do NOT change any business logic, messaging, storage repositories, or tests' behavioral expectations. This is a presentation-layer change only.

## Fidelity
**High-fidelity.** Colors, typography, spacing, radii, and copy are final. Recreate pixel-perfectly with Tailwind.

## Design Tokens → `tailwind.config.ts`

Extend the theme like this:

```ts
theme: {
  extend: {
    colors: {
      canvas:  '#F6F4F1',   // app background (warm paper)
      surface: '#FFFFFF',   // cards, inputs
      raised:  '#FDFCFB',   // page-level panels
      ink:     '#1C1A17',   // primary text, primary buttons
      body:    '#45413B',   // secondary text
      muted:   '#6E6961',   // tertiary text, mono labels
      faint:   '#9B958C',   // placeholders, disabled labels
      line:    '#EAE6E0',   // card borders / dividers
      'line-strong': '#DDD8D0', // input borders
      hairline:'#F1EEE9',   // row dividers, segmented-control track
      primary: '#6C55C8',   // purple — selection, links, emphasis
      teal:    '#2AA79B',   // brand dot, "saved"
      amber:   '#E4B33C',   // brand dot
      success: '#1E8E5A',   // filled / applied / toggles ON
      warning: '#B98900',   // needs review / sensitive
      danger:  '#C4453C',   // skipped / delete
    },
    fontFamily: {
      sans: ['"Instrument Sans"', 'Helvetica', 'Arial', 'sans-serif'],
      mono: ['"JetBrains Mono"', 'monospace'],
    },
    borderRadius: {
      card: '14px',    // cards, tables
      panel: '20px',   // page-level panels
      input: '10px',   // inputs, buttons
      badge: '6px',
    },
  },
}
```

Fonts: self-host or `@fontsource/instrument-sans` (400/500/600/700) and `@fontsource/jetbrains-mono` (400/500). Chrome extensions should NOT load Google Fonts from the network at runtime — bundle them.

Dotted canvas background (on `body` of both options + sidepanel):
```css
background-color: #F6F4F1;
background-image: radial-gradient(#DDD8D0 1px, transparent 1px);
background-size: 22px 22px;
```

## Theme Principles
- Warm paper canvas with dotted grid; white cards with 1px `line` borders, radius 14px (cards) / 20px (panels).
- Primary actions are **ink-black** buttons (`bg-ink text-white rounded-[10px] font-semibold text-[13px] px-[18px] py-[10px]`). Secondary = white with `line-strong` border. Purple is reserved for selection/active/links only.
- Every status is a **dot-prefixed pill**: `inline-flex items-center gap-1.5 border border-line rounded-full px-2.5 py-[3px] text-[11px] font-medium` with a 6px colored dot (success/warning/danger/teal).
- **Monospace for anything machine-ish**: URLs, question keys, dates, counts, section labels (11px uppercase, letter-spacing 0.08em, `muted`).
- Card shadow: `0 1px 2px rgba(28,26,23,0.04)`; floating panels: `0 12px 32px rgba(28,26,23,0.08)`.
- Toggle switch: 34×20px pill track (`success` on / `line-strong` off) with 16px white knob.
- Segmented control: `hairline` track, radius 10px, 3px padding; active segment white with radius 8px + `0 1px 2px rgba(28,26,23,0.08)`.

## Brand
Wordmark: lowercase **“autofill”** (Instrument Sans 700, letter-spacing -0.02em) followed by three overlapping 10–16px circles: teal `#2AA79B`, purple `#6C55C8`, amber `#E4B33C` (each overlapping the previous by ~40%).

## Screens (see `Extension Theme.dc.html`, ids in brackets)

### Options page shell [1b]
- Left sidebar 232px, white, right border `line`. Wordmark at top.
- Nav groups with mono uppercase 10px labels: PROFILE (Personal info, Work experience, Education, Answer bank), ACTIVITY (Application records), DATA (Import / Export, Privacy settings). Maps to the existing `TABS` array in `src/options/App.tsx` — convert the horizontal tab buttons to this sidebar.
- Nav item: 13px/500, `body` color, 8px radius, 6px square dot (gray `#C9C3BA`; purple when active). Active: `hairline` bg, 600 weight, `ink` text.
- Sidebar footer: “Local-only storage / nothing leaves this device” (mono 10px).
- Content area: 28–32px padding; h2 22px/600 letter-spacing -0.02em + 13px `muted` subtitle; right-aligned mono meta (e.g. “26 applications saved”).

### Application records [1b]
- Segmented filter (All / This week / This month) + search input (240px).
- Table card: mono 11px header row; rows with 32px rounded-lg tinted initial avatar (tints `#EDE8F9` / `#E4F3F1` / `#FAF1DC`), company 13px/600 + host in mono 10px `faint`, title 13px `body`, date + fields-filled in mono 11px, status pill. Row hover `#FBFAF8`. Footer: “1–6 of 26” + Previous/Next buttons.

### Personal info [2a]
One white card, sections divided by `hairline` borders, each with a mono uppercase label: Name (3-col: first/last/preferred), Contact (2-col: email/phone), Address (country + line1; city/province/postal 3-col), Links (linkedin/github/portfolio — mono 12px values), Work eligibility (auth status select, earliest start date, sponsorship toggle). Optional fields: label in `faint` with “· optional”. Header row: title/subtitle left, “saved 2 min ago” (mono) + ink **Save changes** button right. Fields map 1:1 to `profile-schema.ts`.

### Work experience [2b]
Two-column grid (1fr / 1.3fr): left = entry cards (title 14px/600, company · location 13px, dates mono 11px, Edit/Delete text buttons; card being edited gets 2px `primary` border + “editing” chip `primary` on `#EDE8F9`), plus a dashed “Drag to reorder — top entry fills first” hint; right = edit form matching `work-experience-schema.ts` (month/year selects; End disabled — `canvas` bg, `#C9C3BA` text — while “I currently work here” toggle is on; Cancel + Save entry footer).

### Answer bank [2c]
Table card: Question (label 13px/600 + `questionKey` mono 10px `faint`), Type chip (mono 10px bordered: yesNo/text/select), Answer 13px, Auto-fill toggle. Sensitive rows: `#FBF7EE` row bg and a “Sensitive · locked” warning pill instead of a toggle (matches schema behavior: `isSensitive` forces `autoFillEnabled: false`). Footer note links to Privacy settings.

### Privacy settings [2d]
Setting rows in one card, divided by `hairline`: label 13px/600 + 12px `muted` description + toggle. All four categories (gender, race, disability, veteran) default OFF per `DEFAULT_PRIVACY_SETTINGS`. Off description: “Off — highlighted for manual review instead”.

### Import / Export [2d]
Export row card: filename + last-export in mono 10px, ink **Export JSON** button. Import: dashed-border drop zone (“Drop a bundle here to import” / “or browse files — you’ll confirm before anything is replaced”).

### Side panel [1c, 2e] — `src/sidepanel/App.tsx`
Width ≈ 360px. Header: wordmark left, version mono 10px right, white bg, bottom border.
- **checking** [2e]: gray dot + mono “checking current page…”
- **not-workday** [2e]: card with gray dot “Not a Workday page” + hint mentioning `*.myworkdayjobs.com` (mono), secondary **Open profile** button (opens options page).
- **workday-detected** [1c]: card with green dot “Workday page detected” + page host in mono 10px; full-width ink **Autofill this page** button (radius 12px, 14px padding).
- **result summary** [1c]: “LAST RUN” card with 2×2 stat grid — detected (ink) / filled (success) / needs review (warning) / skipped (faint); numbers 20px/700, labels mono 10px. `hasMoreEntries` note below a `hairline` divider.
- **needs-review** [2e]: header pill “2 to review” (warning), per-field cards (field name + why), ink **Highlight fields on page** button. (New affordance — implement the list from `summary.needsReview` details if available, else show count only.)
- **save flow** [1c]: secondary **Save application** button; on success a toast card (`#F0F7F4` bg, `#CFE5DB` border, green dot): “Saved {jobTitle} at {companyName} to your records.” Centered purple “Open profile →” link at bottom.

## Interactions
- Buttons hover: ink → `#2E2B26`; secondary → `#FBFAF8`. Transitions 150ms ease.
- Focus rings: `outline: 2px solid #6C55C8; outline-offset: 2px` on all interactive elements (a11y).
- Inputs focus: border-color `primary`.
- Keep all existing handlers/aria attributes (`aria-current` on nav, etc.) intact.

## State Management
No new state beyond what exists. Presentation-only, except: sidebar active tab replaces the horizontal tab strip (same `activeTab` state), and side-panel states map to the existing `status` union + `summary` + `savedRecord`.

## Assets
None required. Wordmark dots are plain CSS circles. Fonts via @fontsource (see Tokens).

## Files
- `Extension Theme.dc.html` — the full design canvas. Ids: 1a tokens/components, 1b options shell + records table, 1c side panel main flow, 2a personal info, 2b work experience, 2c answer bank, 2d privacy + import/export, 2e side panel states. Open it in a browser to inspect exact inline styles.
