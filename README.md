# DoDo Framework

> A lightweight JavaScript framework for building reactive single-page applications — no build tools, no TypeScript, no complexity.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](package.json)

DoDo is a modern frontend framework built on the **MVC pattern** (Model-View-Controller). If you've used Angular 1 or similar frameworks, you'll feel right at home. Unlike React, Vue, or Angular 2+, DoDo does **not** use components — instead, a single **Controller** manages the whole page.

---

## Why DoDo?

- **No build step** — write plain ES6+ JavaScript, open in the browser, done
- **No TypeScript required** — just JavaScript
- **No dependencies** — zero external packages
- **Familiar MVC pattern** — easy to reason about and test
- **Reactive `$model`** — change a property, the HTML updates automatically
- **Built-in utilities** — HTTP client, auth, forms, cookies, storage, events

---

## Installation

```bash
npm install --save @mikosoft/dodo
```

Or scaffold a full project instantly:

```bash
npm init dodo
```

---

## How It Works — The Big Picture

DoDo apps follow a simple flow:

```
URL changes  →  Router matches route  →  Controller runs  →  View renders
```

1. The **App** listens for URL changes.
2. When a URL matches a route, DoDo runs the corresponding **Controller**.
3. The Controller loads HTML views, sets data on `$model`, and calls `render()`.
4. DoDo processes all `dd-*` directives in the HTML and updates the DOM.

---

## Quick Start

### 1. Entry point — `app.js`

```javascript
import { App } from '@mikosoft/dodo';
import { $auth, $httpClient, $debugOpts } from './conf/index.js';

import HomeCtrl from './controllers/HomeCtrl.js';
import AboutCtrl from './controllers/AboutCtrl.js';
import NotfoundCtrl from './controllers/NotfoundCtrl.js';

const $routes = [
  ['when', '/',       HomeCtrl],
  ['when', '/about',  AboutCtrl],
  ['notfound',        NotfoundCtrl]
];

const app = new App('myApp');
app
  .auth($auth)
  .httpClient($httpClient)
  .debug($debugOpts);

app
  .routes($routes)
  .listen();          // start listening for URL changes
```

### 2. Controller — `HomeCtrl.js`

```javascript
import { Controller } from '@mikosoft/dodo';

class HomeCtrl extends Controller {

  // 1. Load HTML views from files
  async __loader(trx) {
    await this.loadView('#main', '/views/home.html');
  }

  // 2. Set initial data
  async __init(trx) {
    this.$model.title = 'Welcome to DoDo!';
    this.$model.users = [];
  }

  // 3. Render dd-* directives in the HTML
  async __rend(trx) {
    await this.render();
  }

  // 4. Run code after the page is rendered (attach plugins, fetch data, etc.)
  async __postrend(trx) {
    const resp = await this.$httpClient.get('/api/users');
    this.$model.users = resp.data;
    await this.render('users'); // re-render only the 'users' part
  }

}

export default HomeCtrl;
```

### 3. View — `home.html`

```html
<h1 dd-text="$model.title"></h1>

<ul>
  <li dd-each="users" dd-text="$model.name"></li>
</ul>

<a dd-href="/about">Go to About</a>
```

That's it. When `$model.users` is set, calling `render('users')` updates only the `dd-each="users"` part of the page.

---

## App vs AppOne

| | `App` | `AppOne` |
|---|---|---|
| Routing | Yes — multiple routes/pages | No — single page only |
| Use case | SPAs, web panels | Browser extensions, simple tools |

```javascript
// Multi-page app with routing
import { App } from '@mikosoft/dodo';
const app = new App('myApp');
app.routes($routes).listen();

// Single page, no routing needed
import { AppOne } from '@mikosoft/dodo';
const app = new AppOne('myApp');
app.controller(MyCtrl);
```

---

## Controller Lifecycle

Every controller runs its hooks in this order:

