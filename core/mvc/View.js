import Dd from './Dd.js';
import HTTPClient from '../lib/HTTPClient.js';



class View extends Dd {

  constructor() {
    super();
  }



  /************** VIEWS (HTML Content) ****************/
  /**
   * Parse elements with the dd-view attribute and load router views.
   * This method should be used in the controller's __loader() hook.
   * When 'sibling', 'prepend' and 'append' is used comment and text nodes will not be injected (only HTML elements (nodeType === 1)).
   * Example:
   * <main dd-view="#main"></main> and in the controller await this.loadView('#main', 'pages/home/main.html', 'sibling');
   * @param {string} viewName - view name i.e. value of dd-view attribute, for example: '#home'
   * @param {string} viewPath - view file path (relative to /view/ directory): 'pages/home/main.html'
   * @param {string} dest - destination where to place the view: inner, sibling, prepend, append
   * @param {string} cssSel - CSS selector to load part of the view file: 'div > p.bolded:nth-child(2)'
   * @returns {void}
   */
  async loadView(viewName, viewPath, dest = 'inner', cssSel) {
    const attrName = 'dd-view';

    // empty content from the document by removing the dd-view-clone="" elements
    this.emptyView(viewName, dest);

    // get a HTML element with dd-view attribute
    const elem = document.querySelector(`[${attrName}="${viewName}"]`);
    this._debug('loadView', `--------- loadView dd-view="${viewName}" -- ${viewPath} ---------`, '#8B0892', '#EDA1F1');
    if (!elem) { throw new Error(`Element dd-view="${viewName}" not found.`); }
    if (!viewPath) { throw new Error(`View path for dd-view="${viewName}" is not defined.`); }

    const $viewsCached = window[this.$appName].$viewsCached;

    // Get HTML content. First try from the cached JSON and if it doesn't exist then request from the server.
    let htmlstr;
    if (!!$viewsCached && !!$viewsCached[viewPath]) {
      htmlstr = this._fetchCachedView(viewPath);
      this._debug('loadView', `--from $viewsCached | htmlstr: ${htmlstr.length}`, '#8B0892');
    } else {
      htmlstr = await this._fetchRemoteView(viewPath);
      this._debug('loadView', `--from server | htmlstr: ${htmlstr.length}`, '#8B0892');
    }

    // apply CSS selector to get part of the view
    if (!!cssSel) {
      const parser = new DOMParser();
      const doc = parser.parseFromString(htmlstr, 'text/html'); // convert HTML string to Document
      const elem = doc.querySelector(cssSel);
      htmlstr = !!elem ? elem.outerHTML : '';
    }

    // make dd elements invisible by setting display:none
    htmlstr = this._makeInvisible_ddElements(htmlstr);

    // load content in the element
    if (dest === 'inner') {
      elem.innerHTML = htmlstr;

    } else if (dest === 'sibling') {
      elem.insertAdjacentHTML('afterend', htmlstr);
      elem.nextSibling.setAttribute('dd-view-clone', viewName);

    } else if (dest === 'prepend') {
      elem.insertAdjacentHTML('afterbegin', htmlstr);
      elem.firstElementChild.setAttribute('dd-view-clone', viewName);

    } else if (dest === 'append') {
      elem.insertAdjacentHTML('beforeend', htmlstr);
      elem.lastElementChild.setAttribute('dd-view-clone', viewName);
    }
  }



  /**
   * Load multiple views asynchronously. Send resolved promise when all views are loaded.
   * @param {any[][]} viewDefs - array of arrays: [[viewName, viewPath, dest, cssSel]]
   * @returns {Promise<void[]>}
   */
  async loadViews(viewDefs) {
    const promises = [];
    for (const viewDef of viewDefs) {
      const viewName = viewDef[0];
      const viewPath = viewDef[1];
      const dest = viewDef[2];
      const cssSel = viewDef[3];
      const promise = this.loadView(viewName, viewPath, dest, cssSel);
      promises.push(promise);
    }
    return Promise.all(promises);
  }



