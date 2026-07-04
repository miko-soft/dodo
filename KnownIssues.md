# Known Issues

## Promise.all / parallel constructs inside `__init()` cause broken rendering

**Status:** Unresolved

**File:** `core/mvc/Controller.js`

### Problem

`__initFinished = true` is set immediately after `__init()` returns. The model proxy uses this flag to suppress `render()` calls during initialization. If a developer uses `Promise.all()` (or `Promise.race`, `Promise.allSettled`, `Promise.any`) inside `__init()` and one of the parallel calls **fails**, `Promise.all` rejects early (fail-fast), `__init` returns, `__initFinished = true` is set — while the surviving in-flight promise is still running as an orphaned microtask. When it later resolves and sets `$model.xxx`, it triggers a partial `render()` out of sequence, corrupting the render state.

No warning or error is emitted. The developer sees broken rendering with no indication of the cause.

### Reproduce

```js
async __init(trx) {
  this.$model.networks = [];
  this.$model.users = [];
  await Promise.all([this.loadNetworks(), this.loadUsers()]); // ← breaks if one rejects
}
```

### Workaround

Use sequential awaits in `__init()`:

```js
async __init(trx) {
  this.$model.networks = [];
  this.$model.users = [];
  await this.loadNetworks();
  await this.loadUsers();
}
```

### Root cause

`__initFinished = true` is placed between `__init` and `__rend` in `controllerMdw`. Any async continuation that escapes `__init` scope (orphaned promise) fires after this flag is set and incorrectly triggers reactive renders.

### Desired fix

Delay `__initFinished = true` until after the initial full `render()` completes, so orphaned promises resolving mid-render cannot trigger a partial re-render.
