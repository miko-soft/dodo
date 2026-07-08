import View from './View.js';
import eventEmitter from '../lib/eventEmitter.js';


class Model extends View {

  constructor() {
    super();
    this.$model = {};
    this.$modeler = {};
    this.$model.on = eventEmitter.on.bind(eventEmitter);
    this.$model.offAll = eventEmitter.offAll.bind(eventEmitter);
  }


  /**
   * Proxy the this.$model object.
   */
  proxifyModel() {
    const createNestedProxy = (obj, topLevelModelName) => {
      return new Proxy(obj, {
        set: (target, prop, value) => {
          this.$debugOpts?.model && console.log(`DEBUG: Model set triggered (nested). this.$model.${topLevelModelName}.${String(prop)} = `, value, ' | __initFinished:', this.__initFinished);
          const tf = Reflect.set(target, prop, value);
          this.__initFinished && this.render(topLevelModelName);
          eventEmitter.emit('model-change', { modelName: topLevelModelName, modelValue: this.$model[topLevelModelName] });
          return tf;
        },
        get: (target, prop) => {
          const val = Reflect.get(target, prop);
          if (val !== null && typeof val === 'object' && typeof prop === 'string') {
            if (val instanceof File || val instanceof FileList || val instanceof Blob) { return val; }
            return createNestedProxy(val, topLevelModelName);
          }
          return val;
        }
      });
    };

    const trapHandler = {
      // Fires when you write: this.$model.users = [...] or this.$model['users'] = [...]
      // Saves the new value, then re-renders all dd- elements that reference $model.users.
      // Skipped during __init() so the page doesn't flash on every setup assignment.
      set: (obj, modelName, modelValue) => {
        this.$debugOpts?.model && console.log(`DEBUG: Model set triggered. this.$model.${modelName} = `, modelValue, ' | __initFinished:', this.__initFinished);
        const tf = Reflect.set(obj, modelName, modelValue);
        this.__initFinished && this.render(modelName);
        eventEmitter.emit('model-change', { modelName, modelValue });
        return tf;
      },

      // Fires when the JS engine uses Object.defineProperty() to set a property — which
      // happens when a bundler (Vite/esbuild) compiles bracket notation like this.$model[key] = value.
      // Without this trap, bracket-notation assignments would silently bypass the set trap
      // and no re-render would be triggered. Symbol keys are ignored — they are internal
      // engine bookkeeping (Symbol.toPrimitive, Symbol.iterator, …) and must not cause renders.
      defineProperty: (obj, modelName, descriptor) => {
        this.$debugOpts?.model && console.log(`DEBUG: Model defineProperty triggered. this.$model.${String(modelName)} = `, descriptor.value, ' | __initFinished:', this.__initFinished);
        const tf = Reflect.defineProperty(obj, modelName, descriptor);
        if (typeof modelName === 'string') {
          this.__initFinished && this.render(modelName);
          eventEmitter.emit('model-change', { modelName, modelValue: descriptor.value });
        }
        return tf;
      },

      // Fires when you read: this.$model.users or this.$model['users']
      // If the value is an object (array, plain object), it is wrapped in a nested Proxy
      // so that deep writes like this.$model.user.name = 'Ana' also trigger a re-render.
      get: (obj, modelName) => {
        const val = Reflect.get(obj, modelName);
        if (val !== null && typeof val === 'object' && typeof modelName === 'string') {
          if (val instanceof File || val instanceof FileList || val instanceof Blob) { return val; }
          return createNestedProxy(val, modelName);
        }
        return val;
      }
    };
    this.$model = new Proxy(this.$model, trapHandler);
  }



  /**
   * Define modeler (helper) methods, for example: this.$modeler.use('pets').mpush('dog');
   * @returns [any[]]
   */
  modeler() {
    /**
     * @param {string} modelName - the model name, for example in $model.company.name --> modelName is company
     */
    this.$modeler.use = (modelName) => {
      if (!this.$model[modelName]) { this._printWarn(`Error in this.$modeler.use('${modelName}'). Init the this.$model."${modelName}".`); return; }

      const methods = {
        /**
         * Set the model value
         * @param {any} modelValue - the model value at certain path
         * @param {string} path - the $model property path, for example 'product.name'
         */
        setValue: (modelValue, path) => {
          const prop = !!path ? `$model.${modelName}.${path}` : `$model.${modelName}`;
          this._setControllerValue(prop, modelValue);
          this.render(modelName);
        },

        delValue: (path) => {
          const prop = !!path ? `$model.${modelName}.${path}` : `$model.${modelName}`;
          this._setControllerValue(prop, undefined);
          this.render(modelName);
        },

        getValue: (path) => {
          const mprop = !!path ? `$model.${modelName}.${path}` : `$model.${modelName}`;
          const modelValue = this._getControllerValue(mprop);
          return modelValue;
        },

        mpush: (arrElem) => {
          this.$model[modelName].push(arrElem);
          this.render(modelName);
        },

        mpop: () => {
          this.$model[modelName].pop();
          this.render(modelName);
        },

        munshift: (arrElem) => {
          this.$model[modelName].unshift(arrElem);
          this.render(modelName);
        },

        mshift: () => {
          this.$model[modelName].shift();
          this.render(modelName);
        },

        mreverse: () => {
          this.$model[modelName].reverse();
          this.render(modelName);
        },

        mrender: () => {
          this.render(modelName);
        },

      };

      return methods;
    };

  }



