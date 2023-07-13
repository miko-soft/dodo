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
   * dd-foreach="controllerProperty --val,key" | dd-foreach="(expression) [--val,key]"
   *  Multiply element based on controllerProperty (or expression) which is an array.
   * Examples:
   * dd-foreach="myArr --val,key" or dd-foreach="this.myArr --val,key"
   * dd-foreach="$model.myArr --val,key" or dd-foreach="this.$model.myArr --val,key"
   * dd-foraech="(['a','b','c']) --val,key"
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddForeach(modelName) {
    this._debug('ddForeach', `--------- ddForeach (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-foreach';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddForeach', `found elements:: ${elems.length}`, 'navy');

    // sort listed elements
    let elems_sorted = [...elems].reverse(); // reverse elems because we want to render nested dd-foreach first
    elems_sorted = this._sortElements(elems_sorted); // sort elems by dd-priority="<number>"

    for (const elem of elems_sorted) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      this.$debugOpts.ddForeach && console.log(`\nddForeach:: attrVal:: ${attrVal} , base:: ${base} , prop_solved:: ${prop_solved} -->`, val);

      this._clone_remove(elem, attrName); // remove cloned elements
      this._setDdRender(elem, 'disabled'); // set dd-render-disabled option to element and it's children dd- elements because only cloned elements (dd-...-clone) should be rendered, for example don't render dd-foreach but dd-foreach-clone

      // checks
      const uid = elem.getAttribute('dd-id');
      const directive_found = this._hasDirectives(elem, ['dd-repeat', 'dd-mustache']);
      if (!!directive_found) { this._printError(`dd-foreach="${attrVal}" dd-id="${uid}" contains ${directive_found}`); continue; }
      if (!Array.isArray(val)) { this._printWarn(`dd-foreach="${attrVal}" dd-id="${uid}" -> The value is not array. Value is: ${JSON.stringify(val)}`); continue; }
      if (!val.length) { continue; }
      if (!opts || (!!opts && !opts.length)) { this._printError(`dd-foreach="${attrVal}" dd-id="${uid}" -> The option --val,key is not written`); continue; }

      // get forEach callback argument names from opts, for example: --val,key --> ['val', 'key']
      const [valName, keyName] = opts[0].split(',').map(v => v.trim()); // ['val', 'key']

      // clone orig element
      const clonedElem = this._clone_define(elem, attrName, attrVal);
      this._delDdRender(clonedElem, 'disabled'); // remove dd-render-disabled from cloned element (and its childrens) because it needs to be rendered
      this._setDdRender(clonedElem, 'enabled');
      this._elemShow(clonedElem, attrName); // show cloned element

      // remove dd-foreach element from cloned element (the case when dd-foreach elements are nested)
      const nestedDdForeachElem = clonedElem.querySelector(`[dd-foreach]`);
      !!nestedDdForeachElem && nestedDdForeachElem.remove();

      // interpolation mark, for example --$0 will solve only $0{...}
      const interpolationMark = opts[1]; // $1

      // solve template literals in the cloned element and insert cloned elements in the document
      val.forEach((valValue, keyValue) => {
        let outerhtml = clonedElem.outerHTML.replace(/\s+/g, ' ').replace(/\n/g, '').trim();
        this._debug('ddForeach', `- ddForeach ${interpolationMark || ''}:: outerhtml (before):: ${outerhtml}`, 'navy');
        const interpolations = !!keyName ? { [valName]: valValue, [keyName]: keyValue } : { [valName]: valValue }; // {val: {name: 'Marko', age:21}, key: 1}
        outerhtml = this._solveTemplateLiteral(outerhtml, interpolations, interpolationMark); // solve ${...}
        outerhtml = this._solveDoubledollar(outerhtml, base, valName, keyValue); // solve $$var
        this._debug('ddForeach', `                  outerhtml (after):: ${outerhtml}`, 'navy');
        elem.insertAdjacentHTML('beforebegin', outerhtml); // insert new elements above elem
      });

    }

    this._debug('ddForeach', '--------- ddForeach (end) ------', 'navy', '#B6ECFF');
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
      const { val, prop_solved } = this._solveBase(base);
      this._debug('ddRepeat', `dd-repeat="${attrVal}" :: ${base} --> ${prop_solved} = ${val}`, 'navy');

      this._clone_remove(elem, attrName); // remove cloned elements
      this._setDdRender(elem, 'disabled'); // set dd-render-disabled in element and it's children dd- elements because only cloned elements (dd-...-clone) should be rendered, for example don't render dd-repeat but dd-repeat-clone

      // checks
      const uid = elem.getAttribute('dd-id');
      const directive_found = this._hasDirectives(elem, ['dd-foreach', 'dd-mustache']);
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



  /**
   * dd-mustache
   *  Solve mustaches in the element's inner HTML and element attributes.
   *  The mustache can contain standalone controller property {{this.$model.name}} or expression {{this.id + 1}}. The this. must be used.
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddMustache(modelName) {
    this._debug('ddMustache', `--------- ddMustache (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-mustache';
    const elems = this._listElements(attrName, modelName);
    this._debug('ddMustache', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      this._clone_remove_ddMustache(elem, attrName); // remove cloned elements
      this._setDdRender(elem, 'disabled'); // set dd-render-disabled in element and it's children dd- elements because only cloned elements (dd-...-clone) should be rendered, for example don't render dd-mustache but dd-mustache-clone
      this._delDdRender(elem, 'enabled');

      // checks
      const uid = elem.getAttribute('dd-id');
      const directive_found = this._hasDirectives(elem, ['dd-foreach', 'dd-repeat']);
      if (!!directive_found) { this._printError(`dd-mustache dd-id="${uid}" contains ${directive_found}`); continue; }

      // clone orig element
      const clonedElem = this._clone_define(elem, attrName, '');
      this._delDdRender(clonedElem, 'disabled'); // remove dd-render-disabled from cloned element (and its childrens) because it needs to be rendered

      // solve mustache in innerHTML
      clonedElem.innerHTML = this._solveMustache(clonedElem.innerHTML); // solve mustache

      // // solve mustache in attributes
      for (const attribute of clonedElem.attributes) {
        attribute.value = this._solveMustache(attribute.value);
      }

      // show cloned element
      this._elemShow(clonedElem, attrName);

      // insert cloned elem
      this._clone_insert(elem, clonedElem);
    }

    this._debug('ddMustache', '--------- ddMustache (end) ------', 'navy', '#B6ECFF');
  }




}




export default DdCloners;
