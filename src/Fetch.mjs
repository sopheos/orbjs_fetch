import { HttpException } from "./HttpException.mjs";

/**
 * @typedef HttpResponse
 * @type {object}
 * @property {number} status
 * @property {any} body
 *
 * @callback handleErrors
 * @param {HttpException} error
 * @param {{url: string, options: Options}} ctx
 * @returns {Promise<any>}
 * 
 * @typedef Config
 * @type {object}
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
 */

export class Fetch {
  options = {};
  config = {};

  /**
   * @param {Options} options
   * @param {Config} config
   */
  constructor(options = {}, config = {}) {
    this.options = options;
    this.config = config;
  }

  /**
   * @param {string} url
   * @param {Options} options
   * @returns {Promise<HttpResponse | void>}
   * @throws {HttpException}
   */
  async send(url, options = {}) {
    const config = { ...this.options, ...options };

    // Build url ----------------------------------------------------------------------------------
    const input = new URL(url, config.baseUrl ?? location.origin);

    // add query ----------------------------------------------------------------------------------
    if (config.query) {
      for (const key in config.query) {
        let data = config.query[key];
        if (Array.isArray(data)) {
          for (const [index, value] of data.entries()) {
            input.searchParams.append(`${key}[${index}]`, value);
          }
        } else if (data !== null) {
          input.searchParams.append(key, data);
        }
      }
    }

    // Build request init -------------------------------------------------------------------------

    const init = {
      method: config.method ?? "GET",
      credentials: config.credentials ?? "omit",
      body: config.body,
      signal: config.signal ?? null,
      headers: new Headers(config.headers ?? {}),
    };

    // add body  ----------------------------------------------------------------------------------
    if (config.json) {
      init.headers.set("Content-Type", "application/json");
      init.body = JSON.stringify(config.json);
    } else if (config.form) {
      init.body = new FormData();
      for (const key in config.form) {
        init.body.append(key, config.form[key]);
      }
    }

    return fetch(input, init)
      .then((res) => Fetch.handleResponse(res))
      .catch((e) => {
        if (e instanceof HttpException) {
          throw e;
        }

        throw new HttpException({
          status: 500,
          data: {
            status: 500,
            error: navigator?.onLine ? "fetch" : "offline",
          },
        });
      })
      .catch((e) => this.handleErrors(e, {url, options}));

  }

  /**
   * Handle Fetch API response
   * @param {Response} response
   * @returns {Promise<HttpResponse>}
   * @throws {HttpException}
   */
  static async handleResponse(response) {
    const body = await Fetch.parseBody(response);
    if (response.ok) {
      return { status: response.status, body };
    }
    throw new HttpException({
      status: response.status,
      data: body,
    });
  }

  /**
   * Parse the content of a Fetch API response thanks to the Content-Type header
   * @param {Response} response
   * @returns {Promise<any>}
   */
  static async parseBody(response) {
    if (!response.body) {
      return null;
    }

    const type = response.headers.get("Content-Type");
    if (type) {
      if (type.match(/.*application\/json.*/g)) {
        return response.json();
      }
      if (type.match(/.*application\/pdf.*/g)) {
        return response.blob();
      }
      if (type.match(/.*image\/.*/g)) {
        return response.blob();
      }
    }
    return response.text();
  }

  /**
   * @param {HttpException} e
   * @param {{url: string, options: Options}} ctx
   */
  async handleErrors(e, ctx) {
    if (this.config.handleErrors) {
      await this.config.handleErrors(e, ctx);
    }
    throw e;
  }


  // HELPERS ----------------------------------------------------------------------------------------

  /**
   * @param {string} url
   * @param {?object} data
   * @param {Options} options
   * @returns {Promise<HttpResponse | void>}
   * @throws {HttpException}
   */
  get(url = "/", data = null, options = {}) {
    options.method = "GET";
    options.query = data;
    return this.send(url, options);
  }

  /**
   * @param {string} url
   * @param {?object} data
   * @param {Options} options
   * @returns {Promise<HttpResponse | void>}
   * @throws {HttpException}
   */
  delete(url = "/", data = null, options = {}) {
    options.method = "DELETE";
    options.query = data;
    return this.send(url, options);
  }

  /**
   * @param {string} url
   * @param {?object} data
   * @param {Options} options
   * @returns {Promise<HttpResponse | void>}
   * @throws {HttpException}
   */
  post(url = "/", data = null, options = {}) {
    options.method = "POST";
    options.json = data;
    return this.send(url, options);
  }

  /**
   * @param {string} url
   * @param {?object} data
   * @param {Options} options
   * @returns {Promise<HttpResponse | void>}
   * @throws {HttpException}
   */
  put(url = "/", data = null, options = {}) {
    options.method = "PUT";
    options.json = data;
    return this.send(url, options);
  }

  /**
   * @param {string} url
   * @param {?object} data
   * @param {Options} options
   * @returns {Promise<HttpResponse | void>}
   * @throws {HttpException}
   */
  patch(url = "/", data = null, options = {}) {
    options.method = "PATCH";
    options.json = data;
    return this.send(url, options);
  }

  /**
   * @param {string} url
   * @param {?object} data
   * @param {Options} options
   * @returns {Promise<HttpResponse | void>}
   * @throws {HttpException}
   */
  form(url = "/", data = null, options = {}) {
    options.method = "POST";
    options.form = data;
    return this.send(url, options);
  }
}
