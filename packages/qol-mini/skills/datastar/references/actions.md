# Backend actions

Datastar v1.0.4.

## Options

```html
<button data-on:click="@post('/save', {contentType: 'form', openWhenHidden: true})">Save</button>
```

| Option | Values | Default |
|---|---|---|
| `contentType` | `'json'`, `'form'` | `'json'` |
| `filterSignals` | `{include: /regex/, exclude: /regex/}` | excludes any path with a segment starting with `_` |
| `selector` | CSS selector of the form to send, with `contentType: 'form'` | the closest form |
| `headers` | object | none |
| `openWhenHidden` | boolean | `false` for `@get`, `true` for the others |
| `payload` | object sent instead of the signals | the signals |
| `retry` | `'auto'`, `'error'`, `'always'`, `'never'` | `'auto'`: network errors only |
| `retryInterval`, `retryScaler`, `retryMaxWait`, `retryMaxCount` | milliseconds, factor, milliseconds, count | 1000, 2, 30000, 10 |
| `requestCancellation` | `'auto'`, `'cleanup'`, `'disabled'`, an `AbortController` | `'auto'` |

- `contentType: 'form'` sends the form fields and no signals, as
  `application/x-www-form-urlencoded`, or as multipart when the form has
  `enctype="multipart/form-data"`. The form is validated first unless it has `novalidate`.
- `'auto'` cancellation: a new request cancels the one in flight with the same method and URL,
  whichever element started it (v1.0.2).
- The name is `retryMaxWait`; `retryMaxWaitMs` is the name before v1.0.0.

## A response that is not a stream

| Content type | Effect | Response headers read |
|---|---|---|
| `text/html` | patched as elements | `datastar-selector`, `datastar-mode`, `datastar-use-view-transition` |
| `application/json` | patched as signals | `datastar-only-if-missing` |
| `text/javascript` | executed | `datastar-script-attributes` |

## Request lifecycle: `datastar-fetch`

Dispatched on `document`, not on the element. `evt.detail` is `{type, el, argsRaw}`; `el` is
the element that started the request.

| `type` | When |
|---|---|
| `started` | the request leaves |
| `finished` | the response ended |
| `error` | status 400 or above; `argsRaw.status` holds it, as a string |
| `retrying` | a retry is scheduled |
| `retries-failed` | `retryMaxCount` is reached |

```html
<div data-on:datastar-fetch="evt.detail.type === 'error' && ($failed = true)"></div>
```

This event is the only place a failed request shows: without a listener, an error status
changes nothing on the page.

## Other actions

- `@peek(() => $x)`: reads a signal without subscribing to it.
- `@setAll(value, {include, exclude})`, `@toggleAll({include, exclude})`: write several signals.
