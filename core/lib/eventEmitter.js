/**
 * The EventEmitter based on window CustomEvent. Inspired by the NodeJS event lib.
 */
class EventEmitter {

  constructor() {
    this.activeOns = []; // [{eventName:string, listener:Function, listenerWindow:Function}]
  }


  /**
   * Create and emit the event
   * @param {string} eventName - event name, for example: 'pushstate'
   * @param {any} detail - event argument
   * @returns {void}j
   */
  emit(eventName, detail = {}) {
    const event = new CustomEvent(eventName, { detail });
    window.dispatchEvent(event);
  }


  /**
   * Listen for the event
   * @param {string} eventName - event name, for example: 'pushstate'
   * @param {Function} listener - callback function, for example msg => {...}
   * @returns {void}
   */
  on(eventName, listener) {
    const listenerWindow = event => {
      listener.call(null, event);
    };

    this._removeOne(eventName, listener);
    this.activeOns.push({ eventName, listener, listenerWindow });
    window.addEventListener(eventName, listenerWindow);
  }


  /**
   * Listen for the event only once
   * @param {string} eventName - event name, for example: 'pushstate'
   * @param {Function} listener - callback function
   * @returns {void}
   */
  once(eventName, listener) {
    const listenerWindow = event => {
      listener.call(null, event);

      this._removeOne(eventName, listener, listenerWindow);
    };

    window.addEventListener(eventName, listenerWindow, { once: true });
  }


  /**
   * Stop listening the event for specific listener.
   * @param {string} eventName - event name, for example: 'pushstate'
   * @param {Function} listener - callback function, for example msg => {...}
   * @returns {void}
   */
  off(eventName, listener) {
    this._removeOne(eventName, listener);
  }


  /**
   * Stop listening the event for all listeners defined with on().
   * For example eventEmitter.on('msg', fja1) & eventEmitter.on('msg', fja2) then eventEmitter.off('msg') will remove fja1 and fja2 listeners.
   * @param {string} eventName - event name, for example: 'pushstate'
   * @returns {void}
   */
  offAll(eventName) {
    let ind = 0;
    for (const activeOn of this.activeOns) {
      if (activeOn.eventName === eventName) {
        window.removeEventListener(activeOn.eventName, activeOn.listenerWindow);
        this.activeOns.splice(ind, 1);
      }
      ind++;
    }
  }


  /**
   * Get all active listeners.
   * @returns {{eventName:string, listener:Function, listenerWindow:Function}[]}
   */
  getListeners() {
    return { ...this.activeOns };
  }





  /*** PRIVATES ***/
  /**
   * Remove a listener from window and this.activeOns
   */
  _removeOne(eventName, listener) {
    if (!listener) { throw new Error('eventEmitter._removeOne Error: listener is not defined'); }
    let ind = 0;
    for (const activeOn of this.activeOns) {
      if (activeOn.eventName === eventName && activeOn.listener.toString() === listener.toString()) {
        window.removeEventListener(activeOn.eventName, activeOn.listenerWindow);
        this.activeOns.splice(ind, 1);
      }
      ind++;
    }
  }





}


const eventEmitter = new EventEmitter();

export default eventEmitter;
