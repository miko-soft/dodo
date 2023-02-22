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
   * dd-text="firstName"            - firstName is the controller property, it can also be model $model.firstname
   * dd-text="firstName --append"   - append the text to the existing text
   * dd-text="product___{{id}}"     - dynamic controller property name
   *
   * @param {string} dd_id - unique dodo id which is used when $model is updated to render only elements with that dd_id
   */
  ddText(dd_id) {
    this._debug('ddText', `--------- ddText (start) ------`, 'navy', '#B6ECFF');

    const attrName = 'dd-text';
    const elems = this._listElements(attrName, dd_id);

    this._debug('ddText', `found elements:: ${elems.length} | dd_id:: ${dd_id}`, 'navy');

    // remove old dd-text-gen elements
    this._genElem_purge(attrName, dd_id);


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { prop, opts } = this._decomposeAttribute(attrVal);

      // solve the controller property name
      let prop2 = prop.replace(/^this\./, ''); // remove this. --> dd-text="this.product_{{this.pid}}"
      prop2 = this._solveMustache(prop2); // dd-text="product_{{this.pid}}"

      let val = this._getControllerValue(prop2);
      this._debug('ddText', `ddText:: ${prop} --> ${prop2} = "${val}"  --opts::"${opts}"`, 'navy');

      // don't render elements with undefined controller's value
      if (val === undefined || val === null) { elem.textContent = ''; continue; }

      // convert controller val to string
      val = this._val2str(val);

      // remove all gen elems and create new elements which are siblings to elem (which is initially hidden)
      const dd_id2 = this._origElem_dd_id(elem, attrName);
      const newElem = this._genElem_create(elem, attrName, dd_id2);
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
        newElem.textContent = val + elem.textContent; // take controller value and append it to element value
      } else if (opts.includes('append')) {
        newElem.textContent = elem.textContent + val; // take controller value and prepend it to element value
      } else {
        newElem.textContent = val; // default
      }
    }

    this._debug('ddText', '--------- ddText (end) ------', 'navy', '#B6ECFF');
  }


}


export default Dd;
