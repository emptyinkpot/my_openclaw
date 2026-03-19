"use strict";
/**
 * HTTP客户端 - 公共模块 (占位实现)
 * @module @openclaw/common-utils/http
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.HttpClient = void 0;
exports.createHttpClient = createHttpClient;
const axios_1 = __importDefault(require("axios"));
class HttpClient {
    instance;
    constructor(options = {}) {
        this.instance = axios_1.default.create({
            baseURL: options.baseURL,
            timeout: options.timeout || 30000,
            headers: options.headers,
        });
    }
    async get(url, config) {
        return this.instance.get(url, config);
    }
    async post(url, data, config) {
        return this.instance.post(url, data, config);
    }
}
exports.HttpClient = HttpClient;
function createHttpClient(options) {
    return new HttpClient(options);
}
//# sourceMappingURL=index.js.map