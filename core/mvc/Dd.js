import DdCloners from './DdCloners.js';


/**
 * Non-cloner dd- directives.
 * The methods are mostly related on managing attributes like: disabled, src, ...
 */
class Dd extends DdCloners {

  constructor() {
    super();

    this.$dd = {
      __initFinished: false, // is __init() lifecycle hook executed
      elems: {},  // set by ddElem()
      listeners: [], // collector of the dd- listeners  [{attrName, elem, handler, eventName}]
      noncloner_directives: [
        'dd-show',
        'dd-disabled',
        'dd-checked',
        'dd-selected',
        'dd-class',
        'dd-style',
        'dd-src',
        'dd-attr',
        'dd-value',
      ],
      cloner_directives: [
        'dd-text',
        'dd-html',
        'dd-mustache',
        'dd-if', 'dd-elseif', 'dd-else',
        'dd-foreach',
        'dd-repeat'
      ]
    };

  }



  /**
   * dd-setinitial="controllerProperty [--convertType]"
   *  Get the element value and set the controller property value when route is opened i.e. when controller is executed.
   *  This directive can be applied on input, textarea or select tag.
   * Examples:
   * dd-setinitial="product" or dd-setinitial="product --convertType" - convert data type automatically, for example: '5' convert to Number, or JSON to Object
   */
  ddSetinitial() {
    this._debug('ddSetinitial', '--------- ddSetinitial ------', 'navy', '#B6ECFF');

    const attrName = 'dd-setinitial';
    const elems = this._listElements(attrName);
    this._debug('ddSetinitial', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);

      // show element & remove style
      elem.style.display = '';
      if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }

      // solve the controller property name and get the controller property value
      let prop_solved = base.replace(/^this\./, '');
      prop_solved = this._solveMustache(prop_solved);

      const convertType = opts[0] === 'convertType';

      const val = this._getElementValue(elem, convertType); // element value, for example <input value="55">

      this._debug('ddSetinitial', `dd-setinitial="${attrVal}" :: ${base} --> ${prop_solved} = ${val} , convertType: ${convertType}`, 'navy');