```
__loader()  →  __init()  →  __rend()  →  __postrend()
```

| Hook | Purpose |
|---|---|
| `__loader(trx)` | Load HTML views/partials into the DOM |
| `__init(trx)` | Set initial values on `$model` |
| `__rend(trx)` | Call `render()` to process all `dd-*` directives |
| `__postrend(trx)` | Run code after rendering (fetch data, init plugins) |
| `__destroy()` | Cleanup listeners when navigating away |

The `trx` object carries route information:

```javascript
async __loader(trx) {
  console.log(trx.uri);          // '/users/42'
  console.log(trx.params);       // { id: '42' }
  console.log(trx.query);        // { sort: 'asc' }
}
```

---

## Directives Reference

Directives are special `dd-*` HTML attributes that DoDo processes during `render()`.

### Data Binding

| Directive | Description | Example |
|---|---|---|
| `dd-text` | Sets text content | `<p dd-text="$model.name"></p>` |
| `dd-html` | Sets inner HTML | `<div dd-html="$model.richContent"></div>` |
| `dd-model` | Two-way binding (input ↔ `$model`) | `<input dd-model="$model.email">` |
| `dd-value` | Sets the `value` attribute | `<input dd-value="$model.count">` |
| `dd-set` | One-way: input → `$model`, no re-render | `<input dd-set="$model.search">` |
| `dd-label` | Sets label text | `<label dd-label="$model.fieldName"></label>` |
| `dd-placeholder` | Sets placeholder text | `<input dd-placeholder="$model.hint">` |
| `dd-title` | Sets title attribute | `<span dd-title="$model.tooltip"></span>` |
| `dd-data` | Sets data-* attributes | `<div dd-data="id::$model.userId"></div>` |

### Conditionals

| Directive | Description | Example |
|---|---|---|
| `dd-if` | Show element if truthy | `<div dd-if="$model.isAdmin">...</div>` |
| `dd-elseif` | Else-if branch | `<div dd-elseif="$model.isMod">...</div>` |
| `dd-else` | Else branch | `<div dd-else>...</div>` |
| `dd-visible` | Toggle CSS `display` (element stays in DOM) | `<div dd-visible="$model.show">...</div>` |

### Loops

| Directive | Description | Example |
|---|---|---|
| `dd-each` | Iterate an array | `<li dd-each="users" dd-text="$model.name"></li>` |
| `dd-each2` | Iterate a sub-array inside a `dd-each` row | nested lists |
| `dd-entries` | Iterate an object's key/value pairs | `<li dd-entries="settings"></li>` |
| `dd-repeat` | Repeat element N times | `<div dd-repeat="5">★</div>` |

### Attributes

| Directive | Description |
|---|---|
| `dd-class` | Add/remove CSS classes dynamically |
| `dd-style` | Set inline styles |
| `dd-disabled` | Disable form elements |
| `dd-readonly` | Set readonly attribute |
| `dd-required` | Set required attribute |
| `dd-checked` | Checkbox / radio checked state |
| `dd-selected` | Select option selected state |
| `dd-src` | Image or media `src` attribute |
| `dd-attr` | Any attribute dynamically |
| `dd-min` / `dd-max` | Input min/max attributes |

### Events

| Directive | Description | Example |
|---|---|---|
| `dd-click` | Click event | `<button dd-click="save()">Save</button>` |
| `dd-change` | Change event | `<select dd-change="onSelect()">` |
| `dd-keyup` | Keyup event (optional key filter `--13`) | `<input dd-keyup="search()">` |
| `dd-enter` | Enter key shortcut | `<input dd-enter="submit()">` |
| `dd-evt` | Any DOM event via `--<eventName>` | `<div dd-evt--mouseover="onHover()">` |
| `dd-outclick` | Fires when clicking **outside** the element | dropdowns, modals |
| `dd-intersect` | Fires when element enters the viewport | lazy loading, animations |
| `dd-swipe` | Fires on touch swipe (optional direction filter) | carousels, drawers |

