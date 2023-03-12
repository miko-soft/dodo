import Model from './Model.js';
import navig from '../lib/navig.js';

/**
 * Controller controls the whole HTML document, not just component like in other SPA frameworks.
 */
class Controller extends Model {

  // controller properties: $auth, $baseURIhost, $dd, $debugOpts, $fridge, $httpClient, $model, $modeler, $navig, $viewsCached, $preflight, $postflight
  constructor() {
    super();
    this.$debugOpts = {}; // debug options, setup with App.debugger()
    this.$fridge = {}; // fridged properties will not be deleted during controller processing i.e. in the navig.resetPreviousController()
    this.$navig = navig;
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
   * @param {Event} pevent - popstate or pushstate event which caused URL change
   * @returns {Promise<void>}
   */
  async __destroy(trx) { }





  /**
   * Main router middleware.
   * 1) __destroy() - execute the __destroy() of the previous controller
   * 3) ddUNLISTEN() - kill the previous controller event listeners
   * 2)  $model = {} - reset the pevious and current $model
   * @param {object} navig - navigation stages {uri:string, ctrl:Controller}
   * @param {object} trx - DoDo router transitional variable (defined in router.js -> _exe())
   * @returns {Promise<void>}
   */
  async processing(trx) {
    // navig processes
    navig.setPrevious(); // set previous uri and ctrl
    await navig.resetPreviousController(trx); // reset previous controller and execute __destroy()
    navig.setCurrent(this); // set the current uri and ctrl
    if (this._debug().navig) { console.log(`%c---navig---`, 'color:green; background:#D9FC9B;', navig); }

    // model processes
    this.emptyModel(); // set $model to empty object
    this.proxifyModel(); // set $model as proxy object
    this.modeler(); // define this.$modeler methods

    // controller processes
    await this.ddInc(true);
    try { await this.__loader(trx); } catch (err) { console.error(err); }
    // this.ddSetInitial(); // parse dd-setinitial
    try { await this.__init(trx); } catch (err) { console.error(err); }
    try { await this.__rend(trx); } catch (err) { console.error(err); }
    try { await this.__postrend(trx); } catch (err) { console.error(err); }

    // post-view processes
    await this.ddLazyjs(30);
  }




  /************ RENDER METHODS ***********/
  /**
   * Render the view i.e. the dd- elements with the attrValQuery.
   * For example: dd-text="first_name", where first_name is the controllerProp.
   * @param {number} renderDelay - delay in miliseconds
   */
  async render(renderDelay = 5) {

    this._debug('render', `--------- render (start) -- renderDelay: ${renderDelay} -- ctrl: ${this.constructor.name} ------`, 'green', '#D9FC9B');

    await new Promise(r => setTimeout(r, renderDelay));

    // Render Dd elements.
    this.ddUNCLONE();
    this.ddForeach();
    this.ddRepeat();
    this.ddIf();
    this.ddText();
    this.ddHtml();
    this.ddMustache();

    // non-cloners
    this.ddShow();
    this.ddDisabled();
    this.ddChecked();
    this.ddClass();
    this.ddStyle();
    this.ddSrc();


    // Render Dd non-generators.
    // this.ddSwitch(attrValQuery);
    // this.ddDisabled(attrValQuery);
    // this.ddValue(attrValQuery);
    // this.ddChecked(attrValQuery);
    // this.ddClass(attrValQuery);
    // this.ddStyle(attrValQuery);
    // this.ddSrc(attrValQuery);
    // this.ddAttr(attrValQuery);
    // this.ddElem(attrValQuery);
    // this.ddEcho();

    await new Promise(r => setTimeout(r, renderDelay));

    // Render DdListeners. First remove all listeners with the ddUNLISTEN() and after that associate listeners to dd- elements.
    await this.ddUNLISTEN();
    this.ddHref();
    this.ddClick();
    // this.ddKeyup();
    // this.ddChange();
    // this.ddEvt();
    // this.ddSet();
    // this.ddModel();


    this._debug('render', `--------- render (end) ------`, 'green', '#D9FC9B');
  }



}

export default Controller;