  /**
   * Empty a view
   * @param {string} viewName - view name i.e. value of dd-view attribute, for example: '#home'
   * @param {string} dest - destination where the view was placed: inner, sibling, prepend, append
   * @returns {void}
   */
  emptyView(viewName, dest = 'inner') {
    const elem = document.querySelector(`[dd-view="${viewName}"]`);
    this._debug('emptyView', `--------- emptyView dd-view="${viewName}" | ${dest} ---------`, '#8B0892', '#EDA1F1');
    if (this._debug().emptyView) { console.log('emptyView elem::', elem); }
    if (!elem) { throw new Error(`Element dd-view="${viewName}" not found.`); }

    if (dest === 'inner') {
      elem.innerHTML = '';
    } else if (dest === 'sibling' || dest === 'prepend' || dest === 'append') {
      for (const clonedElement of document.querySelectorAll(`[dd-view-clone="${viewName}"`)) {
        clonedElement.remove();
      }
    }
  }




  /** HTML CONTENT FETCHERS **/
  /**
   * Fetch view from a cached file app/cache/views.json.
   * @param {string} viewPath - view file path (relative to /view/ directory): 'pages/home/main.html'
   * @returns {string} - string with HTML tags
   */
  _fetchCachedView(viewPath) {
    const $viewsCached = window[this.$appName].$viewsCached;
    const htmlstr = $viewsCached[viewPath];
    return htmlstr;
  }


  /**
   * Fetch view by sending a HTTP request to the server.
   * @param {string} viewPath - view file path (relative to /view/ directory): 'pages/home/main.html'
   * @returns {string} - string with HTML tags
   */
  async _fetchRemoteView(viewPath) {
    const opts = {
      encodeURI: true,
      timeout: 21000,
      retry: 0,
      retryDelay: 1300,
      maxRedirects: 0,
      headers: {
        'authorization': '',
        'accept': '*/*', // 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
        'content-type': 'text/html; charset=UTF-8'
      }
    };
    const viewHttpClient = new HTTPClient(opts);

    const path = `/views/${viewPath}`; // /views/pages/home/main.html
    const baseURIhost = `${window.location.protocol}//${window.location.host}`; // http://localhost:4400
    const url = new URL(path, baseURIhost).toString(); // resolve the URL
    const answer = await viewHttpClient.askHTML(url);
    if (!answer) { throw new Error(`No answer for ${viewPath}`); }
    if (answer.status !== 200) { throw new Error(`Status isn't 200 for ${viewPath}. HTTP Status: ${answer.status}`); }
    if (!answer.res.content) { throw new Error(`Content is empty for ${viewPath}`); }

    const htmlstr = answer.res.content;
    return htmlstr;
  }



  /************ JS LOADERS *********/
  /**
   * Create <script> tags and execute js scripts.
   * @param {string[]} urls - array of JS script URLs
   * @param {number} waitMS - wait for miliseconds between the loading processes
   * @param {object} opts - options {isModule:boolean, isDefer:boolean}
   */
  async lazyJS(urls, waitMS = 0, opts = {}) {
    if (!urls) { return; }
    for (const url of urls) {
      await new Promise(r => setTimeout(r, waitMS));

      // check if SCRIPT already exists and if exists remove it
      const elems = document.body.querySelectorAll(`script[src="${url}"]`);
      if (elems.length) { this.unlazyJS([url]); }

      // add the SCRIPT tag
      const script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = url;
      script.setAttribute('dd-lazyjs', '');

      if (opts.isModule) script.setAttribute('type', 'module');
      if (opts.isDefer) script.defer = true;

      document.body.appendChild(script);
    }
  }


  /**
   * Remove SCRIPT tag with dd-lazyjs attribute and the specific url.
   * @param {string[] | undefined} urls - array of JS script URLs
   */
  unlazyJS(urls) {
    if (!urls) { return; }
    for (const url of urls) {
      const elems = document.body.querySelectorAll(`script[src="${url}"][dd-lazyjs]`);
      for (const elem of elems) {
        if (!!elem) { elem.remove(); }
      }
    }
  }


