import Model from './Model.js';


/**
 * Controller controls the whole HTML document, not just component like in other SPA frameworks.
 * Controller constants:
 * App.js -> $fridge, $httpClient, $auth, $debugOpts
 * Model.js -> $model, $modeler
 * Dd.js -> $dd
 */
class Controller extends Model {

  constructor() {
    super();
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

    // controller processes
    try { await this.__loader(trx); } catch (err) { console.error(err); }
    this.ddSetinitial(); // parse dd-setinitial
    try { await this.__init(trx); } catch (err) { console.error(err); }
    this.$dd.__initFinished = true;
    try { await this.__rend(trx); } catch (err) { console.error(err); }
    try { await this.__postrend(trx); } catch (err) { console.error(err); }

    // final processes after some delay
    await new Promise(r => setTimeout(r, 100));
    this.ddLazyjs();
  }





  /************* LIFECYCLE HOOK METHODS ***********/
  /**
   * LOAD HTML
   * Load the page views, includes, lazy loads, etc... Use "View" methods here.
   * @param {object} trx - DoDo router transitional variable
   * @returns {Promise<void>}
   */
  async __loader(trx) { }

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
   * @param {number} renderDelay - delay in miliseconds
   */
  async render(renderDelay = 5) {
    this._debug('render', `--------- render (start) -- ctrl: ${this.constructor.name} -- renderDelay: ${renderDelay}  ------`, 'green', '#D9FC9B');

    // DdCloners.js
    this.ddUNCLONE();
    this.ddForeach();
    this.ddRepeat();
    this.ddIf();
    this.ddText();
    this.ddHtml();
    this.ddMustache();

    // Dd.js
    this.ddElem();
    this.ddShow();
    // attribute managers
    this.ddValue();
    this.ddDisabled();
    this.ddChecked();
    this.ddSelected();
    this.ddClass();
    this.ddStyle();
    this.ddSrc();
    this.ddAttr();

    await new Promise(r => setTimeout(r, renderDelay));

    // DdListeners.js
    this.ddUNLISTEN();
    this.ddHref();
    this.ddSet();
    this.ddModel();
    this.ddClick();
    this.ddKeyup();
    this.ddChange();
    this.ddEvt();

    this._debug('render', `--------- render (end) -- ctrl: ${this.constructor.name} ------`, 'green', '#D9FC9B');
  }



}

export default Controller;
