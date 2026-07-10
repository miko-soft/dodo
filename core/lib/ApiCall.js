import HTTPClient from './HTTPClient.js';


/**
 * HTTP API client — safe for concurrent use with Promise.all, Promise.race, etc.
 *
 * Every method (get, post, put, delete, post_form, download) creates a fresh HTTPClient
 * instance with its own XHR object, so multiple requests can run at the same time without
 * interfering with each other.
 *
 * Example:
 *   await Promise.all([apiCall.get(urlA), apiCall.get(urlB)]);   // both run in parallel
 *   await Promise.race([apiCall.get(urlA), apiCall.get(urlB)]);  // first response wins
 *
 * Why this is needed: a shared HTTPClient holds a single XHR. Calling .open() on it while
 * a request is in flight silently aborts the previous request — the first call resolves as
 * undefined. A fresh HTTPClient per request gives each call its own isolated XHR.
 *
 * @param {object}   [opts]
 * @param {boolean}  [opts.encodeURI=false]
 * @param {number}   [opts.timeout=8000]     - request timeout in ms
 * @param {object}   [opts.headers={}]       - default request headers
 * @param {Function} [opts.interceptor]      - async fn bound to HTTPClient; runs before every request.
 *                                             Use `this.setReqHeader(name, value)` inside to inject auth tokens.
 *                                             Example: async function() { this.setReqHeader('authorization', getToken()); }
 * @param {Function} [opts.onError]          - fn(answer, err, url) called on non-200 response or thrown error.
 *                                             If omitted, errors are logged to console.error only.
 */
class ApiCall {

  constructor(opts = {}) {
    this.opts = opts;
  }


  _initClient() {
    const client = new HTTPClient({
      encodeURI: this.opts.encodeURI ?? false,
      timeout: this.opts.timeout ?? 8000,
      headers: this.opts.headers ?? {}
    });

    if (this.opts.interceptor) {
      client.setInterceptor(this.opts.interceptor);
    }

    return client;
  }


  async _request(url, method, body = null, isForm = false) {
    // Fresh HTTPClient per call — each gets its own XHR, so concurrent requests don't abort each other.
    const httpClient = this._initClient();
    try {
      let answer;
      if (isForm) {
        const formData = httpClient.object2formdata(body);
        answer = await httpClient.askForm(url, formData);
      } else {
        answer = await httpClient.askJSON(url, method, body);
      }

      if (answer?.status === 200) return answer.res.content;
      this._manageError(answer, null, url);
    } catch (err) {
      this._manageError(null, err, url);
    }
  }


  get(url) { return this._request(url, 'GET'); }

  post(url, body) { return this._request(url, 'POST', body); }

  put(url, body) { return this._request(url, 'PUT', body); }

  delete(url, body) { return this._request(url, 'DELETE', body); }

  post_form(url, formObj) { return this._request(url, 'POST', formObj, true); }

  async download(url, method = 'GET', body) {
    // Fresh HTTPClient per call — responseType 'blob' is set on the local instance only,
    // so it doesn't leak into concurrent JSON requests.
    const httpClient = this._initClient();
    try {
      httpClient.responseType = 'blob';
      const answer = await httpClient.askOnce(url, method, body);

      if (answer?.status === 200) return answer.res.content;

      const contentText = await answer?.res.content.text();
      answer.res.content = contentText ? JSON.parse(contentText) : { message: 'Download error' };
      this._manageError(answer, null, url);
    } catch (err) {
      this._manageError(null, err, url);
    }
  }


  _manageError(answer, err, url) {
    if (this.opts.onError) {
      this.opts.onError(answer, err, url);
      return;
    }
    const msg = err?.message || answer?.res?.content?.errDoc?.message || answer?.statusMessage || 'API error';
    console.error(`[ApiCall Error]: ${msg} | URL: ${url}`);
  }

}


export default ApiCall;
