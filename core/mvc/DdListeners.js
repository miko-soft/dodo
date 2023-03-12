import Aux from './Aux.js';
import navig from '../lib/navig.js';


/**
 * Parse HTML elements with the "dd-" attribute (event listeners)
 */
class DdListeners extends Aux {

  constructor() {
    super();
  }


  /**
   * Remove all listeners (click, input, keyup, ...) from the elements with the "dd-..." attribute
   * when controller is destroyed i.e. when URL is changed. See /core/router/Router.js
   * @returns {void}
   */
  async ddUNLISTEN() {
    // this._debug().ddUNLISTEN = true;
    this._debug('ddUNLISTEN', `------- ddUNLISTEN (start) ctrl: ${this.constructor.name} -------`, 'orange', '#FFD8B6');

    const promises = [];
    let i = 1;
    for (const ddListener of this.$dd.listeners) {
      ddListener.elem.removeEventListener(ddListener.eventName, ddListener.handler);
      this._debug('ddUNLISTEN', `${i}. killed:: ${ddListener.attrName} --- ${ddListener.eventName} --- ${ddListener.elem.localName} -- ${ddListener.elem.innerHTML} -- ctrl:: ${this.constructor.name}`, 'orange');
      promises.push(Promise.resolve(true));
      i++;
    }

    await Promise.all(promises);
    this.$dd.listeners = [];
    this._debug('ddUNLISTEN', '------- ddUNLISTEN (end) -------', 'orange', '#FFD8B6');
  }



  /**
   * dd-href
   * <a href="/product/12" dd-href>Product 12</a> - when link is hovered the URL will be shown in browser status bar
   * <a href="" dd-href="/product/12">Product 12</a>
   * Href listeners and changing URLs (browser history states).
   * NOTICE: The click on dd-href element will destroy current controller i.e. ddUNLISTEN() will be invoked.
   * @returns {void}
   */
  ddHref() {
    this._debug('ddHref', '--------- ddHref ------', 'orange', '#F4EA9E');

    const attrName = 'dd-href';
    const elems = this._listElements(attrName, '');
    this._debug('ddHref', `found elements:: ${elems.length}`, 'orange');


    for (const elem of elems) {

      const handler = async event => {
        event.preventDefault();

        // change browser's address bar (emit 'pushstate' event)
        const href = elem.getAttribute('dd-href') || elem.getAttribute('href') || '';
        const url = href.trim();
        const state = { href };
        const title = !!elem.innerText ? elem.innerText.trim() : '';
        if (!!url) { navig.goto(url, state, title); }

        this._debug('ddHref', `Executed ddHref listener -->  href: ${href}, ctrl:: ${this.constructor.name}`, 'orangered');
      };

      const eventName = 'click';
      elem.addEventListener(eventName, handler);
      this.$dd.listeners.push({ attrName, elem, handler, eventName });
      this._debug('ddHref', `pushed::  tag: ${elem.localName} | href="${elem.pathname}" | ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }



  /**
   * dd-click="<controllerMethod> [-- preventDefault]"
   * <button dd-click="myFunc()">CLICK ME</button>
   * Listen for click and execute the function i.e. controller method.
   * @returns {void}
   */
  ddClick() {
    this._debug('ddClick', '--------- ddClick ------', 'orange', '#F4EA9E');

    const attrName = 'dd-click';
    const elems = this._listElements(attrName, '');
    this._debug('ddClick', `found elements:: ${elems.length}`, 'orange');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName); // string 'myFunc(x, y, ...restArgs) -- preventDefault'
      if (!attrVal) { console.error(`Attribute "dd-click" has bad definition (dd-click="${attrVal}").`); continue; }

      const attrValSplited = attrVal.split(this.$dd.separator);
      const funcDefs = attrValSplited[0]; // func1();func2(a, b);
      const tf = !!attrValSplited[1] && attrValSplited[1].trim() === 'preventDefault';

      const handler = async event => {
        if (tf) { event.preventDefault(); }
        await this._funcsExe(funcDefs, elem, event);
        this._debug('ddClick', `Executed ddClick listener --> ${funcDefs} | preventDefault: ${tf}`, 'orangered');
      };

      const eventName = 'click';
      elem.addEventListener(eventName, handler);
      this.$dd.listeners.push({ attrName, elem, handler, eventName });
      this._debug('ddClick', `pushed::  tag: ${elem.localName} | dd-click="${attrVal}" | preventDefault: ${tf} | ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }



}


export default DdListeners;

