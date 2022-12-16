"use strict";

import utils from "./../utils.js";
import buildURL from "../helpers/buildURL.js";
import InterceptorManager from "./InterceptorManager.js";
import dispatchRequest from "./dispatchRequest.js";
import mergeConfig from "./mergeConfig.js";
import buildFullPath from "./buildFullPath.js";
import validator from "../helpers/validator.js";
import AxiosHeaders from "./AxiosHeaders.js";

const validators = validator.validators;

/**
 * Create a new instance of Axios
 *
 * @param {Object} instanceConfig The default config for the instance
 *
 * @return {Axios} A new instance of Axios
 */
class Axios {
  constructor(instanceConfig) {
    this.defaults = instanceConfig;
    this.interceptors = {
      request: new InterceptorManager(),
      response: new InterceptorManager(),
    };
  }

  /**
   * Dispatch a request
   *
   * @param {String|Object} configOrUrl The config specific for this request (merged with this.defaults)
   * @param {?Object} config
   *
   * @returns {Promise} The Promise to be fulfilled
   */
  request(configOrUrl, config) {
    /*eslint no-param-reassign:0*/
    // Allow for axios('example/url'[, config]) a la fetch API
    // 判断是不是 string 类型
    // 如果是 string 类型，就当成 url
    if (typeof configOrUrl === "string") {
      config = config || {};
      config.url = configOrUrl;
    } else {
      config = configOrUrl || {};
    } 
    // 将 用户的 config 和 defaultConfig 合并
    config = mergeConfig(this.defaults, config);

    const { transitional, paramsSerializer, headers } = config;
    // TODO: 这里是啥 ？
    // 不知道是啥 先不看
    // 走了啥验证
    if (transitional !== undefined) {
      validator.assertOptions(
        transitional,
        {
          silentJSONParsing: validators.transitional(validators.boolean),
          forcedJSONParsing: validators.transitional(validators.boolean),
          clarifyTimeoutError: validators.transitional(validators.boolean),
        },
        false
      );
    }

    // 用户想序列化`params`
    if (paramsSerializer !== undefined) {
      validator.assertOptions(
        paramsSerializer,
        {
          encode: validators.function,
          serialize: validators.function,
        },
        true
      );
    }
    // 设置请求方法
    config.method = (
      config.method ||
      this.defaults.method ||
      "get"
    ).toLowerCase();

    let contextHeaders;

    // Flatten headers
    // 用户配置 头 的话 跟 默认的头 合并
    contextHeaders =
      headers && utils.merge(headers.common, headers[config.method]);

    contextHeaders &&
      utils.forEach(
        ["delete", "get", "head", "post", "put", "patch", "common"],
        (method) => {
          delete headers[method];
        }
      );

    // 给 配置 添加 headers
    config.headers = AxiosHeaders.concat(contextHeaders, headers);

    // filter out skipped interceptors
    // 请求拦截器链
    const requestInterceptorChain = [];
    let synchronousRequestInterceptors = true;
    // 遍历 请求拦截器
    this.interceptors.request.forEach(function unshiftRequestInterceptors(
      interceptor
    ) {
      if (
        // 指定了运行时机
        typeof interceptor.runWhen === "function" &&
        interceptor.runWhen(config) === false
      ) {
        // 不执行
        return;
      }
      // 判断注册的有没有需要同步执行的拦截器
      synchronousRequestInterceptors =
        synchronousRequestInterceptors && interceptor.synchronous;
      // 从头部推进去
      requestInterceptorChain.unshift(
        interceptor.fulfilled,
        interceptor.rejected
      );
    });

    // 相应拦截器链
    const responseInterceptorChain = [];
    // 遍历 响应拦截器
    this.interceptors.response.forEach(function pushResponseInterceptors(
      interceptor
    ) {
      responseInterceptorChain.push(
        interceptor.fulfilled,
        interceptor.rejected
      );
    });

    let promise;
    let i = 0;
    let len;

    // 如果拦截器里没有同步执行的任务
    if (!synchronousRequestInterceptors) {
      // 初始化 任务链 把核心请求放在函数头部
      const chain = [dispatchRequest.bind(this), undefined];
      // 在头部 推入 请求拦截器
      chain.unshift.apply(chain, requestInterceptorChain);
      // 在尾部 推入 响应拦截器
      chain.push.apply(chain, responseInterceptorChain);
      /** 这步完成之后 就能构成一个 请求拦截 -> 请求 -> 响应拦截 的任务队列 */
      // 链的长度
      len = chain.length;
      
      promise = Promise.resolve(config);

      while (i < len) {
        promise = promise.then(chain[i++], chain[i++]);
      }

      return promise;
    }

    len = requestInterceptorChain.length;

    let newConfig = config;

    i = 0;

    while (i < len) {
      const onFulfilled = requestInterceptorChain[i++];
      const onRejected = requestInterceptorChain[i++];
      try {
        newConfig = onFulfilled(newConfig);
      } catch (error) {
        onRejected.call(this, error);
        break;
      }
    }

    try {
      // 真正发送请求的地方
      promise = dispatchRequest.call(this, newConfig);
    } catch (error) {
      return Promise.reject(error);
    }

    i = 0;
    len = responseInterceptorChain.length;

    while (i < len) {
      promise = promise.then(
        responseInterceptorChain[i++],
        responseInterceptorChain[i++]
      );
    }

    return promise;
  }

  getUri(config) {
    config = mergeConfig(this.defaults, config);
    const fullPath = buildFullPath(config.baseURL, config.url);
    return buildURL(fullPath, config.params, config.paramsSerializer);
  }
}

// Provide aliases for supported request methods
utils.forEach(
  ["delete", "get", "head", "options"],
  function forEachMethodNoData(method) {
    /*eslint func-names:0*/
    Axios.prototype[method] = function (url, config) {
      return this.request(
        mergeConfig(config || {}, {
          method,
          url,
          data: (config || {}).data,
        })
      );
    };
  }
);

utils.forEach(["post", "put", "patch"], function forEachMethodWithData(method) {
  /*eslint func-names:0*/

  function generateHTTPMethod(isForm) {
    return function httpMethod(url, data, config) {
      return this.request(
        mergeConfig(config || {}, {
          method,
          headers: isForm
            ? {
                "Content-Type": "multipart/form-data",
              }
            : {},
          url,
          data,
        })
      );
    };
  }

  Axios.prototype[method] = generateHTTPMethod();

  Axios.prototype[method + "Form"] = generateHTTPMethod(true);
});

export default Axios;
