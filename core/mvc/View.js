import Dd from './Dd.js';
import HTTPClient from '../lib/HTTPClient.js';



class View extends Dd {

  constructor() {
    super();
  }



  /************** VIEW (HTML) LOADERS ****************/
  /**
   * Parse elements with the dd-view attribute and load router views.
   * This method should be used in the controller's __loader() hook.
   * When 'sibling', 'prepend' and 'append' is used comment and text nodes will not be injected (only HTML elements (nodeType === 1)).
   * Example:
   * <main dd-view="#main"></main> and in the controller this.loadView('#main', 'pages/home/main.html', 'sibling');
   * @param {string} viewName - view name i.e. value of dd-view attribute, for example: '#home'
   * @param {string} viewContent - HTML content
   * @param {string} dest - destination where to place the view: inner, sibling, prepend, append
   * @param {string} cssSel - CSS selector to load part of the view file: 'div > p.bolded:nth-child(2)'
   * @returns {void}
   */
  loadView(viewName, viewContent = '', dest = 'inner', cssSel = '') {
    const attrName = 'dd-view';

    // empty content from the document by removing the dd-view-clone="" elements
    this.emptyView(viewName, dest);

    // get a HTML element with dd-view attribute
    const elem = document.querySelector(`[${attrName}="${viewName}"]`);
    this._debug('loadView', `--------- loadView dd-view="${viewName}" ---------`, '#8B0892', '#EDA1F1');
    if (!elem) { throw new Error(`Element dd-view="${viewName}" not found.`); }
    if (!viewContent) { throw new Error(`View content for dd-view="${viewName}" is not defined.`); }

    // Get HTML content
    let htmlstr = viewContent;
    this._debug('loadView', `--htmlstr: ${htmlstr.length}`, '#8B0892');

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




  /************ JS LOADERS *********/
  /**
   * Create <script> tags at the end of body and execute it.
   * @param {string} url - JS script URL, https://code.jquery.com/jquery-3.7.0.min.js
   * @param {object} attrOpts - attribute options {isModule:boolean, isDefer:boolean, isLazy:boolean}
   */
  loadJS(url, attrOpts = {}) {
    // remove the SCRIPT if already exists
    this.unloadJS(url);

    // add the SCRIPT tag
    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = url;

    if (attrOpts.isModule) { script.setAttribute('type', 'module'); }
    if (attrOpts.isDefer) { script.defer = true; }
    if (attrOpts.isLazy) { script.setAttribute('dd-lazyjs', ''); }

    document.body.appendChild(script);
  }


  /**
   * Remove SCRIPT tag with the specific url.
   * @param {string} url - JS script URLs
   */
  unloadJS(url) {
    const elems = document.body.querySelectorAll(`script[src="${url}"]`);
    for (const elem of elems) {
      if (!!elem) { elem.remove(); }
    }
  }


  /**
   * Remove all SCRIPT tags.
   * @param {object} attrOpts - attribute options {isModule:boolean, isDefer:boolean, isLazy:boolean}
   */
  unloadAllJS(attrOpts = {}) {
    let css_selector = 'script';
    if (attrOpts.isModule) { css_selector += '[type="module"]'; }
    if (attrOpts.isDefer) { css_selector += '[defer]'; }
    if (attrOpts.isLazy) { css_selector += '[dd-lazyjs]'; }

    const elems = document.querySelectorAll(css_selector) || [];

    for (const elem of elems) {
      if (!!elem) { elem.remove(); }
    }
  }


  /**
   * Parse the "dd-lazyjs" attribute after __loader() or after __rend() controller hook.
   * Reload all SCRIPT elements with dd-lazyjs attribute. Remove all SCRIPT tags with the dd-lazyjs attributes and immediatelly reload them.
   * Examples:
   * <script src="..." dd-lazyjs>   -- default is --after_loader
   * <script src="..." dd-lazyjs="">   -- default is --after_loader
   * <script src="..." dd-lazyjs="--after__loader">
   * <script src="..." dd-lazyjs="--after__rend">
   *
   * @param {string} afterOption - --after__loader , --after__rend
  */
  ddLazyjs(afterOption) {
    const attrName = 'dd-lazyjs';
    const elems = this._listElements(attrName);

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { opts } = this._decomposeAttribute(attrVal);

      let afterOption_fromAttribute = opts[0];
      if (!afterOption_fromAttribute) { afterOption_fromAttribute = 'after__loader'; }

      if (afterOption_fromAttribute !== afterOption) { return; }

      this._debug('ddLazyjs', `--------- ddLazyjs (${afterOption}) ------`, 'navy', '#B6ECFF');

      const url = elem.getAttribute('src');
      const isModule = elem.getAttribute('type') === 'module';
      const isDefer = elem.hasAttribute('defer');
      const isLazy = elem.hasAttribute('dd-lazyjs');
      const attrOpts = { isModule, isDefer, isLazy };

      this.unloadJS(url);
      this.loadJS(url, attrOpts);

      this._debug('ddLazyjs', `src="${url}" | attrOpts: ${JSON.stringify(attrOpts)}`, 'navy');
    }

  }


