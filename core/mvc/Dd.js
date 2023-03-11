import DdListeners from './DdListeners.js';


/**
 * Parse HTML elements with the "dd-" attribute (non-listeners)
 */
class Dd extends DdListeners {

  constructor() {
    super();

    this.$dd = {
      elems: {},  // set by ddElem()
      listeners: [], // collector of the dd- listeners  [{attrName, elem, handler, eventName}]
      attributes: [
        'dd-text',
        'dd-html',
        'dd-mustache',
        'dd-show',
        'dd-if', 'dd-elseif', 'dd-else',
        'dd-foreach',
      ]
    };

  }


  /**
   * Remove all dd-xyz-clone elements
   */
  ddDECLONE() {
    for (const attribute of this.$dd.attributes) {
      const dd_elems = document.querySelectorAll(`[${attribute}-clone]`);
      for (const dd_elem of dd_elems) { dd_elem.remove(); }
    }
  }



  /**
   * dd-text="controllerProperty [--overwrite|remain|prepend|append]"
   *  Print pure text in the dd-text element.
   * Examples:
   * dd-text="firstName"                  - firstName is the controller property, it can also be model $model.firstname
   * dd-text="this.firstName"             - this. will not cause the error
   * dd-text="firstName --append"         - append the text to the existing text
   * dd-text="$model.product___{{id}}"    - dynamic controller property name
   */
  ddText() {
    this._debug('ddText', `--------- ddText (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-text';
    const elems = this._listElements(attrName);
    this._debug('ddText', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);

      if (this._hasBlockString(base)) { continue; } // block rendering if the element contains $$

      // solve the controller property name and get the controller property value
      let prop_solved = base.replace(/^this\./, ''); // remove this. --> dd-text="this.product_{{this.pid}}"
      prop_solved = this._solveMustache(prop_solved); // dd-text="product_{{this.pid}}"
      let val = this._getControllerValue(prop_solved);

      this._debug('ddText', `ddText:: ${base} --> ${prop_solved} = "${val}"  --opts::"${opts}"`, 'navy');

      // don't render elements with undefined controller's value
      if (val === undefined || val === null) { elem.textContent = ''; continue; }

      // convert controller val to string
      val = this._val2str(val);

      // clone orig element
      const clonedElem = this._clone_define(elem, attrName);
      this._clone_insert(elem, clonedElem);

      // apply pipe option, for example: --pipe:slice(0,10).trim() (val must be a string)
      const pipeOpt = opts.find(opt => opt.includes('pipe:')); // pipe:slice(0, 3).trim()
      if (!!pipeOpt) { val = this._pipeExe(val, pipeOpt); }

      // load content in the element
      if (opts.includes('overwrite')) {
        clonedElem.textContent = val; // take controller value and replace element value
      } else if (opts.includes('remain')) {
        clonedElem.textContent = elem.textContent; // take element value i.e. leave it as is
      } else if (opts.includes('prepend')) {
        clonedElem.textContent = val + elem.textContent; // take controller value and prepend it to element value
      } else if (opts.includes('append')) {
        clonedElem.textContent = elem.textContent + val; // take controller value and append it to element value
      } else {
        clonedElem.textContent = val; // overwrite is default
      }
    }

    this._debug('ddText', '--------- ddText (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-html="controllerProperty [--inner|outer|sibling|prepend|append]"
   *  Embed HTML node in the DOM at a place marked with dd-html attribute.
   * Examples:
   * dd-html="product" or dd-html="product.name --inner"    - insert in the element (product is the controller property with HTML tags in the value)
   * dd-html="product.name --outer"                         - replace the element
   */
  ddHtml() {
    this._debug('ddHtml', `--------- ddHtml (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-html';
    const elems = this._listElements(attrName);
    this._debug('ddHtml', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);

      if (this._hasBlockString(base)) { continue; } // block rendering if the element contains $$

      // solve the controller property name and get the controller property value
      let prop_solved = base.replace(/^this\./, ''); // remove this. --> dd-html="this.myHTML"
      prop_solved = this._solveMustache(prop_solved); // dd-html="myHTML"
      let val = this._getControllerValue(prop_solved);

      this._debug('ddHtml', `ddHtml:: ${base} --> ${prop_solved} = "${val}"  --opts::"${opts}"`, 'navy');

      // don't render elements with undefined controller's value
      if (val === undefined || val === null) { elem.textContent = ''; continue; }

      // convert controller val to string
      val = this._val2str(val);

      // clone orig element
      const clonedElem = this._clone_define(elem, attrName);
      this._clone_insert(elem, clonedElem);

      // apply pipe option, for example: --pipe:slice(0,10).trim() (val must be a string)
      const pipeOpt = opts.find(opt => opt.includes('pipe:')); // pipe:slice(0, 3).trim()
      if (!!pipeOpt) { val = this._pipeExe(val, pipeOpt); }

      // load content in the element
      if (opts.includes('inner')) {
        clonedElem.innerHTML = val; // embed HTML in the clonedElem
      } else if (opts.includes('outer')) {
        clonedElem.outerHTML = `<span dd-html-clone>${val}</span>`; // wrap in span
      } else if (opts.includes('sibling')) {
        const docParsed = new DOMParser().parseFromString(val, 'text/html');
        const siblingElem = docParsed.body.childNodes[0];
        siblingElem.setAttribute('dd-html-clone', '');
        clonedElem.parentNode.insertBefore(siblingElem, clonedElem.nextSibling);
      } else if (opts.includes('prepend')) {
        clonedElem.innerHTML = val + ' ' + clonedElem.innerHTML; // take controller value and prepend it to element value
      } else if (opts.includes('append')) {
        clonedElem.innerHTML = clonedElem.innerHTML + ' ' + val; // take controller value and append it to element value
      } else {
        clonedElem.innerHTML = val; // inner is default
      }
    }

    this._debug('ddHtml', '--------- ddHtml (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-mustache
   *  Solve mustaches in the element's innerHTML.
   *  The mustache can contain only controller property {{this.$model.name}} or expression like {{this.id + 1}}.
   */
  ddMustache() {
    this._debug('ddMustache', `--------- ddMustache (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-mustache';
    const elems = this._listElements(attrName);
    this._debug('ddMustache', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const innerHTML = elem.innerHTML;

      if (this._hasBlockString(innerHTML)) { continue; } // block rendering if the element contains $$

      const innerHTML_solved = this._solveMustache(innerHTML);

      this._debug('ddMustache', `ddMustache:: ${innerHTML} --> ${innerHTML_solved}`, 'navy');

      // clone orig element
      const clonedElem = this._clone_define(elem, attrName);
      clonedElem.innerHTML = innerHTML_solved;
      this._clone_insert(elem, clonedElem);
    }

    this._debug('ddMustache', '--------- ddMustache (end) ------', 'navy', '#B6ECFF');
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
      const { base, opts } = this._decomposeAttribute(attrVal);

      if (this._hasBlockString(base)) { continue; } // block rendering if the element contains $$

      let val = false;
      let prop_solved = '';
      if (/\(.*\)/.test(attrVal)) {
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

      // clone orig element
      const clonedElem = this._clone_define(elem, attrName);
      val ? clonedElem.style.display = '' : clonedElem.style.display = 'none';
      this._clone_insert(elem, clonedElem);
    }

    this._debug('ddShow', '--------- ddShow (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-if="controllerProperty"  or  dd-if="(expression)"
   *  Show or hide the HTML element by setting display:none.
   *  The expression must be encolsed in round brackets.
   * Examples:
   * dd-if="myBool" ; dd-else
   * dd-if="(this.x > 5)" ; dd-elseif ="(this.x <= 5)" ; dd-else
   */
  ddIf() {
    this._debug('ddIf', `--------- ddIf (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-if';
    const elems = this._listElements(attrName);
    this._debug('ddIf', `found elements:: ${elems.length}`, 'navy');

    for (const elem of elems) {
      const siblings = this._getSiblings(elem, ['dd-if', 'dd-elseif', 'dd-else']); // get siblings of dd-if (dd-if included)

      for (const sibling of siblings) {
        const clonedElem = this._clone_define(sibling, attrName);

        // clone orig element (if sibling is dd-else)
        if (sibling.hasAttribute('dd-else')) { this._clone_insert(sibling, clonedElem); break; }

        const attrVal = sibling.getAttribute('dd-if') || sibling.getAttribute('dd-elseif') || sibling.getAttribute('dd-else');
        if (!attrVal) { console.error('No dd-if, dd-elseif nor dd-else attribute in the sibling:', sibling); break; }
        const { base } = this._decomposeAttribute(attrVal);

        if (this._hasBlockString(base)) { continue; } // block rendering if the element contains $$

        let val = false;
        let prop_solved = '';
        if (/\(.*\)/.test(attrVal)) {
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

        this._debug('ddIf', `sibling:: ${base} --> ${prop_solved} = ${val} ; attrVal:: ${attrVal}`, 'navy');

        // clone orig element (if val is truthy)
        if (val) { this._clone_insert(sibling, clonedElem); break; }
      }

    }

    this._debug('ddIf', '--------- ddIf (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-foreach="controllerProperty"
   *  Multiply element based on controllerProperty which is an array.
   * Examples:
   * dd-foreach="myArr --val,key" or dd-foreach="this.myArr --val,key"
   * dd-foreach="$model.myArr --val,key" or dd-foreach="this.$model.myArr --val,key"
   */
  ddForeach() {
    this._debug('ddForeach', `--------- ddForeach (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-foreach';
    const elems = this._listElements(attrName);

    this._debug('ddForeach', `found elements:: ${elems.length}`, 'navy');

    // reverse elems because we want to render child dd-foreach first
    const elems_reversed = [...elems].reverse();

    for (const elem of elems_reversed) {
      const attrVal = elem.getAttribute(attrName);
      const { base, opts } = this._decomposeAttribute(attrVal);

      if (this._hasBlockString(base)) { continue; } // block rendering if the element contains $$

      // solve the controller property name and get the controller property value
      let prop_solved = base.replace(/^this\./, ''); // remove this. from dd-foreach="this.names_{{this.pid}} --val,key"
      prop_solved = this._solveMustache(prop_solved); // solve mustache in the controller property name --> names_1212
      const val = this._getControllerValue(prop_solved) || [];

      this._debug('ddForeach', `ddForeach:: attrVal:: ${attrVal} ; base:: ${base}`, 'navy');
      if (this.$debugOpts.ddForeach) { console.log(` -prop_solved:: ${prop_solved} -->`, val); }

      // check if the val is array or if the val is empty array
      if (!Array.isArray(val) || (Array.isArray(val) && !val.length)) { console.error(`ddForeachError:: Controller property "${base}" is not array. val:`, val); continue; }

      // get forEach callback value and key name from opts, for example: --val1,key1 --> ['val1', 'key1']
      const [cbValName, cbKeyName] = opts[0].split(',').map(v => v.trim()); // ['val1', 'key1']


      // create wrap element in which clones will be appended one by one
      const wrapElement = document.createElement('div');
      val.forEach((arrElemVal, arrElemKey) => {
        // define cloned element
        const clonedElem = this._clone_define(elem, attrName);

        // solve double dollars in the cloned element
        let text = clonedElem.innerHTML.replace(/\n\s/g, '').trim();
        this._debug('ddForeach', `-ddForeach:: text-before:: ${text}`, 'navy');
        if (cbValName !== undefined) { text = this._solveDoubleDollar(text, cbValName, arrElemVal); } // solve $$val1
        if (cbKeyName !== undefined) { text = this._solveDoubleDollar(text, cbKeyName, arrElemKey); } // solve $$key1
        this._debug('ddForeach', `-ddForeach:: text-after:: ${text}\n `, 'navy');
        clonedElem.innerHTML = text;

        wrapElement.appendChild(clonedElem);
      });

      // clone orig element
      this._clone_insert(elem, wrapElement);

      // remove wrap element i.e. replace it with it's children
      wrapElement.replaceWith(...wrapElement.children);
    }

    this._debug('ddForeach', '--------- ddForeach (end) ------', 'navy', '#B6ECFF');
  }





}




export default Dd;
