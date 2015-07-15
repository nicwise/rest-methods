import _ from 'lodash';
import ClientMethod from './ClientMethod';
import util from 'js-util';
import Promise from 'bluebird';
import { Handlers } from 'js-util';
import { BASE_MODULE_PATH } from '../const';

export const state = {
  methods: {},
  readyHandlers: new Handlers()
};


/**
* The proxy to the server methods.
*/
const api = {
  /**
  * Flag indicating the ready state of the client.
  * Is true after `init` has retrieved methods from the server.
  */
  isReady: false,


  /**
  * An object containing proxy's to server methods.
  * This object is populated after `init` completes.
  */
  methods: {},


  /**
  * Initializes the module client-side, pulling the manifest
  * of methods from the server.
  */
  init() {
    return new Promise((resolve, reject) => {
        util.xhr.get(`/${ BASE_MODULE_PATH }.json`)
        .then((result) => {
            registerMethods(result.methods);
            resolve();
        })
        .catch((err) => reject(err));
    });
  },


  /**
  * Resets the proxy to it's uninitialized state.
  * NB: Used for testing.
  */
  reset() {
    this.isReady = false;
    this.methods = {};
    state.methods = {};
    state.readyHandlers = new Handlers();
  },


  /**
  * Registers a callback to be invoked when the server-proxy is ready.
  * @param func: The callback function.
  */
  onReady(func) {
    if (api.isReady) {
      // Already initialized - invoke callback immediately.
      if (_.isFunction(func)) {
        func();
      }
    } else {
      // Store callback to invoke later.
      state.readyHandlers.push(func);
    }
    return this;
  },



  /**
  * Invokes the specified method taking an array of parameters.
  *
  * @param verb: The HTTP verb (GET/PUT/POST/DELETE).
  * @param methodName: The name/key of the method to invoke.
  * @param args: Optional. The arguments to pass to the method.
  *
  * @return promise.
  */
  invoke(verb, methodName, args = []) {
    // Setup initial conditions.
    if (!_.isArray(args)) { args = [args]; }
    if (!this.isReady) {
      throw new Error(`Initializion must be complete before invoking methods.  See 'isReady' flag.`)
    }

    // Invoke the method.
    let method = state.methods[methodName];
    if (!method || !method.verbs[verb.toLowerCase()]) {
      throw new Error(`Failed to invoke. A ${ verb } method '${ methodName }' does not exist.`);
    }
    return method.invoke(verb, args);
  },

  // HTTP verb specific invoker methods.
  get(methodName, ...args) { return this.invoke('GET', methodName, args); },
  put(methodName, ...args) { return this.invoke('PUT', methodName, args); },
  post(methodName, ...args) { return this.invoke('POST', methodName, args); },
  delete(methodName, ...args) { return this.invoke('DELETE', methodName, args); }

};



/**
* Initalizes the proxy with the server methods.
* @param methods: An object containing the method definitions from the server.
*/
export const registerMethods = (methods = {}) => {

  // Store methods.
  _.keys(methods).forEach((key) => {
      let method = new ClientMethod(key, methods[key]);
      state.methods[key] = method;

      // Create proxy-stubs to the method.
      let stub = util.ns(api.methods, key, { delimiter:'/' });
      // console.log('api.methods', api.methods);
      // api.methods[key] = stub;
      _.keys(method.verbs).forEach(verb => {
          stub[verb] = (...args) => { return method.invoke(verb, args); };
      });
  });

  // Invoke ready handlers.
  api.isReady = true;
  state.readyHandlers.invoke();
  state.readyHandlers = new Handlers();

  // Finish up.
  return this;
};



export default api;
