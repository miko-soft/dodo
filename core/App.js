import Router from './misc/Router.js';
import navig from './lib/navig.js';


/**
 * Single Page Application
 */
class App extends Router {

  constructor(appName) {
    super();

    this.$appName = appName || 'dodoApp';
    window[this.$appName] = { i18n: {} }; // window.dodoApp

    this.ctrls = {}; // { HomeCtrl: {}, Page1Ctrl: {}, ...}
    this.ctrlConstants = { $appName: this.$appName }; // {$appName, $fridge, $httpClient, $auth, $debugOpts,   $model, $modeler,   $dd, $elem}

    this.$debugOpts = {}; // select what debugger messages to show
    this.$preflight = []; // array of preflight functions, will be executed on every route before the controller's __loader()
    this.$postflight = []; // array of postflight functions, will be executed on every route ater the controller's __postrend()

    this._setAppStyle(); // set <style> tag
  }



  /*============================== CONTROLLER & WINDOW CONSTANTS ==============================*/
  /**
   * Set the $fridge property in all controllers.
   * Sometimes it's useful that all controllers have same property with the same value i.e. to share data across all controllers.
   * The $fridge object will be preserved during controller middleware execution. Other controller's properties will be deleted when controller is destroyed.
   * @param {object} $fridge - $fridge object
   * @return {App}
   */
  fridge($fridge) {
    this.ctrlConstants.$fridge = $fridge;
    return this;
  }


  /**
   * Set the $httpClient property in all controllers. It can be invoked with this.$httpClient in the controller.
   * @param {object} $httpClient - default HTTP Client
   * @return {App}
   */
  httpClient($httpClient) {
    this.ctrlConstants.$httpClient = $httpClient;
    return this;
  }


  /**
   * Inject the auth library in all controllers and use it as this.$auth in the controller.
   * Useful in apps where authentication guards are required in all routes, for example when building a web panel.
   * @param {Auth} $auth - Auth class instance
   * @return {App}
   */
  auth($auth) {
    // bindings because of this in Auth:login, logout, getLoggedUserInfo, etc methods, so the methods can be used in HTML, for example: dd-click="$auth.logout()"
    for (const ctrlName of Object.keys(this.ctrls)) {
      const $auth = this.ctrls[ctrlName]['$auth'];
      $auth.login = $auth.login.bind($auth);
      $auth.logout = $auth.logout.bind($auth);
      $auth.getLoggedUserInfo = $auth.getLoggedUserInfo.bind($auth);
      $auth.setLoggedUserInfo = $auth.setLoggedUserInfo.bind($auth);
      $auth.getJWTtoken = $auth.getJWTtoken.bind($auth);
    }
    this.ctrlConstants.$auth = $auth;
    return this;
  }


  /**
   * Set the global window.<appName>.i18n property, which is used in the View.loadI18n(langCode) method.
   * The language object $i18n can be loaded from various sources such as databases, files, browser storage, etc
   * It is not saved in the controller object to keep it as small as possible. The language $i18n object can be large and significantly increase the size of the controller object.
   * @param {object} $i18n - the language object i.e. object with language translations, for example {de: {common: {USERNAME: 'Nutzername'}, home: {TITLE: 'Startseite', LOGIN: 'Anmeldung'}}}
   */
  i18n($i18n) {
    window[this.$appName].i18n = $i18n;
    return this;
  }


  /**
   * Set the debug options.
   * @param {object} $debugOpts - debug options object (see conf/$debugOpts.js)
   * @return {App}
   */
  debug($debugOpts) {
    this.$debugOpts = $debugOpts;
    this.ctrlConstants.$debugOpts = this.$debugOpts;
    return this;
  }


  /*============================== MISC ==============================*/
  /**
   * Define preflight functions which will be executed before controller __loader() hook.
   * It will be executed on every controller.
   * @param {Function[]} $preflight - array of functions
   * @return {App}
   */
  preflight($preflight) {
    if (!Array.isArray($preflight)) { throw new Error('The $preflight is not array'); }
    for (const func of $preflight) { if (typeof func !== 'function') { throw new Error(`The $preflight func "${func}" is not a function`); } }
    this.$preflight = $preflight;
    return this;
  }


  /**
   * Define postflight functions which will be executed after controller __postrend() hook.
   * It will be executed on every controller.
   * @param {Function[]} $postflight - array of functions
   * @return {App}
   */
  postflight($postflight) {
    if (!Array.isArray($postflight)) { throw new Error('The $postflight is not array'); }
    for (const func of $postflight) { if (typeof func !== 'function') { throw new Error(`The $postflight func "${func}" is not a function`); } }
    this.$postflight = $postflight;
    return this;
  }


  /**
   * Define destroyflight function which will be executed when controller is destroyed i.e. when route is changed.
   * It will be executed on every controller.
   * It's useful to off() some event listeners.
   * @param {Function} $destroyflight - one function
   * @return {App}
   */
  destroyflight($destroyflight) {
    if (typeof $destroyflight !== 'function') { throw new Error(`The $destroyflight "${$destroyflight}" is not a function`); }
    this.ctrlConstants.$destroyflight = $destroyflight;
    return this;
  }



