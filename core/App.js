import AppRouter from './router/AppRouter.js';
import navig from './lib/navig.js';
import HTTPClient from './lib/HTTPClient.js';
import debugOpts from './conf/$debugOpts.js';


class App {

  constructor() {
    this.ctrls = {}; // { ctrlName1: {}, ctrlName2: {} }
    this.$debugOpts = debugOpts; // object with the debug parameters -- {ddFor: true, ddShow: false}
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
    this._httpClient();
    return this;
  }



  /**
   * Set the subproperty of the controller's $fridge property in all controllers.
   * Sometimes it's useful that all controllers have same property with the same value i.e. to share data across all controllers.
   * The $fridge object will be preserved during controller processing execution. Other controller's properties will be deleted when controller is destroyed.
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
   * Define preflight functions which will be executed on every route, before the controller processing() i.e. before __loader().
   * Never define $model in the preflight function because it will triger render() before __loader() has been finished the rendering process.
   * Define it before the routes() method.
   * @param {Function[]} funcs - array of preflight functions (app, trx) => { ... }
   * @returns {App}
   */
  preflight(...funcs) {
    this._controllerProp('$preflight', funcs);
    return this;
  }


  /**
   * Define postflight functions which will be executed on every route, after the controller processing(), i.e. after the __postrend().
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
   * Inject ached views i.e. HTML content (strings) converted to JSON.
   * Useful to speed up the HTML view load time.
   * @param {object} viewsObj - HTML content as JS object: {'inc/footer.html':'<b>footer<b>', ...}
   * @returns {App}
   */
  viewsCached(viewsObj) {
    this._controllerProp('$viewsCached', viewsObj);
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
    // so the methods can be used in HTML, for example: dd-click="$auth.logout()"
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
   * Define the debugging options. Set the controller's $debugOpts property.
   * @param {object} $debugOpts
   * @returns {App}
   */
  debugger($debugOpts) {
    if (!!$debugOpts) { this.$debugOpts = $debugOpts; }
    this._controllerProp('$debugOpts', this.$debugOpts);
    return this;
  }


  /**
   * Define routes
   * @param {string[][]} routesCnf
   * @returns {App}
   */
  routes(routesCnf) {
    const approuter = new AppRouter(this.$debugOpts.router, this.$debugOpts.dodoRouter);

    for (const routeCnf of routesCnf) {
      if (!routeCnf || (!!routeCnf && !Array.isArray(routeCnf)) || (!!routeCnf && !routeCnf.length)) { throw new Error(`Invalid route definition ${routeCnf}`); }

      const cmd = routeCnf[0]; // 'when', 'notfound', 'do', 'redirect'

      if (cmd === 'when') {
        const route = routeCnf[1]; // '/page1'
        const ctrlName = routeCnf[2]; // 'Page1Ctrl'
        const routeOpts = routeCnf[3]; // {authGuards: ['autoLogin', 'isLogged', 'hasRole']}
        if (!this.ctrls[ctrlName]) { throw new Error(`Controller "${ctrlName}" is not defined or not injected in the App.`); }
        const ctrl = this.ctrls[ctrlName];
        approuter._when(route, ctrl, routeOpts);

      } else if (cmd === 'notfound') {
        const ctrlName = routeCnf[1]; // 'NotfoundCtrl'
        if (!this.ctrls[ctrlName]) { throw new Error(`Controller "${ctrlName}" is not defined or not injected in the App.`); }
        const ctrl = this.ctrls[ctrlName];
        approuter._notfound(ctrl);

      } else if (cmd === 'do') {
        const funcs = routeCnf.filter((routeCnfElem, key) => { if (key !== 0) { return routeCnfElem; } });
        approuter._do(...funcs);

      } else if (cmd === 'redirect') {
        const fromRoute = routeCnf[1];
        const toRoute = routeCnf[2];
        approuter._redirect(fromRoute, toRoute);
      }
    }


    // test URI against routes when browser's Reload button is clicked
    approuter._exe();

    // A) test URI against routes when element with dd-href attribute is clicked --> 'pushstate'
    // B) test URI against routes when BACK/FORWARD button is clicked --> 'popstate'
    navig.onUrlChange(pevent => {
      approuter._exe(pevent); // pevent is popstate or pushstate event (see navig.onUrlChange())
    });

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



  /********* PRIVATES ********/
  /**
   * Define a controller property which starts with $ prefix, for example ctrl.$fridge.
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
   * The $httpClient and $baseURIhost are used in View.js to fetch HTML and other resource from the server.
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



}


export default App;
