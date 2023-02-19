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
   * dd-text="<controllerProperty> [--prepend|append]"
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


    for (const elem of elems) {
      const attrVal = elem.getAttribute(attrName);
      const { prop, opts } = this._decomposeAttribute(attrVal);

      let prop2 = this._solveMustache(prop);
      prop2 = prop2.replace(/^this\./, '');

      const val = this._getControllerValue(prop2);
      this._debug('ddText', `ddText:: ${prop} --> ${prop2} = "${val}"  --opts::"${opts}"`, 'navy');

    }

    this._debug('ddText', '--------- ddText (end) ------', 'navy', '#B6ECFF');
  }


}


export default Dd;
