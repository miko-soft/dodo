import DdCloners from './DdCloners.js';


/**
 * Non-cloner dd- directives.
 * The methods are erlated on managing attributes like: disabled, src, ...
 */
class Dd extends DdCloners {

  constructor() {
    super();

    this.$dd = {
      elems: {},  // set by ddElem()
      listeners: [], // collector of the dd- listeners  [{attrName, elem, handler, eventName}]
      attributes: [
        // cloners
        'dd-text',
        'dd-html',
        'dd-mustache',
        'dd-if', 'dd-elseif', 'dd-else',
        'dd-foreach',
        'dd-repeat',

        // non-cloners
        'dd-show',
        'dd-disabled',
      ]
    };

  }



  /**
   * dd-show="controllerProperty"  or  dd-show="(expression)"
   *  Show or hide the HTML element by setting display:none.
   * Examples:
   * dd-show="isActive"                         - isActive is the controller property, it can also be model $model.isActive
   * dd-show="this.isActive"                    - this. will not cause the error
   * dd-show="(this.a < 5 && this.a >= 8)"      - expression
   * dd-show="(this.$model.name === 'John')"    - expression with model
   * dd-show="(this.$model.name_{{this.num}} === 'Betty')"    - dynamic controller property name (mustcahe)
   */
  ddShow() {
    this._debug('ddShow', `--------- ddShow (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-show';
    const elems = this._listElements(attrName);
    this._debug('ddShow', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);

      if (this._hasBlockString(elem.outerHTML)) { continue; } // block rendering if the element contains $$

      let val = false;
      let prop_solved = '';
      if (/\(.*\)/.test(base)) {
        // solve the expression
        const prop_solved = this._solveMustache(base); // dd-show="(product_{{this.pid}} === 'Shoes')"
        const expr = prop_solved;
        val = this._solveExpression(expr);
      } else {
        // solve the controller property name and get the controller property value
        prop_solved = base.replace(/^this\./, ''); // remove this. --> dd-show="this.product_{{this.pid}}"
        prop_solved = this._solveMustache(prop_solved); // dd-show="product_{{this.pid}}"
        val = this._getControllerValue(prop_solved);
      }

      this._debug('ddShow', `ddShow:: ${base} --> ${prop_solved} = ${val} ; attrVal:: ${attrVal}`, 'navy');

      // hide orig element
      val ? elem.style.display = '' : elem.style.display = 'none';

      // remove style
      if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }
    }

    this._debug('ddShow', '--------- ddShow (end) ------', 'navy', '#B6ECFF');
  }


  /******************************************************* ATTRIBUTERS *******************************************************/
  /**
   * dd-disabled="controllerProperty"  or  dd-disabled="(expression)"
   *  Disable the HTML element by setting disabled attribute.
   * Examples:
   * dd-disabled="isActive"                         - isActive is the controller property, it can also be model $model.isActive
   * dd-disabled="this.isActive"                    - this. will not cause the error
   * dd-disabled="(this.a < 5 && this.a >= 8)"      - expression
   * dd-disabled="(this.$model.name === 'John')"    - expression with model
   * dd-disabled="(this.$model.name_{{this.num}} === 'Betty')"    - dynamic controller property name (mustcahe)
   */
  ddDisabled() {
    this._debug('ddDisabled', `--------- ddDisabled (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-disabled';
    const elems = this._listElements(attrName);
    this._debug('ddDisabled', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base } = this._decomposeAttribute(attrVal);

      if (this._hasBlockString(elem.outerHTML)) { continue; } // block rendering if the element contains $$

      let val = false;
      let prop_solved = '';
      if (/\(.*\)/.test(base)) {
        // solve the expression
        const prop_solved = this._solveMustache(base); // dd-show="(product_{{this.pid}} === 'Shoes')"
        const expr = prop_solved;
        val = this._solveExpression(expr);
      } else {
        // solve the controller property name and get the controller property value
        prop_solved = base.replace(/^this\./, ''); // remove this. --> dd-show="this.product_{{this.pid}}"
        prop_solved = this._solveMustache(prop_solved); // dd-show="product_{{this.pid}}"
        val = this._getControllerValue(prop_solved);
      }

      this._debug('ddDisabled', `ddDisabled:: ${base} --> ${prop_solved} = ${val} ; attrVal:: ${attrVal}`, 'navy');

      // hide orig element
      elem.disabled = val;

      // show element & remove style
      elem.style.display = '';
      if (!elem.getAttribute('style')) { elem.removeAttribute('style'); }
    }

    this._debug('ddDisabled', '--------- ddDisabled (end) ------', 'navy', '#B6ECFF');
  }





}




export default Dd;
