/**
 * Auxilary methods.
 */
class Aux {

  /***** CONTROLLER *****/
  /**
   * Get the controller property's value. For example controller's property is this.$model.firstName in JS and in HTML dd-text="$model.firstName"
   * @param {string} prop - controller property name, for example: company.name, this.company.name, $model.car.color, this.$model.car.color, $fridge.color, ...
   * @returns {any}
   */
  _getControllerValue(prop) {
    try {
      let func = new Function(`const val = this.${prop}; return val;`);
      func = func.bind(this);
      const val = func();
      return val;
    } catch (err) {
      console.warn(`_getControllerValue (${prop})`, err);
    }

  }

  /** ALTERNATIVE METHOD
   * Get the controller property's value. For example controller's property is this.$model.firstName in JS and in HTML dd-text="$model.firstName"
   * @param {string} prop - controller property name, for example: company.name, this.company.name, $model.car.color, this.$model.car.color, $fridge.color, ...
   * @returns {any}
   */
  _getControllerValue_alt(prop) {
    const propSplitted = prop.split('.'); // ['company', 'name']
    const prop1 = propSplitted[0]; // company

    let val = this[prop1]; // controller property value
    propSplitted.forEach((prop, key) => {
      if (key !== 0 && val != undefined) { val = val[prop]; }
    });
    return val;
  }


  /**
   * Set the controller property's value.
   * For example controller's property is this.product.name
   * @param {string} prop - controller property name, for example: $model.product.name
   * @param {any} val - controller property value
   * @returns {void}
   */
  _setControllerValue(prop, val) {
    try {
      let func = new Function('val2', `this.${prop} = val2`);
      func = func.bind(this, val);
      func();
    } catch (err) {
      console.error(`_setControllerValue (${prop})`, err);
    }
  }

  /** ALTERNATIVE METHOD
   * Set the controller property's value.
   * For example controller's property is this.product.name
   * @param {string} prop - controller property name, for example: $model.product.name
   * @param {any} val - controller property value
   * @returns {void}
   */
  _setControllerValue_alt(prop, val) {
    const propSplitted = prop.split('.'); // ['$model', 'product', 'name']
    let i = 1;
    let obj = this;
    for (const prop of propSplitted) {
      if (i !== propSplitted.length) { // not last property
        if (obj[prop] === undefined || obj[prop] === null || obj[prop] === NaN) { obj[prop] = {}; }
        obj = obj[prop];
      } else { // on last property associate the value
        obj[prop] = val;
      }
      i++;
    }
  }




  /***** HTML DOM *****/
  /**
   * List DOM elements which has "dd-..." attribute.
   * @param {string} attrName - attribute name -> 'dd-text', 'dd.html', ...
   * @returns {HTMLElement[]}
   */
  _listElements(attrName) {
    const elems = document.querySelectorAll(`[${attrName}]`);

    // filtering
    const elemsFiltered = [];
    for (const elem of elems) {
      // take elements without dd-aid or elements without --blockrender option
      const ddAid = elem.getAttribute('dd-aid');
      if (ddAid === null) { elemsFiltered.push(elem); }
      else if (!ddAid.includes('--blockrender')) { elemsFiltered.push(elem); }
    }

    return elemsFiltered;
  }


