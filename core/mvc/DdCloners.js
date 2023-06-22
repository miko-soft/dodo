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
  ddUNCLONE() {
    for (const cloner_directive of this.$dd.cloner_directives) {
      const dd_elems = document.querySelectorAll(`[${cloner_directive}-clone]`);
      for (const dd_elem of dd_elems) { dd_elem.remove(); }
    }
  }



  /**
   * Remove all dd-aid attributes from the document.
   */
  ddUNAID() {
    this._aidRemoveAll(document);
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

      // set --blockrender option and block rendering of dd- elements which are inside dd-foreach because only dd- elements inside dd-foreach-clone should be rendered
      this._setBlockrender(elem);

      // hide orig element
      this._elemHide(elem);

      // prechecks
      if (!Array.isArray(val)) { this._printWarn(`dd-foreach="${attrVal}" -> The value is not array. Value is: ${JSON.stringify(val)}`); continue; }
      if (!val.length) { continue; }
      if (!opts || (!!opts && !opts.length)) { this._printError(`dd-foreach="${attrVal}" -> The option --val,key is not written`); continue; }

      // get forEach callback argument names from opts, for example: --val,key --> ['val', 'key']
      const [valName, keyName] = opts[0].split(',').map(v => v.trim()); // ['val', 'key']

      // interpolation mark, for example --$0 will solve only $0{...}
      const interpolationMark = opts[1]; // $1

      // define cloned element
      const clonedElem = this._clone_define(elem, attrName);

      // remove --blockrender from cloned element (and its childrens) because it needs to be rendered
      this._delBlockrender(clonedElem);

      // remove dd-foreach element from cloned element (the case when dd-foreach elements are nested)
      const nestedDdForeachElem = clonedElem.querySelector(`[dd-foreach]`);
      !!nestedDdForeachElem && nestedDdForeachElem.remove();

      // solve template literals in the cloned element and insert cloned elements in the document
      val.forEach((valValue, keyValue) => {
        let outerhtml = clonedElem.outerHTML.replace(/\n\s/g, '').trim();
        this._debug('ddForeach', `- ddForeach:: outerhtml - before:: ${outerhtml}`, 'navy');
        const interpolations = !!keyName ? { [valName]: valValue, [keyName]: keyValue } : { [valName]: valValue }; // {val: {name: 'Marko', age:21}, key: 1}
        outerhtml = this._solveTemplateLiteral(outerhtml, interpolations, interpolationMark);
        this._debug('ddForeach', `- ddForeach:: outerhtml - after:: ${outerhtml}\n`, 'navy');
        elem.insertAdjacentHTML('beforebegin', outerhtml); // insert new elements above elem
      });

      // remove cloned element to free up memory
      clonedElem.remove();

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
        const clonedElem = this._clone_define(elem, attrName);
        this._clone_insert(elem, clonedElem);
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

    for (const elem of elems) {
      const ifGroupElems = this._getSiblings(elem, ['dd-if', 'dd-elseif', 'dd-else']); // get siblings of dd-if, dd-elseif and dd-else

      this._debug().ddIf && console.log('\n\n--if group--');

      for (const ifGroupElem of ifGroupElems) {
        const attrVal = ifGroupElem.getAttribute('dd-if') || ifGroupElem.getAttribute('dd-elseif') || ifGroupElem.getAttribute('dd-else');
        const { base } = this._decomposeAttribute(attrVal);
        const { val } = this._solveBase(base);

        // set --blockrender option and block rendering of dd- elements which are inside dd-if because only dd- elements inside dd-if-clone should be rendered
        this._setBlockrender(ifGroupElem);

        // hide orig element
        this._elemHide(ifGroupElem);

        this._debug().ddIf && console.log(ifGroupElem.outerHTML, val);

        // clone orig element (when val is truthy or when dd-else is reached)
        if (!!val || ifGroupElem.hasAttribute('dd-else')) {
          const clonedElem = this._clone_define(ifGroupElem, attrName);

          // remove --blockrender from cloned element (and its childrens) because it needs to be rendered
          this._delBlockrender(clonedElem);

          this._clone_insert(ifGroupElems[ifGroupElems.length - 1], clonedElem); // clone at the end of if group
          break;
        }

      }

      this._debug().ddIf && console.log('----------');

    }

    this._debug('ddIf', '--------- ddIf (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-text="controllerProperty [--overwrite|remain|prepend|append]" | dd-text="expression [--overwrite|remain|prepend|append]"
   *  Print pure text in the dd-text element.
   * Examples:
   * dd-text="firstName"                  - firstName is the controller property, it can also be model $model.firstname
   * dd-text="this.firstName"             - this. will not cause the error
   * dd-text="firstName --append"         - append the text to the existing text
   * dd-text="$model.product___{{id}}"    - dynamic controller property name
   */
  ddText() {
    this._debug('ddText', `--------- ddText(start)------`, 'navy', '#B6ECFF');

    const attrName = 'dd-text';
    const elems = this._listElements(attrName);
    this._debug('ddText', `found elements:: ${elems.length} `, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      this._debug('ddText', `dd-text="${attrVal}" :: ${base} --> ${prop_solved} = ${val}`, 'navy');

      // don't render elements with undefined controller's value
      if (val === undefined || val === null) { continue; }

      // convert controller val to string
      let val_str = this._val2str(val);

      // apply pipe option, for example: --pipe:slice(0,10).trim() (val_str must be a string)
      const pipeOpt = opts.find(opt => opt.includes('pipe:')); // pipe:slice(0, 3).trim()
      if (!!pipeOpt) { val_str = this._pipeExe(val_str, pipeOpt); }

      // set --blockrender option and block rendering of dd- elements which are inside dd-text because only dd- elements inside dd-text-clone should be rendered
      this._setBlockrender(elem);

      // hide orig element
      this._elemHide(elem);

      // clone orig element
      const clonedElem = this._clone_define(elem, attrName);
      this._delBlockrender(clonedElem); // remove --blockrender from cloned element (and its childrens) because it needs to be rendered
      this._clone_insert(elem, clonedElem);

      // load content in the element
      if (opts.includes('overwrite')) {
        clonedElem.textContent = val_str; // take controller value and replace element value
      } else if (opts.includes('remain')) {
        clonedElem.textContent = elem.textContent; // take element value i.e. leave it as is
      } else if (opts.includes('prepend')) {
        clonedElem.textContent = val_str + elem.textContent; // take controller value and prepend it to element value
      } else if (opts.includes('append')) {
        clonedElem.textContent = elem.textContent + val_str; // take controller value and append it to element value
      } else {
        clonedElem.textContent = val_str; // overwrite is default
      }
    }

    this._debug('ddText', '--------- ddText (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-html="controllerProperty [--inner|outer|sibling|prepend|append]" | dd-html="expression [--inner|outer|sibling|prepend|append]"
   *  Embed HTML node in the DOM at a place marked with dd-html attribute.
   * Examples:
   * dd-html="product" or dd-html="product.name --inner"    - insert in the element (product is the controller property with HTML tags in the value)
   * dd-html="product.name --outer"                         - replace the element
   */
  ddHtml() {
    this._debug('ddHtml', `--------- ddHtml(start)------`, 'navy', '#B6ECFF');

    const attrName = 'dd-html';
    const elems = this._listElements(attrName);
    this._debug('ddHtml', `found elements:: ${elems.length} `, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const { val, prop_solved } = this._solveBase(base);
      this._debug('ddHtml', `dd-html="${attrVal}" :: ${base} --> ${prop_solved} = ${val}`, 'navy');

      // don't render elements with undefined controller's value
      if (val === undefined || val === null) { continue; }

      // convert controller val to string
      let val_str = this._val2str(val);

      // apply pipe option, for example: --pipe:slice(0,10).trim() (val must be a string)
      const pipeOpt = opts.find(opt => opt.includes('pipe:')); // pipe:slice(0, 3).trim()
      if (!!pipeOpt) { val_str = this._pipeExe(val_str, pipeOpt); }

      // set --blockrender option and block rendering of dd- elements which are inside dd-text because only dd- elements inside dd-text-clone should be rendered
      this._setBlockrender(elem);

      // hide orig element
      this._elemHide(elem);

      // clone orig element
      const clonedElem = this._clone_define(elem, attrName);
      this._delBlockrender(clonedElem); // remove --blockrender from cloned element (and its childrens) because it needs to be rendered
      this._clone_insert(elem, clonedElem);

      // load content in the element
      if (opts.includes('inner')) {
        clonedElem.innerHTML = val_str; // embed HTML in the clonedElem
      } else if (opts.includes('outer')) {
        clonedElem.outerHTML = `<span dd-html-clone>${val_str}</span > `; // wrap in span
      } else if (opts.includes('sibling')) {
        const docParsed = new DOMParser().parseFromString(val_str, 'text/html');
        const siblingElem = docParsed.body.childNodes[0];
        siblingElem.setAttribute('dd-html-clone', '');
        clonedElem.parentNode.insertBefore(siblingElem, clonedElem.nextSibling);
      } else if (opts.includes('prepend')) {
        clonedElem.innerHTML = val_str + clonedElem.innerHTML; // take controller value and prepend it to element value
      } else if (opts.includes('append')) {
        clonedElem.innerHTML = clonedElem.innerHTML + val_str; // take controller value and append it to element value
      } else {
        clonedElem.innerHTML = val_str; // inner is default
      }
    }

    this._debug('ddHtml', '--------- ddHtml (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-mustache
   *  Solve mustaches in the element's innerHTML and attributes.
   *  The mustache can contain standalone controller property {{this.$model.name}} or expression {{this.id + 1}}. The this. must be used.
   */
  ddMustache() {
    this._debug('ddMustache', `--------- ddMustache(start)------`, 'navy', '#B6ECFF');

    const attrName = 'dd-mustache';
    const elems = this._listElements(attrName);
    this._debug('ddMustache', `found elements:: ${elems.length} `, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);

      // set --blockrender option and block rendering of dd- elements which are inside dd-mustache because only dd- elements inside dd-mustache-clone should be rendered
      this._setBlockrender(elem);

      // hide orig element
      this._elemHide(elem);

      // clone orig element
      const clonedElem = this._clone_define(elem, attrName);

      // solve mustache in inner html
      const innerHTML = clonedElem.innerHTML;
      const innerHTML_solved = this._solveMustache(innerHTML);
      this._debug('ddMustache', `ddMustache-innerHTML:: ${innerHTML} --> ${innerHTML_solved} `, 'navy');

      // solve mustache in attributes
      for (const attribute of clonedElem.attributes) {
        attribute.value = this._solveMustache(attribute.value);
      }

      if (this._hasAnyOfClonerDirectives(clonedElem)) { continue; }

      // insert cloned element in document
      clonedElem.innerHTML = innerHTML_solved;
      this._clone_insert(elem, clonedElem);

      // remove element if it's created with dd-foreach, dd-repeat or other cloner directive
      for (const cloner_directive of this.$dd.cloner_directives) {
        if (elem.hasAttribute(`${cloner_directive}-clone`)) { elem.remove(); }
      }

      this._debug('ddMustache', `ddMustache-outerHTML:: ${clonedElem.outerHTML}`, 'navy');
    }

    this._debug('ddMustache', '--------- ddMustache (end) ------', 'navy', '#B6ECFF');
  }






}




export default DdCloners;
