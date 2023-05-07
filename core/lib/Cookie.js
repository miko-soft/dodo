/**
interface CookieOpts {
  domain?: string;
  path?: string;
  expires?: number | Date; // number of hours or exact date
  secure?: boolean;
  httpOnly?: boolean;
  sameSite?: string; // 'strict' for GET and POST, 'lax' only for POST
}
 */
class Cookie {

  /**
   * @param {CookieOpts} cookieOpts - cookie options
   */
  constructor(cookieOpts) {
    if (!document) { throw new Error('The document is not available.'); }
    this.cookieOpts = cookieOpts;
  }


  /**
   * Set cookie. Cookie value is string.
   * @param {string} name - cookie name
   * @param {string} value - cookie value (string)
   */
  put(name, value) {
    if (value === '' || typeof value !== 'string') { throw new Error(`ERR Cookie::put() - The "${name}" value must be non-empty string`); }

    // encoding cookie value
    const valueStr = encodeURIComponent(value); // a b --> a%20b

    // name=value;
    let cookieStr = `${name}=${valueStr};`;

    // add cookie options: domain, path, expires, secure, HttpOnly, SameSite
    cookieStr = this._appendCookieOptions(cookieStr);
    document.cookie = cookieStr;
  }


  /**
   * Set cookie. Cookie value is object.
   * @param {string} name - cookie name
   * @param {object} valueObj - cookie value (object)
   */
  putObject(name, valueObj) {
    if (typeof valueObj !== 'object' || !Object.keys(valueObj).length) { throw new Error(`ERR Cookie::putObject() - The "${name}" value must be non-empty object`); }

    // convert object to string and encode that string
    const valueStr = encodeURIComponent(JSON.stringify(valueObj)); // a b --> a%20b

    // name=value;
    let cookieStr = `${name}=${valueStr};`;

    // add cookie options: domain, path, expires, secure, HttpOnly, SameSite
    cookieStr = this._appendCookieOptions(cookieStr);
    document.cookie = cookieStr;
  }


  /**
   * Get a cookie by specific name. Returned value is string.
   * @param {string} name - cookie name
   * @return {string}
   */
  get(name) {
    const cookiesArr = this._toCookiesArr(); // ["authAPIInit1=jedan1", "authAPIInit2=dva2", "authAPI="]

    // extract cookie value for specific name
    let elemArr, cookieVal;
    cookiesArr.forEach(elem => {
      elemArr = elem.split('='); // ["authAPIInit1", "jedan1"]
      if (elemArr[0] === name) {
        cookieVal = elemArr[1];
      }
    });

    cookieVal = !!cookieVal ? decodeURIComponent(cookieVal) : undefined; // a%20b --> a b
    return cookieVal;
  }


  /**
   * Get cookie by specific name. Returned value is object.
   * @param {string} name - cookie name
   * @return {object}
   */
  getObject(name) {
    const cookieVal = this.get(name); // %7B%22jen%22%3A1%2C%22dva%22%3A%22dvica%22%7D

    // convert cookie string value to object
    let obj;
    try {
      if (!!cookieVal) { obj = JSON.parse(cookieVal); }
    } catch (err) {
      console.error('ERR Cookie::getObject(): Cookie value has invalid JSON and can not be converted to Object. Use get() method instead getObject()');
    }

    return obj;
  }


  /**
   *  Get all cookies in array format: [{key1: val1}, {key2: val2},...] . The values (val1, val2, ...) are strings.
   * @return {object[]}
   */
  getAll() {
    const allCookies_string = document.cookie; // 'cook1=jedan1; cook2=dva2;'
    const allCookies_arr = allCookies_string.split(';').filter(c => !!c);

    const allCookies_array = allCookies_arr.map(c => {
      const c_splited = c.split('=');

      let prop = c_splited[0] || '';
      prop = prop.trim();
      if (!prop) { return; }

      let val = c_splited[1] || '';
      val = val.trim();
      val = !!val ? decodeURIComponent(val) : undefined; // a%20b --> a b

      return { [prop]: val };
    });

    return allCookies_array;
  }


  /**
   * Get all cookies in object format: {key1: val1, key2: val2, ...}
   * @param {boolean} convertType - to convert the value types (val1, val2) or not (default is true)
   * @return {object}
   */
  getObjectAll(convertType = true) {
    const allCookies_string = document.cookie; // 'cook1=jedan1; cook2=dva2;'
    const allCookies_arr = allCookies_string.split(';').filter(c => !!c);

    const allCookies_object = {};
    allCookies_arr.forEach(c => {
      const c_splited = c.split('=');

      let prop = c_splited[0] || '';
      prop = prop.trim();
      if (!prop) { return; }

      let val = c_splited[1] || '';
      val = val.trim();
      val = !!val ? decodeURIComponent(val) : undefined; // a%20b --> a b
      if (convertType) { val = this._stringTypeConvert(val); }

      allCookies_object[prop] = val;
    });

    return allCookies_object;
  }


