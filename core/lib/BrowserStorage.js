/**
interface BrowserStorageOpts {
  storageType: 'local'|'session'  // default is localStorage
}
 */

class BrowserStorage {

  /**
   * @param {BrowserStorageOpts} browserStorageOpts - localStorage or sessionStorage options
   * @param {boolean} debug - show debug info
   */
  constructor(browserStorageOpts, debug) {
    if (!window) { throw new Error('The "window" object is undefined. Run it in the browser environment.'); }

    this.browserStorageOpts = browserStorageOpts;
    this.debug = debug;

    if (browserStorageOpts.storageType === 'session') { this.storage = window.sessionStorage; }
    else { this.storage = window.localStorage; }
  }


  /**
   * Set local or session storage.
   * The input value can be of any type and it's saved as string.
   * @param {string} name - storage name
   * @param {any} value - storage value
   * @returns {void}
   */
  put(name, value) {
    this.storage.setItem(name, value);
    if (this.debug) { console.log(`${this.browserStorageOpts.storageType}-put(): ${name} = ${value}`); }
  }


  /**
   * Set local or session storage.
   * The input value is object and it's saved as string.
   * @param {string} name - storage name
   * @param {object} valueObj - storage value (object)
   * @returns {void}
   */
  putObject(name, valueObj) {
    const value = JSON.stringify(valueObj);
    this.storage.setItem(name, value);
    if (this.debug) { console.log(`${this.browserStorageOpts.storageType}-putObject(): ${name} = ${value.toString()}`); }
  }


  /**
   * Get all storage values and return it as array of objects.
   * @returns {array}
   */
  getAll() {
    const storageObjs = [];
    for (const [key, val] of Object.entries(this.storage)) {
      storageObjs.push({ [key]: val });
      if (this.debug) {
        (typeof val === 'object') ? console.log(`${this.browserStorageOpts.storageType}-getAll(): ${key} = ${JSON.stringify(val)}`) : console.log(`${this.browserStorageOpts.storageType}-getAll: ${key} = ${val}`);
      }
    }
    return storageObjs;
  }


  /**
   * Get a storage value by specific name. Returned value is string.
   * @param {string} name - storage name
   * @returns {string}
   */
  get(name) {
    const value = this.storage.getItem(name) || '';
    if (this.debug) { console.log(`${this.browserStorageOpts.storageType}-get(): ${name} = `, value); }
    return value;
  }


  /**
   * Get a storage value by specific name. Returned value is object.
   * @param {string} name - storage name
   * @returns {object}
   */
  getObject(name) {
    const value = this.storage.getItem(name) || '';

    // convert storage string value to object
    let valueObj = null;
    try {
      if (value !== 'undefined' && !!value) {
        valueObj = JSON.parse(value);
      }
    } catch (err) {
      console.error(`${this.browserStorageOpts.storageType}-getObject(): Storage value has invalid JSON and can not be converted to Object. Use get() method instead getObject() !`);
    }

    // debug
    if (this.debug) {
      console.log(`${this.browserStorageOpts.storageType}-getObject():value:`, value);
      console.log(`${this.browserStorageOpts.storageType}-getObject():valueObj:`, valueObj);
    }

    return valueObj;
  }


  /**
   * Remove storage by specific name.
   * @param {string} name - storage name
   * @returns {void}
   */
  remove(name) {
    this.storage.removeItem(name);
    if (this.debug) { console.log(`${this.browserStorageOpts.storageType}-remove():`, name, ' is deleted.'); }
  }


  /**
   * Remove all storage values.
   * @returns {void}
   */
  removeAll() {
    this.storage.clear();
  }


  /**
   * Check if storage exists.
   * @param {string} name - storage name
   * @return boolean
   */
  exists(name) {
    const value = this.storage.getItem(name) || '';
    return !!value;
  }

}


export default BrowserStorage;
