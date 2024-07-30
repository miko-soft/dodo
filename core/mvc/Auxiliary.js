/**
 * Auxilary methods.
 */
class Auxiliary {

  /***** CONTROLLER *****/
  /**
   * Get the controller property's value. For example controller's property is this.$model.firstName in JS and in HTML dd-text="$model.firstName"
   * @param {string} prop - controller property name (without this.), for example: company.name, $model.car.color, $fridge.color, companies[0].name ... etc
   * @returns {any}
   */
  _getControllerValue(prop) {
    try {
      // Regular expression to split by dot or bracket notation
      const propParts = prop.match(/([^[.\]]+)/g);
      if (!propParts) {
        console.warn(`_getControllerValue (Bad controller property: this.${prop})`);
        return;
      }
      let val = this;
      for (const part of propParts) {
        if (val && part in val) {
          val = val[part];
        } else if (Array.isArray(val) && !isNaN(part)) {
          val = val[parseInt(part)];
        } else {
          return; // If any part is undefined
        }
      }
      return val;
    } catch (err) {
      console.warn(`_getControllerValue (Bad controller property: this.${prop})`, err);
      return;
    }
  }



  /**
   * Set the controller property's value. For example controller's property is this.product.name
   * @param {string} prop - controller property name ( without this. ), for example: companies, companies[0], companies[0].note, product.name, $model.product.name, $model.company.product.name
   * @param {any} val - controller property value
   */
  _setControllerValue(prop, val) {
    try {
      const propParts = prop.match(/[^\[\].]+|\[\d+\]/g);
      let obj = this;

      for (let i = 0; i < propParts.length - 1; i++) {
        let part = propParts[i];

        // Check if part is array index
        if (part.startsWith('[') && part.endsWith(']')) {
          part = parseInt(part.slice(1, -1));
        }

        // If part is not found, create an empty object or array
        if (!(part in obj)) {
          if (typeof propParts[i + 1] === 'string' && propParts[i + 1].startsWith('[')) {
            obj[part] = [];
          } else {
            obj[part] = {};
          }
        }

        obj = obj[part];
      }

      let lastPart = propParts[propParts.length - 1];

      // Check if lastPart is array index
      if (lastPart.startsWith('[') && lastPart.endsWith(']')) {
        lastPart = parseInt(lastPart.slice(1, -1));
      }

      obj[lastPart] = val;
    } catch (err) {
      console.error(`_setControllerValue (${prop})`, err);
    }
  }




