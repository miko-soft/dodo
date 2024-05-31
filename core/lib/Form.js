/**
 * HTML Form Library based on the W3C Standard https://html.spec.whatwg.org/multipage/forms.html
 */
class Form {

  constructor(formName) {
    this.formName = formName;
    this.debugOptions = {
      setControl: false,
      setControls: false,
      getControl: false,
      getControls: false,
      getAllControls: false,
      delControl: false,
      delControls: false,
      delAllControls: false
    };
  }


  /**
   * Set the form control value.
   * @param {string} key - the value of the "name" HTML attribute
   * @param {any|string[]} val - the value
   * @returns {void}
   */
  setControl(key, val) {
    this._debug('setControl', `--------- setControl(${key}=${val}) ------`, 'green', '#A1F8DC');
    const elems = document.querySelectorAll(`[dd-form="${this.formName}"] [name="${key}"]`);
    if (!elems.length) { console.log(`%c FormWarn:: Form "${this.formName}" doesn't have control with name="${key}" attribute.`, `color:Maroon; background:LightYellow`); return; }
    for (const elem of elems) {
      if (elem.type === 'text') { // INPUT[type="text"]
        if (typeof val === 'object') { val = JSON.stringify(val); }
        elem.value = val;
        elem.setAttribute('value', val);

      } else if (elem.type === 'hidden') { // INPUT[type="hidden"]
        if (typeof val === 'object') { val = JSON.stringify(val); }
        elem.value = val;
        elem.defaultValue = val;

      } else if (elem.type === 'number') { // INPUT[type="number"]
        if (val === '') { val = 0; }
        else if (typeof val === 'string') { val = +val; }
        elem.value = val;
        elem.setAttribute('value', val);

      } else if (elem.type === 'checkbox') { // CHECKBOX
        elem.checked = false;
        elem.removeAttribute('checked');
        if (typeof val !== 'boolean' && val && val.includes(elem.value)) {
          elem.checked = true;
          elem.setAttribute('checked', '');
        } else if (typeof val === 'boolean') {
          elem.checked = val;
          val && elem.setAttribute('checked', '');
        }

      } else if (elem.type === 'radio') { // RADIO
        val = this._convertToString(val);
        elem.checked = false;
        elem.removeAttribute('checked');
        if (val === elem.value) {
          elem.checked = true;
          elem.setAttribute('checked', '');
        }

      } else if (elem.type === 'select-one') { // SELECT without "multiple" attribute
        val = this._convertToString(val);
        const options = elem.options;
        for (const option of options) {
          option.selected = false;
          option.removeAttribute('selected');
          if (val === option.value) {
            option.selected = true;
            option.setAttribute('selected', '');
          }
        }

      } else if (elem.type === 'select-multiple') { // on SELECT with "multiple", for example <select name="family" size="4" multiple>
        if (!Array.isArray(val)) { console.error(`The select-multiple element requires array value: ${elem.outerHTML}`); return; }
        val = val.map(v => this._convertToString(v));
        const options = elem.options; // all options
        for (const option of options) {
          option.selected = false;
          option.removeAttribute('selected');
          if (val && val.includes(option.value)) {  // val is array
            option.selected = true;
            option.setAttribute('selected', '');
          }
        }

      } else if (elem.type === 'textarea') { // TEXTAREA
        if (typeof val === 'object') { val = JSON.stringify(val, null, 2); }
        elem.value = val;

      } else { // ALL OTHER: select-one
        elem.value = val;
        elem.setAttribute('value', val);
      }
      this._debug('setControl', `${elem.type}[name="${key}"] got value "${val}"`, 'green');
    }

  }



  /**
   * Set the multiple form controls with one object.
   * @param {object} obj - the object which represent the object values, for example: {name:'John Doe', age:23, employed:true}
   * @returns {void}
   */
  setControls(obj) {
    this._debug('setControls', '--------- setControls ------', 'green', '#88DBC0');
    if (!obj) { return; }

    const obj_flat = this._flattenObject(obj);

    for (const [attrVal, val] of Object.entries(obj_flat)) {
      const elem = document.querySelector(`[dd-form="${this.formName}"] [name="${attrVal}"]`); // key: 'user.company.name'
      if (!elem) { continue; }
      this.setControl(attrVal, val);
      this._debug('setControls', `\n[dd-form="${this.formName}"] ${elem.type}[name="${attrVal}"] got value "${val}"`, 'green');
    }

  }



