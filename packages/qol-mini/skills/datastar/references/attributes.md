# Attributes

Datastar v1.0.4. A key follows a colon (`data-on:click`); a modifier follows two underscores
(`__debounce.300ms`). An attribute "takes a key or a value" when the signal name may sit in
either place, never in both.

## Core

| Attribute | Form | Does |
|---|---|---|
| `data-signals` | `:name="expr"` or `="{...}"` | defines or patches signals. Modifiers `__case`, `__ifmissing` |
| `data-computed` | `:name="expr"` or `="{name: () => expr}"` | read-only derived signal |
| `data-bind` | key or value: `:name`, `="name"` | two-way binding on a form control. Modifiers `__case`, `__prop`, `__event` |
| `data-text` | `="expr"`, no key | sets the text content |
| `data-show` | `="expr"`, no key | toggles inline `display: none` |
| `data-class` | `:name="expr"` or `="{name: expr}"` | toggles classes |
| `data-attr` | `:name="expr"` or `="{name: expr}"` | sets or removes attributes |
| `data-style` | `:prop="expr"` or `="{prop: expr}"` | sets inline styles |
| `data-on` | `:event="expr"` | listens to an event; `evt` and `el` are available |
| `data-on-intersect` | `="expr"` | runs when the element enters the viewport |
| `data-on-interval` | `="expr"` | runs on an interval; the duration is a modifier, `__duration.500ms` |
| `data-on-signal-patch` | `="expr"` | runs when signals change; `data-on-signal-patch-filter="{include, exclude}"` narrows it |
| `data-init` | `="expr"` | runs when the attribute is initialized. Modifiers `__delay`, `__viewtransition` |
| `data-effect` | `="expr"` | re-runs when a signal it reads changes |
| `data-indicator` | key or value | signal that is `true` while a request from this element runs |
| `data-ref` | key or value | signal holding the element |
| `data-json-signals` | `=""` or `="{include, exclude}"` | prints the signals as JSON, for debugging. Modifier `__terse` |
| `data-ignore` | no value | Datastar skips the element and its children. `__self`: the element only |
| `data-ignore-morph` | no value | the morph skips the element and its children |
| `data-preserve-attr` | `="open class"` | the morph keeps these attributes |

- `data-bind` keeps the type of a signal defined before it: define `data-signals:qty="0"`
  first to get a number. A file input yields `{name, contents, mime}[]`.
- `data-bind` writes a property. On a morph, an input's value changes only if the incoming
  `value` attribute differs from the one it replaces.

## Modifiers of `data-on`

`__once`, `__passive`, `__capture` (built-in events only), `__prevent`, `__stop`, `__window`,
`__document`, `__outside`, `__delay.500ms`, `__debounce.300ms` (`.leading`, `.notrailing`),
`__throttle.1s` (`.noleading`, `.trailing`), `__viewtransition`, `__case`.

- There is no `__self`.
- `data-on:datastar-fetch` and `data-on:datastar-signal-patch` listen on `document`, whatever
  element carries them.
- `__viewtransition` calls `document.startViewTransition`: the whole page is captured.

## Casing

A key of an attribute that defines a signal (`data-signals`, `data-computed`, `data-bind`,
`data-indicator`, `data-ref`) becomes camelCase: `data-signals:my-signal` is `$mySignal`. A key
of another attribute stays as written. `__case.camel`, `.kebab`, `.snake`, `.pascal` override.

## Pro only

Ignored without an error on the free bundle.

- Attributes: `data-animate`, `data-custom-validity`, `data-match-media`, `data-on-raf`,
  `data-on-resize`, `data-persist`, `data-query-string`, `data-replace-url`,
  `data-scroll-into-view`, `data-view-transition`.
- Actions: `@clipboard()`, `@fit()`, `@intl()`.
