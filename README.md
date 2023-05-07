# DoDo
> The DoDo is easy to learn JavaScript framework which helps developers to build reactive, single page applications.

It can be used for mobile applications, browser extensions, electron desktop apps, ...etc.

The Dodo Framework is not based on UI components like Angular 2+, Vue and React but on Model-View-Controller what makes Dodo more simple and flexible.
The inspiration was found in Angular 1, so Dodo conception is similar to it.

Built in modern ES 6+ Javascript.


## Features
- no npm package dependencies (build apps which will not depend on 3rd party code)
- no typescript, no heavy compiling, no bullshit
- create lightweight applications - small app file size (<100kB only)
- use import &amp; export <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules" target="_blank">ES Modules</a> to build complex apps with clear and readable code
- Model-View-Controller (MVC), intuitive app structure
- easy to learn and easy to use
- create very fast applications with reactive features
- shorten your development time rapidly
- steep learning curve (you'll reach high programming skills very fast)


## Libraries
The framework contains many pre-built libraries:
- Auth - authentication, route guards (protect routes from unauthorized access)
- BrowserStorage
- Cookie
- Form - work with HTML forms
- HTTPClient - default HTTP Client library for accesing APIs
- Paginator - library for page pagination
- util - misc utilities


## Good for dynamic and reactive code in:
- browser single page applications (ajax apps)
- browser extensions
- ElectronJs desktop applications
- Cordova mobile applications


## Installation
```bash
$ npm install @mikosoft/dodo
```


## Quickstart
*How to start a new project in DoDo framework ?*
Very simple. Just run the command and the boilerplate code will be installed.
```bash
$ npm init dodo "yourProjectName"
```





## Example
```javascript
import { App, corelib } from '@mikosoft/dodo';

// conf
import { $debugOpts, $viewsCached, $auth, $httpClient } from './app/conf/index.js';


// controllers
import HomeCtrl from './controllers/HomeCtrl.js';
import QuickstartCtrl from './controllers/QuickstartCtrl.js';
import NotfoundCtrl from './controllers/NotfoundCtrl.js';

         
// routes
const $routes = [
  ['when', '/', HomeCtrl],
  ['when', '/quickstart', QuickstartCtrl],
  ['notfound', NotfoundCtrl]
];


// app
const app = new App();
app
  .viewsCached($viewsCached)
  .auth($auth)
  .httpClient($httpClient)
  .debug($debugOpts);

app
  .routes($routes)
  .listen();
```


## Documentation
Tutorials and examples are available at [http://dodo.mikosoft.info](http://dodo.mikosoft.info)


### Licence
Copyright (c) [MikoSoft](http://mikosoft.info) licensed under [MIT](./LICENSE).