  /*============================== ROUTES ==============================*/
  /**
   * Define routes.
   * @param {string[][]} $routes
   * @return {object}
   */
  routes($routes) {
    for (const $route of $routes) {
      if (!$route || (!!$route && !Array.isArray($route)) || (!!$route && !$route.length)) { throw new Error(`Invalid route definition ${$route}`); }

      const cmd = $route[0]; // 'when', 'notfound', 'do', 'redirect'

      if (cmd === 'when') {
        const route = $route[1]; // '/page1'
        const Ctrl = $route[2]; // Page1Ctrl
        const routeOpts = $route[3] || {}; // {authGuards: ['autoLogin', 'isLogged', 'hasRole']}

        if (!Ctrl) { throw new Error(`Controller "${Ctrl.name}" is not defined or not injected in the App.`); }
        const ctrl = new Ctrl(this);

        this._saveController(Ctrl.name, ctrl);

        /* route middlewares */
        const navigMdw = navig.navigMdw.bind(navig, ctrl);
        const authGuards = routeOpts.authGuards || [];
        const preflight = this.$preflight;
        const controllerMdw = ctrl.controllerMdw.bind(ctrl);
        const postflight = this.$postflight;

        this.when(route, ...authGuards, navigMdw, ...preflight, controllerMdw, ...postflight);


      } else if (cmd === 'notfound') {
        const Ctrl = $route[1]; // NotfoundCtrl
        if (!Ctrl) { throw new Error(`Controller "${Ctrl.name}" is not defined or not injected in the App.`); }
        const ctrl = new Ctrl(this);

        this._saveController(Ctrl.name, ctrl);

        /* route middlewares */
        const navigMdw = navig.navigMdw.bind(navig, ctrl);
        const preflight = this.$preflight;
        const controllerMdw = ctrl.controllerMdw.bind(ctrl);
        const postflight = this.$postflight;

        this.notfound(navigMdw, ...preflight, controllerMdw, ...postflight);


      } else if (cmd === 'do') {
        const funcs = $route[1]; // array of functions which will be executed on every route [f1(trx)=>{...}, f2(trx)=>{...}, ...]
        this.do(...funcs);


      } else if (cmd === 'redirect') {
        const fromRoute = $route[1];
        const toRoute = $route[2];
        const cb = () => {
          window.history.pushState(null, '', toRoute); // change URL in the address bar
        };
        this.redirect(fromRoute, toRoute, cb);
      }
    }


    return {
      listen: this.listen.bind(this)
    };
  }



  /**
   * Listen for a specific route (URL) and execute the corresponding functions.
   */
  listen() {

    /**
     * Match routes against current browser URI and execute matched route.
     * @param {Event} pevent - pevent is popstate (back/forward browser button) or pushstate (click dd-href link) event (see navig.onUrlChange())
     * @return {void}
     */
    const exeRoute = async pevent => {
      let uri = navig.getCurrentURI(); // current uri is path + query string, without hash, for example: /page1.html?q=12
      uri = decodeURI(uri); // /sh/po%C5%A1ta?field=title --> /sh/pošta?field=title

      if (this.$debugOpts?.exeRoute) { console.log(`%c --------- exeRoute (start) "${uri}" ------`, 'color:#680C72; background:#E59FED'); }

      let trx = { uri, pevent };
      trx = await this.exe(trx).catch(err => console.error(err));

      if (trx && this.$debugOpts?.exeRoute) {
        console.log(' --------- exeRoute trx::', trx);
        console.log(`%c --------- exeRoute (end) "${uri}" -- elapsedTime: ${trx.elapsedTime} ------`, 'color:#680C72; background:#E59FED');
      }
    };

    // A1) test URI against routes when element with dd-href attribute is clicked --> 'pushstate'
    // A2) test URI against routes when BACK/FORWARD button is clicked --> 'popstate'
    // IMPORTANT: onUrlChange() listener must be defined before exeRoute()
    navig.onUrlChange(exeRoute);

    // B) test URI against routes when browser's Reload button is clicked
    exeRoute();
  }



  /*============================== PRIVATES ==============================*/
  /**
   * 1) Assign defined controller constants to all controllers.
   * 2) Save controller instances in the app.ctrls so every controller can be used in every controller.
   * @param  {string} CtrlName - controller name
   * @param  {object} ctrl - controller instance
   * @return {Controller}
   */
  _saveController(CtrlName, ctrl) {
    for (const [key, val] of Object.entries(this.ctrlConstants)) { ctrl[key] = val; }
    this.ctrls[CtrlName] = ctrl;
    return ctrl;
  }


  _setAppStyle() {
    const directives = [
      /* non-cloner directives */
      'dd-setinitial',
      'dd-elem',
      // switchers
      'dd-if', 'dd-elseif', 'dd-else',
      'dd-visible',
      // writers
      'dd-text',
      'dd-html',
      // HTML tag attribute managers
      'dd-value',
      'dd-disabled',
      'dd-checked',
      'dd-selected',
      'dd-class',
      'dd-style',
      'dd-src',
      'dd-attr',

      /* cloner directives */
      'dd-each',
      'dd-repeat'
    ];
    const directives_hide = directives.map(directive => `[${directive}-hide]`);
    const cssSelectors = directives_hide.join(',');

    const style = document.createElement('style');
    style.textContent = `${cssSelectors} { display: none !important; }`;
    style.setAttribute('type', 'text/css');
    document.head.appendChild(style);
  }



}


export default App;
