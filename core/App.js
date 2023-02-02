import Router from './router/Router.js';
import navig from './lib/navig.js';
import HTTPClient from './lib/HTTPClient.js';
import debugOpts from './conf/$debugOpts.js';


class App {

  constructor() {
    this.ctrls = {}; // { ctrlName1: {}, ctrlName2: {} }
    this.$debugOpts = debugOpts; // object with the debug parameters -- {ddFor: true, ddIf: false}
    window.dodoGlob = {}; // init global variable
  }

  /*============================== CONTROLLERS ==============================*/
  /**
   * Create controller instances and inject into the app.ctrls.
   * @param  {Class[]} Ctrls - array of controller classes
   * @returns {App}
   */
  controllers(Ctrls) {
    for (const Ctrl of Ctrls) {
      const ctrl = new Ctrl(this);
      this.ctrls[Ctrl.name] = ctrl;
    }
    this._httpClient(); // define ctrl.$httpClient and ctrl.$baseURIhost
    return this;
  }


  /**
   * Define controller property/value. Sometimes it's useful that all controllers have same property with the same value.
   * @param {string} name - controller property name
   * @param {any} val - value
   * @returns
   */
  _controllerProp(name, val) {
    const controllersCount = Object.keys(this.ctrls).length;
    if (controllersCount === 0) { throw new Error(`The controller property "${name}" should be defined after the method controllers().`); }
    for (const ctrlName of Object.keys(this.ctrls)) { this.ctrls[ctrlName][name] = val; }
    return this;
  }


  /**
   * Set the $httpClient and $baseURIhost property in all controllers.
   * The $httpClient is the default controller's HTTP client. It can be invoked with this.$httpClient in the controller.
   * The $httpClient is used in View.js.
   * For methods see lib/HttpClient.
   * @returns {App}
   */
  _httpClient() {
    const opts = {
      encodeURI: true,
      timeout: 21000,
      retry: 0,
      retryDelay: 1300,
      maxRedirects: 0,
      headers: {
        'authorization': '',
        'accept': '*/*', // 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
        'content-type': 'text/html; charset=UTF-8'
      }
    };
    const httpClient = new HTTPClient(opts);
    this._controllerProp('$httpClient', httpClient);

    const baseURIhost = `${window.location.protocol}//${window.location.host}`; // http://localhost:4400
    this._controllerProp('$baseURIhost', baseURIhost);

    return this;
  }


  /**
   * Set the subproperty of the controller's $fridge property in all controllers.
   * The $fridge object will be preserved during controller processing execution. Other controller's properties will be deleted.
   * @param {string} name - $fridge property name
   * @param {any} val - value
   * @returns {App}
   */
  fridge(name, val) {
    const controllersCount = Object.keys(this.ctrls).length;
    if (controllersCount === 0) { throw new Error(`The $fridge property "${name}" should be defined after the method controllers().`); }
    for (const ctrlName of Object.keys(this.ctrls)) { this.ctrls[ctrlName]['$fridge'][name] = val; }
    return this;
  }


  /**
   * Inject the auth library into the all controllers and use it as this.$auth in the controller.
   * Useful in apps where authentication guards are required in all routes, for example when building a web panel.
   * @param {Auth} auth - Auth class instance
   * @returns {App}
   */
  auth(auth) {
    this._controllerProp('$auth', auth);

    // bindings because of this in Auth:login, logout, getLoggedUserInfo, etc methods,
    // so the methods can be used in HTML, for example: data-dd-click="$auth.logout()"
    for (const ctrlName of Object.keys(this.ctrls)) {
      const $auth = this.ctrls[ctrlName]['$auth'];
      $auth.login = $auth.login.bind($auth);
      $auth.logout = $auth.logout.bind($auth);
      $auth.getLoggedUserInfo = $auth.getLoggedUserInfo.bind($auth);
      $auth.setLoggedUserInfo = $auth.setLoggedUserInfo.bind($auth);
      $auth.getJWTtoken = $auth.getJWTtoken.bind($auth);
    }

    return this;
  }


  /**
   * Define preflight functions which will be executed on every route, before the controller processing() i.e. before loader().
   * Never define $model in the preflight function because it will triger render() before loader().
   * Define it before the routes() method.
   * @param {Function[]} funcs - array of preflight functions (app, trx) => { ... }
   * @returns {App}
   */
  preflight(...funcs) {
    this._controllerProp('$preflight', funcs);
    return this;
  }


