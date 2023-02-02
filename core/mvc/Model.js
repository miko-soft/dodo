import View from './View.js';


class Model extends View {

  constructor() {
    super();
    this.$model = {};
    this.$modeler = {};
  }


  /**
   * Proxy the this.$model object.
   */
  proxifyModel() {
    const trapHandler = {
      set: (obj, prop, value) => {
        // console.log('obj-before::', { ...obj });
        // console.log('prop::', prop);
        // console.log('value::', value);
        const tf = Reflect.set(obj, prop, value);
        // console.log('obj-after::', obj);
        this.render('$model.' + prop);
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
     * @param {string} moelName - the model name, for example in $model.company.name --> modelName is company
     */
    this.$modeler.use = (modelName) => {
      const methods = {
        /**
         * Set the model value
         * @param {any} val - the model value at certain path
         * @param {string} path - the $model property path, for example 'product.name'
         */
        setValue: (val, path) => {
          const mprop = !!path ? `${modelName}.${path}` : modelName;
          this._setModelValue(mprop, val); // see Aux class
        },

        getValue: (path) => {
          const mprop = !!path ? `${modelName}.${path}` : modelName;
          const val = this._getModelValue(mprop); // see Aux class
          return val;
        },

        mpush: (arrElem) => {
          this.$model[modelName].push(arrElem);
          this.render('$model.' + modelName);
        },

        mpop: () => {
          this.$model[modelName].pop();
          this.render('$model.' + modelName);
        },

        munshift: (arrElem) => {
          this.$model[modelName].unshift(arrElem);
          this.render('$model.' + modelName);
        },

        mshift: () => {
          this.$model[modelName].shift();
          this.render('$model.' + modelName);
        },

        mrender: () => {
          this.render('$model.' + modelName);
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
