import Auxiliary from './Auxiliary.js';
import navig from '../lib/navig.js';


/**
 * Parse HTML elements with the "dd-" attribute (event listeners)
 */
class DdListeners extends Auxiliary {

  constructor() {
    super();
  }


  /**
   * Remove all listeners (click, input, keyup, ...) from the elements with the "dd-..." attribute when controller is destroyed i.e. when URL is changed.
   * See /core/lib/navig.js
   */
  ddUNLISTEN() {
    this._debug('ddUNLISTEN', `------- ddUNLISTEN (start) ctrl: ${this.constructor.name} -------`, 'orange', '#FFD8B6');

    let i = 1;
    for (const ddListener of this.$dd.listeners) {
      ddListener.elem.removeEventListener(ddListener.eventName, ddListener.handler);
      this._debug('ddUNLISTEN', `${i}. killed:: ${ddListener.attrName} --- ${ddListener.eventName} --- ${ddListener.elem.localName} -- ${ddListener.elem.innerHTML} -- ctrl:: ${this.constructor.name}`, 'orange');
      i++;
    }

    this.$dd.listeners = [];
    this._debug('ddUNLISTEN', '------- ddUNLISTEN (end) -------', 'orange', '#FFD8B6');
  }



  /**
   * dd-href  |  dd-href="ctrlProp"
   *  Href listeners and changing URLs (browser history states).
   *  NOTICE: The click on dd-href element will destroy current controller i.e. ddUNLISTEN() will be invoked.
   * Examples:
   *  <a href="/product/12" dd-href>Product 12</a> - when link is hovered the URL will be shown in browser status bar
   *  <a href="" dd-href="/product/12">Product 12</a>
   */
  ddHref() {
    this._debug('ddHref', '--------- ddHref ------', 'orange', '#F4EA9E');

    const attrName = 'dd-href';
    const elems = this._listElements(attrName, '');
    this._debug('ddHref', `found elements:: ${elems.length}`, 'orange');


    for (const elem of elems) {
      const attrVal = elem.getAttribute('dd-href');
      const { base, opts } = this._decomposeAttribute(attrVal);
      const val = this._solveBase(base);
      this._debug('ddHref', `dd-href="${attrVal}" :: ${base} = ${val}`, 'orangered');
      !!val && elem.setAttribute('href', val); // override href with dd-href


      const handler = async event => {
        event.preventDefault();

        // change browser's address bar (emit 'pushstate' event)
        const url = val || elem.getAttribute('href');
        const state = { href: url };
        const title = !!elem.innerText ? elem.innerText.trim() : '';
        if (!!url) { navig.goto(url, state, title); }

        this._debug('ddHref', `Executed ddHref listener -->  href: ${url}, ctrl:: ${this.constructor.name}`, 'orangered');
      };

      const eventName = 'click';
      elem.addEventListener(eventName, handler);
      this.$dd.listeners.push({ attrName, elem, handler, eventName });
      this._debug('ddHref', `pushed::  tag: ${elem.localName} | href="${elem.pathname}" | ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }


  /**
   * dd-set="controllerProperty [--convertType]"
   *  Get the value from the form elements like INPUT, SELECT, TEXTAREA and when value is changed ("input" event) set the controller property i.e. $model.
   * Examples:
   *  <input dd-set="myPet">
   *  <select dd-set="$model.age --convertType">
   *  <select dd-set="$model.user[{{ this.id }}]"> - mustache in the controller propery name definition
   */
  ddSet() {
    this._debug('ddSet', '--------- ddSet ------', 'orange', '#F4EA9E');

    const attrName = 'dd-set';
    const elems = this._listElements(attrName, '');
    this._debug('ddSet', `found elements:: ${elems.length}`, 'orange');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);

      // solve the controller property name and get the controller property value
      const prop = base.replace(/^this\./, '');

      const convertType = opts[0] === 'convertType';

      const handler = async event => {
        const val = this._getElementValue(elem, convertType);
        this._setControllerValue(prop, val);
        this._debug('ddSet', `Executed ddSet listener --> ${base} = ${val} - convertType: ${convertType}`, 'orangered');
      };

      const eventName = 'input';
      elem.addEventListener(eventName, handler);
      this.$dd.listeners.push({ attrName, elem, handler, eventName });
      this._debug('ddSet', `pushed::  tag: ${elem.localName} | dd-set="${attrVal}" | ctrl="${this.constructor.name}" | ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }



  /**
   * dd-model="controllerProperty [--convertType]"
   *  Bind controller property and view INPUT, SELECT, TEXTAREA, ...etc in both directions.
   *  When the view is updated the controller property will be updated and when controller property is updated the view will be updated.
   *  This is a shortcut of ddSet and ddValue, for example <input type="text" dd-input="$model.product" dd-set="$model.product"> is <input type="text" dd-model="$model.product">
   * Examples:
   *  dd-model="$model.product.name"
   *  dd-model="$model.product.price -- convertType" -> will convert price to number
   */
  ddModel() {
    this._debug('ddModel', '--------- ddModel ------', 'orange', '#F4EA9E');

    const attrName = 'dd-model';
    const elems = this._listElements(attrName, '');
    this._debug('ddModel', `found elements:: ${elems.length}`, 'orange');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);

      // solve the controller property name and get the controller property value
      let prop = base.replace(/^this\./, '');
      if (!!prop && !prop.includes('$model')) { prop = '$model.' + prop; }

      const convertType = opts[0] === 'convertType';

      /** set element value, checked, selected attributes **/
      const val_ctrl = this._getControllerValue(prop);
      if (elem.type === 'checkbox' || elem.type === 'radio') {
        this._setElementChecked(elem, val_ctrl);
      } else if (elem.type === 'select-one') {
        this._setElementValue(elem, val_ctrl);
        this._setElementSelected_one(elem, val_ctrl);
      } else if (elem.type === 'select-multiple') {
        this._setElementValue(elem, val_ctrl);
        this._setElementSelected_multiple(elem, val_ctrl);
      } else {
        this._setElementValue(elem, val_ctrl);
      }

      this._debug('ddModel', `ddModel set the element value  --> ${base} = ${val_ctrl} | elem.type:: ${elem.type}`, 'orangered');

      /* set controller value */
      const handler = async event => {
        const val = this._getElementValue(elem, convertType);
        this._setControllerValue(prop, val);
        this._debug('ddModel', `Executed ddModel listener --> ${base} = ${val}`, 'orangered');
      };

      const eventName = 'input';
      elem.addEventListener(eventName, handler);
      this.$dd.listeners.push({ attrName, elem, handler, eventName });
      this._debug('ddModel', `pushed::  tag: ${elem.localName} | dd-set="${attrVal}" | ctrl="${this.constructor.name}" | ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }



  /**
   * dd-click="<controllerMethod | expression> [--preventDefault]"
   *  Listen for click and execute the function i.e. controller method.
   *  Option --preventDefault is usually used to block link to be opened.
   * Examples:
   *  <button dd-click="myFunc()">CLICK ME</button>
   *  <button button dd-click="(alert('some alert'))">ALERT ME</button>
   */
  ddClick() {
    this._debug('ddClick', '--------- ddClick ------', 'orange', '#F4EA9E');

    const attrName = 'dd-click';
    const elems = this._listElements(attrName, '');
    this._debug('ddClick', `found elements:: ${elems.length}`, 'orange');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName); // string 'myFunc(x, y, ...restArgs);myFunc2(); -- preventDefault'
      const { base, opts } = this._decomposeAttribute(attrVal);
      const tf = opts.includes('preventDefault');

      const handler = async event => {
        if (tf) { event.preventDefault(); }
        await this._funcsExe(base, elem, event);
        this._debug('ddClick', `Executed ddClick listener --> ${base} | preventDefault: ${tf}`, 'orangered');
      };

      const eventName = 'click';
      elem.addEventListener(eventName, handler);
      this.$dd.listeners.push({ attrName, elem, handler, eventName });
      this._debug('ddClick', `pushed::  tag: ${elem.localName} | dd-click="${attrVal}" | preventDefault: ${tf} | ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }



  /**
   * dd-enter="<controllerMethod | expression [--preventDefault]>"
   *  Listen when enter key is pressed and execute the function i.e. controller method.
   *  Option --preventDefault is usually used to block a HTML form to execute.
   * Examples:
   *  <input type="text" dd-enter="myFunc()">
   *  <input type="text" dd-enter="(alert('some txt')) --preventDefault">
   */
  ddEnter() {
    this._debug('ddEnter', '--------- ddEnter ------', 'orange', '#F4EA9E');

    const attrName = 'dd-enter';
    const elems = this._listElements(attrName, '');
    this._debug('ddEnter', `found elements:: ${elems.length}`, 'orange');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName); // string 'myFunc(x, y, ...restArgs);myFunc2(); -- preventDefault'
      const { base, opts } = this._decomposeAttribute(attrVal);
      const tf = opts.includes('preventDefault');

      const handler = async event => {
        const eventCode = event.code ? event.code.toLowerCase() : '';
        if (eventCode !== 'enter') { return; }

        if (tf) { event.preventDefault(); }

        await this._funcsExe(base, elem, event);
        this._debug('ddEnter', `Executed ddEnter listener --> ${base}`, 'orangered');
      };

      const eventName = 'keyup';
      elem.addEventListener(eventName, handler);
      this.$dd.listeners.push({ attrName, elem, handler, eventName });
      this._debug('ddEnter', `pushed::  tag: ${elem.localName} | dd-enter="${attrVal}" | ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }



  /**
   * dd-keyup="<controllerMethod | expression> [--keyCode]"
   *  Parse the "dd-keyup" attribute. Listen for the keyup event on certain element and execute the controller method or expression.
   * Examples:
   *  <input type="text" dd-keyup="myFunc()"> - it will execute myFunc on every key
   *  <input type="text" dd-keyup="myFunc() --enter"> - it will execute myFunc on Enter
   */
  ddKeyup() {
    this._debug('ddKeyup', '--------- ddKeyup ------', 'orange', '#F4EA9E');

    const attrName = 'dd-keyup';
    const elems = this._listElements(attrName, '');
    this._debug('ddKeyup', `found elements:: ${elems.length}`, 'orange');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const keyCode = opts[0];

      const handler = async event => {
        const eventCode = event.code ? event.code.toLowerCase() : '';
        if (!!keyCode && keyCode !== eventCode) { return; }
        await this._funcsExe(base, elem, event);
        this._debug('ddKeyup', `Executed ddKeyup listener --> ${base} | eventCode: ${eventCode}`, 'orangered');
      };

      const eventName = 'keyup';
      elem.addEventListener(eventName, handler);
      this.$dd.listeners.push({ attrName, elem, handler, eventName });
      this._debug('ddKeyup', `pushed::  tag: ${elem.localName} | dd-keyup="${attrVal}" | ctrl="${this.constructor.name}" | ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }



  /**
   * dd-change="<controllerMethod | expression>"
   *  Listen for HTML element value change (HTML form elements) and execute the controller method or expression.
   * Examples:
   *  <select dd-change="myFunc()">
   */
  ddChange() {
    this._debug('ddChange', '--------- ddChange ------', 'orange', '#F4EA9E');

    const attrName = 'dd-change';
    const elems = this._listElements(attrName, '');
    this._debug('ddChange', `found elements:: ${elems.length}`, 'orange');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);

      const handler = async event => {
        await this._funcsExe(base, elem, event);
        this._debug('ddChange', `Executed ddChange listener --> ${base}`, 'orangered');
      };

      const eventName = 'change';
      elem.addEventListener(eventName, handler);
      this.$dd.listeners.push({ attrName, elem, handler, eventName });
      this._debug('ddChange', `pushed::  tag: ${elem.localName} | dd-change="${attrVal}" | ctrl="${this.constructor.name}" | ddListeners: ${this.$dd.listeners.length}`, 'orange');
    }
  }