  /**
   * Get the form control value.
   * @param {string} key - the value of the "name" HTML attribute, for example in name="pets" the key is 'pets'
   * @param {boolean} convertType - convert data type, for example "5" -> 5 , default is true
   * @returns {string|number}
   */
  getControl(key, convertType = true) {
    this._debug('getControl', '--------- getControl ------', 'green', '#A1F8DC');
    const elems = document.querySelectorAll(`[dd-form="${this.formName}"] [name="${key}"]`);
    if (!elems.length) { console.error(`Form "${this.formName}" doesn't have name="${key}" control.`); }

    let val;
    const valArr = [];
    let i = 1;
    for (const elem of elems) {
      if (elem.type === 'checkbox') {
        let v = elem.value;
        if (convertType) { v = this._stringTypeConvert(elem.value); }
        if (elem.checked) { valArr.push(v); val = valArr; }
        if (i === elems.length && !val) { val = []; }

      } else if (elem.type === 'select-multiple') {
        const opts = elem.selectedOptions; // selected options
        for (const opt of opts) {
          let v = opt.value;
          if (convertType) { v = this._stringTypeConvert(opt.value); }
          valArr.push(v);
          val = valArr;
        }
        if (i === elems.length && !val) { val = []; }

      } else if (elem.type === 'radio') {
        let v = elem.value;
        if (convertType) { v = this._stringTypeConvert(elem.value); }
        if (elem.checked) { val = v; }

      } else if (elem.type === 'number') {
        val = elem.valueAsNumber;

      } else if (elem.type === 'password') {
        val = elem.value;

      } else if (elem.type === 'file' && elem.multiple) {
        val = elem.files;

      } else if (elem.type === 'file') {
        val = elem.files[0];

      } else {
        let v = elem.value;
        if (convertType) { v = this._stringTypeConvert(elem.value); }
        val = v;
      }
      i++;
    }

    this._debug('getControl', `${key} = ${val}`, 'green');
    return val;
  }


  /**
   * Get the form control values and return corresponding object
   * @param {string[]} keys - the value of the "name" HTML attribute
   * @param {boolean} convertType - default true
   * @returns {object}
   */
  getControls(keys, convertType = true) {
    if (!keys) { console.error('getControlsErr: Argument "keys" is not defined.'); return; }
    if (!Array.isArray(keys)) { console.error('getControlsErr: Argument "keys" should be an array.'); return; }
    this._debug('getControls', '--------- getControls ------', 'green', '#A1F8DC');
    this._debug('getControls', keys, 'green');

    const obj_flat = {};
    for (const key of keys) {
      const val = this.getControl(key, convertType);
      obj_flat[key] = val;
    }

    const obj = this._unflattenObject(obj_flat);
    return obj;
  }


  /**
   * Get all form control values and return corresponding object
   * @param {boolean} convertType - default true
   * @returns {object}
   */
  getAllControls(convertType = true) {
    let elems = document.querySelectorAll(`[dd-form="${this.formName}"] input,[dd-form="${this.formName}"] select,[dd-form="${this.formName}"] textarea`);
    if (!elems) { return; }
    elems = Array.from(elems);
    const keys = elems
      .map(elem => elem.getAttribute('name'))
      .filter(elem => !!elem); // filter null values (elements with no name attribute)
    this._debug('getAllControls', '--------- getAllControls ------', 'green', '#A1F8DC');
    this._debug('getAllControls', keys, 'green');
    const obj = this.getControls(keys, convertType);
    return obj;
  }


  /**
   * Empty the form control value.
   * @param {string} key - the value of the "name" HTML attribute
   * @returns {void}
   */
  delControl(key) {
    this._debug('delControl', '--------- delControl ------', 'green', '#A1F8DC');
    this._debug('delControl', key, 'green');
    const elems = document.querySelectorAll(`[dd-form="${this.formName}"] [name="${key}"]`);
    if (!elems.length) { console.error(`Form "${this.formName}" doesn't have name="${key}" control.`); return; }

    for (const elem of elems) {
      if (elem.type === 'checkbox' || elem.type === 'radio') {
        elem.checked = false;
        elem.removeAttribute('checked');

      } else if (elem.type === 'select-one' || elem.type === 'select-multiple') {
        const options = elem; // all options
        for (const option of options) {
          option.selected = false;
          option.removeAttribute('selected');
        }
        elem.value = '';

      } else {
        elem.value = '';

      }
    }
  }


