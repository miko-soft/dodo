import navig from './navig.js';
import Cookie from './Cookie.js';
import HTTPClient from './HTTPClient.js';



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
        'content-type': 'text/html; charset=UTF-8'
      },
      responseType: '' // 'blob' for file download (https://developer.mozillfullnamea.org/en-US/docs/Web/API/XMLHttpRequest/responseType)
    };
    this.httpClient = new HTTPClient(opts);

    this.jwtToken; // JWT Token string: 'JWT ...'
    this.loggedUser = this.getLoggedUserInfo(); // the user object: {first_name, last_name, username, ...}
  }




  /******* CONTROLLER METHODS - use in the controller's constructor as app.auth() ******/
  /**
   * Send login request to the API.
   * @param {object} creds - credentials object send as body to the API, for example: {username, password}
   * @returns {Promise<any>}
   */
  async login(creds) {
    const url = this.authOpts.apiLogin;
    const answer = await this.httpClient.askJSON(url, 'POST', creds);

    if (answer.status === 200) {
      const apiResp = answer.res.content;

      this.jwtToken = apiResp.jwtToken;
      this.loggedUser = apiResp.loggedUser;

      this.cookie.put('auth_jwtToken', apiResp.jwtToken); // set cookie 'auth_jwtToken': 'JWT xyz...'
      this.cookie.putObject('auth_loggedUser', apiResp.loggedUser); // set cookie 'auth_loggedUser' and class property 'this.loggedUser': {first_name: , last_name: , ...}

      // redirect to URL
      const afterGoodLoginURL = this._correctURL(this.authOpts.afterGoodLogin, apiResp.loggedUser);
      if (!!afterGoodLoginURL) { navig.goto(afterGoodLoginURL); }

      return apiResp;

    } else {
      this.loggedUser = null;
      this.cookie.removeAll();
      const errMSg = !!answer.res.content && (answer.res.content.message || answer.res.content.msg) ? answer.res.content.message || answer.res.content.msg : 'Bad Login';
      throw new Error(errMSg);
    }

  }


  /**
   * Logout. Remove login cookie, loggedUser and change the URL.
   * @param {number} ms - time period to redirect to afterLogoutURL
   * @returns {void}
   */
  async logout(ms) {
    this.cookie.removeAll(); // delete all cookies
    this.loggedUser = undefined; // remove class property
    await new Promise(r => setTimeout(r, ms));
    const afterLogoutURL = this._correctURL(this.authOpts.afterLogout, null);
    if (!!afterLogoutURL) { navig.goto(afterLogoutURL); } // change URL
  }


  /**
   * Get logged user info from the object property (faster) or from the cookie 'auth_loggedUser' (slower)
   * @returns {object} - {first_name, last_name, ...}
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





  /******* ROUTER METHODS (use in the router as authGuards) ******/
  /**
   * Check if user is logged and if yes do auto login e.g. redirect to afterGoodLogin URL.
   * @returns {boolean}
   */
  autoLogin() {
    const loggedUser = this.getLoggedUserInfo(); // get loggedUser info after successful username:password login

    // redirect to URL
    if (!!loggedUser && !!loggedUser.username) {
      const afterGoodLoginURL = this._correctURL(this.authOpts.afterGoodLogin, loggedUser);
      if (!!afterGoodLoginURL) { navig.goto(afterGoodLoginURL); }
      console.log(`%c AuthWarn:: Autologin to ${afterGoodLoginURL} is triggered.`, `color:Maroon; background:LightYellow`);
    }
  }


  /**
   * Check if user is logged and if not redirect to afterBadLogin URL.
   * @returns {boolean}
   */
  isLogged() {
    const loggedUser = this.getLoggedUserInfo(); // get loggedUser info after successful username:password login
    const isAlreadyLogged = !!loggedUser && !!loggedUser.username;

    // redirect to afterBadLogin URL
    if (!isAlreadyLogged) {
      const afterBadLoginURL = this._correctURL(this.authOpts.afterBadLogin, loggedUser);
      if (!!afterBadLoginURL) { navig.goto(afterBadLoginURL); }
      throw new Error('AuthWarn:: This route is blocked because the user is not logged in.');
    }
  }


  /**
   * Check if user has required role: admin, customer... which corresponds to the URL.
   * For example role "admin" must have URL starts with /admin/...
   * If not redirect to /login page.
   * @returns {boolean}
   */
  hasRole() {
    const loggedUser = this.getLoggedUserInfo(); // get loggedUser info after successful username:password login

    // get current URL and check if user's role (admin, customer) is contained in it
    const currentUrl = window.location.pathname + window.location.search; // browser address bar URL: /admin/product/23

    let urlHasRole = false;
    if (!!loggedUser && !!loggedUser.role) {
      urlHasRole = currentUrl.indexOf(loggedUser.role) !== -1;
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
    let url_corrected;
    if (!!loggedUser && !!loggedUser.role) {
      url_corrected = !!url ? url.replace('{loggedUserRole}', loggedUser.role) : '';
    } else {
      url_corrected = !!url ? url : '';
    }
    return url_corrected;
  }



}



export default Auth;
