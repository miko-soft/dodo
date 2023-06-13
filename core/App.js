import Router from './misc/Router.js';
import navig from './lib/navig.js';


class App extends Router {

  constructor(appName) {
    super();

    this.$appName = appName || 'dodoApp';
    window[this.$appName] = { i18n: {} }; // window.dodoApp

    this.$debugOpts = {};

    this.ctrls = {}; // { HomeCtrl: {}, Page1Ctrl: {}, ...}
    this.ctrlConstants = { $appName: this.$appName, $fridge: {} }; // {$appName, $fridge, $httpClient, $auth, $debugOpts,   $model, $modeler,   $dd}
  }



  /*============================== CONTROLLER CONSTANTS ==============================*/
  /**
   * Set the subproperty of the controller's $fridge property in all controllers.
   * Sometimes it's useful that all controllers have same property with the same value i.e. to share data across all controllers.
   * The $fridge object will be preserved during controller middleware execution. Other controller's properties will be deleted when controller is destroyed.
   * @param {string} name - $fridge property name
   * @param {any} val - value
   * @return {App}
   */
  fridge(name, val) {
    this.ctrlConstants.$fridge[name] = val;
    return this;
  }


  /**
   * Set the $httpClient property in all controllers. It can be invoked with this.$httpClient in the controller.
   * @param {object} $httpClient - default HTTP Client to fetch views
   * @return {App}
   */
  httpClient($httpClient) {
    this.ctrlConstants.$httpClient = $httpClient;
    return this;
  }


  /**
   * Inject the auth library into the all controllers and use it as this.$auth in the controller.
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
   * Set the debug options.
   * @param {object} $debugOpts - default HTTP Client to fetch views
   * @return {App}
   */
  debug($debugOpts) {
    this.$debugOpts = $debugOpts;
    this.ctrlConstants.$debugOpts = this.$debugOpts;
    return this;
  }



  /**
   * Set the global, window i18n property.
   * Language object can be loaded from database, files, browser storage or some other sources.
   * If input argument "i18n" is undefined the Vite Glob Import https://vitejs.dev/guide/features.html will be used by default.
   * @param {object} i18n - object with language translations, for example {de: {common: {USERNAME: 'Nutzername'}, home: {TITLE: 'Startseite', LOGIN: 'Anmeldung'}}}
   */
  async i18n(i18n) {
    if (!i18n) {
      const modules = await import.meta.glob('/i18n/**/*.json');

      i18n = {};

      for (const path in modules) { // path: /i18n/en/home.json
        const module = await modules[path]();
        const path_parts = path.split('/');
        const lang = path_parts[2];
        const jsonFile = path_parts[3].replace('.json', '');

        if (!i18n[lang]) {
          i18n[lang] = {};
          i18n[lang][jsonFile] = module;
        } else {
          i18n[lang][jsonFile] = module;
        }

      }

    }

    window[this.$appName].i18n = i18n;
  }



  /*============================== ROUTES ==============================*/
  /**
   * Define routes.
   * @param {string[][]} $routes
   * @return {App}
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
        const controllerMdw = ctrl.controllerMdw.bind(ctrl);

        this.when(route, ...authGuards, navigMdw, controllerMdw);


      } else if (cmd === 'notfound') {
        const Ctrl = $route[1]; // NotfoundCtrl
        if (!Ctrl) { throw new Error(`Controller "${Ctrl.name}" is not defined or not injected in the App.`); }
        const ctrl = new Ctrl(this);

        this._saveController(Ctrl.name, ctrl);

        /* route middlewares */
        const navigMdw = navig.navigMdw.bind(navig, ctrl);
        const controllerMdw = ctrl.controllerMdw.bind(ctrl);

        this.notfound(navigMdw, controllerMdw);


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
   * Listen for specific route (URL) and execute it.
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

      if (this.$debugOpts.exeRoute) { console.log(`%c --------- exeRoute (start) "${uri}" ------`, 'color:#680C72; background:#E59FED'); }

      let trx = { uri, pevent };
      trx = await this.exe(trx).catch(err => console.error(err.message));

      if (trx && this.$debugOpts.exeRoute) {
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
   * @param  {Class[]} Ctrls - array of controller classes
   * @return {Controller}
   */
  _saveController(CtrlName, ctrl) {
    for (const [key, val] of Object.entries(this.ctrlConstants)) { ctrl[key] = val; }
    this.ctrls[CtrlName] = ctrl;
    return ctrl;
  }



}


export default App;
