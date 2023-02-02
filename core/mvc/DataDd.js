import DataDdListeners from './DataDdListeners.js';


/**
 * Parse HTML elements with the "data-dd-" attribute (non-listeners)
 */
class DataDd extends DataDdListeners {

  constructor() {
    super();

    this.$dd = {
      separator: '@@', // separator in the data-dd- attribute
      elems: {},  // set by ddElem()
      listeners: [], // collector of the data-dd- listeners  [{attrName, elem, handler, eventName}]
      varnameChars: '[a-zA-Z\\d\\$\\_\\.]+' // valid characters in the variable name
    };
  }


  /**
   * data-dd-setinitial="<controllerProperty> [@@convertType|convertTypeDont]"
   * Parse the "data-dd-setinitial" attribute in the form tag.
   * Get the element value and set the controller property value. The element is input, textarea or select tag.
   * Examples:
   * data-dd-setinitial="product" or data-dd-setinitial="product @@convertType" - convert data type automatically, for example: '5' convert to Number, or JSON to Object
   * data-dd-setinitial="employee.name @@convertTypeDont" - do not convert data type automatically
   * @returns {void}
   */
  ddSetInitial() {
    this._debug('ddSetInitial', '--------- ddSetInitial ------', 'navy', '#B6ECFF');

    const attrName = 'data-dd-setinitial';
    const elems = this._listElements(attrName, '');
    this._debug('ddSetInitial', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName) || ''; // 'controllerProperty @@convertTypeNot'
      if (!attrVal) { console.error(`ddSetInitial Error:: Attribute has bad definition (data-dd-setinitial="${attrVal}").`); continue; }

      const attrValSplited = attrVal.split(this.$dd.separator);

      const prop = attrValSplited[0].trim();

      const convertType_param = !!attrValSplited[1] ? attrValSplited[1].trim() : ''; // 'convertType' | 'convertTypeDont'
      const convertType = convertType_param === 'convertTypeDont' ? false : true;

      const val = this._getElementValue(elem, convertType);
      this._setControllerValue(prop, val);

      this._debug('ddSetInitial', `elem.type:: ${elem.type} -- set initial --> ${prop}:: ${val}`, 'navy');
    }
  }


  /************** GENERATORS (create or remove HTML elements) *************/
  /**
   * data-dd-for="<controllerProperty> [@@<priority>]"
   * Parse the "data-dd-for" attribute. Multiply element by the controllerProperty array value.
   * Element with the higher priprity will be parsed before.
   * Examples:
   * data-dd-for="companies"
   * data-dd-for="company.employers"
   * data-dd-for="company.employers @@ 2" --> priority is 2
   * @param {string|RegExp} attrValQuery - controller property name, query for the attribute value
   * @returns {void}
   */
  ddFor(attrValQuery) {
    this._debug('ddFor', `--------- ddFor (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'data-dd-for';
    this._removeParentElements(attrName, attrValQuery);
    let elems = this._listElements(attrName, attrValQuery);
    elems = this._sortElementsByPriority(elems, attrName); // first render elements with higher priority
    this._debug('ddFor', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName); // company.employers
      const attrValSplited = attrVal.split(this.$dd.separator);

      const priority = !!attrValSplited[1] ? attrValSplited[1].trim() : '0';

      const prop = attrValSplited[0].trim();
      const val = this._getControllerValue(prop); // Array
      if (this._debug().ddFor) { console.log('ddFor -->', 'attrVal::', attrVal, ' | val::', val, ' priority::', priority); }

      if (val === undefined || val === null) { continue; } // don't render elements with undefined controller's value

      // remove all gen elems
      this._genElem_remove(elem, attrName, attrVal);

      // hide element if val is empty array
      if (Array.isArray(val) && !val.length) { elem.style.display = 'none'; continue; }


      // multiply new element by cloning and adding sibling elements
      const newElem = this._genElem_define(elem, attrName, attrVal);
      const newElemsTotal = val.length;
      for (let i = 1; i <= newElemsTotal; i++) {
        // place newElem as sibling of the elem
        elem.parentNode.insertBefore(newElem, elem.nextSibling);

        // solve outerHTML - $i0, {{ctrlProp}}, solveMath//
        const i2 = newElemsTotal - i; // 3,2,1,0
        let outerHTML = this._solve_$i(i2, newElem.outerHTML, priority); // replace $i, $i1, $i12 with the integer
        outerHTML = this._solveInterpolated(outerHTML); // parse interpolated text in the variable name, for example: pet_{{$model.pets.$i0._id}}
        outerHTML = this._solveMath(outerHTML);
        newElem.outerHTML = outerHTML;
      }

    }

    this._debug('ddFor', '--------- ddFor (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * data-dd-repeat="controllerProperty"
   * Parse the "data-dd-repeat" attribute. Repeat the element n times wher n is defined in the controller property.
   * It's same as ddFor() except the controller property is not array but number.
   * Examples:
   * data-dd-repeat="totalRows"
   * @param {string|RegExp} attrValQuery - controller property name, query for the attribute value
   * @returns {void}
   */
  ddRepeat(attrValQuery) {
    this._debug('ddRepeat', `--------- ddRepeat (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'data-dd-repeat';
    const elems = this._listElements(attrName, attrValQuery);
    this._debug('ddRepeat', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);

      const prop = attrVal.trim();
      const val = +this._getControllerValue(prop);
      this._debug('ddRepeat', `Element will be repeated ${val} times.`, 'navy');

      if (val === undefined || val === null) { continue; } // don't render elements with undefined controller's value

      // remove all gen elems
      this._genElem_remove(elem, attrName, attrVal);


      // multiply element by cloning and adding sibling elements
      const newElem = this._genElem_define(elem, attrName, attrVal);
      const newElemsTotal = val;
      for (let i = 1; i <= newElemsTotal; i++) {
        // place newElem as sibling of the elem
        elem.parentNode.insertBefore(newElem, elem.nextSibling);

        // solve outerHTML - $in, {{ctrlProp}}, solveMath//
        const i2 = newElemsTotal - i; // 3,2,1,0
        let outerHTML = this._solve_$i(i2, newElem.outerHTML, ''); // replace $i, $i1, $i12 with the number
        outerHTML = this._solveInterpolated(outerHTML); // parse interpolated text in the variable name, for example: pet_{{$model.pets.$i0._id}}
        outerHTML = this._solveMath(outerHTML);
        newElem.outerHTML = outerHTML;
      }

    }

    this._debug('ddRepeat', '--------- ddRepeat (end) ------', 'navy', '#B6ECFF');
  }


  /**
   * data-dd-print="<controllerProperty> [@@ inner|outer|sibling|prepend|append]"
   * data-dd-print="company.name @@ inner"
   * data-dd-print="company.name @@ inner @@ keep"   - keep the innerHTML when value is undefined
   * Parse the "data-dd-print" attribute. Print the controller's property to view.
   * Examples:
   * data-dd-print="product" - product is the controller property
   * data-dd-print="product.name @@ outer"
   * data-dd-print="product.name @@ sibling"
   * @param {string|RegExp} attrValQuery - controller property name, query for the attribute value
   * for example product.name in the data-dd-print="product.name @@ inner". This speed up parsing because it's limited only to one element.
   * @returns {void}
   */
  ddPrint(attrValQuery) {
    this._debug('ddPrint', `--------- ddPrint (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'data-dd-print';
    const elems = this._listElements(attrName, attrValQuery);
    this._debug('ddPrint', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const attrValSplited = attrVal.split(this.$dd.separator);

      // get val and apply pipe to the val
      const propPipe = attrValSplited[0].trim(); // controller property name with pipe:  company.name | slice(0,21)
      const propPipeSplitted = propPipe.split('|');
      const prop = propPipeSplitted[0].trim(); // company.name
      let val = this._getControllerValue(prop);

      if (val === undefined || val === null) { continue; } // don't render elements with undefined controller's value

      // correct val
      if (typeof val === 'string') { val = val; }
      else if (typeof val === 'number') { val = +val; }
      else if (typeof val === 'boolean') { val = val.toString(); }
      else if (typeof val === 'object') { val = JSON.stringify(val); }
      else { val = val; }

      // apply pipe, for example: data-dd-print="val | slice(0,130)"
      let pipe_funcDef = propPipeSplitted[1]; // slice(0, 130), json, ...
      if (!!pipe_funcDef && !!val) {
        pipe_funcDef = pipe_funcDef.trim();
        const { funcName, funcArgs } = this._funcParse(pipe_funcDef, elem);
        if (typeof val[funcName] === 'function') { val = val[funcName](...funcArgs); }
      }

      // define action
      let act = attrValSplited[1] || 'inner';
      act = act.trim();

      // remove all gen elems
      this._genElem_remove(elem, attrName, attrVal);

      // generate new element and place it in the sibling position
      let newElem;
      if (act !== 'inner') {
        newElem = this._genElem_define(elem, attrName, attrVal);
        elem.parentNode.insertBefore(newElem, elem.nextSibling);
      }


      // load content in the element
      if (act === 'inner') {
        elem.innerHTML = val;
      } else if (act === 'outer') {
        const id2 = newElem.getAttribute('data-dd-print-id');
        newElem.outerHTML = `<span data-dd-print-gen="${attrVal}" data-dd-print-id="${id2}">${val}</span>`;
      } else if (act === 'sibling') {
        elem.style.display = '';
        const id2 = newElem.getAttribute('data-dd-print-id');
        newElem.outerHTML = `<span data-dd-print-gen="${attrVal}" data-dd-print-id="${id2}">${val}</span>`;
      } else if (act === 'prepend') {
        newElem.innerHTML = val + ' ' + elem.innerHTML;
      } else if (act === 'append') {
        newElem.innerHTML = elem.innerHTML + ' ' + val;
      } else if (act === 'inset') {
        newElem.innerHTML = elem.innerHTML.replace('{{}}', val);
      } else {
        elem.innerHTML = val;
      }

      this._debug('ddPrint', `ddPrint:: ${propPipe} = ${val} -- act::"${act}"`, 'navy');
    }

    this._debug('ddPrint', '--------- ddPrint (end) ------', 'navy', '#B6ECFF');
  }




  /************ NON-GENERATORS (will not generate new HTML elements or remove existing - will not change the DOM structure) ***********/
  /**
   * data-dd-if="<controllerProperty>"
   * Parse the "data-dd-if" attribute. Show or hide the HTML element by setting display:none.
   * Examples:
   * data-dd-if="this.ifAge" - rend() will not be triggered when this.ifAge is changed
   * data-dd-if="$model.ifAge $eq(22)" - rend() will be triggered when $model.ifAge is changed
   * @param {string|RegExp} attrValQuery - controller property name, query for the attribute value
   * @returns {void}
   */
  ddIf(attrValQuery) {
    this._debug('ddIf', '--------- ddIf (start) ------', 'navy', '#B6ECFF');

    const attrName = 'data-dd-if';
    const elems = this._listElements(attrName, attrValQuery);
    this._debug('ddIf', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName).trim(); // age_tf , $model.age === 3, age > this.myAge , age < $model.yourAge , age $lt($model.age)
      if (!attrVal) { console.error(`Attribute "data-dd-if" has bad definition (data-dd-if="${attrVal}").`); continue; }

      /* define tf */
      let tf = false;
      if (/\!|<|>|=/.test(attrVal)) {
        // parse data-dd-if with = < > && ||: data-dd-if="5<2", data-dd-if="$model.age >= $model.myAge", data-dd-if="this.age > 3" (this. will not be rendered)
        tf = this._calcComparison_A(attrVal);
      } else {
        // parse data-dd-if with pure controller value: data-dd-if="is_active"
        // parse data-dd-if with the comparison operators: $not(), $eq(22), $ne(22), ...  --> data-dd-if="age $eq(5)" , data-dd-if="$model.age $eq($model.myAge)", data-dd-if="$model.age $gt(this.myNum)"
        tf = this._calcComparison_B(attrVal);
      }

      /* hide/show elem */
      if (tf) {
        const dataddPrint_attrVal = elem.getAttribute('data-dd-print');
        if (!!dataddPrint_attrVal && /outer|sibling|prepend|append|inset/.test(dataddPrint_attrVal)) { elem.style.display = 'none'; } // element with data-dd-print should stay hidden because of _genElem_define()
        else { elem.style.display = ''; }
      } else {
        elem.style.display = 'none';
      }

      this._debug('ddIf', `ddIf:: <${elem.tagName} data-dd-if="${attrVal}"> => tf: ${tf} -- outerHTML: ${elem.outerHTML}`, 'navy');
    }

    this._debug('ddIf', '--------- ddIf (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * data-dd-spinner="<controllerProperty>"
   * Parse the "data-dd-spinner" attribute. Load the spinner inside data-dd-spinner element when expression with $model is true.
   * This method acts like ddIf.
   * @param {string} bool - to show or hide the element
   * @returns {void}
   */
  ddSpinner(attrValQuery) {
    this._debug('ddSpinner', '--------- ddSpinner (start) ------', 'navy', '#B6ECFF');

    const attrName = 'data-dd-spinner';
    const elems = this._listElements(attrName, attrValQuery);
    this._debug('ddSpinner', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName).trim(); // ifAge
      if (!attrVal) { console.error(`Attribute "data-dd-spinner" has bad definition (data-dd-spinner="${attrVal}").`); continue; }

      /* define tf */
      let tf = false;
      if (/\!|<|>|=/.test(attrVal)) {
        // parse data-dd-if with = < > && ||: data-dd-if="5<2", data-dd-if="$model.age >= $model.myAge", data-dd-if="this.age > 3" (this. will not be rendered)
        tf = this._calcComparison_A(attrVal);
      } else {
        // parse data-dd-if with pure controller value: data-dd-if="is_active"
        // parse data-dd-if with the comparison operators: $not(), $eq(22), $ne(22), ...  --> data-dd-if="age $eq(5)" , data-dd-if="$model.age $eq($model.myAge)", data-dd-if="$model.age $gt(this.myNum)"
        tf = this._calcComparison_B(attrVal);
      }

      /* hide/show spinner */
      if (tf) {
        const styleScoped = `
        <span data-dd-spinner-gen>
          <style scoped>
            [data-dd-spinner]>span:after {
              content: '';
              display: block;
              font-size: 10px;
              width: 1em;
              height: 1em;
              margin-top: -0.5em;
              animation: spinner 1500ms infinite linear;
              border-radius: 0.5em;
              box-shadow: #BEBEBE 1.5em 0 0 0, #BEBEBE 1.1em 1.1em 0 0, #BEBEBE 0 1.5em 0 0, #BEBEBE -1.1em 1.1em 0 0, #BEBEBE -1.5em 0 0 0, #BEBEBE -1.1em -1.1em 0 0, #BEBEBE 0 -1.5em 0 0, #BEBEBE 1.1em -1.1em 0 0;
            }
            @-webkit-keyframes spinner {
              0% { transform: rotate(0deg);}
              100% { transform: rotate(360deg); }
            }
            @-moz-keyframes spinner {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @-o-keyframes spinner {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
            @keyframes spinner {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          </style>
        </span>
        `;

        // 1. add SPAN and STYLE tags
        elem.insertAdjacentHTML('beforeend', styleScoped);

        // 2. center span spinner in the parent element
        const elemRect = elem.getBoundingClientRect(); // {x,y,width,height}}
        const spinnerElem = elem.querySelector('span[data-dd-spinner-gen]');

        spinnerElem.style.position = 'relative';

        const x = elemRect.width / 2;
        spinnerElem.style.left = x + 'px';

        const y = elemRect.height / 2;
        spinnerElem.style.top = y + 'px';

        this._debug('ddSpinner', `spinner position:: x=${x}px , y=${y}px`, 'navy');

      } else {
        elem.innerHTML = '';
      }

      this._debug('ddSpinner', `ddSpinner:: <${elem.tagName} data-dd-spinner="${attrVal}"> => tf: ${tf}`, 'navy');
    }

    this._debug('ddSpinner', '--------- ddSpinner (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * data-dd-switch="<controllerProperty> [@@ multiple]"
   * Parse the "data-dd-switch" attribute. Show or hide elements depending if "data-dd-switchcase" value matches controller property.
   * Examples:
   * data-dd-switch="ctrlprop" - ctrlprop is string, number or boolean
   * data-dd-switch="ctrlprop @@ multiple" - ctrlprop is array of string, number or boolean
   * Notice @@ multiple can select multiple switchcases.
   * @param {string|RegExp} attrValQuery - controller property name, query for the attribute value
   * @returns {void}
   */
  ddSwitch(attrValQuery) {
    this._debug('ddSwitch', '--------- ddSwitch (start) ------', 'navy', '#B6ECFF');

    const attrName = 'data-dd-switch';
    const elems = this._listElements(attrName, attrValQuery);
    this._debug('ddSwitch', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName) || ''; // 'controllerProperty @@ multiple'
      const attrValSplited = attrVal.split(this.$dd.separator);

      const isMultiple = !!attrValSplited[1] ? attrValSplited[1].trim() === 'multiple' : false;

      const prop = attrValSplited[0].trim();
      const val = this._getControllerValue(prop);

      if (val === undefined || val === null) { continue; } // don't render elements with undefined controller's value

      // get data-dd-switchcase and data-dd-switchdefault attribute values
      const switchcaseElems = elem.querySelectorAll('[data-dd-switch] > [data-dd-switchcase]');
      const switchdefaultElem = elem.querySelector('[data-dd-switch] > [data-dd-switchdefault]');

      // set data-dd-switchcase
      let isMatched = false; // is data-dd-switchcase value matched
      for (const switchcaseElem of switchcaseElems) {
        let switchcaseAttrVal = switchcaseElem.getAttribute('data-dd-switchcase');
        switchcaseAttrVal = switchcaseAttrVal.trim();

        if (!isMultiple && switchcaseAttrVal === val) { switchcaseElem.style.display = ''; isMatched = true; }
        else if (isMultiple && val && val.indexOf(switchcaseAttrVal) !== -1) { switchcaseElem.style.display = ''; isMatched = true; }
        else { switchcaseElem.style.display = 'none'; }

        this._debug('ddSwitch', `data-dd-switch="${attrVal}" data-dd-switchcase="${switchcaseAttrVal}" --val:: "${val}" --isMatched: ${isMatched}`, 'navy');
      }

      // set data-dd-switchdefault
      if (!!switchdefaultElem) { !isMatched ? switchdefaultElem.style.display = '' : switchdefaultElem.style.display = 'none'; }

      this._debug('ddSwitch', `data-dd-switch="${attrVal}" data-dd-switchdefault --isMatched: ${isMatched}`, 'navy');
    }

    this._debug('ddSwitch', '--------- ddSwitch (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * data-dd-disabled="<controllerProperty>"
   * Parse the "data-dd-disabled" attribute. set the element to disabled state.
   * Examples:
   * data-dd-disabled="ifAge"
   * data-dd-disabled="ifAge $eq(22)"
   * @param {string|RegExp} attrValQuery - controller property name, query for the attribute value
   * @returns {void}
   */
  ddDisabled(attrValQuery) {
    this._debug('ddDisabled', '--------- ddDisabled (start) ------', 'navy', '#B6ECFF');

    const attrName = 'data-dd-disabled';
    const elems = this._listElements(attrName, attrValQuery);
    this._debug('ddDisabled', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName).trim(); // ifAge
      if (!attrVal) { console.error(`ddDisabled Error:: Attribute has bad definition (data-dd-disabled="${attrVal}").`); continue; }

      /* define tf */
      let tf = false;
      if (/\!|<|>|=/.test(attrVal)) {
        // parse data-dd-if with = < > && ||: data-dd-if="5<2", data-dd-if="$model.age >= $model.myAge", data-dd-if="this.age > 3" (this. will not be rendered)
        tf = this._calcComparison_A(attrVal);
      } else {
        // parse data-dd-if with pure controller value: data-dd-if="is_active"
        // parse data-dd-if with the comparison operators: $not(), $eq(22), $ne(22), ...  --> data-dd-if="age $eq(5)" , data-dd-if="$model.age $eq($model.myAge)", data-dd-if="$model.age $gt(this.myNum)"
        tf = this._calcComparison_B(attrVal);
      }

      /* disable/enable the element */
      if (tf) { elem.disabled = true; }
      else { elem.disabled = false; }

      this._debug('ddDisabled', `ddDisabled:: data-dd-disabled="${attrVal}" -- outerHTML: ${elem.outerHTML}`, 'navy');
    }

    this._debug('ddDisabled', '--------- ddDisabled (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * data-dd-value="<controllerProperty>"
   * Parse the "data-dd-value" attribute. Sets the element's "value" attribute from the controller property value.
   * Examples:
   * data-dd-value="product"
   * data-dd-value="$model.employee.name"
   * @param {string|RegExp} attrValQuery - controller property name, query for the attribute value
   * @returns {void}
   */
  ddValue(attrValQuery) {
    this._debug('ddValue', '--------- ddValue ------', 'navy', '#B6ECFF');

    const attrName = 'data-dd-value';
    const elems = this._listElements(attrName, attrValQuery);
    this._debug('ddValue', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      if (!attrVal) { console.error(`ddValue Error:: Attribute has bad definition (data-dd-value="${attrVal}").`); continue; }

      const prop = attrVal.trim();
      const val = this._getControllerValue(prop);
      this._debug('ddValue', `elem.type:: ${elem.type} -- ${prop}:: ${val}`, 'navy');

      if (val === undefined || val === null) { continue; } // don't render elements with undefined controller's value

      this._setElementValue(elem, val);
    }
  }



  /**
   * data-dd-checked="<controllerProperty>"
   * Sets the "checked" attribute with the controller property value.
   * The controller property is an array. If the checkbox value is in that array then the checkbox is checked.
   * Use it for checkboxes only.
   * Examples:
   * data-dd-checked="selectedProducts"
   * @param {string|RegExp} attrValQuery - controller property name, query for the attribute value
   * @returns {void}
   */
  ddChecked(attrValQuery) {
    this._debug('ddChecked', '--------- ddChecked ------', 'navy', '#B6ECFF');

    const attrName = 'data-dd-checked';
    const elems = this._listElements(attrName, attrValQuery);
    this._debug('ddChecked', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      if (!attrVal) { console.error(`ddChecked Error:: Attribute has bad definition (data-dd-checked="${attrVal}").`); continue; }

      const prop = attrVal.trim();
      const val = this._getControllerValue(prop); // val must be array

      if (val === undefined || val === null) { continue; } // don't render elements with undefined controller's value

      if (!Array.isArray(val)) { console.error(`ddChecked Error:: The controller property ${prop} is not array.`); continue; }

      if (val.indexOf(elem.value) !== -1) { elem.checked = true; }
      else { elem.checked = false; }

      this._debug('ddChecked', `elem.type:: ${elem.type} -- ${prop}:: ${val}`, 'navy');
    }
  }



  /**
   * data-dd-class="<controllerProperty> [@@ add|replace]"
   * Parse the "data-dd-class" attribute. Set element class attribute.
   * Examples:
   * data-dd-class="myKlass" - add new classes to existing classes
   * data-dd-class="myKlass @@ add" - add new classes to existing classes
   * data-dd-class="myKlass @@ replace" - replace existing classes with new classes
   * @param {string|RegExp} attrValQuery - controller property name, query for the attribute value
   * @returns {void}
   */
  ddClass(attrValQuery) {
    this._debug('ddClass', '--------- ddClass ------', 'navy', '#B6ECFF');

    const attrName = 'data-dd-class';
    const elems = this._listElements(attrName, attrValQuery);
    this._debug('ddClass', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName) || ''; // 'controllerProperty'
      const attrValSplited = attrVal.split(this.$dd.separator);

      const prop = attrValSplited[0].trim(); // controller property name company.name
      const valArr = this._getControllerValue(prop) || []; // must be array ['my-bold', 'my-italic']

      if (valArr === undefined) { continue; } // don't render elements with undefined controller's value

      if (!Array.isArray(valArr)) { console.log(`%c ddClassWarn:: The controller property "${prop}" is not an array.`, `color:Maroon; background:LightYellow`); continue; }

      let act = attrValSplited[1] || '';
      act = act.trim() || 'add';

      if (act == 'replace' && !!valArr.length) { elem.removeAttribute('class'); }
      for (const val of valArr) { elem.classList.add(val); }

      this._debug('ddClass', `data-dd-class="${attrVal}" --- ctrlProp:: ${prop} | ctrlVal:: ${valArr} | act:: ${act}`, 'navy');
    }
  }



  /**
   * data-dd-style="<controllerProperty> [@@ add|replace]"
   * Parse the "data-dd-style" attribute. Set element style attribute.
   * Examples:
   * data-dd-style="myStyl" - add new styles to existing sytles
   * data-dd-style="myStyl @@ add" - add new styles to existing sytles
   * data-dd-style="myStyl @@ replace" - replace existing styles with new styles
   * @param {string|RegExp} attrValQuery - controller property name, query for the attribute value
   * @returns {void}
   */
  ddStyle(attrValQuery) {
    this._debug('ddStyle', '--------- ddStyle ------', 'navy', '#B6ECFF');

    const attrName = 'data-dd-style';
    const elems = this._listElements(attrName, attrValQuery);
    this._debug('ddStyle', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName) || ''; // 'controllerProperty'
      const attrValSplited = attrVal.split(this.$dd.separator);

      const prop = attrValSplited[0].trim();
      const valObj = this._getControllerValue(prop); // {fontSize: '21px', color: 'red'}

      if (valObj === undefined) { continue; } // don't render elements with undefined controller's value

      let act = attrValSplited[1] || '';
      act = act.trim() || 'add';

      if (act == 'replace') { elem.removeAttribute('style'); }

      let styleProps = [];
      if (!!valObj) {
        styleProps = Object.keys(valObj);
        for (const styleProp of styleProps) { elem.style[styleProp] = valObj[styleProp]; }
      }

      this._debug('ddStyle', `data-dd-style="${attrVal}" --- prop:: "${prop}" | styleProps:: "${styleProps}" | act:: "${act}"`, 'navy');
    }
  }



  /**
   * data-dd-src"<controllerProperty> [@@<defaultSrc>]"
   * Parse the "data-dd-src" attribute. Set element src attribute.
   * Examples:
   * data-dd-src="imageURL" - define <img src="">
   * @param {string|RegExp} attrValQuery - controller property name, query for the attribute value
   * @returns {void}
   */
  ddSrc(attrValQuery) {
    this._debug('ddSrc', '--------- ddSrc ------', 'navy', '#B6ECFF');

    const attrName = 'data-dd-src';
    const elems = this._listElements(attrName, attrValQuery);
    this._debug('ddSrc', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName) || '';
      const attrValSplited = attrVal.split(this.$dd.separator);

      const prop = attrValSplited[0].trim();
      const val = this._getControllerValue(prop);

      if (val === undefined || val === null) { continue; } // don't render elements with undefined controller's value

      // when val is undefined load defaultSrc
      let defaultSrc = attrValSplited[1] || '';
      defaultSrc = defaultSrc.trim();

      const src = val || defaultSrc;
      elem.src = src;

      this._debug('ddSrc', `data-dd-src="${attrVal}" --prop:: "${prop}" --src:: "${src}"`, 'navy');
    }
  }



  /**
  * data-dd-attr"<controllerProperty> [@@<attributeName>]"
  * Parse the "data-dd-attr" attribute. Set element's attribute value.
  * Examples:
  * data-dd-attr="pageURL @@ href" - define <a href="">
  * @param {string|RegExp} attrValQuery - controller property name, query for the attribute value
  * @returns {void}
  */
  ddAttr(attrValQuery) {
    this._debug('ddAttr', '--------- ddAttr ------', 'navy', '#B6ECFF');

    const attrName = 'data-dd-attr';
    const elems = this._listElements(attrName, attrValQuery);
    this._debug('ddAttr', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName) || ''; // pageURL @@ href
      const attrValSplited = attrVal.split(this.$dd.separator);

      const prop = attrValSplited[0].trim();
      const val = this._getControllerValue(prop);

      if (val === undefined || val === null) { continue; } // don't render elements with undefined controller's value

      if (!attrValSplited[1]) { console.error(`Attribute name is not defined in the ${attrName}="${attrVal}".`); continue; }
      const attribute_name = attrValSplited[1].trim(); // href

      elem.setAttribute(attribute_name, val);

      this._debug('ddAttr', `data-dd-attr="${attrVal}" --prop:: "${prop}" --val:: "${val}" --> added ${attribute_name}="${val}"`, 'navy');
    }
  }



  /**
   * data-dd-elem="<ddElemsProp>"     --> ddElemsProp is the property of the this.$dd.elems, for example data-dd-elem="myElement" => this.$dd.elems.myElement
   * Parse the "data-dd-elem" attribute. Transfer the DOM element to the controller property "this.$dd.elems".
   * Examples:
   * data-dd-elem="paragraf" -> fetch it with this.$dd.elems['paragraf']
   * @param {string|RegExp} attrValQuery - query for the attribute value
   * @returns {void}
   */
  ddElem(attrValQuery) {
    this._debug('ddElem', '--------- ddElem ------', 'navy', '#B6ECFF');

    const attrName = 'data-dd-elem';
    const elems = this._listElements(attrName, attrValQuery);
    this._debug('ddElem', `found elements:: ${elems.length} | attrValQuery:: ${attrValQuery}`, 'navy');

    // associate values to $dd
    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName) || ''; // 'paragraf'
      this.$dd.elems[attrVal] = elem;
    }
  }



  /**
   * data-dd-echo="<text>"
   * Parse the "data-dd-echo" attribute. Prints the "text" in the HTML element as innerHTML.
   * Examples:
   * data-dd-echo="$i+1"  --> prints the iteration number
   * @returns {void}
   */
  ddEcho() {
    this._debug('ddEcho', '--------- ddEcho (start) ------', 'navy', '#B6ECFF');

    const attrName = 'data-dd-echo';
    const elems = this._listElements(attrName, '');
    this._debug('ddEcho', `found elements:: ${elems.length}`, 'navy');


    for (const elem of elems) {
      let txt = elem.getAttribute('data-dd-echo');

      this._debug('ddEcho', `ddEcho txt before: ${txt}`, 'navy', '#B6ECFF');

      txt = this._solveInterpolated(txt); // parse interpolated text in the variable name, for example: pet_{{$model.pets.$i0._id}}
      txt = this._solveMath(txt); // calculte for example solveMath/$i0 + 1/
      txt = txt.replace(/\[/g, '<').replace(/\]/g, '>'); // solve html tags, [b style='color:red']3[/b]

      this._debug('ddEcho', `ddEcho txt after: ${txt}\n`, 'navy', '#B6ECFF');

      elem.innerHTML = txt;
    }

    this._debug('ddEcho', '--------- ddEcho (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * Parse the words with i18n> prefix and replace it with the corersponding word in /i18n/{lang}.json
   */
  ddI18n() {

  }



}


export default DataDd;
