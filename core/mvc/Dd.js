import DdCloners from './DdCloners.js';


/**
 * Non-cloner dd- directives.
 * The methods are mostly related on managing attributes like: disabled, src, ...
 */
class Dd extends DdCloners {

  constructor() {
    super();

    this.$dd = {
      listeners: [], // collector of the dd- listeners  [{attrName, elem, handler, eventName}]
      noncloner_directives: [
        'dd-setinitial',
        'dd-elem',
        // switchers
        'dd-if', 'dd-elseif', 'dd-else',
        'dd-visible',
        // writers
        'dd-text',
        'dd-html',
        // HTML tag attribute managers
        'dd-value',
        'dd-disabled',
        'dd-checked',
        'dd-selected',
        'dd-class',
        'dd-style',
        'dd-src',
        'dd-attr',
      ],
      cloner_directives: [
        'dd-foreach',
        'dd-each',
        'dd-repeat',
        'dd-mustache'
      ]
    };


    this.$elem = {};
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

      // solve the controller property name and get the controller property value
      const prop = base.replace(/^this\./, '');
      const convertType = opts[0] === 'convertType';
      const val = this._getElementValue(elem, convertType); // element value, for example <input value="55">
      this._setControllerValue(prop, val);
      this._debug('ddSetinitial', `dd-setinitial="${attrVal}" :: ${base} = ${val} , convertType: ${convertType}`, 'navy');

      this._elemShow(elem, attrName);
    }

