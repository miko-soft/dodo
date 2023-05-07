/**
interface BrowserStorageOpts {
  storageType: 'local'|'session'  // default is local what means localStorage
}
 */

class BrowserStorage {

  /**
   * @param {BrowserStorageOpts} browserStorageOpts - localStorage or sessionStorage options
   */
  constructor(browserStorageOpts) {
    if (!window) { throw new Error('The window is not available.'); }
    this.browserStorageOpts = browserStorageOpts;
    this.storage = browserStorageOpts.storageType === 'session' ? window.sessionStorage : window.localStorage;
  }


  /**
   * Set local or session storage.
   * The input value can be of any type and it's saved as string.
   * @param {string} name - storage name
   * @param {any} value - storage value
   */
  put(name, value) {
    if (value === undefined || value === null || value === NaN) { throw new Error(`ERR BrowserStorage::put() - The "${name}" value is undefined, null or NaN`); }
    this.storage.setItem(name, value);
  }


  /**
   * Set local or session storage.
   * The input value is object and it's saved as string.
   * @param {string} name - storage name
   * @param {object} valueObj - storage value (object)
   */
  putObject(name, valueObj) {
    if (typeof valueObj !== 'object') { throw new Error(`ERR BrowserStorage::putObject() - The "${name}" value must be object`); }
    const value = JSON.stringify(valueObj);
    this.storage.setItem(name, value);
  }


  /**
   * Get a storage value (string) by specific name. Returned value is string.
   * @param {string} name - storage name
   * @return {string}
   */
  get(name) {
    const value = this.storage.getItem(name) || undefined;
    return value;
  }


  /**
   * Get a storage value by specific name. Returned value is object.
   * @param {string} name - storage name
   * @return {object}
   */
  getObject(name) {
    const storageVal = this.storage.getItem(name);

    // convert storage string value to object
    let obj;
    try {
      if (!!storageVal) { obj = JSON.parse(storageVal); }
    } catch (err) {
      console.error(`ERR BrowserStorage::getObject() [${this.browserStorageOpts.storageType}]: Storage value has invalid JSON and can not be converted to Object. Use get() method instead getObject()`);
    }

    return obj;
  }


  /**
   * Get all storage values in array format: [{key1: val1}, {key2: val2},...] . The values (val1, val2, ...) are strings.
   * @return {object[]}
   */
  getAll() {
    const allStorages_array = [];
    for (const [key, val] of Object.entries(this.storage)) {
      allStorages_array.push({ [key]: val });
    }
    return allStorages_array;
  }


  /**
   * Get all storage values in object format: {key1: val1, key2: val2, ...}
   * @param {boolean} convertType - to convert the value types (val1, val2) or not (default is true)
   * @return {object}
   */
  getObjectAll(convertType = true) {
    const allStorages_object = {};
    for (let [prop, val] of Object.entries(this.storage)) {
      prop = prop.trim();
      if (!prop) { continue; }

      val = val.trim();
      if (convertType) { val = this._stringTypeConvert(val); }

      allStorages_object[prop] = val;
    }
    return allStorages_object;
  }


  /**
   * Remove storage by specific name.
   * @param {string} name - storage name
   */
  remove(name) {
    this.storage.removeItem(name);
  }


  /**
   * Remove all storage values.
   */
  removeAll() {
    this.storage.clear();
  }


  /**
   * Check if storage exists.
   * @param {string} name - storage name
   * @return {boolean}
   */
  exists(name) {
    const value = this.storage.getItem(name);
    return !!value;
  }


  /**
   * Convert string to correct data type.
   * @param {string} val
   * @returns {string | number | boolean | object}
   */
  _stringTypeConvert(val) {
    function isJSON(val) {
      try { JSON.parse(val); }
      catch (err) { return false; }
      return true;
    }

    if (!!val && !isNaN(val) && !/\./.test(val)) { // convert string into integer (12)
      val = parseInt(val, 10);
    } else if (!!val && !isNaN(val) && /\./.test(val)) { // convert string into float (12.35)
      val = parseFloat(val);
    } else if (val === 'true' || val === 'false') { // convert string into boolean (true)
      val = JSON.parse(val);
    } else if (isJSON(val)) {
      val = JSON.parse(val);
    }

    return val;
  }

}


export default BrowserStorage;