  /**
   * Remove all SCRIPT tags with the dd-lazyjs attribute.
   */
  unlazyAllJS() {
    const elems = document.querySelectorAll('script[dd-lazyjs]') || [];
    for (const elem of elems) {
      if (!!elem) { elem.remove(); }
    }
  }


  /** EXPERIMENTAL
   * <script src="..." dd-lazyjs>
   * Parse the "dd-lazyjs" attribute.
   * Reload all SCRIPT elements with dd-lazyjs attribute. Remove all SCRIPT tags with the dd-lazyjs attributes and immediatelly reload them.
   * @returns {Promise<void>}
   */
  ddLazyjs() {
    this._debug('ddLazyjs', '--------- ddLazyjs ------', 'navy', '#B6ECFF');

    const attrName = 'dd-lazyjs';
    const elems = this._listElements(attrName);
    this._debug('ddLazyjs', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const url = elem.getAttribute('src');
      const isModule = elem.getAttribute('type') === 'module';
      const isDefer = elem.hasAttribute('defer');
      const opts = { isModule, isDefer };

      this.unlazyJS([url]);
      this.lazyJS([url], 30, opts);

      this._debug('ddLazyjs', `src="${url}" | opts: ${JSON.stringify(opts)}`, 'navy');
    }

  }


  /**
   * Fetch js script content and evaluate it. The <script> tag will not be created like it is in lazyJS().
   * This can work only for local files from the /assets/ folder due to CORS.
   * @param {string} url - JS script URL, '/assets/js/test1.js'
   */
  async exeJS(url) {
    if (!url) { return; }

    // correct the URL
    url = url.trim();
    if (!/^http/.test(url)) {
      const baseURIhost = `${window.location.protocol}//${window.location.host}`; // http://localhost:4400
      url = new URL(url, baseURIhost).toString(); // resolve the URL
    }

    // default HTTP client
    const opts = {
      encodeURI: true,
      timeout: 21000,
      retry: 0,
      retryDelay: 1300,
      maxRedirects: 0,
      headers: {
        'authorization': '',
        'accept': '*/*', // 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
        'content-type': 'text/html; charset=UTF-8'
      }
    };
    const viewHttpClient = new HTTPClient(opts);

    const answer = await viewHttpClient.askJS(url);
    const jsContent = answer.res.content;

    if (!!jsContent) {
      const fja = new Function(`${jsContent};`);
      fja();
    }

  }




  /************ CSS LOADERS *********/
  /**
   * Create <link rel="stylesheet"> tags and load CSS.
   * Usually use it in the __loader() controller hook.
   * @param {string|string[]} urls - one url, or array of CSS file URLs, ['/assets/css/common.css', '/assets/css/home.css']
   */
  loadCSS(urls) {
    if (!urls) { return; }
    else if (!Array.isArray(urls)) { urls = [urls]; }

    for (const url of urls) {
      // check if LINK tag already exists and if exists remove it
      const elems = document.body.querySelectorAll(`link[href="${url}"]`);
      if (elems.length) { this.unloadCSS([url]); }

      // create LINK tag
      const linkCSS = document.createElement('link');
      linkCSS.setAttribute('rel', 'stylesheet');
      linkCSS.setAttribute('href', url);
      linkCSS.defer = true;
      document.head.appendChild(linkCSS);
    }
  }

  /**
   * Remove <link rel="stylesheet"> tags and unload CSS.
   * Usually use it in the __loader() controller hook.
   * @param {string|string[]} urls - array of CSS file URLs, ['/assets/css/common.css', '/assets/css/home.css'] or just ['/assets/css/'] to remove all folder files
   */
  unloadCSS(urls) {
    if (!urls) { return; }
    else if (!Array.isArray(urls)) { urls = [urls]; }

    for (const url of urls) {
      const elems = document.head.querySelectorAll(`link[rel="stylesheet"][href="${url}"]`);
      for (const elem of elems) {
        if (!!elem) { elem.remove(); }
      }
    }
  }

