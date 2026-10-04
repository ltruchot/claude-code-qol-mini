---
name: css-modern
description: Modern CSS for evergreen browsers (Baseline 2025)
globs:
  - '**/*.css'
  - '**/*.templ'
---

# Modern CSS Patterns

Evergreen browsers only: Safari, Firefox, Chromium (latest).
All features are **Baseline Widely Available** unless noted.

## Design tokens (read first for any `*.css`)

Every value in every `*.css` file MUST come from a `{{TOKEN_PREFIX}}-*` token defined in `{{TOKENS_FILE}}`. No raw hex, no magic px, no ad-hoc rems.

**See `references/design-tokens.md`** for the authorized namespaces, the no-indirection rule, how to add a namespace, and the stylelint troubleshooting table.
## Modern Reset

Josh W. Comeau's CSS Reset (2025), adapted. **See `references/reset.md`** for the full stylesheet to copy.

## Custom Properties (CSS Variables)

### Organization Pattern

```css
:root {
  /* Colors (OKLCH) */
  --color-primary: oklch(55% 0.25 260);
  --color-primary-light: oklch(from var(--color-primary) calc(l + 0.2) c h);
  --color-primary-dark: oklch(from var(--color-primary) calc(l - 0.2) c h);

  /* Semantic colors */
  --color-text: oklch(20% 0 0);
  --color-bg: oklch(98% 0 0);
  --color-surface: oklch(100% 0 0);
  --color-border: oklch(80% 0 0);

  /* Spacing scale */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 1.5rem;
  --space-xl: 2rem;

  /* Typography */
  --font-sans: system-ui, -apple-system, sans-serif;
  --font-mono: ui-monospace, monospace;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.25rem;

  /* Shadows */
  --shadow-sm: 0 1px 2px oklch(0% 0 0 / 0.05);
  --shadow-md: 0 4px 6px oklch(0% 0 0 / 0.1);

  /* Transitions */
  --duration-fast: 150ms;
  --duration-normal: 250ms;
  --easing-default: cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Dark Mode with `light-dark()`

```css
:root {
  color-scheme: light dark;

  --color-text: light-dark(oklch(20% 0 0), oklch(95% 0 0));
  --color-bg: light-dark(oklch(98% 0 0), oklch(15% 0 0));
  --color-surface: light-dark(oklch(100% 0 0), oklch(20% 0 0));
  --color-border: light-dark(oklch(80% 0 0), oklch(30% 0 0));
}

/* Override for specific preference */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: oklch(70% 0.2 260); /* Lighter in dark mode */
  }
}
```

## OKLCH Colors

OKLCH = Lightness, Chroma, Hue. Perceptually uniform.

```css
/* Basic OKLCH */
color: oklch(50% 0.2 260); /* L: 0-100%, C: 0-0.4, H: 0-360 */

/* With alpha */
color: oklch(50% 0.2 260 / 0.8);

/* Relative color syntax (generate palettes) */
--base: oklch(55% 0.25 260);
--lighter: oklch(from var(--base) calc(l + 0.15) c h);
--darker: oklch(from var(--base) calc(l - 0.15) c h);
--muted: oklch(from var(--base) l calc(c * 0.5) h);
--complement: oklch(from var(--base) l c calc(h + 180));
```

### `color-mix()`

```css
/* Mix two colors */
background: color-mix(in oklch, var(--color-primary) 70%, white);

/* Hover states */
.button:hover {
  background: color-mix(in oklch, var(--color-primary), black 15%);
}

/* Transparency */
border-color: color-mix(in oklch, var(--color-border) 50%, transparent);
```

## Layout: Grid

```css
/* Basic grid */
.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: var(--space-md);
}

/* Named areas */
.layout {
  display: grid;
  grid-template-areas:
    'header header'
    'sidebar main'
    'footer footer';
  grid-template-columns: 250px 1fr;
  grid-template-rows: auto 1fr auto;
}

.header {
  grid-area: header;
}
.sidebar {
  grid-area: sidebar;
}
.main {
  grid-area: main;
}
.footer {
  grid-area: footer;
}
```

### Subgrid

```css
/* Parent grid */
.cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-lg);
}

/* Child inherits parent grid lines */
.card {
  display: grid;
  grid-template-rows: subgrid;
  grid-row: span 3; /* Span 3 rows of parent */
}
```

## Layout: Flexbox

```css
/* Centering */
.center {
  display: flex;
  justify-content: center;
  align-items: center;
}

/* Space between with wrap */
.nav {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-sm);
}

/* Grow to fill */
.sidebar {
  flex: 0 0 250px;
} /* Fixed width */
.main {
  flex: 1;
} /* Fill remaining */
```

## Container Queries

Respond to container size, not viewport.

```css
/* Define container */
.card-container {
  container-type: inline-size;
  container-name: card;
}

/* Query container */
@container card (min-width: 400px) {
  .card {
    display: grid;
    grid-template-columns: 150px 1fr;
  }
}

@container card (max-width: 399px) {
  .card {
    display: block;
  }
}

/* Container query units */
.card-title {
  font-size: clamp(1rem, 5cqi, 1.5rem); /* cqi = container inline */
}
```

## `:has()` Selector (Parent Selector)

```css
/* Style parent based on child */
.form-group:has(input:invalid) {
  border-color: var(--color-error);
}

