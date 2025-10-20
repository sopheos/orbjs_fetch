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
 * @property {?Object.<string, any>} [extra]
 */
export class Fetch {
    /**
     * Handle Fetch API response
     * @param {Response} response
     * @returns {Promise<HttpResponse>}
     * @throws {HttpException}
     */
    static handleResponse(response: Response): Promise<HttpResponse>;
    /**
     * Parse the content of a Fetch API response thanks to the Content-Type header
     * @param {Response} response
     * @returns {Promise<any>}
     */
    static parseBody(response: Response): Promise<any>;
    /**
     * @param {Options} options
     * @param {Config} config
     */
    constructor(options?: Options, config?: Config);
    options: {};
    config: {};
    /**
     * @param {string} url
     * @param {Options} options
     * @returns {Promise<HttpResponse | void>}
     * @throws {HttpException}
     */
    send(url: string, options?: Options): Promise<HttpResponse | void>;
    /**
     * @param {HttpException} e
     * @param {{url: string, options: Options}} ctx
     */
    handleErrors(e: HttpException, ctx: {
        url: string;
        options: Options;
    }): Promise<void>;
    /**
     * @param {string} url
     * @param {?object} data
     * @param {Options} options
     * @returns {Promise<HttpResponse | void>}
     * @throws {HttpException}
     */
    get(url?: string, data?: object | null, options?: Options): Promise<HttpResponse | void>;
    /**
     * @param {string} url
     * @param {?object} data
     * @param {Options} options
     * @returns {Promise<HttpResponse | void>}
     * @throws {HttpException}
     */
    delete(url?: string, data?: object | null, options?: Options): Promise<HttpResponse | void>;
    /**
     * @param {string} url
     * @param {?object} data
     * @param {Options} options
     * @returns {Promise<HttpResponse | void>}
     * @throws {HttpException}
     */
    post(url?: string, data?: object | null, options?: Options): Promise<HttpResponse | void>;
    /**
     * @param {string} url
     * @param {?object} data
     * @param {Options} options
     * @returns {Promise<HttpResponse | void>}
     * @throws {HttpException}
     */
    put(url?: string, data?: object | null, options?: Options): Promise<HttpResponse | void>;
    /**
     * @param {string} url
     * @param {?object} data
     * @param {Options} options
     * @returns {Promise<HttpResponse | void>}
     * @throws {HttpException}
     */
    patch(url?: string, data?: object | null, options?: Options): Promise<HttpResponse | void>;
    /**
     * @param {string} url
     * @param {?object} data
     * @param {Options} options
     * @returns {Promise<HttpResponse | void>}
     * @throws {HttpException}
     */
    form(url?: string, data?: object | null, options?: Options): Promise<HttpResponse | void>;
}
export type HttpResponse = {
    status: number;
    body: any;
};
export type handleErrors = (error: HttpException, ctx: {
    url: string;
    options: Options;
}) => Promise<any>;
export type Config = {
    handleErrors?: handleErrors;
};
export type Options = {
    baseUrl?: string;
    method?: string;
    signal?: AbortSignal;
    credentials?: RequestCredentials;
    headers?: {
        [x: string]: any;
    } | null;
    query?: {
        [x: string]: any;
    } | null;
    body?: {
        [x: string]: any;
    } | null;
    form?: {
        [x: string]: any;
    } | null;
    json?: {
        [x: string]: any;
    } | null;
    extra?: {
        [x: string]: any;
    } | null;
};
import { HttpException } from "./HttpException.mjs";
