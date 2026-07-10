import Model from './Model.js';


/**
 * Controller controls the whole HTML document, not just component like in other SPA frameworks.
 * Controller constants:
 * App.js -> $fridge, $httpClient, $auth, $debugOpts
 * Model.js -> $model, $modeler
 * Dd.js -> $dd, $elem
 */
class Controller extends Model {

  constructor() {
    super();
    this.__initFinished = false; // is __init() lifecycle hook executed

    // One debounce timer per $model property name.
    // If the same property is set multiple times before the timer fires, only the last value renders.
    // Example: this.$model.items = [] followed immediately by this.$model.items = [1,2,3]
    // schedules two timers for 'items', but the first is cancelled — only [1,2,3] renders.
    this._renderTimers = {};

    // A global promise chain that makes all renders run one after another, never at the same time.
    // Problem without this: _doRender() updates the DOM, waits 30ms, then re-attaches all listeners.
    // If two renders run at the same time (e.g. 'wallets' and 'dexpools'), both hit ddUNLISTEN()
    // during their 30ms gap and rip out each other's listeners, leaving the page broken.
    // With this queue: each render waits for the previous one to fully finish before starting.
    this._renderQueue = Promise.resolve();
  }


  /**
   * Controller router middleware.
   * @param {object} trx - router transitional variable
   * @returns {Promise<void>}
   */
  async controllerMdw(trx) {
    // Re-initialize render infrastructure on every navigation.
    // _resetPreviousController() in navig.js deletes all _ -prefixed properties when leaving a route,
    // so these must be restored here before any $model assignment triggers render().
    this._renderTimers = {};
    this._renderQueue = Promise.resolve();

    // model processes
    this.proxifyModel(); // set $model as proxy object
    this.modeler(); // define this.$modeler methods

    // controller hooks
    try { await this.__loader(trx); } catch (err) { console.error(err); }
    this.ddLazyjs('after__loader'); // render dd-lazyjs

    this.prerender();

    try { await this.__init(trx); } catch (err) { console.error(err); }
    this.__initFinished = true;

    try { await this.__rend(trx); } catch (err) { console.error(err); }
    this.ddLazyjs('after__rend'); // render dd-lazyjs

    try { await this.__postrend(trx); } catch (err) { console.error(err); }
    this.ddLazyjs('after__postrend'); // render dd-lazyjs
  }





  /************* LIFECYCLE HOOK METHODS ***********/
  /**
   * LOAD HTML
   * Load the page views, includes, lazy loads, etc... Use "View" methods here.
   * @param {object} trx - DoDo router transitional variable
   * @returns {Promise<void>}
   */
  async __loader(trx) { throw new Error('The controller method __loader() is not defined. You probably got a blank screen.'); }

  /**
   * LOAD DATA
   * Init the controller properties (set initial values).
   * @param {object} trx - DoDo router transitional variable
   * @returns {Promise<void>}
   */
  async __init(trx) { }

  /**
   * REND HTML AND DATA
   * Render dd- elements.
   * @param {object} trx - DoDo router transitional variable
   * @returns {Promise<void>}
   */
  async __rend(trx) { await this.render(); }

  /**
   * Execute after rend.
   * @param {object} trx - DoDo router transitional variable
   * @returns {Promise<void>}
   */
  async __postrend(trx) { }

  /**
   * Destroy the controller when the dd-href element is clicked (see parse.href()).
   * - removes all dd-... element lsiteners
   * @returns {Promise<void>}
   */
  async __destroy() { }






