import DdListeners from './DdListeners.js';


/**
 * Parse HTML elements with the "dd-" attribute (non-listeners)
 */
class Dd extends DdListeners {

  constructor() {
    super();

    this.$dd = {
      elems: {},  // set by ddElem()
      listeners: [] // collector of the dd- listeners  [{attrName, elem, handler, eventName}]
    };
  }



  /**
   * dd-text="<controllerProperty> [--overwrite|remain|prepend|append]"
   * Print pure text in the dd-text element.
   * Examples:
   * dd-text="firstName"                  - firstName is the controller property, it can also be model $model.firstname
   * dd-text="this.firstName"             - this. will not cause the error
   * dd-text="firstName --append"         - append the text to the existing text
   * dd-text="$model.product___{{id}}"    - dynamic controller property name
   *
   * @param {string} dd_id - unique dodo id which is used when $model is updated to render only elements with that dd_id
   */
  ddText(dd_id) {
    this._debug('ddText', `--------- ddText (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-text';
    const elems = this._listElements(attrName, dd_id);

    this._debug('ddText', `found elements:: ${elems.length} | dd_id:: ${dd_id}`, 'navy');

    this._genElem_purge(attrName, dd_id); // remove old dd-text-gen elements


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { prop, opts } = this._decomposeAttribute(attrVal);

      // solve the controller property name and get the controller property value
      let prop_solved = prop.replace(/^this\./, ''); // remove this. --> dd-text="this.product_{{this.pid}}"
      prop_solved = this._solveMustache(prop_solved); // dd-text="product_{{this.pid}}"
      let val = this._getControllerValue(prop_solved);

      this._debug('ddText', `ddText:: ${prop} --> ${prop_solved} = "${val}"  --opts::"${opts}"`, 'navy');

      // don't render elements with undefined controller's value
      if (val === undefined || val === null) { elem.textContent = ''; continue; }

      // convert controller val to string
      val = this._val2str(val);

      // generate element which is sibling to orig elem (elem is hidden in the template.js)
      const dd_id_found = this._origElem_dd_id(elem, attrName);
      const newElem = this._genElem_create(elem, attrName, dd_id_found);
      elem.parentNode.insertBefore(newElem, elem.nextSibling);

      // apply pipe option, for example: --pipe:slice(0,10).trim() (val must be a string)
      const pipeOpt = opts.find(opt => opt.includes('pipe:')); // pipe:slice(0, 3).trim()
      if (!!pipeOpt) { val = this._pipeExe(val, pipeOpt); }

      // load content in the element
      if (opts.includes('overwrite')) {
        newElem.textContent = val; // take controller value and replace element value
      } else if (opts.includes('remain')) {
        newElem.textContent = elem.textContent; // take element value i.e. leave it as is
      } else if (opts.includes('prepend')) {
        newElem.textContent = val + elem.textContent; // take controller value and prepend it to element value
      } else if (opts.includes('append')) {
        newElem.textContent = elem.textContent + val; // take controller value and append it to element value
      } else {
        newElem.textContent = val; // overwrite is default
      }
    }

    this._debug('ddText', '--------- ddText (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-html="<controllerProperty> [--inner|outer|sibling|prepend|append]"
   * Embed HTML node in the DOM at a place marked with dd-html attribute.
   * Examples:
   * dd-html="product" or dd-html="product.name --inner"    - insert in the element (product is the controller property with HTML tags in the value)
   * dd-html="product.name --outer"                         - replace the element
   *
   * @param {string} dd_id - unique dodo id which is used when $model is updated to render only elements with that dd_id
   */
  ddHtml(dd_id) {
    this._debug('ddHtml', `--------- ddHtml (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-html';
    const elems = this._listElements(attrName, dd_id);

    this._debug('ddHtml', `found elements:: ${elems.length} | dd_id:: ${dd_id}`, 'navy');

    this._genElem_purge(attrName, dd_id); // remove old dd-html-gen elements


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { prop, opts } = this._decomposeAttribute(attrVal);

      // solve the controller property name and get the controller property value
      let prop_solved = prop.replace(/^this\./, ''); // remove this. --> dd-html="this.myHTML"
      prop_solved = this._solveMustache(prop_solved); // dd-html="myHTML"
      let val = this._getControllerValue(prop_solved);

      this._debug('ddHtml', `ddHtml:: ${prop} --> ${prop_solved} = "${val}"  --opts::"${opts}"`, 'navy');

      // don't render elements with undefined controller's value
      if (val === undefined || val === null) { elem.textContent = ''; continue; }

      // convert controller val to string
      val = this._val2str(val);

      // generate element which is sibling to orig elem (elem is hidden in the template.js)
      const dd_id_found = this._origElem_dd_id(elem, attrName);
      const newElem = this._genElem_create(elem, attrName, dd_id_found);
      elem.parentNode.insertBefore(newElem, elem.nextSibling);

      // apply pipe option, for example: --pipe:slice(0,10).trim() (val must be a string)
      const pipeOpt = opts.find(opt => opt.includes('pipe:')); // pipe:slice(0, 3).trim()
      if (!!pipeOpt) { val = this._pipeExe(val, pipeOpt); }

      // load content in the element
      if (opts.includes('inner')) {
        newElem.innerHTML = val; // embed HTML in the newElem
      } else if (opts.includes('outer')) {
        newElem.outerHTML = val; // replace newElem with HTML defined in the controller property
      } else if (opts.includes('sibling')) {
        const docParsed = new DOMParser().parseFromString(val, 'text/html');
        const siblingElem = docParsed.body.childNodes[0];
        siblingElem.setAttribute('dd-html-gen', dd_id_found);
        newElem.parentNode.insertBefore(siblingElem, newElem.nextSibling);
      } else if (opts.includes('prepend')) {
        newElem.innerHTML = val + ' ' + newElem.innerHTML; // take controller value and prepend it to element value
      } else if (opts.includes('append')) {
        newElem.innerHTML = newElem.innerHTML + ' ' + val; // take controller value and append it to element value
      } else {
        newElem.innerHTML = val; // inner is default
      }
    }

    this._debug('ddHtml', '--------- ddHtml (end) ------', 'navy', '#B6ECFF');
  }



  /**
   * dd-mustache
   * Solve mustaches in the element's innerHTML.
   * The mustache can contain only controller property {{this.$model.name}} or expression like {{this.id + 1}}.
   */
  ddMustache() {
    this._debug('ddMustache', `--------- ddMustache (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-mustache';
    const elems = this._listElements(attrName);

    this._debug('ddMustache', `found elements:: ${elems.length}`, 'navy');

    this._genElem_purge(attrName); // remove old dd-mustache-gen elements

    for (const elem of elems) {
      const innerHTML = elem.innerHTML;
      const innerHTML_solved = this._solveMustache(innerHTML);

      this._debug('ddMustache', `ddMustache:: ${innerHTML} --> ${innerHTML_solved}`, 'navy');

      // generate element which is sibling to orig elem (elem is hidden in the template.js)
      const dd_id_found = this._origElem_dd_id(elem, attrName);
      const newElem = this._genElem_create(elem, attrName, dd_id_found);
      newElem.innerHTML = innerHTML_solved;
      elem.parentNode.insertBefore(newElem, elem.nextSibling);
    }

    this._debug('ddMustache', '--------- ddMustache (end) ------', 'navy', '#B6ECFF');
  }


}


export default Dd;
