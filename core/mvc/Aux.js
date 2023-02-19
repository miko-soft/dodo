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




  /***** HTML DOM *****/
  /**
   * List DOM elements which has "dd-..." attribute. If dd_id is defined then filter elements where is dd-...-id="dd_id".
   * For example in dd-for="$model.companies.$i0.{{fields.$i1}}" the attrName will be 'dd-for'. And if dd_id is baf11221 then take only elements with dd-for-id="baf11221"
   * @param {string} attrName - attribute name -> 'dd-for'
   * @param {string} dd_id - dodo unique id
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



  /***** SOLVERS *****/
  /**
   * Find {{...}} mustachess in the txt and replace it with the real value. The real value is JS expression like: '2+4' or 'this.$model.n +1' which needs to be solved.
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
    let exprResult = func();

    if (exprResult === undefined || exprResult === null) { exprResult = ''; }
    else { exprResult = exprResult.toString(); }

    return exprResult;
  }



  /***** MISC *****/
  /**
   * Create unique dodo id based on text.
   * - max 4294967295 combinations to prevent collision
   * @param {string} txt2hash - some text usually the controller property name, for example: '$model.first_name'
   * @return {string} - 8 bytes unique hash, for example baf11221
   */
  _uid(txt2hash) {
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
