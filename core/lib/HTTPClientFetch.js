/**
 * HTTP Client based on Fetch (https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API)
 */
class HTTPClientFetch {

  /**
   * @param {Object} opts - HTTP Client options {encodeURI, timeout, responseType, retry, retryDelay, maxRedirects, headers}
   */
  constructor(opts = {}) {
    this.url = null;
    this.protocol = 'http:';
    this.hostname = '';
    this.port = 80;
    this.pathname = '/';
    this.queryString = '';

    this.opts = {
      encodeURI: false,
      timeout: 8000,
      responseType: '', // 'text' or 'blob' for file download
      retry: 3,
      retryDelay: 5500,
      maxRedirects: 3,
      headers: {
        authorization: '',
        accept: '*/*' // Default accept header
      },
      ...opts
    };

    this.timeout = this.opts.timeout;
    this.responseType = this.opts.responseType;
    this.req_headers = { ...this.opts.headers };

    this.interceptor = null;
  }

  /********** REQUESTS *********/

  /**
   * Sending one HTTP request to HTTP server.
   * @param {string} url - URL string
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
   * @param {any} bodyPayload - HTTP body payload
   * @returns {Promise<answer>}
   */
  async askOnce(url, method = 'GET', bodyPayload) {

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

    try {
      url = this._parseUrl(url);
      answer.requestURL = url;
      answer.https = /^https/.test(this.protocol);
    } catch (err) {
      const ans = { ...answer };
      ans.status = 400;
      ans.statusMessage = err.message || 'Bad Request';
      ans.time.res = this._getTime();
      ans.time.duration = this._getTimeDiff(ans.time.req, ans.time.res);
      return ans;
    }

    if (this.interceptor) { await this.interceptor(); }

    const fetchOptions = {
      method,
      headers: this.req_headers,
      signal: this._createTimeoutSignal(this.timeout),
    };

    if (bodyPayload && !/GET/i.test(method)) {
      answer.req.payload = bodyPayload;
      const contentType = this.req_headers['content-type'] || '';
      fetchOptions.body = /application\/json/.test(contentType) ? JSON.stringify(bodyPayload) : bodyPayload;
    }

    try {
      const response = await fetch(url, fetchOptions);
      const responseHeaders = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      const resContent = await this._parseResponseContent(response);

      answer.status = response.status;
      answer.statusMessage = response.statusText;
      answer.res.headers = responseHeaders;
      answer.res.content = resContent;
      answer.time.res = this._getTime();
      answer.time.duration = this._getTimeDiff(answer.time.req, answer.time.res);
    } catch (error) {
      answer.status = error.name === 'AbortError' ? 408 : 400;
      answer.statusMessage = error.message;
      answer.time.res = this._getTime();
      answer.time.duration = this._getTimeDiff(answer.time.req, answer.time.res);
    }

    return answer;
  }

  /** Utility method to create timeout signal */
  _createTimeoutSignal(timeout) {
    const controller = new AbortController();
    setTimeout(() => controller.abort(), timeout);
    return controller.signal;
  }

  /** Utility method to parse response content based on responseType */
  async _parseResponseContent(response) {
    const responseType = this.responseType || 'text';
    switch (responseType) {
      case 'json':
        return response.json();
      case 'blob':
        return response.blob();
      case 'arraybuffer':
        return response.arrayBuffer();
      case 'text':
      default:
        return response.text();
    }
  }