  /**
   * Remove cookie by specific name.
   * @param {string} name - cookie name
   */
  remove(name) {
    let dateOld = new Date('1970-01-01T01:00:00'); // set expires backward to delete cookie
    dateOld = dateOld.toUTCString(); // Thu, 01 Jan 1970 00:00:00 GMT
    document.cookie = `${name}=;expires=${dateOld};path=/;`;
  }


  /**
   * Remove all cookies.
   */
  removeAll() {
    // set expires backward to delete cookie
    let dateOld = new Date('1970-01-01T01:00:00'); // set expires backward to delete cookie
    dateOld = dateOld.toUTCString(); // Thu, 01 Jan 1970 00:00:00 GMT

    // get cookies array
    const cookiesArr = this._toCookiesArr(); // ["authAPIInit1=jedan1", "authAPIInit2=dva2", "authAPI="]

    // extract cookie value for specific name
    let elemArr;
    const cookiesArr2 = [];
    cookiesArr.forEach(elem => {
      elemArr = elem.split('='); // ["authAPIInit1", "jedan1"]
      document.cookie = `${elemArr[0]}=;expires=${dateOld};path=/;`;
      cookiesArr2.push(document.cookie);
    });
  }


  /**
   * Check if cookie exists.
   * @param {string} name - cookie name
   * @return {boolean}
   */
  exists(name) {
    const cookiesArr = this._toCookiesArr(); // ["authAPIInit1=jedan1", "authAPIInit2=dva2", "authAPI="]

    // extract cookie value for specific name
    let elemArr, cookieExists = false;
    cookiesArr.forEach(elem => {
      elemArr = elem.split('='); // ["authAPIInit1", "jedan1"]
      if (elemArr[0] === name) { cookieExists = true; }
    });

    return cookieExists;
  }



  /******* PRIVATES *******/
  /**
   * Add cookie options (domain, path, expires, secure, ...) to the cookie string.
   * @param {string} cookieStr - cookie string
   * @return {string}
   */
  _appendCookieOptions(cookieStr) {
    if (!this.cookieOpts) {
      return cookieStr;
    }

    // domain=example.com;
    if (!!this.cookieOpts.domain) {
      const cDomain = `domain=${this.cookieOpts.domain};`;
      cookieStr += cDomain;
    }

    // path=/;
    if (!!this.cookieOpts.path) {
      const cPath = `path=${this.cookieOpts.path};`;
      cookieStr += cPath;
    }

    // expires=Fri, 3 Aug 2001 20:47:11 UTC;
    if (!!this.cookieOpts.expires) {
      let expires;
      if (typeof this.cookieOpts.expires === 'number') {
        const d = new Date();
        d.setTime(d.getTime() + (this.cookieOpts.expires * 60 * 60 * 1000));
        expires = d.toUTCString();
      } else {
        expires = this.cookieOpts.expires.toUTCString();
      }
      const cExpires = `expires=${expires};`;

      cookieStr += cExpires;
    }

    // secure;
    if (!!this.cookieOpts.secure) {
      const cSecure = 'secure;';
      cookieStr += cSecure;
    }

    // HttpOnly;
    if (!!this.cookieOpts.httpOnly) {
      const cHttpOnly = 'HttpOnly;';
      cookieStr += cHttpOnly;
    }

    // SameSite=lax; or SameSite=strict;
    if (!!this.cookieOpts.sameSite) {
      const cSameSite = `SameSite=${this.cookieOpts.sameSite};`;
      cookieStr += cSameSite;
    }

    return cookieStr;
  }



  /**
   * Get all cookies from document.cookie and convert it in the array format.
   * authAPIInit1=jedan1; authAPIInit2=dva2; authAPI=  --> ["authAPIInit1=jedan1", "authAPIInit2=dva2", "authAPI="]
   * @return {string[]}
   */
  _toCookiesArr() {
    // fetch all cookies
    const allCookies = document.cookie; // authAPIInit1=jedan1; authAPIInit2=dva2; authAPI=

    // create cookie array
    const cookiesArr = allCookies.split(';'); // ["authAPIInit1=jedan1", " authAPIInit2=dva2", " authAPI="]

    // remove empty spaces from left and right side
    const cookiesArrMapped = cookiesArr.map(cookiesPair => { // cookiesPair: " authAPIInit2=dva2"
      return cookiesPair.trim();
    });

    return cookiesArrMapped; // ["authAPIInit1=jedan1", "authAPIInit2=dva2", "authAPI="]
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


export default Cookie;
