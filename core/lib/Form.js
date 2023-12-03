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
      delControl: false,
      delControls: false
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
        elem.checked = false;
        elem.removeAttribute('checked');
        if (val === elem.value) {
          elem.checked = true;
          elem.setAttribute('checked', '');
        }

      } else if (elem.type === 'select-one') { // SELECT without "multiple" attribute
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
      }
      this._debug('setControl', `${elem.type}[name="${key}"] got value="${val}"`, 'green');
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
    const keys = Object.keys(obj);
    for (const key of keys) {
      const elems = document.querySelectorAll(`[dd-form="${this.formName}"] [name^="${key}"]`);
      this._debug('setControls', `\nElems found: ${elems.length} in the form for name^="${key}".`, 'green');
      if (!elems.length) {
        this._debug('setControls', `FormWarn::setControls -> Form "${this.formName}" doesn't have control with name^="${key}" attribute.`, 'green');
        continue;
      }

      for (const elem of elems) {
        let val, attrVal;
        if (!!elem) {
          attrVal = elem.getAttribute('name'); // seller.name
          const keys = attrVal.split('.'); // ['seller', 'name']
          const key1 = keys[0]; // seller
          const key2 = keys[1]; // name
          if (key1 && !key2) { val = obj[key1]; }
          else if (key1 && key2) { val = obj[key1][key2]; }
        }

        if (!!attrVal) { this.setControl(attrVal, val); }

        if (this._debug().setControls) { console.log(`setControls:: obj-key:: ${key} , attrVal:: ${attrVal} , elem::`, elem); }
      }

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
   * Get the form controll values and return corresponding object
   * @param {string[]} keys - the value of the "name" HTML attribute
   * @param {boolean} convertType - default true
   * @returns {object}
   */
  getControls(keys, convertType = true) {
    if (!keys) { console.error('getControlsErr: Argument "keys" is not defined. It should be an array.'); }
    this._debug('getControls', '--------- getControls ------', 'green', '#A1F8DC');
    this._debug('getControls', keys, 'green');
    const obj = {};
    for (const key of keys) {
      obj[key] = this.getControl(key, convertType);
    }
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
    const elems = document.querySelectorAll(`[dd-form="${this.formName}"] [name^="${key}"]`);
    if (!elems.length) { console.error(`Form "${this.formName}" doesn't have name^="${key}" control.`); }

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
    if (!keys) { console.error('delControlsErr: The argument "keys" must be provided and it should be an array.'); }
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
    let elems = document.querySelectorAll(`[dd-form="${this.formName}"] input,select,textarea`);
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



}

export default Form;
