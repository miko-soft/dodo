# Dd.js — Candidate Directives Inspired by Vue, React & Angular

Directives already covered: dd-if/elseif/else, dd-visible, dd-for (dd-each/each2/repeat),
dd-model, dd-text, dd-html, dd-class, dd-style, dd-attr, dd-click, dd-change, dd-keyup,
dd-enter, dd-evt, dd-src, dd-value, dd-disabled, dd-checked, dd-selected, dd-label,
dd-readonly, dd-required, dd-placeholder, dd-title, dd-data, dd-min, dd-max.

---

## HIGH PRIORITY

### Accessibility
- [ ] `dd-aria` — Set aria-* attributes dynamically (`dd-aria="$model.label --aria-label"`).
  Prefixes option with `aria-` automatically, same pattern as new `dd-data`.
  Equivalent to Vue `:aria-label` / React `aria-label={...}` / Angular `[attr.aria-label]`.

### Focus management
- [ ] `dd-focus` — Focus the element when condition is truthy (`dd-focus="$model.showSearch"`).
  Calls `elem.focus()` / `elem.blur()` depending on value.
  Equivalent to Vue's community `v-focus` directive.

### Render optimisation
- [ ] `dd-once` — Render the element only on the first render cycle; skip on all subsequent
  `render()` calls. Useful for static content inside reactive views.
  Equivalent to Vue `v-once`.

### Anti-FOUC
- [ ] `dd-cloak` — Attribute that hides an element (via CSS `[dd-cloak] { display:none }`)
  until the first `render()` completes, then removes the attribute.
  Equivalent to Vue `v-cloak`.

---

## MEDIUM PRIORITY

### Input constraints (form UX)
- [ ] `dd-maxlength` — Set `maxlength` attribute (`dd-maxlength="$model.limit"`).
- [ ] `dd-minlength` — Set `minlength` attribute (`dd-minlength="$model.minChars"`).
- [ ] `dd-step`      — Set `step` attribute for number/range/date inputs.
- [ ] `dd-pattern`   — Set `pattern` attribute for regex validation on text inputs.

### Media / layout
- [ ] `dd-alt`    — Set `alt` attribute on images (`dd-alt="$model.imageDescription"`).
- [ ] `dd-width`  — Set `width` attribute dynamically (img, canvas, video).
- [ ] `dd-height` — Set `height` attribute dynamically.

### Interaction
- [ ] `dd-tabindex` — Set `tabindex` dynamically to control keyboard navigation order.
- [ ] `dd-contenteditable` — Toggle `contenteditable` boolean attribute.
- [ ] `dd-download` — Set `download` attribute on anchor tags.

### Textarea
- [ ] `dd-rows` — Set `rows` attribute on textarea dynamically.
- [ ] `dd-cols` — Set `cols` attribute on textarea dynamically.

---

## LOWER PRIORITY / COMPLEX

### Event modifier options (Vue-style)
- [ ] `--debounce:<ms>` option for `dd-model` / `dd-set` — delay model update until user stops typing.
  Equivalent to Vue `v-model.lazy` / React controlled input with debounce.
- [ ] `--throttle:<ms>` option for `dd-click` / `dd-keyup` — limit handler fire rate.

### Animation / transition
- [ ] `dd-animate` — Add a CSS animation class when a model value changes, then remove it after
  the animation ends (`animationend` event). Good for highlight/flash feedback.
- [ ] `dd-transition` — Apply enter/leave CSS transition classes when `dd-if` or `dd-visible`
  toggles an element (like Vue `<transition>`).

### Structural / advanced
- [ ] `dd-pre`  — Skip all directive processing for the element and its subtree.
  Useful for displaying raw template syntax in docs. Equivalent to Vue `v-pre`.
- [ ] `dd-key`  — Hint to the cloner (`dd-each`) for stable element identity across re-renders,
  reducing unnecessary DOM recreation. Equivalent to Vue `:key` / React `key` / Angular `trackBy`.

---

## FROM ANGULAR

### Switch/case conditional (Angular `*ngSwitch`)
- [ ] `dd-switch` + `dd-case` + `dd-switchdefault` — Multi-branch conditional rendering based on
  a single expression value. More readable than a chain of `dd-if/dd-elseif` when matching one
  variable against many fixed values.
  ```html
  <div dd-switch="$model.status">
    <p dd-case="'active'">Active</p>
    <p dd-case="'pending'">Pending</p>
    <p dd-switchdefault>Unknown</p>
  </div>
  ```
  Equivalent to Angular `*ngSwitch` / `*ngSwitchCase` / `*ngSwitchDefault`.

### Async rendering (Angular `async` pipe)
- [ ] `dd-async` — Resolve a Promise or Observable stored in a model property, then render the
  resolved value as text/html. Removes the need to manually `await` in `__init()` for display-only
  data.
  ```html
  <p dd-async="$model.userPromise"></p>
  ```
  Equivalent to Angular `{{ obs$ | async }}`.

### Wrapper-free structural rendering (Angular `ng-container`)
- [ ] `dd-container` — A virtual grouping element (like `<template>`) that applies structural
  directives (`dd-if`, `dd-each`) without inserting an extra DOM node. Solves the case where a
  wrapper `<div>` would break table/flex/grid layout.
  ```html
  <dd-container dd-if="$model.show">
    <td>col1</td><td>col2</td>
  </dd-container>
  ```
  Equivalent to Angular `<ng-container>` / Vue `<template>`.

### Single-property style binding (Angular `[style.color]`)
- [ ] `--prop` option on `dd-style` — Bind a single CSS property directly without passing a whole
  object. Cleaner syntax when only one property changes.
  ```html
  <p dd-style="$model.textColor --color">Hello</p>
  <div dd-style="$model.size --font-size">Text</div>
  ```
  Equivalent to Angular `[style.color]="value"` / Vue `:style="{ color: value }"`.

### Single-class conditional binding (Angular `[class.active]`)
- [ ] `--if` option on `dd-class` — Toggle a single named class based on a boolean condition,
  without passing a class-name string from the model.
  ```html
  <li dd-class="$model.isActive --active --if">item</li>
  ```
  Equivalent to Angular `[class.active]="isActive"` / Vue `:class="{ active: isActive }"`.

### Template reference / content projection (Angular `ng-content`)
- [ ] `dd-slot` — Named insertion point for projecting HTML content into a loaded view, enabling
  simple component-like composition without a full component system.
  Equivalent to Angular `<ng-content select="[slot]">` / Vue `<slot>`.
