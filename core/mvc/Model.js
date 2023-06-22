import View from './View.js';
import eventEmitter from '../lib/eventEmitter.js';


class Model extends View {

  constructor() {
    super();
    this.$model = {};
    this.$modeler = {};
    this.$model.on = eventEmitter.on.bind(eventEmitter);
  }


  /**
   * Proxy the this.$model object.
   */
  proxifyModel() {
    const trapHandler = {
      set: (obj, modelName, modelValue) => {
        this.$debugOpts.model && console.log(`DEBUG: Model set trigered. this.$model.${modelName} = `, modelValue);
        const tf = Reflect.set(obj, modelName, modelValue); // set obj.modelName = modelValue i.e. this.$model.modelName = modelValue
        this.__initFinished && this.render(); // prevent $model rendering in __init()
        eventEmitter.emit('model-change', { modelName, modelValue });
        return tf;
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
      const methods = {
        /**
         * Set the model value
         * @param {any} modelValue - the model value at certain path
         * @param {string} path - the $model property path, for example 'product.name'
         */
        setValue: (modelValue, path) => {
          const prop = !!path ? `$model.${modelName}.${path}` : `$model.${modelName}`;
          this._setControllerValue(prop, modelValue); // see Aux class
          this.render();
        },

        delValue: (path) => {
          const prop = !!path ? `$model.${modelName}.${path}` : `$model.${modelName}`;
          this._setControllerValue(prop, undefined); // see Aux class
          this.render();
        },

        getValue: (path) => {
          const mprop = !!path ? `$model.${modelName}.${path}` : `$model.${modelName}`;
          const modelValue = this._getControllerValue(mprop); // see Aux class
          return modelValue;
        },

        mpush: (arrElem) => {
          this.$model[modelName].push(arrElem);
          this.render();
        },

        mpop: () => {
          this.$model[modelName].pop();
          this.render();
        },

        munshift: (arrElem) => {
          this.$model[modelName].unshift(arrElem);
          this.render();
        },

        mshift: () => {
          this.$model[modelName].shift();
          this.render();
        },

        mrender: () => {
          this.render();
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
