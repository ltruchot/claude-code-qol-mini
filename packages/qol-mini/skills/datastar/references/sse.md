# SSE events and morphing

Datastar v1.0.4. A response with `Content-Type: text/event-stream` carries any number of the
two events below. A `data:` line holds one name, a space, then the value; a multi-line value
repeats the name on each line.

## `datastar-patch-elements`

```text
event: datastar-patch-elements
data: mode append
data: selector #list
data: elements <li id="item-7">Seven</li>
```

| Line | Values | Default |
|---|---|---|
| `elements` | HTML, one line per `data: elements` | none, as with `mode remove` |
| `selector` | CSS selector of the target | the `id` of each top-level element |
| `mode` | `outer`, `inner`, `replace`, `prepend`, `append`, `before`, `after`, `remove` | `outer` |
| `namespace` | `svg`, `mathml` | HTML |
| `useViewTransition` | `true`, `false` | `false` |
| `viewTransitionSelector` | CSS selector (v1.0.2) | the document |

- `outer` and `inner` morph. `replace` swaps the element: its state, focus included, is lost.
- Every mode except `outer` and `replace` needs `selector`.
- An SVG or MathML fragment needs `namespace`, or it is parsed as HTML.

## `datastar-patch-signals`

```text
event: datastar-patch-signals
data: onlyIfMissing true
data: signals {"user": {"name": "Ada"}, "draft": null}
```

A JSON Merge Patch: an object merges, `null` removes the signal. `onlyIfMissing` writes only
the signals that do not exist yet.

## Morphing

- A top-level element is matched by `id`. Without a selector, an `id` that matches nothing
  means no patch and a console warning.
- Inside it, an element without an `id` is matched by position and tag name: it is usually
  kept, and can be rebuilt when its siblings move. Put an `id` on whatever holds state: a
  focused input, an open `<details>`, a playing video, a scroll container.
- The morph removes every attribute the incoming markup does not have. `data-show`,
  `data-class`, `data-attr` and `data-style` put theirs back, one microtask later.
- `data-preserve-attr` is read on the **incoming** element: send it in the markup.
- `data-ignore-morph` protects an element when both the element in the page and the incoming
  one carry it, or when an ancestor in the page does.
- `data-init` on an element that the morph keeps unchanged does not run again.

## Running a script

There is no script event. Send an element:

```text
event: datastar-patch-elements
data: mode append
data: selector body
data: elements <script data-effect="el.remove()">console.log("hello")</script>
```

## SDKs

Versions do not follow the bundle: Go `v1.2.2`, TypeScript `@starfederation/datastar-sdk`
`1.0.0`, PHP `starfederation/datastar-php` `1.0.1`. Each has a signal reader, `PatchElements`,
`PatchSignals` and `ExecuteScript`.

```go
import "github.com/starfederation/datastar-go/datastar"

sse := datastar.NewSSE(w, r)
sse.PatchElements(`<div id="status">Saved</div>`)
sse.PatchElements(`<li id="item-7">Seven</li>`,
    datastar.WithSelector("#list"), datastar.WithModeAppend())
sse.PatchSignals([]byte(`{"sending": false}`))
```

- Go options are functions: `WithSelector`, `WithSelectorID`, `WithMode...`,
  `WithNamespaceSVG`, `WithUseViewTransitions`, `WithOnlyIfMissing`. `datastar.ReadSignals(r, &v)`
  reads the query for `GET` and `DELETE`, the body otherwise.
- Compression is an option of `NewSSE`: `datastar.WithCompression(datastar.WithBrotli())`.
- `NewSSE` does not set `X-Accel-Buffering: no`: behind a buffering proxy, set it yourself.