  /**
   * Sending HTTP request to HTTP server.
   * @param {String} url - URL string
   * @param {String} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
   * @param {Object} bodyPayload - HTTP body
   * @returns {Promise<answer>}
   */
  async ask(url, method = 'GET', bodyPayload) {

    let answer = await this.askOnce(url, method, bodyPayload);
    const answers = [answer];

    let redirectCounter = 1;

    while (answer && /^3\d{2}/.test(answer.status) && redirectCounter <= this.opts.maxRedirects) {
      const url_new = new URL(url, answer.res.headers.location);
      console.log(`#${redirectCounter} redirection ${answer.status} from ${this.url} to ${url_new}`);

      answer = await this.askOnce(url_new, method, bodyPayload);
      answers.push(answer);

      redirectCounter++;
    }

    let retryCounter = 1;

    while (answer.status === 408 && retryCounter <= this.opts.retry) {
      console.log(`#${retryCounter} retry due to timeout (${this.opts.timeout}) on ${url}`);
      await new Promise(resolve => setTimeout(resolve, this.opts.retryDelay));

      answer = await this.askOnce(url, method, bodyPayload);
      answers.push(answer);

      retryCounter++;
    }

    return answers;
  }



  /**
   * Fetch the JSON. Redirections and retries are not handled.
   * @param {string} url - URL string
   * @param {string} method - HTTP method (GET, POST, PUT, DELETE, PATCH)
   * @param {object|string} body - HTTP body as Object or String JSON type
   * @returns {Promise<answer>}
   */
  async askJSON(url, method = 'GET', body) {

    let bodyPayload = body;
    if (body && typeof body === 'string') {
      try {
        bodyPayload = JSON.parse(body);
      } catch (err) {
        throw new Error('Body string is not valid JSON.');
      }
    }

    this.req_headers = {
      ...this.req_headers,
      'accept': 'application/json',
      'content-type': 'application/json; charset=utf-8'
    };

    const answer = await this.askOnce(url, method, bodyPayload);

    if (answer.res.content) {
      try {
        answer.res.content = JSON.parse(answer.res.content);
      } catch (err) {
        throw new Error('Response content is not valid JSON.');
      }
    }

    return answer;
  }



  /**
   * Get the HTML file content.
   * @param {string} url - URL string
   * @returns {Promise<answer>}
   */
  async askHTML(url) {
    this.req_headers = {
      ...this.req_headers,
      'accept': 'text/html',
      'content-type': 'text/html'
    };
    const answer = await this.askOnce(url, 'GET');
    return answer;
  }



  /**
   * Get the content of the Javascript file.
   * @param {string} url - URL string
   * @returns {Promise<answer>}
   */
  async askJS(url) {
    this.req_headers = {
      ...this.req_headers,
      'accept': 'application/javascript',
      'content-type': 'application/javascript; charset=utf-8'
    };
    const answer = await this.askOnce(url, 'GET');
    return answer;
  }



  /**
   * Send POST request where body is new FormData() object.
   * @param {string} url - URL string
   * @param {FormData} formData - HTTP body as FormData()
   * @returns {Promise<answer>}
   */
  async askForm(url, formData) {
    this.req_headers = {
      ...this.req_headers,
      'accept': 'multipart/form-data',
      'content-type': 'multipart/form-data'
    };
    const answer = await this.askOnce(url, 'POST', formData);
    return answer;
  }


  /**
   * Convert JS Object to FormData and prepare it for askForm()
   * @param {object} formObj - object which needs to be converted to FormData
   * @returns {FormData}
   */
  object2formdata(formObj) {
    const formData = new FormData();
    for (const [key, val] of Object.entries(formObj)) { formData.set(key, val); }
    return formData;
  }


  /*** UTILITIES */
  /** Get the current time in milliseconds */
  _getTime() {
    return new Date().getTime();
  }

  /** Get the duration in milliseconds between two timestamps */
  _getTimeDiff(startTime, endTime) {
    return endTime - startTime;
  }

  /** Parse the URL and extract components */
  _parseUrl(url) {
    const urlObj = new URL(url);
    this.protocol = urlObj.protocol;
    this.hostname = urlObj.hostname;
    this.port = urlObj.port || (this.protocol === 'https:' ? 443 : 80);
    this.pathname = urlObj.pathname;
    this.queryString = urlObj.search;

    return urlObj.toString();
  }
}


export default HTTPClientFetch;