    this._debug('ddSetinitial', '--------- ddSetinitial (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-elem="<$elemProp>"     --> $elemProp is the property of the this.$elem, for example dd-elem="myElement" => this.$elem.myElement
   *  Transfer the DOM element to the controller property "this.$elem".
   * Examples:
   * dd-elem="paragraf" -> fetch it with this.$elem.paragraf
   */
  ddElem() {
    this._debug('ddElem', `--------- ddElem ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-elem';
    const elems = this._listElements(attrName, '');
    this._debug('ddElem', `found elements:: ${elems.length}`, 'navy');

    // associate values to $elem
    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName) || ''; // 'paragraf'
      const { base } = this._decomposeAttribute(attrVal);
      this.$elem[base] = elem; // this.$elem.paragraf

      this._elemShow(elem, attrName);
    }
  }


  /********************************* WRITERS **********************************/
  /**
   * dd-text="controllerProperty" | dd-text="controllerMethod()"
   *  Print pure text in the dd-text element.
   * Examples:
   * dd-text="firstName"                  - firstName is the controller property
   * dd-text="$model.firstName"           - $model.firstName is the controller property, when value is change it will re-render the element
   * dd-text="this.firstName"             - this. will not cause the error
   * dd-text="$model.product___{{id}}"    - dynamic controller property name
   * dd-text="get_first_name()"           - function which returns a string
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddText(modelName) {
    this._debug('ddText', `--------- ddText (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-text';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddText', `found elements:: ${elems.length} `, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const val = this._solveBase(base);
      this._debug('ddText', `dd-text="${attrVal}" :: ${base} = ${JSON.stringify(val)}`, 'navy');

      // convert controller val to string
      let val_str = this._val2str(val);

      // if val is undefined set it as empty string
      if (val === undefined || val === null) { val_str = ''; }

      // apply pipe option, for example: --pipe:slice(0,10).trim() (val_str must be a string)
      const pipeOpt = opts.find(opt => opt.includes('pipe:')); // pipe:slice(0, 3).trim()
      if (!!pipeOpt) { val_str = this._pipeExe(val_str, pipeOpt); }

      // load content in the element
      elem.textContent = val_str;

      this._elemShow(elem, attrName);
    }

    this._debug('ddText', '--------- ddText (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-html="controllerProperty" | dd-html="controllerMethod()"
   *  Embed HTML node in the DOM at a place marked with dd-html attribute.
   * Examples:
   * dd-html="firstName"                  - firstName is the controller property, it can also be model $model.firstname
   * dd-html="this.firstName"             - this. will not cause the error
   * dd-html="$model.product"             - model
   * dd-html="get_product_name()"         - controller method
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddHtml(modelName) {
    this._debug('ddHtml', `--------- ddHtml (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-html';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddHtml', `found elements:: ${elems.length} `, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const val = this._solveBase(base);
      this._debug('ddHtml', `dd-html="${attrVal}" :: ${base} = ${val}`, 'navy');

      // convert controller val to string
      let val_str = this._val2str(val);

      // if val is undefined set it as empty string
      if (val === undefined || val === null) { val_str = ''; }

      // add dd-id and dd-...-hide to dd- elements
      if (val_str.includes('dd-')) {
        const wrapper = val_str.includes('<td') ? document.createElement('table') : document.createElement('div');
        wrapper.innerHTML = val_str;
        const directives = [...this.$dd.noncloner_directives, ...this.$dd.cloner_directives];
        for (const directive of directives) {
          const dd_elems = wrapper.querySelectorAll(`[${directive}]`);
          for (const dd_elem of dd_elems) {
            this._elemHide(dd_elem, directive);
            this._uid(dd_elem);
          }
        }
        val_str = wrapper.innerHTML;
      }

      // apply pipe option, for example: --pipe:slice(0,10).trim() (val_str must be a string)
      const pipeOpt = opts.find(opt => opt.includes('pipe:')); // pipe:slice(0, 3).trim()
      if (!!pipeOpt) { val_str = this._pipeExe(val_str, pipeOpt); }

      // load content in the element
      elem.innerHTML = val_str; // take controller value and replace element value - no cloning

      this._elemShow(elem, attrName);
    }

    this._debug('ddHtml', '--------- ddHtml (end) ------', 'navy', '#B6ECFF');
  }




  /********************************* ATTRIBUTE MANAGERS **********************************/
  /**
   * dd-value="controllerProperty" | dd-value="(expression)"
   *  Take controller property and set the element attribute and DOM property value.
   *  The controller property value is automatically converted to string.
   * Examples:
   * dd-value="product"
   * dd-value="$model.product"
   * dd-value="(this.product)"
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddValue(modelName) {
    this._debug('ddValue', `--------- ddValue (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-value';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddValue', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);
      const val = this._solveBase(base);
      this._debug('ddValue', `dd-value="${attrVal}" :: ${base} = ${val}`, 'navy');

      this._elemShow(elem, attrName);

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
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddDisabled(modelName) {
    this._debug('ddDisabled', `--------- ddDisabled (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-disabled';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddDisabled', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);
      const val = this._solveBase(base);
      this._debug('ddDisabled', `dd-disabled="${attrVal}" :: ${base} = ${val}`, 'navy');

      // hide orig element
      elem.disabled = !!val;

      this._elemShow(elem, attrName);
    }

    this._debug('ddDisabled', '--------- ddDisabled (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-checked="controllerProperty" | dd-checked="(expression)"
   *  Set the "checked" attribute with the controller property value.
   *  Use it for checkbox or radio input elements only.
   *   CHECKBOX --> The controller value should be array of strings
   *   RADIO --> The controller value should be a string
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddChecked(modelName) {
    this._debug('ddChecked', `--------- ddChecked (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-checked';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddChecked', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);
      const val = this._solveBase(base);
      this._debug('ddChecked', `dd-checked="${attrVal}" :: ${base} = ${val}`, 'navy');

      this._elemShow(elem, attrName);

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

      this._debug('ddChecked', `   elem.value: ${elem.value} ; elem.checked: ${elem.checked}`, 'navy');
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
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddSelected(modelName) {
    this._debug('ddSelected', `--------- ddSelected (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-selected';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddSelected', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);
      const val = this._solveBase(base);
      this._debug('ddSelected', `dd-selected="${attrVal}" :: ${base} = ${val}`, 'navy');

      this._elemShow(elem, attrName);

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
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddClass(modelName) {
    this._debug('ddClass', `--------- ddClass (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-class';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddClass', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const val = this._solveBase(base);
      const act = opts && opts[0] ? opts[0] : '';
      this._debug('ddClass', `dd-class="${attrVal}" :: ${base} = ${JSON.stringify(val)} | act:: ${act}`, 'navy');

      this._elemShow(elem, attrName);

      if (val === undefined) { continue; }
      if (!Array.isArray(val)) { this._printWarn(`dd-class="${attrVal}" -> The value is not array.`); continue; }

      if (act === 'replace') { elem.removeAttribute('class'); }
      for (const v of val) {
        elem.classList.add(v);
      }
    }

    this._debug('ddClass', '--------- ddClass (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-style="controllerProperty [--replace]" | dd-style="(expression) [--replace]"
   *  Sets the "style" attribute with the controller property value.
   *  The controller property value should be an object, for example: {'font-size': '25px'}
   * Examples:
   * dd-style="myStyle"             - add new styles to existing styles
   * dd-style="myStyle --replace"   - replace existing styles with new styles
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddStyle(modelName) {
    this._debug('ddStyle', `--------- ddStyle (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-style';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddStyle', `found elements:: ${elems.length}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const val = this._solveBase(base);
      const act = opts[0] || '';
      this._debug('ddStyle', `dd-style="${attrVal}" :: ${base} = ${JSON.stringify(val)} | act:: ${act}`, 'navy');

      this._elemShow(elem, attrName);

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
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddSrc(modelName) {
    this._debug('ddSrc', `--------- ddSrc (start)  -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-src';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddSrc', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const val = this._solveBase(base);
      const defaultSrc = opts[0] || '';
      this._debug('ddSrc', `dd-src="${attrVal}" :: ${base} = ${val} | defaultSrc:: ${defaultSrc}`, 'navy');

      const src = val || defaultSrc;
      elem.src = src;

      this._elemShow(elem, attrName);
    }

    this._debug('ddSrc', '--------- ddSrc (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-attr="controllerProperty [--attributeName]"
   *  Sets any attribute with the controller property value.
   *  The controller property value should a string.
   * Examples:
   * dd-attr="$model.myURL --href"     - sets href in the A tag
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddAttr(modelName) {
    this._debug('ddAttr', `--------- ddAttr (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-attr';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddAttr', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const val = this._solveBase(base);
      const attributeName = opts[0] || '';
      this._debug('ddAttr', `dd-attr="${attrVal}" :: ${base} = ${val} | attributeName:: ${attributeName}`, 'navy');

      this._elemShow(elem, attrName);

      if (val === undefined || val === null) { continue; }
      if (typeof val !== 'string') { this._printWarn(`dd-attr="${attrVal}" -> The value is not string.`); continue; }
      if (!attributeName) { this._printWarn(`dd-attr="${attrVal}" -> The attribute name is not defined in option.`); continue; }

      elem.setAttribute(attributeName, val);
    }

    this._debug('ddAttr', '--------- ddAttr (end) ------', 'navy', '#B6ECFF');
  }




  /********************************* SWITCHERS **********************************/
  /**
   * dd-if="controllerProperty" | dd-if="controllerMethod()"
   *  Display element from if group when the controllerProperty or controllerMethod returns a truthy value.
   *  The term "if group" means a group of sibling dd-if, dd-elseif and dd-else elements. Usually a group should be wraped in HTML tag so it is separated from another group, but that's not obligatory.
   * Examples:
   * dd-if="myBool" ; dd-else
   * dd-if="result('eq A')" ; dd-elseif="result('eq B')" ; dd-else
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddIf(modelName) {
    this._debug('ddIf', `--------- ddIf(start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-if';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddIf', `found elements:: ${elems.length} `, 'navy');

    for (const elem of elems) {
      const ifGroupElems = this._getSiblings(elem, ['dd-if', 'dd-elseif', 'dd-else']); // get siblings of dd-if, dd-elseif and dd-else

      this._debug().ddIf && console.log('\n--if group--');

      // hide all if group elements
      for (const ifGroupElem of ifGroupElems) {
        ifGroupElem.style.display = 'none';
      }

      // show truthy if group element
      for (const ifGroupElem of ifGroupElems) {
        const attrVal = ifGroupElem.getAttribute('dd-if') || ifGroupElem.getAttribute('dd-elseif') || ifGroupElem.getAttribute('dd-else');
        const { base } = this._decomposeAttribute(attrVal);
        const val = this._solveBase(base);
        this._debug().ddIf && console.log(ifGroupElem.outerHTML, val);

        // show or hide element from the if group
        if (!!val || ifGroupElem.hasAttribute('dd-else')) {
          ifGroupElem.style.display = '';
          if (!elem.getAttribute('style')) { elem.removeAttribute('style'); } // remove style if it's empty
          break;
        }
      }

      // remove dd-if-hide, dd-else-hide or dd-else-hide attribute from all if group elemeents
      for (const ifGroupElem of ifGroupElems) {
        this._elemShow(ifGroupElem, 'dd-if');
        this._elemShow(ifGroupElem, 'dd-elseif');
        this._elemShow(ifGroupElem, 'dd-else');
      }

      this._debug().ddIf && console.log('----------');
    }

    this._debug('ddIf', '--------- ddIf (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-visible="controllerProperty" | dd-visible="(expression)"
   *  Show or hide the HTML element by setting CSS property visibility:visible|hidden.
   * Option:
   * dd-visible="ctrlProp" → Show/hide elements by setting up visibility:none inline CSS style.
   * Examples:
   * dd-visible="isActive"                         - isActive is the controller property, it can also be model $model.isActive
   * dd-visible="this.isActive"                    - this. will not cause the error
   * dd-visible="(this.a < 5 && this.a >= 8)"      - expression
   * dd-visible="(this.$model.name === 'John')"    - expression with model
   * dd-visible="(this.$model.name_{{this.num}} === 'Betty')"    - dynamic controller property name (mustcahe)
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddVisible(modelName) {
    this._debug('ddVisible', `--------- ddVisible (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-visible';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddVisible', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);
      const val = this._solveBase(base);
      this._debug('ddVisible', `dd-visible="${attrVal}" :: ${base} = ${val}`, 'navy');

      // show or hide original element
      val ? elem.style.visibility = 'visible' : elem.style.visibility = 'hidden';

      this._elemShow(elem, attrName);
    }

    this._debug('ddVisible', '--------- ddVisible (end) ------', 'navy', '#B6ECFF');
  }




}




export default Dd;