  /**
   * Append <style dd-ref="#reference"></style> tags in the <head>.
   * Usually use it in the __loader() controller hook.
   * @param {string} cssRules - CSS rules, for example: div {font-weight: bold; color:red;}
   * @param {string} ref - reference which will be used for unplug
   */
  plugCSS(cssRules, ref) {
    const style = document.createElement('style');
    style.textContent = cssRules;
    style.setAttribute('type', 'text/css');
    style.setAttribute('dd-ref', ref);
    document.head.appendChild(style);
  }

  /**
   * Remove <style dd-ref="#reference"></style> tag.
   * Usually use it in the __destroy() controller hook.
   * @param {string} ref - reference
   */
  unplugCSS(ref) {
    const style = document.querySelector(`style[dd-ref="${ref}"]`);
    if (!!style) { style.remove(); }
  }




  /*************** HEAD SETTERS *************/
  /**
   * Set the text in the <title> tag.
   * @param {string} title
   */
  setTitle(title) {
    document.title = title;
  }

  /**
   * Set the page description.
   * @param {string} desc
   */
  setDescription(desc) {
    const elem = document.head.querySelector('meta[name="description"]');
    if (!elem) { throw new Error('The meta[name="description"] tag is not placed in the HTML file.'); }
    elem.setAttribute('content', desc);
  }

  /**
   * Set the page keywords.
   * @param {string} kys - for example: 'dodo, app, database'
   */
  setKeywords(kys) {
    const elem = document.head.querySelector('meta[name="keywords"]');
    if (!elem) { throw new Error('The meta[name="keywords"] tag is not placed in the HTML file.'); }
    elem.setAttribute('content', kys);
  }


  /**
   * Set the document language.
   * @param {string} langCode - 'en' | 'hr' | 'de' | ...
   */
  setLang(langCode) {
    const elem = document.querySelector('html');
    elem.setAttribute('lang', langCode);
  }


  /** EXPERIMENTAL
   * Load the <head> tag content from the view file.
   * @param {string} viewPath - view file path (relative to /view/ directory): 'pages/home/head.html'
   * @param {string} dest - destination where to place the view: inner, append
   */
  async loadHead(viewPath, dest = 'inner') {
    // get the <head> HTML element
    const elem = document.querySelector('head');
    this._debug('loadHead', `--------- loadHead -- ${viewPath} ---------`, '#8B0892', '#EDA1F1');
    if (this._debug().loadView) { console.log('elem::', elem); }
    if (!elem) { throw new Error(`Element HEAD not found.`); }
    if (!viewPath) { throw new Error(`View path is not defined.`); }

    const $viewsCached = window[this.$appName].$viewsCached;

    // Get HTML content. First try from the cached JSON and if it doesn't exist then request from the server.
    let htmlstr;
    if (!!$viewsCached && !!$viewsCached[viewPath]) {
      htmlstr = this._fetchCachedView(viewPath);
      this._debug('loadView', '--from $viewsCached', '#8B0892');
    } else {
      htmlstr = await this._fetchRemoteView(viewPath);
      this._debug('loadView', '--from server', '#8B0892');
    }

    // remove previously generated elements, i.e. elements with the dd-headgen attribute
    for (const clonedElem of document.querySelectorAll(`[dd-head-clone`)) { clonedElem.remove(); }

    // load content in the element
    if (dest === 'inner') {
      elem.innerHTML = htmlstr;

    } else if (dest === 'append') {
      elem.insertAdjacentHTML('beforeend', htmlstr);
      elem.lastElementChild.setAttribute('dd-head-clone', '');
    }
  }




  /***** PRIVATES *****/
  /**
   * Make dd elements invisible by setting display:none CSS style. After render() this element will be cloned and become visible.
   * @param {string} htmlString - string with html tags
   * @returns {string} - modified HTML string
   */
  _makeInvisible_ddElements(htmlString) {
    const wrapper = document.createElement('div');
    wrapper.innerHTML = htmlString;

    for (const cloner_directive of this.$dd.cloner_directives) {
      const dd_elems = wrapper.querySelectorAll(`[${cloner_directive}]`);
      for (const dd_elem of dd_elems) { dd_elem.style.display = 'none'; }
    }

    const htmlString2 = wrapper.innerHTML; // modified htmlString
    return htmlString2;
  }





}




export default View;