  /**
   * Delete all $model properties
   */
  emptyModel() {
    this.$model = {};
  }



  /**
   * Check if the this.$model is empty object
   * @returns {boolean}
   */
  isModelEmpty() {
    return !Object.keys(this.$model).length;
  }




}


export default Model;


/*
 * ============================================================
 *  $MODEL REACTIVITY — HOW IT WORKS & ALL COMBINATIONS
 * ============================================================
 *
 * this.$model is a JavaScript Proxy. Every READ and WRITE goes
 * through trap functions that automatically trigger render() so
 * the DOM stays in sync with your data.
 *
 *
 * ─────────────────────────────────────────────────────────────
 *  LEVEL 1 — Top-level assignment  (always reactive)
 * ─────────────────────────────────────────────────────────────
 *
 *   this.$model.name = 'Ana';           // set trap → render('name')
 *   this.$model.users = [...];          // set trap → render('users')
 *   this.$model.count = 0;             // set trap → render('count')
 *   this.$model[dynamicKey] = value;   // defineProperty trap → render(dynamicKey)
 *
 *   Any direct assignment on $model — dot or bracket notation —
 *   triggers an immediate re-render of every dd- element that
 *   references that model property.
 *
 *
 * ─────────────────────────────────────────────────────────────
 *  LEVEL 2 — Deep write on a plain object  (reactive)
 * ─────────────────────────────────────────────────────────────
 *
 *   this.$model.user = { name: 'Ana', age: 30 };
 *   this.$model.user.name = 'Bob';     // nested set trap → render('user')
 *   this.$model.user.age++;            // nested set trap → render('user')
 *
 *   Reading this.$model.user returns Proxy(user). Any write on that
 *   Proxy calls render() for the top-level key ('user'), re-rendering
 *   all dd- elements that reference $model.user or $model.user.*.
 *
 *
 * ─────────────────────────────────────────────────────────────
 *  LEVEL 2 — Array mutation methods  (reactive)
 * ─────────────────────────────────────────────────────────────
 *
 *   this.$model.items = ['a', 'b'];
 *   this.$model.items.push('c');       // nested set trap → render('items')
 *   this.$model.items.pop();           // nested set trap → render('items')
 *   this.$model.items.splice(1, 1);    // nested set trap → render('items')
 *   this.$model.items[0] = 'x';       // nested set trap → render('items')
 *
 *   Array mutation methods internally do indexed assignments (arr[n] = v)
 *   and update arr.length — both hit the nested Proxy set trap, so
 *   render() fires automatically. No need to reassign the whole array.
 *
 *
 * ─────────────────────────────────────────────────────────────
 *  LEVEL 2 — Native browser objects  (NOT proxied — by design)
 * ─────────────────────────────────────────────────────────────
 *
 *   this.$model.pdfFiles = fileInput.files;   // FileList stored as-is
 *   const files = this.$model.pdfFiles;       // returns raw FileList ✓
 *   formData.append('f', files[0]);            // native File → works ✓
 *
 *   File, FileList, and Blob are read-only native browser objects.
 *   Wrapping them in a Proxy breaks the browser's internal type check
 *   inside FormData.append() — the browser uses a C++ instanceof check,
 *   not JS prototype lookup, so Proxy(File) is not recognised as a Blob
 *   and gets stringified to "[object File]". Multer then receives no file.
 *
 *   These three types are therefore returned raw from the get trap.
 *   Reactivity is still intact: assigning a new FileList to $model.pdfFiles
 *   goes through the top-level set trap and triggers render() normally.
 *
 *
 * ─────────────────────────────────────────────────────────────
 *  NON-REACTIVE patterns — mutations that bypass the Proxy
 * ─────────────────────────────────────────────────────────────
 *
 *   // Storing a reference and mutating it directly:
 *   const ref = this.$model.items;     // ref is Proxy(arr) — OK so far
 *   ref.push('x');                     // ✓ still reactive (ref is a Proxy)
 *
 *   // But if you store the raw array before proxifyModel() runs,
 *   // mutations on that raw reference won't be seen:
 *   const raw = [];
 *   this.$model.items = raw;
 *   raw.push('x');                     // ✗ NOT reactive — bypasses Proxy
 *   // Fix: this.$model.items.push('x') — always go through $model
 *
 *   // Object.assign on a nested object bypasses the set trap:
 *   Object.assign(this.$model.user, { name: 'Bob' });  // ✗ NOT reactive
 *   // Fix: this.$model.user = { ...this.$model.user, name: 'Bob' }
 *
 *
 * ─────────────────────────────────────────────────────────────
 *  SUMMARY TABLE
 * ─────────────────────────────────────────────────────────────
 *
 *   Operation                                  Reactive?
 *   ──────────────────────────────────────────────────────
 *   this.$model.x = value                         ✓
 *   this.$model[key] = value                      ✓
 *   this.$model.obj.prop = value                  ✓
 *   this.$model.arr.push / pop / splice           ✓
 *   this.$model.arr[n] = value                    ✓
 *   this.$model.fileList = input.files             ✓  (top-level set)
 *   reading this.$model.fileList                  ✓  (returns raw FileList)
 *   reading this.$model.file (File/Blob)          ✓  (returns raw File/Blob)
 *   Object.assign(this.$model.obj, patch)         ✗  (bypasses set trap)
 *   mutating a raw ref stored before proxify      ✗  (bypasses Proxy entirely)
 *
 * ============================================================
 */
