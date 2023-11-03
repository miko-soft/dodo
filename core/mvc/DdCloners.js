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
   *  Generate multiple HTML elements based on an array stored in a controller property.
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


    for (const elem of elems) {
      /*** PARENT ***/
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);
      const { val: baseVal, prop_solved } = this._solveBase(base);
      this.$debugOpts.ddForeach && console.log(`\nddForeach:: attrVal:: ${attrVal} , base:: ${base} , prop_solved:: ${prop_solved} -->`, baseVal);

      // get forEach callback argument names from opts, for example: pets --pet,key --> ['pet', 'key'] --> forEach((pet,key) => {...})
      const [valName, keyName] = opts.length ? opts[0].split(',').map(v => v.trim()) : []; // ['pet', 'key']
      if (!this._isValidVariableName(valName)) { this._printError(`dd-foreach="${attrVal}" has invalid valName:${valName}`); continue; }
      if (!this._isValidVariableName(keyName)) { this._printError(`dd-foreach="${attrVal}" has invalid keyName:${keyName}`); continue; }

      // clone original elem
      this._clone_remove(elem, attrName); // remove cloned elements generated in previous execution of the ddForeach() function
      this._setDdRender(elem, 'disabled'); // set dd-render-disabled option to element and it's children dd- elements because only cloned elements (dd-...-clone) should be rendered, for example don't render dd-class in dd-foreach but dd-class in dd-foreach-clone
      const clonedElem = this._clone_define(elem, attrName, attrVal);
      this._elemShow(clonedElem, attrName); // show cloned element by removing dd-foreach-hide
      this._setDdRender(clonedElem, 'enabled');

      const outerHTML = clonedElem.outerHTML;


      /*** CHILD ***/
      const attrName_child = 'dd-foreach-child';
      const elem_child = elem.querySelector(`[${attrName_child}]`);
      const attrVal_child = elem_child ? elem_child.getAttribute(`${attrName_child}`) : '';
      const { base: base_child, opts: opts_child } = this._decomposeAttribute(attrVal_child);
      const [valName_child, keyName_child] = opts_child.length ? opts_child[0].split(',').map(v => v.trim()) : []; // ['pet', 'key']
      if (!this._isValidVariableName(valName_child)) { this._printError(`dd-foreach="${attrVal}" has invalid valName:${valName_child}`); continue; }
      if (!this._isValidVariableName(keyName_child)) { this._printError(`dd-foreach="${attrVal}" has invalid keyName:${keyName_child}`); continue; }
      const outerHTML_child = elem_child ? elem_child.outerHTML : '';



      /*** GRANDCHILD ***/
      const attrName_grandchild = 'dd-foreach-grandchild';
      const elem_grandchild = elem_child ? elem_child.querySelector(`[${attrName_grandchild}]`) : null;
      const attrVal_grandchild = elem_grandchild ? elem_grandchild.getAttribute(`${attrName_grandchild}`) : '';
      const { base: base_grandchild, opts: opts_grandchild } = this._decomposeAttribute(attrVal_grandchild);
      const [valName_grandchild, keyName_grandchild] = opts_grandchild.length ? opts_grandchild[0].split(',').map(v => v.trim()) : []; // ['employer', 'key2']
      if (!this._isValidVariableName(valName_grandchild)) { this._printError(`dd-foreach="${attrVal}" has invalid valName:${valName_grandchild}`); continue; }
      if (!this._isValidVariableName(keyName_grandchild)) { this._printError(`dd-foreach="${attrVal}" has invalid keyName:${keyName_grandchild}`); continue; }
      const outerHTML_grandchild = elem_grandchild ? elem_grandchild.outerHTML : '';


      /*** MULTIPLICATION FUNCTION ***/
      let html = '';
      baseVal.forEach((val, key) => {

        // CHILD
        let baseVal_child = [];
        if (base_child && base_child.includes('this.')) { // when baseVal_child is controller property, for example: dd-foreach-child="this.fields --field"  -- must have this.
          baseVal_child = this._solveExpression(base_child);
        } else if (base_child && base_child.includes(valName)) { // when baseVal_child is forEach() argument, for example: dd-foreach="companies --company" - dd-foreach-child="company.workers --worker"
          baseVal_child = this._solveExpression(base_child, { [valName]: val });
        }

        let html_child = '';
        baseVal_child && baseVal_child.forEach((val_child, key_child) => {

          // GRANDCHILD
          let baseVal_grandchild = [];
          if (base_grandchild && base_grandchild.includes('this.')) { // when baseVal_grandchild is controller property, for example: dd-foreach-grandchild="this.fields --field"  -- must have this.
            baseVal_grandchild = this._solveExpression(base_grandchild);
          } else if (base_grandchild && base_grandchild.includes(valName_child)) { // when baseVal_grandchild is forEach() argument, for example: dd-foreach="companies --company" - dd-foreach-child="company.workers --worker" - dd-foreach-grandchild="worker.jobs --job"
            baseVal_grandchild = this._solveExpression(base_grandchild, { [valName_child]: val_child });
          }

          let html_grandchild = '';
          baseVal_grandchild && baseVal_grandchild.forEach((val_grandchild, key_grandchild) => {
            const textWithBackticks_grandchild = elem_grandchild ? '`' + outerHTML_grandchild + '`' : '';
            html_grandchild += this._solveExpression(textWithBackticks_grandchild, { [valName]: val }, { [keyName]: key }, { [valName_child]: val_child }, { [keyName_child]: key_child }, { [valName_grandchild]: val_grandchild }, { [keyName_grandchild]: key_grandchild });
          });

          // CHILD
          let textWithBackticks_child = '`' + outerHTML_child + '`';
          textWithBackticks_child = elem_grandchild ? ('`' + outerHTML_child + '`').replace(outerHTML_grandchild, html_grandchild) : '`' + outerHTML_child + '`';
          html_child += this._solveExpression(textWithBackticks_child, { [valName]: val }, { [keyName]: key }, { [valName_child]: val_child }, { [keyName_child]: key_child });
        });


        // PARENT
        // solve template literal -- ${var}
        const textWithBackticks = elem_child ? ('`' + outerHTML + '`').replace(outerHTML_child, html_child) : '`' + outerHTML + '`';
        html += this._solveExpression(textWithBackticks, { [valName]: val }, { [keyName]: key });

        // solve doubledollar -- $$var
        html = this._solveDoubledollar(html, base, valName, key); // solve $$var
      });

      // insert multiplied dd-foreach element
      elem.insertAdjacentHTML('afterend', html);

    }

    this._debug('ddForeach', '--------- ddForeach (end) ------', 'navy', '#B6ECFF');
  }





  /**
 * dd-each="controllerProperty --val,key" | dd-each="(expression) [--val,key]"
 *  Generate multiple HTML elements based on an array stored in a controller property.
 *  It's simplified and faster version of dd-foreach.
 *  Nested dd-each elements are not recommended !
 * Examples:
 * dd-each="myArr --val,key" or dd-each="this.myArr --val,key"
 * dd-each="$model.myArr --val,key" or dd-each="this.$model.myArr --val,key"
 * dd-foraech="(['a','b','c']) --val,key"
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
      const { val: baseVal, prop_solved } = this._solveBase(base);
      this.$debugOpts.ddEach && console.log(`\nddEach:: attrVal:: ${attrVal} , base:: ${base} , prop_solved:: ${prop_solved} -->`, baseVal);

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

      const outerHTML = clonedElem.outerHTML;


      let html = '';
      baseVal.forEach((val, key) => {
        // solve template literal -- ${var}
        const textWithBackticks = '`' + outerHTML + '`';
        html += this._solveExpression(textWithBackticks, { [valName]: val }, { [keyName]: key });

        // solve doubledollar -- $$var
        html = this._solveDoubledollar(html, base, valName, key); // solve $$var
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
   */
  ddMustache(modelName) {
    this._debug('ddMustache', `--------- ddMustache (start) -modelName:${modelName} ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-mustache';
    let elems = this._listElements(attrName, '');
    if (!!modelName) { elems = elems.filter(elem => elem.outerHTML.includes(`$model.${modelName}`)); }
    this._debug('ddMustache', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      this._clone_remove_ddMustache(elem, attrName); // remove cloned elements
      this._setDdRender(elem, 'disabled'); // set dd-render-disabled in element and it's children dd- elements because only cloned elements (dd-...-clone) should be rendered, for example don't render dd-mustache but dd-mustache-clone
      this._delDdRender(elem, 'enabled');

      this.$debugOpts.ddMustache && console.log(`\ndd-mustache elem::`, elem);

      // checks
      const uid = elem.getAttribute('dd-id');
      const directive_found = this._hasDirectives(elem, ['dd-repeat']);
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

      this.$debugOpts.ddMustache && console.log(`dd-mustache clonedElem::`, clonedElem);
    }

    this._debug('ddMustache', '--------- ddMustache (end) ------', 'navy', '#B6ECFF');
  }




}




export default DdCloners;
