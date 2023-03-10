import DdCloners from './DdCloners.js';


/**
 * Non-cloner dd- directives.
 * The methods are mostly related on managing attributes like: disabled, src, ...
 */
class Dd extends DdCloners {

  constructor() {
    super();

    this.$dd = {
      elems: {},  // set by ddElem()
      listeners: [], // collector of the dd- listeners  [{attrName, elem, handler, eventName}]
      attributes: [
        // non-cloner directives
        'dd-show',
        'dd-disabled',
        'dd-checked',
        'dd-class',
        'dd-style',
        'dd-src',
        'dd-attr',

        // cloner directives
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
   * dd-show="controllerProperty"  or  dd-show="(expression)"
   *  Show or hide the HTML element by setting display:none.
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
      if (this._hasBlockString(elem.outerHTML)) { continue; } // block rendering if the element contains $$

      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);

      let val = false;
      let prop_solved = '';
      if (/\(.*\)/.test(base)) {
        // solve the expression
        const prop_solved = this._solveMustache(base); // dd-show="(product_{{this.pid}} === 'Shoes')"
        const expr = prop_solved;
        val = this._solveExpression(expr);
      } else {
        // solve the controller property name and get the controller property value
        prop_solved = base.replace(/^this\./, ''); // remove this. --> dd-show="this.product_{{this.pid}}"
        prop_solved = this._solveMustache(prop_solved); // dd-show="product_{{this.pid}}"
        val = this._getControllerValue(prop_solved);
      }

      this._debug('ddShow', `dd-show="${attrVal}" :: ${base} --> ${prop_solved} = ${val}`, 'navy');

      // hide orig element
      val ? elem.style.display = '' : elem.style.display = 'none';

      // remove style
      if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }
    }

