import { Fetch } from "./Fetch.mjs";
import { HttpException } from "./HttpException.mjs";

/**
 *
 * @callback handleErrors
 * @param {HttpException} error
 * @param {{url: string, options: Options}} ctx
 * @returns {Promise<any>}
 *
 * @callback fetchToken
 * @param {?Object.<string, any>} [extra]
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
 * @property {boolean} [connected]
 * @property {fetchToken} [generate]
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
 * @property {?Object.<string, any>} [extra]
 *
 */

export class FetchQueue extends Fetch {
  static NONE = 0;
  static ASYNC = 1;
  static SYNC = 2;

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
  };

  /**
   * @param {Options} options
   * @param {Config} config
   */
  constructor(options = {}, config = {}) {
    super(options, config);
  }

  // ------------------------------------------------------------------
  // Token
  // ------------------------------------------------------------------

  generate() {
    if (!this.config.generate) {
      return new Promise((resolve) => resolve());
    }

    this.pending = FetchQueue.SYNC;

    return this.config
      .generate()
      .catch((e) => {
        this.config.connected = false;
        throw e;
      })
      .finally(() => {
        this.pending = FetchQueue.NONE;
        this.runQueue();
      });
  }

  renew(extra = null) {
    if (!this.config.renew) {
      return new Promise((resolve) => resolve());
    }

    this.pending = FetchQueue.ASYNC;

    return this.config
      .renew(extra)
      .catch((e) => {
        this.resetAccess();
        if (this.refreshValid(Date.now())) {
          return this.refresh();
        }
        this.resetRefresh();
        if (this.generateValid()) {
          return this.generate();
        }
        throw e;
      })
      .finally(() => {
        this.pending = FetchQueue.NONE;
        this.runQueue();
      });
  }

  refresh(extra = null) {
    if (!this.config.refresh) {
      return new Promise((resolve) => resolve());
    }

    this.pending = FetchQueue.SYNC;

    return this.config
      .refresh(extra)
      .catch((e) => {
        this.resetRefresh();
        if (this.generateValid()) {
          return this.generate();
        }
        throw e;
      })
      .finally(() => {
        this.pending = FetchQueue.NONE;
        this.runQueue();
      });
  }

  generateValid() {
    return !!this.config.generate && this.config.connected;
  }

  renewValid(timestamp) {
    const createdAt = this.accessStore.exp - this.accessStore.delay;
    return !!this.config.renew && createdAt < timestamp - 1000 * 60 * 15;
  }

  refreshValid(timestamp) {
    return !!this.config.refresh && this.refreshStore.exp > timestamp;
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

    return super.send(url, options);
  }

  /**
   * @param {HttpException} e
   * @param {{url: string, options: Options}} ctx
   * @returns {Promise<any>}
   */
  async handleErrors(e, ctx) {
    if (e.status === 401) {
      this.resetAccess();

      if (this.refreshValid(Date.now()) || this.generateValid()) {
        return this.send(ctx.url, ctx.options);
      }
    }
    if (this.config.handleErrors) {
      await this.config.handleErrors(e, ctx);
    }
    throw e;
  }

  // ----------------------------------------------------------------------------------------------
  // Queue
  // ----------------------------------------------------------------------------------------------

  /**
   * @returns {Promise<boolean>} True if need to be queue
   */
  async isQueue() {
    if (this.pending === FetchQueue.SYNC) {
      return true;
    }

    const timestamp = Date.now();

    // access valid -------------------------------------------------------------------------------
    if (this.accessStore.exp > timestamp) {
      // access is older than 15 min => renew -----------------------------------------------------
      if (this.renewValid(timestamp) && this.pending === FetchQueue.NONE) {
        this.renew();
      }
      return false;
    }

    this.resetAccess();

    // refresh valid ------------------------------------------------------------------------------
    if (this.refreshValid(timestamp)) {
      if (this.pending === FetchQueue.NONE) {
        this.refresh();
      }
      this.pending = FetchQueue.SYNC;
      return true;
    }

    this.resetRefresh();

    // generate access by other means (ex: credentials) ------------------------------------------------------------------------------
    if (this.generateValid()) {
      if (this.pending === FetchQueue.NONE) {
        this.generate();
      }
      this.pending = FetchQueue.SYNC;
      return true;
    }

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
