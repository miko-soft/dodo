import navig from './navig.js';
import Cookie from './Cookie.js';
import HTTPClient from './HTTPClient.js';
import util from './util.js';



/**
 * Authentication with the JWT token and cookie.
 */
class Auth {

  /**
   * authOpts:
   {
    apiLogin :string,       // API login URL: http://127.0.0.1:8001/users/login
    afterGoodLogin :string, // redirect after succesful login: '/{loggedUserRole}', (empty string => dont do anything, location.href => reload same URL)
    afterBadLogin :string,  // redirect after unsuccesful login: '/login', (empty string => dont do anything, location.href => reload same URL)
    afterLogout :string     // URL after logout: '/login', (empty string => dont do anything, location.href => reload same URL)
   }
   * NOTICE: If afterGoodLogin, afterBadLogin, afterLogout has falsy value then the URL will stay same i.e. location.href.
   * @param {object} authOpts - auth options
   */
  constructor(authOpts) {
    this.authOpts = authOpts;

    const cookieOpts = {
      // domain: 'localhost',
      path: '/',
      expires: 5, // number of hours or exact date
      secure: false,
      httpOnly: false,
      sameSite: 'strict' // 'strict' for GET and POST, 'lax' only for POST
    };
    this.cookie = new Cookie(cookieOpts);

    const opts = {
      encodeURI: false,
      timeout: 8000,
      retry: 3,
      retryDelay: 5500,
      maxRedirects: 3,
      headers: {
        'authorization': '',
        'accept': '*/*', // 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
        'content-type': 'text/html; charset=UTF-8' // in a request such as PUT or POST, you pass the Content-Type header to tell the server what type of data it is receiving
      },
      responseType: '' // 'blob' for file download (https://developer.mozillfullnamea.org/en-US/docs/Web/API/XMLHttpRequest/responseType)
    };
    this.httpClient = new HTTPClient(opts);

    this.jwtToken = ''; // JWT Token string: 'JWT ...'
    this.loggedUser = this.getLoggedUserInfo(); // the user object: {first_name, last_name, username, ...}
  }




  /******* CONTROLLER METHODS - use in the controller's constructor as app.auth() ******/
  /**
   * Send login request to the API.
   * @param {object} creds - credentials object send as body to the API, for example: {username, password}
   * @param {number} ms - time delay to redirect to afterGoodLogin URL
   * @returns {Promise<object>}
   */
  async login(creds, ms = 600) {
    const url = this.authOpts.apiLogin;
    const answer = await this.httpClient.askJSON(url, 'POST', creds);
    const apiResp = answer.res.content || [];

    if (answer.status === 200) {
      this.jwtToken = apiResp.jwtToken;
      this.loggedUser = apiResp.loggedUser;

      this.cookie.put('auth_jwtToken', apiResp.jwtToken); // set cookie 'auth_jwtToken': 'JWT xyz...'
      this.cookie.putObject('auth_loggedUser', apiResp.loggedUser); // set cookie 'auth_loggedUser' and class property 'this.loggedUser': {first_name: , last_name: , ...}

      // redirect to URL
      const afterGoodLoginURL = this._correctURL(this.authOpts.afterGoodLogin, apiResp.loggedUser);
      if (!!afterGoodLoginURL) { await util.sleep(ms); navig.goto(afterGoodLoginURL); }

      return apiResp;

    } else {
      this.jwtToken = '';
      this.loggedUser = null;
      this.cookie.removeAll();
      let errMsg = 'Bad Login';
      for (const [key, val] of Object.entries(apiResp)) {
        if (/msg|message/.test(key)) { errMsg = val; }
      }
      throw new Error(errMsg);
    }

  }


  /**
   * Logout. Remove login cookie, loggedUser and change the URL.
   * @param {number} ms - time delay to redirect to afterLogoutURL
   * @returns {void}
   */
  async logout(ms = 600) {
    this.jwtToken = '';
    this.loggedUser = null;
    this.cookie.removeAll(); // delete all cookies
    const afterLogoutURL = this._correctURL(this.authOpts.afterLogout, null);
    if (!!afterLogoutURL) { await util.sleep(ms); navig.goto(afterLogoutURL); } // change URL
  }


