import DdListeners from './DdListeners.js';


/**
 * Cloner dd- directives.
 * This methods will clone the original HTML element.
 */
class DdCloners extends DdListeners {

  constructor() {
    super();
  }


  /**
   * dd-each="controllerProperty --val,key" | dd-each="controllerMethod() --val,key"
   *  Generate multiple HTML elements based on an array stored in a controller property.
   *  Nested dd-each elements are not recommended !
   * Examples:
   * dd-each="myArr --val,key" or dd-each="this.myArr --val,key"
   * dd-each="$model.myArr --val,key" or dd-each="this.$model.myArr --val,key"
   * dd-each="genSomeArray() --val,key"
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddEach(modelName) {
    this._debug('ddEach', `--------- ddEach (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-each';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddEach', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const baseVal = this._solveBase(base);
      if (!baseVal) { this._printError(`The ${base} has undefined value in dd-each="${attrVal}"`); continue; }
      if (!Array.isArray(baseVal)) { this._printError(`The ${base} value in dd-each="${attrVal}" is not an array.`); continue; }
      this.$debugOpts?.ddEach && console.log(`\nddEach:: attrVal:: ${attrVal} , base:: ${base} -->`, baseVal);

      // get forEach callback argument names from opts, for example: pets --pet,key --> ['pet', 'key'] --> forEach((pet,key) => {...})
      const [valName, keyName] = opts.length ? opts[0].split(',').map(v => v.trim()) : []; // ['pet', 'key']
      if (!this._isValidVariableName(valName)) { this._printError(`dd-each="${attrVal}" has invalid valName:${valName}`); continue; }
      if (!this._isValidVariableName(keyName)) { this._printError(`dd-each="${attrVal}" has invalid keyName:${keyName}`); continue; }

      // parse --selected:N opt: index of the clone that should have the selected attribute
      const selectedOpt = opts.slice(1).find(o => /^selected:\d+$/.test(o.trim()));
      const selectedIdx = selectedOpt ? parseInt(selectedOpt.split(':')[1]) : -1;
      if (selectedIdx >= baseVal.length) { this._printWarn(`dd-each="${attrVal}" --selected:${selectedIdx} is out of bounds, max allowed is --selected:${baseVal.length - 1}`); }

      // clone original elem
      this._clone_remove(elem, attrName); // remove cloned elements generated in previous execution of the ddEach() function
      this._setDdRender(elem, 'disabled'); // set dd-render-disabled option to element and it's children dd- elements because only cloned elements (dd-...-clone) should be rendered, for example don't render dd-class in dd-each but dd-class in dd-each-clone
      const clonedElem = this._clone_define(elem, attrName, attrVal);
      this._elemShow(clonedElem, attrName); // show cloned element by removing dd-each-hide
      this._setDdRender(clonedElem, 'enabled');
      this._delDdRender(clonedElem, 'disabled');

      const outerHTML = clonedElem.outerHTML;
      const uid = elem.getAttribute('dd-id');

      let html = '';
      baseVal.forEach((val, key) => {
        let html_solved = '';
        html_solved = this._solveMustache(outerHTML, { [valName]: val, [keyName]: key }); // replace mustaches in outerHTML --> {{val}} {{key}} with string
        html_solved = this._solveDoubledollar(html_solved, base, valName, key); // replace doubledollar in outerHTML -->  $$val with current iteration object
        html_solved = this._solveEach2(html_solved, base, valName, key); // resolve dd-each2 attribute bases to absolute controller paths
        html_solved = this._resolveUids(html_solved); // fresh dd-id per iteration so inner dd-each2 clones don't collide across rows
        html_solved = html_solved.replace(/^(<[^>]+?)dd-id="[^"]*"/, `$1dd-id="${uid}"`); // restore root clone's dd-id so _clone_remove can find it on re-render
        if (key === selectedIdx) { html_solved = html_solved.replace(/^(<[^>]*)>/, '$1 selected>'); }
        html += html_solved;
      });

      elem.insertAdjacentHTML('afterend', html);

    }

  }


  /**
   * dd-each2="outerVal.subArrayProp --val,key"
   *  Iterate a sub-array that is a property of the current outer dd-each item.
   *  Must be called after ddEach(). dd-each2 attribute bases are resolved to absolute controller paths by ddEach before this runs.
   * Example: dd-each2="user.companies --company,key"
   * @param {string} modelName - model name of the outer dd-each, for example 'users'
   */
  ddEach2(modelName) {
    this._debug('ddEach2', `--------- ddEach2 (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-each2';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddEach2', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const baseVal = this._solveBase(base);
      if (!baseVal) { this._printError(`The ${base} has undefined value in dd-each2="${attrVal}"`); continue; }
      if (!Array.isArray(baseVal)) { this._printError(`The ${base} value in dd-each2="${attrVal}" is not an array.`); continue; }
      this.$debugOpts?.ddEach2 && console.log(`\nddEach2:: attrVal:: ${attrVal} , base:: ${base} -->`, baseVal);

      const [valName, keyName] = opts.length ? opts[0].split(',').map(v => v.trim()) : [];
      if (!this._isValidVariableName(valName)) { this._printError(`dd-each2="${attrVal}" has invalid valName:${valName}`); continue; }
      if (!this._isValidVariableName(keyName)) { this._printError(`dd-each2="${attrVal}" has invalid keyName:${keyName}`); continue; }

      const selectedOpt2 = opts.slice(1).find(o => /^selected:\d+$/.test(o.trim()));
      const selectedIdx2 = selectedOpt2 ? parseInt(selectedOpt2.split(':')[1]) : -1;
      if (selectedIdx2 >= baseVal.length) { this._printWarn(`dd-each2="${attrVal}" --selected:${selectedIdx2} is out of bounds, max allowed is --selected:${baseVal.length - 1}`); }

      this._clone_remove(elem, attrName);
      this._setDdRender(elem, 'disabled');
      const clonedElem = this._clone_define(elem, attrName, attrVal);
      this._elemShow(clonedElem, attrName);
      this._setDdRender(clonedElem, 'enabled');
      this._delDdRender(clonedElem, 'disabled');

      const outerHTML = clonedElem.outerHTML;

      let html = '';
      baseVal.forEach((val, key) => {
        let html_solved = '';
        html_solved = this._solveMustache(outerHTML, { [valName]: val, [keyName]: key });
        html_solved = this._solveDoubledollar(html_solved, base, valName, key);
        if (key === selectedIdx2) { html_solved = html_solved.replace(/^(<[^>]*)>/, '$1 selected>'); }
        html += html_solved;
      });

      elem.insertAdjacentHTML('afterend', html);
    }

    this._debug('ddEach2', '--------- ddEach2 (end) ------', 'navy', '#B6ECFF');
  }


  /**
   * dd-entries="controllerProperty --key,val" | dd-entries="controllerMethod() --key,val"
   *  Generate multiple HTML elements by iterating Object.entries() of a plain object stored in a controller property.
   *  Use dd-each for arrays; use dd-entries for plain objects.
   * Examples:
   * dd-entries="myObj --key,val" or dd-entries="this.myObj --key,val"
   * dd-entries="$model.config --key,val"
   * dd-entries="getMetadata() --key,val"
   * @param {string} modelName - model name, for example in $model.config the model name is 'config'
   */
  ddEntries(modelName) {
    this._debug('ddEntries', `--------- ddEntries (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-entries';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddEntries', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const baseVal = this._solveBase(base);
      if (!baseVal) { this._printError(`The ${base} has undefined value in dd-entries="${attrVal}"`); continue; }
      if (Array.isArray(baseVal) || typeof baseVal !== 'object') { this._printError(`The ${base} value in dd-entries="${attrVal}" is not a plain object. Use dd-each for arrays.`); continue; }
      this.$debugOpts?.ddEntries && console.log(`\nddEntries:: attrVal:: ${attrVal} , base:: ${base} -->`, baseVal);

      const [keyName, valName] = opts.length ? opts[0].split(',').map(v => v.trim()) : [];
      if (!this._isValidVariableName(keyName)) { this._printError(`dd-entries="${attrVal}" has invalid keyName:${keyName}`); continue; }
      if (!this._isValidVariableName(valName)) { this._printError(`dd-entries="${attrVal}" has invalid valName:${valName}`); continue; }

      this._clone_remove(elem, attrName);
      this._setDdRender(elem, 'disabled');
      const clonedElem = this._clone_define(elem, attrName, attrVal);
      this._elemShow(clonedElem, attrName);
      this._setDdRender(clonedElem, 'enabled');
      this._delDdRender(clonedElem, 'disabled');

      const outerHTML = clonedElem.outerHTML;
      const uid = elem.getAttribute('dd-id');

      let html = '';
      Object.entries(baseVal).forEach(([key, val], idx) => {
        const valStr = (typeof val === 'object' && val !== null) ? this._val2str(val) : val;
        let html_solved = this._solveMustache(outerHTML, { [keyName]: key, [valName]: valStr });
        html_solved = this._solveDoubledollar(html_solved, base, valName, idx);
        html_solved = this._resolveUids(html_solved);
        html_solved = html_solved.replace(/^(<[^>]+?)dd-id="[^"]*"/, `$1dd-id="${uid}"`);
        html += html_solved;
      });

      elem.insertAdjacentHTML('afterend', html);
    }

    this._debug('ddEntries', '--------- ddEntries (end) ------', 'navy', '#B6ECFF');
  }


  /**
   * Resolve dd-each2 attribute bases from outer-loop-alias form to absolute controller paths.
   * Called inside ddEach's forEach so ddEach2 can later resolve them via _solveBase.
   * Example: "user.companies --company,key" with outerBase="$model.users", outerValName="user", outerKey=0
   *       → "this.$model.users[0].companies --company,key"
   */
  _solveEach2(html, outerBase, outerValName, outerKey) {
    const absBase = /^this\./.test(outerBase)
      ? `${outerBase}[${outerKey}]`
      : `this.${outerBase}[${outerKey}]`;
    return html.replace(/dd-each2="([^"]+)"/g, (_match, attrVal) => {
      const dashIdx = attrVal.indexOf(' --');
      const base = dashIdx >= 0 ? attrVal.slice(0, dashIdx).trim() : attrVal.trim();
      const opts = dashIdx >= 0 ? attrVal.slice(dashIdx) : '';
      const reg = new RegExp(`^(this\\.)?${outerValName}\\.`);
      const newBase = base.replace(reg, `${absBase}.`);
      return `dd-each2="${newBase}${opts}"`;
    });
  }


  /**
   * dd-repeat="controllerProperty" | dd-repeat="(expression)"
   *  Multiply element based on controllerProperty, on number or expression.
   * Examples:
   * dd-repeat="myNumber" or dd-repeat="this.myNumber"
   * dd-repeat="$model.myNumber" or dd-repeat="this.$model.myNumber"
   * dd-repeat="(5)"
   * dd-repeat="(this.myNumber + 1)"
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddRepeat(modelName) {
    this._debug('ddRepeat', `--------- ddRepeat (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-repeat';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddRepeat', `found elements:: ${elems.length}`, 'navy');

    // reverse elems because we want to render child dd-repeat first
    const elems_reversed = [...elems].reverse();

    for (const elem of elems_reversed) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);
      const val = this._solveBase(base);
      if (!val) { this._printError(`The ${base} has undefined value in dd-repeat="${attrVal}"`); continue; }
      this._debug('ddRepeat', `dd-repeat="${attrVal}" :: ${base} = ${val}`, 'navy');

      this._clone_remove(elem, attrName); // remove cloned elements
      this._setDdRender(elem, 'disabled'); // set dd-render-disabled in element and it's children dd- elements because only cloned elements (dd-...-clone) should be rendered, for example don't render dd-repeat but dd-repeat-clone

      // checks
      const uid = elem.getAttribute('dd-id');
      const directive_found = this._hasDirectives(elem, ['dd-each']);
      if (!!directive_found) { this._printError(`dd-repeat="${attrVal}" dd-id="${uid}" contains ${directive_found}`); continue; }

      // convert val to number
      const val_num = +val;
      if (!val_num) { continue; }

      for (let i = 1; i <= val_num; i++) {
        // clone orig element
        const clonedElem = this._clone_define(elem, attrName, attrVal);
        this._delDdRender(clonedElem, 'disabled'); // remove dd-render-disabled from cloned element (and its childrens) because it needs to be rendered
        this._elemShow(clonedElem, attrName);

        // insert cloned elem in the HTML document
        this._clone_insert(elem, clonedElem);
      }
    }

    this._debug('ddRepeat', '--------- ddRepeat (end) ------', 'navy', '#B6ECFF');
  }



}




export default DdCloners;
