/**
 * One Page Application
 * - no routes i.e. one controller i.e. one page
 * ( No routes like in Single Page Application (App.js), it's just one HTML page. )
 * An application with just one page that doesn't require a dedicated HTTP Server.
 * It can be easily hosted via the file system, making it convenient for browser extensions.
 */
class AppOne {

  constructor(appName) {

    this.$appName = appName || 'dodoAppOne';
    window[this.$appName] = { i18n: {} }; // window.dodoApp

    this.ctrls = {}; // { HomeCtrl: {} } - always will be just one controller
    this.ctrlConstants = { $appName: this.$appName, $fridge: {} }; // {$appName, $fridge, $httpClient, $auth, $debugOpts,   $model, $modeler,   $dd, $elem}

    this.$debugOpts = {}; // select what debugger messages to show

    this._setAppStyle(); // set <style> tag
  }



  /*============================== CONTROLLER CONSTANTS ==============================*/
  /**
   * Set the $httpClient property in the controller. It can be invoked with this.$httpClient in the controller.
   * @param {object} $httpClient - default HTTP Client to fetch views
   * @return {App}
   */
  httpClient($httpClient) {
    this.ctrlConstants.$httpClient = $httpClient;
    return this;
  }


  /**
   * Inject the auth library in the controller and use it as this.$auth in the controller.
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



  /*============================== CONTROLLER ==============================*/
  /**
   * Define and execute controller.
   * @param {class} Ctrl - controller class
   */
  controller(Ctrl) {
    if (!Ctrl) { throw new Error(`Controller "${Ctrl.name}" is not defined or not injected in the App.`); }

    const ctrl = new Ctrl(this);
    const controllerMdw = ctrl.controllerMdw.bind(ctrl);
    controllerMdw();

    this._saveController(Ctrl.name, ctrl);
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


export default AppOne;
