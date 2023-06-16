import eventEmitter from './eventEmitter.js';


/**
 * The container for saving current and previous uri and controller.
 * Manage the URL in browser's address bar.
 */
class Navig {

  constructor() {
    this.previous = { uri: '', ctrl: null };
    this.current = { uri: '', ctrl: null };
  }



  /********** SETTERS & RESETTERS ********/
  /**
   * Set previous uri and controller.
   */
  _setPrevious() {
    this.previous = { ...this.current };
  }

  /**
   * Set current uri and controller.
   * @param {Controller} ctrl - instance of the current controller
   */
  _setCurrent(ctrl) {
    const uri = this.getCurrentURI();
    this.current = { uri, ctrl };
  }


  /**
   * Reset the previous controller properties and execute __destroy()
   */
  async _resetPreviousController() {
    const ctrl_prev = this.previous.ctrl;
    if (!ctrl_prev) { return; }

    await ctrl_prev.__destroy(); // execute __destroy() defined in the previous controller

    ctrl_prev.ddUNLISTEN(); // kill the previous controller event listeners
    ctrl_prev.emptyModel(); // empty the previous controller $model

    // purge non-standard controller properties i.e. proprties without $ prefix
    const ctrlProps = Object.keys(ctrl_prev);
    for (const ctrlProp of ctrlProps) {
      if (
        // App.js
        ctrlProp !== '$appName' &&
        ctrlProp !== '$auth' &&
        ctrlProp !== '$fridge' &&
        ctrlProp !== '$httpClient' &&
        ctrlProp !== '$debugOpts' &&

        // Model.js
        ctrlProp !== '$model' &&
        ctrlProp !== '$modeler' &&

        // Dd.js
        ctrlProp !== '$dd'
      ) {
        delete ctrl_prev[ctrlProp];
      }
    }

    // purge standard sub-properties
    ctrl_prev.$dd.elems = {};
    ctrl_prev.$dd.listeners = [];
    ctrl_prev.$model = {};

  }


  /**
   * Router middleware used in App.js
   * @param {Controller} ctrl - instance of the current controller
   */
  async navigMdw(ctrl) {
    navig._setPrevious(); // set previous uri and ctrl
    await navig._resetPreviousController(); // reset previous controller and execute __destroy()
    navig._setCurrent(ctrl); // set the current uri and ctrl
  }



  /********** GETTERS ************/
  /**
  * Get the current URI. The uri is path + query string, without hash, for example: /page1.html?q=12
  * @returns {string}
  */
  getPrevioustURI() {
    return this.previous.uri;
  }

  /**
   * Get the current URI. The uri is path + query string, without hash, for example: /page1.html?q=12
   * @returns {string}
   */
  getCurrentURI() {
    return window.location.pathname + window.location.search;
  }






  /********** EVENT LISTENERS ************/
  /**
   * Listen for the 'pushstate' event.
   * The pushstate hapen when element with dd-href attribute is clicked.
   * @param {Function} listener - callback function with event parameter, for example pevent => { ... }
   * @returns {void}
   */
  onPushstate(listener) {
    eventEmitter.on('pushstate', listener);
  }


  /**
   * Listen for the 'popstate' event.
   * The popstate event is fired each time when the current history entry changes (user navigates to a new state).
   * That happens when user clicks on browser's Back/Forward button or when history.back(), history.forward(), history.go() methods are programatically called.
   * Also popstate event occur when the a.href link is clicked (even if it contains only hashtag, for example: <a href="#">test</a>).
   * The event.state is property of the event is equal to the history state object.
   * @param {Function} listener - callback function with event parameter, for example pevent => { ... }
   * @returns {void}
   */
  onPopstate(listener) {
    window.addEventListener('popstate', listener);
  }


  /**
   * Listen for the 'hashchange' event.
   * This happens when window.location.hash is changed. For example /product#image --> /product#description
   * @param {Function} listener - callback function with event parameter, for example pevent => { ... }
   * @returns {void}
   */
  onHashchange(listener) {
    window.addEventListener('hashchange', listener);
  }


  /**
   * Listen for the URL changes.
   * The URL is contained of path and search query but without hash, for example: /page1.html?q=12.
   * @param {Function} listener - callback function with event parameter, for example pevent => { ... }
   * @returns {void}
   */
  onUrlChange(listener) {
    this.onPushstate(listener);
    this.onPopstate(listener);
  }



  /************ NAVIGATION METHODS ************/
  /**
   * Navigates to a view using an absolute URL path. The controller middlewares will be executed.
   * https://developer.mozilla.org/en-US/docs/Web/API/History/pushState
   * @param {string} url - absolute URL path, /customer/product/25?limit=25
   * @param {any} state - the state data. Fetch it with event.detail
   * @param {string} title
   */
  goto(url, state, title) {
    if (!url) { throw new Error('The argument "url" is not defined'); }
    if (!state) { state = {}; }
    if (!title) { title = ''; }
    state = { ...state, url };
    window.history.pushState(state, title, url); // change URL in the browser address bar
    eventEmitter.emit('pushstate', state); // pushstate event to activate controller in the router.js
  }

  /**
   * Just change the browser URL and do not execute controller middlewares.
   * @param {string} url - absolute URL path, /customer/product/25?limit=25
   * @param {any} state - the state data. Fetch it with event.detail
   * @param {string} title
   */
  goblind(url, state, title) {
    if (!url) { throw new Error('The argument "url" is not defined'); }
    if (!state) { state = {}; }
    if (!title) { title = ''; }
    state = { ...state, url };
    window.history.pushState(state, title, url); // change URL in the browser address bar
  }

  /**
   * Go forward like forward button is clicked.
   */
  forward() {
    window.history.forward();
  }

  /**
   * Go back like back button is clicked.
   */
  back() {
    window.history.back();
  }

  /**
   * Loads a specific page from the session history.
   * You can use it to move forwards and backwards through the history depending on the delta value.
   * @param {number} delta - history index number, for example: -1 is like back(), and 1 is like forward()
   */
  history(delta) {
    window.history.go(delta);
  }

  /**
   * Reloads the page like refresh button is clicked.
   */
  reload() {
    window.location.reload();
  }


}


const navig = new Navig();

export default navig;
