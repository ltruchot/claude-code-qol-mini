# Design tokens contract

> Read before touching any `*.css`.

## The project's tokens come first

`{{TOKENS_FILE}}` is the contract. Open it before writing a value.

- **A token exists for the value → use it. Always.** No raw hex, no magic px, no ad-hoc rem
  beside a token that already holds that value.
- **The project's tokens outrank this skill.** Every `{{TOKEN_PREFIX}}-*` name in the examples
  of this skill shows a shape. The names, the scales and the namespaces that
  `{{TOKENS_FILE}}` defines are the ones to write, even where they differ from an example.
- **No token fits → add the token first**, in `{{TOKENS_FILE}}`, then use it. Never a
  one-off value at the callsite.
- **`{{TOKENS_FILE}}` does not exist, or holds no token for a whole category** (no spacing
  scale, no radius scale): say so, and propose the tokens before the CSS that needs them.
  Do not invent a parallel set in a component file.

## Namespaces

A namespace is a token family sharing one prefix. The ones below are common; the list that
binds is the one found in `{{TOKENS_FILE}}`.

| Namespace | Holds |
|---|---|
| `{{TOKEN_PREFIX}}-color-*` | palette steps, semantic colors (`text`, `surface`, `border`), status colors with their state variants (`error`, `error-hover`, `error-active`) |
| `{{TOKEN_PREFIX}}-space-*` | padding, margin, gap, layout sizes |
| `{{TOKEN_PREFIX}}-font-*` | family, `size-*`, `weight-*` |
| `{{TOKEN_PREFIX}}-line-height-*`, `{{TOKEN_PREFIX}}-tracking-*` | typography sub-primitives |
| `{{TOKEN_PREFIX}}-radius-*` | border-radius scale |
| `{{TOKEN_PREFIX}}-shadow-*` | box-shadow scale |
| `{{TOKEN_PREFIX}}-transition-*` | duration and easing; set to `0ms` under `prefers-reduced-motion` |
| `{{TOKEN_PREFIX}}-z-*` | stacking order (`dropdown`, `sticky`, `modal`, `toast`) |
| `{{TOKEN_PREFIX}}-opacity-*` | state transparency (`disabled`); tint a color with `color-mix()`, not with opacity |
| `{{TOKEN_PREFIX}}-bp-*`, `{{TOKEN_PREFIX}}-container-*` | breakpoints, max widths |

A `var()` naming a token outside the project's namespaces is wrong: either the value belongs
in an existing namespace, or the namespace is added to `{{TOKENS_FILE}}`, and to the project's
token documentation if it has one, **before** any callsite uses it.

## The no-indirection rule

A token holds a real value, not a `var()` pointing at another token. An alias such as
`{{TOKEN_PREFIX}}-action-primary: var({{TOKEN_PREFIX}}-color-primary-600)` hides the color from
the reader, duplicates a documented swatch, and drifts.

**Test:** if removing the alias and inlining its target changes no rendered pixel, the alias
should not exist.

**State variants are not indirection.** `primary-500/600/700`, `error/error-hover/error-active`
hold distinct values: they are primitives.

**A project that aliases on purpose keeps its aliases.** A semantic layer over a palette
(`text`, `surface`, each a `var()` on a palette step, often one set per theme) is a decision
of the project: follow it, and do not add a second layer on top.

## Picking the right token

```css
/* ✅ Direct primitive: greppable, one source of truth */
.card__cta {
  background: var({{TOKEN_PREFIX}}-color-primary-600);
}
.card__cta:hover {
  background: var({{TOKEN_PREFIX}}-color-primary-500);
}

/* ❌ Wrapper alias: one more hop, the value is hidden */
.card__cta {
  background: var({{TOKEN_PREFIX}}-action-primary);
}

/* ❌ Magic value */
.card__cta {
  background: #2563eb;
}

/* ❌ A token defined as another token */
:root {
  {{TOKEN_PREFIX}}-cta-bg: var({{TOKEN_PREFIX}}-color-primary-600);
}
```

The intent of a component is carried by its **class name** (`.button.--primary`,
`.card__cta`). The token carries the value.

## Adding a token or a namespace

1. Confirm it fits no existing one: read `{{TOKENS_FILE}}` and its comments.
2. Add the token there, with a real value.
3. Update the project's token documentation, if it has one.
4. Only then write the callsite.

## When a linter guards the tokens

A project may enforce its tokens with stylelint. Its configuration is then part of the
contract: read it, and fix the cause of a report instead of silencing it.

| Report | Fix |
|---|---|
| a custom property name does not match the project's pattern (`custom-property-pattern`) | rename the property into the project's prefix and define it in `{{TOKENS_FILE}}` |
| a `var()` names a property defined nowhere | a typo, or a token that was removed: pick an existing one |
| a property must take a token, not a raw value | pick the token from the right namespace; `transparent`, `inherit`, `currentColor`, `none`, `auto` and `0` are usually allowed |
| a media query must use a named breakpoint | use the project's `@custom-media` names. No browser reads `@custom-media`: the build needs the PostCSS custom-media transform |

A disable comment is the last resort, on one line, with its reason:
`/* stylelint-disable-line some-rule -- reason */`.
