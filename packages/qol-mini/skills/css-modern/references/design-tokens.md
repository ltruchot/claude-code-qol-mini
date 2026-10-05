# Design tokens contract

> Repo rules for `{{TOKEN_PREFIX}}-*` tokens. Read before touching any `*.css`.

Every value in every `*.css` file under `{{UI_ROOT}}` and any consumer of it MUST come from a `{{TOKEN_PREFIX}}-*` token defined in `{{TOKENS_FILE}}`. No raw hex, no magic px, no ad-hoc rems.

## Authorized namespaces (this list is the contract)

| Namespace                                   | Holds                                                                                                                                                                                                                                                          |
| ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `{{TOKEN_PREFIX}}-color-*`                            | All colors. Includes palette (`primary-50..900`, `slate-*`, `gray-*`), semantic (`text`, `surface`, `border-focus`, …), status (`success`, `error`, `error-hover`, `error-active`, `warning`, `info`), accent (`accent`, `accent-muted`), and any project palette |
| `{{TOKEN_PREFIX}}-space-*`                            | Padding, margin, gap, layout sizes (`2xs`..`4xl`)                                                                                                                                                                                                              |
| `{{TOKEN_PREFIX}}-font-*`                             | Family (`sans`, `display`, `mono`), `size-*`, `weight-*`                                                                                                                                                                                                       |
| `{{TOKEN_PREFIX}}-radius-*`                           | Border-radius (`sm`..`4xl`, `full`)                                                                                                                                                                                                                            |
| `{{TOKEN_PREFIX}}-shadow-*`                           | Box-shadow scale                                                                                                                                                                                                                                               |
| `{{TOKEN_PREFIX}}-transition-*`                       | Animation timing (clamps to 0ms under `prefers-reduced-motion`)                                                                                                                                                                                                |
| `{{TOKEN_PREFIX}}-icon-*`                             | Icon sizes                                                                                                                                                                                                                                                     |
| `{{TOKEN_PREFIX}}-z-*`                                | Stacking order (`dropdown`, `sticky`, `modal`, `toast`)                                                                                                                                                                                                        |
| `{{TOKEN_PREFIX}}-width-*`                            | Floating panel max widths                                                                                                                                                                                                                                      |
| `{{TOKEN_PREFIX}}-opacity-*`                          | Semantic transparency levels (`disabled`, …) — state communication, not color tinting (use `color-mix` for that)                                                                                                                                               |
| `{{TOKEN_PREFIX}}-focus-ring*`                        | A11y focus rings                                                                                                                                                                                                                                               |
| `{{TOKEN_PREFIX}}-line-height-*`, `{{TOKEN_PREFIX}}-tracking-*` | Typography sub-primitives                                                                                                                                                                                                                                      |
| `{{TOKEN_PREFIX}}-border-width(-thick)?`              | 1px / 2px border thickness                                                                                                                                                                                                                                     |
| `{{TOKEN_PREFIX}}-bp-*`, `{{TOKEN_PREFIX}}-container-*`         | Layout breakpoints / max widths                                                                                                                                                                                                                                |
| `{{TOKEN_PREFIX}}-backdrop`, `{{TOKEN_PREFIX}}-outline-subtle`  | One-off named primitives                                                                                                                                                                                                                                       |

Anything else in a `var()` is wrong: either it belongs in an existing namespace, or the namespace must be **extended in `tokens.css` first** and added to the table above (and to `{{TOKENS_DOC}}`) **before** any callsite uses it.

## The no-indirection rule (MANDATORY)

A token MUST hold a real value, not a `var()` pointing at another token in the same file. An alias namespace such as `{{TOKEN_PREFIX}}-action-*` is the cautionary tale: tokens like `{{TOKEN_PREFIX}}-action-primary: var({{TOKEN_PREFIX}}-color-primary-600)` are forbidden because the alias hides the actual color from the reader, duplicates the documented swatches, and invites drift.

**Rule of thumb:** if removing the alias and inlining its target would not change a single rendered pixel, the alias should not exist.

**State variants are NOT indirection.** `primary-500/600/700/800`, `error/error-hover/error-active`, `success-light` all hold distinct values &mdash; they are primitives, keep them.

## Picking the right token