### Navigation & DOM

| Directive | Description | Example |
|---|---|---|
| `dd-href` | Client-side navigation (no page reload) | `<a dd-href="/about">About</a>` |
| `dd-elem` | Expose DOM element as `this.$elem.<name>` | `<canvas dd-elem="chart"></canvas>` |
| `dd-setinitial` | Read element value into `$model` on load | `<input dd-setinitial="$model.lang">` |

---

## Built-in Libraries

All libraries are available from `corelib`:

```javascript
import { corelib } from '@mikosoft/dodo';
const { Auth, HTTPClient, HTTPClientFetch, Form, Cookie, BrowserStorage, Paginator, eventEmitter, navig, util } = corelib;
```

### Auth
JWT-based authentication with cookie support, route guards, auto-login, and role-based access control. Inject it into the app via `app.auth($auth)` — then use `this.$auth` inside any controller.

### HTTPClient / HTTPClientFetch
Two HTTP clients (XMLHttpRequest and Fetch API). Support GET, POST, PUT, DELETE, PATCH, request/response interceptors, automatic retries, and custom headers. Inject via `app.httpClient($httpClient)`.

### Form
Reads and writes HTML form values to/from `$model`. Handles text, checkbox, radio, select, and file inputs with optional validation and type conversion.

### Cookie & BrowserStorage
- **Cookie** — get/set/delete cookies with expiry, secure, and domain options
- **BrowserStorage** — simple wrappers around `localStorage` and `sessionStorage`

### Paginator
Handles paginated data: calculates page ranges, total pages, and navigation state.

### EventEmitter
Pub/sub event bus for decoupled communication between controllers:
```javascript
eventEmitter.emit('user:loggedIn', userData);
eventEmitter.on('user:loggedIn', (data) => { ... });
```

### Navig
Programmatic navigation and URL utilities:
```javascript
navig.goto('/dashboard');
navig.getCurrentURI(); // '/dashboard?tab=stats'
```

### Util
General-purpose helpers for type checking, object cloning, string manipulation, and more.

---

## App Configuration

```javascript
const app = new App('myApp');

app.auth($auth)              // inject Auth instance → available as this.$auth in controllers
app.httpClient($httpClient)  // inject HTTP client → available as this.$httpClient
app.debug($debugOpts)        // control which debug messages appear in the console
app.fridge($fridge)          // shared data object that persists across route changes → this.$fridge
app.i18n($i18n)              // translations object → used by View.loadI18n(langCode)
app.preflight([fn1, fn2])    // functions that run before every controller's __loader()
app.postflight([fn1, fn2])   // functions that run after every controller's __postrend()
app.destroyflight(fn)        // function that runs when any controller is destroyed (route change)
app.ssr()                    // enable SSR mode — dispatches 'ssr-ready' window event after first route renders
```

### Route definitions

```javascript
const $routes = [
  ['when',     '/users/:id',  UserCtrl,     { authGuards: ['isLogged'] }],
  ['when',     '/login',      LoginCtrl],
  ['redirect', '/home',       '/'],         // redirect /home → /
  ['do',       [logFn]],                    // run on every route change
  ['notfound', NotfoundCtrl]
];
```

---

## Supported Environments

- Standard browsers (Chrome, Firefox, Safari, Edge)
- Browser extensions
- Electron desktop apps
- Cordova / PhoneGap mobile apps
- Progressive Web Apps (PWAs)

---

## Documentation

Full documentation, tutorials, and live examples:

**[http://dodo.mikosoft.info](http://dodo.mikosoft.info)**

---

## Links

- **GitHub:** [https://github.com/miko-soft/dodo](https://github.com/miko-soft/dodo)
- **Author:** Mikodanic Sasa — smikodanic@gmail.com
- **License:** [MIT](./LICENSE)