    this._debug('ddShow', '--------- ddShow (end) ------', 'navy', '#B6ECFF');
  }




  /********************************* ATTRIBUTE MANAGERS **********************************/
  /***************************************************************************************/

  /**
   * dd-disabled="controllerProperty"  or  dd-disabled="(expression)"
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
      if (this._hasBlockString(elem.outerHTML)) { continue; } // block rendering if the element contains $$

      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);

      let val = false;
      let prop_solved = '';
      if (/\(.*\)/.test(base)) {
        // solve the expression
        const prop_solved = this._solveMustache(base); // dd-show="(product_{{this.pid}} === 'Shoes')"
        const expr = prop_solved;
        val = this._solveExpression(expr);
      } else {
        // solve the controller property name and get the controller property value
        prop_solved = base.replace(/^this\./, '');
        prop_solved = this._solveMustache(prop_solved);
        val = this._getControllerValue(prop_solved);
      }

      this._debug('ddDisabled', `dd-disabled="${attrVal}" :: ${base} --> ${prop_solved} = ${val}`, 'navy');

      // hide orig element
      elem.disabled = val;

      // show element & remove style
      elem.style.display = '';
      if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }
    }

    this._debug('ddDisabled', '--------- ddDisabled (end) ------', 'navy', '#B6ECFF');
  }


  /**
   * dd-checked="<controllerProperty>"
   * Sets the "checked" attribute with the controller property value.
   * Use it for checkbox or radio input elements.
   * CHECKBOX --> The controller value should be array of strings.
   * RADIO --> The controller value should be a string.
   * Example:
   * dd-checked="selectedProducts"
   */
  ddChecked() {
    this._debug('ddChecked', '--------- ddChecked ------', 'navy', '#B6ECFF');

    const attrName = 'dd-checked';
    const elems = this._listElements(attrName);
    this._debug('ddChecked', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);

      // show element & remove style
      elem.style.display = '';
      if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }

      if (this._hasBlockString(elem.outerHTML)) { continue; } // block rendering if the element contains $$

      // solve the controller property name and get the controller property value
      let prop_solved = base.replace(/^this\./, '');
      prop_solved = this._solveMustache(prop_solved);
      const val = this._getControllerValue(prop_solved);

      if (val === undefined) { continue; }

      if (elem.type === 'checkbox') { // CHECKBOX
        if (Array.isArray(val) && val.indexOf(elem.value) !== -1) {
          elem.checked = true;
          elem.setAttribute('checked', '');
        } else {
          elem.checked = false;
          elem.removeAttribute('checked');
        }
      } else if (elem.type === 'radio') { // RADIO
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
   * dd-class="<controllerProperty> [--replace]"
   * Sets the "class" attribute with the controller property value.
   * The controller property value should be an array of strings, for example: ['red-bold', 'centered-text']
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

      // show element & remove style
      elem.style.display = '';
      if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }

      if (this._hasBlockString(elem.outerHTML)) { continue; } // block rendering if the element contains $$

      // solve the controller property name and get the controller property value
      let prop_solved = base.replace(/^this\./, '');
      prop_solved = this._solveMustache(prop_solved);
      const val_arr = this._getControllerValue(prop_solved); // val must be array

      // checks
      if (val_arr === undefined) { continue; }
      if (!Array.isArray(val_arr)) { console.log(`%c ddClass Warn:: The controller property "${base}" is not an array.`, `color:Maroon; background:LightYellow`); continue; }

      const act = opts[0] || '';

      if (act === 'replace' && !!val_arr.length) { elem.removeAttribute('class'); }
      for (const val of val_arr) { elem.classList.add(val); }

      this._debug('ddClass', `dd-class="${attrVal}" :: ${base} --> ${prop_solved} = ${val_arr} | act:: ${act}`, 'navy');
    }

    this._debug('ddClass', '--------- ddClass (end) ------', 'navy', '#B6ECFF');
  }


  /**
   * dd-style="<controllerProperty> [--replace]"
   * Sets the "class" attribute with the controller property value.
   * The controller property value should be an object, for example: {'font-size': '25px'} or null.
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

      // show element & remove style
      elem.style.display = '';
      if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }

      if (this._hasBlockString(elem.outerHTML)) { continue; } // block rendering if the element contains $$

      // solve the controller property name and get the controller property value
      let prop_solved = base.replace(/^this\./, '');
      prop_solved = this._solveMustache(prop_solved);
      const val_obj = this._getControllerValue(prop_solved); // val must be array

      // checks
      if (val_obj === undefined) { continue; }
      if (typeof val_obj !== 'object' || (typeof val_obj === 'object' && Array.isArray(val_obj))) { console.log(`%c ddStyle Warn:: The controller property "${base}" is not an object.`, `color:Maroon; background:LightYellow`); continue; }

      const act = opts[0] || '';

      if (act === 'replace') { elem.removeAttribute('style'); }

      if (val_obj !== null) {
        for (const styleProp of Object.keys(val_obj)) {
          elem.style[styleProp] = val_obj[styleProp];
        }
      }

      this._debug('ddStyle', `dd-style="${attrVal}" :: ${base} --> ${prop_solved} = ${JSON.stringify(val_obj)} | act:: ${act}`, 'navy');
    }

    this._debug('ddStyle', '--------- ddStyle (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-src="<controllerProperty> [--<defaultSrc>]"
   * Set element src attribute.
   * The controller property value should be a string.
   * Examples:
   * dd-src="imageURL"
   */
  ddSrc() {
    this._debug('ddSrc', '--------- ddSrc ------', 'navy', '#B6ECFF');

    const attrName = 'dd-src';
    const elems = this._listElements(attrName);
    this._debug('ddSrc', `found elements:: ${elems.length}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);

      // show element & remove style
      elem.style.display = '';
      if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }

      if (this._hasBlockString(elem.outerHTML)) { continue; } // block rendering if the element contains $$

      // solve the controller property name and get the controller property value
      let prop_solved = base.replace(/^this\./, '');
      prop_solved = this._solveMustache(prop_solved);
      const val = this._getControllerValue(prop_solved); // val must be array

      const defaultSrc = opts[0] || '';
      const src = val || defaultSrc;
      elem.src = src;

      this._debug('ddSrc', `dd-style="${attrVal}" :: ${base} --> ${prop_solved} = ${val} | src:: ${src}`, 'navy');
    }

    this._debug('ddSrc', '--------- ddSrc (end) ------', 'navy', '#B6ECFF');
  }




  /**
   * dd-attr="<controllerProperty> [--attributeName]"
   * Sets any attribute with the controller property value.
   * The controller property value should a string.
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

      // show element & remove style
      elem.style.display = '';
      if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }

      if (this._hasBlockString(elem.outerHTML)) { continue; } // block rendering if the element contains $$

      // solve the controller property name and get the controller property value
      let prop_solved = base.replace(/^this\./, '');
      prop_solved = this._solveMustache(prop_solved);
      const val = this._getControllerValue(prop_solved); // val must be array

      // checks
      if (val === undefined || val === null) { continue; }
      if (typeof val !== 'string') { console.log(`%c ddAttr Warn:: The controller property "${base}" is not a string.`, `color:Maroon; background:LightYellow`); continue; }

      const attributeName = opts[0] || '';
      if (!attributeName) { console.log(`%c ddAttr Warn:: The attribute name is not defined in dd-attr="${attrVal}"`, `color:Maroon; background:LightYellow`); continue; }

      elem.setAttribute(attributeName, val);

      this._debug('ddAttr', `dd-style="${attrVal}" :: ${base} --> ${prop_solved} = ${val} | attributeName:: ${attributeName}`, 'navy');
    }

    this._debug('ddAttr', '--------- ddAttr (end) ------', 'navy', '#B6ECFF');
  }











}




export default Dd;
