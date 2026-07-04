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
