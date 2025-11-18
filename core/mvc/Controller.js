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
  }


  /**
   * Controller router middleware.
   * @param {object} trx - router transitional variable
   * @returns {Promise<void>}
   */
  async controllerMdw(trx) {
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
   * Render the view i.e. the dd- elements.
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   * @param {number} renderDelay - delay in miliseconds
   */
  async render(modelName, renderDelay = 30) {
    this._debug('render', `--------- render (start) -- ctrl: ${this.constructor.name} -- renderDelay: ${renderDelay}  ------`, 'green', '#D9FC9B');

    /* DdCloners.js */
    this.ddEach(modelName);
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
