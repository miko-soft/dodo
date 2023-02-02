import Model from './Model.js';
import navig from '../lib/navig.js';


class Controller extends Model {

  // controller properties: $auth, $debugOpts, $fridge, $model, $modeler, $preflight, $postflight, $dd, $httpClient, $baseURIhost
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
  async loader(trx) { }

  /**
   * LOAD DATA
   * Init the controller properties (set initial values).
   * @param {object} trx - DoDo router transitional variable
   * @returns {Promise<void>}
   */
  async init(trx) { }

  /**
   * REND HTML AND DATA
   * Render data-dd- elements.
   * @param {object} trx - DoDo router transitional variable
   * @returns {Promise<void>}
   */
  async rend(trx) { await this.render(); }

  /**
   * Execute after rend.
   * @param {object} trx - DoDo router transitional variable
   * @returns {Promise<void>}
   */
  async postrend(trx) { }

  /**
   * Destroy the controller when the data-dd-href element is clicked (see parse.href()).
   * - removes all data-dd-... element lsiteners
   * @param {Event} pevent - popstate or pushstate event which caused URL change
   * @returns {Promise<void>}
   */
  async destroy(trx) { }





  /**
   * Main router middleware.
   * 1) destroy() - execute the destroy() of the previous controller
   * 3) ddKILL() - kill the previous controller event listeners
   * 2)  $model = {} - reset the pevious and current $model
   * @param {object} navig - navigation stages {uri:string, ctrl:Controller}
   * @param {object} trx - DoDo router transitional variable (defined in router.js -> _exe())
   * @returns {Promise<void>}
   */
  async processing(trx) {
    // navig processes
    navig.setPrevious(); // set previous uri and ctrl
    await navig.resetPreviousController(trx); // reset previous controller and execute destroy()
    navig.setCurrent(this); // set the current uri and ctrl
    if (this._debug().navig) { console.log(`%c---navig---`, 'color:green; background:#D9FC9B;', navig); }

    // model processes
    this.emptyModel(); // set $model to empty object
    this.proxifyModel(); // set $model as proxy object
    this.modeler(); // define this.$modeler methods

    // controller processes
    await this.ddInc(true);
    try { await this.loader(trx); } catch (err) { console.error(err); }
    await this.ddInc(true);
    this.ddSetInitial(); // parse data-dd-setinitial
    try { await this.init(trx); } catch (err) { console.error(err); }
    try { await this.rend(trx); } catch (err) { console.error(err); }
    try { await this.postrend(trx); } catch (err) { console.error(err); }

    // post-view processes
    await this.ddLazyjs();
  }




  /************ RENDER METHODS ***********/
  /**
   * Render the view i.e. the data-dd- elements with the attrValQuery.
   * For example: data-dd-print="first_name", where first_name is the controllerProp.
   * @param {string|RegExp} attrValQuery - query for the attribute value
   * @param {number} renderDelay - delay in miliseconds
   */
  async render(attrValQuery, renderDelay = 5) {
    if (!!attrValQuery) {
      /* - remove dynamic part of the attrValquery because dynamic part in the data-dd- elem is not same as solved attrValQuery
       - for example data-dd-print="$model.advert___{{ad_num}}" is resolved to $model.advert___3 */
      attrValQuery = attrValQuery.replace(/___.+$/, ''); // $model.advert___3 -> $model.advert
    }

    this._debug('render', `--------- render (start) -- attrValQuery: ${attrValQuery} -- renderDelay: ${renderDelay} -- ctrl: ${this.constructor.name} ------`, 'green', '#D9FC9B');

    // Render DataDd generators.
    this.ddFor(attrValQuery);
    this.ddRepeat(attrValQuery);
    this.ddPrint(attrValQuery);

    await new Promise(r => setTimeout(r, renderDelay));

    // Render DataDd non-generators.
    this.ddIf(attrValQuery);
    this.ddSpinner(attrValQuery);
    this.ddSwitch(attrValQuery);
    this.ddDisabled(attrValQuery);
    this.ddValue(attrValQuery);
    this.ddChecked(attrValQuery);
    this.ddClass(attrValQuery);
    this.ddStyle(attrValQuery);
    this.ddSrc(attrValQuery);
    this.ddAttr(attrValQuery);
    this.ddElem(attrValQuery);
    this.ddEcho();

    await new Promise(r => setTimeout(r, renderDelay));

    // Render DataDdListeners. First remove all listeners with the ddKILL() and after that associate listeners to data-dd- elements.
    await this.ddKILL();
    this.ddHref();
    this.ddClick();
    this.ddKeyup();
    this.ddChange();
    this.ddEvt();
    this.ddSet();
    this.ddModel();


    this._debug('render', `--------- render (end) -- attrValQuery: ${attrValQuery} ------`, 'green', '#D9FC9B');
  }



  /**
   * Use render() method multiple times.
   * @param {string[]|RegExp[]} attrValQuerys - array of the controller property names: ['company.name', /^company\.year/]
   * @param {number} renderDelay - delay in miliseconds
   */
  async renders(attrValQuerys = [], renderDelay = 5) {
    for (const attrValQuery of attrValQuerys) { await this.render(attrValQuery, renderDelay); }
  }



}

export default Controller;
