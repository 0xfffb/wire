# Linear — Product App Design Spec

> 存档自 [tastekit.dev/apps/linear/app/DESIGN.md](https://tastekit.dev/apps/linear/app/DESIGN.md)（2026-04-20）。  
> 第三方从 Linear 公开 CSS 与嵌入壳拆出的规范，**不是 Linear 官方 DS**。Wire 视觉以这份为标准，产品结构仍见 [../DESIGN.md](../DESIGN.md)。

> Source: Linear's published CSS custom properties + the full embedded product shells on linear.app (live DOM, computed styles), 2026-07-06/07. The logged-in dashboard itself was NOT captured (`needs-dashboard`) — tokens below are Linear's own app design tokens as shipped in its public stylesheets and rendered in embedded app frames. Responsive: not captured.

## 1. Visual Theme & Atmosphere

Dark-first, high-contrast, and engineered: a near-black canvas with a stepped elevation ladder, hairline translucent borders, and dense keyboard-driven rows. Indigo is the only chrome color — brand, active, focus — while status hues live exclusively on issue states and priority icons. Typography is Inter at Linear's custom optical weights (510/590/680, never true bold). Everything is compact: 28px sidebar rows, 32px controls, 4px grid. Motion is instant and snappy — never bouncy or slow. Feels: fast, precise, engineered, quietly premium.

## 2. Color Palette & Roles

### Backgrounds (elevation ladder)

| Token | Hex | Role / usage |
| --- | --- | --- |
| bg-primary / level-0 | `#08090a` | App canvas |
| level-1 | `#0f1011` | Raised surface |
| level-2 | `#141516` | Higher surface, row hover |
| level-3 | `#191a1b` | Highest surface |
| bg-secondary | `#1c1c1f` | Panels, menus, inputs |
| bg-tertiary | `#232326` | Hover fills, chips, selected rows |
| bg-quaternary | `#28282c` | Active/pressed fills |
| overlay-primary | `#000000d9` | Modal scrim |

### Text

| Token | Hex | Role / usage |
| --- | --- | --- |
| text-primary | `#f7f8f8` | Headings, primary text |
| text-secondary | `#d0d6e0` | Body, sidebar labels, code |
| text-tertiary | `#8a8f98` | Muted UI text |
| text-quaternary | `#62666d` | Section headers, placeholders, disabled |

### Borders / lines

| Token | Hex | Role / usage |
| --- | --- | --- |
| border-primary | `#23252a` | Default hairline |
| border-secondary | `#34343a` | Stronger separators |
| border-tertiary | `#3e3e44` | Input/interactive borders |
| border-translucent | `#ffffff0d` | Most-used divider (5% white) |
| line-primary | `#37393a` | Table/list dividers |

### Brand & accent

| Token | Hex | Role / usage |
| --- | --- | --- |
| brand-bg (indigo) | `#5e6ad2` | Primary buttons, active states, focus rings |
| accent (violet) | `#7170ff` | Links, highlights, glow accents |

### Semantic status (issue states only)

| Token | Hex |
| --- | --- |
| blue | `#3caefe` |
| green | `#27a644` |
| red | `#eb5757` |
| orange | `#fc7840` |
| yellow | `#f0bf00` |
| teal | `#00b8cc` |

Rule: chrome is grayscale near-black; indigo/violet is the only chrome color. Status hues appear only on issue states, labels, and priority icons.

## 3. Typography Rules

- Font stack: `"Inter Variable", "SF Pro Display", -apple-system, "Segoe UI", Roboto, sans-serif`. One family everywhere.
- Custom optical weights (the Linear signature): regular `400`, medium `510`, semibold `590`, bold `680`. Titles are 590, never true bold.
- Body: 15px / 1.6 / 400 / `#f7f8f8`.

| Role | Size/Line | Weight |
| --- | --- | --- |
| tiny | 10 / 1.5 | 400 |
| mini (rows, meta, labels) | 13 / 1.5 | 400–510 |
| small | 14 / 1.5 | 400 |
| regular (body) | 15 / 1.6 | 400 |
| large | 17 / 1.6 | 400 |
| title-1 → title-9 | 17 / 20 / 24 / 32 / 40 / 48 / 56 / 64 / 72, lh 1.0–1.4 | 590 |

## 4. Component Stylings

### Buttons

- Primary (brand): bg `#5e6ad2`, text white, radius 8, h32, 13px/510, padding `0 12px`. Hover: lightens ~8%.
- Secondary: bg `#1c1c1f`, text `#f7f8f8`, 1px border `#3e3e44`, radius 8. Hover: bg `#232326`.
- Ghost/icon: transparent, text `#8a8f98`, radius 6, hover bg `#232326`.
- Keyboard hints everywhere: `kbd` chips 11px mono on `#1c1c1f`, border `#23252a`, radius 4.

### Inputs

- bg `#1c1c1f` (or transparent in shell), 1px border `#3e3e44`, radius 8, h32–36, text 14px, placeholder `#62666d`. Focus: border `#5e6ad2` + soft indigo ring `rgba(94,106,210,.25)`.

### Sidebar

- 220–230px column, icon+label rows h28, 13px/510, text `#d0d6e0`, radius 6, padding `0 6px`. Hover/active: bg `#232326`, text `#f7f8f8`. Section headers ("Workspace", "Favorites"): 13px/510 `#62666d`.

### Issue rows / tables

- Dense rows h32–38, 13–14px; leading colored state dot, id in `#62666d` tabular numerals, title `#f7f8f8`, trailing label chips + avatar. Dividers `#ffffff0d` / `#37393a`; full-row hover `#141516`.

### Badges / status chips

- Pill or radius-6 chips h20–24, 12px/510, 1px border `#34343a`; status color as leading dot; priority as bar-glyph icons.

### Command menu / dialogs

- Surface `#1c1c1f`, radius 12, layered stack-low shadow, scrim `#000000d9`. Rows h32, selected bg `#232326`. `⌘K` driven.

### Inline code

- bg `#ffffff0d`, text `#d0d6e0`, radius 4, padding `0 6px`, 13.5–14px mono.

## 5. Layout Principles

- App shell: left sidebar (220–230px) + top breadcrumb bar (h48) + main list/board; right context panel on detail views.
- Spacing: 4px base grid; component gaps 4/8/12/16/24.
- Control heights: buttons `32px`, sidebar rows `28px`, inputs `32–36px`, list rows `32–38px`.
- Density is the point: everything compact, keyboard-first.

## 6. Depth & Elevation

- Radii: `4` (code, kbd), `6` (rows, ghost buttons), `8` (buttons, inputs), `12` (cards, dialogs), `16` (large panels).
- Shadows: low `0 2px 4px #0000001a`; medium `0 4px 24px #0003`; layered stack-low for menus: `0 5px 2px #00000003, 0 3px 2px #0000000a, 0 1px 1px #00000012, 0 0 1px #00000014`.
- Elevation built from translucent borders (`#ffffff0d`, `#23252a`) more than shadow.

## 7. Motion

- Easing: ease-out-quad `cubic-bezier(.25,.46,.45,.94)`.
- Signature range 100–160ms: `color .1s ease`, `filter/transform .16s`, `opacity/transform .16s`, `border/background/box-shadow .16s`.
- Keyframes in shipped CSS: `staggerIn 0.4s` entrance, toast swipe-out/fade. CSS-native — no motion library.
- Instant, snappy, keyboard-first; content animates within static frames. Never bouncy or slow.

## 8. Backgrounds, Effects & WebGL

- Flat dark surfaces; no canvas/WebGL in the shell.
- Glass: `backdrop-filter: blur(20px)` on overlay bars; `blur(4px)` on secondary surfaces.
- Soft low-alpha white radial glows (`rgba(255,255,255,.02–.04)`) as ambient light; ring + soft-black-blur shadow recipes (`0 0 0 1px rgba(0,0,0,.2)`, `0 4px 32px rgba(8,9,10,.6)`).

## 9. Do's and Don'ts

### Do

- Keep the canvas grayscale near-black with the elevation ladder `#08090a → #0f1011 → #141516 → #1c1c1f → #232326 → #28282c`.
- Use indigo `#5e6ad2` only for brand, active, and focus; violet `#7170ff` for links/highlights.
- Restrict status hues to issue states, labels, priority icons.
- Use Inter at optical weights 400/510/590/680; titles at 590.
- Keep density high: 28px sidebar rows, 32px controls, 32–38px list rows, 4px grid.
- Build elevation with hairline translucent borders; reserve stack-low shadow for menus/dialogs.
- Keep micro-transitions 100–160ms ease-out; add kbd hints to actions.

### Don't

- Don't use 500/600/700 weights or true-bold titles.
- Don't use status hues outside issue semantics.
- Don't replace hairline borders with heavy shadows.
- Don't make motion bouncy or slow; no motion libraries.
- Don't loosen density — oversized paddings break the shell's character.

## 10. Responsive Behavior

Not captured (app shell observed at desktop widths only).

## 11. Agent Prompt Guide

- Canvas `#08090a` · Text `#f7f8f8` · Muted `#8a8f98` · Border `#23252a` / `#ffffff0d` · Accent `#5e6ad2`
- Font: `"Inter Variable", "SF Pro Display", -apple-system, sans-serif` · Body: 15px · Radius: 6–8 control / 12 card · Control height: 32px (sidebar rows 28px)
- Focus: border `#5e6ad2` + ring `rgba(94,106,210,.25)` · Hover fill: `#232326` / rows `#141516`

<linear-app_design_language>
Use the Linear app design language: near-black canvas #08090a with an elevation ladder #0f1011 / #141516 / #1c1c1f / #232326 / #28282c, hairline borders #23252a and translucent #ffffff0d doing the work of shadows. Inter only at optical weights 400/510/590/680 — titles 590, never bold; body 15px/1.6, rows and labels 13px/510. Text #f7f8f8, secondary #d0d6e0, tertiary #8a8f98, muted #62666d. Indigo #5e6ad2 is the only chrome color (buttons, active, focus ring rgba(94,106,210,.25)); violet #7170ff for links; status hues (yellow #f0bf00, green #27a644, red #eb5757, blue #3caefe) only as issue-state dots and priority icons. Dense keyboard-first shell: 220px sidebar with 28px rows (radius 6, hover #232326), 32px buttons/inputs (radius 8), 32–38px issue rows with #ffffff0d dividers and #141516 full-row hover, ⌘K command menu on #1c1c1f radius 12 with layered stack-low shadow, kbd chips everywhere. Motion 100–160ms ease-out-quad, CSS-native, never bouncy. Feels: fast, precise, engineered. Avoid: 500/600/700 weights, status color in chrome, heavy shadows, loose spacing, slow or springy motion.
</linear-app_design_language>