      this._setControllerValue(prop_solved, val);
    }

    this._debug('ddSetinitial', '--------- ddSetinitial (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-elem="<ddElemsProp>"     --> ddElemsProp is the property of the this.$dd.elems, for example dd-elem="myElement" => this.$dd.elems.myElement
   *  Transfer the DOM element to the controller property "this.$dd.elems".
   * Examples:
   * dd-elem="paragraf" -> fetch it with this.$dd.elems.paragraf
   */
  ddElem() {
    this._debug('ddElem', '--------- ddElem ------', 'navy', '#B6ECFF');

    const attrName = 'dd-elem';
    const elems = this._listElements(attrName);
    this._debug('ddElem', `found elements:: ${elems.length}`, 'navy');

    // associate values to $dd
    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName) || ''; // 'paragraf'
      const { base } = this._decomposeAttribute(attrVal);
      this.$dd.elems[base] = elem; // this.$dd.elems.paragraf
    }
  }



  /**
   * dd-show="controllerProperty [--visibility]" | dd-show="(expression) [--visibility]"
   *  Show or hide the HTML element.
   * Option:
   * dd-show="ctrlProp" → Show/hide elements by setting up display:none inline CSS style.
   * dd-show="ctrlProp --visibility" → Show/hide elements by setting up visibility:visible|hidden inline CSS style.
   * Examples:
   * dd-show="isActive"                         - isActive is the controller property, it can also be model $model.isActive
   * dd-show="this.isActive"                    - this. will not cause the error
   * dd-show="(this.a < 5 && this.a >= 8)"      - expression
   * dd-show="(this.$model.name === 'John')"    - expression with model
   * dd-show="(this.$model.name_{{this.num}} === 'Betty')"    - dynamic controller property name (mustcahe)
   */
  ddShow() {
    this._debug('ddShow', `--------- ddShow (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-show';
    const elems = this._listElements(attrName);
    this._debug('ddShow', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      const isVisibility = !!opts && !!opts[0] && opts[0] === 'visibility';
      this._debug('ddShow', `dd-show="${attrVal}" :: ${base} --> ${prop_solved} = ${val} , isVisibility:${isVisibility}`, 'navy');

      // hide original element
      if (isVisibility) {
        elem.style.display = '';
        val ? elem.style.visibility = 'visible' : elem.style.visibility = 'hidden';
      } else {
        val ? elem.style.display = '' : elem.style.display = 'none';
      }

      // remove style if it's empty
      if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }
    }

    this._debug('ddShow', '--------- ddShow (end) ------', 'navy', '#B6ECFF');
  }




  /********************************* ATTRIBUTE MANAGERS **********************************/
  /***************************************************************************************/
  /**
   * dd-value="controllerProperty" | dd-value="(expression)"
   *  Take controller property and set the element attribute and DOM property value.
   *  The controller property value is automatically converted to string.
   * Examples:
   * dd-value="product"
   * dd-value="$model.product"
   * dd-value="(this.product)"
   */
  ddValue() {
    this._debug('ddValue', '--------- ddValue ------', 'navy', '#B6ECFF');

    const attrName = 'dd-value';
    const elems = this._listElements(attrName);
    this._debug('ddValue', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      this._debug('ddValue', `dd-value="${attrVal}" :: ${base} --> ${prop_solved} = ${val}`, 'navy');

      if (val === undefined || val === null) { continue; } // don't render elements with undefined controller's value
      this._setElementValue(elem, val); // set value attribute and DOM property
    }

    this._debug('ddValue', '--------- ddValue (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-disabled="controllerProperty" | dd-disabled="(expression)"
   *  Disable the HTML element by setting disabled attribute.
   * Examples:
   * dd-disabled="isActive"                         - isActive is the controller property, it can also be model $model.isActive
   * dd-disabled="this.isActive"                    - this. will not cause the error
   * dd-disabled="(this.a < 5 && this.a >= 8)"      - expression
   * dd-disabled="(this.$model.name === 'John')"    - expression with model
   * dd-disabled="(this.$model.name_{{this.num}} === 'Betty')"    - dynamic controller property name (mustcahe)
   */
  ddDisabled() {
    this._debug('ddDisabled', `--------- ddDisabled (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-disabled';
    const elems = this._listElements(attrName);
    this._debug('ddDisabled', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      this._debug('ddDisabled', `dd-disabled="${attrVal}" :: ${base} --> ${prop_solved} = ${val}`, 'navy');

      // hide orig element
      elem.disabled = !!val;

      // show element & remove style
      elem.style.display = '';
      if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }
    }

    this._debug('ddDisabled', '--------- ddDisabled (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-checked="controllerProperty" | dd-checked="(expression)"
   *  Set the "checked" attribute with the controller property value.
   *  Use it for checkbox or radio input elements only.
   *   CHECKBOX --> The controller value should be array of strings
   *   RADIO --> The controller value should be a string
   */
  ddChecked() {
    this._debug('ddChecked', '--------- ddChecked ------', 'navy', '#B6ECFF');

    const attrName = 'dd-checked';
    const elems = this._listElements(attrName);
    this._debug('ddChecked', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      this._debug('ddChecked', `dd-checked="${attrVal}" :: ${base} --> ${prop_solved} = ${val}`, 'navy');

      if (val === undefined) { continue; }

      if (elem.type === 'checkbox') { // CHECKBOX
        !Array.isArray(val) && this._printError(`The checkbox expects an array. The incorrect value is ${val}.`);
        if (Array.isArray(val) && val.indexOf(elem.value) !== -1) {
          elem.checked = true;
          elem.setAttribute('checked', '');
        } else {
          elem.checked = false;
          elem.removeAttribute('checked');
        }
      } else if (elem.type === 'radio') { // RADIO
        Array.isArray(val) && this._printError(`The radio doesn't expect an array. The incorrect value is ${val}.`);
        if (val === elem.value) {
          elem.checked = true;
          elem.setAttribute('checked', '');
        } else {
          elem.checked = false;
          elem.removeAttribute('checked');
        }
      }

      this._debug('ddChecked', `dd-checked="${attrVal}" :: ${base} --> ${prop_solved} = ${val} ; elem.value: ${elem.value} ; elem.checked: ${elem.checked}`, 'navy');
    }

    this._debug('ddChecked', '--------- ddChecked (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-selected="controllerProperty [--multiple]" | dd-checked="(expression) [--multiple]"
   *  Sets the "selected" attribute with the controller property value.
   *  Use it for select input element.
   *   SELECT-MULTIPLE --> The controller value should be array of strings.
   *   SELECT-ONE --> The controller value should be a string.
   * Example:
   * dd-selected="selectedProducts --multiple"
   */
  ddSelected() {
    this._debug('ddSelected', '--------- ddSelected ------', 'navy', '#B6ECFF');

    const attrName = 'dd-selected';
    const elems = this._listElements(attrName);
    this._debug('ddSelected', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      this._debug('ddSelected', `dd-selected="${attrVal}" :: ${base} --> ${prop_solved} = ${val}`, 'navy');

      if (val === undefined) { continue; }

      if (elem.type === 'select-multiple') { // SELECT-MULTIPLE
        !Array.isArray(val) && this._printError(`The select-multiple expects an array. The incorrect value is ${val}.`);
        for (const option of elem.options) { option.selected = Array.isArray(val) && val.indexOf(option.value) !== -1; }
      } else if (elem.type === 'select-one') { // SELECT-ONE
        Array.isArray(val) && this._printError(`The select-one doesn't expect an array. The incorrect value is ${val}.`);
        for (const option of elem.options) { option.selected = val === option.value; }
      }
    }

    this._debug('ddSelected', '--------- ddSelected (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-class="controllerProperty [--replace]" | dd-class="(expression) [--replace]"
   *  Sets the "class" attribute with the controller property value.
   *  The controller property value should be an array of strings, for example: ['red-bold', 'centered-text']
   * Examples:
   * dd-class="myKlass"             - add new classes to existing classes
   * dd-class="myKlass --replace"   - replace existing classes with new classes
   */
  ddClass() {
    this._debug('ddClass', '--------- ddClass ------', 'navy', '#B6ECFF');

    const attrName = 'dd-class';
    const elems = this._listElements(attrName);
    this._debug('ddClass', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      const act = opts && opts[0] ? opts[0] : '';
      this._debug('ddClass', `dd-class="${attrVal}" :: ${base} --> ${prop_solved} = ${JSON.stringify(val)} | act:: ${act}`, 'navy');

      // checks
      if (val === undefined) { continue; }
      if (!Array.isArray(val)) { this._printWarn(`dd-class="${attrVal}" -> The value is not array.`); continue; }

      if (act === 'replace' && !!val.length) { elem.removeAttribute('class'); }
      for (const v of val) {
        elem.classList.add(v);
      }
    }

    this._debug('ddClass', '--------- ddClass (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-style="controllerProperty [--replace]" | dd-style="(expression) [--replace]"
   *  Sets the "class" attribute with the controller property value.
   *  The controller property value should be an object, for example: {'font-size': '25px'}
   * Examples:
   * dd-style="myStyle"             - add new styles to existing styles
   * dd-style="myStyle --replace"   - replace existing styles with new styles
   */
  ddStyle() {
    this._debug('ddStyle', '--------- ddStyle ------', 'navy', '#B6ECFF');

    const attrName = 'dd-style';
    const elems = this._listElements(attrName);
    this._debug('ddStyle', `found elements:: ${elems.length}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      const act = opts[0] || '';
      this._debug('ddStyle', `dd-style="${attrVal}" :: ${base} --> ${prop_solved} = ${JSON.stringify(val)} | act:: ${act}`, 'navy');

      // checks
      if (val === undefined) { continue; }
      if (typeof val !== 'object' || (typeof val === 'object' && Array.isArray(val))) { this._printWarn(`dd-style="${attrVal}" -> The value is not object.`); continue; }

      if (act === 'replace') { elem.removeAttribute('style'); }

      if (val !== null) {
        for (const styleProp of Object.keys(val)) {
          elem.style[styleProp] = val[styleProp];
        }
      }
    }

    this._debug('ddStyle', '--------- ddStyle (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-src="controllerProperty [--<defaultSrc>]"
   *  Set the element src attribute.
   * Examples:
   * dd-src="imageURL"
   * dd-src="imageURL --https://via.placeholder.com/130"
   */
  ddSrc() {
    this._debug('ddSrc', '--------- ddSrc ------', 'navy', '#B6ECFF');

    const attrName = 'dd-src';
    const elems = this._listElements(attrName);
    this._debug('ddSrc', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      const defaultSrc = opts[0] || '';
      this._debug('ddSrc', `dd-src="${attrVal}" :: ${base} --> ${prop_solved} = ${val} | defaultSrc:: ${defaultSrc}`, 'navy');

      const src = val || defaultSrc;
      elem.src = src;
    }

    this._debug('ddSrc', '--------- ddSrc (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-attr="controllerProperty [--attributeName]"
   *  Sets any attribute with the controller property value.
   *  The controller property value should a string.
   * Examples:
   * dd-attr="$model.myURL --href"     - sets href in the A tag
   */
  ddAttr() {
    this._debug('ddAttr', '--------- ddAttr ------', 'navy', '#B6ECFF');

    const attrName = 'dd-attr';
    const elems = this._listElements(attrName);
    this._debug('ddAttr', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      const attributeName = opts[0] || '';
      this._debug('ddSrc', `dd-src="${attrVal}" :: ${base} --> ${prop_solved} = ${val} | attributeName:: ${attributeName}`, 'navy');

      // checks
      if (val === undefined || val === null) { continue; }
      if (typeof val !== 'string') { this._printWarn(`dd-attr="${attrVal}" -> The value is not string.`); continue; }
      if (!attributeName) { this._printWarn(`dd-attr="${attrVal}" -> The attribute name is not defined in option.`); continue; }

      elem.setAttribute(attributeName, val);
    }

    this._debug('ddAttr', '--------- ddAttr (end) ------', 'navy', '#B6ECFF');
  }





}




export default Dd;
