/**
 * Terminology
 * =================================
 * route :string - defined route in the def() method - /room/subscribe/:room_name/:id
 * routeParsed.full :string - full route (start and end slashes removed) - 'room/subscribe/:room_name/:id'
 * routeParsed.segments :number - number the full route segments (with param parts) - 4
 * routeParsed.base :number - route part without params segments (start and end slashes removed) - 'room/subscribe'
 *
 * uri :string - current URI - /room/subscribe/sasa/123?x=123&y=abc&z=false
 * uriParsed.path :string - complete uri (start and end slashes removed) - '/room/subscribe/sasa/123'
 * uriParsed.segments :number - number of the uri segments - 4
 * uriParsed.queryString :string - uri part after question mark as string - 'x=123&y=abc&z=false'
 * uriParsed.queryObject :object - uri part parsed as object - {x: 123, y: 'abc', z: false}
 *
 * body :any - data sent along with uri as the transitional object - trx: {uri, body}
 *
 * func :Function - route function - a function which is executed when certain route is matched against the uri
 * trx :object - transitional object which can be changed in the route functions, required field is "uri" - {uri, body, uriParsed, routeParsed, params, query}
 *
 * Notice
 *-----------
 * a) Variables "uri" and "body" are analogous to HTTP POST request, for example:  POST /room/subscribe/sasa/123?key=999  {a: 'something})
 * b) This code is simillar to general purpose "regoch-router" - https://github.com/smikodanic/regoch-router
 */



class Router {

  constructor() {
    this.routeDefs = []; // route definitions [{route:string, funcs:Function[] }]
    this.DEBUGROUTER = false;
  }


  /**
   * Define route and corresponding functions.
   * @param {string} route - /room/subscribe/:room_name
   * @param {Function[]} funcs - route functions, middlewares
   * @returns {Router}
   */
  when(route, ...funcs) {
    this.routeDefs.push({
      route,
      funcs
    });
    return this;
  }


  /**
   * Redirect from one route to another route.
   * @param {string} fromRoute - new route
   * @param {string} toRoute - destination route (where to redirect)
   * @param {Function} cb - callback function executed during redirection process, it's a route middleware appended to toRoute middlewares
   * @returns {Router}
   */
  redirect(fromRoute, toRoute, cb) {
    const toRouteDef = this.routeDefs.find(routeDef => routeDef.route === toRoute); // {route, funcs}
    const toFuncs = !!toRouteDef ? toRouteDef.funcs : [];
    this.when(fromRoute, cb, ...toFuncs); // assign destination functions to the new route
    return this;
  }


  /**
   * Define special route <notfound>
   * @param {Function[]} funcs - middlewares which will be executed when route is not matched aginst URI
   * @returns {Router}
   */
  notfound(...funcs) {
    this.when('<notfound>', ...funcs);
    return this;
  }



  /**
   * Define special route <do>
   * @param {Function[]} funcs - middlewares which will be executed on every request, e.g. every exe()
   * @returns {Router}
   */
  do(...funcs) {
    this.when('<do>', ...funcs);
    return this;
  }




  /**
   * Find the matched route and execute its middlewares.
   * @param {object} trx - initial transitional object {uri:string, body:any, ...}  -- NOTICE: Must contain "url" property.
   * @returns {Promise<object>}
   */
  async exe(trx) {
    if (!trx.uri) { throw new Error('The "uri" property is required on trx transitional Router object.'); }

    const uriParsed = this._uriParser(trx.uri); // shop/register/john/23

    /*** FIND ROUTE ***/
    // found route definition
    const routeDef_found = this.routeDefs.find(routeDef => { // {route, funcs}
      const routeParsed = this._routeParser(routeDef.route); // {full, segments, base}
      return this._routeRegexMatchNoParams(routeParsed, uriParsed) || this._routeWithParamsMatch(routeParsed, uriParsed);
    });

    // not found route definition
    const routeDef_notfound = this.routeDefs.find(routeDef => routeDef.route === '<notfound>');

    // do route definition
    const routeDef_do = this.routeDefs.find(routeDef => routeDef.route === '<do>');


    /*** EXECUTE FOUND ROUTE FUNCTIONS */
    const start = new Date();

    if (!!routeDef_found) {
      const routeParsed = this._routeParser(routeDef_found.route); // {full, segments, base}
      trx.query = uriParsed.queryObject;
      trx.params = !!routeParsed ? this._getParams(routeParsed.full, uriParsed.path) : {};
      for (const func of routeDef_found.funcs) { await func(trx); }
    } else if (!!routeDef_notfound) {
      for (const func of routeDef_notfound.funcs) { await func(trx); }
    }

    if (!!routeDef_do && !!routeDef_do.funcs && !!routeDef_do.funcs.length) {
      for (const func of routeDef_do.funcs) { await func(trx); }
    }

    const end = new Date();
    trx.elapsedTime = (end - start) + ' ms'; // in miliseconds


    return trx;
  }





  /*********** ROUTE MATCHES  ***********/

