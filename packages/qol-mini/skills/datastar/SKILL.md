---
name: datastar
description: Datastar v1 API reference, backend-agnostic - data-* attributes, signals, backend actions, the two SSE events, morphing, and the mistakes that fail with no error. Use when writing or reviewing HTML with data-* attributes, an SSE endpoint that patches elements or signals, or when a Datastar attribute does nothing.
---

# Datastar v1

Checked against Datastar **v1.0.4**; a line that depends on a release says which. This skill
holds the API, not an architecture: where state lives, when a stream stays open and how much
is patched at once are project decisions, written in the project's own skill or `CLAUDE.md`.

Reference: <https://data-star.dev/docs.md> is the whole documentation in one Markdown file.
Read it with `curl -sL` and `grep` before using anything not listed here.

## Failures with no error

Datastar ignores what it does not recognize. Nothing is logged.

| Written | What happens | Write |
|---|---|---|
| `data-on-click="..."` | unknown attribute, ignored | `data-on:click="..."`: a key takes a colon |
| `data-on-load="..."` | does not exist | `data-init="..."` |
| `data-on:intersect`, `data-on:interval` | no such events | `data-on-intersect`, `data-on-interval`: separate attributes, hyphen, no key |
| `data-on:click__self` | unknown modifier, ignored: the handler runs for children too | test `evt.target === el` in the expression |
| a Pro attribute on the free bundle (`data-persist`, `data-on-resize`, ...) | ignored | see the Pro list in `references/attributes.md` |
| `data-bind="$email"`, `data-indicator="$busy"`, `data-ref="$el"` | the value is a name, not an expression | `data-bind="email"`, or the key form `data-bind:email` |
| `data-signals:my-signal` read as `$my-signal` | the key became `$mySignal` | read `$mySignal`, or set `__case.kebab` |
| A top-level patched element whose `id` matches nothing | not patched; one console warning, `PatchElementsNoTargetsFound` | give it the `id` of its target, or send `selector` and `mode` |
| An open `@get` stream when the tab goes to the background | closed, and opened again on return | `openWhenHidden: true` |
| A stream the server closes | not reopened: `retry: 'auto'` retries network errors only | keep it open, or `retry: 'always'`, which retries every response but a `204` |
| A second request with the same method and URL | cancels the first one, from any element (v1.0.2) | `requestCancellation: 'disabled'` |

A known attribute used wrongly does throw, with a link to `data-star.dev/errors/...`:
`KeyAndValueProvided` (`data-bind:foo="foo"`), `KeyRequired`, `ValueRequired`,
`KeyNotAllowed` (`data-text:foo`), `ValueNotAllowed`.

## Signals

- `data-signals:count="0"`, nested `data-signals:user.name="'Ada'"`, or one object
  `data-signals="{count: 0, user: {name: 'Ada'}}"`. Read and write as `$count`, `$user.name`.
- A signal used before it is defined is created with an empty string.
- Setting a signal to `null` or `undefined` removes it. A name cannot contain `__`.
- Every action sends all signals, except those whose path has a segment starting with `_`
  (`$_open`, `$form._dirty`). `filterSignals` changes that default.
- `data-computed:total="$price * $qty"` is read-only and must have no side effect.

## Attributes, in short

```html
<input data-bind:email />
<button data-on:click="@post('/subscribe')" data-attr:disabled="$sending">Subscribe</button>
<p data-text="$email"></p>
<p data-show="$sent">Sent.</p>
<div data-class:is-busy="$sending" data-indicator:sending></div>
<input data-on:input__debounce.300ms="@get('/search')" data-bind:q />
<div data-init="@get('/feed')"></div>
```

- `data-init` runs on page load, when its element is patched into the page, and when the
  attribute changes.
- `data-on:submit` on a form always prevents the native submission.
- `data-attr:x`: `true` or `''` sets an empty attribute (`aria-disabled=""`, not `"true"`);
  `false`, `null`, `undefined` remove it. For an ARIA state, send the string: `$open ? 'true' : 'false'`.

Full list, modifiers and the Pro attributes: [references/attributes.md](references/attributes.md).

## Backend actions

`@get(url, options)`, `@post`, `@put`, `@patch`, `@delete`; `@query` from v1.0.4.

- `GET` and `DELETE` send the signals in a `datastar` query parameter, as JSON. The others
  send a JSON body. The SDKs' `ReadSignals` reads both.
- Every request carries the header `Datastar-Request: true`.
- There is no `credentials` option: the browser default, `same-origin`, applies.
- The response may be `text/event-stream`, `text/html`, `application/json` or
  `text/javascript`; `204` is accepted.

Options, retries, the `datastar-fetch` event and the other actions:
[references/actions.md](references/actions.md).

## SSE events

Two events exist. Nothing else is read.

```text
event: datastar-patch-elements
data: elements <div id="status">Saved</div>

event: datastar-patch-signals
data: signals {"sending": false}
```

- Default mode `outer`: each top-level element replaces, by morph, the element with the same
  `id`.
- There is no `datastar-execute-script` event, and `datastar-merge-fragments` /
  `datastar-merge-signals` are the names before v1. A script is sent as a `<script>` element
  appended to `body`; the SDK helper `ExecuteScript` does exactly that.

Data lines, modes, morph rules and the SDK calls: [references/sse.md](references/sse.md).

## Content Security Policy

Expressions are compiled with `Function()`: the policy needs `unsafe-eval`. From v1.0.3, CSP
mode removes that need: `<html data-nonce="...">` with the nonce of `script-src`. It does not
make an expression built from user input safe: never interpolate untrusted text into a
`data-*` attribute.

## Bundles

`datastar.js` is the free bundle, an ES module: `<script type="module" src="...">`.
`datastar-rocket.js` adds Rocket, the web component API (`rocket(tag, {...})`), free from
v1.0.4 and in beta; load it instead of `datastar.js`, not beside it. The npm package
`@starfederation/datastar` is not maintained: take the bundle from the GitHub release.