/* Card with image gets different layout */
.card:has(> img) {
  grid-template-rows: 200px 1fr;
}

/* Sibling selector */
label:has(+ input:required)::after {
  content: ' *';
  color: var(--color-error);
}

/* Empty state */
.list:has(> :not([hidden])) {
  display: grid;
}
.list:not(:has(> :not([hidden]))) {
  display: none;
}
```

## Native Nesting

```css
/* Basic nesting */
.card {
  background: var(--color-surface);

  & .title {
    font-size: var(--text-lg);
  }

  & .content {
    padding: var(--space-md);
  }

  /* Pseudo-classes */
  &:hover {
    box-shadow: var(--shadow-md);
  }

  /* Pseudo-elements */
  &::before {
    content: '';
  }

  /* Media queries */
  @media (width >= 768px) {
    display: grid;
  }
}

/* Compound selector (no space = &) */
.button {
  &.primary {
    /* .button.primary */
    background: var(--color-primary);
  }

  &[disabled] {
    /* .button[disabled] */
    opacity: 0.5;
  }
}
```

**Nesting limits:**

- Max 2-3 levels deep
- No BEM-style suffix (`&-modifier` doesn't work like SCSS)
- `@keyframes`, `@font-face` cannot be nested

## Typography & typed tokens

`text-wrap` fixes ragged headings and orphans with zero JS:

```css
h1, h2, h3 {
  text-wrap: balance; /* even line lengths, use under ~6 lines */
}
p, li {
  text-wrap: pretty; /* no orphan word on the last line */
}
```

`@property` gives a token a type, so it animates and never falls back to a raw string:

```css
@property {{TOKEN_PREFIX}}-ring-size {
  syntax: "<length>";
  inherits: false;
  initial-value: 0px;
}

.card {
  transition: {{TOKEN_PREFIX}}-ring-size var({{TOKEN_PREFIX}}-transition-fast);
}
```

Untyped custom properties cannot be transitioned; typed ones can.

## Cascade Layers

Control specificity order.

```css
/* Define layer order (first = lowest priority) */
@layer reset, base, components, utilities;

@layer reset {
  * {
    margin: 0;
  }
}

@layer base {
  body {
    font-family: var(--font-sans);
  }
}

@layer components {
  .button {
    /* component styles */
  }
}

@layer utilities {
  .hidden {
    display: none !important;
  }
}
```

## Transitions & Animations

> **See `references/animations.md`** for `interpolate-size`, `@starting-style`, view transitions, keyframes, and reduced motion patterns.

## Logical Properties

Write direction-agnostic CSS.

```css
/* Physical (avoid) */
margin-left: 1rem;
padding-top: 1rem;
border-right: 1px solid;

/* Logical (prefer) */
margin-inline-start: 1rem; /* Left in LTR, right in RTL */
padding-block-start: 1rem; /* Top in horizontal, left in vertical */
border-inline-end: 1px solid;

/* Shorthands */
margin-inline: 1rem; /* Left + right */
padding-block: 1rem 2rem; /* Top and bottom */
inset: 0; /* top, right, bottom, left */
```

## Scroll Behavior

```css
/* Smooth scroll */
html {
  scroll-behavior: smooth;
}

/* Scroll snap */
.carousel {
  scroll-snap-type: x mandatory;
  overflow-x: auto;
}

.carousel-item {
  scroll-snap-align: center;
}

/* Scroll margin (anchor offset) */
[id] {
  scroll-margin-top: 80px; /* Account for fixed header */
}
```

## Accessibility

```css
/* Focus visible for keyboard only */
:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}
:focus:not(:focus-visible) {
  outline: none;
}

/* Reduced motion */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    transition-duration: 0.01ms !important;
  }
}

/* Forced colors (Windows High Contrast) */
@media (forced-colors: active) {
  .button {
    border: 2px solid currentColor;
  }
}

/* WCAG 2.2: min 24x24px, 44x44px for touch */
button,
a {
  min-width: 24px;
  min-height: 24px;
}
@media (pointer: coarse) {
  button,
  a {
    min-width: 44px;
    min-height: 44px;
  }
}
```

## Utility Patterns

Visually-hidden, truncation, aspect ratio, safe areas. **See `references/utilities.md`**.

## Summary Table

| Feature           | Use Case                   | Baseline      |
| ----------------- | -------------------------- | ------------- |
| `oklch()`         | Modern colors              | Widely (2025) |
| `color-mix()`     | Color manipulation         | Widely (2024) |
| `light-dark()`    | Theme colors               | Widely (2024) |
| Container queries | Component-based responsive | Widely (2025) |
| `:has()`          | Parent selector            | Widely (2024) |
| Native nesting    | Cleaner CSS                | Widely (2024) |
| `@layer`          | Specificity control        | Widely (2024) |
| Subgrid           | Nested grids               | Widely (2023) |
| `@starting-style` | Entry animations           | Newly (2024)  |
| View transitions  | Page transitions           | Newly (2024)  |

## Source

- [web.dev - Baseline](https://web.dev/baseline)
- [MDN CSS Reference](https://developer.mozilla.org/en-US/docs/Web/CSS)
- [Josh W. Comeau - CSS Articles](https://www.joshwcomeau.com/css/)
- [CSS-Tricks](https://css-tricks.com/)
- [Modern CSS Solutions](https://moderncss.dev/)
