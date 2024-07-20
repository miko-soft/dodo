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



  /*============================== CONTROLLER & WINDOW CONSTANTS ==============================*/
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
   * Set the global window.<appNam>.i18n property, which is used in the View.loadI18n(langCode) method.
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