```css
/* ✅ Direct primitive — clear, greppable, one source of truth */
.card__cta {
  background: var({{TOKEN_PREFIX}}-color-primary-600);
}
.card__cta:hover {
  background: var({{TOKEN_PREFIX}}-color-primary-500);
}
.danger-zone__delete {
  background: var({{TOKEN_PREFIX}}-color-error);
}

/* ❌ Wrapper alias — adds a hop, hides the value */
.card__cta {
  background: var({{TOKEN_PREFIX}}-action-primary); /* DON'T add this kind of token */
}

/* ❌ Magic value */
.card__cta {
  background: #2563eb; /* DON'T inline a color */
}

/* ❌ Cross-file indirection (token defined in one file as `var(other-token)`) */
:root {
  {{TOKEN_PREFIX}}-cta-bg: var({{TOKEN_PREFIX}}-color-primary-600); /* DON'T */
}
```

## When you genuinely need a new namespace

1. Confirm it does not fit any existing one (read the tokens.css comments).
2. Add the primitive token(s) to `{{TOKENS_FILE}}` with a real value.
3. Add a row to the table in `tokens.mdx` and (if it is a CSS-modern guideline) to the table above in this skill.
4. Only then write a callsite that uses it.

The intent of a component is carried by its **class name** (`.button.--primary`, `.pill.--archived`, `.card__cta`). The token only carries the value.

## If the lint rejects your commit (troubleshooting)

The pre-commit hook runs `stylelint --fix` on staged CSS files. If a rule fires, the commit is rejected and you see a multi-line message naming the rule, the offender, and the fix. The five token guardrails:

| Error message starts with…                                                   | Rule                                       | Fix                                                                                                                                                                                                                                                                                                                                  |
| ---------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `Custom property "--..." must use the {{TOKEN_PREFIX}}-* namespace.`                   | `custom-property-pattern`                  | Either rename the token to `{{TOKEN_PREFIX}}-*` (and add it to `tokens.css` + the table in `tokens.mdx`) or, if it's a component-scoped local set inline via `style="--my-knob: …"`, add the file to the `custom-property-pattern: null` override in `stylelint.config.mjs`.                                                                   |
| `var(--...) is not defined in tokens.css.`                                   | `no-unknown-custom-properties`             | Pick an existing token (most likely a typo or a stale reference to an alias namespace like `{{TOKEN_PREFIX}}-action-*`). For component-scoped locals defined inside the same file, the rule resolves them automatically — if it doesn't, your `:root`/`.host` declaration is missing or shadowed.                                             |
| `Token "{{TOKEN_PREFIX}}-..." is an indirection alias — its value is just var(--...).` | `{{LINT_PLUGIN}}/no-token-indirection`                | Inline the target primitive at every callsite and delete the token, OR add the suffix to `allowedAliasFamilies` in `stylelint.config.mjs` if it's part of a sibling family that encodes role/intent (text/text-muted/text-subtle, surface/surface-muted/surface-hover, …). Singletons are NOT a family.                              |
| `This property must use a {{TOKEN_PREFIX}}-* token (color/spacing/typography).`        | `scale-unlimited/declaration-strict-value` | Pick a token from the right namespace. No auto-fix — the rule deliberately doesn't guess which token the dev meant. Allowed exceptions: `transparent`, `inherit`, `currentColor`, `none`, `auto`, `0` (for spacing/radius), and `var({{TOKEN_PREFIX}}-*)` / `color-mix(in srgb, var({{TOKEN_PREFIX}}-color-*) X%, transparent)`.                         |
| `@media (...) uses a raw media feature.`                                     | `{{LINT_PLUGIN}}/media-must-use-custom-media`         | Use `@media (--mobile)`, `(--tablet)`, `(--desktop)`, or `(--widescreen)` (defined in `tokens.css`). Environmental queries (`prefers-reduced-motion`, `prefers-color-scheme`, `forced-colors`, `hover`, `pointer`, `prefers-contrast`, …) are allowed. Combined queries (`@media (--tablet) and (orientation: landscape)`) work too. No browser reads `@custom-media`: it needs the PostCSS custom-media transform in the build. |

For `declaration-no-important` and other built-in rules, prefer fixing the architectural cause (specificity, data-state selectors over inline-style fights) over `/* stylelint-disable-line */` escape hatches. When you do disable, use a single-line `/* stylelint-disable-line some-rule -- reason */` co-located with the offending declaration; the project enforces `reportDescriptionlessDisables` so the `-- reason` is mandatory.
