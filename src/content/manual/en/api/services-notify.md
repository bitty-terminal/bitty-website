# bitty.services, Notify & State

This page documents service discovery, desktop notifications, persistent plugin storage, and asynchronous timer schedulers.

## Service Provider Bus (`bitty.services`)

The service bus lets plugins discover and consume versioned capabilities provided by peer plugins through the host, without coupling to external files or source code. Bitty Core itself provides no built-in services: the directory starts empty, entries appear only via `bitty.services.provide`, and resolution requires a matching `services.required` declaration in the consumer's manifest (undeclared lookups fail closed).

### Providing and Consuming Services

```lua
-- Provider side: publish an interface table (the version lives in the
-- manifest: [services.provided] "my-plugin.formatter" = "1.2.0")
bitty.services.provide("my-plugin.formatter", {
  format = function(text) return text end,
})

-- Consumer side (the requirement lives in the manifest first):
-- [services.required]
-- "my-plugin.formatter" = "^1.0"
local formatter = bitty.services.get("my-plugin.formatter")
if formatter then
  local result = formatter.format("hello")
end
```

- Deterministic pick: the highest satisfying version wins; ties break by provider id. Unparseable requirements or versions satisfy nothing (fail-closed).
- `bitty.services.get(iface, opts)`: `opts.version` overrides the manifest requirement text (never substitutes for the declaration); `opts.optional = true` returns `nil` instead of `E_SERVICE_RESOLUTION` when unresolvable. Providing an undeclared interface fails with `E_SERVICE_UNDECLARED`.

---

## Desktop Notifications (`bitty.notify`)

Displays native desktop notifications when the `platform.notify` capability is granted.

### `bitty.notify.show(payload)`

```lua
local accepted = bitty.notify.show({
  title = "Build Complete",
  body = "Compilation finished in 4.2 seconds.",
  urgency = "normal", -- "low" | "normal" | "critical"
})
```

- **Parameters**:
  - `title` (`string`): Bounded title string (rendered by host).
  - `body` (`string`): Optional notification body.
  - `urgency` (`string`): Priority level (`"low"`, `"normal"`, or `"critical"`).
- **Returns**: `boolean` — `true` if accepted by the host notification queue.

---

## Key-Value Storage (`bitty.store`)

Each plugin receives a sandboxed, generation-isolated persistent key-value store. Data survives across restarts and plugin reloads.

```lua
-- Save a state value
bitty.store.set("last_sync_key", "snapshot-2026-10-08")

-- Retrieve a saved value
local last_sync = bitty.store.get("last_sync_key")

-- Clear a key by setting nil
bitty.store.set("temporary_cache", nil)
```

- **Quotas**: Bounded per plugin — 8 KiB per value (`STORE_MAX_VALUE_BYTES`), 256 entries (`STORE_MAX_ENTRIES`), 64 KiB total (`STORE_MAX_TOTAL_BYTES`), 128-byte keys (`STORE_MAX_KEY_BYTES`). Overflow fails closed with error `E_STORE_QUOTA` before any mutation.

---

## Timers (`bitty.timers`)

High-precision asynchronous timer scheduler managed directly by Bitty Core's unified event loop. Lua code never blocks the main thread with sleep loops:

```lua
-- Create a timer delayed by milliseconds
local timer_handle = bitty.timers.create(1000, function()
  bitty.notify.show({
    title = "Timer",
    body = "Fired after 1 second",
  })
end)

-- Cancel an active timer
local cancelled = bitty.timers.cancel(timer_handle)
```

- **`bitty.timers.create(delay_ms, callback)`**: Schedules a callback execution after `delay_ms`. Returns an integer handle.
- **`bitty.timers.cancel(handle)`**: Cancels a pending timer handle. Returns `true` if successfully removed.
