# DoDo
> The DoDo is simple and intuitive JavaScript framework for browser single page applications, mobile applications, browser extensions, electronJS desktop apps, ...etc.

## Features
- no slow compilation as in Angular, Vue or React
- no npm package dependencies - build apps which will not depend on 3rd party code
- no typescript, no heavy compiling, no bullshit
- create lightweight applications - small app file size (<100kB only)
- use import &amp; export <a href="https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules" target="_blank">ES Modules</a> to build complex apps with clear and readable code
- Model-View-Controller (MVC), intuitive app structure
- easy to learn and easy to use
- create very fast applications with reactive features
- shorten your development time rapidly
- steep learning curve (you'll reach high programming skills very fast)


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
How to start a new project in DoDo framework ?
Simply clone the DoDo Skel source code.
```bash
$ git clone https://github.com/miko-soft/dodo-skel.git <projectName>
$ cd <projectName>

// remove .git and start new one
$ rm -rf .git
$ git init

// install npm packages
$ npm install

// start the development
$ npm run dev           -> watch the file changes
```

Run in the browser http://localhost:3333 .
The skel contains an example page. Now you can add/modify your routes, controllers, views, etc.





## Example
```javascript
import { App, corelib } from 'dodo';

// conf
import { $debugOpts } from './conf/index.js';


// controllers
import HomeCtrl from './controllers/HomeCtrl.js';
import QuickstartCtrl from './controllers/QuickstartCtrl.js';
import NotfoundCtrl from './controllers/NotfoundCtrl.js';

         
// routes
const routes = [
  ['when', '/', 'HomeCtrl'],
  ['when', '/quickstart', 'QuickstartCtrl'],
  ['notfound', 'NotfoundCtrl']
];


// app
const app = new App();
app</small>
  .controllers([
    HomeCtrl,
    QuickstartCtrl,
    NotfoundCtrl
  ])
  .routes(routes)
  .debugger($debugOpts);
```


## Documentation
[http://dodo.mikosoft.info](http://dodo.mikosoft.info)


### Licence
Copyright (c) MikoSoft licensed under [MIT](./LICENSE).