  /**
   * Show DOM element.
   * @param {HTMLElement} elem
   */
  _elemShow(elem) {
    elem.style.display = '';
    if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }
  }


  /**
   * Hide DOM element.
   * @param {HTMLElement} elem
   */
  _elemHide(elem) {
    elem.style.display = 'none';
    if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }
  }


  /**
   * List siblings of the elem with specific attributes (attrNames). The elem is included in the list;
   * @param {HTMLElement} elem - element for which we are searching siblings, usually dd-if element
   * @param {string[]} attrNames - attribute names: ['dd-if', 'dd-elseif', 'dd-else']
   */
  _getSiblings(elem, attrNames) {
    const siblings = [];
    if (!elem.parentNode) { return siblings; } // if no parent, return no sibling
    let sibling = elem.parentNode.firstChild; // first child of the parent node

    let search = false;
    while (sibling) {
      // start to search when sibling is elem, i.e. dd-if element
      if (sibling === elem) { search = true; }

      // stop on next first attrName, for example on next dd-if
      if (search && sibling !== elem && sibling.nodeType === 1 && sibling.hasAttribute(attrNames[0])) { search = false; break; }

      if (search && sibling.nodeType === 1) {
        for (const attrName of attrNames) {
          if (sibling.hasAttribute(attrName)) {
            siblings.push(sibling);
          }
        } // \for

        // stop search when last attrName is reached, i.e. when dd-else is reached
        if (search && sibling.hasAttribute(attrNames[attrNames.length - 1])) {
          search = false;
          break;
        }
      }

      sibling = sibling.nextSibling;

    } // \while

    return siblings;
  }


  /**
   * Decompose attribute to base and option values.
   * For example: dd-text="$model.companies --pipe:slice(0,12).trim() --append" --> base is '$model.companies' and opts is array ['pipe:slice(0,12).trim()', 'append']
   * @param {string} attrVal - attribute value, for example: "$model.names --prepend"
   * @returns {{base:string, opts:string[]}} - base is base attribute value (usually controller property) and opts is attribute options
   */
  _decomposeAttribute(attrVal) {
    let opts = attrVal.split('--') || [];
    opts = opts.map(opt => opt.trim());
    const base = opts.shift();
    return { base, opts };
  }


  /**
   * Define cloned element. The cloned element must get dd-xyz-clone attribute.
   * @param {Element} elem - original element
   * @param {string} attrName - attribute name: dd-for, dd-repeat, dd-text
   * @returns {HTMLElement}
   */
  _clone_define(elem, attrName) {
    // clone the dd-xyz element
    const clonedElem = elem.cloneNode(true);

    // remove cloned attributes and add new attributes
    clonedElem.removeAttribute(attrName);
    clonedElem.setAttribute(`${attrName}-clone`, '');

    // show cloned element
    this._elemShow(clonedElem);

    return clonedElem;
  }


  /**
   * Insert cloned element in the DOM.
   * The cloned elem is inserted as sibling to orig elem.
   * The cloned element have dd-xyz-clone attribute.
   * @param {Element} elem - original element
   * @param {Element} clonedElem - element which will be cloned and placed in the elem sibling position
   * @returns {void}
   */
  _clone_insert(elem, clonedElem) {
    elem.parentNode.insertBefore(clonedElem, elem.nextSibling);
  }

  /**
   * Insert cloned element in the DOM. Every new element will be appended to last added element.
   * The cloned elem is inserted as sibling to orig elem.
   * The cloned element have dd-xyz-clone attribute.
   * @param {Element} elem - original element
   * @param {Element} clonedElem - element which will be cloned and placed in the elem sibling position
   * @returns {void}
   */
  _clone_insert_append(elem, clonedElem) {
    elem.parentElement.appendChild(clonedElem);
  }


  /**
   * Remove cloned element from DOM. The cloned element have dd-xyz-clone attribute.
   * @param {string} attrName - attribute name: dd-for, dd-repeat, dd-text
   * @returns {void}
   */
  _clone_remove(attrName) {
    const clonedElems = document.querySelectorAll(`[${attrName}-clone]`);
    for (const clonedElem of clonedElems) { clonedElem.remove(); }
  }


  /**
   * Set the HTML form element value. Make correction according to the element & value type.
   * @param {HTMLElement} elem - HTML form element
   * @param {any} val - value to populate HTML form element (if val is undefined then it's empty string)
   */
  _setElementValue(elem, val = '') {
    if (typeof val === 'object') {
      if (elem.type === 'textarea') { val = JSON.stringify(val, null, 2); }
      else { val = JSON.stringify(val); }
    } else {
      val = this._val2str(val);
    }
    elem.value = val;
    elem.setAttribute('value', val);
  }


  /**
   * Set the checked attribute for radio and checkbox.
   * @param {HTMLElement} elem - HTML form element
   * @param {string[]} val - value to compare with element.value
   */
  _setElementChecked(elem, val = '') {
    val = this._val2str(val);
    if (val.includes(elem.value)) {
      elem.checked = true;
      elem.setAttribute('checked', '');
    } else {
      elem.checked = false;
      elem.removeAttribute('checked');
    }
  }


  /**
   * Set the checked attribute for radio and checkbox.
   * @param {HTMLElement} elem - HTML form element
   * @param {string} val - value to compare with element.value
   */
  _setElementSelected_one(elem, val = '') {
    val = this._val2str(val);
    for (const option of elem.options) {
      if (val === option.value) {
        option.selected = true;
        option.setAttribute('selected', '');
      } else {
        option.selected = false;
        option.removeAttribute('selected');
      }
    }
  }


  /**
   * Set the checked attribute for radio and checkbox.
   * @param {HTMLElement} elem - HTML form element
   * @param {string[]} val - value to compare with element.value
   */
  _setElementSelected_multiple(elem, val = '') {
    for (const option of elem.options) {
      const tf = val.includes(option.value);
      if (tf) {
        option.selected = true;
        option.setAttribute('selected', '');
      } else {
        option.selected = false;
        option.removeAttribute('selected');
      }
    }
  }


  /**
   * Get the HTML form element value. Make correction according to the element type & value type.
   * Element types: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
   * @param {HTMLElement} elem - HTML form element
   * @param {boolean} convertType - default true
   * @returns {any} val - single value or array for checkbox and select-multiple
   */
  _getElementValue(elem, convertType = true) {
    // pickup all elements with same name="something", for example checkboxes
    let val;

    if (elem.type === 'checkbox') {
      const elems = document.querySelectorAll(`[name="${elem.name}"]`);
      const valArr = [];
      let i = 1;
      for (const elem of elems) {
        let v = elem.value;
        if (convertType) { v = this._stringTypeConvert(elem.value); }
        if (elem.checked) { valArr.push(v); val = valArr; }
        if (i === elems.length && !val) { val = []; }
        i++;
      }

    } else if (elem.type === 'select-multiple') {
      const opts = elem.selectedOptions; // selected options
      const valArr = [];
      let i = 1;
      for (const opt of opts) {
        let v = opt.value;
        if (convertType) { v = this._stringTypeConvert(opt.value); }
        valArr.push(v);
        val = valArr;
        if (i === opts.length && !val) { val = []; }
        i++;
      }

    } else if (elem.type === 'radio') {
      let v = elem.value;
      if (convertType) { v = this._stringTypeConvert(elem.value); }
      if (elem.checked) { val = v; }

    } else if (elem.type === 'number') {
      const v = elem.valueAsNumber || undefined; // valueAsNumber is NaN when INPUT field is empty
      val = v;

    } else if (elem.type === 'password') {
      val = elem.value;

    } else if (elem.type === 'file' && elem.multiple) {
      val = elem.files;

    } else if (elem.type === 'file') {
      val = elem.files[0];

    } else {
      let v = elem.value;
      if (convertType) { v = this._stringTypeConvert(elem.value); }
      val = v;
    }

    return val;
  }


  /**
   * Set dd-aid=" --blockrender" option to element and it's all dd- childrens.
   * @param {HTMLElement} elem
   */
  _setBlockrender(elem) {
    const uid = this._aidCreate(elem);
    this._aidAddOption(elem, '--blockrender');

    const directives = [...this.$dd.noncloner_directives, ...this.$dd.cloner_directives];
    directives.forEach(directive => {
      const ddElems = elem.querySelectorAll(`[${directive}]`);
      ddElems.forEach(ddElem => {
        this._aidCreate(ddElem, uid);
        this._aidAddOption(ddElem, '--blockrender');
      });
    });
  }


  /**
   * Remove --blockrender option from element and it's all dd- childrens.
   * @param {HTMLElement} elem
   */
  _delBlockrender(elem) {
    this._aidDelOption(elem, '--blockrender');

    const directives = [...this.$dd.noncloner_directives, ...this.$dd.cloner_directives];
    directives.forEach(directive => {
      const ddElems = elem.querySelectorAll(`[${directive}]`);
      ddElems.forEach(ddElem => {
        this._aidDelOption(ddElem, '--blockrender');
      });
    });
  }





  /***** SOLVERS *****/
  /**
   * Solve the JS expression. For example:
   * @param {string} expr - the JS expression
   * @returns {string}
   */
  _solveExpression(expr) {
    let func;
    try {
      func = new Function(`const exprResult = ${expr}; return exprResult;`);
      func = func.bind(this);
    } catch (err) {
      console.error(`Error in expression definition "${expr}"`, err);
    }

    let exprResult;
    try {
      exprResult = func();
    } catch (err) {
      console.error(`Error in expression execution "${expr}"`, err);
    }

    exprResult = exprResult === undefined || exprResult === null || exprResult === NaN ? '' : exprResult;

    return exprResult;
  }


  /**
   * Find {{...}} mustaches in the txt and replace it with the real value. The real value is solution of JS expression like: '2+4' or 'this.$model.n + 1'.
   * @param {string} txt - text with mustache, for example: '$model.company{{this.n + 1}}' or $model.company{{'something'.slice(0,1)}}
   * @returns {string}
   */
  _solveMustache(txt) {
    const openingChar = '{{';
    const closingChar = '}}';

    const reg = new RegExp(`${openingChar}(.+?)${closingChar}`, 'g');
    const mustacheExpressions = txt.match(reg) || []; // ["{{2+4}}", "{{this.$model.n + 1}}"]

    for (const mustacheExpression of mustacheExpressions) {
      const expr = mustacheExpression.replace(openingChar, '').replace(closingChar, '').trim();
      let exprResult = this._hasBlockString(expr, '${') ? expr : this._solveExpression(expr);
      exprResult = exprResult.toString();
      txt = txt.replace(mustacheExpression, exprResult);
    }

    return txt;
  }


  /**
   * Solve template literals and its string interpolations.
   * For example if the outerHtml is <b>${val.name}</b> it will be solved as <b>Marko</b>.
   * @param {string} text - text with string interpolations ${...}
   * @param {object} interpolations - values for string interpolations ${val} ${key} --> for example: {val: {name: 'Marko', age:21}, key: 1}
   * @param {string} interpolationMark - marks to determine which interpolations should be solved. For example if interpolator is $1 it will solve only $1{...} in the text
   */
  _solveTemplateLiteral(text = '', interpolations = {}, interpolationMark = '') {
    let func_body = '';
    const args = [];
    const vals = [];
    for (const arr of Object.entries(interpolations)) {
      const k = arr[0]; // 'val'  or  'key'

      let v = arr[1]; // {name: 'Marko', age:21}  or  1

      if (typeof v === 'string') {
        func_body += `${k} = '${v}';\n`;
      } else {
        v = this._val2str(v);
        func_body += `${k} = ${v};\n`;
      }

      args.push(k);
      vals.push(v);
    }

    // replace interpolation mark with pure dollar: $1 -> $
    if (!!interpolationMark) {
      interpolationMark = interpolationMark.replace(/\$/g, '\\$');
      const interpolator_reg = new RegExp(interpolationMark, 'g');
      text = text.replace(interpolator_reg, '$');
    }


    const textWithBackticks = '`' + text + '`';

    func_body += `
    const txt = ${textWithBackticks};
    return txt;
    `;

    try {
      let func = new Function(...args, func_body);
      func = func.bind(this);
      text = func(...vals);
    } catch (err) {
      // console.error(`_solveTemplateLiteral: \n-------\n${func_body}\n-------\n`, err);
      const interpolations = text.match(/\$\{[^\}]+\}/g);
      throw new Error(`_solveTemplateLiteral:: Probably error in one of the string interpolations: ${interpolations}`, err);
    }

    return text; // text with solved string interpolations ${}
  }


  /**
   * Solve value from directive base.
   * @param {string} base - the directive base, for example dd-show="$model.myProducts --visibility" => base is '$model.myProducts'
   * @returns {{val:any, prop_solved:string}}
   */
  _solveBase(base) {
    let val = '';
    let prop_solved = '';
    if (/^\(.*\)$/.test(base)) {
      // solve the expression (this.product_{{this.pid}}.name + ' -prod')
      prop_solved = this._solveMustache(base);
      const expr = prop_solved;
      val = !expr || this._hasBlockString(expr) ? '' : this._solveExpression(expr);
    } else {
      // solve the controller property name and get the controller property value
      prop_solved = base.replace(/^this\./, ''); // this.product_{{this.pid}} -> product_{{this.pid}}
      prop_solved = this._solveMustache(prop_solved); // product_{{this.pid}} -> product_2
      val = !prop_solved || this._hasBlockString(prop_solved) ? '' : this._getControllerValue(prop_solved);
    }
    return { val, prop_solved };
  }



  /***** FUNCTIONS *****/
  /**
   * Parse function definition and return function name and arguments.
   * For example: products.list(25, 'str', $event, $element) -> {funcName: 'products.list', funcArgs: [55, elem]}
   * @param {string} funcDef - function definition in the dd- attribute
   * @param {HTMLElement} elem - dd- HTML element on which is the event applied
   * @param {Event} event - event (click, keyup, ...) applied on the dd- element (used only in the DdListeners)
   * @returns {{funcName:string, funcArgs:any[], funcArgsStr:string}
   */
  _funcParse(funcDef, elem, event) {
    if (!funcDef) { return {}; }

    const matched = funcDef.match(/^(.+)\((.*)\)$/);
    if (!matched) { console.error(`_funcParseErr: Function "${funcDef}" has bad definition.`); return {}; }
    const funcName = matched[1] || ''; // function name: products.list

    const funcArgsStr = !!matched[2] ? matched[2].trim() : ''; // function arguments: 25, 'str', $event, $element, this.products
    const funcArgs = !funcArgsStr ? [] : funcArgsStr
      .split(',')
      .map(arg => {
        arg = arg.trim();
        if (arg === '$element') { arg = elem; } // DOM HTMLElement: func($element)
        else if (arg === '$value') { arg = this._getElementValue(elem, true); } // DOM HTMLElement value (INPUT, SELECT, TEXTAREA,...): func($value)
        else if (arg === '$event') { arg = event; } // DOM Event: func($event)
        else if (/"|'/.test(arg)) { arg = arg.replace(/\'/g, ''); } // string: func('some str', "some str")
        else if (/^-?\d+\.?\d*$/.test(arg) && !/\'/.test(arg)) { arg = +arg; } // number: func(12, -12, -12.22)
        else if ((arg === 'true' || arg === 'false')) { arg = JSON.parse(arg); } // boolean: func(true, false)
        else if (/^\/.+\/i?g?$/.test(arg)) { // if regular expression, for example in replace(/Some/i, 'some')
          const mat = arg.match(/^\/(.+)\/(i?g?)$/);
          arg = new RegExp(mat[1], mat[2]);
        }
        else if (/^\$model\./.test(arg)) { // model: func($model.cars)
          const prop = arg;
          const val = this._getControllerValue(prop);
          arg = val;
        }
        else if (/^this\./.test(arg)) { // if contain this. i.e. controller property: func(this.pets)
          const prop = arg.replace(/^this\./, ''); // remove this.
          const val = this._getControllerValue(prop);
          arg = val;
        } else { // finally take it as controller property (without this.): func(pets)
          const prop = arg;
          const val = this._getControllerValue(prop);
          arg = val;
        }

        return arg;
      });

    return { funcName, funcArgs, funcArgsStr };
  }


  /**
   * Execute the function. It can be the controller method or the function defined in the controller property.
   * @param {string} funcName - function name, for example: runKEYUP or products.list
   * @param {any[]} funcArgs - function argumants
   * @return {void}
   */
  async _funcExe(funcName, funcArgs) {
    try {
      if (/\./.test(funcName)) {
        // execute the function in the controller property, for example: this.print.inConsole = () => {...}
        let propSplitted = funcName.split('.') || []; // ['print', 'inConsole']
        propSplitted = propSplitted.filter(prop => prop !== 'this'); // remove this keyword

        let func = this;
        let bindObj;
        for (const prop of propSplitted) {
          func = func[prop];
          if (typeof func === 'object') { bindObj = func; }
        }
        func = func.bind(bindObj); // bind the function to corresponding object, for example: $auth.logout() bind to $auth

        await func(...funcArgs);

      } else {
        // execute the controller method
        if (!this[funcName]) { throw new Error(`Method "${funcName}" is not defined in the "${this.constructor.name}" controller.`); }
        await this[funcName](...funcArgs);
      }

    } catch (err) {
      console.error(err);
    }
  }


  /**
   * Execute multiple functions, for example: dd-click="f1(); f2(a, b);";
   * @param {string} funcDefs - definition of the functions: func1();func2(a, b);
   * @param {HTMLElement} elem - element where is the dd-... attribute
   * @param {Event} event - the DOM Event object
   */
  async _funcsExe(funcDefs, elem, event) {
    const funcDefs_arr = funcDefs.split(';').filter(funcDef => !!funcDef).map(funcDef => funcDef.trim());
    for (const funcDef of funcDefs_arr) {
      const { funcName, funcArgs } = this._funcParse(funcDef, elem, event);
      await this._funcExe(funcName, funcArgs);
    }
  }


  /**
   * Apply pipe methods on the string.
   * @param {strin} str - the string value which sjhould be converted by the pipe: functions
   * @param {string} pipeOpt - pipe option, for example: pipe:slice(0,10).replace(/as/, '').trim()
   */
  _pipeExe(str, pipeOpt) {
    if (str === undefined || str === null || (!!str && typeof str !== 'string')) { return ''; }
    const pipeFuncs = pipeOpt.replace('pipe:', '').trim();
    const func = new Function(`const str = '${str}'.${pipeFuncs}; return str;`);
    str = func();
    return str;
  }



  /**
   * Execute function or expression. Used in DdListeners.js
   * @param {string} base - the base of the attribute value, dd-click="fja() --preventDefault" -> base is fja()
   * @param {HTMLElement} elem - the dd- element
   * @param {Event} event - the event object
   */
  async _exeFuncsOrExpression(base, elem, event) {
    if (/^\(.*\)$/.test(base)) {
      // solve the expression
      const prop_solved = this._solveMustache(base);
      const expr = prop_solved;
      this._solveExpression(expr);
    } else {
      // execute the controller method
      const funcDefs = base;
      await this._funcsExe(funcDefs, elem, event);
    }
  }



  /***** AID *****/
  /**
   * Add dd-aid attribute in the element.
   * @param {HTMLElement} elem - the DOM element
   * @param {string} uid - unique id of the dd-aid attribute
   * @returns {string}
   */
  _aidCreate(elem, uid) {
    uid = uid || this._uid();
    elem.setAttribute('dd-aid', uid);
    return uid;
  }


  /**
   * Add an option in the dd-aid attribute.
   * @param {HTMLElement} elem - the DOM element
   * @param {string} option - new option: --blockrender, just blockrender or blockRender
   */
  _aidAddOption(elem, option) {
    const attrVal = elem.getAttribute('dd-aid');
    option = option.replace('--', '').toLowerCase();
    let attrVal_new = attrVal + ` --${option}`;
    attrVal_new = attrVal_new.replace(/  +/g, ' ').trim();
    elem.setAttribute('dd-aid', attrVal_new);
  }


  /**
   * Delete an option from the dd-aid attribute.
   * @param {HTMLElement} elem - the DOM element
   * @param {string} option - option to be removed: --blockrender, just blockrender or blockRender
   */
  _aidDelOption(elem, option) {
    const attrVal = elem.getAttribute('dd-aid');
    if (!attrVal) { return; }
    option = option.replace('--', '').toLowerCase();
    let attrVal_new = attrVal.replace(`--${option}`, '');
    attrVal_new = attrVal_new.replace(/  +/g, ' ').trim();
    elem.setAttribute('dd-aid', attrVal_new);
  }


  /**
   * Remove all dd-aid attributes from the element or document with specific option.
   * @param {HTMLElement|Document} elem - the DOM element or document
   */
  _aidRemoveAll(elem, option) {
    const aidElems = elem.querySelectorAll('[dd-aid]');
    if (aidElems === null) { return; }
    for (const aidElem of aidElems) {
      aidElem.removeAttribute('dd-aid');
    }
  }


  /**
   * Create unique element id.
   * @return {string}
   */
  _uid() {
    const date = Date.now() / 1000;
    const ms = (date + '').split('.')[1];
    const rnd = Math.round(Math.random() * 1000);
    const uid = ms + '-' + rnd;
    return uid;
  }




  /***** MISC *****/
  /**
   * Check if the text has substring which will block rendering.
   * The text can have HTML tags. In most cases the block string is string interpolation ${.
   * This method should block rendering of the $$ variables in the dd-foreach orig element. The $$ variables in cloned dd-foreach element will be solved by _solveDoubleDollar()
   * @param {string} text - the text which is under test
   * @param {string} blockString - the string which will block the rendering, usually '$$'
   * @returns {boolean}
   */
  _hasBlockString(text, blockString = '${') {
    return text.includes(blockString);
  }


  /**
   * Check if the HTMl element has any of dd-... directives i.e. attributes
   * @param {HTMLElement} elem - element where is the dd-... attribute
   * @returns {boolean}
   */
  _hasAnyOfClonerDirectives(elem) {
    let tf = false;
    for (const cloner_directive of this.$dd.cloner_directives) {
      if (elem.hasAttribute(cloner_directive)) {
        tf = true;
        break;
      }
    }
    return tf;
  }


  /**
   * Convert string to correct data type. Usually convert element.value (string) in integer, float, boolean or JSON.
   * @param {string} val
   * @returns {string | number | boolean | object}
   */
  _stringTypeConvert(val) {
    function isJSON(val) {
      try { JSON.parse(val); }
      catch (err) { return false; }
      return true;
    }

    if (!!val && !isNaN(val) && !/\./.test(val)) { // convert string into integer (12)
      val = parseInt(val, 10);
    } else if (!!val && !isNaN(val) && /\./.test(val)) { // convert string into float (12.35)
      val = parseFloat(val);
    } else if (val === 'true' || val === 'false') { // convert string into boolean (true)
      val = JSON.parse(val);
    } else if (isJSON(val)) {
      val = JSON.parse(val);
    }

    return val;
  }


  /**
   * Convert value to string. Usually convert controller value to string.
   * @param {any} val - input value of any type
   * @returns {string}
   */
  _val2str(val) {
    if (typeof val === 'string') { val = val; }
    else if (typeof val === 'number') { val = val.toString(); }
    else if (typeof val === 'boolean') { val = val.toString(); }
    else if (typeof val === 'object') { val = JSON.stringify(val); }
    else { val = val; }
    return val;
  }


  /**
  * Debug the controller methods.
  * @param {string} tip - debug type: ddText, render, ...
  * @param {string} text - the printed text
  * @param {string} color - text color
  * @param {string} background - background color
  * @returns {object}
  */
  _debug(tip, text, color, background) {
    const debugOpts = this.$debugOpts || {};
    if (debugOpts && debugOpts[tip]) { console.log(`%c ${text}`, `color: ${color}; background: ${background}`); }
    return debugOpts;
  }

  /**
   * Print the error message in the console.
   * @param {string} errMessage - the error message
   */
  _printError(errMessage) {
    console.log(`%c ERROR:: ${errMessage}`, `color:Red; background:Yellow`);
  }

  /**
   * Print the warning message in the console.
   * @param {string} warnMessage - the error message
   */
  _printWarn(warnMessage) {
    console.log(`%c WARNING:: ${warnMessage}`, `color:Maroon; background:LightYellow`);
  }

  /**
   * A delay
   * @param {number} ms - miliseconds
   */
  async _delay(ms) {
    await new Promise(r => setTimeout(r, ms));
  }




}


export default Aux;