  /**
  * dd-evt="<controllerMethod1 | expression1> --eventName1 && <controllerMethod2 | expression2> --eventName2 && ..."
  *  Listen for specific event and execute the controller method or JS expression.
  *  A complex event executions can be made by chaining multiple commands.
  * Example:
  *  dd-evt="myFunc($element, $event, 25, 'some text') --mouseenter"  - $element and $event are the DOM objects of the dd-evt element
  * @returns {void}
  */
  ddEvt() {
    this._debug('ddEvt', '--------- ddEvt ------', 'orange', '#F4EA9E');

    const attrName = 'dd-evt';
    const elems = this._listElements(attrName, '');
    this._debug('ddEvt', `found elements:: ${elems.length}`, 'orange');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const commands = attrVal.split('&&').map(directive => directive.trim());

      for (const command of commands) {
        const { base, opts } = this._decomposeAttribute(command);

        const eventName = opts[0];
        if (!eventName) { this._printError(`dd-evt="${attrVal}" -> The eventName is not defined`); continue; }

        const handler = async event => {
          await this._funcsExe(base, elem, event);
          this._debug('ddEvt', `Executed ddEvt listener --> ${base}`, 'orangered');
        };

        elem.addEventListener(eventName, handler);
        this.$dd.listeners.push({ attrName, elem, handler, eventName });
        this._debug('ddEvt', `pushed::  tag: ${elem.localName} | dd-evt="${attrVal}" | ctrl="${this.constructor.name}" | ddListeners: ${this.$dd.listeners.length}`, 'orange');
      }

    }

  }



}


export default DdListeners;

