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
   * @param {boolean} debug - show debug info
   */
  constructor(cookieOpts, debug) {
    this.cookieOpts = cookieOpts;
    this.debug = debug;
  }


  /**
   * Set cookie. Cookie value is string.
   * @param {string} name - cookie name
   * @param {string} value - cookie value (string)
   * @returns {void}
   */
  put(name, value) {
    if (!document) { throw new Error('The document is not available.'); }

    // encoding cookie value
    const valueStr = encodeURIComponent(value); // a b --> a%20b

    // name=value;
    let cookieStr = `${name}=${valueStr};`;

    // add cookie options: domain, path, expires, secure, HttpOnly, SameSite
    cookieStr = this._appendCookieOptions(cookieStr);
    document.cookie = cookieStr;

    if (this.debug) { console.log('cookie-put():cookieStr: ', cookieStr); }
  }



  /**
   * Set cookie. Cookie value is object.
   * @param {string} name - cookie name
   * @param {object} valueObj - cookie value (object)
   * @returns {void}
   */
  putObject(name, valueObj) {
    if (!document) { throw new Error('The document is not available.'); }

    // convert object to string and encode that string
    const valueStr = encodeURIComponent(JSON.stringify(valueObj)); // a b --> a%20b

    // name=value;
    let cookieStr = `${name}=${valueStr};`;

    // add cookie options: domain, path, expires, secure, HttpOnly, SameSite
    cookieStr = this._appendCookieOptions(cookieStr);
    document.cookie = cookieStr;

    if (this.debug) { console.log('cookie-putObject(): ', cookieStr); }
  }



  /**
   * Get all cookies in string format (cook1=jedan1; cook2=dva2;).
   * @returns {string} - example: cook1=jedan1; cook2=dva2;
   */
  getAll() {
    if (!document) { throw new Error('The document is not available.'); }
    const allCookies = document.cookie; // 'cook1=jedan1; cook2=dva2;'
    if (this.debug) { console.log('cookie-getAll(): ', allCookies); }
    return allCookies;
  }



  /**
   * Get a cookie by specific name. Returned value is string.
   * @param {string} name - cookie name
   * @returns {string}
   */
  get(name) {
    if (!document) { throw new Error('The document is not available.'); }

    const cookiesArr = this._toCookiesArr(); // ["authAPIInit1=jedan1", "authAPIInit2=dva2", "authAPI="]

    // extract cookie value for specific name
    let elemArr, cookieVal;
    cookiesArr.forEach(elem => {
      elemArr = elem.split('='); // ["authAPIInit1", "jedan1"]
      if (elemArr[0] === name) {
        cookieVal = elemArr[1];
      }
    });

    cookieVal = decodeURIComponent(cookieVal); // a%20b --> a b

    // debug
    if (this.debug) {
      console.log('cookie-get()-cookiesArr: ', cookiesArr);
      console.log('cookie-get()-cookieVal: ', name, '=', cookieVal);
    }

    return cookieVal;
  }



  /**
   * Get cookie by specific name. Returned value is object.
   * @param {string} name - cookie name
   * @returns {object}
   */
  getObject(name) {
    if (!document) { throw new Error('The document is not available.'); }

    const cookieVal = this.get(name); // %7B%22jen%22%3A1%2C%22dva%22%3A%22dvica%22%7D

    // convert cookie string value to object
    let cookieObj = null;
    try {
      if (cookieVal !== 'undefined' && !!cookieVal) {
        const cookieJson = decodeURIComponent(cookieVal);
        cookieObj = JSON.parse(cookieJson);
      }
    } catch (err) {
      console.error('cookie-getObject(): ', err);
    }

    // debug
    if (this.debug) {
      console.log('cookie-getObject():cookieVal: ', cookieVal);
      console.log('cookie-getObject():cookieObj: ', cookieObj);
    }

    return cookieObj;
  }



  /**
   * Remove cookie by specific name.
   * @param {string} name - cookie name
   * @returns {void}
   */
  remove(name) {
    if (!document) { throw new Error('The document is not available.'); }
    let dateOld = new Date('1970-01-01T01:00:00'); // set expires backward to delete cookie
    dateOld = dateOld.toUTCString(); // Thu, 01 Jan 1970 00:00:00 GMT
    document.cookie = `${name}=;expires=${dateOld};path=/;`;
    if (this.debug) { console.log('cookie-remove(): ', name, ' cookie is deleted.'); }
  }



  /**
   * Remove all cookies.
   * @returns {void}
   */
  removeAll() {
    if (!document) { throw new Error('The document is not available.'); }

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

    // debug
    if (this.debug) {
      console.log('cookie-removeAll():before:: ', cookiesArr);
      console.log('cookie-removeAll():after:: ', cookiesArr2);
    }
  }




  /**
   * Check if cookie exists.
   * @param {string} name - cookie name
   * @return boolean
   */
  exists(name) {
    if (!document) { throw new Error('The document is not available.'); }

    const cookiesArr = this._toCookiesArr(); // ["authAPIInit1=jedan1", "authAPIInit2=dva2", "authAPI="]

    // extract cookie value for specific name
    let elemArr, cookieExists = false;
    cookiesArr.forEach(elem => {
      elemArr = elem.split('='); // ["authAPIInit1", "jedan1"]
      if (elemArr[0] === name) {
        cookieExists = true;
      }
    });

    if (this.debug) { console.log('cookie-exists(): ', cookieExists); }

    return cookieExists;
  }



  /******* PRIVATES *******/
  /**
   * Add cookie options (domain, path, expires, secure, ...) to the cookie string.
   * @param {string} cookieStr - cookie string
   * @returns {string}
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
   * @returns {string[]}
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



}


export default Cookie;
