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
   * Remove all dd-xyz-clone elements
   */
  ddCloneREMOVE() {
    for (const cloner_directive of this.$dd.cloner_directives) {
      const attrName = `${cloner_directive}-clone`; // dd-foreach-clone
      const dd_elems = document.querySelectorAll(`[${attrName}]`);
      for (const dd_elem of dd_elems) { dd_elem.remove(); }
    }
  }


  /**
   * Remove all dd-render-block elements from document.
   */
  ddRenderBlockREMOVE() {
    this._purgeDdRender('block');
  }



  /**
   * dd-foreach="controllerProperty --val,key" | dd-foreach="(expression) [--val,key]"
   *  Multiply element based on controllerProperty (or expression) which is an array.
   * Examples:
   * dd-foreach="myArr --val,key" or dd-foreach="this.myArr --val,key"
   * dd-foreach="$model.myArr --val,key" or dd-foreach="this.$model.myArr --val,key"
   * dd-foraech="(['a','b','c']) --val,key"
   */
  ddForeach() {
    this._debug('ddForeach', `--------- ddForeach (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-foreach';
    const elems = this._listElements(attrName, '');
    this._debug('ddForeach', `found elements:: ${elems.length}`, 'navy');

    // sort listed elements
    let elems_sorted = [...elems].reverse(); // reverse elems because we want to render nested dd-foreach first
    elems_sorted = this._sortElements(elems_sorted); // sort elems by dd-priority="<number>"

    for (const elem of elems_sorted) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      this.$debugOpts.ddForeach && console.log(`ddForeach:: attrVal:: ${attrVal} , base:: ${base} , prop_solved:: ${prop_solved} -->`, val);

      this._elemHide(elem); // hide orig element
      this._setDdRender(elem, 'block'); // set dd-render-block option to element and it's children dd- elements because only cloned elements (dd-...-clone) should be rendered, for example don't render dd-foreach but dd-foreach-clone

      // prechecks
      if (!Array.isArray(val)) { this._printWarn(`dd-foreach="${attrVal}" -> The value is not array. Value is: ${JSON.stringify(val)}`); continue; }
      if (!val.length) { continue; }
      if (!opts || (!!opts && !opts.length)) { this._printError(`dd-foreach="${attrVal}" -> The option --val,key is not written`); continue; }

      // get forEach callback argument names from opts, for example: --val,key --> ['val', 'key']
      const [valName, keyName] = opts[0].split(',').map(v => v.trim()); // ['val', 'key']

      // clone orig element
      const clonedElem = this._clone_define(elem, attrName, attrVal);
      this._delDdRender(clonedElem, 'block'); // remove dd-render-block from cloned element (and its childrens) because it needs to be rendered
      this._setDdRender(clonedElem, 'always');
      if (!this._hasAnyOfClonerDirectives(clonedElem)) {
        this._elemShow(clonedElem); // show cloned element
      }

      // remove dd-foreach element from cloned element (the case when dd-foreach elements are nested)
      const nestedDdForeachElem = clonedElem.querySelector(`[dd-foreach]`);
      !!nestedDdForeachElem && nestedDdForeachElem.remove();

      // interpolation mark, for example --$0 will solve only $0{...}
      const interpolationMark = opts[1]; // $1

      // solve template literals in the cloned element and insert cloned elements in the document
      val.forEach((valValue, keyValue) => {
        let outerhtml = clonedElem.outerHTML.replace(/\n\s/g, '').trim();
        this._debug('ddForeach', `- ddForeach ${interpolationMark || ''}:: outerhtml (before):: ${outerhtml}`, 'navy');
        const interpolations = !!keyName ? { [valName]: valValue, [keyName]: keyValue } : { [valName]: valValue }; // {val: {name: 'Marko', age:21}, key: 1}
        outerhtml = this._solveTemplateLiteral(outerhtml, interpolations, interpolationMark); // solve ${...}
        outerhtml = this._solveDoubledollar(outerhtml, base, valName, keyValue); // solve $$var
        this._debug('ddForeach', `- ddForeach ${interpolationMark || ''}:: outerhtml (after):: ${outerhtml}\n`, 'navy');
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
   */
  ddRepeat() {
    this._debug('ddRepeat', `--------- ddRepeat (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-repeat';
    const elems = this._listElements(attrName, '');
    this._debug('ddRepeat', `found elements:: ${elems.length}`, 'navy');

    // reverse elems because we want to render child dd-repeat first
    const elems_reversed = [...elems].reverse();

    for (const elem of elems_reversed) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      this._debug('ddRepeat', `dd-repeat="${attrVal}" :: ${base} --> ${prop_solved} = ${val}`, 'navy');

      this._elemHide(elem); // hide orig element
      this._setDdRender(elem, 'block'); // set dd-render="block" in element and it's children dd- elements because only cloned elements (dd-...-clone) should be rendered, for example don't render dd-repeat but dd-repeat-clone

      // convert val to number
      const val_num = +val;
      if (!val_num) { continue; }

      for (let i = 1; i <= val_num; i++) {
        // clone orig element
        const clonedElem = this._clone_define(elem, attrName, attrVal);
        this._delDdRender(clonedElem, 'block'); // remove dd-render-block from cloned element (and its childrens) because it needs to be rendered
        if (!this._hasAnyOfClonerDirectives(clonedElem)) { this._elemShow(clonedElem); }

        // insert cloned elem in the HTML document
        this._clone_insert(elem, clonedElem);
      }
    }

    this._debug('ddRepeat', '--------- ddRepeat (end) ------', 'navy', '#B6ECFF');
  }


  /**
   * dd-mustache
   *  Solve mustaches in the element's inner HTML.
   *  The mustache can contain standalone controller property {{this.$model.name}} or expression {{this.id + 1}}. The this. must be used.
   */
  ddMustache() {
    this._debug('ddMustache', `--------- ddMustache (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-mustache';
    const elems = this._listElements(attrName, '');
    this._debug('ddMustache', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      this._elemHide(elem); // hide orig element
      this._setDdRender(elem, 'block'); // set dd-render="block" in element and it's children dd- elements because only cloned elements (dd-...-clone) should be rendered, for example don't render dd-mustache but dd-mustache-clone

      // clone orig element
      const clonedElem = this._clone_define(elem, attrName, '');
      clonedElem.innerHTML = this._solveMustache(clonedElem.innerHTML); // solve mustache
      this._delDdRender(clonedElem, 'block'); // remove dd.rendered from cloned element (and its childrens) because it needs to be rendered
      if (!this._hasAnyOfClonerDirectives(elem, ['dd-foreach', 'dd-repeat'])) { this._elemShow(clonedElem); }

      // solve mustache in attributes
      for (const attribute of clonedElem.attributes) {
        attribute.value = this._solveMustache(attribute.value);
      }

      // insert cloned elem in the HTML document
      this._clone_insert(elem, clonedElem);
    }

    this._debug('ddMustache', '--------- ddMustache (end) ------', 'navy', '#B6ECFF');
  }




}




export default DdCloners;