  /************ RENDER METHODS ***********/
  /**
   * Render dd- elements that depend on the given $model property.
   *
   * TWO CASES:
   *
   * 1. render() — no modelName — called by __rend() on page load.
   *    Runs _doRender() immediately so `await this.render()` blocks until the page is fully ready.
   *
   * 2. render('dexpools') — modelName provided — called automatically by the $model proxy
   *    every time you write  this.$model.dexpools = something.
   *    Uses two protections to prevent broken listener state:
   *
   *    a) DEBOUNCE per modelName (setTimeout 0):
   *       Waits until the current JS code finishes before rendering — like an elevator waiting
   *       for everyone to step in before leaving. If the same property is set several times in a
   *       row (e.g. reset to [] then filled with data), the intermediate renders are cancelled
   *       and only the last value renders.
   *
   *    b) SERIAL QUEUE (_renderQueue):
   *       Even renders for different properties ('wallets', 'dexpools', etc.) are lined up and
   *       run one after another, never at the same time. This is needed because _doRender() has
   *       a 30ms pause inside it between DOM update and listener re-attachment. Without the queue,
   *       two renders running at once would both call ddUNLISTEN() and tear out each other's
   *       listeners, leaving buttons and selects unresponsive.
   *
   * @param {string} modelName - e.g. 'dexpools' for this.$model.dexpools; undefined for full render
   * @param {number} renderDelay - ms gap between DOM update and listener re-attachment (default 30)
   * @returns {Promise<void>}
   */
  render(modelName, renderDelay = 30) {
    // Case 1 — full render on page load. Run immediately so the caller can await it.
    if (modelName === undefined) {
      return this._doRender(modelName, renderDelay);
    }

    // Case 2 — reactive render triggered by a $model assignment.

    // DEBOUNCE: if a timer for this modelName is already waiting, cancel it and start a new one.
    // Only the most recent value wins — intermediate assignments don't trigger wasted renders.
    if (this._renderTimers[modelName]) {
      clearTimeout(this._renderTimers[modelName].timer);
      this._renderTimers[modelName].resolve();
    }
    return new Promise(resolve => {
      this._renderTimers[modelName] = {
        resolve,
        timer: setTimeout(() => {
          delete this._renderTimers[modelName];
          // SERIAL QUEUE: wait for the previous render to fully finish, then run this one.
          // Prevents ddUNLISTEN() in one render from removing listeners attached by another.
          this._renderQueue = this._renderQueue
            .then(() => this._doRender(modelName, renderDelay))
            .then(resolve);
        }, 0),
      };
    });
  }


  /**
   * The actual render work: updates the DOM then re-attaches all event listeners.
   * Never call this directly — always go through render() which handles debounce and serialization.
   * @param {string} modelName
   * @param {number} renderDelay
   */
  async _doRender(modelName, renderDelay = 30) {
    this._debug('render', `--------- render (start) -- ctrl: ${this.constructor.name} -- renderDelay: ${renderDelay}  ------`, 'green', '#D9FC9B');

    /* DdCloners.js */
    this.ddEach(modelName);
    this.ddEach2(modelName);
    this.ddEntries(modelName);
    this.ddRepeat(modelName);

    /* Dd.js */
    this.ddElem(modelName);
    // writers
    this.ddText(modelName);
    this.ddHtml(modelName);
    // attribute managers
    this.ddValue(modelName);
    this.ddDisabled(modelName);
    this.ddChecked(modelName);
    this.ddSelected(modelName);
    this.ddClass(modelName);
    this.ddStyle(modelName);
    this.ddSrc(modelName);
    this.ddLabel(modelName);
    this.ddAttr(modelName);
    this.ddReadonly(modelName);
    this.ddRequired(modelName);
    this.ddPlaceholder(modelName);
    this.ddTitle(modelName);
    this.ddData(modelName);
    this.ddMin(modelName);
    this.ddMax(modelName);
    // switchers
    this.ddIf(modelName);
    this.ddVisible(modelName);

    // remove dd-render-disabled & // remove dd-render-enabled
    this._purgeDdRender('disabled');
    this._purgeDdRender('enabled');

    await new Promise(r => setTimeout(r, renderDelay));

    /* DdListeners.js */
    this.ddUNLISTEN();
    this.ddHref();
    this.ddSet();
    this.ddModel();
    this.ddClick();
    this.ddEnter();
    this.ddKeyup();
    this.ddChange();
    this.ddEvt();
    this.ddOutclick();   // fires when user clicks outside the element (dropdowns, modals, tooltips)
    this.ddIntersect();  // fires when element enters viewport via IntersectionObserver (lazy load, scroll animations)
    this.ddSwipe();      // fires on touch swipe with optional direction filter (carousels, side drawers)

    this._debug('render', `--------- render (end) -- ctrl: ${this.constructor.name} ------`, 'green', '#D9FC9B');
  }


  /**
   * Render before __init() lifecycle hook because that hook can take longer if it is waiting for response from some API
   */
  prerender() {
    this.ddSetinitial();
    this.ddHref();
  }



}

export default Controller;
