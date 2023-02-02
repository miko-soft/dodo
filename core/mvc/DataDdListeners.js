import Aux from './Aux.js';
import navig from '../lib/navig.js';


/**
 * Parse HTML elements with the "data-dd-" attribute (event listeners)
 */
class DataDdListeners extends Aux {

  constructor() {
    super();
  }


  /**
   * Remove all listeners (click, input, keyup, ...) from the elements with the "data-dd-..." attribute
   * when controller is destroyed i.e. when URL is changed. See /core/router.js
   * @returns {void}
   */
  async ddKILL() {
    // this._debug().ddKILL = true;
    this._debug('ddKILL', `------- ddKILL (start) ctrl: ${this.constructor.name} -------`, 'orange', '#FFD8B6');

    const promises = [];
    let i = 1;
    for (const ddListener of this.$dd.listeners) {
      ddListener.elem.removeEventListener(ddListener.eventName, ddListener.handler);
      this._debug('ddKILL', `${i}. killed:: ${ddListener.attrName} --- ${ddListener.eventName} --- ${ddListener.elem.localName} -- ${ddListener.elem.innerHTML} -- ctrl:: ${this.constructor.name}`, 'orange');
      promises.push(Promise.resolve(true));
      i++;
    }

    await Promise.all(promises);
    this.$dd.listeners = [];
    this._debug('ddKILL', '------- ddKILL (end) -------', 'orange', '#FFD8B6');
  }



