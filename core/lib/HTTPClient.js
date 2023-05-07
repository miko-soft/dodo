class HTTPClient {

  /**
   * @param {Object} opts - HTTP Client options {encodeURI, timeout, responseType, retry, retryDelay, maxRedirects, headers}
   */
  constructor(opts) {
    this.url;
    this.protocol = 'http:';
    this.hostname = '';
    this.port = 80;
    this.pathname = '/';
    this.queryString = '';

    if (!opts) {
      this.opts = {
        encodeURI: false,
        timeout: 8000,
        responseType: '', // 'blob' for file download (https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType)
        retry: 3,
        retryDelay: 5500,
        maxRedirects: 3,
        headers: {
          'authorization': '',
          'accept': '*/*', // 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
          'content-type': 'text/html; charset=UTF-8'
        }
      };
    } else {
      this.opts = opts;
    }

    // initial values for timeout, responseType and req_headers
    this.timeout = this.opts.timeout;
    this.responseType = this.opts.responseType;
    this.req_headers = { ...this.opts.headers };

    // init the xhr
    this.xhr = new XMLHttpRequest();

    // set interceptor
    this.interceptor;
  }




  /********** REQUESTS *********/

  /**
   * Sending one HTTP request to HTTP server.
   *  - 301 redirections are not handled.
   *  - retries are not handled
   * @param {string} url - https://www.example.com/something?q=15
   * @param {string} method - GET, POST, PUT, DELETE, PATCH
   * @param {any} body_obj - http body payload
   * @returns {Promise<answer>}
   */
  async askOnce(url, method = 'GET', body_obj) {

    // answer (response object)
    const answer = {
      requestURL: url,
      requestMethod: method,
      status: 0,
      statusMessage: '',
      https: false,
      req: {
        headers: this.req_headers,
        payload: undefined
      },
      res: {
        headers: undefined,
        content: undefined
      },
      time: {
        req: this._getTime(),
        res: undefined,
        duration: undefined
      }
    };


    // check and correct URL
    try {
      url = this._parseUrl(url);
      answer.requestURL = url;
      answer.https = /^https/.test(this.protocol);
    } catch (err) {
      // if URL is not properly defined
      const ans = { ...answer }; // clone object to prevent overwrite of object properies once promise is resolved
      ans.status = 400; // client error - Bad Request
      ans.statusMessage = err.message || 'Bad Request';
      ans.time.res = this._getTime();
      ans.time.duration = this._getTimeDiff(ans.time.req, ans.time.res);

      return ans; // send answer and stop further execution
    }

    /*** 0) intercept the request ***/
    if (!!this.interceptor) { await this.interceptor(); }


    /*** 1) init HTTP request ***/
    // https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/open
    this.xhr.open(method, url, true, null, null);


    // set the xhr options (works only after the xhr is opened)
    this._xhr_timeout(this.timeout);
    this._xhr_responseType(this.responseType);
    this._xhr_requestHeaders(this.req_headers);


    /*** 2) add body to HTTP request ***/
    if (!!body_obj && !/GET/i.test(method)) {
      answer.req.payload = body_obj;

      const contentType = this.req_headers['content-type'] || '';
      let body2send;
      if (/application\/json/.test(contentType)) { body2send = JSON.stringify(body_obj); }
      else { body2send = body_obj; }

      /*** 3) send request to server (with body) ***/
      this.xhr.send(body2send);

    } else {
      /*** 3) send request to server (without body) ***/
      this.xhr.send();
    }



    /** 4) wait for response */
    const promise = new Promise((resolve, reject) => {

      this.xhr.onload = res => {
        // format answer
        const ans = { ...answer }; // clone object to prevent overwrite of object properies once promise is resolved
        ans.status = this.xhr.status; // 2xx -ok response, 4xx -client error (bad request), 5xx -server error
        ans.statusMessage = this.xhr.statusText;
        ans.res.headers = this.getResHeaders();
        ans.res.content = res.target.response;
        ans.time.res = this._getTime();
        ans.time.duration = this._getTimeDiff(ans.time.req, ans.time.res);

        resolve(ans);
      };


      this.xhr.onerror = error => {
        this.kill();
        const err = this._formatError(error, url);

        // format answer
        const ans = { ...answer }; // clone object to prevent overwrite of object properies once promise is resolved
        ans.status = err.status;
        ans.statusMessage = err.message;
        ans.time.res = this._getTime();
        ans.time.duration = this._getTimeDiff(ans.time.req, ans.time.res);

        // do not resolve if it's already resolved by timeout
        resolve(ans);
      };


      this.xhr.ontimeout = () => {
        this.kill();

        // format answer
        const ans = { ...answer }; // clone object to prevent overwrite of object properies once promise is resolved
        ans.status = 408; // 408 - timeout
        ans.statusMessage = `Request aborted due to timeout (${this.opts.timeout} ms) ${url} `;
        ans.time.res = this._getTime();
        ans.time.duration = this._getTimeDiff(ans.time.req, ans.time.res);

        resolve(ans);
      };

    });

    return promise;
  }



  /**
   * Sending HTTP request to HTTP server.
   *  - 301 redirections are handled.
   *  - retries are handled
   * @param {String} url - https://www.example.com/contact
   * @param {String} method - GET, POST, PUT, DELETE, PATCH
   * @param {Object} body_obj - http body
   * @returns {Promise<answer>}
   */
  async ask(url, method = 'GET', body_obj) {

    let answer = await this.askOnce(url, method, body_obj);
    const answers = [answer];


    /*** a) HANDLE 3XX REDIRECTS */
    let redirectCounter = 1;

    while (!!answer && /^3\d{2}/.test(answer.status) && redirectCounter <= this.opts.maxRedirects) { // 300, 301, 302, ...

      const url_new = new URL(url, answer.res.headers.location); // redirected URL is in 'location' header
      console.log(`#${redirectCounter} redirection ${answer.status} from ${this.url} to ${url_new}`);

      answer = await this.askOnce(url_new, method, body_obj); // repeat request with new url
      answers.push(answer);

      redirectCounter++;
    }


    /*** b) HANDLE RETRIES when status = 408 timeout */
    let retryCounter = 1;

    while (answer.status === 408 && retryCounter <= this.opts.retry) {
      console.log(`#${retryCounter} retry due to timeout (${this.opts.timeout}) on ${url}`);
      await new Promise(resolve => setTimeout(resolve, this.opts.retryDelay)); // delay before retrial

      answer = await this.askOnce(url, method, body_obj);
      answers.push(answer);

      retryCounter++;
    }


    return answers;
  }



  /**
   * Fetch the JSON. Redirections and retries are not handled.
   * @param {string} url - https://api.example.com/someurl
   * @param {string} method - GET, POST, PUT, DELETE, PATCH
   * @param {object|string} body - http body as Object or String type
   * @returns {Promise<answer>}
   */
  async askJSON(url, method = 'GET', body) {

    // convert body string to object
    let body_obj = body;
    if (!!body && typeof body === 'string') {
      try {
        body_obj = JSON.parse(body);
      } catch (err) {
        throw new Error('Body string is not valid JSON.');
      }
    }

    // JSON request headers
    this.setReqHeaders({
      'content-type': 'application/json; charset=utf-8',
      'accept': 'application/json'
    });

    const answer = await this.askOnce(url, method, body_obj);

    // convert content string to object
    if (!!answer.res.content) {
      try {
        answer.res.content = JSON.parse(answer.res.content);
      } catch (err) {
        throw new Error('Response content is not valid JSON.');
      }
    }

    return answer;
  }



  /**
   * Get the HTML file content or part of it filtered by the css selector.
   * NOTE: The answer.res.content contains a list of nodes and the HTML string  {Node[], string}.
   * @param {string} url - http://example.com/page.html
   * @returns {Promise<answer>}
   */
  async askHTML(url) {
    this.setReqHeaders({
      'content-type': 'text/html',
      'accept': 'text/html'
    });
    const answer = await this.askOnce(url, 'GET');
    return answer;
  }



  /**
   * Get the content of the Javascript file.
   * @param {string} url - https://api.example.com/some.js
   * @returns {Promise<answer>}
   */
  async askJS(url) {
    this.setReqHeaders({
      'content-type': 'application/javascript; charset=utf-8',
      'accept': 'application/javascript'
    });
    const answer = await this.askOnce(url, 'GET');
    return answer;
  }



  /**
   * Send POST request where body is new FormData() object.
   * For example (frontend code):
   * // create from data
   * const formData = new FormData();
   * formData.append('db_id', db_id);
   * formData.append('coll_name', coll_name);
   * formData.append('csv_file', csv_file);
   * @param {string} url - https://api.example.com/someurl
   * @param {FormData} formData - the FormData instance
   * @returns {Promise<answer>}
   */
  async sendFormData(url, formData) {
    // content-type should be removed for multipart/form-data as defined at https://fetch.spec.whatwg.org/#typedefdef-xmlhttprequestbodyinit
    this.setReqHeaders({
      'content-type': `multipart/form-data`,
      'accept': '*/*'
    });
    this.delReqHeaders(['content-type']);

    const answer = await this.askOnce(url, 'POST', formData);

    // convert content string to object
    if (!!answer.res.content) {
      try {
        answer.res.content = JSON.parse(answer.res.content);
      } catch (err) {
        console.log('WARNING: Response content is not JSON.');
      }
    }

    return answer;
  }


  /**
   * Convert JS Object to FormData and prepare it for sendFormData()
   * @param {object} formObj - object which needs to be converted
   * @returns {FormData}
   */
  object2formdata(formObj) {
    const formData = new FormData();
    for (const [key, val] of Object.entries(formObj)) { formData.set(key, val); }
    return formData;
  }



  /** TODO
   * Send HTML Form fields. Custom boundary for multipart/form-data .
   * @param {string} url - https://api.example.com/someurl
   * @param {FormData} formData - the FormData instance
   * @param {string} contentType - request header content-type value, which can be application/x-www-form-urlencoded or multipart/form-data (for files) or text/plain (Forms with mailto:)
   * @returns {Promise<answer>}
   */
  async sendForm(url, formData, contentType = 'application/x-www-form-urlencoded') {
    // define boundary
    let boundary = 'DoDoWebHttpClient';
    boundary += Math.floor(Math.random() * 32768);
    boundary += Math.floor(Math.random() * 32768);
    boundary += Math.floor(Math.random() * 32768);
    console.log('boundary::', boundary);

    const body = `--${boundary}\r\nContent-Disposition: form-data; name="db_id"\r\n\r\n12345\r\n--${boundary}--`;
    console.log('body::', body);

    const answer = await this.askOnce(url, 'POST', formData);
    return answer;
  }



  /**
   * Stop the sent request.
   * @returns {void}
   */
  kill() {
    this.xhr.abort();
  }


  /**
   * Set the interceptor function which will be executed every time before the HTTP request is sent.
   * @param {Function} interceptor - callback function, for example (httpClient) => { httpClient.setReqHeader('Authorization', 'JWT aswas); }
   * @returns {void}
   */
  setInterceptor(interceptor) {
    this.interceptor = interceptor.bind(this);
  }





  /********** HEADERS *********/

  /**
   * Change request header object. The headerObj will be appended to previously defined this.req_headers and headers with the same name will be overwritten.
   * @param {Object} headerObj - {'authorization', 'user-agent', accept, 'cache-control', 'host', 'accept-encoding', 'connection'}
   * @returns {void}
   */
  setReqHeaders(headerObj) {
    Object.keys(headerObj).forEach(prop => {
      const headerName = prop;
      const headerValue = headerObj[prop];
      this.setReqHeader(headerName, headerValue);
    });
  }

  /**
   * Set (add/update) request header.
   * Previously defined header will be overwritten.
   * @param {String} headerName - 'content-type'
   * @param {String} headerValue - 'text/html; charset=UTF-8'
   * @returns {void}
   */
  setReqHeader(headerName, headerValue) {
    headerName = headerName.toLowerCase();
    this.req_headers[headerName] = headerValue;
  }

  /**
   * Delete multiple request headers.
   * @param {Array} headerNames - array of header names, for example: ['content-type', 'accept']
   * @returns {void}
   */
  delReqHeaders(headerNames) {
    headerNames.forEach(headerName => {
      delete this.req_headers[headerName];
    });
  }

  /**
   * Get request headers
   * @returns {object}
   */
  getReqHeaders() {
    return this.req_headers;
  }


  /**
   * Get response HTTP headers.
   * @returns {object}
   */
  getResHeaders() {
    const headersStr = this.xhr.getAllResponseHeaders();
    const headersArr = headersStr.split('\n');
    const headersObj = {};
    headersArr.forEach(headerFull => {
      const splited = headerFull.split(':');
      const prop = splited[0];
      if (prop) {
        const val = splited[1].trim();
        headersObj[prop] = val;
      }
    });
    return headersObj;
  }




  /********** PRIVATES *********/

  /**
   * Parse url.
   * @param {String} url - http://www.adsuu.com/some/thing.php?x=2&y=3
   */
  _parseUrl(url) {
    url = this._correctUrl(url);
    const urlObj = new URL(url);
    this.url = url;
    this.protocol = urlObj.protocol;
    this.hostname = urlObj.hostname;
    this.port = urlObj.port;
    this.pathname = urlObj.pathname;
    this.queryString = urlObj.search;

    // debug
    /*
    console.log('this.url:: ', this.url); // http://localhost:8001/www/products?category=databases
    console.log('this.protocol:: ', this.protocol); // http:
    console.log('this.hostname:: ', this.hostname); // localhost
    console.log('this.port:: ', this.port); // 8001
    console.log('this.pathname:: ', this.pathname); // /www/products
    console.log('this.queryString:: ', this.queryString); // ?category=databases
    */

    return url;
  }


  /**
   * URL corrections
   */
  _correctUrl(url) {
    if (!url) { throw new Error('URL is not defined'); }

    // 1. trim from left and right
    url = url.trim();

    // 2. add protocol
    if (!/^https?:\/\//.test(url)) {
      url = 'http://' + url;
    }

    // 3. remove multiple empty spaces and insert %20
    if (this.opts.encodeURI) {
      url = encodeURI(url);
    } else {
      url = url.replace(/\s+/g, ' ');
      url = url.replace(/ /g, '%20');
    }

    return url;
  }


  /**
   * Beautify error messages.
   * @param {Error} error - original error
   * @return formatted error
   */
  _formatError(error, url) {
    // console.log('_formatError::', error, url);
    const err = new Error(error);


    // reformatting NodeJS errors
    if (error.target.status === 0) {
      err.status = 0;
      err.message = `Status:0 Bad Request ${url}`;
    } else {
      err.status = error.status || 400;
      err.message = error.message;
    }

    err.original = error;

    return err; // formatted error is returned
  }


  /**
   * Get current date/time
   */
  _getTime() {
    const d = new Date();
    return d.toISOString();
  }


  /**
   * Get time difference in seconds
   */
  _getTimeDiff(start, end) {
    const ds = new Date(start);
    const de = new Date(end);
    return (de.getTime() - ds.getTime()) / 1000;
  }



  /********** PRIVATE XHR OPTIONS *********/
  /**
   * Modify request headers. This is the headers sent to the server.
   * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/setRequestHeader
   * To change it use header methods.
   * @param {object} headers - headers object: { 'content-type': 'text/html', accept: 'application/json' }
   * @returns {void}
   */
  _xhr_requestHeaders(headers) {
    Object.keys(headers).forEach(prop => this.xhr.setRequestHeader(prop.toLowerCase(), headers[prop]));
  }

  /**
   * Modify request timeout in miliseconds. This is the time for which will xhr wait for response from the server.
   * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/timeout
   * To change it use: httpClient.timeout = 120000;
   * @param {number} ms - the timeout period
   * @returns {void}
   */
  _xhr_timeout(ms) {
    this.xhr.timeout = +ms || 0; // 0 means the request will never be timeout
  }

  /**
   * Modify the response type. This is the reponse tye which client expects from the server. For example 'blob' if client waits for file download.
   * https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/responseType
   * To change it use: httpClient.responseType = 'blob';
   * @param {string} type - text, arraybuffer, blob, document, json, ms-stream
   * @returns {void}
   */
  _xhr_responseType(type) {
    this.xhr.responseType = type || 'text';
  }



}


export default HTTPClient;