  /**
   * Empty the form control values.
   * @param {string[]} keys - the value of the "name" HTML attribute
   * @returns {void}
   */
  delControls(keys) {
    if (!keys) { console.error('delControlsErr: Argument "keys" is not defined.'); return; }
    if (!Array.isArray(keys)) { console.error('delControlsErr: Argument "keys" should be an array.'); return; }
    this._debug('delControls', '--------- delControls ------', 'green', '#A1F8DC');
    this._debug('delControls', keys, 'green');
    for (const key of keys) {
      this.delControl(key);
    }
  }


  /**
   * Empty all form control values.
   * @returns {void}
   */
  delAllControls() {
    let elems = document.querySelectorAll(`[dd-form="${this.formName}"] input,[dd-form="${this.formName}"] select,[dd-form="${this.formName}"] textarea`);
    if (!elems) { return; }
    elems = Array.from(elems);
    const keys = elems
      .map(elem => elem.getAttribute('name'))
      .filter(elem => !!elem); // filter null values (elements with no name attribute)
    this._debug('delAllControls', '--------- delAllControls ------', 'green', '#A1F8DC');
    this._debug('delAllControls', keys, 'green');
    for (const key of keys) {
      this.delControl(key);
    }
  }


  /**
   * Convert string into integer, float or boolean.
   * @param {string} value
   * @returns {string | number | boolean | object}
   */
  _stringTypeConvert(value) {
    function isJSON(str) {
      try { JSON.parse(str); }
      catch (err) { return false; }
      return true;
    }

    if (!!value && !isNaN(value) && !/\./.test(value)) { // convert string into integer (12)
      value = parseInt(value, 10);
    } else if (!!value && !isNaN(value) && /\./.test(value)) { // convert string into float (12.35)
      value = parseFloat(value);
    } else if (value === 'true' || value === 'false') { // convert string into boolean (true)
      value = JSON.parse(value);
    } else if (isJSON(value)) {
      value = JSON.parse(value);
    }

    return value;
  }


  _debug(tip, text, color, background) {
    if (this.debugOptions[tip]) { console.log(`%c ${text}`, `color: ${color}; background: ${background}`); }
    return this.debugOptions;
  }


  /**
   * Convert a nested JavaScript object into an array of key-value pairs with flattened keys
   * Example:
   * {
   *   a: 1,
   *   b: {
   *     c: 3,
   *     d: {
   *       e: 4,
   *       f: 5
   *     }
   *   }
   * }
   * converts to:
   * {
   *   'a': 1,
   *   'b.c': 3,
   *   'b.d.e': 4,
   *   'b.d.f': 5
   * }
   *
   * @param {object} obj - The object to be flattened.
   * @param {string} parentKey - A string that keeps track of the current nested path (default is an empty string).
   * @param {object} obj_flat - An object that accumulates the flattened key-value pairs (default is an empty object).
   * @returns {object}
   */
  _flattenObject(obj, parentKey = '', obj_flat = {}) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = parentKey ? `${parentKey}.${key}` : key;
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          this._flattenObject(obj[key], newKey, obj_flat);
        } else {
          obj_flat[newKey] = obj[key];
        }
      }
    }
    return obj_flat;
  }



  /**
   * Convert a flattened object with dot-separated keys back into a nested JavaScript object.
   * @param {object} obj_flat - flattened object
   * @returns {object}
   */
  _unflattenObject(obj_flat) {
    const obj = {};
    for (const key in obj_flat) {
      if (obj_flat.hasOwnProperty(key)) {
        const keys = key.split('.');
        keys.reduce((acc, part, index) => {
          if (index === keys.length - 1) {
            acc[part] = obj_flat[key];
          } else {
            acc[part] = acc[part] || {};
          }
          return acc[part];
        }, obj);
      }
    }

    return obj;
  }



  /**
   * Convert any data type to string
   * @param {any} val
   * @returns {string}
   */
  _convertToString(val) {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'boolean') return val.toString();
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'bigint') return val.toString();
    if (typeof val === 'string') return val;
    if (typeof val === 'symbol') return val.toString();
    if (typeof val === 'function') return val.toString();
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch (e) {
        return val.toString();
      }
    }
    return val.toString();
  }



}

export default Form;