  /***** HTML DOM *****/
  /**
   * List DOM elements which has "dd-..." attribute and doesn't have dd-render-disabled.
   * @param {string} attrName - attribute name -> 'dd-text', 'dd.html', ...
   * @param {string} modelName - model name, for example in $model.users the model name is 'users'
   * @returns {HTMLElement[]}
   */
  _listElements(attrName, modelName) {
    let elems = document.querySelectorAll(`[${attrName}]:not([dd-render-disabled])`);
    elems = Array.from(elems); // convert DOM node list to JS array so filter(), sort() can be used


    // filter elements
    elems = elems.filter(elem => {
      // get attribute value
      let attrVal = elem.getAttribute(attrName) || ''; // $model.users --user,key or $model.age < 28 or (5 > 2)
      attrVal = attrVal.trim();

      // check {{...}} and $$
      if (/{{.+}}/.test(attrVal) || attrVal.includes('$$')) { return false; }

      // dd- directives with --forceRender option
      const { base, opts } = this._decomposeAttribute(attrVal);
      if (opts.includes('forceRender')) { return true; }

      // always render elements with dd-render-enabled i.e. cloned elements
      if (this._hasDdRender(elem, 'enabled')) { return true; }

      // take elements with $model.<modelName> or with expression (...)
      if (!!modelName) {
        return attrVal.includes('$model.' + modelName) || /\(((?!\$\{|\$\$).)*\)/.test(attrVal); // /\(((?!\$\{|\$\$).)*\)/ --> expression with no ${ and $$ in (), for example dont render (${val2} < 5) or (this.x !== $$skript.y ? {color: 'green'} : {})
        // return attrVal.includes('$model.' + modelName) || /\(.+\)/.test(attrVal);
      }

      return true;
    });

    return elems;
  }


  /**
   * Show DOM element.
   * @param {HTMLElement} elem
   */
  _elemShow(elem, directive) {
    elem.removeAttribute(`${directive}-hide`);
  }


  /**
   * Hide DOM element.
   * @param {HTMLElement} elem
   * @param {directive} directive - dd-text, dd-each, ...
   */
  _elemHide(elem, directive) {
    elem.setAttribute(`${directive}-hide`, '');
  }


  /**
   * List siblings of the elem with specific attributes (attrNames). The elem is included in the list.
   * @param {HTMLElement} elem - element for which we are searching siblings, usually dd-if element
   * @param {string[]} attrNames - attribute names: ['dd-if', 'dd-elseif', 'dd-else']
   */
  _getSiblings(elem, attrNames) {
    const siblings = [];
    if (!elem.parentNode) { return siblings; } // if no parent, return no sibling i.e return empty array
    let sibling = elem.parentNode.firstChild; // first child of the parent node

    let search = false;
    while (sibling) {
      // start to search when sibling is elem, i.e. dd-if element
      if (sibling === elem) { search = true; }

      // stop on next first attrName, for example on next dd-if
      if (search && sibling !== elem && sibling.nodeType === 1 && sibling.hasAttribute(attrNames[0])) { search = false; break; }

      if (search && sibling.nodeType === 1) {
        for (const attrName of attrNames) {
          if (sibling.hasAttribute(attrName)) {
            siblings.push(sibling);
          }
        } // \for

        // stop search when last attrName is reached, i.e. when dd-else is reached
        if (search && sibling.hasAttribute(attrNames[attrNames.length - 1])) {
          search = false;
          break;
        }
      }

      sibling = sibling.nextSibling;

    } // \while

    return siblings;
  }



  /**
   * Decompose attribute to base and option values.
   * For example: dd-text="$model.companies --pipe:slice(0,12).trim() --append" --> base is '$model.companies' and opts is array ['pipe:slice(0,12).trim()', 'append']
   * @param {string} attrVal - attribute value, for example: "$model.names --prepend"
   * @returns {{base:string, opts:string[]}} - base is base attribute value (usually controller property) and opts is attribute options
   */
  _decomposeAttribute(attrVal) {
    let opts = attrVal.split('--') || [];
    opts = opts.map(opt => opt.trim());
    const base = opts.shift();
    return { base, opts };
  }


  /**
   * Set the HTML form element value. Make correction according to the element & value type.
   * @param {HTMLElement} elem - HTML form element
   * @param {any} val - value to populate HTML form element (if val is undefined then it's empty string)
   */
  _setElementValue(elem, val = '') {
    if (typeof val === 'object') {
      if (elem.type === 'textarea') { val = JSON.stringify(val, null, 2); }
      else { val = JSON.stringify(val); }
    } else {
      val = this._val2str(val);
    }
    elem.value = val;
    elem.setAttribute('value', val);
  }


  /**
   * Set the checked attribute for radio and checkbox.
   * @param {HTMLElement} elem - HTML form element
   * @param {string[]} val - value to compare with element.value
   */
  _setElementChecked(elem, val = '') {
    val = this._val2str(val);
    if (val.includes(elem.value)) {
      elem.checked = true;
      elem.setAttribute('checked', '');
    } else {
      elem.checked = false;
      elem.removeAttribute('checked');
    }
  }


  /**
   * Set the checked attribute for radio and checkbox.
   * @param {HTMLElement} elem - HTML form element
   * @param {string} val - value to compare with element.value
   */
  _setElementSelected_one(elem, val = '') {
    val = this._val2str(val);
    for (const option of elem.options) {
      if (val === option.value) {
        option.selected = true;
        option.setAttribute('selected', '');
      } else {
        option.selected = false;
        option.removeAttribute('selected');
      }
    }
  }


  /**
   * Set the checked attribute for radio and checkbox.
   * @param {HTMLElement} elem - HTML form element
   * @param {string[]} val - value to compare with element.value
   */
  _setElementSelected_multiple(elem, val = '') {
    for (const option of elem.options) {
      const tf = val.includes(option.value);
      if (tf) {
        option.selected = true;
        option.setAttribute('selected', '');
      } else {
        option.selected = false;
        option.removeAttribute('selected');
      }
    }
  }


  /**
   * Get the HTML form element value. Make correction according to the element type & value type.
   * Element types: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/input
   * @param {HTMLElement} elem - HTML form element
   * @param {boolean} convertType - default true
   * @returns {any} val - single value or array for checkbox and select-multiple
   */
  _getElementValue(elem, convertType = true) {
    // pickup all elements with same name="something", for example checkboxes
    let val;

    if (elem.type === 'checkbox') {
      const elems = document.querySelectorAll(`[name="${elem.name}"]`);
      const valArr = [];
      let i = 1;
      for (const elem of elems) {
        let v = elem.value;
        if (convertType) { v = this._stringTypeConvert(elem.value); }
        if (elem.checked) { valArr.push(v); val = valArr; }
        if (i === elems.length && !val) { val = []; }
        i++;
      }

    } else if (elem.type === 'select-multiple') {
      const opts = elem.selectedOptions; // selected options
      const valArr = [];
      let i = 1;
      for (const opt of opts) {
        let v = opt.value;
        if (convertType) { v = this._stringTypeConvert(opt.value); }
        valArr.push(v);
        val = valArr;
        if (i === opts.length && !val) { val = []; }
        i++;
      }

    } else if (elem.type === 'radio') {
      let v = elem.value;
      if (convertType) { v = this._stringTypeConvert(elem.value); }
      if (elem.checked) { val = v; }

    } else if (elem.type === 'number') {
      const v = elem.valueAsNumber || undefined; // valueAsNumber is NaN when INPUT field is empty
      val = v;

    } else if (elem.type === 'password') {
      val = elem.value;

    } else if (elem.type === 'file' && elem.multiple) {
      val = elem.files;

    } else if (elem.type === 'file') {
      val = elem.files[0];

    } else {
      let v = elem.value;
      if (convertType) { v = this._stringTypeConvert(elem.value); }
      val = v;
    }

    return val;
  }



  /***** CLONERS *****/
  /**
   * Define cloned element. The cloned element must get dd-xyz-clone attribute.
   * @param {Element} elem - original element
   * @param {string} attrName - attribute name: dd-for, dd-repeat, dd-text
   * @param {string} attrValue - attribute value: '$model.companies --company,key'
   * @returns {HTMLElement}
   */
  _clone_define(elem, attrName, attrValue) {
    // clone the dd-xyz element
    const clonedElem = elem.cloneNode(true);

    // remove origial attributes
    clonedElem.removeAttribute(attrName);
    if (attrName === 'dd-if') {
      clonedElem.removeAttribute('dd-else');
      clonedElem.removeAttribute('dd-elseif');
    }

    // add ...-clone attribute
    clonedElem.setAttribute(`${attrName}-clone`, attrValue);

    return clonedElem;
  }


  /**
   * Insert cloned element in the DOM.
   * The cloned elem is inserted as sibling to orig elem.
   * The cloned element have dd-xyz-clone attribute.
   * @param {Element} elem - original element
   * @param {Element} clonedElem - element which will be cloned and placed in the elem sibling position
   */
  _clone_insert(elem, clonedElem) {
    elem.parentNode.insertBefore(clonedElem, elem);
  }


  /**
   * Remove cloned elements from DOM.
   * The cloned element have dd-xyz-clone attribute and dd-id of orig element,
   * for example dd-each-clone="$model.companie --company,key"  dd-id="704-978"
   * @param {Element} elem - original element
   * @param {string} attrName - attribute name: dd-each, dd-repeat
   */
  _clone_remove(elem, attrName) {
    const uid = elem.getAttribute('dd-id');
    if (!uid) { return; }

    const clonedElems = document.querySelectorAll(`[${attrName}-clone][dd-id="${uid}"]`);
    for (const clonedElem of clonedElems) {
      clonedElem.remove();
    }
  }



  /***** DD-RENDER *****/
  /**
   * Set dd-render-... in element and it's all dd- childrens.
   * @param {HTMLElement} elem
   * @param {string} renderType - 'disabled' or 'enabled' (see _listElements())
   */
  _setDdRender(elem, renderType = 'disabled') {
    const attrName = `dd-render-${renderType}`;

    // set to element
    elem.setAttribute(attrName, '');

    // set to its childrens
    const directives = [...this.$dd.noncloner_directives];
    directives.forEach(directive => {
      const ddElems = elem.querySelectorAll(`[${directive}]`);
      ddElems.forEach(ddElem => {
        ddElem.setAttribute(attrName, '');
      });
    });
  }


  /**
   * Remove dd-render-... attribute from element and it's all dd- childrens.
   * @param {HTMLElement} elem
   * @param {string} renderType - 'disabled' or 'enabled' (see _listElements())
   */
  _delDdRender(elem, renderType = 'disabled') {
    const attrName = `dd-render-${renderType}`;

    // remove from element
    elem.removeAttribute(attrName);

    // remove from its childrens
    const directives = [...this.$dd.noncloner_directives];
    directives.forEach(directive => {
      const ddElems = elem.querySelectorAll(`[${directive}]`);
      ddElems.forEach(ddElem => {
        ddElem.removeAttribute(attrName);
      });
    });
  }


  /**
   * Remove all dd-render attributes from the document with certain renderType.
   * @param {string} renderType - 'disabled' or 'enabled' (see _listElements())
   */
  _purgeDdRender(renderType = 'disabled') {
    const attrName = `dd-render-${renderType}`;
    const dd_rendered_elems = document.querySelectorAll(`[${attrName}]`);
    for (const dd_rendered_elem of dd_rendered_elems) {
      dd_rendered_elem.removeAttribute(attrName);
    }
  }


  /**
   * Test if the element has certain dd-render-... attribute.
   * @param {HTMLElement} elem
   * @param {string} renderType - 'disabled' or 'enabled' (see _listElements())
   * @returns {boolean}
   */
  _hasDdRender(elem, renderType = 'disabled') {
    const attrName = `dd-render-${renderType}`;
    return elem.hasAttribute(attrName);
  }




  /***** SOLVERS *****/
  /**
   * Solve value from directive base.
   * @param {string} base - the directive base, for example dd-selected="$model.myProducts --multiple" => base is '$model.myProducts'
   * @returns {any} - val
   */
  _solveBase(base) {
    if (!base) { return; } // for example the base in dd-href is empty string
    base = base.replace(/this\./g, '').trim(); // remove this. from base

    let val = '';
    if (/^[a-zA-Z0-9_$]+\(.*\)$/.test(base)) { // execute the controller method and get returned value
      const funcDef = base;
      const { funcName, funcArgs } = this._funcParse(funcDef, null, null);
      if (funcArgs.includes(undefined)) {
        this._printError(`_solveBase Error: One of the function args in "${base}" is undefined.`);
        return;
      }
      try { val = this[funcName](...funcArgs); }
      catch (err) { this._printError(`${err.message}. Check ${funcDef}`); }
    } else if (/^\$fridge\.[a-zA-Z0-9_$]+\(.*\)$/.test(base)) { // execute the $fridge function and get returned value --> $fridge = { func: () => {}}
      const funcDef = base.replace('$fridge.', '');
      const { funcName, funcArgs } = this._funcParse(funcDef, null, null);
      try { val = this.$fridge[funcName](...funcArgs); }
      catch (err) { this._printError(`${err.message}. Check $fridge.${funcDef}`); }
    } else if (/^\(.+\)$/.test(base)) { // get value from expression ( ... )
      const expression = base.replace(/^\(/, '').replace(/\)$/, ''); // remove round brackets ()
      if (/\+|\-|\*|\/|\%/.test(expression)) { val = this._solveMath(expression); } // math expression with + - * / %
      else if (expression.includes(' ? ') && expression.includes(' : ')) { val = this._solveTernary(expression); } // conditional (ternary) operator: this.isActive ? 'YES' : 'NO'
      else if (/(!==|!=|===|==|>=|<=|&&|\|\||>|<|!)/.test(expression)) { val = this._solveCondition(expression); } // condition with ! != !== == === > >= < <= && ||
      else { val = this._getControllerValue(expression); } // dd-text="($model.companies[0].name)" is same as dd-text="$model.companies[0].name"
    } else { // get value from the controller property
      const prop = base; // this.product -> product
      val = this._getControllerValue(prop);
    }

    return val;
  }



  /**
   * Find {{...}} mustaches (template placeholders) in the text (txt) and replace it with the value from obj object.
   * For example: dd-each="companies --company.key" --> {{company.name}} , {{key}}
   * @param {string} txt - text with mustache, usually outerHTML, for example: <b>{{age}}</b> or <span>{{animal.name}}</span> or {{$model.car}} ...etc
   * @param {object} obj - { [valName]: val, [keyName]: key } - the object which value will be used to replace the mustache placeholder, for example: txt is {{animal.name}} and obj is {animal: {name: 'dog'}, key: 0} the result is 'dog'
   * @returns {string}
   */
  _solveMustache(txt, obj) {
    const flattenedObj = this._flattenObject(obj); // dd-each="companies --company.key" will give flattenedObj::{'company.name': 'Cloud Ltd', 'company.employers': 125, key: 11}
    return txt.replace(/{{\s*([^{}\s]+)\s*}}/g, (match, objProperty) => {
      const value = flattenedObj[objProperty];
      return value !== undefined && value !== null ? value : ''; // on null or undefined return empty string
    });
  }


  /**
   * Replace double dollar marks with controller variable name.
   * For example in dd-foreach="$model.companies --company,key" the $$company will be replaced with $model.companies[key]
   * @param {string} text - text with double dollars $$company
   * @param {string} base - the base of dd- element attribute, for example $model.companies
   * @param {string} valName - name of the val variable, for example in --company,key it is company
   * @param {string} keyValue - the key value of the iteration: 0,1,2,3,...
   * @returns {string}
   */
  _solveDoubledollar(text, base, valName, keyValue) {
    const replacement = /^this\./.test(base) ? `${base}[${keyValue}]` : `this.${base}[${keyValue}]`;
    const reg = new RegExp(`\\$\\$${valName}|this\\.\\$\\$${valName}`, 'g');
    text = text.replace(reg, replacement); // replace $$company or this.$$company with this.companies[0]
    return text;
  }


  /**
   * Solve expressions. Expressions are closed in round brackets, for example (this.a !== 0).
   * Expression types:
   * - double negation such as !!this.isAcive
   * - negation such as !this.y
   * - conditions with 3 parts, for example: 'this.x >= 7' or 'x === this.y' or 'x < y'
   * @param {string} expression - text within brackets i.e. the condition string, 'this.x < 8'
   * @returns {boolean}
   */
  _solveCondition(expression) {
    // Regular expression to match different parts of the expression
    // [\w\.\$\[\]_]+  ---> variables like $model.companies[0]._id
    // ['"\p{L}\p{N}\s]+  ---> any string with UTF-8 chars closed in single or double quote 'Ja sam čćžšđ' . It's also for true or false.
    // [-\.\d]+   ---> any number integer or float
    const tripleConditionRegex = /([\w\.\$\[\]_]+|['"\p{L}\p{N}\s]+|[-\.\d]+)\s*(===|==|!==|!=|>=|>|<=|<|&&|\|\|)\s*([\w\.\$\[\]_]+|['"\p{L}\p{N}\s]+|[-\.\d]+)/u;
    const singleConditionRegex = /(\!?(\!\!)?[\w\.\$\[\]_]+)/;

    // Function to resolve the value of a variable or literal
    const resolveValue = (str) => {
      const isDoubleNegation = str.startsWith('!!');
      const isNegation = str.startsWith('!');
      let valueStr = '';
      if (isDoubleNegation) { valueStr = str.slice(2).trim(); }
      else if (isNegation) { valueStr = str.slice(1).trim(); }
      else { valueStr = str.trim(); }

      let value;
      if (valueStr === 'true' || valueStr === 'false') {
        value = valueStr === 'true';
      } else if (/^\d+/.test(valueStr)) {
        value = Number(valueStr);
      } else if (/^['"].*['"]$/.test(valueStr)) {
        value = valueStr.slice(1, -1);
      } else {
        value = this._getControllerValue(valueStr);
      }

      if (isDoubleNegation) { return value; }
      else if (isNegation) { return !value; }
      else { return value; }
    };

    // Try to match a complex condition with an operator
    let cond_parts = expression.match(tripleConditionRegex);
    if (cond_parts) {
      const a_str = cond_parts[1].trim();
      const operator = cond_parts[2];
      const b_str = cond_parts[3].trim();

      // Resolve the values of a and b
      const a = resolveValue(a_str);
      const b = resolveValue(b_str);

      // Evaluate the condition based on the operator
      const evaluateCondition = (a, operator, b) => {
        switch (operator) {
          case '===': return a === b;
          case '==': return a == b;
          case '!==': return a !== b;
          case '!=': return a != b;
          case '>=': return a >= b;
          case '>': return a > b;
          case '<=': return a <= b;
          case '<': return a < b;
          case '&&': return a && b;
          case '||': return a || b;
          default: return false;
        }
      };

      // Solve and return the condition
      const tf = evaluateCondition(a, operator, b);
      // console.log('_solveCondition::', `${a_str}:${a} ${operator} ${b_str}:${b} => ${tf}`);
      return tf;
    } else {
      // Try to match a simple single negated condition
      cond_parts = expression.match(singleConditionRegex);
      if (cond_parts) {
        const single_str = cond_parts[1].trim();
        const tf = resolveValue(single_str);
        return tf;
      } else {
        this._printError(`_solveCondition Error: Invalid expression format "${expression}"`);
      }
    }
  }


  /**
   * Solve mathematical expressions. Expressions are closed in round brackets, for example: ((this.currentPage - 1) * this.itemsPerPage + key + 1).
   * Expression operators: + - * / %
   * @param {string} expression - text within round brackets i.e. the math expression
   * @returns {number}
   */
  _solveMath(expression) {
    const variablesRegex = /[a-zA-Z_$][a-zA-Z0-9_$\.]*/g; // valid JS variable name
    const expr = expression.replace(variablesRegex, prop => {
      const val = this._getControllerValue(prop);
      // console.log('prop::', prop, 'val::', val);
      if (val === undefined) {
        this._printError(`_solveMath Error:: The ${prop} has undefined value.`);
        return NaN;
      }
      return val;
    });

    function tokenize(expression) {
      const tokens = [];
      let numberBuffer = '';

      for (const char of expression) {
        if (/\d/.test(char) || char === '.') {
          numberBuffer += char;
        } else if ('+-*/()'.includes(char)) {
          if (numberBuffer) {
            tokens.push(parseFloat(numberBuffer));
            numberBuffer = '';
          }
          tokens.push(char);
        } else if (char.trim() === '') {
          continue; // Skip whitespace
        } else {
          throw new Error('Invalid character in expression');
        }
      }

      if (numberBuffer) {
        tokens.push(parseFloat(numberBuffer));
      }

      return tokens;
    }

    function toPostfix(tokens) {
      const outputQueue = [];
      const operatorStack = [];
      const precedence = { '+': 1, '-': 1, '*': 2, '/': 2 };
      const associativity = { '+': 'L', '-': 'L', '*': 'L', '/': 'L' };

      for (const token of tokens) {
        if (typeof token === 'number') {
          outputQueue.push(token);
        } else if (token in precedence) {
          while (
            operatorStack.length &&
            precedence[operatorStack[operatorStack.length - 1]] >= precedence[token] &&
            associativity[token] === 'L'
          ) {
            outputQueue.push(operatorStack.pop());
          }
          operatorStack.push(token);
        } else if (token === '(') {
          operatorStack.push(token);
        } else if (token === ')') {
          while (operatorStack.length && operatorStack[operatorStack.length - 1] !== '(') {
            outputQueue.push(operatorStack.pop());
          }
          if (operatorStack.length === 0) {
            throw new Error('Mismatched parentheses');
          }
          operatorStack.pop(); // Remove the '('
        }
      }

      while (operatorStack.length) {
        outputQueue.push(operatorStack.pop());
      }

      return outputQueue;
    }

    function evaluatePostfix(postfix) {
      const stack = [];

      for (const token of postfix) {
        if (typeof token === 'number') {
          stack.push(token);
        } else {
          const b = stack.pop();
          const a = stack.pop();
          switch (token) {
            case '+': stack.push(a + b); break;
            case '-': stack.push(a - b); break;
            case '*': stack.push(a * b); break;
            case '/': stack.push(a / b); break;
          }
        }
      }

      if (stack.length !== 1) {
        throw new Error('Invalid expression evaluation');
      }

      return stack[0];
    }


    function solveExpression(expression) {
      const tokens = tokenize(expression);
      const postfix = toPostfix(tokens);
      return evaluatePostfix(postfix);
    }


    const solution = solveExpression(expr);
    return solution;
  }



  /**
   * Solve expressions with ternary operator - ?.
   * The expression is closed in round brackets, for example: (isActive ? {color: 'green'} : {color: 'red'}).
   * @param {string} expression - text within round brackets i.e. the ternary condition
   * @returns {any}
   */
  _solveTernary(expression) {
    const parts = expression.match(/(.*) \? (.*) : (.*)/) ?? [];
    const condition = parts[1]?.trim();
    const solution1 = parts[2]?.replace(/^'/, '').replace(/'$/, '').trim();
    const solution2 = parts[3]?.replace(/^'/, '').replace(/'$/, '').trim();
    let val = this._solveCondition(condition) ? solution1 : solution2;
    val = this._stringTypeConvert(val);
    return val;
  }




  /***** FUNCTIONS *****/
  /**
   * Parse function definition and return function name and arguments.
   * For example: products.list(25, 'str', $event, $element) -> {funcName: 'products.list', funcArgs: [55, elem]}
   * @param {string} funcDef - function definition in the dd- attribute
   * @param {HTMLElement} elem - dd- HTML element on which is the event applied
   * @param {Event} event - event (click, keyup, ...) applied on the dd- element (used only in the DdListeners)
   * @returns {{funcName:string, funcArgs:any[], funcArgsStr:string}
   */
  _funcParse(funcDef, elem, event) {
    if (!funcDef) { return {}; }

    const matched = funcDef.match(/^(.+)\((.*)\)$/);
    if (!matched) { console.error(`_funcParseErr: Function "${funcDef}" has bad definition.`); return {}; }
    const funcName = matched[1] || ''; // function name: products.list

    const funcArgsStr = !!matched[2] ? matched[2].trim() : ''; // function arguments: 25, 'str', $event, $element, this.products
    const funcArgs = !funcArgsStr ? [] : funcArgsStr
      .split(',')
      .map(arg => {
        arg = arg.trim();
        if (arg === '$element') { arg = elem; } // DOM HTMLElement: func($element)
        else if (arg === '$value') { arg = this._getElementValue(elem, true); } // DOM HTMLElement value (INPUT, SELECT, TEXTAREA,...): func($value)
        else if (arg === '$event') { arg = event; } // DOM Event: func($event)
        else if (/"|'/.test(arg)) { arg = arg.replace(/\'/g, ''); } // string: func('some str', "some str")
        else if (/^-?\d+\.?\d*$/.test(arg) && !/\'/.test(arg)) { arg = +arg; } // number: func(12, -12, -12.22)
        else if ((arg === 'true' || arg === 'false')) { arg = JSON.parse(arg); } // boolean: func(true, false)
        else if (/^\/.+\/i?g?$/.test(arg)) { // if regular expression, for example in replace(/Some/i, 'some')
          const mat = arg.match(/^\/(.+)\/(i?g?)$/);
          arg = new RegExp(mat[1], mat[2]);
        }
        else if (/^\$model\./.test(arg)) { // model: func($model.cars)
          const prop = arg;
          const val = this._getControllerValue(prop);
          arg = val;
        }
        else if (/^this\./.test(arg)) { // if contain this. i.e. controller property: func(this.pets)
          const prop = arg.replace(/^this\./, ''); // remove this.
          const val = this._getControllerValue(prop);
          arg = val;
        } else { // finally take it as controller property (without this.): func(pets)
          const prop = arg;
          const val = this._getControllerValue(prop);
          arg = val;
        }

        return arg;
      });

    return { funcName, funcArgs, funcArgsStr };
  }


  /**
   * Execute the function. It can be the controller method or the function defined in the controller property.
   * @param {string} funcName - function name, for example: runKEYUP or products.list
   * @param {any[]} funcArgs - function argumants
   * @return {any}
   */
  async _funcExe(funcName, funcArgs) {
    try {
      let result;
      if (/\./.test(funcName)) {
        // execute the function in the controller property, for example: this.print.inConsole = () => {...}
        let propSplitted = funcName.split('.') || []; // ['print', 'inConsole']
        propSplitted = propSplitted.filter(prop => prop !== 'this'); // remove this keyword

        let func = this;
        let bindObj;
        for (const prop of propSplitted) {
          func = func[prop];
          if (typeof func === 'object') { bindObj = func; }
        }
        func = func.bind(bindObj); // bind the function to corresponding object, for example: $auth.logout() bind to $auth

        result = await func(...funcArgs);

      } else {
        // execute the controller method
        if (!this[funcName]) { throw new Error(`Method "${funcName}" is not defined in the "${this.constructor.name}" controller.`); }
        result = await this[funcName](...funcArgs);
      }

      return result;

    } catch (err) {
      console.error(err);
    }
  }


  /**
   * Execute multiple functions, for example: dd-click="f1(); f2(a, b);";
   * @param {string} funcDefs - definition of the functions: func1();func2(a, b);
   * @param {HTMLElement} elem - element where is the dd-... attribute
   * @param {Event} event - the DOM Event object
   */
  async _funcsExe(funcDefs, elem, event) {
    const funcDefs_arr = funcDefs.split(';').filter(funcDef => !!funcDef).map(funcDef => funcDef.trim());
    for (const funcDef of funcDefs_arr) {
      const { funcName, funcArgs } = this._funcParse(funcDef, elem, event);
      await this._funcExe(funcName, funcArgs);
    }
  }


  /**
   * Apply pipe methods on the string.
   * @param {string} str - the string which should be modified
   * @param {string} pipeOpt - pipe option, for example: pipe:slice(0,10).replace(/as/, '').trim()
   */
  _pipeExe(str, pipeOpt) {
    if (str === undefined || str === null || (!!str && typeof str !== 'string')) {
      return '';
    }

    str = str.replace(/\n/g, ' ').replace(/\s+/g, ' ').replace(/\'|\`/g, '').trim();
    const pipeFuncs = pipeOpt.replace('pipe:', '').trim().split('.');

    try {
      for (const func of pipeFuncs) {
        const match = func.match(/(\w+)\((.*)\)/);
        if (match) {
          const [_, methodName, args] = match;
          const methodArgs = args.split(',').map(arg => {
            arg = arg.trim();
            if (arg === 'undefined') return undefined;
            if (arg === 'null') return null;
            if (arg === 'NaN') return NaN;
            if (arg === 'true') return true;
            if (arg === 'false') return false;
            if (!isNaN(arg)) return Number(arg);
            if (arg.match(/^\/.*\/[gimsuy]*$/)) { // Detect regex
              const parts = arg.match(/^\/(.*)\/([gimsuy]*)$/);
              return new RegExp(parts[1], parts[2]);
            }
            return arg.replace(/['"]/g, '');
          });

          // Apply the method if it exists on the string prototype
          if (typeof String.prototype[methodName] === 'function') {
            str = String.prototype[methodName].apply(str, methodArgs);
          } else {
            throw new Error(`Unsupported method: ${methodName}`);
          }
        } else {
          throw new Error(`Invalid pipe function format: ${func}`);
        }
      }

      return str;

    } catch (err) {
      this._printError('_pipeExe:: Error in pipe execution', err);
      return '';
    }
  }





  /***** MISC *****/
  /**
   * Generate unique ID.
   * @returns {string} - 796-199
   */
  _uid_generate() {
    const date = Date.now() / 1000;
    const ms = (date + '').split('.')[1];
    const rnd = Math.round(Math.random() * 1000);
    const uid = 'uid_' + ms + '_' + rnd;
    return uid;
  }

  /**
   * Create unique element id.
   * @param {HTMLElement} elem - the dd- element
   */
  _uid(elem) {
    const uid = this._uid_generate();
    elem.setAttribute('dd-id', uid);
  }


  /**
   * Check if the HTMl element and it's childrens has directives.
   * @param {HTMLElement} elem - element with the dd-... attribute
   * @param {string[]} directives - array of directives: ['dd-each', 'dd-repeat']
   * @returns {string}
   */
  _hasDirectives(elem, directives) {
    let directive_found = '';

    for (const directive of directives) {
      if (elem.hasAttribute(directive)) {
        directive_found = directive;
        break;
      }

      const dd_elems = elem.querySelectorAll(`[${directive}]`);
      for (const dd_elem of dd_elems) {
        if (dd_elem.hasAttribute(directive)) {
          directive_found = directive;
          break;
        }
      }
    }

    return directive_found;
  }


  /**
   * Convert string to correct data type. Usually convert element.value (string) in integer, float, boolean or JSON.
   * @param {string} val
   * @returns {string | number | boolean | object}
   */
  _stringTypeConvert(val) {
    const isJSON = val => {
      try { JSON.parse(val); }
      catch (err) { return false; }
      return true;
    };

    const toObject = val => {
      try { return JSON.parse(val); }
      catch (err) { this._printError(`_stringTypeConvert Error: Bad Object or array definition in "${val}"`); }
    };

    if (!!val && !isNaN(val) && !/\./.test(val)) { // convert string into integer (12)
      val = parseInt(val, 10);
    } else if (!!val && !isNaN(val) && /\./.test(val)) { // convert string into float (12.35)
      val = parseFloat(val);
    } else if (val === 'true' || val === 'false') { // convert string into boolean (true)
      val = JSON.parse(val);
    } else if (isJSON(val)) { // convert JSON string {"a": "Lorem ipsum"} into object
      val = toObject(val);
    } else if (/^\s*({.*}|[.*])\s*$/.test(val)) { // convert object or array notation {a: 'Lorem ipsum'} or ['str', 88] into object
      const jsonStr = val.replace(/'/g, '"').replace(/(\w+):/g, '"$1":'); // {color: 'red'} -> {"color": "red"}
      val = toObject(jsonStr);
    }

    return val;
  }


  /**
   * Convert a nested JavaScript object into an array of key-value pairs with flattened keys
   * Example:
   * {
   *   a: 1,
   *   b: {
   *     c: 3,
   *     d: {
   *       e: 4,
   *       f: 5
   *     }
   *   }
   * }
   * converts to:
   * {
   *   'a': 1,
   *   'b.c': 3,
   *   'b.d.e': 4,
   *   'b.d.f': 5
   * }
   *
   * @param {object} obj - The object to be flattened.
   * @param {string} parentKey - A string that keeps track of the current nested path (default is an empty string).
   * @param {object} obj_flat - An object that accumulates the flattened key-value pairs (default is an empty object).
   * @returns {object}
   */
  _flattenObject(obj, parentKey = '', obj_flat = {}) {
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        const newKey = parentKey ? `${parentKey}.${key}` : key;
        if (typeof obj[key] === 'object' && !Array.isArray(obj[key])) {
          this._flattenObject(obj[key], newKey, obj_flat);
        } else {
          obj_flat[newKey] = obj[key];
        }
      }
    }
    return obj_flat;
  }



  /**
   * Convert a flattened object with dot-separated keys back into a nested JavaScript object.
   * @param {object} obj_flat - flattened object
   * @returns {object}
   */
  _unflattenObject(obj_flat) {
    const obj = {};
    for (const key in obj_flat) {
      if (obj_flat.hasOwnProperty(key)) {
        const keys = key.split('.');
        keys.reduce((acc, part, index) => {
          if (index === keys.length - 1) {
            acc[part] = obj_flat[key];
          } else {
            acc[part] = acc[part] || {};
          }
          return acc[part];
        }, obj);
      }
    }

    return obj;
  }


  /**
   * Convert any data type value to string. Usually convert controller value to string.
   * @param {any} val - input value of any type
   * @returns {string}
   */
  _val2str(val) {
    if (val === null) return 'null';
    if (val === undefined) return 'undefined';
    if (typeof val === 'boolean') return val.toString();
    if (typeof val === 'number') return val.toString();
    if (typeof val === 'bigint') return val.toString();
    if (typeof val === 'string') return val;
    if (typeof val === 'symbol') return val.toString();
    if (typeof val === 'function') return val.toString();
    if (typeof val === 'object') {
      try {
        return JSON.stringify(val);
      } catch (e) {
        return val.toString();
      }
    }
    return val.toString();
  }


  /**
  * Debug the controller methods.
  * @param {string} tip - debug type: ddText, render, ...
  * @param {string} text - the printed text
  * @param {string} color - text color
  * @param {string} background - background color
  * @returns {object}
  */
  _debug(tip, text, color, background) {
    const debugOpts = this.$debugOpts || {};
    if (debugOpts && debugOpts[tip]) { console.log(`%c ${text}`, `color: ${color}; background: ${background}`); }
    return debugOpts;
  }

  /**
   * Print the error message in the console.
   * @param {string} errMessage - the error message
   */
  _printError(errMessage) {
    console.log(`%c ERROR:: ${errMessage}`, `color:Red; background:Yellow`);
  }

  /**
   * Print the warning message in the console.
   * @param {string} warnMessage - the error message
   */
  _printWarn(warnMessage) {
    console.log(`%c WARNING:: ${warnMessage}`, `color:Maroon; background:LightYellow`);
  }


  /**
   * Check if Js variable has valid name
   * @param {string} varName
   * @returns {boolean}
   */
  _isValidVariableName(varName) {
    return /^[_\$A-Za-z0-9]+$/.test(varName);
  }



}


export default Auxiliary;
