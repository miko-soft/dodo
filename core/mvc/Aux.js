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
    const propSplitted = prop.split('.'); // ['company', 'name']
    const prop1 = propSplitted[0]; // company

    let val = this[prop1]; // controller property value
    propSplitted.forEach((prop, key) => {
      if (key !== 0 && val != undefined) { val = val[prop]; }
    });

    return val;
  }


  /**
   * Convert value to string.
   * @param {any} val - input value of any type
   * @returns {string}
   */
  _val2str(val) {
    if (typeof val === 'string') { val = val; }
    else if (typeof val === 'number') { val = +val; }
    else if (typeof val === 'boolean') { val = val.toString(); }
    else if (typeof val === 'object') { val = JSON.stringify(val); }
    else { val = val; }
    return val;
  }




  /***** HTML DOM *****/
  /**
   * List DOM elements which has "dd-..." attribute. If dd_id is defined then filter elements where is dd-...-id="dd_id".
   * For example in dd-for="$model.companies.$i0.{{fields.$i1}}" the attrName will be 'dd-for'. And if dd_id is baf11221 then take only elements with dd-for-id="baf11221"
   * @param {string} attrName - attribute name -> 'dd-for'
   * @param {string|undefined} dd_id - dodo unique id
   * @returns {HTMLElement[]}
   */
  _listElements(attrName, dd_id) {
    let elems = [];
    if (!!dd_id) { elems = document.querySelectorAll(`[${attrName}][${attrName}-id="${dd_id}"]`); }
    else { elems = document.querySelectorAll(`[${attrName}]`); }
    return elems;
  }


  /**
   * Decompose attribute to controller property name and attribute options.
   * For example: dd-text="$model.companies --pipe:slice(0,12).trim() --append" --> prop is '$model.companies' and opts is array ['pipe:slice(0,12).trim()', 'append']
   * @param {string} attrVal - attribute value, for example: "$model.names --prepend"
   * @returns {{prop:string, opts:string[]}} - prop is controller property and opts is attribute options
   */
  _decomposeAttribute(attrVal) {
    let opts = attrVal.split('--') || [];
    opts = opts.map(opt => opt.trim());
    const prop = opts.shift();
    return { prop, opts };
  }


  /**
   * Define new cloned element.
   * The original element gets dd-xyz-id , unique ID to distinguish the element from other dd-xyz elements on the page.
   * The cloned element gets dd-xyz-gen and dd-xyz-id attributes.
   * @param {Element} elem - original element
   * @param {string} attrName - attribute name: dd-for, dd-repeat, dd-text
   * @param {string} dd_id - dodo unique id (if dd_id is '0' that means the dd- attribute doesn't have value like in dd-mustache)
   * @returns {HTMLElement}
   */
  _genElem_create(elem, attrName, dd_id) {
    // clone the dd-xyz element
    const newElem = elem.cloneNode(true);

    // remove cloned attributes and add new attributes
    newElem.removeAttribute(attrName);
    newElem.removeAttribute(`${attrName}-id`);
    newElem.setAttribute(`${attrName}-gen`, dd_id);

    // redefine style attribute
    newElem.style.display = '';
    if (!newElem.getAttribute('style')) { newElem.removeAttribute('style'); }

    return newElem;
  }


  /**
   * Remove element with the specific dd-xyz-gen attributes.
   * @param {string} attrName - attribute name: dd-for, dd-repeat, dd-text
   * @param {string|undefined} dd_id - dodo unique id
   * @returns {void}
   */
  _genElem_purge(attrName, dd_id) {
    let genAttr_sel = `[${attrName}-gen]`;
    if (!!dd_id) { genAttr_sel = `[${attrName}-gen="${dd_id}"]`; }
    const genElems = document.querySelectorAll(genAttr_sel);
    for (const genElem of genElems) { genElem.remove(); }
  }


  /**
   * get dodo id from the original HTML element. The original element is the element with dd-... attribute, for example dd-text, dd-html
   * @param {Element} elem - element with dd-id, i.e. orig elem
   * @param {string} attrName - attribute name: dd-for, dd-repeat, dd-text, dd-html
   * @returns {string}
   */
  _origElem_dd_id(elem, attrName) {
    let dd_id = elem.getAttribute(`${attrName}-id`) || '';
    dd_id = dd_id.trim();
    return dd_id;
  }



  /***** SOLVERS *****/
  /**
   * Find {{...}} mustaches in the txt and replace it with the real value. The real value is JS expression like: '2+4' or 'this.$model.n +1' which needs to be solved.
   * @param {string} txt - text with mustache, for example: '$model.company{{this.n + 1}}' or $model.company{{'something'.slice(0,1)}}
   * @returns {string}
   */
  _solveMustache(txt) {
    const openingChar = '{{';
    const closingChar = '}}';

    const reg = new RegExp(`${openingChar}(.+?)${closingChar}`, 'g');
    const mustacheExpressions = txt.match(reg) || []; // ["age", "user.name"]

    for (const mustacheExpression of mustacheExpressions) {
      const expr = mustacheExpression.replace(openingChar, '').replace(closingChar, '').trim();
      const exprResult = this._solveExpression(expr);
      txt = txt.replace(mustacheExpression, exprResult);

      // nested mustacheExpression, for example: dd-echo="{{docs.$i.{{fields.$i}}}}"
      if (reg.test(txt)) { txt = this._solveMustache(txt); }
    }

    return txt;
  }


  /**
   * Solve the JS expression. For example:
   * @param {string} expr - the JS expression
   * @returns {string}
   */
  _solveExpression(expr) {
    let func = new Function(`const exprResult = ${expr}; return exprResult;`);
    func = func.bind(this);

    let exprResult;
    try {
      exprResult = func();
    } catch (err) {
      console.error(`Error in expression "${expr}"`);
      console.error(err);
    }

    if (exprResult === undefined || exprResult === null) { exprResult = ''; }
    else { exprResult = exprResult.toString(); }

    return exprResult;
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
          const mprop = arg.replace(/^\$model\./, ''); // remove $model.
          const val = this._getModelValue(mprop);
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
        const propSplitted = funcName.split('.'); // ['print', 'inConsole']
        let func = this;
        for (const prop of propSplitted) { func = func[prop]; }
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
    const statement_reg = /\w\s*\=\s*[a-zA-z0-9\'\"\$]+/; // regexp for statement, for example age = 3
    if (statement_reg.test(funcDefs)) {
      const assignment = funcDefs;
      this._assignmentExe(assignment, elem, event);
      return;
    }

    const funcDefs_arr = funcDefs.split(';').filter(funcDef => !!funcDef).map(funcDef => funcDef.trim());
    for (const funcDef of funcDefs_arr) {
      const { funcName, funcArgs } = this._funcParse(funcDef, elem, event);
      await this._funcExe(funcName, funcArgs);
    }
  }


  /**
   *
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




  /***** MISC *****/
  /**
   * Create unique dodo id based on text.
   * - max 4294967295 combinations to prevent collision
   * @param {string} txt2hash - some text usually the controller property name, for example: '$model.first_name'
   * @return {string} - 8 bytes unique hash, for example baf11221 (if txt2hash is '' then returned value is '0')
   */
  _uid(txt2hash = '') {
    let hash = 0;
    for (let charIndex = 0; charIndex < txt2hash.length; ++charIndex) {
      hash += txt2hash.charCodeAt(charIndex);
      hash += hash << 10;
      hash ^= hash >> 6;
    }
    hash += hash << 3;
    hash ^= hash >> 11;
    const dd_id = (((hash + (hash << 15)) & 4294967295) >>> 0).toString(16);
    return dd_id;
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
    if (this.$debugOpts[tip]) { console.log(`%c ${text}`, `color: ${color}; background: ${background}`); }
    return this.$debugOpts;
  }


  _printError(text) {
    console.log(`%c ERROR:: ${text}`, `color:Orangered; background:Yellow`);
  }




}


export default Aux;