  /**
   * Define postflight functions which will be executed on every route, after the controller processing(), i.e. after the postrend().
   * Here the $model can be defined (what wil trigger the render()).
   * Define it before the routes() method.
   * @param {Function[]} funcs - array of preflight functions (app, trx) => { ... }
   * @returns {App}
   */
  postflight(...funcs) {
    this._controllerProp('$postflight', funcs);
    return this;
  }


  /**
   * Define routes
   * @param {string[][]} routesCnf
   * @returns {App}
   */
  routes(routesCnf) {
    const router = new Router(this.$debugOpts.router, this.$debugOpts.dodoRouter);

    for (const routeCnf of routesCnf) {
      if (!routeCnf || (!!routeCnf && !Array.isArray(routeCnf)) || (!!routeCnf && !routeCnf.length)) { throw new Error(`Invalid route definition ${routeCnf}`); }

      const cmd = routeCnf[0]; // 'when', 'notfound', 'do', 'redirect'

      if (cmd === 'when') {
        const route = routeCnf[1]; // '/page1'
        const ctrlName = routeCnf[2]; // 'Page1Ctrl'
        const routeOpts = routeCnf[3]; // {authGuards: ['autoLogin', 'isLogged', 'hasRole']}
        if (!this.ctrls[ctrlName]) { throw new Error(`Controller "${ctrlName}" is not defined or not injected in the App.`); }
        const ctrl = this.ctrls[ctrlName];
        router._when(route, ctrl, routeOpts);

      } else if (cmd === 'notfound') {
        const ctrlName = routeCnf[1]; // 'NotfoundCtrl'
        if (!this.ctrls[ctrlName]) { throw new Error(`Controller "${ctrlName}" is not defined or not injected in the App.`); }
        const ctrl = this.ctrls[ctrlName];
        router._notfound(ctrl);

      } else if (cmd === 'do') {
        const funcs = routeCnf.filter((routeCnfElem, key) => { if (key !== 0) { return routeCnfElem; } });
        router._do(...funcs);

      } else if (cmd === 'redirect') {
        const fromRoute = routeCnf[1];
        const toRoute = routeCnf[2];
        router._redirect(fromRoute, toRoute);
      }
    }


    // test URI against routes when browser's Reload button is clicked
    router._exe();

    // A) test URI against routes when element with data-dd-href attribute is clicked --> 'pushstate'
    // B) test URI against routes when BACK/FORWARD button is clicked --> 'popstate'
    navig.onUrlChange(pevent => {
      router._exe(pevent); // pevent is popstate or pushstate event (see navig.onUrlChange())
    });

    return this;
  }


  /**
   * Inject the content of the tmp/cache/views.json.
   * Useful to speed up the HTML view load, especially in data-dd-inc elements.
   * @param {object} viewsCached - the content of the tmp/cache/views.json file
   * @returns {App}
   */
  viewsCached(viewsCached) {
    // this.controllerProp('viewsCached', viewsCached);
    window.dodoGlob.viewsCached = viewsCached;
    return this;
  }


  /**
   * Define the debugging options. Set the controller's $debugOpts property.
   * @param {object} $debugOpts
   * @returns {App}
   */
  debugger($debugOpts) {
    if (!!$debugOpts) { this.$debugOpts = $debugOpts; }
    this._controllerProp('$debugOpts', this.$debugOpts);
    return this;
  }



  /********** EVENTS **********/
  /**
   * Fired when HTML doc with the all resources is loaded.
   * https://developer.mozilla.org/en-US/docs/Web/API/GlobalEventHandlers/onload
   * @param {Function} cb - callback, () => { ... }
   */
  onReady(cb) {
    window.onload = cb;
  }


  /**
   * Fired when HTML doc is loaded without CSS, IMG and other resources.
   * https://developer.mozilla.org/en-US/docs/Web/API/Window/DOMContentLoaded_event
   * @param {Function} cb - callback, event => { ... }
   */
  onDOMLoaded(cb) {
    document.addEventListener('DOMContentLoaded', cb);
  }


  /**
   * Listen for the DOM changes. Creates app.DOMObserver.
   * How to use:
   * app.createDOMObserver((mutationsList, observer) => { ... });
   * const targetNode = document.querySelector('p#my-id); const config = { attributes: true, childList: true, subtree: true };
   * app.DOMObserver.observe(targetNode, config);
   * To stop observing use: app.DOMObserver.disconnect();
   * https://developer.mozilla.org/en-US/docs/Web/API/MutationObserver
   * @param {Function} cb - callback, (mutationsList, observer) => { ... }
   */
  createDOMObserver(cb) {
    this.DOMObserver = new MutationObserver(cb);
  }


}


export default App;
