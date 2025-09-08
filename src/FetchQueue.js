import { resolve } from "path";
import Fetch from "./Fetch";
import HttpException from "./HttpException";

/**
 *
 * @callback handleErrors
 * @param {HttpException} error
 *
 * @callback fetchToken
 * @returns {Promise<void>}
 * @throws {HttpException}
 *
 * @typedef HttpResponse
 * @type {object}
 * @property {number} status
 * @property {any} body
 *
 * @typedef Config
 * @type {object}
 * @property {fetchToken} [renew]
 * @property {fetchToken} [refresh]
 * @property {handleErrors} [handleErrors]
 *
 * @typedef Options
 * @type {object}
 * @property {string} [baseUrl]
 * @property {string} [method]
 * @property {AbortSignal} [signal]
 * @property {RequestCredentials} [credentials]
 * @property {?Object.<string, any>} [headers]
 * @property {?Object.<string, any>} [query]
 * @property {?Object.<string, any>} [body]
 * @property {?Object.<string, any>} [form]
 * @property {?Object.<string, any>} [json]
 *
 */

export default class FetchQueue extends Fetch {
  static NONE = 0;
  static ASYNC = 1;
  static SYNC = 2;

  config = {};

  #queue = [];
  pending = FetchQueue.NONE;

  accessStore = {
    token: null,
    delay: 0,
    exp: 0,
  };

  refreshStore = {
    token: null,
    delay: 0,
    exp: 0,
    forceRetry: false,
  };

  /**
   * @param {Options} options
   * @param {Config} config
   */
  constructor(options = {}, config = {}) {
    super(options);
    this.config = config;
  }

  // ------------------------------------------------------------------
  // Token
  // ------------------------------------------------------------------

  renew() {
    if (!this.config.renew) {
      return new Promise((resolve) => resolve());
    }

    this.pending = FetchQueue.ASYNC;

    return this.config
      .renew()
      .catch(() => {
        this.resetAccess();
        if (this.refreshStore.exp > Date.now()) {
          return this.refresh();
        }
        this.resetRefresh();
      })
      .finally(() => {
        this.pending = FetchQueue.NONE;
        this.runQueue();
      });
  }

  refresh() {
    if (!this.config.refresh) {
      return new Promise((resolve) => resolve());
    }

    this.pending = FetchQueue.SYNC;

    return this.config
      .refresh()
      .catch(() => {
        this.resetAccess();
        this.resetRefresh();
      })
      .finally(() => {
        this.pending = FetchQueue.NONE;
        this.runQueue();
      });
  }

  resetAccess() {
    this.accessStore.token = null;
    this.accessStore.delay = 0;
    this.accessStore.exp = 0;
  }

  resetRefresh() {
    this.refreshStore.token = null;
    this.refreshStore.delay = 0;
    this.refreshStore.exp = 0;
    this.refreshStore.forceRetry = false;
  }

  // ----------------------------------------------------------------------------------------------
  // Fetch
  // ----------------------------------------------------------------------------------------------

  /**
   * @param {string} url
   * @param {Options} options
   * @returns {Promise<HttpResponse | void>}
   * @throws {HttpException}
   */
  async send(url, options = {}) {
    // Access token pending -----------------------------------------------------------------------
    if (await this.isQueue()) {
      // Add api to pending queue -----------------------------------------------------------------

      return new Promise((resolve, reject) => {
        this.#queue.push({
          promise: () => this.send(url, options),
          resolve,
          reject,
        });
      });
    }

    // Add authorisation params -------------------------------------------------------------------
    if (this.accessStore.token) {
      options.headers = {
        ...options.headers,
        Authorization: `Bearer ${this.accessStore.token}`,
      };
    }

    return super.send(url, options).catch(async (e) => {
      if (e.data.status === 401) {
        this.resetAccess();
        if (
          this.refreshStore.exp > Date.now() ||
          this.refreshStore.forceRetry
        ) {
          return this.send(url, options);
        }
      }

      await this.handleErrors(e);

      throw e;
    });
  }

  async handleErrors(e) {
    if (this.config.handleErrors) {
      await this.config.handleErrors(e);
    }
    throw e;
  }

  // ----------------------------------------------------------------------------------------------
  // Queue
  // ----------------------------------------------------------------------------------------------

  /**
   * @returns {boolean} True if need to be queue
   */
  async isQueue() {
    if (this.pending === FetchQueue.SYNC) {
      return true;
    }

    const timestamp = Date.now();

    // access valid -------------------------------------------------------------------------------
    if (this.accessStore.exp > timestamp) {
      // access is older than 15 min => renew -----------------------------------------------------
      const createdAt = this.accessStore.exp - this.accessStore.delay;
      if (
        createdAt < timestamp - 1000 * 60 * 15 &&
        this.pending === FetchQueue.NONE
      ) {
        this.renew();
      }
      return false;
    }

    // refresh valid ------------------------------------------------------------------------------
    if (this.refreshStore.exp > timestamp || this.refreshStore.forceRetry) {
      if (this.pending === FetchQueue.NONE) {
        this.refresh();
      }
      this.pending = FetchQueue.SYNC;
      return true;
    }

    this.resetAccess();
    this.resetRefresh();

    this.runQueue();
    return false;
  }

  runQueue() {
    const handler = this.#queue.shift(0);
    handler
      ?.promise()
      .then((response) => {
        handler.resolve(response);
      })
      .catch((error) => {
        handler.reject(error);
      });

    if (this.#queue.length) {
      this.runQueue();
    }
  }
}