  /**
   * Route regular expression match against the uri. Parameters are not defined in the route e.g. there is no /: chars.
   * For example:
   *       (route) /ads/autos/bmw - (uri) /ads/autos/bmw -> true
   *       (route) /ads/a.+s/bmw  - (uri) /ads/autos/bmw -> true
   * @param {object} routeParsed - {full, segments, base}
   * @param {object} uriParsed - {path, segments, queryString, queryObject}
   * @returns {boolean}
   */
  _routeRegexMatchNoParams(routeParsed, uriParsed) {
    const routeReg = new RegExp(`^${routeParsed.full}$`, 'i');
    const tf1 = routeReg.test(uriParsed.path); // route must match uri
    const tf2 = routeParsed.segments === uriParsed.segments; // route and uri must have same number of segments
    const tf = tf1 && tf2;
    this.DEBUGROUTER && console.log(`\n_routeRegexMatchNoParams:: (route) ${routeParsed.full} - (uri) ${uriParsed.path} -> ${tf}`);
    return tf;
  }


  /**
   * Route with parameters match against the uri.
   * (route) /shop/register/:name/:age - (uri) /shop/register/john/23
   * @param {object} routeParsed - {full, segments, base}
   * @param {object} uriParsed - {path, segments, queryString, queryObject}
   * @returns {boolean}
   */
  _routeWithParamsMatch(routeParsed, uriParsed) {
    const routeReg = new RegExp(`^${routeParsed.base}\/`, 'i');
    const tf1 = routeReg.test(uriParsed.path); // route base must match uri
    const tf2 = routeParsed.segments === uriParsed.segments; // route and uri must have same number of segments
    const tf3 = /\/\:/.test(routeParsed.full); // route must have at least one /:
    const tf = tf1 && tf2 && tf3;
    this.DEBUGROUTER && console.log(`_routeWithParamsMatch:: (route) ${routeParsed.full} - (uri) ${uriParsed.path} -> ${tf}`);
    return tf;
  }




  /*********** HELPERS  ***********/

  /**
   * Removing slashes from the beginning and the end.
   * /ads/autos/bmw/ --> ads/autos/bmw
   * //ads/autos/bmw/// --> ads/autos/bmw
   * @param {string} path - uri path or route
   * @returns {string}
   */
  _removeSlashes(path) {
    return path.trim().replace(/^\/+/, '').replace(/\/+$/, '');
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

    if (!!value && !isNaN(value) && value.indexOf('.') === -1) { // convert string into integer (12)
      value = parseInt(value, 10);
    } else if (!!value && !isNaN(value) && value.indexOf('.') !== -1) { // convert string into float (12.35)
      value = parseFloat(value);
    } else if (value === 'true' || value === 'false') { // convert string into boolean (true)
      value = JSON.parse(value);
    } else if (isJSON(value)) {
      value = JSON.parse(value);
    }

    return value;
  }



  /**
   * Create query object from query string.
   * @param  {string} queryString - x=abc&y=123&z=true
   * @return {object}             - {x: 'abc', y: 123, z: true}
   */
  _toQueryObject(queryString) {
    const queryArr = queryString.split('&');
    const queryObject = {};

    let eqParts, property, value;
    queryArr.forEach(elem => {
      eqParts = elem.split('='); // equotion parts
      property = eqParts[0];
      value = eqParts[1];

      value = this._stringTypeConvert(value); // t y p e   c o n v e r s i o n

      queryObject[property] = value;
    });

    return queryObject;
  }



  /**
   * URI parser
   * @param  {string} uri - /shop/register/john/23?x=abc&y=123&z=true  (uri === trx.uri)
   * @returns {path:string, queryString:string, queryObject:object} - {path: 'shop/register/john/23', queryString: 'x=abc&y=123&z=true', queryObject: {x: 'abc', y: 123, z: true}}
   */
  _uriParser(uri) {
    const uriDivided = uri.split('?');

    const path = this._removeSlashes(uriDivided[0]); // /shop/register/john/23 -> shop/register/john/23
    const segments = path.split('/').length;
    const queryString = uriDivided[1];
    const queryObject = !!queryString ? this._toQueryObject(queryString) : {};

    const uriParsed = { path, segments, queryString, queryObject };
    return uriParsed;
  }


  /**
   * Route parser.
   * Converts route string into the parsed object {full, segments, parser} which is used for matching against the URI.
   * @param  {string} route - /shop/register/:name/:age/
   * @returns {full:string, segments:number, base:string} - {full: 'shop/register/:name/:age', segments: 4, base: 'shop/register'}
   */
  _routeParser(route) {
    const full = this._removeSlashes(route);
    const segments = full.split('/').length;
    const base = full.replace(/\/\:.+/, ''); // shop/register/:name/:age --> shop/register

    const routeParsed = { full, segments, base };
    return routeParsed;
  }



  /**
   * Create parameters object.
   * For example if route is /register/:name/:age AND uri is /register/john/23 then params is {name: 'john', age: 23}
   * @param  {string} routeParsedFull - routeParsed.full -- shop/register/:name/:age
   * @param  {string} uriParsedPath  - uriParsed.path -- shop/register/john/23
   * @returns {object}
   */
  _getParams(routeParsedFull, uriParsedPath) {
    const routeParts = routeParsedFull.split('/'); // ['shop', 'register', ':name', ':age']
    const uriParts = uriParsedPath.split('/'); // ['shop', 'register', 'john', 23]

    const params = {};

    routeParts.forEach((routePart, index) => {
      if (/\:/.test(routePart)) {
        const property = routePart.replace(/^\:/, ''); // remove :

        let value = uriParts[index];
        value = this._stringTypeConvert(value); // t y p e   c o n v e r s i o n

        params[property] = value;
      }
    });

    return params;
  }



}



export default Router;
