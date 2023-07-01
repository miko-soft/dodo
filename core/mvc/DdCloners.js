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
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   */
  ddUNCLONE(modelName) {
    for (const cloner_directive of this.$dd.cloner_directives) {
      const attrName = `[${cloner_directive}-clone]`; // dd-foreach-clone
      let dd_elems = document.querySelectorAll(attrName);

      dd_elems = Array.from(dd_elems); // convert DOM node list to JS array

      // take only elements with model name in the dd-...-clone attribute
      if (!!modelName) {
        dd_elems = dd_elems.filter(dd_elem => {
          const attrValue = dd_elem.getAttribute(attrName); // $model.users --user,key
          return attrValue && attrValue.includes('$model.' + modelName);
        });
      }

      for (const dd_elem of dd_elems) { dd_elem.remove(); }
    }
  }



  /**
   * Remove all dd-rendered attributes from the document.
   */
  ddUNRENDERED(modelName) {
    let dd_rendered_elems = document.querySelectorAll('[dd-rendered]');

    dd_rendered_elems = Array.from(dd_rendered_elems); // convert DOM node list to JS array

    // take only elements with model name in the dd-... attribute
    if (!!modelName) {
      const directives = [...this.$dd.noncloner_directives, ...this.$dd.cloner_directives];

      dd_rendered_elems = dd_rendered_elems.filter(dd_rendered_elem => {
        let tf = false;
        for (const directive of directives) {
          const attrValue = dd_rendered_elem.getAttribute(directive); // $model.users --user,key
          if (attrValue && attrValue.includes('$model.' + modelName)) {
            tf = true;
            break;
          }
        }
        return tf;
      });

    }

    for (const dd_rendered_elem of dd_rendered_elems) {
      dd_rendered_elem.removeAttribute('dd-rendered');
    }
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
    const elems = this._listElements(attrName);
    this._debug('ddForeach', `found elements:: ${elems.length}`, 'navy');

    // reverse elems because we want to render nested dd-foreach first
    const elems_reversed = [...elems].reverse();

    for (const elem of elems_reversed) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      this.$debugOpts.ddForeach && console.log(`ddForeach:: attrVal:: ${attrVal} , base:: ${base} , prop_solved:: ${prop_solved} -->`, val);

      // prechecks
      if (!Array.isArray(val)) { this._printWarn(`dd-foreach="${attrVal}" -> The value is not array. Value is: ${JSON.stringify(val)}`); continue; }
      if (!val.length) { continue; }
      if (!opts || (!!opts && !opts.length)) { this._printError(`dd-foreach="${attrVal}" -> The option --val,key is not written`); continue; }

      // get forEach callback argument names from opts, for example: --val,key --> ['val', 'key']
      const [valName, keyName] = opts[0].split(',').map(v => v.trim()); // ['val', 'key']

      // interpolation mark, for example --$0 will solve only $0{...}
      const interpolationMark = opts[1]; // $1

      const clonedElem = this._kloner(elem, attrName, attrVal, false);

      // remove dd-foreach element from cloned element (the case when dd-foreach elements are nested)
      const nestedDdForeachElem = clonedElem.querySelector(`[dd-foreach]`);
      !!nestedDdForeachElem && nestedDdForeachElem.remove();

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
    this._debug('ddRepeat', `--------- ddRepeat(start)------`, 'navy', '#B6ECFF');

    const attrName = 'dd-repeat';
    const elems = this._listElements(attrName);
    this._debug('ddRepeat', `found elements:: ${elems.length}`, 'navy');

    // reverse elems because we want to render child dd-repeat first
    const elems_reversed = [...elems].reverse();

    for (const elem of elems_reversed) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      this._debug('ddRepeat', `dd-repeat="${attrVal}" :: ${base} --> ${prop_solved} = ${val}`, 'navy');

      // convert val to number
      const val_num = +val;

      if (!val_num) { continue; }

      // clone orig element
      for (let i = 1; i <= val_num; i++) {
        this._kloner(elem, attrName, attrVal, true);
      }
    }

    this._debug('ddRepeat', '--------- ddRepeat (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-if="controllerProperty" | dd-if="(expression)"
   *  Create a cloned element when the controllerProperty or expression has truthy value.
   *  The term "if group" means a group of dd-fi, dd-elseif and dd-else elements. Usually a group should be wraped in HTML tag so it is separated from another group, but that's not obligatory.
   * Examples:
   * dd-if="myBool" ; dd-else
   * dd-if="(this.x > 5)" ; dd-elseif="(this.x <= 5)" ; dd-else
   */
  ddIf() {
    this._debug('ddIf', `--------- ddIf(start)------`, 'navy', '#B6ECFF');

    const attrName = 'dd-if';
    const elems = this._listElements(attrName);
    this._debug('ddIf', `found elements:: ${elems.length} `, 'navy');

    // reverse elems because we want to render nested dd-if first
    const elems_reversed = [...elems].reverse();

    for (const elem of elems_reversed) {
      const ifGroupElems = this._getSiblings(elem, ['dd-if', 'dd-elseif', 'dd-else']); // get siblings of dd-if, dd-elseif and dd-else

      // aggregated attribute values from alll elements in a group
      let attrValue = '';
      ifGroupElems.forEach(ifGroupElem => {
        attrValue += ifGroupElem.getAttribute('dd-if') || ifGroupElem.getAttribute('dd-elseif') || ifGroupElem.getAttribute('dd-else');
      });

      this._debug().ddIf && console.log('\n\n--if group--');

      for (const ifGroupElem of ifGroupElems) {
        const attrVal = ifGroupElem.getAttribute('dd-if') || ifGroupElem.getAttribute('dd-elseif') || ifGroupElem.getAttribute('dd-else');
        const { base } = this._decomposeAttribute(attrVal);
        const { val } = this._solveBase(base);
        this._debug().ddIf && console.log(ifGroupElem.outerHTML, val);

        // clone orig element (when val is truthy or when dd-else is reached)
        if (!!val || ifGroupElem.hasAttribute('dd-else')) {
          this._kloner(ifGroupElem, attrName, attrValue, true);
          break;
        }
      }

      this._debug().ddIf && console.log('----------');

    }

    this._debug('ddIf', '--------- ddIf (end) ------', 'navy', '#B6ECFF');
  }



  /**** PRIVATES ****/
  /**
   * Set dd-rendered and hide original element.
   * Clone original HTML element.
   * @param {HTMLElement} elem - original element
   * @param {string} attrName - attribute name: dd-text then it makes attribute dd-text-clone
   * @param {string} attrValue - attribute value: '$model.companies --company,key'
   * @param {boolean} toInsert - if true the cloned elem is inserted as sibling to orig elem
   * @returns {HTMLElement}
   */
  _kloner(elem, attrName, attrValue, toInsert = false) {
    // set dd.rendered option to element and it's children dd- elements because only cloned elements (dd-...-clone) should be rendered, for example don't render dd-mustache but dd-mustache-clone
    this._setRendered(elem);

    // hide orig element
    this._elemHide(elem);

    // clone orig element
    const clonedElem = this._clone_define(elem, attrName, attrValue);
    this._delRendered(clonedElem); // remove dd.rendered from cloned element (and its childrens) because it needs to be rendered
    if (!this._hasAnyOfClonerDirectives(clonedElem)) {
      this._elemShow(clonedElem); // show cloned element
    }

    // insert cloned elem in the HTML document
    toInsert && this._clone_insert(elem, clonedElem);

    return clonedElem;
  }






}




export default DdCloners;
