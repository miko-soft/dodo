# DoDo Framework

> An easy-to-learn JavaScript framework for building reactive single-page applications

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Version](https://img.shields.io/badge/version-0.9.22-blue.svg)](package.json)

DoDo is a modern, lightweight JavaScript framework that helps developers build reactive single-page applications. Unlike component-based frameworks like Angular 2+, Vue, and React, DoDo uses a Model-View-Controller (MVC) architecture, making it simpler and more flexible. Inspired by Angular 1, DoDo provides an intuitive approach to building dynamic web applications.

---

## ✨ Features

- **🚀 Blazing Fast** - Optimized for performance with minimal overhead
- **📦 Zero Dependencies** - Lightweight framework with no external dependencies
- **🎯 Simple & Intuitive** - MVC architecture makes it easy to learn and use
- **⚡ Modern ES6+** - Built with modern JavaScript (ES Modules)
- **🔄 Reactive** - Automatic DOM updates when data changes
- **🛠️ Built-in Libraries** - Authentication, HTTP client, form handling, and more
- **🌐 Universal** - Works in browsers, browser extensions, Electron, and Cordova apps
- **📝 No TypeScript Required** - Pure JavaScript, no compilation step needed

---

## 🎯 Use Cases

DoDo is perfect for building:

- **Single Page Applications (SPAs)** - Dynamic, AJAX-powered web apps
- **Browser Extensions** - Lightweight extensions with reactive UI
- **Desktop Applications** - Electron-based desktop apps
- **Mobile Applications** - Cordova/PhoneGap mobile apps
- **Progressive Web Apps (PWAs)** - Modern web applications

---

## 📦 Installation

```bash
npm install --save @mikosoft/dodo
```

---

## 🚀 Quick Start

### Create a New Project

The easiest way to start a new DoDo project is using the project generator:

```bash
npm init dodo
```

This command will set up a boilerplate project with all the necessary structure.

### Basic Example

```javascript
import { App, corelib } from '@mikosoft/dodo';

// Configuration
import { $debugOpts, $auth, $httpClient } from './app/conf/index.js';

// Controllers
import HomeCtrl from './controllers/HomeCtrl.js';
import QuickstartCtrl from './controllers/QuickstartCtrl.js';
import NotfoundCtrl from './controllers/NotfoundCtrl.js';

// Define routes
const $routes = [
  ['when', '/', HomeCtrl],
  ['when', '/quickstart', QuickstartCtrl],
  ['notfound', NotfoundCtrl]
];

// Initialize and configure the app
const app = new App('myApplication');
app
  .auth($auth)
  .httpClient($httpClient)
  .debug($debugOpts);

// Set up routes and start listening
app
  .routes($routes)
  .listen();
```

---

## 📚 Core Libraries

DoDo includes a comprehensive set of built-in libraries for common tasks:

### 🔐 Auth
Authentication and authorization with JWT token support, route guards, and user session management.

**Features:**
- JWT token handling
- Cookie-based authentication
- Route protection (guards)
- Auto-login functionality
- Role-based access control

### 🌐 HTTPClient
HTTP client library for making API requests with support for:
- GET, POST, PUT, DELETE, PATCH methods
- Request/response interceptors
- Automatic retries on timeout
- Redirect handling
- Custom headers and options

### 📋 Form
Helper library for working with HTML forms:
- Form control value management
- Validation support
- Type conversion
- Multiple input types (text, checkbox, radio, file, etc.)

### 🍪 Cookie & BrowserStorage
Utilities for managing browser storage:
- **Cookie** - Cookie management with expiration, secure flags, and domain options
- **BrowserStorage** - LocalStorage and SessionStorage wrappers

### 📄 Paginator
Pagination library for handling paginated data display.

### 🛠️ Util
Miscellaneous utility functions for common operations.

---

## 🏗️ Architecture

### MVC Pattern

DoDo follows the Model-View-Controller architecture:

- **Model** - Data layer with reactive properties
- **View** - Presentation layer with declarative directives
- **Controller** - Logic layer that connects Model and View

### Directives

DoDo uses declarative HTML directives for data binding:

```html
<!-- Text binding -->
<div dd-text="$model.userName"></div>

<!-- Event handling -->
<button dd-click="logout()">Logout</button>

<!-- Conditional rendering -->
<div dd-if="isLoggedIn">Welcome!</div>

<!-- Loops -->
<ul>
  <li dd-each="users" dd-text="$model.name"></li>
</ul>

<!-- Two-way binding -->
<input dd-model="$model.email" type="email">
```

### Controller Lifecycle

Controllers have lifecycle hooks:

- `__loader(trx)` - Load views and resources
- `__init(trx)` - Initialize controller properties
- `__rend(trx)` - Render the view
- `__postrend(trx)` - Execute after rendering
- `__destroy()` - Cleanup when controller is destroyed

---

## 📖 Documentation

For comprehensive documentation, tutorials, and examples, visit:

**[http://dodo.mikosoft.info](http://dodo.mikosoft.info)**

---

## 🔧 API Overview

### App Class

The main application class for Single Page Applications.

```javascript
const app = new App('appName');

// Configuration methods
app.auth($auth)              // Set authentication
app.httpClient($httpClient)  // Set HTTP client
app.debug($debugOpts)        // Set debug options
app.fridge($fridge)          // Set shared data container
app.i18n($i18n)              // Set internationalization

// Route configuration
app.routes($routes).listen() // Define routes and start
```

### AppOne Class

For single-page applications (no routing):

```javascript
const app = new AppOne('appName');
app.controller(MyController);
```

### Controller Class

Base class for controllers:

```javascript
class MyController extends Controller {
  async __loader(trx) {
    // Load views
  }
  
  async __init(trx) {
    // Initialize
    this.$model.userName = 'John';
  }
  
  async __rend(trx) {
    // Render
    await this.render();
  }
}
```

---

## 🎨 Directives Reference

### Data Binding
- `dd-text` - Text content binding
- `dd-html` - HTML content binding
- `dd-value` - Input value binding
- `dd-model` - Two-way data binding

### Event Handlers
- `dd-click` - Click events
- `dd-change` - Change events
- `dd-keyup` - Keyup events
- `dd-enter` - Enter key events

### Conditionals
- `dd-if` - Conditional rendering
- `dd-elseif` - Else-if condition
- `dd-else` - Else condition
- `dd-visible` - Visibility toggle

### Loops
- `dd-each` - Array iteration
- `dd-repeat` - Repeated rendering

### Attributes
- `dd-class` - Dynamic CSS classes
- `dd-style` - Dynamic styles
- `dd-disabled` - Disable elements
- `dd-checked` - Checkbox/radio state
- `dd-selected` - Select option state
- `dd-src` - Image source
- `dd-attr` - Dynamic attributes

### Navigation
- `dd-href` - Client-side navigation

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📄 License

Copyright (c) [MikoSoft](http://mikosoft.info)

Licensed under the [MIT License](./LICENSE)

---

## 🔗 Links

- **Homepage:** [http://dodo.mikosoft.info](http://dodo.mikosoft.info)
- **GitHub:** [https://github.com/miko-soft/dodo](https://github.com/miko-soft/dodo)
- **Author:** Mikodanic Sasa <smikodanic@gmail.com>

---

## 💡 Why DoDo?

DoDo is designed for developers who want:
- **Simplicity** - No complex build tools or configuration
- **Flexibility** - MVC architecture gives you control
- **Performance** - Lightweight and fast
- **Productivity** - Built-in libraries for common tasks
- **Modern JavaScript** - Uses ES6+ features without transpilation complexity

If you're looking for a framework that's easy to learn, powerful, and doesn't require TypeScript or complex build configurations, DoDo might be the perfect choice for your next project.