  /**
   * data-dd-href
   * <a href="/product/12" data-dd-href>Product 12</a>
   * <a href="" data-dd-href="/product/12">Product 12</a>
   * Href listeners and changing URLs (browser history states).
   * NOTICE: Click on data-dd-href element will destroy the controller i.e. ddKILL() will be invoked.
   * @returns {void}
   */
  ddHref() {
    this._debug('ddHref', '--------- ddHref ------', 'orange', '#F4EA9E');

    const attrName = 'data-dd-href';
    const elems = this._listElements(attrName, '');
    this._debug('ddHref', `found elements:: ${elems.length}`, 'orange');


    for (const elem of elems) {

      const handler = async event => {
        event.preventDefault();

        // change browser's address bar (emit 'pushstate' event)
        const href = elem.getAttribute('data-dd-href') || elem.getAttribute('href') || '';
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
   * data-dd-click="<controllerMethod> [@@ preventDefault]"
   * <button data-dd-click="myFunc()">CLICK ME</button>
   * Listen for click and execute the function i.e. controller method.
   * @returns {void}
   */
  ddClick() {
    this._debug('ddClick', '--------- ddClick ------', 'orange', '#F4EA9E');

    const attrName = 'data-dd-click';
    const elems = this._listElements(attrName, '');
    this._debug('ddClick', `found elements:: ${elems.length}`, 'orange');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName); // string 'myFunc(x, y, ...restArgs) @@ preventDefault'
      if (!attrVal) { console.error(`Attribute "data-dd-click" has bad definition (data-dd-click="${attrVal}").`); continue; }

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
      this._debug('ddClick', `pushed::  tag: ${elem.localName} | data-dd-click="${attrVal}" | preventDefault: ${tf} | ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }


  /**
   * data-dd-keyup="<controllerMethod> [@@ keyCode]"
   * <input type="text" data-dd-keyup="myFunc()"> - it will execute myFunc on every key
   * <input type="text" data-dd-keyup="myFunc() @@ enter"> - it will execute myFunc on Enter
   * Parse the "data-dd-keyup" attribute. Listen for the keyup event on certain element and execute the controller method.
   * @returns {void}
   */
  ddKeyup() {
    this._debug('ddKeyup', '--------- ddKeyup ------', 'orange', '#F4EA9E');

    const attrName = 'data-dd-keyup';
    const elems = this._listElements(attrName, '');
    this._debug('ddKeyup', `found elements:: ${elems.length}`, 'orange');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const attrValSplited = attrVal.split(this.$dd.separator);

      if (!attrValSplited[0]) { console.error(`Attribute "data-dd-keyup" has bad definition (data-dd-keyup="${attrVal}").`); continue; }
      const funcDefs = attrValSplited[0]; // func1();func2();

      let keyCode = attrValSplited[1] || '';
      keyCode = keyCode.trim().toLowerCase();

      const handler = async event => {
        let eventCode;
        if (event.code) { eventCode = event.code.toLowerCase(); }
        if (!!keyCode && keyCode !== eventCode) { return; }
        await this._funcsExe(funcDefs, elem, event);
        this._debug('ddKeyup', `Executed ddKeyup listener --> ${funcDefs} | eventCode: ${eventCode}`, 'orangered');
      };

      const eventName = 'keyup';
      elem.addEventListener(eventName, handler);
      this.$dd.listeners.push({ attrName, elem, handler, eventName });
      this._debug('ddKeyup', `pushed::  tag: ${elem.localName} | data-dd-keyup="${attrVal}" | ctrl="${this.constructor.name}" | ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }



  /**
   * data-dd-change="<controllerMethod>"
   * <select data-dd-change="myFunc()">
   * Listen for change and execute the function i.e. controller method.
   * @returns {void}
   */
  ddChange() {
    this._debug('ddChange', '--------- ddChange ------', 'orange', '#F4EA9E');

    const attrName = 'data-dd-change';
    const elems = this._listElements(attrName, '');
    this._debug('ddChange', `found elements:: ${elems.length}`, 'orange');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName); // string 'myFunc(x, y, ...restArgs)'
      if (!attrVal) { console.error(`Attribute "data-dd-change" has bad definition (data-dd-change="${attrVal}").`); continue; }
      const funcDefs = attrVal; // func1();func2();

      const handler = async event => {
        await this._funcsExe(funcDefs, elem, event);
        this._debug('ddChange', `Executed ddChange listener --> ${funcDefs}`, 'orangered');
      };

      const eventName = 'change';
      elem.addEventListener(eventName, handler);
      this.$dd.listeners.push({ attrName, elem, handler, eventName });
      this._debug('ddChange', `pushed::  tag: ${elem.localName} | data-dd-change="${attrVal}" | ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }



  /**
   * data-dd-evt="eventName1 @@ <controllerMethod1> [&& eventName2 @@ <controllerMethod2>]"
   * Listen for event and execute the function i.e. controller method.
   * Example:
   * data-dd-evt="mouseenter @@ myFunc($element, $event, 25, 'some text')"  - $element and $event are the DOM objects of the data-dd-evt element
   * @returns {void}
   */
  ddEvt() {
    this._debug('ddEvt', '--------- ddEvt ------', 'orange', '#F4EA9E');
    const attrName = 'data-dd-evt';
    const elems = this._listElements(attrName, '');
    this._debug('ddEvt', `found elements:: ${elems.length}`, 'orange');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName).trim(); // mouseenter @@ runEVT($element, $event, 'red') && mouseleave @@ runEVT($element, $event, 'green')
      const directives = attrVal.split('&&');

      for (const directive of directives) {
        const attrValSplited = directive.split(this.$dd.separator);
        if (!attrValSplited[0] || !attrValSplited[1]) { console.error(`Attribute "data-dd-evt" has bad definition (data-dd-evt="${attrVal}").`); continue; }

        const eventName = attrValSplited[0].trim();
        const funcDefs = attrValSplited[1]; // func1();func2();

        const handler = async event => {
          await this._funcsExe(funcDefs, elem, event);
          this._debug('ddEvt', `Executed ddEvt listener --> ${funcDefs}`, 'orangered');
        };

        elem.addEventListener(eventName, handler);
        this.$dd.listeners.push({ eventName, attrName, elem, handler, eventName });
        this._debug('ddEvt', `pushed::  tag: ${elem.localName} | data-dd-evt | event: ${eventName} | ddListeners: ${this.$dd.listeners.length}`, 'orange');
      }
    }
  }



  /**
   * data-dd-set="<controllerProperty> [@@convertType|convertTypeDont]"
   * Parse the "data-dd-set" attribute. Get the value from elements like INPUT, SELECT, TEXTAREA, .... and set the controller property i.e. $model.
   * Examples:
   * data-dd-set="product" - product is the controller property
   * data-dd-set="product.name"
   * data-dd-set="product.price @@ convertType" -> will convert price to number
   * data-dd-set="product.price @@ convertTypeDont" -> will not convert price to number, it will stay string
   * @returns {void}
   */
  ddSet() {
    this._debug('ddSet', '--------- ddSet ------', 'orange', '#F4EA9E');

    const attrName = 'data-dd-set';
    const elems = this._listElements(attrName, '');
    this._debug('ddSet', `found elements:: ${elems.length}`, 'orange');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      if (!attrVal) { console.error(`Attribute "data-dd-set" has bad definition (data-dd-set="${attrVal}").`); continue; }

      const attrValSplited = attrVal.split(this.$dd.separator);

      const prop = attrValSplited[0].trim();

      const convertType_param = !!attrValSplited[1] ? attrValSplited[1].trim() : ''; // 'convertType' | 'convertTypeDont'
      const convertType = convertType_param === 'convertTypeDont' ? false : true;

      const handler = event => {
        const val = this._getElementValue(elem, convertType);
        this._setControllerValue(prop, val);
        this._debug('ddSet', `Executed ddSet listener --> controller property:: ${prop} = ${val}`, 'orangered');
      };

      const eventName = 'input';
      elem.addEventListener(eventName, handler);
      this.$dd.listeners.push({ attrName, elem, handler, eventName });
      this._debug('ddSet', `pushed::  <${elem.localName} ${attrName}="${attrVal}"> | ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }



  /**
   * data-dd-model="<controllerProp> [@@convertType|convertTypeDont]"
   * Bind controller property and view INPUT, SELECT, TEXTAREA, ...etc in both directions.
   * When the view is updated the controller property will be updated and when controller property is updated the view will be updated.
   * This is a shortcut of ddSet and ddValue, for example <input type="text" data-dd-input="product" data-dd-set="product"> is <input type="text" data-dd-model="product">
   * Example:
   * data-dd-model="product.name"
   * data-dd-model="$model.product.name"  --> $model. should be omitted althought it will not cause issue
   * data-dd-model="product.price @@ convertType" -> will convert price to number
   * data-dd-model="product.price @@ convertTypeDont" -> will not convert price to number, it will stay string
   * @returns {void}
   */
  ddModel() {
    this._debug('ddModel', '--------- ddModel ------', 'orange', '#F4EA9E');

    const attrName = 'data-dd-model';
    const elems = this._listElements(attrName, '');
    this._debug('ddModel', `found elements:: ${elems.length}`, 'orange');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      if (!attrVal) { console.error(`Attribute "data-dd-model" has bad definition (data-dd-model="${attrVal}").`); continue; }

      const attrValSplited = attrVal.split(this.$dd.separator);

      const mprop = attrValSplited[0].replace('$model.', '').trim(); // $model property name (without $model.)

      const convertType_param = !!attrValSplited[1] ? attrValSplited[1].trim() : ''; // 'convertType' | 'convertTypeDont'
      const convertType = convertType_param === 'convertTypeDont' ? false : true;

      /** SETTER **/
      const val1 = this._getModelValue(mprop);
      this._setElementValue(elem, val1);
      this._debug('ddModel', `ddModel set element value  --> controller property:: ${mprop} = ${val1} | elem.type:: ${elem.type}`, 'orangered');

      /** LISTENER **/
      const handler = event => {
        const val2 = this._getElementValue(elem, convertType);
        this._setModelValue(mprop, val2); // this will trigger render()
        this._debug('ddModel', `Executed ddModel listener --> controller property:: ${mprop} = ${val2}`, 'orangered');
      };

      const eventName = 'input';
      elem.addEventListener(eventName, handler);
      this.$dd.listeners.push({ attrName, elem, handler, eventName });
      this._debug('ddModel', `ddModel listener -- pushed::  <${elem.localName} ${attrName}="${attrVal}"> -- ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }



}


export default DataDdListeners;

