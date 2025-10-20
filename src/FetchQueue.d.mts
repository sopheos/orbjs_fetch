/**
 *
 * @callback handleErrors
 * @param {HttpException} error
 * @param {{url: string, options: Options}} ctx
 * @returns {Promise<any>}
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
 *
 */
export class FetchQueue extends Fetch {
    static NONE: number;
    static ASYNC: number;
    static SYNC: number;
    /**
     * @param {Options} options
     * @param {Config} config
     */
    constructor(options?: Options, config?: Config);
    pending: number;
    accessStore: {
        token: any;
        delay: number;
        exp: number;
    };
    refreshStore: {
        token: any;
        delay: number;
        exp: number;
    };
    generate(): any;
    connected: boolean;
    renew(): any;
    refresh(): any;
    generateValid(): any;
    renewValid(timestamp: any): boolean;
    refreshValid(timestamp: any): boolean;
    resetAccess(): void;
    resetRefresh(): void;
    /**
     * @param {HttpException} e
     * @param {{url: string, options: Options}} ctx
     * @returns {Promise<any>}
     */
    handleErrors(e: HttpException, ctx: {
        url: string;
        options: Options;
    }): Promise<any>;
    /**
     * @returns {Promise<boolean>} True if need to be queue
     */
    isQueue(): Promise<boolean>;
    runQueue(): void;
    #private;
}
export type handleErrors = (error: HttpException, ctx: {
    url: string;
    options: Options;
}) => Promise<any>;
export type fetchToken = () => Promise<void>;
export type HttpResponse = {
    status: number;
    body: any;
};
export type Config = {
    connected?: boolean;
    generate?: fetchToken;
    renew?: fetchToken;
    refresh?: fetchToken;
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
};
import { Fetch } from "./Fetch.mjs";
import { HttpException } from "./HttpException.mjs";