  /**
   * Wrap JS content in the async function and execute it. The <script> tag will not be created like it is in loadJS().
   * NOTICE: the content can be fetched from local files (usually from /public/ folder) due to CORS.
   * @param {string} jsContent - the content of the JS file. Use raw vite option: import jsContent from '/public/test.js?raw'
   */
  async exeJS(jsContent = '') {
    const AsyncFunction = Object.getPrototypeOf(async function () { }).constructor;
    const fja = new AsyncFunction(`${jsContent};`);
    await fja();
  }




  /************ CSS LOADERS *********/
  /**
   * Create <link rel="stylesheet"> tag and load CSS.
   * @param {string} url - CSS file URL, '/public/css/common.css'
   */
  loadCSS(url) {
    this.unloadCSS([url]);

    // create LINK tag
    const linkCSS = document.createElement('link');
    linkCSS.setAttribute('rel', 'stylesheet');
    linkCSS.setAttribute('href', url);
    linkCSS.defer = true;
    document.head.appendChild(linkCSS);
  }

  /**
   * Remove <link rel="stylesheet"> tag and unload CSS.
   * @param {string} url - CSS file URL, '/public/css/common.css'
   */
  unloadCSS(url) {
    const elems = document.head.querySelectorAll(`link[rel="stylesheet"][href="${url}"]`);
    for (const elem of elems) {
      if (!!elem) { elem.remove(); }
    }
  }

  /**
   * Append <style dd-ref="#reference"></style> tags in the <head>.
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




  /***** MISC *****/
  /**
   * Fetch HTML, CSS or JS content by sending a HTTP request to the server.
   * @param {string} contentUrl - URL: http://localhost:4400/views/pages/home/main.html
   * @returns {string} - the file content
   */
  async grabFileContent(contentUrl = '') {
    const opts = {
      encodeURI: true,
      timeout: 20000,
      retry: 0,
      retryDelay: 0,
      maxRedirects: 0,
      headers: {
        'accept': '*/*'
      }
    };
    const viewHttpClient = new HTTPClient(opts);

    let url;
    if (/^http/.test(contentUrl)) {
      url = contentUrl;
    } else {
      const baseURIhost = `${window.location.protocol}//${window.location.host}`; // http://localhost:4400
      url = new URL(contentUrl, baseURIhost).toString(); // resolve the URL
    }

    const answer = await viewHttpClient.askHTML(url);
    if (!answer) { throw new Error(`No answer for ${url}`); }
    if (answer.status !== 200) { throw new Error(`Status isn't 200 for ${url}. HTTP Status: ${answer.status}`); }
    if (!answer.res.content) { throw new Error(`Content is empty for ${contentUrl}`); }

    let fileContent = answer.res.content;
    fileContent = fileContent.replace('<script type="module" src="/@vite/client"></script>', '').trim();

    return fileContent;
  }


  /**
   * Fetch text from language file and set the this.$model.$i18n variable.
   * The language file is in the /i18n/ folder.
   * To set the window[this.$appName].i18n the App.i18n() method is used.
   * @param {string} langCode - 'en' | 'fr' | 'de' | ...
   */
  loadI18n(langCode) {
    const langObj = window[this.$appName].i18n[langCode];
    if (!langObj) { throw new Error(`The language "${langCode}" is not defined. Please create language files in i18n/${langCode} folder.`); }
    this.$model.$i18n = langObj;
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

    const directives = [...this.$dd.noncloner_directives, ...this.$dd.cloner_directives];
    for (const directive of directives) {
      const dd_elems = wrapper.querySelectorAll(`[${directive}]`);
      for (const dd_elem of dd_elems) { this._elemHide(dd_elem); }
    }

    const htmlString2 = wrapper.innerHTML; // modified htmlString
    return htmlString2;
  }



}




export default View;