  /**
   * Get logged user info from the object property (faster) or from the cookie 'auth_loggedUser' (slower)
   * @returns {object|null|undefined} - {first_name, last_name, ...}
   */
  getLoggedUserInfo() {
    const loggedUser = this.loggedUser || this.cookie.getObject('auth_loggedUser');
    return loggedUser;
  }


  /**
   * Set logged user object.
   * @param {object} user_obj - {first_name, last_name, ...}
   * @returns {void}
   */
  setLoggedUserInfo(user_obj) {
    this.loggedUser = user_obj;
    this.cookie.putObject('auth_loggedUser', user_obj);
  }


  /**
   * Get JWT token from cookie
   * @return {string} - JWT eyJhbGciOiJIUzI1NiIsInR...
   */
  getJWTtoken() {
    const jwtToken = this.jwtToken || this.cookie.get('auth_jwtToken');
    return jwtToken;
  }





  /******* ROUTER MIDDLEWARE METHODS (authGuards option in the route definition) ******/
  /**
   * Check if the user is already logged in, and if so, perform an automatic login by redirecting to the afterGoodLogin URL.
   * @returns {boolean}
   */
  async autoLogin() {
    const loggedUser = this.getLoggedUserInfo(); // get loggedUser info after successful username:password login
    await util.sleep(40);

    // redirect to URL
    if (!!loggedUser?.username) {
      const afterGoodLoginURL = this._correctURL(this.authOpts.afterGoodLogin, loggedUser);
      if (!!afterGoodLoginURL) { navig.goto(afterGoodLoginURL); }
      throw new Error(`AuthWarn:: Autologin to ${afterGoodLoginURL} is triggered.`);
    }
  }


  /**
   * Check if the user is not logged in, and if so, redirect them to the afterBadLogin URL.
   * @returns {boolean}
   */
  async isLogged() {
    const loggedUser = this.getLoggedUserInfo(); // get loggedUser info after successful username:password login
    await util.sleep(40);

    // redirect to afterBadLogin URL
    const isAlreadyLogged = !!loggedUser;
    if (!isAlreadyLogged) {
      const afterBadLoginURL = this._correctURL(this.authOpts.afterBadLogin, loggedUser);
      if (!!afterBadLoginURL) { navig.goto(afterBadLoginURL); }
      throw new Error('AuthWarn:: This route is blocked because the user is not logged in.');
    }
  }


  /**
   * Check if the user has the required role (e.g., admin, customer) that corresponds to the accessed URL.
   * For example, a user with the admin role must access URLs that start with /admin/.
   * If the user’s role does not match the URL pattern, redirect them to the /login page.
   * @returns {boolean}
   */
  async hasRole() {
    const loggedUser = this.getLoggedUserInfo(); // get loggedUser info after successful username:password login
    await util.sleep(40);

    // get current URL and check if user's role (admin, customer) is contained in it
    const currentUrl = window.location.pathname + window.location.search; // browser address bar URL: /admin/product/23

    let urlHasRole = false;
    if (!!loggedUser?.role) {
      urlHasRole = currentUrl.includes(loggedUser.role);
    }

    if (!urlHasRole) {
      const afterBadLoginURL = this._correctURL(this.authOpts.afterBadLogin, loggedUser);
      if (!!afterBadLoginURL) { navig.goto(afterBadLoginURL); }
      throw new Error('AuthWarn:: This route is blocked because the user doesn\'t have valid role.');
    }
  }




  /**** PRIVATES ****/
  /**
   * Correct afterGoodLogin, afterBadLogin, afterLogout.
   * @param {string} url - original url: afterGoodLogin, afterBadLogin, afterLogout
   * @param {object} loggedUser - {first_name, last_name, ... role}
   * @returns
   */
  _correctURL(url, loggedUser) {
    if (!url || typeof url !== 'string') { return ''; }
    let url_corrected = url;
    if (!!loggedUser?.role && url.includes('{loggedUserRole}')) {
      url_corrected = url.replace('{loggedUserRole}', loggedUser.role);
    }
    return url_corrected;
  }



}



export default Auth;
