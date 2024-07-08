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
      this.$debugOpts.ddEach && console.log(`\nddEach:: attrVal:: ${attrVal} , base:: ${base} -->`, baseVal);

      // get forEach callback argument names from opts, for example: pets --pet,key --> ['pet', 'key'] --> forEach((pet,key) => {...})
      const [valName, keyName] = opts.length ? opts[0].split(',').map(v => v.trim()) : []; // ['pet', 'key']
      if (!this._isValidVariableName(valName)) { this._printError(`dd-each="${attrVal}" has invalid valName:${valName}`); continue; }
      if (!this._isValidVariableName(keyName)) { this._printError(`dd-each="${attrVal}" has invalid keyName:${keyName}`); continue; }

      // clone original elem
      this._clone_remove(elem, attrName); // remove cloned elements generated in previous execution of the ddEach() function
      this._setDdRender(elem, 'disabled'); // set dd-render-disabled option to element and it's children dd- elements because only cloned elements (dd-...-clone) should be rendered, for example don't render dd-class in dd-each but dd-class in dd-each-clone
      const clonedElem = this._clone_define(elem, attrName, attrVal);
      this._elemShow(clonedElem, attrName); // show cloned element by removing dd-each-hide
      this._setDdRender(clonedElem, 'enabled');
      this._delDdRender(clonedElem, 'disabled');

      const outerHTML = clonedElem.outerHTML;

      let html = '';
      baseVal.forEach((val, key) => {
        html += this._solveMustache(outerHTML, { [valName]: val, [keyName]: key }); // solve mustaches in outerHTML -- {{val}}
      });

      elem.insertAdjacentHTML('afterend', html);

    }

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
